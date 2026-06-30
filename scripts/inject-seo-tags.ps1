# Inject Open Graph tags + Twitter Card tags + SoftwareApplication Schema
param(
    [string]$Root = "D:\_Careate.Program\calculator-site",
    [string]$BaseUrl = "https://www.calc-tools.top",
    [string]$OgImage = "/assets/logo.svg"
)

$exclude = @("404.html")
$files = Get-ChildItem -Recurse -Filter "*.html" $Root | Where-Object { $_.FullName -notmatch '\\node_modules\\' }

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

foreach ($f in $files) {
    $relPath = $f.FullName.Replace($Root, "").Replace("\", "/")
    $name = $relPath.TrimStart("/")
    if ($exclude -contains $name) { continue }

    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $modified = $false

    # ---- Determine page properties ----
    # Language
    if ($name -match "^en/" -or $name -match "^blog/en/") {
        $locale = "en_US"
        $ogType = "website"
    } elseif ($name -match "^blog/zh/") {
        $locale = "zh_CN"
        $ogType = "article"
    } else {
        $locale = "zh_CN"
        $ogType = "website"
    }
    if ($name -match "^(en|zh)/(calculators|image|text)/") {
        $ogType = "website"
    }

    # Extract title
    $title = ""
    if ($content -match '<title>([^<]+)</title>') {
        $title = $Matches[1]
    }

    # Extract description
    $description = ""
    if ($content -match '<meta name="description" content="([^"]+)"') {
        $description = $Matches[1]
    } elseif ($content -match "<meta name='description' content='([^']+)'") {
        $description = $Matches[1]
    }

    # Canonical URL
    $canonical = ""
    if ($content -match '<link rel="canonical" href="([^"]+)"') {
        $canonical = $Matches[1]
    } else {
        $canonical = "$BaseUrl/$name"
    }

    # ---- 1. Inject Open Graph + Twitter tags after meta description ----
    $descPattern = '<meta name="description" content="[^"]*"(\s*/?>)?'
    if ($content -match $descPattern) {
        $match = $Matches[0]
        $ogTags = @()
        $ogTags += "    <meta property='og:title' content='$title'/>"
        $ogTags += "    <meta property='og:description' content='$description'/>"
        $ogTags += "    <meta property='og:type' content='$ogType'/>"
        $ogTags += "    <meta property='og:url' content='$canonical'/>"
        $ogTags += "    <meta property='og:image' content='$BaseUrl$OgImage'/>"
        $ogTags += "    <meta property='og:locale' content='$locale'/>"
        $ogTags += "    <meta name='twitter:card' content='summary_large_image'/>"
        $ogTags += "    <meta name='twitter:title' content='$title'/>"
        $ogTags += "    <meta name='twitter:description' content='$description'/>"
        $ogBlock = "`n" + ($ogTags -join "`n") + "`n"

        $content = $content -replace [regex]::Escape($match), ($match + $ogBlock)
        $modified = $true
    }

    # ---- 2. Inject SoftwareApplication Schema on tool pages ----
    if ($name -match "^(en|zh)/(calculators|image|text)/([^/]+)\.html$") {
        $toolLang = $Matches[1]
        $langValue = $toolLang
        if ($toolLang -eq "en") { $langValue = "en" } else { $langValue = "zh-CN" }

        if ($content -notmatch '"@type":\s*"SoftwareApplication"') {
            $appName = $title
            $appDesc = $description

            $toolSchema = @"
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "$appName",
    "url": "$canonical",
    "description": "$appDesc",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "inLanguage": "$langValue"
}
</script>
"@
            $content = $content -replace '(</head>)', "`n$toolSchema`n`$1"
            $modified = $true
        }
    }

    # ---- 3. Inject Article Schema on blog pages if missing ----
    if ($name -match "^blog/(en|zh)/([^/]+)\.html$" -and $name -notmatch '/index\.html$') {
        $blogLang = $Matches[1]
        if ($blogLang -eq "en") { $blogLang = "en" } else { $blogLang = "zh-CN" }

        if ($content -notmatch '"@type":\s*"Article"') {
            $blogSchema = @"
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "$title",
    "url": "$canonical",
    "description": "$description",
    "inLanguage": "$blogLang"
}
</script>
"@
            $content = $content -replace '(</head>)', "`n$blogSchema`n`$1"
            $modified = $true
        }
    }

    # Write back if modified
    if ($modified) {
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
        Write-Host "✓ $name"
    } else {
        Write-Host "- $name"
    }
}

Write-Host "`nDone!"
