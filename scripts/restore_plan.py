import os, subprocess

root = r'D:\_Careate.Program\calculator-site'

# (forward-slash path, newest-clean commit) -- from analyze_forward.py
PLAN = {
    'blog/en/bmi-normal-range-guide.html': 'f705aa8',
    'blog/zh/bmi-normal-range-guide.html': 'f705aa8',
    'blog/zh/car-loan-calculator-guide.html': 'f705aa8',
    'blog/zh/compound-interest-guide.html': 'f705aa8',
    'blog/zh/date-calculation-tips.html': 'f705aa8',
    'blog/zh/discount-calculation-tips.html': 'f705aa8',
    'blog/zh/equal-installment-vs-equal-principal.html': 'f705aa8',
    'blog/zh/housing-fund-loan-guide.html': 'f705aa8',
    'blog/zh/image-compression-guide.html': 'f705aa8',
    'blog/zh/mortgage-rate-trend-2026.html': 'f705aa8',
    'blog/zh/overtime-pay-guide.html': 'f705aa8',
    'blog/zh/password-security-guide.html': 'f705aa8',
    'blog/zh/percentage-calculation-tips.html': 'f705aa8',
    'blog/zh/qr-generator-guide.html': 'f705aa8',
    'blog/zh/random-number-guide.html': 'f705aa8',
    'blog/zh/standard-weight-guide.html': 'f705aa8',
    'blog/zh/tax-deduction-guide-2026.html': 'f705aa8',
    'en/text/html-stripper.html': '1889f7f',
    'en/text/json-formatter.html': '66feddd',
    'en/text/keyword-density.html': '66feddd',
    'en/text/reading-time.html': '1889f7f',
    'en/text/text-cleaner.html': '1889f7f',
    'en/text/text-diff.html': '1889f7f',
    'en/text/url-encode.html': '1889f7f',
    'zh/contact.html': 'f705aa8',
    'zh/index.html': '20071bc',
    'zh/privacy.html': 'f705aa8',
    'zh/text/html-stripper.html': '1889f7f',
    'zh/text/reading-time.html': '1889f7f',
    'zh/text/text-cleaner.html': '1889f7f',
    'zh/text/text-diff.html': '1889f7f',
    'zh/text/url-encode.html': '1889f7f',
}

GARBLED = ['鎺','鏈','璁','鍦','鐩','鑻','闂','闅','浣','骞','涓','棣','閲','鎴',
           '掑','嵉','熻','绠','楀','櫒','閸','馃','鈫','鈥','鿔','鈚','鈙','銆',
           '鏂','鏃','欏','鐢','闀','绔','缁','瑁','鐪','鍙','浜','鐗','楗','绌',
           '鑳','杩','瑷','澶','鎯','鍗','閮','鏄','闇','闆']

def check(content):
    return sum(content.count(c) for c in GARBLED) + content.count('\ufffd')

ok = 0
for rel, cm in PLAN.items():
    # verify chosen commit really is clean before restoring
    r = subprocess.run(['git','-C',root,'show',f'{cm}:{rel}'], capture_output=True)
    txt = r.stdout.decode('utf-8', errors='replace')
    if check(txt) != 0:
        print(f"[SKIP ] {rel} chosen {cm} is NOT clean!", flush=True)
        continue
    subprocess.run(['git','-C',root,'checkout',cm,'--',rel], check=True)
    ok += 1
    print(f"[OK   ] {rel} <- {cm}", flush=True)

print(f"\nRestored {ok} files from history.", flush=True)

# re-scan to confirm
remaining = 0
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ['.git','node_modules','scripts','.workbuddy']):
        continue
    for f in fn:
        if f.endswith('.html'):
            fp = os.path.join(dp, f)
            try:
                with open(fp,'r',encoding='utf-8',errors='replace') as fh:
                    c = fh.read()
            except Exception:
                continue
            if check(c) > 0:
                remaining += 1
                print("STILL GARBLED:", os.path.relpath(fp, root).replace('\\','/'), flush=True)
print(f"REMAINING GARBLED (excluding word-counter which has no clean history): {remaining}", flush=True)
