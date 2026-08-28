#!/usr/bin/env python3
"""
Full SEO audit for calculator-site.
Checks all major SEO, performance and security aspects.
"""

import os
import json
import re
from bs4 import BeautifulSoup
from collections import defaultdict

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_all_html_files():
    """Get all HTML files excluding node_modules and includes."""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        if 'node_modules' in root or 'includes' in root:
            continue
        for f in filenames:
            if f.endswith('.html'):
                files.append(os.path.join(root, f))
    return files

def count_sitemap_urls():
    """Parse sitemap and count URLs by category."""
    sitemap_path = os.path.join(PROJECT_ROOT, 'sitemap.xml')
    with open(sitemap_path, 'r') as f:
        content = f.read()
    
    locs = re.findall(r'<loc>(.*?)</loc>', content)
    categories = defaultdict(int)
    for loc in locs:
        if '/blog/' in loc:
            categories['blog'] += 1
        elif '/calculators/' in loc:
            categories['calculators'] += 1
        elif '/text/' in loc:
            categories['text'] += 1
        elif '/image/' in loc:
            categories['image'] += 1
        else:
            categories['other'] += 1
    return len(locs), categories

def check_meta_description_lengths():
    """Check meta description lengths across all pages."""
    short_descriptions = []
    long_descriptions = []
    
    for filepath in get_all_html_files():
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            content = meta_desc['content'].strip()
            rel_path = os.path.relpath(filepath, PROJECT_ROOT)
            if len(content) < 50:
                short_descriptions.append((rel_path, len(content), content))
            elif len(content) > 160:
                long_descriptions.append((rel_path, len(content), content))
    
    return short_descriptions, long_descriptions

def check_structured_data():
    """Check for JSON-LD structured data."""
    files_with_ld = []
    files_without_ld = []
    
    for filepath in get_all_html_files():
        rel_path = os.path.relpath(filepath, PROJECT_ROOT)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'application/ld+json' in content:
            files_with_ld.append(rel_path)
        else:
            files_without_ld.append(rel_path)
    
    return files_with_ld, files_without_ld

def check_duplicate_tags():
    """Check for duplicate meta tags."""
    duplicates = []
    
    for filepath in get_all_html_files():
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        rel_path = os.path.relpath(filepath, PROJECT_ROOT)
        
        # Check duplicate title
        titles = soup.find_all('title')
        if len(titles) > 1:
            duplicates.append(f"{rel_path}: 多个title标签 ({len(titles)})")
        
        # Check duplicate og:title
        og_titles = soup.find_all('meta', attrs={'property': 'og:title'})
        if len(og_titles) > 1:
            duplicates.append(f"{rel_path}: 多个og:title标签 ({len(og_titles)})")
        
        # Check duplicate canonical
        canonicals = soup.find_all('link', attrs={'rel': 'canonical'})
        if len(canonicals) > 1:
            duplicates.append(f"{rel_path}: 多个canonical标签 ({len(canonicals)})")
    
    return duplicates

def check_hreflang_coverage():
    """Check hreflang coverage across all pages."""
    with_hrefs = 0
    without_hrefs = 0
    
    for filepath in get_all_html_files():
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        hreflang_tags = soup.find_all('link', attrs={'rel': 'alternate', 'hreflang': True})
        if len(hreflang_tags) >= 2:
            with_hrefs += 1
        else:
            without_hrefs += 1
    
    return with_hrefs, without_hrefs

def check_canonical_urls():
    """Check if canonical URLs match expected pattern."""
    issues = []
    
    for filepath in get_all_html_files():
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        rel_path = os.path.relpath(filepath, PROJECT_ROOT)
        canonical = soup.find('link', attrs={'rel': 'canonical'})
        
        if canonical and canonical.get('href'):
            href = canonical['href']
            # Should start with https://www.calc-tools.top/
            if not href.startswith('https://www.calc-tools.top/'):
                issues.append(f"{rel_path}: canonical URL不以https://www.calc-tools.top/开头")
            # Should not have .html extension (clean URLs enabled)
            if href.endswith('.html'):
                issues.append(f"{rel_path}: canonical URL包含.html扩展名")
    
    return issues

def check_security_headers():
    """Check security headers in vercel.json."""
    issues = []
    
    with open(os.path.join(PROJECT_ROOT, 'vercel.json'), 'r') as f:
        config = json.load(f)
    
    required_headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': None,
        'Content-Security-Policy': None,
        'Permissions-Policy': None,
        'Strict-Transport-Security': None,
    }
    
    found_headers = set()
    for header_group in config.get('headers', []):
        for header in header_group.get('headers', []):
            key = header['key']
            found_headers.add(key)
            if key in required_headers and required_headers[key] is not None:
                if header['value'] != required_headers[key]:
                    issues.append(f"{key}值不匹配: 期望'{required_headers[key]}', 实际'{header['value']}'")
    
    for key in required_headers:
        if key not in found_headers:
            issues.append(f"缺少安全头: {key}")
    
    return issues

def check_redirect_rules():
    """Check redirect rules for SEO friendliness."""
    with open(os.path.join(PROJECT_ROOT, 'vercel.json'), 'r') as f:
        config = json.load(f)
    
    redirects = config.get('redirects', [])
    
    # Check non-www to www redirect
    has_nonwww_redirect = any(
        r.get('has') and any(h.get('value') == 'calc-tools.top' for h in r.get('has', []))
        for r in redirects
    )
    
    # Check .html to clean URL redirect
    has_html_redirect = any(
        r.get('source') == '/(.*).html' for r in redirects
    )
    
    issues = []
    if not has_nonwww_redirect:
        issues.append("缺少非www到www的重定向")
    if not has_html_redirect:
        issues.append("缺少.html到clean URL的重定向")
    
    return issues, len(redirects)

def main():
    print("=" * 60)
    print("CALCULATOR-SITE FULL SEO & PERFORMANCE AUDIT")
    print("=" * 60)
    
    # 1. Sitemap Analysis
    print("\n## 1. SITEMAP ANALYSIS")
    total_urls, categories = count_sitemap_urls()
    print(f"Total URLs in sitemap: {total_urls}")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")
    
    # Count actual HTML files
    html_files = get_all_html_files()
    print(f"\nTotal HTML files (excl. node_modules): {len(html_files)}")
    
    # 2. Meta Description Analysis
    print("\n## 2. META DESCRIPTION ANALYSIS")
    short_descs, long_descs = check_meta_description_lengths()
    print(f"Pages with short meta descriptions (<50 chars): {len(short_descs)}")
    for path, length, content in short_descs[:5]:
        print(f"  - {path}: {length} chars - \"{content}\"")
    print(f"Pages with long meta descriptions (>160 chars): {len(long_descs)}")
    
    # 3. Structured Data
    print("\n## 3. STRUCTURED DATA (JSON-LD)")
    with_ld, without_ld = check_structured_data()
    print(f"Pages with JSON-LD: {len(with_ld)}")
    print(f"Pages without JSON-LD: {len(without_ld)}")
    if without_ld:
        print(f"  First 5 without: {without_ld[:5]}")
    
    # 4. Duplicate Tags
    print("\n## 4. DUPLICATE TAGS")
    duplicates = check_duplicate_tags()
    if duplicates:
        print(f"Found {len(duplicates)} duplicate tag issues:")
        for dup in duplicates:
            print(f"  - {dup}")
    else:
        print("No duplicate tags found")
    
    # 5. Hreflang Coverage
    print("\n## 5. HREFLANG COVERAGE")
    with_hrefs, without_hrefs = check_hreflang_coverage()
    print(f"Pages with proper hreflang (>=2): {with_hrefs}")
    print(f"Pages without proper hreflang: {without_hrefs}")
    
    # 6. Canonical URL Check
    print("\n## 6. CANONICAL URL CHECK")
    canonical_issues = check_canonical_urls()
    if canonical_issues:
        print(f"Found {len(canonical_issues)} canonical URL issues:")
        for issue in canonical_issues:
            print(f"  - {issue}")
    else:
        print("All canonical URLs are properly formatted")
    
    # 7. Security Headers
    print("\n## 7. SECURITY HEADERS")
    header_issues = check_security_headers()
    if header_issues:
        for issue in header_issues:
            print(f"  - {issue}")
    else:
        print("All required security headers present")
    
    # 8. Redirect Rules
    print("\n## 8. REDIRECT RULES")
    redirect_issues, redirect_count = check_redirect_rules()
    print(f"Total redirect rules: {redirect_count}")
    if redirect_issues:
        for issue in redirect_issues:
            print(f"  - {issue}")
    else:
        print("SEO-friendly redirect rules configured")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    total_issues = (len(short_descs) + len(canonical_issues) + 
                   len(duplicates) + len(header_issues) + len(redirect_issues))
    print(f"Total issues found: {total_issues}")
    print(f"URLs in sitemap: {total_urls}")
    print(f"HTML files: {len(html_files)}")
    print(f"Hreflang coverage: {with_hrefs}/{with_hrefs + without_hrefs}")
    print(f"Canonical coverage: {len(html_files) - len(canonical_issues)}/{len(html_files)}")
    
    return total_issues

if __name__ == "__main__":
    exit_code = 0 if main() == 0 else 1
    exit(exit_code)