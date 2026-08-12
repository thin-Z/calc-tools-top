import os, json, subprocess

root = r'D:\_Careate.Program\calculator-site'

def is_cjk(ch):
    o = ord(ch)
    return (0x3000<=o<=0x303F) or (0x3400<=o<=0x4DBF) or (0x4E00<=o<=0x9FFF) or (0xF900<=o<=0xFAFF) or (0xFF00<=o<=0xFFEF) or (0x2E80<=o<=0x2EFF)

def find_mojibake(text):
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
            # reversal succeeded -> it's mojibake (recovers original)
            hits.append((r, rev))
        except Exception:
            pass  # legitimate Chinese
    return hits

html_files = []
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ['.git','node_modules','scripts','.workbuddy']):
        continue
    for f in fn:
        if f.endswith('.html'):
            html_files.append(os.path.join(dp, f))

total_moji = 0
files_with = []
for fp in html_files:
    try:
        with open(fp,'r',encoding='utf-8',errors='replace') as fh:
            c = fh.read()
    except Exception:
        continue
    # U+FFFD
    fffd = c.count('\ufffd')
    hits = find_mojibake(c)
    if hits or fffd:
        rel = os.path.relpath(fp, root).replace('\\','/')
        files_with.append((rel, fffd, hits))
        total_moji += len(hits)

print(f"Scanned {len(html_files)} HTML files.")
print(f"Files with remaining mojibake or U+FFFD: {len(files_with)}")
for rel, fffd, hits in files_with:
    print(f"\n{rel}: U+FFFD={fffd}, mojibake_runs={len(hits)}")
    for r, rev in hits[:8]:
        print(f"   {r!r} -> {rev!r}")
    if len(hits) > 8:
        print(f"   ... +{len(hits)-8} more")

print(f"\nTOTAL mojibake runs site-wide: {total_moji}")
