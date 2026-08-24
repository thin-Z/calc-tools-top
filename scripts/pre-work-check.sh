#!/usr/bin/env bash
# calc-tools.top 开工前防护检查（git bash 版）— 防御百度同步盘回滚/误删漂移。
# 用法: bash scripts/pre-work-check.sh [--fix]   # --fix: 落后时自动 reset --hard origin/main
# 退出码: 0 = 可安全开工; 1 = 存在需处理漂移。
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
FIX=0
[ "${1:-}" = "--fix" ] && FIX=1
ISSUES=0
cd "$REPO" || { echo "[pre-work] 无法进入仓库 $REPO"; exit 1; }

echo "== 1/4 工作区状态 =="
STATUS="$(git status --porcelain)"
if [ -n "$STATUS" ]; then
  DELETED="$(echo "$STATUS" | grep -E '^ ?D' || true)"
  if [ -n "$DELETED" ]; then
    echo "  !! 检测到已跟踪文件缺失(疑似同步盘误删):"
    echo "$DELETED" | sed 's/^/     /'
    echo "  -> 修复: git restore <文件>"
    ISSUES=$((ISSUES+1))
  fi
  OTHERS="$(echo "$STATUS" | grep -vE '^ ?D' || true)"
  if [ -n "$OTHERS" ]; then
    echo "  存在其他未提交变更:"
    echo "$OTHERS" | sed 's/^/     /'
  fi
else
  echo "  OK 工作区干净"
fi

echo "== 2/4 拉取远端引用 =="
if ! git fetch origin main >/dev/null 2>&1; then
  echo "  !! fetch 失败(GitHub 短时限流? 等 60s 后重试)"
  ISSUES=$((ISSUES+1))
else
  echo "  OK fetch 完成"
fi

echo "== 3/4 本地 vs origin/main =="
COUNT="$(git rev-list --left-right --count HEAD...origin/main 2>/dev/null || true)"
if [ -z "$COUNT" ]; then
  echo "  !! 无法比对(引用缺失? 用 git update-ref 修复)"
  ISSUES=$((ISSUES+1))
else
  BEHIND="$(echo "$COUNT" | awk '{print $1}')"
  AHEAD="$(echo "$COUNT" | awk '{print $2}')"
  if [ "$BEHIND" -eq 0 ] && [ "$AHEAD" -eq 0 ]; then
    echo "  OK 完全同步 (HEAD=$(git rev-parse --short HEAD))"
  elif [ "$BEHIND" -gt 0 ]; then
    echo "  !! 本地落后远端 $BEHIND 个提交(同步盘回滚过?)"
    echo "  -> 修复: git reset --hard origin/main"
    if [ "$FIX" -eq 1 ]; then
      echo "  --fix: 执行 git reset --hard origin/main ..."
      git reset --hard origin/main
      echo "  完成: HEAD=$(git rev-parse --short HEAD)"
    fi
    ISSUES=$((ISSUES+1))
  else
    echo "  本地领先远端 $AHEAD 个提交(未推送):"
    git log --oneline origin/main..HEAD | head -5 | sed 's/^/     /'
  fi
fi

echo "== 4/4 结论 =="
if [ "$ISSUES" -eq 0 ]; then
  echo "  OK 可安全开工。若待推送,记得先 git push。"
  exit 0
else
  echo "  存在 $ISSUES 处需处理(见上)。只读模式不自动修改,加 --fix 自动对齐。"
  exit 1
fi
