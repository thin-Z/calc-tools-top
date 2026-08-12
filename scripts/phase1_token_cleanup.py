# -*- coding: utf-8 -*-
"""Phase 1: 收编硬编码颜色为 design tokens（仅精确锚点替换，值不变）"""
import io, sys

PATH = r"D:\_Careate.Program\calculator-site\css\style.css"

with io.open(PATH, "r", encoding="utf-8") as f:
    css = f.read()

# (old, new, description) — 锚点足够唯一
REPLACEMENTS = [
    # 背景硬编码 #fff → var(--bg-card)（暗色自动生效）
    ("""    background: #fff;
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-primary);""",
     """    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-primary);""",
     "related-tools li a bg"),

    (""".upload-zone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    background: #fff;""",
     """.upload-zone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    background: var(--bg-card);""",
     "upload-zone bg"),

    (""".preview-card {
    background: #fff;""",
     """.preview-card {
    background: var(--bg-card);""",
     "preview-card bg"),

    (""".tool-controls {
    background: #fff;""",
     """.tool-controls {
    background: var(--bg-card);""",
     "tool-controls bg"),

    ("""    font-size: 1rem;
    background: #fff;
    color: var(--text-primary);
    cursor: pointer;
    transition: border-color 0.2s;
}

.control-group select:focus {""",
     """    font-size: 1rem;
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
    transition: border-color 0.2s;
}

.control-group select:focus {""",
     "control-group select bg"),

    ("""    border-radius: 8px;
    font-size: 1rem;
    background: #fff;
    color: var(--text-primary);
    transition: border-color 0.2s;
}

.control-group input[type="number"]:focus {""",
     """    border-radius: 8px;
    font-size: 1rem;
    background: var(--bg-card);
    color: var(--text-primary);
    transition: border-color 0.2s;
}

.control-group input[type="number"]:focus {""",
     "control-group number bg"),

    ("""    margin-top: 16px;
    padding: 16px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
}

.color-swatch {""",
     """    margin-top: 16px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
}

.color-swatch {""",
     "color-info bg"),

    (""".detail-like {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
    background: #fff;""",
     """.detail-like {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
    background: var(--bg-card);""",
     "detail-like bg"),

    ("""    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 0.3rem 0.7rem;
    font-size: 0.8rem;
    font-weight: 500;""",
     """    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 0.3rem 0.7rem;
    font-size: 0.8rem;
    font-weight: 500;""",
     "usage-count bg"),

    # 靛蓝偏色 → 品牌蓝（image tools focus/hover）
    ("""    outline: none;
    border-color: var(--brand-blue);
    box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}

.control-group input[type="number"] {""",
     """    outline: none;
    border-color: var(--brand-blue);
    box-shadow: 0 0 0 3px var(--primary-light);
}

.control-group input[type="number"] {""",
     "select focus indigo->brand"),

    ("""    outline: none;
    border-color: var(--brand-blue);
    box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}

.control-group input[type="checkbox"] {""",
     """    outline: none;
    border-color: var(--brand-blue);
    box-shadow: 0 0 0 3px var(--primary-light);
}

.control-group input[type="checkbox"] {""",
     "number focus indigo->brand"),

    ("""    box-shadow: 0 2px 8px rgba(79,70,229,0.12);
    transform: translateY(-1px);""",
     """    box-shadow: 0 2px 8px var(--primary-glow);
    transform: translateY(-1px);""",
     "related-tools hover shadow indigo->brand"),

    # hot-search-term hover 深色文字 → token（暗色兼容）
    (""".hot-search-term:hover {
    background: var(--border);
    color: #1e293b;
}""",
     """.hot-search-term:hover {
    background: var(--border);
    color: var(--text-primary);
}""",
     "hot-search-term hover color token"),
]

ok = 0
fail = []
for old, new, desc in REPLACEMENTS:
    if old in css:
        css = css.replace(old, new, 1)
        ok += 1
    else:
        fail.append(desc)

with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(css)

print("applied: %d/%d" % (ok, len(REPLACEMENTS)))
if fail:
    print("FAILED anchors:")
    for d in fail:
        print("  -", d)
