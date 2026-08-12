import os, subprocess

root = r'D:\_Careate.Program\calculator-site'
# mojibake indicator characters (GBK-misdecoded UTF-8 fragments)
GARBLED = ['鎺','鏈','璁','鍦','鐩','鑻','闂','闅','浣','骞','涓','棣','閲','鎴',
           '掑','嵉','熻','绠','楀','櫒','閸','馃','鈫','鈥','鿔','鈚','鈙','銆',
           '鏂','鏃','欏','鐢','闀','绔','缁','瑁','鐪','鍙','鍙','浜','鍙','鐗',
           '楗','绌','鑳','杩','瑷','澶','鎯','鍗','閮','鏄','鏈','闇','闆']

def check_content(content):
    gc = sum(content.count(c) for c in GARBLED)
    fffd = content.count('\ufffd')
    return gc, fffd

# scan current working tree
html_files = []
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ['.git', 'node_modules', 'scripts', '.workbuddy']):
        continue
    for f in fn:
        if f.endswith('.html'):
            html_files.append(os.path.join(dp, f))

garbled_now = []
for fp in html_files:
    try:
        with open(fp, 'r', encoding='utf-8', errors='replace') as fh:
            c = fh.read()
    except Exception:
        continue
    gc, fffd = check_content(c)
    if gc > 0 or fffd > 0:
        garbled_now.append((os.path.relpath(fp, root), gc, fffd))

print(f"Currently garbled files: {len(garbled_now)}", flush=True)

report_lines = []
summary = {'has_clean': [], 'no_clean': []}

for rel, gc, fffd in garbled_now:
    out = subprocess.run(['git', '-C', root, 'rev-list', '--reverse', 'HEAD', '--', rel],
                         capture_output=True, text=True)
    commits = out.stdout.strip().split('\n') if out.stdout.strip() else []
    history = []
    clean_commit = None
    for cm in commits:
        r = subprocess.run(['git', '-C', root, 'show', f'{cm}:{rel}'], capture_output=True)
        try:
            txt = r.stdout.decode('utf-8', errors='replace')
        except Exception:
            txt = ''
        g2, f2 = check_content(txt)
        history.append((cm[:7], g2, f2))
        if clean_commit is None and g2 == 0 and f2 == 0:
            clean_commit = cm[:7]
    line = f"\n{rel}: NOW(gc={gc},fffd={fffd}) CLEAN={clean_commit} commits={len(history)}"
    print(line, flush=True)
    report_lines.append(line)
    for h in history:
        hl = f"    {h[0]} gc={h[1]} fffd={h[2]}"
        print(hl, flush=True)
        report_lines.append(hl)
    if clean_commit:
        summary['has_clean'].append((rel, clean_commit))
    else:
        # pick best (min garbled+fffd)
        best = min(history, key=lambda x: x[1] + x[2]) if history else None
        summary['no_clean'].append((rel, best))

print("\n\n===== SUMMARY =====", flush=True)
print(f"Files with a clean historical version: {len(summary['has_clean'])}", flush=True)
for rel, cc in summary['has_clean']:
    print(f"  RESTORE {rel} <- {cc}", flush=True)
print(f"Files with NO clean historical version: {len(summary['no_clean'])}", flush=True)
for rel, best in summary['no_clean']:
    print(f"  MANUAL  {rel}  best={best}", flush=True)

with open(os.path.join(root, 'scripts', 'clean_versions_report.txt'), 'w', encoding='utf-8') as fh:
    fh.write("\n".join(report_lines))
    fh.write("\n\n===== SUMMARY =====\n")
    fh.write(f"Files with a clean historical version: {len(summary['has_clean'])}\n")
    for rel, cc in summary['has_clean']:
        fh.write(f"  RESTORE {rel} <- {cc}\n")
    fh.write(f"Files with NO clean historical version: {len(summary['no_clean'])}\n")
    for rel, best in summary['no_clean']:
        fh.write(f"  MANUAL  {rel}  best={best}\n")
