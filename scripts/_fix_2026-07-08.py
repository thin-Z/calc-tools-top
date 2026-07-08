# -*- coding: utf-8 -*-
"""一次性修复: 文字工具死链 + 404博客路径 + 剥离BOM (不触碰 image/base64.html)"""
import os, sys
sys.stdout.reconfigure(encoding="utf-8")

root = os.getcwd()
link_fixes = [
    ("text/base64.html", "text/base64-encode.html"),
    ("text/generator.html", "text/uuid-generator.html"),
    ("/zh/blog/", "/blog/zh/"),
]
changed = []
for dp, _, fns in os.walk(root):
    if ".git" in dp.split(os.sep):
        continue
    for fn in fns:
        if not fn.endswith(".html"):
            continue
        p = os.path.join(dp, fn)
        with open(p, "r", encoding="utf-8") as f:
            t = f.read()
        orig = t
        for a, b in link_fixes:
            t = t.replace(a, b)
        if t.startswith("﻿"):  # strip UTF-8 BOM
            t = t[1:]
        if t != orig:
            with open(p, "w", encoding="utf-8") as f:
                f.write(t)
            changed.append(os.path.relpath(p, root))

print("Changed files:")
for c in changed:
    print("   ", c)
print("Total changed:", len(changed))
