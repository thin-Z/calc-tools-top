# calc-tools.top Phase 3 交付报告（GDPR + API 安全 + 设计合并 + 乱码清尾）

**日期**：2026-07-23
**场景**：全流程交付 + 上线前检查 + 调试复盘（乱码残留）
**参与成员**：产品评审员 + 安全官 + 设计顾问 + 质量门神（+ 实现代理 impl-phase3）

---

## 📌 TL;DR（执行摘要）

- 整体结论：🟢 通过（修复 QA 验收发现的 3 项真性阻塞后）
- 阻塞项数量：0（原 3 项 🟠A/B/D 已全部修复；🟠C 为部署前置配置，非代码阻塞）
- 下一步：推送 `origin/main` 触发 Vercel 部署；部署前确认 Vercel 已配 `KV_REST_API_URL`；Vercel 后台添加 apex 域名 `calc-tools.top` 使 Phase 1 的 www 301 生效。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go |
| 严重度分布 | 🔴 0 / 🟠 4（均修复）/ 🟡 2（1 误报 1 接受）/ 🟢 多项通过 |
| 关键行动项 | 7 条（见下） |
| 建议负责人 | 老板（push + Vercel 配置） |

---

## 1. 各成员核心结论

### 🔍 产品评审员（产品评审）
Phase 3 范围 = GDPR 门控 + API 安全加固 + 双 CSS 合并。经评审选定「低风险批 + GDPR」方案，计划 GO。五个实现提交落地后功能完整、范围受控。

### 🛡️ 安全官（OWASP + STRIDE 审计）
审计发现 API 三处弱点（单实例 `Map` 限速可被绕过、GET 无 `toolId` 触发全表枚举 N+1、POST 无 body/超时限制）+ Cookie 同意前静态注入 AdSense（GDPR 缺口）+ 隐私页披露不一致。已在 `d017a3a` / `2ca0d1d` / `5908502` 加固：`getClientIp` 取 XFF 最右可信段、限速改 KV 共享态、GET 无 `toolId` 返回 403、POST body ≤1KB+2s 超时、按 IP 每日点赞上限、AdSense 改为 `cookie-consent.js` 同意后动态注入、`vercel.json` 强制 CSP/HSTS、`robots.txt` 屏蔽 `/api`。

### 🎨 设计顾问（设计系统与视觉）
双 CSS（`style.css` token 体系 + `site.css`/`text-tools.css` 硬编码 slate）合并为单一 token 体系（`b006287` + `d5f20a8`）：`style.css` 增语义 token，`site.css`/`text-tools.css` 硬编码 → `var(--token)`，`footer` 单源、半径 token 化。保留 `#1e293b` 暗色代码块为有意设计。

### ✅ 质量门神（QA 测试与发布）
独立验收初判 🔴 No-Go，列出 🟠A/B/C/D + 🟡E/F。经主理人独立复核（以 git 对象为权威，不读被同步盘污染的工作树）：
- **🟠A**（CSP 的 `img-src`/`frame-src` 缺 `googlesyndication`/`doubleclick`，同意后的 AdSense 素材/iframe 被拦）→ 真，已修复（`7668b48`）。
- **🟠B**（`cookie-consent.js` 中 `s.crossOrigin = "anonymous"` 致 AdSense 脚本因无 CORS 头而加载失败）→ 真，已修复（`7668b48`）。
- **🟠C**（限速/点赞上限仅在配置 KV 时生效，否则退化为单实例 `Map`）→ 部署前置配置项，非代码阻塞，已写入待办。
- **🟠D**（11 页 `og:title`/`og:description`/`twitter:*` 乱码）→ 初判时主理人误以为系工作树污染误报；经 `git grep HEAD` 权威复核确认 11 文件真性乱码（Phase 2 当年只修 `<meta name="description">`，漏掉 og/twitter 系标签）→ 真，已修复（`800a63f`，11 文件全量回填正确中文）。
- **🟡E**（`site.css` 两处 `#1e293b`）→ 设计上有意保留，非缺陷。
- **🟡F**（`zh/privacy.html` 混英文句）→ 轻微 i18n 瑕疵，不阻塞，留待后续。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🟠 | 隐私/合规 | 119 HTML + js/cookie-consent.js | 同意前静态注入 AdSense | 改为同意后动态注入 | 安全官 → 已修复 `5908502` |
| 2 | 🟠 | 安全 | api/clicks.js, api/likes.js | Map 限速可绕过 / XFF 可伪造 / GET 枚举 N+1 / 无 body 限 | KV 共享限速 + XFF 最右 + GET 403 + body 限 | 安全官 → 已修复 `d017a3a` |
| 3 | 🟠 | 前端/广告 | vercel.json + js/cookie-consent.js | CSP 拦截 AdSense 素材/iframe；`crossOrigin=anonymous` 致脚本失败 | CSP 放开 googlesyndication/doubleclick；删 crossOrigin | QA → 已修复 `7668b48` |
| 4 | 🟠 | SEO/质量 | 11 页 og/title/twitter meta | Phase 2 漏修的 meta 乱码 | 全量回填正确中文 | QA → 已修复 `800a63f` |
| 5 | 🟡 | 部署 | Vercel 环境 | 限速/点赞上限需 `KV_REST_API_URL` 才生效 | 部署前配置 KV | QA |
| 6 | 🟡 | i18n | zh/privacy.html | 混英文句 "This 隐私政策 applies..." | 后续统一中文 | QA |

---

## ✅ 行动清单（至少 3 条具体可执行项）

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | push `origin/main` 触发 Vercel 部署 | 老板 | P0 | 即刻 |
| 2 | Vercel 后台添加 apex 域名 `calc-tools.top`，使 Phase 1 的 www 301 生效 | 老板 | P0 | 部署后 |
| 3 | Vercel 配置 `KV_REST_API_URL`/`KV_REST_API_TOKEN` 启用限速与点赞上限 | 老板 | P0 | 部署前 |
| 4 | GSC 重交 sitemap + 观察收录窗（当前仅 ~4/165） | 老板 | P1 | 部署后 2–4 周 |
| 5 | 全站 canonical 统一 www（158 文件用 `calc-tools.top`） | 后续任务 | P2 | 待定 |
| 6 | CSS Phase B 物理合并（site.css/text-tools.css 合入 style.css） | 后续任务 | P2 | 待定 |
| 7 | zh/privacy.html 英文句中文化 | 后续 | P3 | 待定 |

---

## ⚠️ 待完善 / 已知局限

- **301（Phase 1）** 因 Vercel 未配 apex 域名仍不生效，属运维项，非代码缺陷。
- **canonical www 不一致**（62 文件 `www.calc-tools.top`，158 文件 `calc-tools.top`）留独立任务，未擅自批量改。
- **CSS Phase B 物理合并** 挂起（当前为 token 引用合并，非文件合并）。
- **zh/privacy.html** 轻微 i18n 瑕疵（L114/117 混英文句）。
- **限速/上限** 依赖 Vercel KV，未配则退化为尽力而为（仍比原单实例 Map 安全）。
- **乱码修复方法说明**：整段 GBK 往返有损不可靠，故采用「用页面干净 `<title>` 与干净标准 `description` 回填所有含乱码的 meta 标签」策略；全部走 index-only git blob 提交以绕过百度网盘同步盘对工作树的覆盖。

---

## 📚 成员产出索引

- gstack-product-reviewer（产品评审员）原始产出：Phase 3 评审计划（GO，选「低风险批 + GDPR」）
- gstack-security-officer（安全官）原始产出：API + GDPR + 隐私审计与加固方案
- gstack-designer（设计顾问）原始产出：CSS token 合并（Phase A + Commit 5）
- gstack-qa-lead（质量门神）原始产出：独立验收报告（🔴No-Go → 修复后 🟢Go）
- impl-phase3（实现代理）原始产出：index-only git blob 实现 5 提交 + 2 fixup

---

## 📦 提交链（未推送，共 7 个）

```
800a63f Fix residual meta mojibake in 11 pages (og/twitter/title/description) missed by Phase 2
7668b48 Phase 3 fixup: CSP allow AdSense creatives/iframes; remove cookie-consent crossOrigin
d5f20a8 Phase 3 Commit 5 — CSS-only 收尾: footer 单源 + 半径 token 化
5908502 Phase 3: GDPR - remove static pre-consent AdSense scripts/ins, gate via cookie-consent.js
b006287 Phase 3 Commit 3 — CSS Phase A 合并: 单一 token 设计系统收口
2ca0d1d Phase 3: fix privacy disclosure consistency + og:description mojibake
d017a3a Phase 3: harden api rate-limit/XFF/enum/body + enforce CSP/HSTS + robots /api
```

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
