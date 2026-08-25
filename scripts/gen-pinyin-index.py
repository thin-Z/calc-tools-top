#!/usr/bin/env python3
# 生成 js/tool-pinyin.js：每个工具的全拼/首字母索引（用于首页拼音/首字母搜索）。
# 设计：全拼与首字母均"去空格"拼接，确保「贷款」->「daikuan」连续可被 includes 命中。
import json
from pypinyin import pinyin, Style

ROOT = "D:/_Careate.Program/calculator-site"
with open(f"{ROOT}/tools.json", encoding="utf-8") as f:
    tools = json.load(f)

out = {}
for t in tools:
    slug = t.get("slug")
    if not slug:
        continue
    zh = t.get("zh", {})
    name = zh.get("name", "") or ""
    kw = zh.get("kw", "") or ""
    blob = f"{name} {kw}"
    py = "".join(seg[0] for seg in pinyin(blob, style=Style.NORMAL, heteronym=False, errors="default"))
    ini = "".join(seg[0] for seg in pinyin(blob, style=Style.FIRST_LETTER, heteronym=False, errors="default"))
    out[slug] = {"py": py.lower(), "ini": ini.lower()}

# 写出为浏览器可直接加载的全局变量（无 inline，符合 CSP）
lines = ["/* 自动生成 — 工具名/关键词 拼音索引（scripts/gen-pinyin-index.py）。勿手改，重建即覆盖。 */",
         "window.TOOL_PINYIN_ZH = " + json.dumps(out, ensure_ascii=False, indent=2) + ";"]
with open(f"{ROOT}/js/tool-pinyin.js", "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print(f"OK: {len(out)} 个工具拼音索引已写入 js/tool-pinyin.js")
print("sample:", json.dumps(out.get("mortgage"), ensure_ascii=False), "/ bmi:", json.dumps(out.get("bmi"), ensure_ascii=False))
