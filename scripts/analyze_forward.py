import os, subprocess

root = r'D:\_Careate.Program\calculator-site'
GARBLED = ['鎺','鏈','璁','鍦','鐩','鑻','闂','闅','浣','骞','涓','棣','閲','鎴',
           '掑','嵉','熻','绠','楀','櫒','閸','馃','鈫','鈥','鿔','鈚','鈙','銆',
           '鏂','鏃','欏','鐢','闀','绔','缁','瑁','鐪','鍙','浜','鐗','楗','绌',
           '鑳','杩','瑷','澶','鎯','鍗','閮','鏄','闇','闆']

def check(content):
    return sum(content.count(c) for c in GARBLED) + content.count('\ufffd')

html_files = []
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ['.git','node_modules','scripts','.workbuddy']):
        continue
    for f in fn:
        if f.endswith('.html'):
            html_files.append(os.path.join(dp, f))

print("=== Authoritative analysis (forward-slash refspec) ===", flush=True)
plan = []  # (fwd, head_gc, newest_clean_commit)
for fp in html_files:
    # forward-slash rel
    rel = os.path.relpath(fp, root).replace('\\', '/')
    try:
        with open(fp,'r',encoding='utf-8',errors='replace') as fh:
            disk = fh.read()
    except Exception:
        disk = ''
    if check(disk) == 0:
        continue
    # HEAD (forward slash)
    r = subprocess.run(['git','-C',root,'show',f'HEAD:{rel}'], capture_output=True)
    head = r.stdout.decode('utf-8', errors='replace')
    head_gc = check(head)
    # commits newest-first
    out = subprocess.run(['git','-C',root,'rev-list','HEAD','--',rel], capture_output=True, text=True)
    commits = out.stdout.strip().split('\n') if out.stdout.strip() else []
    newest_clean = None
    newest_clean_gc = None
    history = []
    for cm in commits:
        rr = subprocess.run(['git','-C',root,'show',f'{cm}:{rel}'], capture_output=True)
        txt = rr.stdout.decode('utf-8', errors='replace')
        g = check(txt)
        history.append((cm[:7], g))
        if newest_clean is None and g == 0:
            newest_clean = cm[:7]
            newest_clean_gc = g
    plan.append((rel, head_gc, newest_clean, history))
    print(f"\n{rel}: DISK garbled, HEAD gc={head_gc}, NEWEST_CLEAN={newest_clean}", flush=True)
    print("   history(newest->oldest): " + ", ".join(f"{c}={g}" for c,g in history), flush=True)

print("\n\n===== RESTORE PLAN (newest clean commit per file) =====", flush=True)
for rel, hg, nc, _ in plan:
    print(f"  {rel}  <-  {nc}   (HEAD gc={hg})", flush=True)
