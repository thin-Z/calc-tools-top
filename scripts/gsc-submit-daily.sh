#!/usr/bin/env bash
# ============================================================================
# GSC 每日批提交器（bsk 真实点击，daemon 同生命周期）
# ----------------------------------------------------------------------------
# 用法:
#   bash scripts/gsc-submit-daily.sh [CAP] [--dry] [--stop-on-throttle]
#     CAP   每日提交上限，默认 10
#           ⭐ GSC 确有官方每日 URL inspection 配额（2026-09-19 实测证实）：
#              耗尽时弹 alertdialog "Quota exceeded" /
#              "You have exceeded your property's URL inspection quota. Quota is renewed daily."
#              官方未公布具体数字，实测约 50 条/日后耗尽，每日重置。
#              脚本已内置检测：命中即中断本批、队列原样保留（可安全跨天续跑）。
#     --dry 只导航+读状态，不点 Request indexing（用于冒烟验证，不消耗提交配额）
#     --stop-on-throttle 命中限流信号(Request ignored/limit/too many)立即中断本批
#
# 前置:
#   1) VPN 必须开启（Google 系可达）。脚本开头会自检，不可达直接退出。
#   2) 已登录的 Edge + bsk 扩展必须在线（本机常驻）。
#
# 产物:
#   reports/gsc-pending.txt  剩余待提交队列（成功/已收录项会被移除）
#   reports/gsc-submit-log.md 追加式日志
# ============================================================================
set -u
BSK="C:/Users/thinZ/.local/bin/bsk.exe"
REPO="D:/_Careate.Program/calculator-site"
PENDING="$REPO/reports/gsc-pending.txt"
LOG="$REPO/reports/gsc-submit-log.md"
SNAP="$REPO/snap_t.txt"
GSC_URL="https://search.google.com/search-console?resource_id=sc-domain%3Acalc-tools.top"
SEL='input[aria-label="Inspect any URL in calc-tools.top"]'

CAP=10
DRY=0
STOP_ON_THROTTLE=0
for a in "$@"; do
  case "$a" in
    --dry) DRY=1 ;;
    --stop-on-throttle) STOP_ON_THROTTLE=1 ;;
    *) CAP="$a" ;;
  esac
done

log() { echo "$*" | tee -a "$LOG"; }

# ---- 0) VPN / Google 可达性自检 -------------------------------------------------
echo "=== GSC 每日批提交器 $(date +%Y-%m-%dT%H:%M:%S) cap=$CAP dry=$DRY ==="
GCODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://www.google.com 2>/dev/null || echo 000)
if [ "$GCODE" = "000" ]; then
  echo "❌ Google 不可达（VPN 可能未开）。退出，不消耗配额。" | tee -a "$LOG"
  exit 2
fi
echo "✅ Google 可达(http=$GCODE)，继续。"

# ---- 1) 启动 daemon（同一生命周期）--------------------------------------------
"$BSK" daemon start >/dev/null 2>&1 &
DPID=$!
PORT_OK=0
for i in $(seq 1 40); do
  if (exec 3<>/dev/tcp/127.0.0.1/52800) 2>/dev/null; then exec 3>&-; PORT_OK=1; break; fi
  sleep 1
done
if [ "$PORT_OK" = "0" ]; then
  echo "❌ bsk daemon 端口 52800 未监听，退出。" | tee -a "$LOG"
  kill "$DPID" 2>/dev/null
  exit 3
fi
echo "✅ bsk daemon 已就绪(pid=$DPID)。"

# ---- 2) 浏览器 + 会话 -----------------------------------------------------------
BID=$("$BSK" browsers 2>/dev/null | tail -n +2 | awk 'NF{print $1; exit}')
if [ -z "$BID" ]; then
  echo "❌ 未检测到在线浏览器（Edge+bsk 扩展需常驻）。退出。" | tee -a "$LOG"
  kill "$DPID" 2>/dev/null
  exit 4
fi
echo "✅ 浏览器实例: $BID"
SESH_RAW=$("$BSK" session start --browser "$BID" 2>/dev/null)
SESH=$(echo "$SESH_RAW" | grep -oE '[A-Za-z0-9]{4}' | head -1)
if [ -z "$SESH" ]; then
  echo "❌ 无法获取 session id。原始输出: $SESH_RAW" | tee -a "$LOG"
  kill "$DPID" 2>/dev/null
  exit 5
fi
echo "✅ session: $SESH"
"$BSK" window resize --width 1440 --height 900 --session "$SESH" >/dev/null 2>&1

# ---- 3) 读取本批 URL ------------------------------------------------------------
if [ ! -f "$PENDING" ]; then echo "❌ 队列文件缺失: $PENDING"; "$BSK" session stop "$SESH" >/dev/null 2>&1; kill "$DPID" 2>/dev/null; exit 6; fi
mapfile -t URLS < <(head -n "$CAP" "$PENDING")
TOTAL=${#URLS[@]}
echo "📋 本批待处理: $TOTAL 条"

remove_line() {
  local u="$1"
  grep -vxF "$u" "$PENDING" > "$PENDING.tmp" && mv "$PENDING.tmp" "$PENDING"
}

# ---- session 健康检查 / 重建 -------------------------------------------------
# 检测快照是否为 bsk session 失效报错（而非真实页面内容）
is_session_dead() {
  grep -qiE "session not registered|requested resource does not exist|already stopped|the session, tab, or browser may have stopped" "$SNAP" 2>/dev/null
}
# 重建 session：停旧 + 起新 + resize。失败返回 1
renew_session() {
  [ -n "${SESH:-}" ] && timeout 20 "$BSK" session stop "$SESH" >/dev/null 2>&1
  local raw
  raw=$("$BSK" session start --browser "$BID" 2>/dev/null)
  SESH=$(echo "$raw" | grep -oE '[A-Za-z0-9]{4}' | head -1)
  if [ -z "$SESH" ]; then
    log "   ❌ session 重建失败，原始输出: $raw"
    return 1
  fi
  "$BSK" window resize --width 1440 --height 900 --session "$SESH" >/dev/null 2>&1
  log "   🔄 session 重建成功: $SESH"
  return 0
}

# 检测 GSC 官方「配额耗尽」弹窗（硬性阻断，官方明示 Quota is renewed daily）
# 弹窗形态: alertdialog "Quota exceeded" /
#           "You have exceeded your property's URL inspection quota. Quota is renewed daily."
# ⚠️ 缺失此检测会导致静默空转：弹窗以 modal 遮挡页面 → 找不到 Request indexing 按钮
#    → 每条都误报「未找到按钮，跳过」→ 全批空跑（2026-09-19 因此白跑 1h38m / 144 条）。
is_quota_exceeded() {
  grep -qiE "Quota exceeded|URL inspection quota|Quota is renewed daily" "$SNAP" 2>/dev/null
}

{
  echo ""
  echo "## $(date +%Y-%m-%d) 批提交（cap=$CAP dry=$DRY，含 session 自动重连）"
} >> "$LOG"

SUBMITTED=0
SKIPPED=0
QUOTA_OUT=0
for URL in "${URLS[@]}"; do
  [ -z "${URL// /}" ] && continue
  log "── $URL"

  # 导航 + 回填（带 session 失效检测，最多重试 3 次；每次失效自动重建 session）
  OK=0
  for attempt in 1 2 3; do
    timeout 60 "$BSK" navigate "$GSC_URL" --session "$SESH" >/dev/null 2>&1
    timeout 20 "$BSK" wait-ms 6000 >/dev/null 2>&1
    timeout 60 "$BSK" fill "$SEL" --value "$URL" --session "$SESH" >/dev/null 2>&1
    timeout 60 "$BSK" press Enter --session "$SESH" >/dev/null 2>&1
    timeout 60 "$BSK" wait-ms 20000 >/dev/null 2>&1
    timeout 60 "$BSK" snapshot --session "$SESH" > "$SNAP" 2>&1
    if is_quota_exceeded; then
      log "   ⛔ GSC 官方配额已耗尽（Quota exceeded），中断本批"
      QUOTA_OUT=1
      break
    fi
    if is_session_dead; then
      log "   ⚠ session 失效（第 $attempt 次），重建后重试"
      renew_session || break 2
    else
      OK=1
      break
    fi
  done
  if [ "${QUOTA_OUT:-0}" = "1" ]; then break; fi
  if [ "$OK" = "0" ]; then
    log "   ❌ session 多次重建失败，中断本批"
    break
  fi

  if ! grep -qE "URL is (not )?on Google" "$SNAP"; then
    timeout 60 "$BSK" wait-ms 15000 >/dev/null 2>&1
    timeout 60 "$BSK" snapshot --session "$SESH" > "$SNAP" 2>&1
    if is_quota_exceeded; then
      log "   ⛔ GSC 官方配额已耗尽（Quota exceeded），中断本批"
      QUOTA_OUT=1
      break
    fi
    if is_session_dead; then
      log "   ⚠ 二次快照 session 失效，重建后重试本 URL"
      renew_session || break
      continue
    fi
  fi

  if grep -q "URL is on Google" "$SNAP"; then
    log "   ✅ 已收录，移出队列（不消耗提交配额）"
    remove_line "$URL"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  if [ "$DRY" = "1" ]; then
    log "   🔍 [dry] 状态: $(grep -oE 'URL is not on Google' "$SNAP" || echo 状态未知)，不点击"
    continue
  fi

  REF=$(grep -oE '@e[0-9]+ button "Request indexing' "$SNAP" | grep -oE '@e[0-9]+' | head -1)
  if [ -z "$REF" ]; then
    if is_quota_exceeded; then
      log "   ⛔ GSC 官方配额已耗尽（Quota exceeded / Quota is renewed daily），中断本批"
      log "      → 队列原样保留，明日配额重置后直接续跑即可"
      QUOTA_OUT=1
      break
    fi
    log "   ⚠ 未找到 Request indexing 按钮，跳过（快照首行: $(head -4 "$SNAP" | tr '\n' ' ')）"
    continue
  fi
  timeout 60 "$BSK" click "$REF" --session "$SESH" >/dev/null 2>&1
  timeout 90 "$BSK" wait-ms 80000 >/dev/null 2>&1
  timeout 60 "$BSK" snapshot --session "$SESH" > "$SNAP" 2>&1
  if grep -q "Indexing requested" "$SNAP"; then
    log "   ✅ 已提交（Indexing requested）"
    SUBMITTED=$((SUBMITTED+1))
    remove_line "$URL"
    DREF=$(grep -oE '@e[0-9]+ button "Dismiss"' "$SNAP" | grep -oE '@e[0-9]+' | head -1)
    [ -n "$DREF" ] && timeout 30 "$BSK" click "$DREF" --session "$SESH" >/dev/null 2>&1
  else
    log "   ⚠ 未确认提交，快照首行: $(head -3 "$SNAP" | tr '\n' ' ')"
    if [ "$STOP_ON_THROTTLE" = "1" ]; then
      if grep -qiE "request ignored|ignored|daily limit|too many|rate.?limit|limit reached|exceed" "$SNAP"; then
        log "   ⛔ 检测到限流信号，按 --stop-on-throttle 中断本批"
        break
      fi
    fi
  fi
  timeout 20 "$BSK" wait-ms 2000 >/dev/null 2>&1
done

{
  if [ "${QUOTA_OUT:-0}" = "1" ]; then
    echo "   ⛔ 因 GSC 官方配额耗尽（Quota exceeded）提前中断 —— 非脚本故障，Google 明示每日重置。"
    echo "      队列原样保留（未消耗），明日配额重置后直接续跑。"
  fi
  echo "   汇总: 提交=$SUBMITTED 已收录跳过=$SKIPPED 本批处理=$TOTAL 剩余=$(grep -c . "$PENDING")"
  echo "===== 完成 ====="
} >> "$LOG"

"$BSK" session stop "$SESH" >/dev/null 2>&1
kill "$DPID" 2>/dev/null
echo "🏁 本批结束: 提交=$SUBMITTED 已收录=$SKIPPED 剩余=$(grep -c . "$PENDING")"
