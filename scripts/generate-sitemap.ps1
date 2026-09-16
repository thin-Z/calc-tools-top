# Generate sitemap.xml from the actual file structure.
#
# NOTE (2026-09-16): This file is intentionally kept PURE ASCII.
#   Windows PowerShell 5.1 reads UTF-8 files WITHOUT a BOM as the system ANSI
#   codepage (GBK on this machine), which garbles non-ASCII comments/strings and
#   makes the parser fail with "Unexpected token". Editing tools tend to drop the
#   BOM, which silently broke this script twice. Keeping it ASCII-only removes the
#   whole failure mode. If you must add non-ASCII text, save as UTF-8 *with BOM*.
#   This machine has no PowerShell 7 (pwsh); run with powershell.exe 5.1.
#
# Root defaults to the parent of this script's directory (repo root) so invoking
# it from elsewhere cannot scan an empty dir and emit a 0-entry dirty sitemap.
param(
    [string]$Root = (Get-Location).Path,
    [string]$BaseUrl = "https://www.calc-tools.top"
)

# Always anchor Root to the repo root (parent of scripts/).
$Root = (Split-Path $PSScriptRoot)

$exclude = @("404.html", "zh/index.html", "embed.html")

# Pages carrying "noindex" must never enter the sitemap (GSC reports
# "Submitted URL marked noindex", which weakens sitemap trust and hurts index rate).
# Gate: scripts/check-sitemap.mjs (verify #28) cross-checks this filter.
$noindexSkipped = 0

# Collect all HTML files.
# This exclude list MUST stay aligned with EXCLUDE_DIRS in the verify #33 gate
# scripts/check-sitemap-coverage.mjs. Otherwise a re-run pulls engineering/test
# artifacts (e2e, test-results, snapshots, api, scripts, css, js, assets, .workbuddy,
# .audit_tmp, ...) into the sitemap and produces dead links - historically this
# emitted a 328-entry dirty sitemap. Changing one side requires changing the other.
$excludeDirRe = '\\(node_modules|dist|docs|deliverables|includes|api|scripts|css|js|assets|snapshots|e2e|test-results|playwright-report|\.workbuddy|\.audit_tmp|\.git|\.githooks)\\'
$files = Get-ChildItem -Recurse -Filter "*.html" $Root | Where-Object { $_.FullName -notmatch $excludeDirRe }

$pages = @()
foreach ($f in $files) {
    $relPath = $f.FullName.Replace($Root, "").Replace("\", "/")
    $name = $relPath.TrimStart("/")
    if ($exclude -contains $name) { continue }

    # Detect noindex (covers both attribute orders of the meta robots tag).
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
    # The site is trailingSlash:false + cleanUrls:true, so directory pages have a
    # canonical form WITHOUT a trailing slash (each page's own canonical tag and the
    # live 308 target are both slash-less). The old code did
    #     $cleanPath = $cleanPath -replace '/index$', '/'
    # which emitted /zh/text/ style URLs while the live site 308-redirects them to
    # /zh/text. Submitting redirect URLs that contradict the pages' own canonical
    # tags is the direct cause of the GSC "Page with redirect" bucket and of several
    # directory hubs never being indexed (fixed 2026-09-16).
    if ($cleanPath -match '/index$') {
        $cleanPath = $cleanPath -replace '/index$'
    }
    if ([string]::IsNullOrEmpty($cleanPath)) { $cleanPath = '/' }   # homepage form
    $url = "$BaseUrl$cleanPath"
    [void]$xml.AppendLine('  <url>')
    [void]$xml.AppendLine("    <loc>$url</loc>")

    # hreflang alternates (blog paths handled first)
    if ($p.Path -match '^blog/zh/') {
        $enClean = ($p.Path -replace '^blog/zh/', 'blog/en/') -replace '\.html$', '' -replace '/index$'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$enClean'/>")
    } elseif ($p.Path -match '^blog/en/') {
        $zhClean = ($p.Path -replace '^blog/en/', 'blog/zh/') -replace '\.html$', '' -replace '/index$'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$zhClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl$cleanPath'/>")
    } elseif ($p.Path -match '^tags/') {
        $enClean = ($p.Path -replace '^tags/', 'en/tags/') -replace '\.html$', '' -replace '/index$'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl$cleanPath'/>")
    } elseif ($p.Lang -eq 'zh-CN') {
        $enClean = ($p.Path -replace '^zh/', 'en/') -replace '\.html$', '' -replace '/index$'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$enClean'/>")
    } elseif ($p.Path -match '^en/tags/') {
        $zhClean = ($p.Path -replace '^en/', '') -replace '\.html$', '' -replace '/index$'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$zhClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl$cleanPath'/>")
    } elseif ($p.Lang -eq 'en') {
        $zhClean = ($p.Path -replace '^en/', 'zh/') -replace '\.html$', '' -replace '/index$'
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
Write-Host "Node note: this script is ASCII-only on purpose - see header comment."
