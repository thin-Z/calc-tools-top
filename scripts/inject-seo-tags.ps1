# Inject Open Graph tags + Twitter Card tags + SoftwareApplication Schema
param(
    [string]$Root = "D:\_Careate.Program\calculator-site",
    [string]$BaseUrl = "https://calc-tools.top",
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

    # Canonical URL (strip .html early so downstream OG/JSON-LD use clean URL)
    $canonical = ""
    if ($content -match '<link rel="canonical" href="([^"]+)"') {
        $canonical = $Matches[1] -replace '\.html$', ''
    } else {
        $canonical = "$BaseUrl/$($name -replace '\.html$', '')"
    }

    # ---- 1. Remove any existing OG/Twitter tags to avoid duplicate injection ----
    $content = $content -replace "<meta property='og:[^']*'[^>]*/>\s*", ''
    $content = $content -replace '<meta property="og:[^"]*"[^>]*/>\s*', ''
    $content = $content -replace "<meta name='twitter:[^']*'[^>]*/>\s*", ''
    $content = $content -replace '<meta name="twitter:[^"]*"[^>]*/>\s*', ''

    # ---- 1b. Remove old SoftwareApplication JSON-LD blocks so step 3 re-injects with clean URL ----
    $content = $content -replace '(?s)<script type="application/ld\+json">.*?"@type":\s*"SoftwareApplication".*?</script>\s*', ''
    # Remove .html from JSON-LD url fields (catch any missed/embedded ld+json)
    $content = $content -replace '("url"\s*:\s*")([^"]+)\.html(")', '$1$2$3'

    # ---- 2. Inject Open Graph + Twitter tags after meta description ----
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

    # ---- 3. Inject SoftwareApplication Schema on tool pages ----
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

    # ---- 4. Inject Article Schema on blog pages if missing ----
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

    # ---- 5. Clean canonical URL: remove .html ----
    if ($content -match '<link rel="canonical" href="([^"]+)\.html"') {
        $oldUrl = $Matches[0]
        $newUrl = $oldUrl -replace '\.html"', '"'
        $content = $content.Replace($oldUrl, $newUrl)
        $modified = $true
    }

    # ---- 6. Clean hreflang alternate URLs: remove .html ----
    $hreflangPattern = '(href="[^"]*)\.html"'
    $content = $content -replace $hreflangPattern, '$1"'
    $modified = $true

    # ---- 7. Fix duplicate hreflang="zh-CN" on EN blog pages ----
    if ($name -match "^blog/en/") {
        $zhCnMatches = [regex]::Matches($content, 'hreflang="zh-CN"')
        if ($zhCnMatches.Count -gt 1) {
            $lines = $content -split "`n"
            $found = 0
            for($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match 'hreflang="zh-CN"') {
                    $found++
                    if ($found -eq 2) {
                        $lines[$i] = ""  # blank out the duplicate line
                    }
                }
            }
            $content = $lines -join "`n"
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
