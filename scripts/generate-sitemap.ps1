# Generate correct sitemap.xml based on actual file structure
# 默认以脚本所在目录的上一级（仓库根）为 Root，避免从其他目录调用时扫到空目录、生成 0 条脏 sitemap。
param(
    [string]$Root = (Get-Location).Path,
    [string]$BaseUrl = "https://www.calc-tools.top"
)

# 始终以脚本所在目录的上一级（仓库根）为 Root，避免从其他目录调用时扫到空目录生成脏 sitemap。
$Root = (Split-Path $PSScriptRoot)

$exclude = @("404.html", "zh/index.html", "embed.html")

# noindex 页不得进 sitemap（GSC 报 "Submitted URL marked noindex"，削弱 sitemap 有效性并拖累索引率）
# 门禁：scripts/check-sitemap.mjs（verify #28）交叉校验，防止此处过滤逻辑被绕过。
$noindexSkipped = 0

# Collect all HTML files.
# 排除集必须与 verify #33 门禁 check-sitemap-coverage.mjs 的 EXCLUDE_DIRS 严格对齐，
# 否则重跑会把 e2e/test-results/snapshots/api/scripts/css/js/assets/.workbuddy 等工程/测试产物的
# .html 扫进 sitemap 造成死链（历史上曾产出 328 条脏 sitemap）。改这里须同步改门禁，反之亦然。
$excludeDirRe = '\\(node_modules|dist|docs|deliverables|includes|api|scripts|css|js|assets|snapshots|e2e|test-results|playwright-report|\.workbuddy|\.git|\.githooks)\\'
$files = Get-ChildItem -Recurse -Filter "*.html" $Root | Where-Object { $_.FullName -notmatch $excludeDirRe }

$pages = @()
foreach ($f in $files) {
    $relPath = $f.FullName.Replace($Root, "").Replace("\", "/")
    $name = $relPath.TrimStart("/")
    if ($exclude -contains $name) { continue }

    # 读取内容判定 noindex（meta robots 两种属性顺序都覆盖）
    $raw = [System.IO.File]::ReadAllText($f.FullName)
    if ($raw -match '<meta[^>]*name="robots"[^>]*noindex' -or $raw -match '<meta[^>]*content="[^"]*noindex[^"]*"[^>]*name="robots"') {
        $noindexSkipped++
        continue
    }

    # Determine language
    if ($name -match "^en/") {
        $lang = "en"
    } elseif ($name -match "^zh/") {
        $lang = "zh-CN"
    } elseif ($name -match "^blog/en/") {
        $lang = "en"
    } elseif ($name -match "^blog/zh/") {
        $lang = "zh-CN"
    } else {
        $lang = "root"
    }

    # Priority & changefreq
    $priority = "0.5"
    $changefreq = "monthly"
    if ($name -eq "index.html") {
        $priority = "0.9"
        $changefreq = "weekly"
    } elseif ($name -eq "en/index.html" -or $name -eq "zh/index.html") {
        $priority = "0.8"
        $changefreq = "weekly"
    } elseif ($name -match "^blog/") {
        $priority = "0.6"
        $changefreq = "weekly"
    } elseif ($name -match "^tags/" -or $name -match "^en/tags/") {
        $priority = "0.6"
        $changefreq = "weekly"
    } elseif ($name -match "^(en|zh)/calculators/" -or $name -match "^(en|zh)/image/" -or $name -match "^(en|zh)/text/") {
        $priority = "0.8"
        $changefreq = "monthly"
    } elseif ($name -match "^(about|contact|privacy|methodology)\.html" -or $name -match "^(en|zh)/(about|contact|privacy|methodology)\.html") {
        $priority = "0.3"
        $changefreq = "yearly"
    }

    # File last modified date -> W3C Datetime (YYYY-MM-DD)
    $lastmod = $f.LastWriteTime.ToString("yyyy-MM-dd")

    $pages += @{
        Path = $name
        Lang = $lang
        Priority = $priority
        ChangeFreq = $changefreq
        LastMod = $lastmod
    }
}

# Build XML
$xml = New-Object System.Text.StringBuilder
[void]$xml.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$xml.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
[void]$xml.AppendLine('        xmlns:xhtml="http://www.w3.org/1999/xhtml">')

foreach ($p in $pages) {
    $cleanPath = "/" + ($p.Path -replace '\.html$', '')
    if ($cleanPath -match '/index$') {
        $cleanPath = $cleanPath -replace '/index$', '/'
    }
    $url = "$BaseUrl$cleanPath"
    [void]$xml.AppendLine('  <url>')
    [void]$xml.AppendLine("    <loc>$url</loc>")

    # hreflang alternates (blog paths handled first)
    if ($p.Path -match '^blog/zh/') {
        $enClean = ($p.Path -replace '^blog/zh/', 'blog/en/') -replace '\.html$', '' -replace '/index$', '/'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$enClean'/>")
    } elseif ($p.Path -match '^blog/en/') {
        $zhClean = ($p.Path -replace '^blog/en/', 'blog/zh/') -replace '\.html$', '' -replace '/index$', '/'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$zhClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl$cleanPath'/>")
    } elseif ($p.Path -match '^tags/') {
        $enClean = ($p.Path -replace '^tags/', 'en/tags/') -replace '\.html$', '' -replace '/index$', '/'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl$cleanPath'/>")
    } elseif ($p.Lang -eq 'zh-CN') {
        $enClean = ($p.Path -replace '^zh/', 'en/') -replace '\.html$', '' -replace '/index$', '/'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$enClean'/>")
    } elseif ($p.Path -match '^en/tags/') {
        $zhClean = ($p.Path -replace '^en/', '') -replace '\.html$', '' -replace '/index$', '/'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$zhClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl$cleanPath'/>")
    } elseif ($p.Lang -eq 'en') {
        $zhClean = ($p.Path -replace '^en/', 'zh/') -replace '\.html$', '' -replace '/index$', '/'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$zhClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl$cleanPath'/>")
    }

    [void]$xml.AppendLine("    <lastmod>$($p.LastMod)</lastmod>")
    [void]$xml.AppendLine("    <changefreq>$($p.ChangeFreq)</changefreq>")
    [void]$xml.AppendLine("    <priority>$($p.Priority)</priority>")
    [void]$xml.AppendLine('  </url>')
}

[void]$xml.AppendLine('</urlset>')

# Write UTF8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$Root\sitemap.xml", $xml.ToString(), $utf8NoBom)

Write-Host "Done! Generated sitemap with $($pages.Count) URLs"
Write-Host "Skipped noindex pages: $noindexSkipped"
Write-Host "Saved to: $Root\sitemap.xml"
