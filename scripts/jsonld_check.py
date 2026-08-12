import os, re, json

root = r'D:\_Careate.Program\calculator-site'
html_files = []
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ['.git','node_modules','scripts','.workbuddy']):
        continue
    for f in fn:
        if f.endswith('.html'):
            html_files.append(os.path.join(dp, f))

bad = 0
total_blocks = 0
for fp in html_files:
    try:
        with open(fp,'r',encoding='utf-8',errors='replace') as fh:
            c = fh.read()
    except Exception:
        continue
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', c, re.S)
    for b in blocks:
        total_blocks += 1
        try:
            json.loads(b)
        except Exception as e:
            bad += 1
            rel = os.path.relpath(fp, root).replace('\\','/')
            print(f"[JSON ERROR] {rel}: {e}")
            print("   block head:", b.strip()[:120])

print(f"\nTotal JSON-LD blocks: {total_blocks}")
print(f"Blocks that fail to parse: {bad}")
