# -*- coding: utf-8 -*-
"""遗留3：style.css 字号字面量 -> --fs-* token（值不变，仅精确匹配 8 个刻度值）"""
import io, re

PATH = r"D:\_Careate.Program\calculator-site\css\style.css"

# 值 -> token（精确刻度）
FS_MAP = {
    "0.75rem": "var(--fs-xs)",
    "0.875rem": "var(--fs-sm)",
    "1rem": "var(--fs-md)",
    "1.125rem": "var(--fs-lg)",
    "1.25rem": "var(--fs-xl)",
    "1.5rem": "var(--fs-2xl)",
    "2rem": "var(--fs-3xl)",
    "3rem": "var(--fs-4xl)",
}

with io.open(PATH, "r", encoding="utf-8") as f:
    css = f.read()

# 匹配 font-size: <数字单位>，只替换命中字典的值
pat = re.compile(r"font-size:[ \t]*([0-9.]+(?:px|rem|em))")
replaced = {}

def repl(m):
    val = m.group(1)
    if val in FS_MAP:
        replaced[val] = replaced.get(val, 0) + 1
        return "font-size: " + FS_MAP[val]
    return m.group(0)

new_css = pat.sub(repl, css)

with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(new_css)

print("replaced:", replaced, "total:", sum(replaced.values()))
