#!/usr/bin/env bash
# =============================================================================
# push-any.sh —— 推送通道自动探测与推送（VPN 开/关通吃）
#
# 背景：VPN（LvniuYun）开启时会把 github.com 解析成 fake-ip（198.18.x.x），
#       裸 SSH 因此失败。本脚本按【实测通道矩阵】依次探测，先做只读
#       ls-remote 探测（安全），任一条通即执行 push。
#
# 【2026-09-21 实测通道矩阵】—— VPN 开启态 vs 关闭态
#   通道                        VPN 开    VPN 关
#   --------------------------  --------  --------
#   ① 原生 SSH 22（域名）        ✗         ✓
#   ② HTTPS 绕行（insteadOf）    ✓         ✓   ← VPN 开启态首选（凭据用户名 thin-Z）
#   ③ IP 直连 443（ssh.github.com 端点 + HostKeyAlias）  ✓   —
#   ④ 本地代理 + curl --proxytunnel（VPN 核心提供时）     ✗/偶发 ✓
#   ⑤ IP 直连 22（真实 IP + HostKeyAlias）               ✗         ✓
#   关键点：VPN 只接管 DNS（fake-ip），**443 出站未被封**，故 ②③ 在 VPN 开启态可用。
#
# 用法：
#   bash scripts/push-any.sh           # 推送当前分支到 main
#   bash scripts/push-any.sh main      # 指定分支
#   DRY=1 bash scripts/push-any.sh     # 只探测不推送
#
# 退出码：0 = 推送成功（DRY 下为探测成功）；1 = 所有通道均失败
# =============================================================================
set -u

BRANCH="${1:-main}"
REPO="thin-Z/calc-tools-top"
DRY="${DRY:-0}"

# GitHub 真实 IP 兜底（DoH 查询失败时使用；2026-09-21 实测值）
FALLBACK_GH_IP="20.205.243.166"
FALLBACK_SSH_IP="20.205.243.160"

echo "=============================================="
echo " push-any.sh —— 通道探测（分支: $BRANCH）"
echo "=============================================="

# ---------- 0. 环境快照 ----------
GH_DNS=$(nslookup github.com 2>/dev/null | awk '/^Address/{a=$NF} END{print a}')
case "$GH_DNS" in
    198.18.*) VPN_STATE="开启（DNS 落 fake-ip $GH_DNS）" ;;
    "")       VPN_STATE="未知（DNS 解析失败）" ;;
    *)        VPN_STATE="未连接（DNS 真实 IP $GH_DNS）" ;;
esac
echo "[环境] github.com -> ${GH_DNS:-解析失败}"
echo "[环境] VPN 判定：$VPN_STATE"

# ---------- 1. 用国内 DoH 取真实 IP（绕开被接管的系统 DNS） ----------
doh_ip() {
    curl -s --max-time 8 "https://223.5.5.5/resolve?name=$1&type=A" \
        | grep -o '"data":"[0-9.]*"' | head -1 | sed 's/.*:"//;s/"//'
}
GH_IP=$(doh_ip github.com);      GH_IP="${GH_IP:-$FALLBACK_GH_IP}"
SSH_IP=$(doh_ip ssh.github.com); SSH_IP="${SSH_IP:-$FALLBACK_SSH_IP}"
echo "[环境] 真实 IP：github.com=$GH_IP  ssh.github.com=$SSH_IP"

# ---------- 2. 探测 VPN 本地代理端口（ProxyCommand 通道备用） ----------
PROXY_PORT=""
for p in 7888 7890 7891 1080 10809 2080 1087; do
    if curl -s -x "http://127.0.0.1:$p" -o /dev/null --max-time 5 https://api.github.com/ 2>/dev/null; then
        PROXY_PORT="$p"; break
    fi
done
echo "[环境] 本地代理端口：${PROXY_PORT:-未发现}"

echo
echo "----------------------------------------------"
echo " 逐通道探测（先只读 ls-remote，成功才 push）"
echo "----------------------------------------------"

# 幂等判定：远端是否已包含本地 HEAD。
# 场景：remote-tracking 陈旧时 push 会报 cannot lock ref（远端已在目标提交上），
# 此时推送其实已完成 —— 应视为成功，避免误判。
remote_has_local_head() {
    local head
    head=$(git rev-parse HEAD 2>/dev/null) || return 1
    git -c 'url.https://github.com/.insteadOf=git@github.com:' ls-remote origin "$BRANCH" 2>/dev/null | grep -q "$head"
}

SSH_BASE="-o ConnectTimeout=12 -o ServerAliveInterval=5 -o StrictHostKeyChecking=accept-new"

# $1=通道名  $2=远端 URL  $3=额外 git -c core.sshCommand 配置（可空）
try_channel() {
    local name="$1" url="$2" cfgs="$3"
    echo ""
    echo ">>> 通道 $name"
    echo "    $url"

    if [ -n "$cfgs" ]; then
        # shellcheck disable=SC2086
        git -c core.sshCommand="$cfgs" ls-remote "$url" "$BRANCH" >/dev/null 2>&1 \
            || { echo "    ✗ 探测失败"; return 1; }
        if [ "$DRY" = "1" ]; then echo "    ✓ 探测通过（DRY，未推送）"; return 0; fi
        # shellcheck disable=SC2086
        git -c core.sshCommand="$cfgs" push "$url" "$BRANCH" && { echo "    ✅ 推送成功"; return 0; }
    else
        git ls-remote "$url" "$BRANCH" >/dev/null 2>&1 \
            || { echo "    ✗ 探测失败"; return 1; }
        if [ "$DRY" = "1" ]; then echo "    ✓ 探测通过（DRY，未推送）"; return 0; fi
        git push "$url" "$BRANCH" && { echo "    ✅ 推送成功"; return 0; }
    fi
    if remote_has_local_head; then
        echo "    ✅ 远端已含本地 HEAD（推送实际已完成；仅本地 remote-tracking 陈旧）"
        return 0
    fi
    echo "    ✗ 推送失败"
    return 1
}

# HTTPS 绕行通道（幂等：直接写 push 逻辑，不走 try_channel —— 它需要 -c url.insteadOf）
try_https() {
    echo ""
    echo ">>> 通道 HTTPS 绕行（insteadOf，VPN 开启态首选）"
    if git -c 'url.https://github.com/.insteadOf=git@github.com:' ls-remote origin "$BRANCH" >/dev/null 2>&1; then
        if [ "$DRY" = "1" ]; then echo "    ✓ 探测通过（DRY，未推送）"; return 0; fi
        if git -c 'url.https://github.com/.insteadOf=git@github.com:' push origin "$BRANCH"; then
            echo "    ✅ 推送成功"; return 0
        fi
        if remote_has_local_head; then
            echo "    ✅ 远端已含本地 HEAD（推送实际已完成；仅本地 remote-tracking 陈旧）"
            return 0
        fi
        echo "    ✗ push 失败（凭据须有 $REPO 写权限；本机实测用户名为 thin-Z，可用）"
    else
        echo "    ✗ 探测失败"
    fi
    return 1
}

CHANNELS_OK=""
VPN_ON=0
case "$GH_DNS" in 198.18.*) VPN_ON=1 ;; esac

if [ "$VPN_ON" = "1" ]; then
    # ---------- VPN 开启态：HTTPS → IP:443 → 代理 → 原生SSH → IP:22 ----------
    try_https   && CHANNELS_OK="HTTPS 绕行"
    [ -z "$CHANNELS_OK" ] && try_channel "VPN: IP 直连 443（ssh.github.com 端点）" \
        "ssh://git@$SSH_IP:443/$REPO.git" \
        "ssh -o HostKeyAlias=ssh.github.com $SSH_BASE" && CHANNELS_OK="IP直连443"
    [ -z "$CHANNELS_OK" ] && [ -n "$PROXY_PORT" ] && try_channel "VPN: 本地代理 $PROXY_PORT → SSH over CONNECT" \
        "ssh://git@github.com:22/$REPO.git" \
        "ssh -o HostKeyAlias=github.com -o ProxyCommand='curl -sS --proxytunnel -x http://127.0.0.1:$PROXY_PORT %h:%p' $SSH_BASE" && CHANNELS_OK="代理隧道"
    [ -z "$CHANNELS_OK" ] && try_channel "VPN: 原生 SSH（remote 配置）" "origin" "" && CHANNELS_OK="原生 SSH"
    [ -z "$CHANNELS_OK" ] && try_channel "VPN: IP 直连 22" \
        "ssh://git@$GH_IP:22/$REPO.git" \
        "ssh -o HostKeyAlias=github.com $SSH_BASE" && CHANNELS_OK="IP直连22"
else
    # ---------- VPN 关闭态：原生 SSH → IP:22 → HTTPS → IP:443 → 代理 ----------
    try_channel "原生 SSH（remote 配置）" "origin" "" && CHANNELS_OK="原生 SSH"
    [ -z "$CHANNELS_OK" ] && try_channel "IP 直连 22（绕 DNS）" \
        "ssh://git@$GH_IP:22/$REPO.git" \
        "ssh -o HostKeyAlias=github.com $SSH_BASE" && CHANNELS_OK="IP直连22"
    [ -z "$CHANNELS_OK" ] && try_https && CHANNELS_OK="HTTPS 绕行"
    [ -z "$CHANNELS_OK" ] && try_channel "IP 直连 443（ssh.github.com 端点）" \
        "ssh://git@$SSH_IP:443/$REPO.git" \
        "ssh -o HostKeyAlias=ssh.github.com $SSH_BASE" && CHANNELS_OK="IP直连443"
    [ -z "$CHANNELS_OK" ] && [ -n "$PROXY_PORT" ] && try_channel "本地代理 $PROXY_PORT → SSH over CONNECT" \
        "ssh://git@github.com:22/$REPO.git" \
        "ssh -o HostKeyAlias=github.com -o ProxyCommand='curl -sS --proxytunnel -x http://127.0.0.1:$PROXY_PORT %h:%p' $SSH_BASE" && CHANNELS_OK="代理隧道"
fi

echo
echo "=============================================="
if [ -n "$CHANNELS_OK" ]; then
    echo " ✅ 可用通道：$CHANNELS_OK"
    echo "=============================================="
    exit 0
fi
echo " ❌ 所有通道均不可用"
echo "    建议：检查网络连通性；确认 GitHub 真实 IP 是否变化（DoH 已自动查询）"
echo "=============================================="
exit 1
