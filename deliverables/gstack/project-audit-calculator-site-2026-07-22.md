# calculator-site 全站审查报告（功能 / 代码 / 设计 / 健康）

**日期**：2026-07-22
**场景**：全站审查（产品评审 + 代码审查 + 设计审查 + 健康检查）
**参与成员**：产品评审员（gstack-product-reviewer） + 排障手（gstack-investigator） + 设计顾问（gstack-designer）
**代码基线**：HEAD = `6848c44`（已从 origin/main 拉取最新；本地未推送的乱码修复提交已备份于分支 `backup-pre-pull`）

---

## 📌 TL;DR（执行摘要）

- **整体结论**：🔴 **No-Go（推广/上线新功能前需先消除 P0 阻断项）**。站点功能基本可用、无死链、无 JS 运行时错误，但存在多个会直接拖累收录与体验的 P0 缺陷。
- **阻塞项数量（P0）**：5 类 —— ① 英文首页 `en/index.html` 为空（0 字节）② 9 个 JSON-LD 解析失败 ③ sitemap 含 10 个 `/index` 幽灵 URL ④ sitemap 博客 hreflang 全部自引用 ⑤ 用户可见正文乱码（404 页、首页链接）。
- **GSC 仅收录 ~4/166 页的根因**：近期乱码修复后 Google 需重新爬取（时间因素）+ 确定性 sitemap 缺陷（/index 幽灵 URL、hreflang 自引用）+ 9 个破裂 JSON-LD + 缺 www 重定向；**内链其实很扎实（首页 83 个唯一内链全覆盖），"爬不到"不是主因**。
- **下一步**：先修 `generate-sitemap.ps1` 与 `inject-seo-tags.ps1` 两个根因脚本并重生成/重注入，再全站（含 en）清乱码，然后 GSC 重交 sitemap + 请求建索引。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🔴 No-Go（存在 P0 阻断项，需先修复再放量推广） |
| 严重度分布 | 🔴 P0 ×5 类 / 🟠 P1 ×10 / 🟡 P2 ×7（去重后） |
| 关键行动项 | 8 条（见行动清单） |
| 建议负责人 | 工程（脚本/SEO/服务端）+ 设计（设计系统统一）+ 合规（AdSense/GDPR） |
| 功能可用性 | ✅ 72 工具页中 71 个正确接线（keyword-density 为有意合并弃用页）；0 死链；0 JS 运行时错误 |
| 编码状态 | ⚠️ 真性乱码 ≥14 文件（自动化扫描）+ 人工确认 en/text/json-formatter.html、zh/text/keyword-density.html 亦含乱码（自动化扫描可能漏检，见局限） |

---

## 1. 各成员核心结论

### 🔍 产品评审员（产品评审 + 代码审查）
- **核心判断**：站点**功能基本可用、导航覆盖完整、内部链接扎实**；无 CRITICAL 级安全漏洞。索引瓶颈的根因是 `scripts/generate-sitemap.ps1` 两处确定性 bug（`/index` 幽灵 URL、blog hreflang 自引用）+ 9 个页面 JSON-LD 损坏 + 缺 www 重定向。代码审查发现服务端函数有速率限制失效、批量枚举 N+1、写操作非标准等 WARNING 级问题，以及 AdSense 与 Cookie 同意逻辑冲突。
- **关键建议**：优先修两个生成脚本并重交 sitemap；修复 JSON-LD 转义；补 www 重定向；服务端改 POST + 共享限速；模板层一次性补闭合标签。

### 🔧 排障手（健康检查 + 编码回归）
- **核心判断**：**0 死链、0 JS 运行时错误、vercel.json 重定向正确、sitemap URL 与实际页面一致**。但发现 1 个最严重 P0——`en/index.html` 为 0 字节空文件，英文首页渲染空白；9 个 JSON-LD 块解析失败（类 A `@graph": <` 占位符泄漏、类 B 插值未 JSON 转义）；真性乱码 14 文件（用户可见 2 处 + SEO 元数据 12 处），U+FFFD 0 处，且乱码集中在 zh 侧（自动化扫描判定 en 未波及）。
- **关键建议**：立即恢复英文首页并加 CI 非空校验；本周修 9 个 JSON-LD；本周修 2 处可见乱码；两周内修 12 文件 meta 乱码并排查 zh 生成管线根因 + 加 CI 乱码检测。

### 🎨 设计顾问（视觉 / 设计系统一致性）
- **核心判断**：最近「design unification」方向正确（已建 `style.css` token 体系 + 统一页头控件），但**执行不完整**——全站并存两套设计语言（`style.css` 品牌 token vs `site.css` 硬编码 Tailwind 灰蓝）、浮动控件与既有系统割裂、图片工具页缺暗色覆盖、主题切换入口仅在 `index.html` 存在。本报告**不通过**，需修复后方可视为统一。另确认英文首页空白、404/部分页乱码回归、en 工具页已渗入乱码。
- **关键建议**：合并双 CSS 为单一 token 源；浮动控件收敛到 `.theme-toggle`/`.lang-switch` 类；补全图片工具页 `[data-theme=dark]`；清理 `cookie-consent.css` 畸形 `:root`；404 按钮配色对齐品牌蓝。

> 三位成员均**未修改任何文件**，仅做只读审查。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🔴 P0 | 功能 | `en/index.html` | 0 字节空文件，`switchLang('en')` 跳 `/en` 后英文用户看到空白首页 | 重建英文首页（复用 `index.html` 模板 + 英文 data-i18n 文案），加 CI 校验 HTML 非空+含 lang/viewport | 设计 / 排障 |
| 2 | 🔴 P0 | SEO | `scripts/generate-sitemap.ps1:96` | sitemap 含 10 个 `/index` 幽灵 URL，与 canonical(`/`) 冲突 → "提交的 URL 未被选为规范版本" | `$cleanPath` 对 `index.html` 归一为根路径 `""` 而非 `"index"` | 产品 |
| 3 | 🔴 P0 | SEO | `scripts/generate-sitemap.ps1:47-66` | blog hreflang 自引用：en/zh-CN/x-default 三个 alternate 全指向同一 URL（76 条 blog 全部如此）→ Google 忽略全部 hreflang | 修正分支顺序（`^blog/en/` 分支须先于 `^en/` 分支） | 产品 |
| 4 | 🔴 P0 | SEO | `en/text/{json-formatter,reading-time,text-cleaner,text-diff,word-counter}.html`、`zh/en/calculators/{age-calc,date-calc}.html` | 9 个 JSON-LD 块解析失败：类 A `@graph": <`/`>` 占位符泄漏（age-calc）；类 B 插值未 JSON 转义（标题含 `"` 破坏 JSON） | 类 A `<`→`[` `>`→`]`；类 B 注入用 `JSON.stringify` 转义；修 `inject-seo-tags.ps1:117-119,142-144` | 产品 / 排障 |
| 5 | 🔴 P0 | 编码 | `404.html`、`zh/index.html` | 用户可见正文乱码：`404.html` h1/描述/按钮整段乱码（`妞ょ敻娼伴張顏呭閸?`）；`zh/index.html` 链接文本乱码 | 重存 UTF-8 清除乱码 | 设计 / 排障 |
| 6 | 🟠 P1 | 编码 | 12 个博客/法务页 HEAD（如 `blog/zh/{equal-installment,housing-fund,tax-deduction}*.html`、`about.html`、`privacy.html` 等） | SEO/社交元数据乱码（SERP/社交卡片乱码，降点击率），共 12 文件 | 全站（含 en）清乱码 + 排查 zh 生成管线根因 | 排障 |
| 7 | 🟠 P1 | 编码 | `en/text/json-formatter.html`、`zh/text/keyword-density.html` | **人工确认**含乱码（`鉂?`/`鈿?`/`鈥?`、`閸`/`鐐` 标记），自动化扫描可能漏检（见局限） | 纳入编码回归范围一并修复 | 设计 / 产品 |
| 8 | 🟠 P1 | SEO | `vercel.json` | 缺 non-www→www 的 301 重定向，canonical=www 但两域名均出内容 → 重复内容信号 | 增加 301 重定向规则 | 产品 |
| 9 | 🟠 P1 | 合规 | 全页 `<head>` + `js/cookie-consent.js` | AdSense 静态脚本在 Cookie 同意前即加载执行，与"拒绝即不加载"冲突 → GDPR/CCPA 缺口 | 移除静态 `adsbygoogle` 标签，改为仅同意后由 `loadAdSense()` 注入 | 产品 / 排障 |
| 10 | 🟠 P1 | UX | 全站子页（工具页/博客页/分类页） | 主题切换入口仅在 `index.html` 存在，子页页头只有语言切换、无主题切换 → 用户无法在子页切明暗 | 将 `#theme-toggle` 注入所有页头，或全局浮动 `gw-theme` 到全站，删除两套实现仅留一套 | 设计 |
| 11 | 🟠 P1 | 设计 | `css/style.css` vs `css/site.css` | 双设计语言：品牌 token（#007AFF 等）与硬编码 Tailwind 灰蓝（#94a3b8/#1f2937/#f43f5e 等）并存，暗色模式暴露差异 | 以 `style.css` token 为准，替换 `site.css` 硬编码色；合并为单一设计源 | 设计 |
| 12 | 🟠 P1 | 设计 | `css/site.css:.upload-zone/.tool-controls/.control-group/.section-divider h2` | 图片工具页/分区标题用硬编码 `#fff`/`#1f2937` 且**无 `[data-theme="dark"]` 覆盖** → 暗色模式下卡片变白、文字近不可见 | 补全暗色覆盖 | 设计 |
| 13 | 🟠 P1 | 设计 | `about/contact/privacy/404.html` 浮动 `gw-lang`/`gw-theme` | 浮动控件 z-index:9999 遮挡 sticky 页头右侧导航；国旗 emoji 错写为 `🇳`（应为 `🇨🇳`）；无移动端媒体查询；内联硬编码样式与 `.theme-toggle` 脱节 | 收敛到 `.theme-toggle`/`.lang-switch` 类（36px、`var(--border)`、hover primary、加焦点环），修正国旗，加 @media | 设计 |
| 14 | 🟠 P1 | 后端 | `api/clicks.js`、`api/likes.js` | 速率限制用模块级 `Map`（Serverless 多实例不共享、冷启动重置→可绕过）；`GET /api/clicks`（无 toolId）遍历全部 key 并逐条 KV GET（N+1 + 全量数据泄露）；写操作硬编码 `method:'GET'` 非标准 | 限速改 KV/边缘共享；移除无参批量端点或加分页；写操作用 POST + JSON body | 产品 |
| 15 | 🟠 P1 | 设计 | `css/cookie-consent.css:101-181` | 文件末尾含畸形孤立 `:root` token 块（自定义属性写在选择器之外）→ CSS 解析忽略，死代码/语法错误 | 清理，补 `:root{` 包裹或删除 | 设计 |
| 16 | 🟠 P1 | 设计 | `404.html:44,46-48` | 404 按钮用靛蓝渐变 `#4f46e5/#6366f1`，偏离全站品牌蓝 `#007AFF` | 改为 `.btn-primary` 同色 | 设计 |
| 17 | 🟡 P2 | HTML | `en/text/{reading-time,text-cleaner,text-diff,url-encode,word-counter}.html:68`；同批 `:57/58`；`index.html:45-47` | 未闭合标签：heart `<span>` 缺 `</`（渲染字面「❤/span> 0」）、zh `<option>` 缺 `/`、theme-toggle `<button>` 缺 `</button>`（同源模板 bug，改一处修 5 页） | 模板层一次性补闭合 | 设计 / 产品 |
| 18 | 🟡 P2 | 安全 | `vercel.json` CSP | CSP 为 `Report-Only` + 允许 `unsafe-inline` → 实际零 XSS 防护 | 改 enforce 并去 unsafe-inline | 产品 |
| 19 | 🟡 P2 | 安全 | `api/clicks.js`、`api/likes.js` CORS | 生产 CORS 白名单含 `http://localhost:3000/5173` | 生产环境移除 localhost | 产品 |
| 20 | 🟡 P2 | 性能 | `index.html:13-17` 等 | 渲染阻塞 CSS 未合并/关键化（脚本均 defer，无阻塞 JS，此为 CSS 项） | 合并/关键化/异步 CSS | 产品 |
| 21 | 🟡 P2 | 代码卫生 | `js/api-client.js`（注释 `// ?? GET/POST` 乱码）、`js/image-tools/compress.js:134-135,153-154` | 死代码/乱码注释；compress.js 冗余赋值；`toBlob` 失败静默 return 无提示 | 清死代码、删冗余、失败给提示 | 产品 |
| 22 | 🟡 P2 | 杂项 | 各页 CSS 加载顺序/m3 缓存串/m2 z-index 冲突 | 加载顺序相反（m1）、缓存破坏查询串散乱（m3）、cookie 横幅与浮动按钮同 z-index:9999（m2） | 统一加载顺序与版本策略；避让 z-index | 设计 |

---

## ✅ 行动清单（至少 3 条具体可执行项）

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | **重建 `en/index.html` 英文首页**：复用 `index.html` 模板 + 英文 `data-i18n` 文案，校验 `switchLang('en')` 落地；加 CI 校验「HTML 非空 + 含 lang/viewport」 | 前端/产品 | P0 | 本周 |
| 2 | **修 `scripts/generate-sitemap.ps1`**：`index.html`→根路径（消除 `/index` 幽灵 URL）；blog hreflang 分支顺序前置（消除 76 条自引用）；重生成 `sitemap.xml` 并在 GSC 重交 + 请求建索引 | 工程 | P0 | 本周 |
| 3 | **修 `scripts/inject-seo-tags.ps1` 并对 9 页重注入**：JSON-LD 注入做 `JSON.stringify` 转义；单独修 `age-calc` 的 `@graph": <`→`[`；使 9 个失败块归零 | 工程 | P0 | 本周 |
| 4 | **全站（含 en）编码回归**：重存 UTF-8 清除 `鉂/鈿/鈥/閸/鐐/妞ょ` 等乱码，重点 `404.html`、`zh/index.html`、`en/text/json-formatter.html`、`zh/text/keyword-density.html`；升级检测脚本（U+FFFD/PUA/oracle 全 CJK 跑，勿只扫标记字） | 工程 | P0→P1 | 两周 |
| 5 | **SEO/合规收口**：`vercel.json` 增加 non-www→www 301；AdSense 改为仅 Cookie 同意后注入（移除静态 `adsbygoogle` 标签） | 工程/合规 | P1 | 两周 |
| 6 | **设计系统统一**：合并 `style.css`/`site.css` 为单一 token 源；补全图片工具页 `[data-theme=dark]` 覆盖；浮动控件收敛到 `.theme-toggle`/`.lang-switch` 类并修国旗 `🇨🇳`+@media；清理 `cookie-consent.css` 畸形 `:root`；404 按钮对齐品牌蓝 | 设计 | P1 | 两周 |
| 7 | **服务端加固**：限速改共享存储（KV/边缘）；`GET /api/clicks` 强制 toolId 防枚举；写操作改 POST + JSON body | 工程 | P1 | 两周 |
| 8 | **模板层与卫生收尾**：一次性补闭合标签（heart span/option/theme-toggle button）；CSP 改 enforce 去 unsafe-inline；prod 去 localhost CORS；清死代码/乱码注释 | 工程 | P2 | 后续 |

---

## ⚠️ 待完善 / 已知局限

- **乱码计数存在检测口径差异**：排障手自动化扫描判定「14 文件（2 可见 + 12 元数据），en 未波及」；但设计顾问与产品评审员**人工读文件确认** `en/text/json-formatter.html`（鉂?/鈿?/鈥?）与 `zh/text/keyword-density.html`（閸/鐐）亦含真性乱码。原因：自动化启发式（片假名/PUA 夹中文 + oracle）对 `鉂/鈿/鈥/閸/鐐` 这类"本身即合法 CJK/生僻字"的乱码 artifact 不敏感。→ **编码回归范围必须显式纳入 en 工具页**，且检测脚本应升级为"对所有 CJK run 跑 `encode('gbk').decode('utf-8')` oracle + 扫描 U+FFFD/PUA"，而非仅扫标记字。
- **产品评审员的一次"重新激活子任务"被取消（499 canceled）**，但其主报告与两份补充修正（ADD-1/ADD-2/汇总）此前已成功回传，内容完整、无丢失，不影响本汇编。
- **知识库未交叉核对**：用户提供的 `D:\BaiduSyncdisk\_ObsidianVault\02-个人项目\projects\2_AI建站项目` 本次仅作背景参考，未读取其中可能的项目规格/需求文档；如需以规格为基准做"需求符合度"审查，可作为后续任务。
- **历史本地提交已保护**：本次 `git reset --hard origin/main` 前已将未推送的本地乱码修复提交 `1efe0d7` 备份至分支 `backup-pre-pull`，如需回退可随时恢复。
- 排障手另存了一份独立健康报告：`C:/Users/zhaoxin/calculator_site_health_report.md`（仅供参考，非本交付物）。

---

## 📚 成员产出索引

- gstack-product-reviewer（产品评审员）原始产出：功能/SEO/代码审查主报告 + ADD-1/ADD-2 补充 + 汇总报告（含 JS 运行时抽查、合并问题登记表、GSC 诊断）。核心结论：功能可用、导航完整、索引瓶颈根因为 sitemap 两脚本 bug + 9 JSON-LD 破裂 + 缺 www 重定向。
- gstack-investigator（排障手）原始产出：健康检查完整报告（已另存 `C:/Users/zhaoxin/calculator_site_health_report.md`）。核心结论：0 死链、0 JS 错误；P0 = 英文首页空白 + 9 JSON-LD 失败 + 14 文件乱码。
- gstack-designer（设计顾问）原始产出：设计系统一致性审计报告 + 补遗(一)(二)。核心结论：双 CSS 并存、浮动控件割裂、暗色缺口、主题切换入口缺失、英文首页空白、乱码扩散至 en 页。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
