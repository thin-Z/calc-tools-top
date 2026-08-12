import os, subprocess

root = r'D:\_Careate.Program\calculator-site'
GARBLED = ['鎺','鏈','璁','鍦','鐩','鑻','闂','闅','浣','骞','涓','棣','閲','鎴',
           '掑','嵉','熻','绠','楀','櫒','閸','馃','鈫','鈥','鿔','鈚','鈙','銆',
           '鏂','鏃','欏','鐢','闀','绔','缁','瑁','鐪','鍙','浜','鐗','楗','绌',
           '鑳','杩','瑷','澶','鎯','鍗','閮','鏄','闇','闆']

def check(content):
    return sum(content.count(c) for c in GARBLED) + content.count('\ufffd')

# git status porcelain
st = subprocess.run(['git','-C',root,'status','--porcelain'], capture_output=True, text=True)
dirty = set()
for line in st.stdout.splitlines():
    if line.strip():
        path = line[3:].strip()
        dirty.add(path.replace('/', '\\'))

html_files = []
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ['.git','node_modules','scripts','.workbuddy']):
        continue
    for f in fn:
        if f.endswith('.html'):
            html_files.append(os.path.join(dp, f))

print(f"{'FILE':55} {'DISK':>5} {'HEAD':>5}  DIRTY")
print("-"*80)
restore_from_head = []
restore_from_hist = []
for fp in html_files:
    rel = os.path.relpath(fp, root).replace('/', '\\')
    try:
        with open(fp,'r',encoding='utf-8',errors='replace') as fh:
            disk = fh.read()
    except Exception:
        disk = ''
    disk_gc = check(disk)
    if disk_gc == 0:
        continue
    # head version
    r = subprocess.run(['git','-C',root,'show',f'HEAD:{rel}'], capture_output=True)
    try:
        head = r.stdout.decode('utf-8', errors='replace')
    except Exception:
        head = ''
    head_gc = check(head)
    is_dirty = rel in dirty
    print(f"{rel:55} {disk_gc:5} {head_gc:5}  {'YES' if is_dirty else '-'}")
    if head_gc == 0:
        restore_from_head.append(rel)
    else:
        restore_from_hist.append(rel)

print("\n---")
print(f"Restore via 'git checkout HEAD --': {len(restore_from_head)}")
print(f"Restore via historical clean commit: {len(restore_from_hist)}")
for r in restore_from_hist:
    print("  HIST:", r)
