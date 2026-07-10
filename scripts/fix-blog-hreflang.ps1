# Fix blog/en pages where x-default points to zh-CN instead of EN
$root = "D:\_Careate.Program\calculator-site\blog\en"
$badFiles = @(
    "date-calculation-tips.html",
    "equal-installment-vs-equal-principal.html",
    "housing-fund-loan-guide.html",
    "mortgage-rate-trend-2026.html",
    "qr-generator-guide.html",
    "tax-deduction-guide-2026.html"
)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

foreach ($file in $badFiles) {
    $path = Join-Path $root $file
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $name = $file -replace '\.html$', ''

    # Find the zh-CN hreflang line
    $zhCnPattern = [regex]::Escape("<link rel=""alternate"" hreflang=""zh-CN"" href=""https://calc-tools.top/blog/zh/$name"">")
    
    # Find the x-default hreflang line pointing to zh
    $xDefaultZhPattern = [regex]::Escape("<link rel=""alternate"" hreflang=""x-default"" href=""https://calc-tools.top/blog/zh/$name"">")

    $enHreflang = "<link rel=""alternate"" hreflang=""en"" href=""https://calc-tools.top/blog/en/$name"">"
    $xDefaultEnHreflang = "<link rel=""alternate"" hreflang=""x-default"" href=""https://calc-tools.top/blog/en/$name"">"

    # Split into lines
    $lines = $content -split "`n"
    $newLines = @()
    $fixed = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        if ($line -match [regex]::Escape("<link rel=""alternate"" hreflang=""x-default"" href=""https://calc-tools.top/blog/zh/")) {
            # Replace x-default pointing to zh with x-default pointing to en
            $newLines += "    $xDefaultEnHreflang"
            $fixed = $true
        }
        elseif ($line -match [regex]::Escape("<link rel=""alternate"" hreflang=""zh-CN"" href=""https://calc-tools.top/blog/zh/$name"">")) {
            # Keep zh-CN line, then add en line if not already present
            $newLines += $line
            # Check if next line is blank (cleared by section 6)
            $fixed = $true
        }
        elseif ($line.Trim() -eq "" -and $fixed) {
            # Skip blank lines that are between zh-CN and x-default (the cleared line)
            # But only skip one blank line
            $skipBlank = $true
            if ($skipBlank) {
                # Don't add this blank line
            }
        }
        else {
            $newLines += $line
        }
    }

    # Check if en hreflang is already present
    $hasEn = $false
    foreach ($l in $newLines) {
        if ($l -match "hreflang=""en"" href=""https://calc-tools.top/blog/en/$name"">") {
            $hasEn = $true
        }
    }

    if (-not $hasEn -and $fixed) {
        # Insert en hreflang after zh-CN line
        $resultLines = @()
        foreach ($l in $newLines) {
            $resultLines += $l
            if ($l -match [regex]::Escape("<link rel=""alternate"" hreflang=""zh-CN"" href=""https://calc-tools.top/blog/zh/$name"">")) {
                $resultLines += "    $enHreflang"
            }
        }
        $newLines = $resultLines
    }

    if ($fixed) {
        $newContent = $newLines -join "`n"
        [System.IO.File]::WriteAllText($path, $newContent, $utf8NoBom)
        Write-Host "FIXED: $file"
    } else {
        Write-Host "NO CHANGE: $file"
    }
}
