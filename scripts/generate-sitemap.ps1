# Generate correct sitemap.xml based on actual file structure
param(
    [string]$Root = (Get-Location).Path,
    [string]$BaseUrl = "https://www.calc-tools.top"
)

$exclude = @("404.html", "zh/index.html")

# Collect all HTML files
$files = Get-ChildItem -Recurse -Filter "*.html" $Root | Where-Object { $_.FullName -notmatch '\\node_modules\\' }

$pages = @()
foreach ($f in $files) {
    $relPath = $f.FullName.Replace($Root, "").Replace("\", "/")
    $name = $relPath.TrimStart("/")
    if ($exclude -contains $name) { continue }

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
    } elseif ($name -match "^(en|zh)/calculators/" -or $name -match "^(en|zh)/image/" -or $name -match "^(en|zh)/text/") {
        $priority = "0.8"
        $changefreq = "monthly"
    } elseif ($name -match "^(about|contact|privacy)\.html" -or $name -match "^(en|zh)/(about|contact|privacy)\.html") {
        $priority = "0.3"
        $changefreq = "yearly"
    }

    # File last modified date → W3C Datetime (YYYY-MM-DD)
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
    } elseif ($p.Lang -eq 'zh-CN') {
        $enClean = ($p.Path -replace '^zh/', 'en/') -replace '\.html$', '' -replace '/index$', '/'
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl$cleanPath'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enClean'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$enClean'/>")
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
Write-Host "Saved to: $Root\sitemap.xml"