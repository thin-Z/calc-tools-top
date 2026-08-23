# calc-tools.top P1+P2 增量 PRD（简单模式）

**版本**：v1.0（2026-08-23）
**作者**：许清楚（Xu，PM）
**范围**：待办清单 P1 项 4/5/6 + P2 项 7/8/9/10
**基线**：站点 184 页（含 80 博客）/ 43 工具 / 中英双语；verify-site.mjs 现有 11 项断言全绿；CSP 硬化完成

---

## 1. TL;DR

- 本次共 **13 个需求项（P1P2-01 ~ 13）**：**9 项本轮可执行**、**4 项需评估（其中 3 项倾向不做/暂缓）**、**3 项含需用户操作子项**。
- **最高价值且本轮必做**：新工具 ×4（P1P2-03，其中 JSON 格式化已有雏形建议升级而非新建）、SEO 批量审计+重点页优化（P1P2-01）、var 重构 + JSDoc（P1P2-11/12，低收益但为测试/分割扫清障碍）。
- **关键审计发现（改变原定范围）**：
  1. SRI 主体**已完成**——Chart.js@4.4.9、qrcodejs@1.0.0 已带 integrity+crossorigin，本轮只需"审计确认 + verify-site 断言固化"；
  2. 站点图片**全部为 SVG**（assets 仅 3 个文件），WebP 转换 / 图片 CDN **无目标文件，价值极低，建议不做**；
  3. **项目无 package.json**，但已用零依赖 `node --test`（js/test/like.test.js、api/test/*.test.js）；引入 Vitest/Playwright 需先经主理人确认；
  4. 关键 CSS 内联与严格 CSP（style-src 无 unsafe-inline）**冲突**，需架构师权衡 hash 方案或暂缓；
  5. **增长规划文档 deliverables/2026-08-18-增长规划.md 未找到**（仅 deep-review 存在），P1-4 范围以 todo-list Phase 1 描述为准。
- **建议执行顺序**：P1P2-03（新工具）→ P1P2-11（var 重构，回归高风险先做）→ P1P2-12（JSDoc）→ P1P2-01（SEO）→ P1P2-04/05（SRI/report）→ P1P2-10（可访问性）→ P1P2-13（测试）→ P1P2-09（JS 分割，依赖 11）。

---

## 2. 需求池表格

| 编号 | 来源 | 需求项 | 优先级 | 本轮标记 |
|------|------|--------|--------|----------|
| P1P2-01 | P1-4 | 现有内容 SEO 优化（title/description/内链批量优化） | P0 | **本轮可执行**（脚本审计 + 重点页文案） |
| P1P2-02 | P1-4 | Google News 提交评估 | P2 | **需评估** + 需用户操作（若提交） |
| P1P2-03 | P1-5 | 新工具 ×4（颜色对比度/JSON 格式化/正则/Markdown 预览） | P0 | **本轮可执行**（3 新建 + 1 升级，JSON 范围待确认） |
| P1P2-04 | P1-6 | SRI 子资源完整性（审计确认 + 断言固化） | P1 | **本轮可执行** |
| P1P2-05 | P1-6 | CSP report 端点（自建 /api/csp-report） | P1 | **本轮可执行**（自建路线）；Sentry 需用户操作 |
| P1P2-06 | P2-7 | WebP 图片转换 | P2 | **需评估**（结论：倾向不做，无位图） |
| P1P2-07 | P2-7 | 图片 CDN（Vercel Image Optimization） | P2 | **需评估**（结论：倾向不做） |
| P1P2-08 | P2-7 | 关键 CSS 内联 + 非关键异步 | P2 | **需评估**（与 CSP 冲突） |
| P1P2-09 | P2-7 | JS 代码分割（site.js 拆分按需加载） | P2 | **本轮可执行**（依赖 P1P2-11，建议排后） |
| P1P2-10 | P2-8 | 可访问性 WCAG 2.1 AA（ARIA/键盘/跳转链接/读屏） | P1 | **本轮可执行**（机检部分）；读屏实测需用户/QA |
| P1P2-11 | P2-9 | site.js var→const/let 统一（144 处） | P1 | **本轮可执行**（高回归风险，需严格回归协议） |
| P1P2-12 | P2-9 | 20 个计算器 JS 补 JSDoc | P2 | **本轮可执行**（机械性低风险） |
| P1P2-13 | P2-10 | 测试覆盖（单元/集成/CI/覆盖率≥80%） | P1 | **本轮可执行**（需主理人确认引入 npm 依赖） |

---

## 3. 每项详述

### P1P2-01 现有内容 SEO 优化（P1-4）

- **目标**：全站 184 页已保证 title/description 存在（模板强制），缺的是**质量**——关键词覆盖、长度规范、CTR 吸引力与站内内链。本轮产出"可机检审计 + 重点页人工优化"双轨，不新增内容。
- **范围界定**：脚本批量审计（复用 `scripts/full_seo_audit.py` / `seo_audit.py`，有先例）覆盖全站；人工/AI 文案优化聚焦**重点页**（首页、43 工具页、Top 博客，优先 4 个新工具页 + 已上线 password-strength），不做全站逐页手改。
- **用户故事**：作为站长，我希望搜索用户看到精准且有吸引力的标题/摘要，以提高 CTR 与收录质量。
- **验收标准（可测）**：
  1. 审计脚本输出报告：title 长度 30-60 字符、description 长度 50-160 字符、重复 title = 0；
  2. 重点页（首页 + 全部工具页）title/description 优化后长度达标、无重复、无占位符文案；
  3. 每个工具页 ≥3 条站内内链（相关工具/相关博客），由 check-links.js 通过；
  4. verify-site 新增/复用断言：全站 title/description 存在率 100%、重复 title 0，全绿。
- **优先级**：P0（配合 P1P2-03 新工具页，一起做最省力）。
- **依赖**：无。
- **标记**：本轮可执行。脚本审计由工程师做；重点页文案由 PM/工程师产出（AI 辅助 + 人工校验）。

---

### P1P2-02 Google News 提交评估（P1-4）

- **目标**：判定 calc-tools.top 是否符合 Google News 收录条件，并给出明确结论与替代方案。
- **范围界定**：只做**评估 + 结论**，不默认提交。Google News 面向新闻媒体/持续发布时效性新闻的站点；本工具站 + 80 篇工具向博客大概率**不符合 news 内容政策**。替代方案：Google Discover 优化、常规索引（已做 sitemap）、News 类结构化数据评估。
- **验收标准（可测）**：
  1. 产出《Google News 资格评估》结论文档（≤1 页）：基于站点内容类型、发布频率、NewsArticle 结构化数据有无；
  2. 明确结论：「不满足→不做」或「满足→给出提交步骤（用户操作）」。
- **优先级**：P2。
- **依赖**：需用户确认是否投入 Publisher Center 提交流程。
- **标记**：**需评估**；若决定提交，则**需用户操作**（登录 Google Publisher Center）。

---

### P1P2-03 新工具 ×4（P1-5）

- **目标**：新增 3 个全新工具 + 升级 1 个已有工具，全部达到 password-strength 交付标杆（核心 JS 与 UI JS 分离、双语、JSON-LD、like-btn、site.js 注册、sitemap、正文 ≥300 词）。
- **范围界定**（关键决策）：
  - **颜色对比度检查器（color-contrast）**：全新，WCAG 对比度计算（相对亮度公式），输出 AA/AAA 通过状态与建议；与 P1P2-10 可访问性联动。
  - **JSON 格式化工具（json-formatter）**：**已存在** `/zh/text/json-formatter` + `js/text-tools/json-formatter.js` + site.js 已注册 + 已有 `formatJSON` 纯函数。本轮建议**升级现有页**（补 ≥300 词正文、JSON-LD、like-btn、双语完善、错误定位增强），**不新建重复页**。
  - **正则表达式测试器（regex-tester）**：全新，实时匹配高亮 + 分组/标记说明；**倾向本地实现，不引入第三方库**（避免 CSP 白名单扩张）。
  - **Markdown 预览器（markdown-preview）**：全新，编辑器 + 实时预览；**倾向本地轻量解析**（基础语法子集），若用第三方库需先评估 CSP script-src 白名单（可加 cdn.jsdelivr.net 固定版本 + SRI）。
- **用户故事**：作为开发者/设计者，我希望快速完成文本/配色/正则校验，不需要安装软件、不上传数据到服务器。
- **验收标准（可测，每工具）**：
  1. zh/en 双页面存在，lang 正确，canonical + hreflang（zh-CN/en/x-default）完整，check-links 通过；
  2. `js/calculators/<id>.js`（核心纯函数，暴露 window）与 `<id>-ui.js`（DOM 交互）分离；无内联 script/事件（CSP 断言保持 0）；
  3. JSON-LD ≥2 块（BreadcrumbList + SoftwareApplication），`check-jsonld.mjs` 5 项断言通过；
  4. like-btn（`data-tool-id`）存在，like.js 初始化正常；
  5. site.js `SITE_CONFIG.tools` + `TOOLS_DATA` + `TOOL_KEYWORDS_ZH` 注册，首页工具网格可见；
  6. 正文 ≥300 词（`measure-content.mjs` 验证）；sitemap.xml 新增 8 条 URL（4 工具 × 2 语言）；
  7. 核心函数有单元测试 ≥5 用例（联动 P1P2-13）。
- **优先级**：P0。
- **依赖**：P1P2-13（测试）、P1P2-01（SEO 文案）。
- **标记**：本轮可执行。**待确认**：json-formatter 按"升级"还是"跳过"（见待确认问题 1）。

---

### P1P2-04 SRI 子资源完整性（P1-6）

- **目标**：确认并固化第三方脚本 SRI，防止 CDN 供应链篡改。
- **范围界定**：审计发现 `Chart.js@4.4.9`（mortgage/housing-fund/bmi/tax2026 等）与 `qrcodejs@1.0.0`（qr-generator）**已带 integrity(sha384)+crossorigin="anonymous"**，SRI 主体完成。本轮 = 全站第三方 script 审计（确认无遗漏）+ verify-site 新增断言 + 文档记录 AdSense/GA4 不适用的原因（Google 动态脚本哈希不稳定，加 SRI 会导致加载失败）。
- **验收标准（可测）**：
  1. verify-site 新增 [12] SRI 断言：dist 中所有 `src` 含 `cdn.jsdelivr.net` 的 `<script>` 均带非空 `integrity` 且 `crossorigin="anonymous"`；全绿；
  2. 审计结果：除 jsdelivr 固定版本外无其他可加 SRI 的第三方脚本；
  3. 文档记录结论（AdSense/GA4 不适用 SRI 的原因）。
- **优先级**：P1。
- **依赖**：无。
- **标记**：本轮可执行（工作量小，审计 + 一条断言）。

---

### P1P2-05 CSP report 端点（P1-6）

- **目标**：让 CSP 违规可观测，避免策略误伤后无人知晓（呼应 08-23 hidden-class 事故教训）。
- **范围界定**：两条路线——
  - **A（本轮默认）**：自建 Vercel Serverless 端点 `api/csp-report.js`（沿用 api/ 目录与 allowed-ids 模式），接收 `application/csp-report` POST，返回 204，仅记录结构化摘要（不落盘敏感数据）；vercel.json CSP 头加 `report-uri /api/csp-report`。
  - **B（需用户操作）**：Sentry 托管，需用户注册账号并配置 DSN；本轮只给接入评估，不实施。
- **验收标准（可测）**：
  1. `api/csp-report` 端点存在，POST 返回 204，非法 body 返回 400；
  2. vercel.json CSP 头含 `report-uri /api/csp-report`，且现有 verify-site 9 项 CSP 断言保持全绿；
  3. 人工验证：触发一次 CSP violation（浏览器控制台）可在 Vercel 日志看到请求到达。
- **优先级**：P1。
- **依赖**：无。
- **标记**：本轮可执行（A 路线）；Sentry（B 路线）需用户操作。

---

### P1P2-06 WebP 图片转换（P2-7）

- **目标**：压缩图片体积。**审计结论：站点图片全部为 SVG（assets 仅 favicon.svg/logo.svg/logo-h.svg），无 PNG/JPG，WebP 转换无目标文件。**
- **范围界定**：不实施转换，改为"图片策略确认"：记录 SVG 已是最优；为未来新增位图立规范。
- **验收标准（可测）**：
  1. 产出图片资产清单（SVG 3 个 + og:image 引用）确认无位图；
  2. 文档规范：未来引入位图一律 WebP + width/height + loading=lazy（已有 lazy 断言兜底）。
- **优先级**：P2（实为 P3）。
- **标记**：**需评估**，结论倾向不做。

---

### P1P2-07 图片 CDN / Vercel Image Optimization（P2-7）

- **目标**：图片加速。**审计结论：Vercel Image Optimization 主要面向 Next.js（next/image）；纯静态站点需自建 sharp 端点或框架集成，且当前无位图，收益极低。**
- **范围界定**：只产出评估结论；若未来引入位图再启用。
- **验收标准（可测）**：评估文档明确"是否启用 / 启用方式 / 成本影响"，结论记录到 deliverables。
- **优先级**：P2。
- **标记**：**需评估**，结论倾向不做。

---

### P1P2-08 关键 CSS 内联 + 非关键异步（P2-7）

- **目标**：降低首屏渲染阻塞（style.css 压缩后 ~65KB）。
- **范围界定**：拆 critical.css（首屏）内联 `<style>` + 非关键 async。**冲突点：vercel.json CSP `style-src` 无 'unsafe-inline'，内联 `<style>` 会被浏览器阻止**。方案 A：构建时计算 critical CSS 的 sha256 hash 加入 CSP（保持无 unsafe-inline，但 vercel.json 静态 hash 需随构建维护）；方案 B：style-src 加 'unsafe-inline'（弱化策略，不推荐）。若方案 A 工作量过大，本轮暂缓为"方案设计 + Lighthouse 基线"。
- **验收标准（可测）**：
  1. 若执行：Lighthouse Performance ≥90（移动端）；verify-site CSP 断言保持全绿（style-src 无 unsafe-inline 或仅精确 hash）；
  2. 若暂缓：产出拆分策略 + CSP hash 方案文档。
- **优先级**：P2。
- **依赖**：需架构师权衡（见待确认问题 5）。
- **标记**：**需评估**。

---

### P1P2-09 JS 代码分割（P2-7）

- **目标**：减少工具页无效 JS 传输（site.js 全站加载，含首页专用逻辑）。
- **范围界定**：拆分 site.js → `site-core.js`（全站必需：语言/主题/like 委托）+ `site-home.js`（首页专用：hot-tools 评分、分类筛选、博客分页、搜索热词）。同步扩展 build.mjs `ASSET_RE`（当前仅匹配 site|like|i18n.js，需加 site-core/site-home）与版本注入。工具页只引 site-core。
- **验收标准（可测）**：
  1. 首页引用 site-core+site-home；工具页仅 site-core（可机检 dist HTML script 标签）；
  2. verify-site 全绿；首页 + 3 个代表工具页浏览器冒烟无 JS 报错（控制台 0 error）；
  3. 新工具页 JS 天然按需（仅工具页引用 calculators/*.js）。
- **优先级**：P2。
- **依赖**：P1P2-11（var 重构）完成后执行，降低回归叠加。
- **标记**：本轮可执行（建议排在本轮后段）。

---

### P1P2-10 可访问性 WCAG 2.1 AA（P2-8）

- **目标**：达成 WCAG 2.1 AA 基线，重点覆盖可机检项。
- **范围界定**（4 子项）：
  - a) **跳过导航链接**：修改 `includes/header-{zh,en}.html` 模板首元素加 `<a class="skip-link" href="#main">`，`<main>` 加 `id="main"`；模板改动自动传播全站（verify-site 字节一致性随模板更新）。注意 184 页 `<main>` 需统一补 id。
  - b) **ARIA 审计**：表单控件 label 完整性、按钮可访问名（theme-toggle/back-to-top 已有 aria-label，补缺口）；新增 verify-site 断言。
  - c) **键盘导航**：skip-link 聚焦态可见、`:focus-visible` 样式、cmp 横幅焦点管理。
  - d) **读屏实测**：NVDA/VoiceOver 人工或 QA 操作（可配合 Playwright role/label 断言做基础自动项）。
- **验收标准（可测）**：
  1. verify-site 新增断言：每页存在 `<main id="main">` + skip-link；dist 无「无关联 label 的 input/select」；所有 button 有可访问名；全绿；
  2. CSS 含 `:focus-visible` 可见焦点样式；
  3. 读屏测试报告（人工，1 页：首页 + 1 工具页 + 1 博客页）。
- **优先级**：P1。
- **依赖**：无。
- **标记**：本轮可执行（a/b/c 机检部分）；读屏实测（d）需用户/QA 操作。

---

### P1P2-11 site.js var→const/let 统一（P2-9）

- **目标**：消除 144 处 `var`（待办写 143，实际 grep 144，以 144 为准），提升代码质量与可维护性。
- **范围界定**：仅 `js/site.js`（不动其他文件）；**不改变任何行为语义**——var 的函数级提升与重复声明在 const/let 下会报错，需逐处确认无 hoisting 依赖。执行策略：**分 3 批（每批 ~50 处）→ 每批跑 verify-site + 浏览器冒烟**；可加 `scripts/check-no-var.mjs` 或 verify-site 新断言兜底。
- **验收标准（可测）**：
  1. `js/site.js` 中 `var ` 计数 = 0（grep/脚本断言）；
  2. verify-site 全绿；
  3. 浏览器冒烟：首页（分类筛选/搜索/热门工具/点赞）、1 博客页、3 工具页控制台 0 error、核心功能可用；
  4. window 暴露的函数名与签名不变（无 API 破坏）。
- **优先级**：P1。
- **依赖**：无（但建议先于 P1P2-09 与 P1P2-13 执行）。
- **标记**：本轮可执行（**高回归风险**，需主理人确认分批次节奏，见待确认问题 3）。

---

### P1P2-12 20 个计算器 JS 补 JSDoc（P2-9）

- **目标**：补齐计算器核心函数文档，降低维护成本。
- **范围界定**：审计 `js/calculators/` 24 个文件，5 个已有 JSDoc（housing-fund/mortgage/password-strength/password-strength-ui/tax2026），**19 个缺失**（与待办「20 个」基本吻合，以实际缺失为准）。本轮为缺失文件补文件级 + 函数级 JSDoc（@param/@returns/@throws），**不改逻辑**。
- **验收标准（可测）**：
  1. `js/calculators/*.js` 每个顶层函数均有 JSDoc 块（可加 `scripts/check-jsdoc.mjs` 或 grep 抽查）；
  2. verify-site 全绿；抽样 3 个工具冒烟无回归。
- **优先级**：P2。
- **依赖**：无。
- **标记**：本轮可执行（机械性，低风险）。

---

### P1P2-13 测试覆盖（P2-10）

- **目标**：核心函数单元测试 + 关键路径集成测试 + CI 自动化 + 覆盖率 ≥80%。
- **范围界定**：
  - a) **单元测试框架**：推荐 **Vitest**——理由：ESM 原生、近零配置、内置 v8 coverage、对"IIFE 暴露 window 函数"的纯逻辑脚本可用 happy-dom/jsdom shim 或直接测 window 函数；Jest 需额外 transform 配置且对浏览器脚本不友好。**备选**：延续现有零依赖 `node --test`（js/test/like.test.js、api/test/clicks.test.js、likes.test.js 已有先例）+ `--test-coverage`（Node v22 支持）。**二选一需主理人/架构师拍板**。
  - b) **覆盖目标**：4 个新工具核心函数（必测）+ 现有纯函数抽样（formatJSON、checkPasswordStrength、date-calc 等）→ 被测函数集语句覆盖率 ≥80%。
  - c) **集成测试**：Playwright（chromium 冒烟：首页搜索、4 新工具交互、like 点击）——本轮可拆为可选，若引入依赖量大则下轮。
  - d) **CI/CD**：`.github/workflows/ci.yml`，push 触发：verify-site + 单元测试 + 覆盖率阈值（+ 可选 Playwright）。Vercel 部署链路不变（git push 自动部署）。
  - **注意**：引入 package.json + npm 依赖后，Vercel 构建会自动执行 npm install（build 时间略增，无功能影响），需主理人确认接受。
- **验收标准（可测）**：
  1. 新工具每个核心函数 ≥5 测试用例；单元测试全部通过；
  2. 覆盖率报告 ≥80%（Vitest coverage 或 node --test-coverage）；
  3. CI 工作流存在，push 后 GitHub Actions 全绿；
  4. verify-site 仍全绿（CI 内包含）。
- **优先级**：P1。
- **依赖**：P1P2-03（新工具函数可测）、主理人确认引入 npm 依赖（见待确认问题 2）。
- **标记**：本轮可执行（框架选择与依赖引入需确认）；Playwright 集成测试可拆为下一轮。

---

## 4. 待确认问题清单（≤5）

1. **JSON 格式化工具范围**：`/zh/text/json-formatter` + `js/text-tools/json-formatter.js` + site.js 注册均已存在（有 formatJSON 纯函数、有页面）。本次按「升级现有页至新规范（正文/JSON-LD/like-btn/双语）」还是「跳过该项」？（影响 P1P2-03 工作量与验收）
2. **测试框架与依赖**：项目当前**无 package.json**，已用零依赖 `node --test`（like/api 测试先例）。P2-10 是否接受引入 npm 依赖（Vitest；Playwright 可选）？若接受，推荐 Vitest；若不接受，延续 node --test + --test-coverage，验收标准不变。
3. **var 重构节奏**：site.js 144 处 var 重构曾标记暂缓（回归风险）。是否接受「分 3 批 + 每批 verify-site/浏览器冒烟」的本轮执行方式？还是继续暂缓？
4. **关键 CSS 内联与 CSP 冲突**：是否接受「style-src 加 critical CSS sha256 hash」方案（保持无 unsafe-inline，但 vercel.json 需随构建维护 hash）？若维护成本不可接受，P1P2-08 暂缓为方案设计。
5. **增长规划文档缺失**：`deliverables/2026-08-18-增长规划.md` 未找到，P1-4 范围已按 todo-list Phase 1 描述界定（SEO 优化 + Google News 评估）。是否需要主理人补文档，或按本 PRD 范围执行？
