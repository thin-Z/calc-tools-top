<#
.SYNOPSIS
    Validate all HTML files for UTF-8 encoding corruption (U+FFFD replacement characters).
.DESCRIPTION
    Scans .html files for bytes 0xEF 0xBF 0xBD (UTF-8 encoding of U+FFFD),
    which indicates files were written with wrong encoding (ANSI/GBK instead of UTF-8).
    Exits with non-zero code if any corrupted files are found.
.PARAMETER Path
    Root directory to scan. Defaults to script location parent.
.PARAMETER Fix
    Attempt to fix U+FFFD bytes by replacing with $ (only safe for en/ tool pages).
.EXAMPLE
    .\validate-encoding.ps1
    .\validate-encoding.ps1 -Fix
#>

param(
    [string]$Path = (Resolve-Path "$PSScriptRoot/.."),
    [switch]$Fix
)

$badFiles = @()
$totalCount = 0

Get-ChildItem -Path $Path -Recurse -Filter "*.html" | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $hasBad = $false
    for ($i = 0; $i -lt $bytes.Length - 2; $i++) {
        if ($bytes[$i] -eq 239 -and $bytes[$i+1] -eq 191 -and $bytes[$i+2] -eq 189) {
            $hasBad = $true
            break
        }
    }
    if ($hasBad) {
        $badFiles += $_.FullName
        $totalCount++
    }
}

if ($totalCount -eq 0) {
    Write-Host "✓ All HTML files clean - zero U+FFFD corruption found" -ForegroundColor Green
    exit 0
}

Write-Host "✗ Found $totalCount file(s) with U+FFFD corruption:" -ForegroundColor Red
$badFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }

if ($Fix) {
    Write-Host "`nAttempting fix..." -ForegroundColor Yellow
    foreach ($file in $badFiles) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $newBytes = New-Object System.Collections.Generic.List[byte]
        $i = 0
        $count = 0
        while ($i -lt $bytes.Length) {
            if ($i -le $bytes.Length - 3 -and $bytes[$i] -eq 239 -and $bytes[$i+1] -eq 191 -and $bytes[$i+2] -eq 189) {
                $newBytes.Add(0x24)  # Replace U+FFFD with $
                $i += 3
                $count++
            } else {
                $newBytes.Add($bytes[$i])
                $i++
            }
        }
        [System.IO.File]::WriteAllBytes($file, $newBytes.ToArray())
        Write-Host "  Fixed $count U+FFFD in $([System.IO.Path]::GetFileName($file))" -ForegroundColor Green
    }
}

exit 1
