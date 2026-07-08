#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Restore lost emoji placeholders (??) in en/index.html.

Mapping taken from the sibling Chinese homepage (index.html), which is the
same redesign and carries the correct emoji for every category/section/icon.
Robust: a single regex matches 2-3 question marks so the 3-? form (Image)
is not partially consumed by the 2-? form.
"""
import re

PATH = "en/index.html"

icon_map = {
    "finance":  "\U0001F4B0",        # 💰
    "health":   "\U0001F3E5",        # 🏥
    "life":     "\U0001F3E0",        # 🏠
    "utility":  "\U0001F527",        # 🔧
    "image":    "\U0001F5BC\uFE0F",  # 🖼️
    "text":     "\u270F\uFE0F",      # ✏️
    "shopping": "\U0001F6D2",        # 🛒
    "travel":   "\U0001F697",        # 🚗
}

# category / tag label -> emoji
label_map = {
    "Finance":   "\U0001F4B0",
    "Health":    "\U0001F3E5",
    "Lifestyle": "\U0001F3E0",
    "Shopping":  "\U0001F6D2",
    "Travel":    "\U0001F697",
    "Utility":   "\U0001F527",
    "Image":     "\U0001F5BC\uFE0F",
    "Text":      "\u270F\uFE0F",
}

with open(PATH, "r", encoding="utf-8") as f:
    html = f.read()

before = html.count("??")

# 1) icon divs: <div class="icon icon-XXX">??</div>
def repl_icon(m):
    return m.group(1) + icon_map.get(m.group(2), m.group(1))
html = re.sub(r'(<div class="icon icon-(\w+)">)\?+', repl_icon, html)

# 2) category chip / tag labels (2-3 question marks, followed by label + boundary)
for label, emoji in label_map.items():
    html = re.sub(r'\?{2,3} ' + re.escape(label) + r'(?=[\s<])',
                  emoji + ' ' + label, html)

# 3) section dividers / misc labels
html = re.sub(r'\?{2,3} Trending:',      '\U0001F525 Trending:', html)       # 🔥
html = re.sub(r'\?{2,3} Hot Tools',      '\U0001F525 Hot Tools', html)       # 🔥
html = re.sub(r'\?{2,3} Calculators',    '\U0001F9EE Calculators', html)     # 🧮
html = re.sub(r'\?{2,3} Image Tools',    '\U0001F5BC\uFE0F Image Tools', html)
html = re.sub(r'\?{2,3} Text Tools',     '\u270F\uFE0F Text Tools', html)    # 📝
html = re.sub(r'\?{2,3} Tool Guides',    '\U0001F4D6 Tool Guides', html)     # 📖

# 4) language switcher
html = html.replace("???? English", "\U0001F1EC\U0001F1E7 English")          # 🇬🇧

# 5) theme & search icons
html = html.replace('<span class="theme-icon">??</span>',
                    '<span class="theme-icon">\u2600\uFE0F</span>')          # ☀️
html = html.replace('<span class="search-icon">??</span>',
                    '<span class="search-icon">\U0001F50D</span>')          # 🔍

# 6) privacy badge
html = re.sub(r'\?{2,3} Local Processing', '\U0001F512 Local Processing', html)  # 🔒
html = html.replace("$$", "\u00B7")                                       # ·

# 7) article meta dates
html = re.sub(r'\?{2,3} 2026', '\U0001F4C5 2026', html)                   # 📅

after = html.count("??")
with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"placeholder '??' before={before} after={after}")
# extra safety: any stray '?' immediately before an emoji?
stray = re.findall(r'\?[\U0001F000-\U0001FAFF\U0001F1E6-\U0001F1FF]', html)
print("stray '?' before emoji:", stray)
print("DONE" if (after == 0 and not stray) else "WARNING")
