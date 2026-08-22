#!/usr/bin/env python3
"""
Analyze sitemap.xml for calculator-site project.
Checks URL count, hreflang consistency, and validates against actual pages.
"""

import xml.etree.ElementTree as ET
import os
import re
from collections import defaultdict

SITEMAP_PATH = "../sitemap.xml"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def parse_sitemap():
    """Parse sitemap.xml and extract URLs, hreflang links, etc."""
    tree = ET.parse(SITEMAP_PATH)
    root = tree.getroot()
    
    namespace = {
        'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xhtml': 'http://www.w3.org/1999/xhtml'
    }
    
    urls = []
    for url_elem in root.findall('ns:url', namespace):
        loc = url_elem.find('ns:loc', namespace).text
        lastmod = url_elem.find('ns:lastmod', namespace).text if url_elem.find('ns:lastmod', namespace) is not None else None
        changefreq = url_elem.find('ns:changefreq', namespace).text if url_elem.find('ns:changefreq', namespace) is not None else None
        priority = url_elem.find('ns:priority', namespace).text if url_elem.find('ns:priority', namespace) is not None else None
        
        hreflang = {}
        for alternate in url_elem.findall('xhtml:link', namespace):
            if alternate.get('rel') == 'alternate':
                hreflang[alternate.get('hreflang')] = alternate.get('href')
        
        urls.append({
            'loc': loc,
            'lastmod': lastmod,
            'changefreq': changefreq,
            'priority': priority,
            'hreflang': hreflang
        })
    
    return urls

def analyze_hreflang_consistency(urls):
    """Check if hreflang links are consistent across languages."""
    issues = []
    
    # Group URLs by page path (without language prefix)
    page_groups = defaultdict(list)
    for url in urls:
        path = url['loc'].replace('https://www.calc-tools.top/', '')
        # Remove language prefix if present
        if path.startswith('en/') or path.startswith('zh/'):
            lang = path[:2]
            base_path = path[3:]  # Remove 'en/' or 'zh/'
        else:
            lang = 'default'
            base_path = path
        
        page_groups[base_path].append((lang, url['loc']))
    
    # Check each page group
    for base_path, page_variants in page_groups.items():
        if len(page_variants) < 2:
            continue  # Only one language version
        
        # Check if all language variants have consistent hreflang links
        for lang, loc in page_variants:
            for url in urls:
                if url['loc'] == loc:
                    hreflang = url['hreflang']
                    
                    # For Chinese pages, should have hreflang to English version
                    if lang == 'zh' and 'en' not in hreflang:
                        issues.append(f"Chinese page {loc} missing hreflang to English")
                    
                    # For English pages, should have hreflang to Chinese version
                    if lang == 'en' and 'zh-CN' not in hreflang and len(page_variants) > 1:
                        issues.append(f"English page {loc} missing hreflang to Chinese")
                    
                    # Check x-default
                    if 'x-default' not in hreflang:
                        issues.append(f"Page {loc} missing x-default hreflang")
    
    return issues

def check_actual_pages(urls):
    """Check if sitemap URLs correspond to actual files."""
    issues = []
    
    # List actual HTML files
    actual_pages = set()
    for root_dir, dirs, files in os.walk(PROJECT_ROOT):
        for file in files:
            if file.endswith('.html'):
                rel_path = os.path.relpath(os.path.join(root_dir, file), PROJECT_ROOT)
                # Convert to URL path
                url_path = rel_path.replace('\\', '/').replace('.html', '')
                if url_path.endswith('/index'):
                    url_path = url_path[:-6]  # Remove '/index'
                actual_pages.add(url_path)
    
    # Check each sitemap URL
    for url in urls:
        loc = url['loc']
        path = loc.replace('https://www.calc-tools.top/', '')
        
        # Remove trailing slash for comparison
        if path.endswith('/'):
            path = path[:-1]
        
        # Check if page exists
        if path not in actual_pages:
            # Check for special cases
            if path == '':  # Root page
                if 'index.html' not in actual_pages:
                    issues.append(f"Sitemap URL {loc} points to root but no index.html found")
            else:
                issues.append(f"Sitemap URL {loc} has no corresponding HTML file")
    
    # Check for HTML files not in sitemap
    sitemap_paths = set()
    for url in urls:
        path = url['loc'].replace('https://www.calc-tools.top/', '')
        if path.endswith('/'):
            path = path[:-1]
        sitemap_paths.add(path)
    
    for page in actual_pages:
        if page not in sitemap_paths:
            # Skip certain non-indexed pages
            if any(x in page for x in ['404', 'error', 'test', 'debug']):
                continue
            issues.append(f"HTML file {page} not found in sitemap")
    
    return issues

def main():
    print("=== Sitemap Analysis Report ===\n")
    
    urls = parse_sitemap()
    print(f"Total URLs in sitemap: {len(urls)}")
    
    # Analyze hreflang consistency
    hreflang_issues = analyze_hreflang_consistency(urls)
    print(f"\nHreflang consistency issues: {len(hreflang_issues)}")
    for issue in hreflang_issues:
        print(f"  - {issue}")
    
    # Check actual pages
    page_issues = check_actual_pages(urls)
    print(f"\nPage existence issues: {len(page_issues)}")
    for issue in page_issues[:10]:  # Show first 10
        print(f"  - {issue}")
    if len(page_issues) > 10:
        print(f"  ... and {len(page_issues) - 10} more")
    
    # Summary
    total_issues = len(hreflang_issues) + len(page_issues)
    print(f"\n=== Summary ===")
    print(f"Total issues found: {total_issues}")
    
    return total_issues

if __name__ == "__main__":
    exit_code = 0 if main() == 0 else 1
    exit(exit_code)