# -*- coding: utf-8 -*-
"""Phase 2: 清理 HTML style="" 内联 —— ①移除 text-decoration:none;color:inherit 冗余属性
②style 属性值内等价色字面量 → design token（暗色自动生效）"""
import io, re, glob, os

BASE = r"D:\_Careate.Program\calculator-site"

# 等价色映射（值等价或视觉近等价 + 暗色适配收益）
COLOR_MAP = [
    ("#ef4444", "var(--danger)"),      # 等价
    ("#dc2626", "var(--danger-strong)"),  # 等价
    ("#e2e8f0", "var(--border)"),       # 近等价
    ("#6b7280", "var(--text-secondary)"),  # 近等价 gray-500
    ("#94a3b8", "var(--text-tertiary)"),   # 近等价 gray-400
    ("#3b82f6", "var(--primary)"),      # blue-500 → 品牌蓝
    ("#22c55e", "var(--success)"),      # green-500 → 语义绿
    ("#fef2f2", "var(--trend-hot-bg)"), # 等价
]

# 整个属性删除（冗余，CSS 已提供规则）
REDUNDANT_ATTR = re.compile(r'\s*style="text-decoration:\s*none;\s*color:\s*inherit;"')

def map_colors_in_attr(value):
    for old, new in COLOR_MAP:
        value = value.replace(old, new)
    return value

files = glob.glob(os.path.join(BASE, "**", "*.html"), recursive=True)
total_attr_removed = 0
total_color_sub = 0
changed_files = 0

for p in files:
    with io.open(p, "r", encoding="utf-8") as f:
        html = f.read()
    orig = html
    # 1) 删除冗余 style 属性
    html, n1 = REDUNDANT_ATTR.subn("", html)
    # 2) style 属性值内颜色映射（仅 HTML 属性上下文）
    def repl(m):
        global total_color_sub
        new_val = map_colors_in_attr(m.group(1))
        # 统计实际替换
        cnt = 0
        for old, new in COLOR_MAP:
            cnt += m.group(1).count(old)
        total_color_sub += cnt
        return 'style="' + new_val + '"'
    html = re.sub(r'style="([^"]*)"', repl, html)
    if html != orig:
        with io.open(p, "w", encoding="utf-8", newline="") as f:
            f.write(html)
        changed_files += 1
        total_attr_removed += n1

print("files changed: %d" % changed_files)
print("redundant attrs removed: %d" % total_attr_removed)
print("color literals mapped: %d" % total_color_sub)
