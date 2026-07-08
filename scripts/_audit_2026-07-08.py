# -*- coding: utf-8 -*-
"""一次性全站自检: BOM / 编码损坏(U+FFFD) / 内部死链 / 重定向循环痕迹"""
import os, re, sys
sys.stdout.reconfigure(encoding="utf-8")

root = os.getcwd()
html_files = []
for dp, _, fns in os.walk(root):
    if ".git" in dp.split(os.sep):
        continue
    for fn in fns:
        if fn.endswith(".html"):
            html_files.append(os.path.join(dp, fn))

print(f"Scanned {len(html_files)} html files under {root}\n")

# 1) BOM + U+FFFD 编码损坏
bom, corrupt = [], []
for p in html_files:
    with open(p, "rb") as f:
        b = f.read()
    if b[:3] == b"\xef\xbb\xbf":
        bom.append(p)
    try:
        t = b.decode("utf-8")
    except Exception as e:
        corrupt.append((p, f"decode error: {e}"))
        continue
    if "\ufffd" in t:
        corrupt.append((p, "U+FFFD present"))

print(f"[1] BOM files: {len(bom)}")
for p in bom:
    print("    BOM", os.path.relpath(p, root))
print(f"[1] Encoding-corrupted files: {len(corrupt)}")
for p, why in corrupt:
    print("    ", os.path.relpath(p, root), "->", why)

# 2) 内部死链
broken = []
for p in html_files:
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        t = f.read()
    for m in re.finditer(r'href="([^"#?]+)(?:#[^"]*)?(?:\?[^"]*)?"', t):
        href = m.group(1).strip()
        if not href or href.startswith(("http", "mailto:", "tel:", "//", "data:")):
            continue
        if href.startswith("/"):
            target = os.path.normpath(os.path.join(root, href.lstrip("/")))
        else:
            target = os.path.normpath(os.path.join(os.path.dirname(p), href))
        if not os.path.exists(target):
            broken.append((os.path.relpath(p, root), href))

print(f"\n[2] Broken internal links: {len(broken)}")
for src, href in broken[:60]:
    print(f"    {src}  ->  {href}")

# 3) 重定向循环痕迹 (cleanUrls/trailingSlash 冲突曾导致 /zh/ /en/ 死循环)
print("\n[3] vercel.json redirect sanity:")
vc = os.path.join(root, "vercel.json")
if os.path.exists(vc):
    with open(vc, encoding="utf-8") as f:
        print(f.read()[:800])
else:
    print("    vercel.json not found")

print("\nDONE")
