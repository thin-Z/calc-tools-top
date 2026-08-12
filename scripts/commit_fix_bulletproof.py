#!/usr/bin/env python3
"""
Bulletproof fix: create a git commit with cleaned HTML content WITHOUT
touching the working tree (which is fought over by a netdisk sync client).
We read blobs from HEAD, apply verified-safe replacements, write new blobs
via `git hash-object -w --stdin`, stage via `git update-index --cacheinfo`,
then build a tree + commit + move HEAD. Sync client cannot revert .git.
"""
import subprocess, re, sys

REPO = r'D:\_Careate.Program\calculator-site'

# (path, [(mojibake_substring, correct_substring), ...])
FIXES = {
    'zh/calculators/ovulation.html': [
        ('棣栭〉', '首页'),
        ('馃嚞馃嚙 English', '🇬🇧 English'),
        ('閲嶇疆', '重置'),
        ('鎺掑嵉鏃ワ細', '排卵日：'),
        ('鏄撳瓡鏈燂細', '易孕期：'),
    ],
    'zh/text/keyword-density.html': [
        ('鍏抽敭璇嶅瘑搴﹀垎鏋愬凡鍚堝苟鍒板瓧鏁扮粺璁″伐鍏蜂腑',
         '关键词密度分析已合并到字数统计工具中'),
    ],
    'en/text/html-stripper.html': [
        ('閳ユ攺o', '— no'),
    ],
    'en/text/text-cleaner.html': [
        ('閳ユ攺o', '— no'),
    ],
}

def run(args, input_bytes=None):
    return subprocess.run(args, cwd=REPO, input=input_bytes,
                          capture_output=True, text=False)

def get_blob(path):
    r = run(['git', 'show', f'HEAD:{path}'])
    return r.stdout  # bytes

def raw_rev_count(content_bytes):
    text = content_bytes.decode('utf-8', errors='replace')
    n = 0
    for m in re.finditer(r'>([^<]+)<', text):
        t = m.group(1).strip()
        if not t or len(t) < 2: continue
        if all(ord(c) < 128 for c in t): continue
        try:
            rev = t.encode('gbk', errors='strict').decode('utf-8', errors='strict')
            if rev != t: n += 1
        except: pass
    return n

def main():
    # reset index to HEAD
    run(['git', 'read-tree', 'HEAD'])
    staged = []
    for path, pairs in FIXES.items():
        blob = get_blob(path)
        text = blob.decode('utf-8')
        before = raw_rev_count(blob)
        for moji, correct in pairs:
            cnt = text.count(moji)
            if cnt == 0:
                print(f'  ⚠️ [{path}] 未找到 {moji!r}，跳过')
                continue
            text = text.replace(moji, correct)
            print(f'  ✅ [{path}] {moji!r} -> {correct!r} (x{cnt})')
        new_blob = text.encode('utf-8')
        after = raw_rev_count(new_blob)
        # write new blob
        h = run(['git', 'hash-object', '-w', '--stdin'], input_bytes=new_blob)
        blob_hash = h.stdout.decode().strip()
        run(['git', 'update-index', '--cacheinfo', f'100644,{blob_hash},{path}'])
        staged.append((path, before, after))
        print(f'     可反转节点: {before} -> {after}')
    # build tree + commit
    tree = run(['git', 'write-tree']).stdout.decode().strip()
    parent = run(['git', 'rev-parse', 'HEAD']).stdout.decode().strip()
    commit_msg = ("fix: 精准修复 ovulation 等页面的 GBK 乱码（经 git blob 提交，绕过同步盘）\n\n"
                  "- zh/calculators/ovulation.html: 5 处纯中文/emoji 乱码还原\n"
                  "- zh/text/keyword-density.html: 1 处中文乱码还原\n"
                  "- en/text/html-stripper.html, text-cleaner.html: 英文 em-dash 乱码修复")
    ct = run(['git', 'commit-tree', tree, '-p', parent, '-m', commit_msg])
    commit_hash = ct.stdout.decode().strip()
    run(['git', 'update-ref', 'HEAD', commit_hash])
    print(f'\n✅ 新提交: {commit_hash}')
    print('已暂存文件:')
    for p, b, a in staged:
        print(f'  {p}: 可反转 {b} -> {a}')

if __name__ == '__main__':
    main()
