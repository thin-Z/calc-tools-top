# JSON 格式化工具分类归属修复报告

**日期**：2026-08-12
**场景**：代码审查 + 分类修复（单Agent直调）
**参与成员**：主理人沽思航（Gu）· 软件工坊 CEO（代码勘察、修复与验证）

---

## 📌 TL;DR（执行摘要）
- 整体结论：🟢 通过
- 阻塞项数量：0
- 根因：JSON 格式化**卡片自身的分类标注（data-category="text"、路径 /text/、site.js 配置）全部正确**，但**首页 DOM 结构错误**——"🖼️ 图片工具"的 `<div class="tool-grid">` 未在图片卡片后闭合，把 10 个文字工具卡片（含 JSON 格式化）全部包在图片区块内，且**缺少独立的"✏️ 文字工具"区块标题**，导致视觉与 DOM 语义上 JSON 格式化归入图片工具分类。
- 下一步：部署后可在 calc-tools.top 首页确认"✏️ 文字工具"独立区块出现、JSON 格式化卡片归属其中。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go |
| 严重度分布 | 🔴 0 / 🟠 0 / 🟡 1（DOM 结构性归属错误）/ 🟢 0 |
| 关键行动项 | 3 条 |
| 建议负责人 | 沽思航（Gu） |

---

## 1. 核心结论

### 🔍 勘察结论（主理人）
- **核心判断**：JSON 格式化工具的归属问题不是"分类配置错误"，而是"首页区块 DOM 结构错误"。数据层（`js/site.js` 中 `categories: ['text']`）、路径层（`/zh/text/json-formatter`、`/en/text/json-formatter`）、索引层（`zh/text/index.html`、`en/text/index.html`、sitemap.xml）均已正确归入文字分类；唯一错误是主首页 `index.html` / `en/index.html` 中图片工具 tool-grid 未闭合，文字工具卡片物理上被包在"🖼️ 图片工具"区块内。
- **关键建议**：修复首页区块结构，为文字工具建立独立区块标题，同时顺带修复同一卡片区域的 3 个相关缺陷。

---

## 2. 综合审查发现（按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源 |
|---|--------|------|------|---------|------|------|
| 1 | 🟡 | 结构 | index.html / en/index.html | "🖼️ 图片工具" tool-grid 未在图片卡片后闭合，10 个文字工具卡片（含 JSON 格式化）被包在图片区块内，且无独立"文字工具"区块标题 → JSON 格式化在首页显示/语义上归入图片工具 | 拆分 tool-grid，新增"✏️ 文字工具 / ✏️ Text Tools"独立区块 | 主理人 |
| 2 | 🟡 | 结构 | index.html 第 106 行 | 图片工具标题内 `<span class="privacy-badge-sm">` 未闭合（中文首页） | 补 `</span>` | 主理人 |
| 3 | 🟡 | 显示 | index.html / en/index.html | color-picker 卡片 tag 误标 `tag-text`（✏️ 文字），实际应属图片分类 | 改为 `tag-image`（🖼️ 图片） | 主理人 |
| 4 | 🟡 | 逻辑 | index.html / en/index.html | color-picker 卡片点赞按钮 `data-like-id="word-counter"` 误指向字数统计 | 改为 `data-like-id="color-picker"` | 主理人 |

> 其余层面均已核验正确：`js/site.js` 分类配置、工具页路径与 canonical、sitemap.xml、文字/图片子索引页、about/privacy 文案、相关工具区块，均无 json 归入图片分类的残留。

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 拆分首页图片/文字 tool-grid，新增"✏️ 文字工具 / ✏️ Text Tools"区块标题（index.html + en/index.html） | 主理人 | P0 | ✅ 已完成（commit 15863ad） |
| 2 | 修复中文首页图片工具标题 span 未闭合 + color-picker 卡片 tag / like-id | 主理人 | P1 | ✅ 已完成（commit 15863ad） |
| 3 | DOM 平衡校验 + 全站 json-formatter 分类一致性终检 + 推送部署 | 主理人 | P0 | ✅ 已完成并推送 |

---

## ⚠️ 待完善 / 已知局限

- 首页 DOM 平衡校验仍报 36/35 处"未闭合"（like-btn 心形 `<span class="heart">` 等全站既有写法），为历史遗留问题，与本次改动无关，浏览器可正常容错渲染，未纳入本次修复范围。
- 本地 `main` 分支与 origin/main 的 tracking 关系丢失（`[origin/main: gone]`），本次已用显式 `git push origin main` 推送成功，建议后续恢复 tracking 或持续使用显式推送。

---

## 📚 修改清单

- `index.html`（中文首页）：图片/文字 tool-grid 拆分 + 新增"✏️ 文字工具"区块 + span 闭合 + color-picker 卡片修正
- `en/index.html`（英文首页）：图片/文字 tool-grid 拆分 + 新增"✏️ Text Tools"区块 + color-picker 卡片修正

**验证结果**：
- index.html 未闭合 37→36（修复 1 处 span），区块相关 0，未闭合 div 0
- en/index.html 未闭合 35（持平），区块相关 0，未闭合 div 0
- 全站 json-formatter 卡片 data-category="text" ✅
- JSON 卡片前最近区块标题 = "✏️ 文字工具 / ✏️ Text Tools" ✅
- 本地预览 zh/en 首页 HTTP 200 ✅
- 已推送：`c0bfafd..15863ad main -> main`

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
