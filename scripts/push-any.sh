#!/usr/bin/env bash
# =============================================================================
# push-any.sh —— 推送通道自动探测与推送（VPN 开/关通吃）
#
# 背景（2026-09-21 实测沉淀）：
#   LvniuYun 开启时其 TAP/DNS 会把 github.com 解析成 fake-ip（198.18.x.x），
#   导致「裸 SSH 22」直接失败（Connection closed by remote host）；
#   实测 ssh.github.com:443 的完整 URL 与 HTTPS 绕行 push 同样不可用。
#   但 GitHub 的【真实 IP 出站】并不一定被拦 → 本脚本依次探测多条通道，
#   先做只读 ls-remote 探测（安全），任一条通即执行 push。
#
# 用法：
#   bash scripts/push-any.sh           # 推送当前分支到 main
#   bash scripts/push-any.sh main      # 指定分支
#   DRY=1 bash scripts/push-any.sh     # 只探测不推送
#
# 退出码：0 = 推送成功（或 DRY 下探测成功）；1 = 所有通道均失败
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
    *)        VPN_STATE="未连接/已断开（DNS 真实 IP $GH_DNS）" ;;
esac
echo "[环境] github.com -> ${GH_DNS:-解析失败}"
echo "[环境] VPN 判定：$VPN_STATE"

# ---------- 1. 用国内 DoH 取真实 IP（绕开被接管的系统 DNS） ----------
doh_ip() {
    curl -s --max-time 8 "https://223.5.5.5/resolve?name=$1&type=A" \
        | grep -o '"data":"[0-9.]*"' | head -1 | sed 's/.*:"//;s/"//'
}
GH_IP=$(doh_ip github.com);   GH_IP="${GH_IP:-$FALLBACK_GH_IP}"
SSH_IP=$(doh_ip ssh.github.com); SSH_IP="${SSH_IP:-$FALLBACK_SSH_IP}"
echo "[环境] 真实 IP：github.com=$GH_IP  ssh.github.com=$SSH_IP"

# ---------- 2. 探测 VPN 本地代理端口（用于 ProxyCommand 通道） ----------
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

SSH_BASE="-o ConnectTimeout=12 -o ServerAliveInterval=5 -o StrictHostKeyChecking=accept-new"

# $1=通道名  $2=远端 URL  $3=额外 git -c 配置（可空）
try_channel() {
    local name="$1" url="$2" cfgs="$3"
    echo ""
    echo ">>> 通道 $name"
    echo "    $url ${cfgs:+[$cfgs]}"

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
    echo "    ✗ 推送失败"
    return 1
}

CHANNELS_OK=""

# ① 原生远端配置（VPN 关闭态通常可用）
try_channel "1/5 原生 SSH（remote 配置）" "origin" "" && CHANNELS_OK="原生 SSH"

# ② 真实 IP:22 直连（HostKeyAlias 让 known_hosts 仍按 github.com 校验，彻底绕开 DNS）
if [ -z "$CHANNELS_OK" ]; then
    try_channel "2/5 IP 直连 22（绕 DNS）" \
        "ssh://git@$GH_IP:22/$REPO.git" \
        "ssh -o HostKeyAlias=github.com $SSH_BASE -p 22" && CHANNELS_OK="IP直连22"
fi

# ③ 真实 IP:443 直连（若网络只放行 443）
if [ -z "$CHANNELS_OK" ]; then
    try_channel "3/5 IP 直连 443（ssh.github.com 端点）" \
        "ssh://git@$SSH_IP:443/$REPO.git" \
        "ssh -o HostKeyAlias=ssh.github.com $SSH_BASE" && CHANNELS_OK="IP直连443"
fi

# ④ 本地代理 + curl --proxytunnel 作 SSH ProxyCommand（VPN 开启态的首选）
if [ -z "$CHANNELS_OK" ] && [ -n "$PROXY_PORT" ]; then
    try_channel "4/5 本地代理 $PROXY_PORT → SSH over CONNECT" \
        "ssh://git@github.com:22/$REPO.git" \
        "ssh -o HostKeyAlias=github.com -o ProxyCommand='curl -sS --proxytunnel -x http://127.0.0.1:$PROXY_PORT %h:%p' $SSH_BASE" && CHANNELS_OK="代理隧道"
fi

# ⑤ HTTPS 绕行（只读可拉取；push 依赖凭据写权限，仅作兜底诊断）
if [ -z "$CHANNELS_OK" ]; then
    echo ""
    echo ">>> 通道 5/5 HTTPS 绕行（诊断）"
    if git -c 'url.https://github.com/.insteadOf=git@github.com:' ls-remote origin "$BRANCH" >/dev/null 2>&1; then
        echo "    ✓ 只读通道可用；尝试 push（注意：凭据须有 $REPO 写权限）"
        if [ "$DRY" != "1" ] && git -c 'url.https://github.com/.insteadOf=git@github.com:' push origin "$BRANCH"; then
            CHANNELS_OK="HTTPS 绕行"
        else
            echo "    ✗ push 未成功（常见原因：本机 HTTPS 凭据属其它账号，对该仓库无写权限）"
        fi
    else
        echo "    ✗ 探测失败"
    fi
fi

echo
echo "=============================================="
if [ -n "$CHANNELS_OK" ]; then
    echo " ✅ 可用通道：$CHANNELS_OK"
    echo "=============================================="
    exit 0
fi
echo " ❌ 所有通道均不可用"
echo "    建议：关闭 VPN 后重试；或确认 GitHub 真实 IP 是否变化（DoH 已自动查询）"
echo "=============================================="
exit 1
