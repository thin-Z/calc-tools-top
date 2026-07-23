# Inject internal links: blog <-> tool cross-linking
param(
    [string]$Root = "D:\_Careate.Program\calculator-site"
)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Blog <-> Tool mapping
$zhBlogs = @(
    "mortgage-rate-trend-2026",
    "bmi-normal-range-guide",
    "equal-installment-vs-equal-principal",
    "tax-deduction-guide-2026",
    "discount-calculation-tips",
    "car-loan-calculator-guide",
    "housing-fund-loan-guide",
    "compound-interest-guide",
    "date-calculation-tips",
    "image-compression-guide",
    "overtime-pay-guide",
    "standard-weight-guide"
)

$zhToolMap = @{}
$zhToolMap["mortgage-rate-trend-2026"] = "mortgage"
$zhToolMap["bmi-normal-range-guide"] = "bmi"
$zhToolMap["equal-installment-vs-equal-principal"] = "mortgage"
$zhToolMap["tax-deduction-guide-2026"] = "tax2026"
$zhToolMap["discount-calculation-tips"] = "discount"
$zhToolMap["car-loan-calculator-guide"] = "car-loan"
$zhToolMap["housing-fund-loan-guide"] = "housing-fund"
$zhToolMap["compound-interest-guide"] = "compound-interest"
$zhToolMap["date-calculation-tips"] = "date-calc"
$zhToolMap["image-compression-guide"] = "compress"
$zhToolMap["overtime-pay-guide"] = "overtime"
$zhToolMap["standard-weight-guide"] = "ideal-weight"

$enBlogs = $zhBlogs
$enToolMap = @{}
$enToolMap["mortgage-rate-trend-2026"] = "mortgage"
$enToolMap["bmi-normal-range-guide"] = "bmi"
$enToolMap["equal-installment-vs-equal-principal"] = "mortgage"
$enToolMap["tax-deduction-guide-2026"] = "tax2026"
$enToolMap["discount-calculation-tips"] = "discount"
$enToolMap["car-loan-calculator-guide"] = "car-loan"
$enToolMap["housing-fund-loan-guide"] = "housing-fund"
$enToolMap["compound-interest-guide"] = "compound-interest"
$enToolMap["date-calculation-tips"] = "date-calc"
$enToolMap["image-compression-guide"] = "compress"
$enToolMap["overtime-pay-guide"] = "overtime"
$enToolMap["standard-weight-guide"] = "ideal-weight"

$totalModified = 0

# 1. Add related blog links to zh tool pages
Write-Host "=== Chinese tool pages ==="
foreach ($blog in $zhBlogs) {
    $tool = $zhToolMap[$blog]
    $tf = "$Root\zh\calculators\$tool.html"
    if (-not (Test-Path $tf)) { $tf = "$Root\zh\image\$tool.html" }
    if (-not (Test-Path $tf)) { $tf = "$Root\zh\text\$tool.html" }
    if (-not (Test-Path $tf)) { continue }

    $c = [System.IO.File]::ReadAllText($tf, [System.Text.Encoding]::UTF8)
    if ($c -match 'class="related-posts"' -and $c -match $blog) {
        Write-Host "  - zh/$tool (already linked)"
        continue
    }

    $bf = "$Root\blog\zh\$blog.html"
    $bt = ""
    if (Test-Path $bf) {
        $bc = [System.IO.File]::ReadAllText($bf, [System.Text.Encoding]::UTF8)
        if ($bc -match '<title>([^<]+)</title>') { $bt = $Matches[1] }
        $bt = $bt -replace ' - .*$', ''
    }
    if ($bt -eq "") { $bt = $blog }

    $rh = @"
    <section class="related-posts">
        <h3>相关阅读</h3>
        <ul>
            <li><a href="/blog/zh/$blog.html">$bt</a></li>
        </ul>
    </section>

"@
    $c = $c -replace '(</body>)', "$rh`$1"
    [System.IO.File]::WriteAllText($tf, $c, $utf8NoBom)
    Write-Host "  + zh/$tool <- $blog"
    $totalModified++
}

# 2. Add related blog links to en tool pages
Write-Host "=== English tool pages ==="
foreach ($blog in $enBlogs) {
    $tool = $enToolMap[$blog]
    $tf = "$Root\en\calculators\$tool.html"
    if (-not (Test-Path $tf)) { $tf = "$Root\en\image\$tool.html" }
    if (-not (Test-Path $tf)) { $tf = "$Root\en\text\$tool.html" }
    if (-not (Test-Path $tf)) { continue }

    $c = [System.IO.File]::ReadAllText($tf, [System.Text.Encoding]::UTF8)
    if ($c -match 'class="related-posts"' -and $c -match $blog) {
        Write-Host "  - en/$tool (already linked)"
        continue
    }

    $bf = "$Root\blog\en\$blog.html"
    $bt = ""
    if (Test-Path $bf) {
        $bc = [System.IO.File]::ReadAllText($bf, [System.Text.Encoding]::UTF8)
        if ($bc -match '<title>([^<]+)</title>') { $bt = $Matches[1] }
        $bt = $bt -replace ' - .*$', ''
    }
    if ($bt -eq "") { $bt = $blog }

    $rh = @"
    <section class="related-posts">
        <h3>Related Reading</h3>
        <ul>
            <li><a href="/blog/en/$blog.html">$bt</a></li>
        </ul>
    </section>

"@
    $c = $c -replace '(</body>)', "$rh`$1"
    [System.IO.File]::WriteAllText($tf, $c, $utf8NoBom)
    Write-Host "  + en/$tool <- $blog"
    $totalModified++
}

# 3. Add tool CTA to zh blog articles (if missing)
Write-Host "=== Chinese blog CTA ==="
foreach ($blog in $zhBlogs) {
    $tool = $zhToolMap[$blog]
    $bf = "$Root\blog\zh\$blog.html"
    if (-not (Test-Path $bf)) { continue }

    $c = [System.IO.File]::ReadAllText($bf, [System.Text.Encoding]::UTF8)
    if ($c -match 'class="blog-cta"' -and $c -match $tool) {
        Write-Host "  - $blog (already has CTA)"
        continue
    }

    $tf = "$Root\zh\calculators\$tool.html"
    if (-not (Test-Path $tf)) { $tf = "$Root\zh\image\$tool.html" }
    if (-not (Test-Path $tf)) { $tf = "$Root\zh\text\$tool.html" }
    $tn = $tool
    if (Test-Path $tf) {
        $tc = [System.IO.File]::ReadAllText($tf, [System.Text.Encoding]::UTF8)
        if ($tc -match '<title>([^<]+)</title>') { $tn = $Matches[1] }
        $tn = $tn -replace ' - .*$', ''
    }

    $cta = @"
            <div class="blog-cta">
                <p>$tn - free online tool</p>
                <p><a href="/zh/calculators/$tool.html">Use $tn Now</a></p>
            </div>

"@
    $c = $c -replace '(</article>)', "$cta`$1"
    [System.IO.File]::WriteAllText($bf, $c, $utf8NoBom)
    Write-Host "  + $blog <- $tool"
    $totalModified++
}

# 4. Add tool CTA to en blog articles (if missing)
Write-Host "=== English blog CTA ==="
foreach ($blog in $enBlogs) {
    $tool = $enToolMap[$blog]
    $bf = "$Root\blog\en\$blog.html"
    if (-not (Test-Path $bf)) { continue }

    $c = [System.IO.File]::ReadAllText($bf, [System.Text.Encoding]::UTF8)
    if ($c -match 'class="blog-cta"' -and $c -match $tool) {
        Write-Host "  - $blog (already has CTA)"
        continue
    }

    $tf = "$Root\en\calculators\$tool.html"
    if (-not (Test-Path $tf)) { $tf = "$Root\en\image\$tool.html" }
    if (-not (Test-Path $tf)) { $tf = "$Root\en\text\$tool.html" }
    $tn = $tool
    if (Test-Path $tf) {
        $tc = [System.IO.File]::ReadAllText($tf, [System.Text.Encoding]::UTF8)
        if ($tc -match '<title>([^<]+)</title>') { $tn = $Matches[1] }
        $tn = $tn -replace ' - .*$', ''
    }

    $cta = @"
            <div class="blog-cta">
                <p>$tn - Free Online Tool</p>
                <p><a href="/en/calculators/$tool.html">Use $tn Now</a></p>
            </div>

"@
    $c = $c -replace '(</article>)', "$cta`$1"
    [System.IO.File]::WriteAllText($bf, $c, $utf8NoBom)
    Write-Host "  + $blog <- $tool"
    $totalModified++
}

# 5. Add CSS
$cssFile = "$Root\css\style.css"
$cssContent = [System.IO.File]::ReadAllText($cssFile, [System.Text.Encoding]::UTF8)
if ($cssContent -notmatch '\.related-posts') {
    $rcss = @"

/* Related posts / internal links */
.related-posts {
    margin-top: 3rem;
    padding: 1.5rem;
    background: var(--bg-card, #f8f9fa);
    border-radius: 12px;
    border: 1px solid var(--border-color, #e9ecef);
}
.related-posts h3 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: var(--text-primary, #1a1a2e);
}
.related-posts ul {
    list-style: none;
    padding: 0;
    margin: 0;
}
.related-posts li {
    padding: 0.4rem 0;
}
.related-posts a {
    color: var(--text-link, #2563eb);
    text-decoration: none;
}
.related-posts a:hover {
    text-decoration: underline;
}

.blog-cta {
    margin: 2rem 0;
    padding: 1.2rem 1.5rem;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: #fff;
    border-radius: 12px;
    text-align: center;
}
.blog-cta p {
    margin: 0.3rem 0;
    color: #fff;
}
.blog-cta a {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.5rem 1.2rem;
    background: #fff;
    color: #2563eb;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
}
.blog-cta a:hover {
    background: #f0f0ff;
}
"@
    $cssContent += $rcss
    [System.IO.File]::WriteAllText($cssFile, $cssContent, $utf8NoBom)
    Write-Host "+ Added related-posts CSS to style.css"
} else {
    Write-Host "- style.css already has related-posts CSS"
}

Write-Host "Done! Modified $totalModified files."