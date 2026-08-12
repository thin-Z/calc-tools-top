import os

root = r'D:\_Careate.Program\calculator-site'

def is_cjk(ch):
    o = ord(ch)
    return (0x3400<=o<=0x4DBF) or (0x4E00<=o<=0x9FFF) or (0xF900<=o<=0xFAFF)

def find_true_mojibake(text):
    runs = []
    i, n = 0, len(text)
    while i < n:
        if is_cjk(text[i]):
            j = i
            while j < n and is_cjk(text[j]):
                j += 1
            runs.append(text[i:j])
            i = j
        else:
            i += 1
    hits = []
    for r in runs:
        try:
            rev = r.encode('gbk').decode('utf-8')
        except Exception:
            continue  # reversal failed -> legitimate Chinese (its GBK bytes aren't valid UTF-8)
        # TRUE mojibake reverses to coherent CJK; legitimate Chinese reverses to non-CJK garbage
        if rev != r and all(is_cjk(c) for c in rev):
            hits.append((r, rev))
    return hits

html_files = []
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ['.git','node_modules','scripts','.workbuddy']):
        continue
    for f in fn:
        if f.endswith('.html'):
            html_files.append(os.path.join(dp, f))

files_with = []
total = 0
for fp in html_files:
    try:
        with open(fp,'r',encoding='utf-8',errors='replace') as fh:
            c = fh.read()
    except Exception:
        continue
    fffd = c.count('\ufffd')
    hits = find_true_mojibake(c)
    if hits or fffd:
        rel = os.path.relpath(fp, root).replace('\\','/')
        files_with.append((rel, fffd, hits))
        total += len(hits)

print(f"Scanned {len(html_files)} HTML files.")
print(f"Files with TRUE mojibake or U+FFFD: {len(files_with)}")
for rel, fffd, hits in files_with:
    print(f"\n{rel}: U+FFFD={fffd}, true_mojibake_runs={len(hits)}")
    for r, rev in hits[:10]:
        print(f"   {r!r} -> {rev!r}")
    if len(hits) > 10:
        print(f"   ... +{len(hits)-10} more")
print(f"\nTOTAL true mojibake runs site-wide: {total}")
