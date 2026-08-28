#!/usr/bin/env python3
"""
SEO audit script for calculator-site project.
Checks meta tags, canonical tags, Open Graph, hreflang, etc.
"""

import re
import os
from bs4 import BeautifulSoup

# Sample 10 pages to audit
SAMPLE_PAGES = [
    # Chinese pages
    {"lang": "zh", "path": "index.html", "desc": "中文首页"},
    {"lang": "zh", "path": "en/index.html", "desc": "英文首页"},
    {"lang": "zh", "path": "about.html", "desc": "关于页面"},
    {"lang": "zh", "path": "en/calculators/age-calc.html", "desc": "年龄计算器(英文)"},
    {"lang": "zh", "path": "zh/calculators/age-calc.html", "desc": "年龄计算器(中文)"},
    {"lang": "zh", "path": "contact.html", "desc": "联系页面"},
    {"lang": "zh", "path": "privacy.html", "desc": "隐私政策"},
    {"lang": "zh", "path": "blog/en/age-calc-guide.html", "desc": "博客页面(英文)"},
    {"lang": "zh", "path": "blog/zh/age-calc-guide.html", "desc": "博客页面(中文)"},
    {"lang": "zh", "path": "en/calculators/bmi.html", "desc": "BMI计算器(英文)"},
]

def check_page(file_path, desc):
    """Check SEO elements for a single page."""
    issues = []
    
    if not os.path.exists(file_path):
        return [f"文件不存在: {file_path}"]
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    
    # Check title tag
    title = soup.find('title')
    if not title or not title.string or title.string.strip() == '':
        issues.append("缺少title标签或内容为空")
    elif len(title.string.strip()) < 10:
        issues.append(f"title标签内容过短: {title.string.strip()}")
    
    # Check meta description
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    if not meta_desc or not meta_desc.get('content'):
        issues.append("缺少meta description标签")
    elif len(meta_desc['content'].strip()) < 50:
        issues.append(f"meta description内容过短: {len(meta_desc['content'].strip())}字符")
    
    # Check canonical tag
    canonical = soup.find('link', attrs={'rel': 'canonical'})
    if not canonical:
        issues.append("缺少canonical标签")
    elif not canonical.get('href'):
        issues.append("canonical标签缺少href属性")
    
    # Check hreflang tags
    hreflang_tags = soup.find_all('link', attrs={'rel': 'alternate'})
    hreflang_count = 0
    for tag in hreflang_tags:
        if tag.get('hreflang'):
            hreflang_count += 1
    
    if hreflang_count == 0:
        issues.append("缺少hreflang标签")
    elif hreflang_count < 2:
        issues.append(f"hreflang标签不足: 只有{hreflang_count}个")
    
    # Check Open Graph tags
    og_tags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
    missing_og = []
    for tag in og_tags:
        if not soup.find('meta', attrs={'property': tag}):
            missing_og.append(tag)
    
    if missing_og:
        issues.append(f"缺少Open Graph标签: {', '.join(missing_og)}")
    
    # Check viewport meta
    viewport = soup.find('meta', attrs={'name': 'viewport'})
    if not viewport:
        issues.append("缺少viewport meta标签")
    
    # Check language attribute
    html_tag = soup.find('html')
    if html_tag and not html_tag.get('lang'):
        issues.append("HTML标签缺少lang属性")
    
    # Check for duplicate meta descriptions
    meta_descs = soup.find_all('meta', attrs={'name': 'description'})
    if len(meta_descs) > 1:
        issues.append(f"存在多个meta description标签: {len(meta_descs)}个")
    
    # Check for duplicate titles
    titles = soup.find_all('title')
    if len(titles) > 1:
        issues.append(f"存在多个title标签: {len(titles)}个")
    
    return issues

def main():
    print("=== SEO Audit Report ===\n")
    
    # Get the project root (parent of scripts directory)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    total_issues = 0
    
    for page in SAMPLE_PAGES:
        file_path = os.path.join(project_root, page["path"])
        print(f"检查页面: {page['desc']} ({page['path']})")
        
        issues = check_page(file_path, page['desc'])
        if issues:
            print(f"  发现问题: {len(issues)}")
            for issue in issues:
                print(f"    - {issue}")
            total_issues += len(issues)
        else:
            print("  通过")
        print()
    
    print(f"=== 摘要 ===")
    print(f"共检查页面: {len(SAMPLE_PAGES)}")
    print(f"总问题数: {total_issues}")
    
    return total_issues

if __name__ == "__main__":
    exit_code = 0 if main() == 0 else 1
    exit(exit_code)