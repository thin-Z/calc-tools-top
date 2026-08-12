# -*- coding: utf-8 -*-
"""Phase 4: 统一 CSS 引用 + Inter 字体全站化
- 全部页面 CSS link 规范化（相对路径按深度、去 ?v=、顺序 style.css -> cookie-consent.css）
- 155 页补 Google Fonts Inter
"""
import io, glob, os, re

BASE = r"D:\_Careate.Program\calculator-site"
FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n'

files = glob.glob(os.path.join(BASE, "**", "*.html"), recursive=True)
stat = {"css_norm": 0, "v_removed": 0, "font_added": 0, "no_head": []}

for p in files:
    rel_path = os.path.relpath(p, BASE)
    with io.open(p, "r", encoding="utf-8") as f:
        html = f.read()
    orig = html
    depth = rel_path.count(os.sep)
    rel = "../" * depth + "css/"

    # 1) 规范化 style.css / cookie-consent.css 引用（任意写法 -> 相对路径）
    def norm_link(m):
        global stat
        tag = m.group(0)
        href_m = re.search(r'href="([^"]*)"', tag)
        if not href_m:
            return tag
        href = href_m.group(1)
        clean = re.sub(r'\?v=[^"]*', "", href)
        if "style.css" in clean:
            stat["v_removed"] += 1 if "?v=" in href else 0
            return tag.replace(href_m.group(0), 'href="' + rel + 'style.css"')
        if "cookie-consent.css" in clean:
            return tag.replace(href_m.group(0), 'href="' + rel + 'cookie-consent.css"')
        return tag

    # 匹配 <link ... href="X">（仅 css 相关）
    def css_only(m):
        if "style.css" in m.group(0) or "cookie-consent.css" in m.group(0):
            return norm_link(m)
        return m.group(0)

    html = re.sub(r'<link\b[^>]*\bhref="[^"]*"[^>]*>', css_only, html)

    # 2) 确保 style.css 在 cookie-consent.css 之前（交换乱序）
    sc = rel + 'style.css'
    cc = rel + 'cookie-consent.css'
    i_sc = html.find('href="' + sc + '"')
    i_cc = html.find('href="' + cc + '"')
    if i_sc > -1 and i_cc > -1 and i_cc < i_sc:
        # 交换两个 link 标签
        tag_sc = html[html.rfind('<link', 0, i_sc):html.find('>', i_sc) + 1]
        tag_cc = html[html.rfind('<link', 0, i_cc):html.find('>', i_cc) + 1]
        html = html.replace(tag_sc, "\x00SC\x00").replace(tag_cc, "\x00CC\x00")
        html = html.replace("\x00CC\x00", tag_sc).replace("\x00SC\x00", tag_cc)
        stat["css_norm"] += 1

    # 3) 缺 Inter -> head 插入（在 <title> 前或 head 开头）
    if 'fonts.googleapis.com' not in html:
        m_head = re.search(r"<head[^>]*>", html)
        if m_head:
            html = re.sub(r"(<head[^>]*>)", r"\1\n" + FONT_LINK, html, count=1)
            stat["font_added"] += 1
        else:
            stat["no_head"].append(rel_path)

    if html != orig:
        with io.open(p, "w", encoding="utf-8", newline="") as f:
            f.write(html)

print(stat)
