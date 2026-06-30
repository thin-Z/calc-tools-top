# Generate correct sitemap.xml based on actual file structure
param(
    [string]$Root = "D:\_Careate.Program\calculator-site",
    [string]$BaseUrl = "https://www.calc-tools.top"
)

$exclude = @("404.html")

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

    # Priority
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
    } elseif ($name -match "^(about|contact|privacy)\.html") {
        $priority = "0.3"
        $changefreq = "yearly"
    } elseif ($name -match "^(en|zh)/(about|contact|privacy)\.html") {
        $priority = "0.3"
        $changefreq = "yearly"
    }

    $pages += @{
        Path = $name
        Lang = $lang
        Priority = $priority
        ChangeFreq = $changefreq
    }
}

# Build XML
$xml = New-Object System.Text.StringBuilder
[void]$xml.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$xml.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
[void]$xml.AppendLine('        xmlns:xhtml="http://www.w3.org/1999/xhtml">')

foreach ($p in $pages) {
    $url = "$BaseUrl/$($p.Path)"
    [void]$xml.AppendLine('  <url>')
    [void]$xml.AppendLine("    <loc>$url</loc>")

    # hreflang alternates
    if ($p.Lang -eq "zh-CN") {
        $enUrl = $p.Path -replace "^zh/", "en/"
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$($p.Path)'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enUrl'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$($p.Path)'/>")
    } elseif ($p.Lang -eq "en") {
        $zhUrl = $p.Path -replace "^en/", "zh/"
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$($p.Path)'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$zhUrl'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$zhUrl'/>")
    } elseif ($p.Path -match "^blog/en/") {
        $zhUrl = $p.Path -replace "^blog/en/", "blog/zh/"
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$($p.Path)'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$zhUrl'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$zhUrl'/>")
    } elseif ($p.Path -match "^blog/zh/") {
        $enUrl = $p.Path -replace "^blog/zh/", "blog/en/"
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='zh-CN' href='$BaseUrl/$($p.Path)'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='en' href='$BaseUrl/$enUrl'/>")
        [void]$xml.AppendLine("    <xhtml:link rel='alternate' hreflang='x-default' href='$BaseUrl/$($p.Path)'/>")
    }

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
