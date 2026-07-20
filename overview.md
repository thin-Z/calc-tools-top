# 全站代码审查报告

> 审查日期：2026-07-20 | 总计 215 个文件 / ~1.7 MB

---

## 一、HTML 文件乱码分类

### 对比视图

| 分类 | 文件数 | 严重度 | 说明 |
|------|--------|--------|------|
| **SEVERE** | **80** | 🔴 高 | 正文中文（title/h1/p/li 等）为乱码，不可读 |
| **EMOJI_ONLY** | **71** | 🟡 中 | 仅装饰性 emoji 在分类标签/面包屑/blog-meta 中乱码；英文文本正常 |
| **CLEAN** | **8** | ✅ | 无乱码 |
| **合计** | **159** | | 含首页、各导航页、工具页、博客页 |

### SEVERE（80 文件）—— 正文中文乱码

| 分组 | 数量 | 路径示例 |
|------|------|----------|
| `zh/calculators/` | 21 个 | mortgage.html, bmi.html, tax2026.html... |
| `zh/image/` | 6 个 | compress.html, convert.html, resize.html... |
| `zh/text/` | 11 个 (注) | json-formatter.html, case-converter.html... |
| `blog/zh/` | 38 个 | age-calc-guide.html, bmi-normal-range-guide.html... |
| 根页面 | 4 个 | 404.html, about.html, contact.html, privacy.html |
| 其他 | 1 个 | en/image/index.html |
| **小计** | **80** | |

> 注：`zh/text/keyword-density.html` 标题含 U+FFFD 替换符但 body 中文基本正常，已归入 CLEAN。

被乱码的典型标题：
```
BIM 计算�? - 工具箱里         ← zh/calculators/bmi.html（U+FFFD）
Base64缂栬В鐮佸伐鍏凤細浠€涔堟槸Base64锛熸€庝箞鐢紵
养老金计算器+养老金计算公��?
```

### EMOJI_ONLY（71 文件）—— 仅装饰 emoji 乱码
- **en/calculators/** (21个), **en/image/** (5个), **en/text/** (6个)  
- **blog/en/** (38个), **en/index.html**, 部分 zh/index 页面

示例：
```
馃敡 Dev Tools          ← 原应为 🔧
馃挵 Finance             ← 原应为 💰
馃搮 2026-06-26         ← 原应为 📅
```

英文标题/正文本身：**无乱码，可正常阅读**。

### CLEAN（8 文件）
- `index.html`（已修复）
- `en/text/html-stripper.html`, `en/text/keyword-density.html`, `en/text/reading-time.html`
- `en/text/text-cleaner.html`, `en/text/text-diff.html`, `en/text/url-encode.html`
- `zh/text/keyword-density.html`

---

## 二、CSS / JS / 脚本 / 配置文件

| 类型 | 文件数 | 乱码 | 备注 |
|------|--------|------|------|
| CSS | 4 | ❌ 无 | site.css(32KB), style.css(19KB), cookie-consent.css, text-tools.css |
| JS | 40 | ❌ 无 | 含 js/calculators/ 子目录 |
| API | 2 | ❌ 无 | contact.js, newsletter.js |
| 脚本 | 10 | ❌ 无 | 含 fix_toolcards.py, generate-sitemap.ps1 等 |
| 配置 | 4 | ❌ 无 | vercel.json, sitemap.xml, robots.txt, .gitignore |

**结论：非 HTML 代码全部正常，无需修复。**

---

## 三、其他发现

### 3.1 `scripts/fix_index_mojibake.py`（⚠️ 禁止脚本）
注释标注为「禁止的批量脚本」，文件具体内容未审，**不进 git**。若需清理可删除。

### 3.2 `.workbuddy/memory/` 不进 git
已通过每次 commit 手动排除，无需添加 .gitignore（或可考虑添加以避免遗漏）。

### 3.3 `zh/index.html` 为重定向页
仅有 `<meta http-equiv="refresh">` 跳转到 `/`，本身 body 无可见文本，影响低。

### 3.4 sitemap URL 域名已统一
上次已修 `calc-tools.top` → `www.calc-tools.top`，165 条 URL 全部正确。

### 3.5 Root HTML 结构完好
首页（index.html）结构洞已全部修复——已验证 html.parser 平衡，非 like-btn 结构错误 = 0。

---

## 四、建议修复优先级

### P0：SEVERE 80 文件（正文中文不可读）

方案一（推荐）：**批量脚本自动修复**

使用 UTF-8→GBK 双重编码逆向算法：逐字符 `c.encode('utf-8').decode('gbk')` 成功即替换。已验证可还原中文原文及 emoji（emoji 需两步：先 decode('gbk') 再 encode('gbk').decode('utf-8')）。

- 文件：`zh/calculators/*` (21+6+11 工具页) → 单个脚本全量修复
- 文件：`blog/zh/*` (38 篇) → 需额外注意保留正文
- 文件：`404.html`, `about.html`, `contact.html`, `privacy.html` (4 个根页)
- 容量：总计约 ~720 KB HTML

### P1：EMOJI_ONLY 71 文件（装饰 emoji 乱码）

同上算法可修复，但 emoji 复原需二级 decode。EN 版工具页/博客页英文正文完整无损，仅 category 标签、博客元信息（日期/面包屑/语言切换器）中的 emoji 符号乱码。

### 时间预估（脚本化）
- 写脚本 + 测试：~30 行 Python
- 执行脚本：<10 秒
- 验证结果：人工目测 + grep 复扫 15 分钟
- commit + push：2 分钟
