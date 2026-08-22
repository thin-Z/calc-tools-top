#!/usr/bin/env python3
"""
Security audit script for calculator-site project.
Checks CSP, API security, rate limiting, etc.
"""

import json
import os
import re

def check_csp_policy():
    """Check Content-Security-Policy configuration."""
    issues = []
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    with open(os.path.join(project_root, 'vercel.json'), 'r') as f:
        config = json.load(f)
    
    # Find CSP header
    csp_value = None
    for header_group in config.get('headers', []):
        for header in header_group.get('headers', []):
            if header['key'] == 'Content-Security-Policy':
                csp_value = header['value']
                break
    
    if not csp_value:
        return ["缺少Content-Security-Policy头"]
    
    # Check for unsafe-inline in script-src
    if "'unsafe-inline'" in csp_value:
        # Check if it's only in style-src
        script_part = csp_value.split('script-src')[1].split(';')[0] if 'script-src' in csp_value else ''
        if "'unsafe-inline'" in script_part:
            issues.append("CSP允许unsafe-inline在script-src中，存在XSS风险")
    
    # Check for object-src
    if "object-src" not in csp_value:
        issues.append("CSP缺少object-src策略")
    
    # Check for base-uri
    if "base-uri" not in csp_value:
        issues.append("CSP缺少base-uri策略")
    
    return issues

def check_api_security():
    """Check API endpoint security."""
    issues = []
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    # Check likes.js
    with open(os.path.join(project_root, 'api/likes.js'), 'r') as f:
        likes_code = f.read()
    
    # Check for rate limiting
    if 'RATE_LIMIT_MAX' not in likes_code:
        issues.append("likes API缺少速率限制")
    
    # Check for input validation
    if 'cleanId' not in likes_code:
        issues.append("likes API缺少输入清理")
    
    # Check for CORS configuration
    if 'ALLOWED_ORIGINS' not in likes_code:
        issues.append("likes API缺少CORS白名单")
    
    # Check for daily limit
    if 'LIKE_DAILY_MAX' not in likes_code:
        issues.append("likes API缺少每日上限")
    
    # Check clicks.js
    with open(os.path.join(project_root, 'api/clicks.js'), 'r') as f:
        clicks_code = f.read()
    
    if 'RATE_LIMIT_MAX' not in clicks_code:
        issues.append("clicks API缺少速率限制")
    
    if 'CLICK_DAILY_MAX' not in clicks_code:
        issues.append("clicks API缺少每日上限")
    
    return issues

def check_gdpr_compliance():
    """Check GDPR compliance."""
    issues = []
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    # Check privacy policy
    if not os.path.exists(os.path.join(project_root, 'privacy.html')):
        issues.append("缺少隐私政策页面")
    
    # Check for cookie consent
    if not os.path.exists(os.path.join(project_root, 'js/cookie-consent.js')):
        issues.append("缺少Cookie同意脚本")
    
    # Check for ads.txt
    if not os.path.exists(os.path.join(project_root, 'ads.txt')):
        issues.append("缺少ads.txt文件")
    
    return issues

def main():
    print("=== Security Audit Report ===\n")
    
    # CSP Policy Check
    print("1. CSP策略检查:")
    csp_issues = check_csp_policy()
    if csp_issues:
        for issue in csp_issues:
            print(f"   - {issue}")
    else:
        print("   通过")
    print()
    
    # API Security Check
    print("2. API安全检查:")
    api_issues = check_api_security()
    if api_issues:
        for issue in api_issues:
            print(f"   - {issue}")
    else:
        print("   通过")
    print()
    
    # GDPR Compliance Check
    print("3. GDPR合规检查:")
    gdpr_issues = check_gdpr_compliance()
    if gdpr_issues:
        for issue in gdpr_issues:
            print(f"   - {issue}")
    else:
        print("   通过")
    print()
    
    # Summary
    total_issues = len(csp_issues) + len(api_issues) + len(gdpr_issues)
    print(f"=== 摘要 ===")
    print(f"总问题数: {total_issues}")
    
    return total_issues

if __name__ == "__main__":
    exit_code = 0 if main() == 0 else 1
    exit(exit_code)