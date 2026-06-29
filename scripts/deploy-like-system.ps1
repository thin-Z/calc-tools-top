# deploy-like-system.ps1
# calc-tools.top 全局点赞系统部署脚本
# 在本地 PowerShell 中运行

Write-Host "=== calc-tools.top 点赞系统部署 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 推送代码到 GitHub
Write-Host "[1/4] 推送代码到 GitHub..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️ 推送失败，请手动执行: git push" -ForegroundColor Red
} else {
    Write-Host "  ✅ 代码已推送，Cloudflare Pages 将自动部署" -ForegroundColor Green
}

Write-Host ""

# 2. 登录 Cloudflare
Write-Host "[2/4] 登录 Cloudflare..." -ForegroundColor Yellow
npx wrangler login
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️ 登录失败，请手动执行: npx wrangler login" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. 创建 KV Namespace
Write-Host "[3/4] 创建 KV Namespace..." -ForegroundColor Yellow
$result = npx wrangler kv namespace create LIKES 2>&1
if ($LASTEXITCODE -eq 0) {
    # Extract the namespace ID from the output
    if ($result -match 'id\s*=\s*"([^"]+)"') {
        $nsId = $matches[1]
        Write-Host "  ✅ KV Namespace 创建成功" -ForegroundColor Green
        Write-Host "  ID: $nsId"
    } elseif ($result -match '([a-f0-9]{32})') {
        $nsId = $matches[1]
        Write-Host "  ✅ KV Namespace 创建成功" -ForegroundColor Green
        Write-Host "  ID: $nsId"
    } else {
        Write-Host "  ✅ KV Namespace 创建成功" -ForegroundColor Green
        Write-Host "  $result"
    }
} else {
    Write-Host "  ⚠️ 创建失败，请手动执行: npx wrangler kv namespace create LIKES" -ForegroundColor Red
}

Write-Host ""

# 4. Dashboard 操作提示
Write-Host "[4/4] 最后一步：绑定到 Pages 项目" -ForegroundColor Yellow
Write-Host ""
Write-Host "  打开 Cloudflare Dashboard:" -ForegroundColor White
Write-Host "  https://dash.cloudflare.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "  操作路径:" -ForegroundColor White
Write-Host "  Workers & Pages → calc-tools-top → Settings → Functions" -ForegroundColor Gray
Write-Host "  → KV Namespace Bindings → Add binding" -ForegroundColor Gray
Write-Host "    Variable name: LIKES" -ForegroundColor Yellow
Write-Host "    KV namespace: 选择刚创建的 namespace" -ForegroundColor Yellow
Write-Host ""
Write-Host "完成后约 1-2 分钟部署生效。" -ForegroundColor Green
Write-Host "用两个不同的浏览器点赞同一工具，验证点赞数是否同步。" -ForegroundColor Green
