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

restored_head = []
restored_hist = []
for fp in html_files:
    rel = os.path.relpath(fp, root).replace('/', '\\')
    try:
        with open(fp,'r',encoding='utf-8',errors='replace') as fh:
            disk = fh.read()
    except Exception:
        disk = ''
    if check(disk) == 0:
        continue
    # HEAD version clean?
    r = subprocess.run(['git','-C',root,'show',f'HEAD:{rel}'], capture_output=True)
    head = r.stdout.decode('utf-8', errors='replace')
    if check(head) == 0:
        subprocess.run(['git','-C',root,'checkout','HEAD','--',rel], check=True)
        restored_head.append(rel)
        print(f"[HEAD ] {rel}", flush=True)
    else:
        # find newest historical clean commit
        out = subprocess.run(['git','-C',root,'rev-list','HEAD','--',rel], capture_output=True, text=True)
        commits = out.stdout.strip().split('\n') if out.stdout.strip() else []
        chosen = None
        for cm in commits:  # newest first
            rr = subprocess.run(['git','-C',root,'show',f'{cm}:{rel}'], capture_output=True)
            txt = rr.stdout.decode('utf-8', errors='replace')
            if check(txt) == 0:
                chosen = cm
                break
        if chosen is None:
            print(f"[FAIL ] {rel} NO CLEAN HISTORY", flush=True)
            continue
        subprocess.run(['git','-C',root,'checkout',chosen,'--',rel], check=True)
        restored_hist.append((rel, chosen))
        print(f"[HIST ] {rel} <- {chosen[:7]}", flush=True)

# re-scan
remaining = 0
for fp in html_files:
    try:
        with open(fp,'r',encoding='utf-8',errors='replace') as fh:
            c = fh.read()
    except Exception:
        continue
    if check(c) > 0:
        remaining += 1
        print("STILL GARBLED:", os.path.relpath(fp, root), flush=True)

print(f"\nRestored from HEAD: {len(restored_head)}")
print(f"Restored from history: {len(restored_hist)}")
print(f"REMAINING GARBLED: {remaining}")
