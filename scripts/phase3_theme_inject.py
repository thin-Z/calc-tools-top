# -*- coding: utf-8 -*-
"""Phase 3: HTML 批量改造
1) gw-theme 按钮: 内联 style -> class="gw-float-btn"
2) gw-lang 容器: 内联 style -> class="gw-lang-float"
3) 全部页面 head 注入 js/theme-init.js + js/theme-toggle.js（相对路径按目录深度）
"""
import io, glob, os, re

BASE = r"D:\_Careate.Program\calculator-site"

# gw-theme: style 以 position:fixed;bottom:16px;right:16px 开头的属性
GW_THEME_STYLE = re.compile(
    r'style="position:\s*fixed;\s*bottom:\s*16px;\s*right:\s*16px;[^"]*"'
)
# gw-lang: style 以 position:fixed;top:12px;right:12px 开头的属性
GW_LANG_STYLE = re.compile(
    r'style="position:\s*fixed;\s*top:\s*12px;\s*right:\s*12px;[^"]*"'
)

INJECT = '<script src="{rel}js/theme-init.js"></script>\n<script src="{rel}js/theme-toggle.js"></script>\n'

files = glob.glob(os.path.join(BASE, "**", "*.html"), recursive=True)
stat = {"theme_btn": 0, "lang_float": 0, "head_inject": 0, "skip_head": []}

for p in files:
    rel_path = os.path.relpath(p, BASE)
    with io.open(p, "r", encoding="utf-8") as f:
        html = f.read()
    orig = html

    # 1) gw-theme
    html, n1 = GW_THEME_STYLE.subn('class="gw-float-btn"', html)
    # 2) gw-lang
    html, n2 = GW_LANG_STYLE.subn('class="gw-lang-float"', html)
    stat["theme_btn"] += n1
    stat["lang_float"] += n2

    # 3) head 注入（若尚未注入）
    if 'js/theme-init.js' not in html:
        depth = rel_path.count(os.sep)
        rel = "../" * depth
        if re.search(r"<head[^>]*>", html):
            html = re.sub(r"(<head[^>]*>)", r"\1\n" + INJECT.format(rel=rel), html, count=1)
            stat["head_inject"] += 1
        else:
            stat["skip_head"].append(rel_path)

    if html != orig:
        with io.open(p, "w", encoding="utf-8", newline="") as f:
            f.write(html)

print(stat)
