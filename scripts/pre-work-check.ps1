<#
.SYNOPSIS
calc-tools.top 开工前防护检查 — 防御百度同步盘回滚/误删导致的漂移。
在每次开始修改代码前运行，确认本地与 origin/main 对齐、工作区无漂移。

用法:
  powershell -ExecutionPolicy Bypass -File scripts/pre-work-check.ps1        # 只读检查
  powershell -ExecutionPolicy Bypass -File scripts/pre-work-check.ps1 --fix  # 落后时自动 reset --hard origin/main

退出码: 0 = 可安全开工; 1 = 存在需处理的漂移(仅只读模式返回)。
#>
param([switch]$Fix)

# 统一输出编码,避免中文乱码(PS5.1 默认 GBK)
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $repo '.git'))) {
    Write-Host "[pre-work] 未找到 git 仓库: $repo" -ForegroundColor Red
    exit 1
}
Push-Location $repo
try {
    $issues = 0

    # 1) 工作区漂移检查（含同步盘误删跟踪文件）
    Write-Host "== 1/4 工作区状态 ==" -ForegroundColor Cyan
    $status = git status --porcelain
    if ($LASTEXITCODE -ne 0) { Write-Host "git status 失败" -ForegroundColor Red; exit 1 }
    if ($status) {
        $deleted = $status | Where-Object { $_ -match '^ ?D' }
        if ($deleted) {
            Write-Host "  !! 检测到已跟踪文件缺失(疑似同步盘误删):" -ForegroundColor Red
            $deleted | ForEach-Object { Write-Host "     $_" }
            Write-Host "  -> 修复: git restore <文件>" -ForegroundColor Yellow
            $issues++
        }
        $others = $status | Where-Object { $_ -notmatch '^ ?D' }
        if ($others) {
            Write-Host "  存在其他未提交变更:" -ForegroundColor Yellow
            $others | ForEach-Object { Write-Host "     $_" }
        }
    } else {
        Write-Host "  OK 工作区干净" -ForegroundColor Green
    }

    # 2) 同步远端引用（cmd /c 规避 PS5.1 native stderr 干扰 $LASTEXITCODE 的坑）
    Write-Host "== 2/4 拉取远端引用 ==" -ForegroundColor Cyan
    cmd /c "git fetch origin main 2>nul"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  !! fetch 失败(exit=$LASTEXITCODE; GitHub 短时限流? 等 60s 后重试)" -ForegroundColor Red
        $issues++
    } else {
        Write-Host "  OK fetch 完成" -ForegroundColor Green
    }

    # 3) 本地 vs 远端差异
    Write-Host "== 3/4 本地 vs origin/main ==" -ForegroundColor Cyan
    $count = (cmd /c "git rev-list --left-right --count HEAD...origin/main 2>nul").Trim()
    if ($LASTEXITCODE -ne 0 -or -not $count) {
        Write-Host "  !! 无法比对(引用缺失? 用 git update-ref 修复)" -ForegroundColor Red
        $issues++
    } else {
        $parts = ($count.Trim() -split '\s+')
        # git rev-list --left-right --count HEAD...origin/main 输出: [本地独有X] [远端独有Y]
        #   X = 仅在 HEAD(本地领先/ahead) 的提交数
        #   Y = 仅在 origin/main(本地落后/behind) 的提交数
        # 注意左-右方向: parts[0]=ahead, parts[1]=behind,切勿颠倒(曾因此误报"领先19实为落后19")。
        $ahead = [int]$parts[0]; $behind = [int]$parts[1]
        if ($behind -eq 0 -and $ahead -eq 0) {
            Write-Host "  OK 完全同步 (HEAD = $((git rev-parse --short HEAD)))" -ForegroundColor Green
        } elseif ($behind -gt 0) {
            Write-Host "  !! 本地落后远端 $behind 个提交(同步盘回滚过?)" -ForegroundColor Red
            Write-Host "  -> 修复: git reset --hard origin/main" -ForegroundColor Yellow
            if ($Fix) {
                Write-Host "  --fix: 执行 git reset --hard origin/main ..." -ForegroundColor Magenta
                git reset --hard origin/main
                Write-Host "  完成: HEAD = $((git rev-parse --short HEAD))" -ForegroundColor Green
            }
            $issues++
        } else {
            Write-Host "  本地领先远端 $ahead 个提交(未推送): $((git log --oneline origin/main..HEAD | Select-Object -First 5))" -ForegroundColor Yellow
        }
    }

    # 4) 结论
    Write-Host "== 4/4 结论 ==" -ForegroundColor Cyan
    if ($issues -eq 0) {
        Write-Host "  OK 可安全开工。若待推送,记得先 git push。" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "  存在 $issues 处需处理(见上)。只读模式不自动修改,加 --fix 自动对齐。" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
