"""Clean corrupt HTML files: remove broken link fragments and duplicate OG tags."""
import re
import os

root = r"D:\_Careate.Program\calculator-site"
corrupt_files = [
    "zh/text/html-stripper.html",
    "zh/text/reading-time.html",
    "zh/text/text-cleaner.html",
    "zh/text/text-diff.html",
    "zh/text/url-encode.html",
]

for rel_path in corrupt_files:
    filepath = os.path.join(root, rel_path)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. Remove broken <link rel='/> fragments (empty rel value)
    content = re.sub(r"<link\s+rel='\s*/?\s*>", "", content)

    # 2. Remove broken <link rel=" that spans multiple lines (broken canonical)
    # Only match when rel=" is followed by a newline (broken) - NOT single-line valid tags
    content = re.sub(r'<link\s+rel="\n[^>]*>', "", content, flags=re.DOTALL)

    # 3. Remove all OG and Twitter meta tags (single-quoted)
    content = re.sub(r"<meta\s+property='og:[^']*'[^>]*/?>\s*", "", content, flags=re.DOTALL)
    content = re.sub(r"<meta\s+name='twitter:[^']*'[^>]*/?>\s*", "", content, flags=re.DOTALL)

    # 4. Remove old SoftwareApplication JSON-LD blocks
    content = re.sub(
        r'<script type="application/ld\+json">[^<]*?\{[^}]*?"@type":\s*"SoftwareApplication"[^}]*?\}[\s\S]*?</script>\s*',
        "",
        content,
        flags=re.DOTALL,
    )

    # 5. Clean up multiple blank lines
    content = re.sub(r"\n{3,}", "\n\n", content)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✓ {rel_path} - cleaned")
    else:
        print(f"- {rel_path} - no changes")

print("\nDone!")
