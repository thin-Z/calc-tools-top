#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scan calculator-site HTML files for CSP-relevant inline code:
1. Inline <script> blocks (no src attribute)
2. Inline event handlers (onxxx="...")
3. Inline <style> blocks and style="" attributes (for future style-src cleanup)
Output: per-file counts + total. Skips dist/ and node_modules/.
"""
import os
import re
import sys
import json
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {"dist", "node_modules", ".git", "deliverables"}

SCRIPT_RE = re.compile(r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>", re.S | re.I)
EVENT_RE = re.compile(r"\son[a-z]+\s*=", re.I)
STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.S | re.I)
STYLE_ATTR_RE = re.compile(r"\sstyle\s*=", re.I)


def scan_html(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    scripts = SCRIPT_RE.findall(content)
    n_exec = 0
    n_jsonld = 0
    n_other = 0
    for attrs, body in scripts:
        if re.search(r"\bsrc\s*=", attrs, re.I):
            continue  # external script, not inline
        if re.search(r"application/ld\+json", attrs, re.I):
            n_jsonld += 1
        elif re.search(r"\btype\s*=\s*['\"]?(text/(javascript|template)|module)['\"]?", attrs, re.I) or "type" not in attrs.lower():
            n_exec += 1
        else:
            n_other += 1  # e.g. text/html templates
    return {
        "inline_exec_scripts": n_exec,
        "jsonld_blocks": n_jsonld,
        "other_script_types": n_other,
        "event_handlers": len(EVENT_RE.findall(content)),
        "style_blocks": len(STYLE_BLOCK_RE.findall(content)),
        "style_attrs": len(STYLE_ATTR_RE.findall(content)),
        "bytes": len(content.encode("utf-8", "replace")),
    }


def main():
    results = {}
    totals = defaultdict(int)
    file_count = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace("\\", "/")
            try:
                r = scan_html(full)
            except Exception as e:
                print(f"ERROR {rel}: {e}", file=sys.stderr)
                continue
            if any(v > 0 for k, v in r.items() if k != "bytes"):
                results[rel] = r
                for k, v in r.items():
                    if k != "bytes":
                        totals[k] += v
                file_count += 1

    # Sort by total inline exec scripts + event handlers desc
    ordered = sorted(results.items(), key=lambda kv: (kv[1]["inline_exec_scripts"] + kv[1]["event_handlers"]), reverse=True)

    print("=" * 88)
    print(f"FILES WITH INLINE CODE: {file_count}")
    print(f"TOTALS: exec_scripts={totals['inline_exec_scripts']}  jsonld={totals['jsonld_blocks']}  "
          f"other_types={totals['other_script_types']}  event_handlers={totals['event_handlers']}  "
          f"style_blocks={totals['style_blocks']}  style_attrs={totals['style_attrs']}")
    print("=" * 88)
    print(f"{'FILE':<58} {'exec':>4} {'ld+json':>7} {'other':>5} {'event':>5} {'<style>':>7} {'style=':>6}")
    for rel, r in ordered:
        print(f"{rel:<58} {r['inline_exec_scripts']:>4} {r['jsonld_blocks']:>7} {r['other_script_types']:>5} "
              f"{r['event_handlers']:>5} {r['style_blocks']:>7} {r['style_attrs']:>6}")

    # Also dump JSON for machine consumption
    out = os.path.join(ROOT, "docs", "csp-inline-scan.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"totals": dict(totals), "files": results}, f, ensure_ascii=False, indent=1)
    print(f"\nJSON dumped to {out}")


if __name__ == "__main__":
    main()
