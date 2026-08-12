# -*- coding: utf-8 -*-
"""Phase 2: 删除冲突/重复的内联 <style> 块（静态页/索引页/博客页），保留工具页专属组件样式"""
import io, re, sys

BASE = r"D:\_Careate.Program\calculator-site"

# 收编（删除内联 <style>）—— 样式已统一进 css/style.css
REMOVE = [
    "404.html", "about.html", "contact.html", "privacy.html",
    "en/about.html", "en/contact.html", "en/privacy.html",
    "zh/about.html", "zh/contact.html", "zh/privacy.html",
    "en/calculators/index.html", "en/image/index.html", "en/text/index.html",
    "zh/calculators/index.html", "zh/image/index.html", "zh/text/index.html",
    "blog/en/equal-installment-vs-equal-principal.html",
    "blog/en/mortgage-rate-trend-2026.html",
    "blog/zh/equal-installment-vs-equal-principal.html",
    "blog/zh/mortgage-rate-trend-2026.html",
]

# 保留（页面专属组件，无冲突）
KEEP = [
    "en/calculators/random-gen.html", "zh/calculators/random-gen.html",
    "en/text/uuid-generator.html", "zh/text/uuid-generator.html",
    "en/text/keyword-density.html",
]

STYLE_RE = re.compile(r"\s*<style>\s*[\s\S]*?</style>\s*", re.IGNORECASE)

ok, fail = [], []
for rel in REMOVE:
    p = BASE + "\\" + rel.replace("/", "\\")
    with io.open(p, "r", encoding="utf-8") as f:
        html = f.read()
    new_html, n = STYLE_RE.subn("", html)
    if n == 0:
        fail.append(rel + " (no style block)")
        continue
    if "<style>" in new_html:
        fail.append(rel + " (style block still present)")
        continue
    with io.open(p, "w", encoding="utf-8", newline="") as f:
        f.write(new_html)
    ok.append("%s (removed %d)" % (rel, n))

print("removed: %d/%d" % (len(ok), len(REMOVE)))
for o in ok:
    print("  OK", o)
for fl in fail:
    print("  FAIL", fl)

# 校验保留清单仍带 style 块
for rel in KEEP:
    p = BASE + "\\" + rel.replace("/", "\\")
    with io.open(p, "r", encoding="utf-8") as f:
        html = f.read()
    print("  KEEP %s style=%s" % (rel, "<style>" in html))
