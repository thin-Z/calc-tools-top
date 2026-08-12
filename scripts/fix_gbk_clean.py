#!/usr/bin/env python3
"""
Clean GBK-mojibake fixer (precise, conservative).

Applies GBK reversal ONLY when the reversed text is "clean & sensible":
  - result != original
  - no '?' (truncation marker)
  - no PUA chars (U+E000-U+F8FF)
  - no Cyrillic / Greek / Hebrew / Armenian
  - every CJK char in result must be in the site common-character whitelist
    (or result contains emoji)
This avoids:
  - false positives (correct Chinese like 元/km whose raw reversal is Cyrillic)
  - truncated / double-mojibake nodes (PUA or non-whitelist CJK)

Special targeted fix: English em-dash mojibake 閳ユ攺o -> — no
"""
import os, re

PROJECT_ROOT = r'D:\_Careate.Program\calculator-site'
SKIP = {'.git', 'node_modules', '.workbuddy', 'scripts'}

COMMON_HARDCODED = set(
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通期展物由比今集里手应口方支清王光克得八入笑内关目红细引位证越"
    "排卵期计算器首页广告位学习使用说明相关工具房贷个税安全期易孕期下次月经周期经期末次日期计算重置免费在线推算预测文章博客关于隐私政策联系工具箱里中文英文关键词字数阅读时间难度等级场景指南结果复制分析慢快正常速度用户"
    "工具功能文本字符数字密码强度随机生成单位转换压缩调整颜色选择基础图像格式编码解码转换差异对比清理去除标签JSONHTMLURL排版字数统计阅读时长"
    "工具箱里欢迎来到我的网站访问这里复制结果使用场景使用指南关键词密度分析已合并到字数统计工具中清理结果清理前清理后什么是文本清理器"
    "英文在线单词计数器关键词密度统计频率排名Base64编码解码复制结果用户指南慢速正常快速分析词数"
)

def build_whitelist():
    common = set(COMMON_HARDCODED)
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for fn in files:
            if not fn.endswith('.html'):
                continue
            try:
                with open(os.path.join(root, fn), 'r', encoding='utf-8-sig') as fh:
                    c = fh.read()
            except:
                continue
            for m in re.finditer(r'<title>(.*?)</title>', c):
                for ch in m.group(1):
                    if 0x4E00 <= ord(ch) <= 0x9FFF:
                        common.add(ch)
            for m in re.finditer(r'<meta name="description" content="([^"]*)"', c):
                for ch in m.group(1):
                    if 0x4E00 <= ord(ch) <= 0x9FFF:
                        common.add(ch)
            for m in re.finditer(r'<a[^>]*>([^<]*)</a>', c):
                t = m.group(1)
                if 1 <= len(t) <= 4:
                    for ch in t:
                        if 0x4E00 <= ord(ch) <= 0x9FFF:
                            common.add(ch)
    return common

def raw_rev(text):
    if not text or len(text) < 2:
        return None
    if all(ord(c) < 128 for c in text):
        return None
    try:
        r = text.encode('gbk', errors='strict').decode('utf-8', errors='strict')
        return r if r != text else None
    except:
        return None

BAD_RANGES = [
    (0x0370, 0x03FF),  # Greek
    (0x0400, 0x04FF),  # Cyrillic
    (0x0590, 0x05FF),  # Hebrew
    (0x0530, 0x058F),  # Armenian
    (0xE000, 0xF8FF),  # PUA
]

def is_clean(r, whitelist):
    if not r or '?' in r:
        return False
    has_good = False
    for ch in r:
        cp = ord(ch)
        for lo, hi in BAD_RANGES:
            if lo <= cp <= hi:
                return False
        if 0x4E00 <= cp <= 0x9FFF:
            if ch not in whitelist:
                return False
            has_good = True
        elif 0x1F000 <= cp <= 0x1FAFF:  # emoji
            has_good = True
        elif cp > 0x9FFF and not (0x2000 <= cp <= 0x206F):  # allow punctuation like em-dash
            # other high chars (not CJK ext, not emoji, not common punctuation) -> suspicious
            if cp > 0x2FFF:
                return False
    return has_good

def fix_content(content, whitelist):
    fixes = []
    def repl(m):
        t = m.group(1)
        r = raw_rev(t)
        if r and is_clean(r, whitelist):
            fixes.append((t, r))
            return '>' + r + '<'
        return m.group(0)
    content = re.sub(r'>([^<]+)<', repl, content)
    # attributes
    def repl_attr(m):
        name, val = m.group(1), m.group(2)
        r = raw_rev(val)
        if r and is_clean(r, whitelist):
            fixes.append((val, r))
            return f'{name}="{r}"'
        return m.group(0)
    content = re.sub(r'\b(alt|title|aria-label|content|placeholder|value)="([^"]*)"', repl_attr, content)
    # special: English em-dash
    if '閳ユ攺o' in content:
        content = content.replace('閳ユ攺o', '— no')
        fixes.append(('閳ユ攺o', '— no'))
    return content, fixes

def main():
    wl = build_whitelist()
    print(f'白名单字符数: {len(wl)}')
    total = 0
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for fn in files:
            if not fn.endswith('.html'):
                continue
            p = os.path.join(root, fn)
            with open(p, 'r', encoding='utf-8') as fh:
                c = fh.read()
            new_c, fixes = fix_content(c, wl)
            if new_c != c:
                with open(p, 'w', encoding='utf-8', newline='') as fh:
                    fh.write(new_c)
                total += len(fixes)
                rel = os.path.relpath(p, PROJECT_ROOT)
                print(f'FIXED {rel}: {len(fixes)} 处')
                for o, r in fixes[:6]:
                    print(f'    {o[:30]!r} -> {r[:30]!r}')
    print(f'\n总计安全修复: {total} 处')

if __name__ == '__main__':
    main()
