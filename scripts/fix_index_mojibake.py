# -*- coding: utf-8 -*-
"""Fix double-encoded Chinese mojibake in index.html (root homepage).

Root cause: UTF-8 bytes were mis-decoded as GBK then re-saved as UTF-8.
Reversal encode('gb18030').decode('utf-8') works for MOST strings but fails
(~30%) when artifacts (fullwidth $, euro, '?', PUA) or katakana break the
UTF-8 byte pairing. So we RECONSTRUCT text from authoritative sources:
  - clean git commit c3e84b6  (32 cards icon/title/desc, chips, dividers, labels)
  - js/i18n.js                (all data-i18n fallback values)
  - derived known strings     (title/h1, meta/og/twitter desc, search, footer)
The blog section (already correct) is protected verbatim.
HTML tags are never altered -- only text content is replaced by context.
"""
import re, subprocess

ROOT = "D:/_Careate.Program/calculator-site"
SRC = ROOT + "/index.html.bak"          # original, uncorrupted-by-us version
OUT = ROOT + "/index.html"
PLACE = "<BLOGSECTIONPLACEHOLDER_XYZ></BLOGSECTIONPLACEHOLDER_XYZ>"

# ---------- load authoritative references ----------
blob = subprocess.check_output(["git", "show", "c3e84b6:index.html"]).decode("utf-8", "replace")

def norm(h):
    return h.strip().strip("/").removesuffix(".html")

ref_cards = {}
for m in re.finditer(r'<a href="([^"]+)"[^>]*class="tool-card"[^>]*>(.*?)</a>', blob, re.S):
    href = norm(m.group(1)); body = m.group(2)
    ic = re.search(r'icon">([^<]*)<', body)
    h3 = re.search(r'<h3[^>]*>([^<]*)<', body)
    p  = re.search(r'<p[^>]*>([^<]*)<', body)
    ref_cards[norm(href)] = {
        "icon": ic.group(1) if ic else "",
        "title": h3.group(1) if h3 else "",
        "desc": p.group(1) if p else "",
    }

ref_chips = {}
for m in re.finditer(r'category-chip[^>]*data-category="([^"]+)"[^>]*>([^<]*)<', blob):
    ref_chips[m.group(1)] = m.group(2)

ij = open(ROOT + "/js/i18n.js", encoding="utf-8").read()
i18n_zh = dict(re.findall(r'(\w+):\s*"([^"]*)"', ij.split("en:")[0]))

# ---------- artifact-splitting reversal (used only for footer fallback) ----------
def rev_piece(p):
    try:
        return p.encode("gb18030").decode("utf-8")
    except Exception:
        out = []
        for c in p:
            try:
                out.append(c.encode("gb18030").decode("utf-8"))
            except Exception:
                out.append(c)
        return "".join(out)
ART_SPLIT = re.compile(r"[＄€?\ue000-\uf8ff]")
def rev_run(run):
    return "".join(rev_piece(x) for x in ART_SPLIT.split(run) if x)
run_re = re.compile(r"[^\x00-\x7F]+")
def reverse_text(t):
    return run_re.sub(lambda m: rev_run(m.group(0)), t)

# ---------- main ----------
text = open(SRC, encoding="utf-8").read()
start = text.index('<div class="blog-section">')
end = text.index("<footer>")
blog = text[start:end]
rest = text[:start] + PLACE + text[end:]

# fallback reversal (fixes footer links etc. that are not otherwise overridden)
rest = reverse_text(rest)
# drop stray artifact '?' trailing CJK / CJK punctuation / fullwidth forms
rest = re.sub(r"(?<=[\u3000-\u303f\u3400-\u9fff\uff00-\uffef])\?", "", rest)

# ---- context-based overrides (text content only) ----
# per card: icon always; title/desc only when not data-i18n (i18n handles those)
def fix_card(m):
    open_tag, href, body, close = m.group(1), m.group(2), m.group(3), m.group(4)
    ref = ref_cards.get(norm(href))
    if not ref:
        return m.group(0)
    body = re.sub(r'icon">[^<]*<', 'icon">%s<' % ref["icon"], body, count=1)
    if not re.search(r'<h3[^>]*\bdata-i18n=', body):
        body = re.sub(r'<h3([^>]*)>[^<]*<', lambda mm: "<h3%s>%s<" % (mm.group(1), ref["title"]), body, count=1)
    if not re.search(r'<p[^>]*\bdata-i18n=', body):
        body = re.sub(r'<p([^>]*)>[^<]*<', lambda mm: "<p%s>%s<" % (mm.group(1), ref["desc"]), body, count=1)
    return open_tag + body + close
rest = re.sub(r'(<a href="([^"]+)"[^>]*class="tool-card"[^>]*>)(.*?)(<div class="tool-tags">)',
              fix_card, rest, flags=re.S)

# category filter chips
def chipsub(mm):
    cat = mm.group(1)
    return '<button class="category-chip" data-category="%s">%s<' % (cat, ref_chips.get(cat, mm.group(2)))
rest = re.sub(r'<button class="category-chip" data-category="([^"]+)"[^>]*>([^<]*)<', chipsub, rest)

# tag chips inside tool-tags
def tagsub(mm):
    tag = mm.group(1)
    return '<a href="/" class="tag tag-%s" data-tag="%s">%s<' % (tag, tag, ref_chips.get(tag, mm.group(2)))
rest = re.sub(r'<a href="/" class="tag tag-[^"]*" data-tag="([^"]+)"[^>]*>([^<]*)<', tagsub, rest)

# section dividers (in document order)
dividers = ["🔥 热门工具", "🧮 计算工具", "🖼️ 图片工具", "📝 文字工具"]
counter = [0]
def divsub(mm):
    v = dividers[min(counter[0], len(dividers) - 1)]; counter[0] += 1
    return "section-divider\"><h2>%s<" % v
rest = re.sub(r'section-divider"><h2>[^<]*<', divsub, rest)

# hot-search label + privacy badge
rest = re.sub(r'hot-search-label">[^<]*<', 'hot-search-label">🔥 大家都在搜：<', rest)
rest = re.sub(r'privacy-badge-sm">[^<]*<', 'privacy-badge-sm">🔒 本地处理 · 不上传<', rest)
rest = re.sub(r'no-results">[^<]*<', 'no-results">没有找到匹配的工具<', rest)
rest = re.sub(r'adPlaceholder">[^<]*<', 'adPlaceholder">广告位 - 招商中<', rest)

# search input placeholder + aria-labels
rest = re.sub(r'(<input type="text" placeholder=")[^"]*(")', r'\1搜索工具...\2', rest)
rest = re.sub(r'(<input type="text"[^>]*aria-label=")[^"]*(")', r'\1搜索工具\2', rest)
rest = re.sub(r'(id="theme-toggle"[^>]*aria-label=")[^"]*(")', r'\1切换暗黑模式\2', rest)

# globals (emoji that cannot reverse)
rest = re.sub(r'theme-icon">[^<]*<', 'theme-icon">☀️<', rest)
rest = re.sub(r'class="heart">[^<]*<', 'class="heart">❤<', rest)
rest = re.sub(r'search-clear">[^<]*</button>', 'search-clear">✕</button>', rest)
rest = re.sub(r'search-icon">[^<]*<', 'search-icon">🔍<', rest)
rest = re.sub(r'(<option value="zh"[^>]*>)[^<]*<', r'\1🇨🇳 中文<', rest)
rest = re.sub(r'(<option value="en"[^>]*>)[^<]*<', r'\1🇬🇧 English<', rest)

# generic data-i18n fallback override (siteName, pageDesc, mortgage[Desc], ..., copyright)
def i18nsub(mm):
    attrs, key = mm.group(1), mm.group(2)
    val = i18n_zh.get(key)
    return (attrs + val + "<") if val is not None else mm.group(0)
rest = re.sub(r'(<[^>]*\bdata-i18n="([^"]+)"[^>]*>)[^<]*<', i18nsub, rest)

# title / h1
rest = re.sub(r"<title>[^<]*</title>", "<title>工具箱里 - 实用工具聚合</title>", rest)
rest = re.sub(r"<h1>[^<]*</h1>", "<h1>工具箱里 - 实用工具聚合</h1>", rest)

# meta / og / twitter descriptions
DESC = "工具箱里 - 免费在线工具集合，快捷易用。"
rest = re.sub(r'name="description" content="[^"]*"', 'name="description" content="%s"' % DESC, rest)
rest = re.sub(r"og:description' content='[^']*'", "og:description' content='%s'" % DESC, rest)
rest = re.sub(r"twitter:description' content='[^']*'", "twitter:description' content='%s'" % DESC, rest)

# restore blog
print("DEBUG PLACE in rest before replace:", PLACE in rest)
result = rest.replace(PLACE, blog)
open(OUT, "w", encoding="utf-8").write(result)

# ---------- verification ----------
bi = result.find('<div class="blog-section">'); fi = result.find("<footer>")
result_blog = result[bi:fi] if (bi != -1 and fi != -1) else ""
def has_range(t, a, b):
    return any(ord(a) <= ord(c) <= ord(b) for c in t)
print("WROTE", OUT, len(result), "bytes")
print("BLOG VERBATIM (vs backup):", result_blog == blog)
head = result[:result.index('<div class="blog-section">')]
print("katakana in head:", has_range(head, "\u30a0", "\u30ff"))
print("PUA in head:", has_range(head, "\ue000", "\uf8ff"))
print("fullwidth-$:", head.count("\uff04"), " euro:", head.count("\u20ac"))
print("stray '?' after CJK:", [m.group(0) for m in re.finditer(r'.{0,10}\?.{0,10}', head) if not re.search(r'https?://|=', m.group(0))][:6])
print("title:", re.search(r"<title>([^<]*)</title>", result).group(1))
print("h1:", re.search(r"<h1>([^<]*)</h1>", result).group(1))
print("meta-desc:", re.search(r'name="description" content="([^"]*)"', result).group(1))
print("footer:", re.search(r"<footer>(.*?)</footer>", result, re.S).group(1).strip())
# any remaining non-ASCII mojibake-like (katakana or suspicious) runs in head
bad = [m.group(0) for m in re.finditer(r"[^\x00-\x7F]+", head)
       if any(0x30A0 <= ord(c) <= 0x30FF for c in m.group(0))]
print("remaining katakana runs:", bad)
