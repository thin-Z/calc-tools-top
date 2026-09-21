# calc-tools.top — 在线工具箱

免费在线工具站（计算器 / 图片 / 文字工具 + 中英双语博客）。纯静态站点托管在 Vercel，点赞/点击计数通过 Vercel Serverless Function + Upstash Redis（Vercel KV）实现。

## 技术栈与结构

| 部分 | 说明 |
|------|------|
| 前端 | 纯静态 HTML/CSS/JS（无框架），`zh/`、`en/` 双语，`blog/` 博客（**dist 222 页**（实测 2026-09-16）；**51 工具 ×2 语言 = 102 工具页**，栏目分布 `calculators 28 / image 8 / text 15`（`tools.json` 的 `dir` 已与语义分类对齐），其中 4 个 stub 存根工具（discount / age-calc / password-strength / keyword-density）共 8 页 noindex → sitemap 工具 URL 94；+ 80 博客 + 16 标签聚合页 + 结构页/首页；sitemap 总 210 条。**滚动数字以 vault `.workbuddy/memory/todo-list.md` 基准行为唯一事实源**） |
| 构建 | Vercel `buildCommand = node scripts/build.mjs`，`outputDirectory = dist`（复制站点 → GA4/AdSense 注入 → 版本号 → 卫生转换 → CSS 压缩 → CMP 横幅） |
| API | `api/likes.js`（点赞）、`api/clicks.js`（点击），Node Serverless Function |
| 存储 | **Vercel KV（Upstash Redis）**，点赞/点击计数 + 限速/防刷均存于此 |
| 广告 | AdSense Auto Ads，client ID 单一来源 `includes/adsense-head.html`，构建期注入全站 |
| 分析 | GA4 `G-B61D908J5F`（`includes/adsense-head.html` 单一来源，构建期剥离占位符守卫） |
| 安全 | **CSP 全站硬化**：script-src / style-src 无 `unsafe-inline`（`js/csp-events.js` 委托层 + `js/inline/*.js` 外链化），img-src 白名单化；`verify-site.mjs` 34 项断言守护 |
| 竞品迭代（08-25） | **URL 参数预填**（`js/url-state.js`，计算器工具页带参直达/刷新保留/输入同步）、**打印样式**（`@media print` 隐藏导航广告）、**mortgage 输入扩展**（房产税/保险/PMI/额外还款）、**相关工具强化**（`scripts/strengthen-related-links.mjs`）、**标签聚合落地页**（`scripts/generate-tag-pages.mjs`，8 分类 × zh/en = 16 页，工具+文章聚合 + JSON-LD + hreflang） |
| 首页区块与栏目页筛选（09-16） | 首页 6 区块（财务计算 / 健康计算 / 生活·出行 / 实用工具 / 图片工具 / 文字工具）的「查看全部」跳栏目页并携带 **`?cat=<区块>`**（image / text 整页即该分类，不带参），由 `js/category-filter.js` 消费：按 chip 上 `data-category` 声明的**区块 tag 集合**过滤（life 区块 = `life,travel`、finance = `finance,shopping`，**不可只按单 tag 筛**），同步 chip 高亮 / 计数文案 / URL。⚠️ **区块↔分类映射的单一数据源 = `scripts/lib/tool-card.mjs`（`CATEGORY_SECTION` / `SECTION_ORDER` / `SECTION_TITLES` / `sectionTags()` / `toolInSection()`），首页与栏目页共用，禁止各写一份**；⚠️ 工具的 `dir`（URL 栏目）与 `categories`（语义标签）必须对齐，错位会让同批工具被拆到两个栏目页（09-16 已归位 4 个工具） |

## 环境变量（Vercel 项目 Settings → Environment Variables）

点赞/点击 API 依赖以下 KV 变量（创建 Vercel Storage → KV 数据库并绑定项目后自动注入，或手动从 Upstash 控制台复制）：

```
KV_REST_API_URL=https://<endpoint>.upstash.io
KV_REST_API_TOKEN=<主 Token，写权限>
KV_REST_API_READ_ONLY_TOKEN=<只读 Token>
KV_URL / KV_REDIS_URL
```

⚠️ **关键**：`KV_REST_API_TOKEN` 必须是**主 Token（写权限）**，不能用 READONLY Token。若只读 Token 被误配，API 的 INCRBY 会静默失败、计数恒为 0（2026-08-17 已踩坑，见 `b15e161`）。

## API 端点

### GET 读
- `GET /api/likes?toolId=<id>` → `{"toolId","count"}`（负数已钳制为 0）
- `GET /api/clicks?toolId=<id>` → `{"toolId","total"}`

### POST 写
- `POST /api/likes` body `{"toolId","action":"like|unlike"}` → `{"toolId","count","liked"}`
- `POST /api/clicks` body `{"toolId"}` → `{"toolId","total"}`（无条件 +1）

写入有白名单（`api/allowed-ids.js`）与防刷（每 IP 每工具每日 5 次操作，超出返回 429）。

### POST 监控上报（Phase 5，轻量观测）
- `POST /api/csp-report` — CSP 违规接收（浏览器 CspReport，204），Vercel 函数日志观测（`api/csp-report.js`）
- `POST /api/error-report` — 前端 JS 错误上报（`js/error-report.js` 捕获 window.onerror/unhandledrejection → 此端点，204），Vercel 函数日志观测（`api/error-report.js`）

> 两者均 origin 白名单 CORS + 60/min 限速 + ≤16KB；仅 console.log 结构化摘要（Vercel 日志即观测面），不落盘敏感数据。

## Upstash REST 调用约定（易错点）

计数/限速/防刷全部通过 Upstash REST API：

| 意图 | 正确调用 | 错误示范 |
|------|----------|----------|
| 增减计数 | `POST /incrby/{key}` body=裸数字（可负） | ❌ `GET /incr/{key}/{delta}`（解析为 `INCR key delta` 报参数错误，计数静默丢失） |
| +1 | `GET /incr/{key}` 亦可 | |
| 读 | `GET /get/{key}` | |
| 过期 | `GET|POST /expire/{key}/{seconds}` | |

测试：`node --test api/test/likes.test.js api/test/clicks.test.js`（内置本地 KV mock，零依赖）。

## 部署

推送 `main` 分支即触发 Vercel 自动部署（`outputDirectory=dist`）。本地验证：`node scripts/build.mjs` 后预览 `dist/`。

## 脚本工具（scripts/）

| 脚本 | 作用 | 用法 |
|------|------|------|
| `build.mjs` | Vercel 构建入口：复制到 `dist/` → 清理旧 cookie-consent → GA4 启用/占位守卫 → 注入 AdSense（单一来源 `includes/adsense-head.html`）→ 注入缓存版本号（`?v=YYYYMMDDHHmm`，仅 dist）→ 卫生转换（去 BOM / charset 置首 / 懒加载 / inline→.hidden）→ CSS 压缩 → CMP 横幅注入 → sprite 内联 → **版本戳兜底补齐（HTML 二次补扫 + `dist/js` 内动态加载字面量打戳，覆盖 CMP 注入的 `/js/cmp.js` 与 JS 懒加载的 `site-home.js`/`brotli-*`）** | `node scripts/build.mjs` |
| `verify-site.mjs` | 集成校验 **34 项断言**：header/footer 字节一致 / JSON-LD（check-jsonld 5 项）/ 静态 AdSense 唯一性 / 断链 / 浮动控件清零 / GA4 ID 不变量 / CSP 无内联脚本 / 无内联事件处理器 / CSP 头无 unsafe-inline / 图片懒加载 / 图片 alt / SRI integrity / a11y（main+skip-link+label）/ SEO 存在率 / site.js 无 var / **首页三源同步（check-home-sync）** / **搜索升级专项（拼音+文章搜索+诚实热搜）** / **搜索升级 Phase C（GA4 零结果+aria-live+EN 关键词）** / **P0 门禁（CSS裸色值+Emoji清零+紫二次色清零）** / **canonical/hreflang 门禁** / **JS 语法门禁** / a11y 全站扫描（#22，需 `E2E_A11Y=1`）/ **工具页模板一致性（#23）** / **重定向门禁（#24）** / **CSP 委托层可达性（#25）** / **文档同步（#26）** / **embed 可嵌入性（#27）** / **sitemap 健康（#28）** / **dist 卫生（#29，防 P0-3 构建产物泄漏：禁 .workbuddy/e2e/test-results/__*/根级配置 .mjs/根级 .json，白名单放行 manifest.json+tools.json）** / **csp-events 解耦（#30，事件委托层与 AdSense 片段解耦 + 全页覆盖断言）** / **设计系统门禁（#31，裸 checkbox/radio 只降不升，基线 scripts/design-baseline.json）** / **全局契约门禁（#32，window.copyText+window.showError 契约完整 + runtime-head 注入 csp-events）** / **sitemap 反向覆盖门禁（#33，页面漏收录 sitemap 检测 + 豁免清单 stale 检测，2026-09-10 新增）** / **资源版本戳门禁（#34，immutable 长缓存下资源必须全部带 `?v=`，2026-09-13 新增）** | `node scripts/verify-site.mjs`（全绿退出码 0） |
| `check-links.js` | 断链扫描（相对/绝对路径存在性 + 越界 + cleanUrls） | `node scripts/check-links.js` |
| `check-jsonld.mjs` | 全站 JSON-LD 5 项断言（解析 / @context+type\|graph / 无双斜杠 URL / FAQPage mainEntity / @graph 节点 @type），退出码非 0 | `node scripts/check-jsonld.mjs` |
| `check-csp-fns.mjs` | CSP 委托层处理器可达性门禁：`data-csp-*` 引用的函数必须是真正的 window 属性（按括号深度判定作用域，识别 NESTED / 顶层 const-let / MISSING）（verify-site [25] 调用） | `node scripts/check-csp-fns.mjs` |
| `check-canonical.mjs` | canonical/hreflang 一致性门禁（verify-site [20] 调用） | `node scripts/check-canonical.mjs` |
| `check-home-sync.mjs` | 首页三源同步：磁盘页面 == 首页 zh/en 卡片 == 配置 == TOOLS_DATA（verify-site [16] 调用） | `node scripts/check-home-sync.mjs` |
| `check-p0-gate.mjs` | P0 门禁：CSS 裸色值 / Emoji 清零 / 紫二次色清零（verify-site [19] 调用） | `node scripts/check-p0-gate.mjs` |
| `check-js-syntax.mjs` | 全量 JS 语法门禁（verify-site [21] 调用，防缺陷 1 防御） | `node scripts/check-js-syntax.mjs` |
| `check-no-var.mjs` | site.js 无 `var`（verify-site [15] 调用） | `node scripts/check-no-var.mjs` |
| `generate-blog-posts.py` / `generate-sitemap.ps1` | 博客生成 / sitemap 生成（**ps1 须排除 dist/docs/deliverables/includes**，见记忆） | 见脚本头注释 |
| `generate-tag-pages.mjs` | 标签聚合落地页生成（8 分类 × zh/en = 16 页，解析首页工具卡 + 博客归档聚合，含 JSON-LD/hreflang/交叉导航；build.mjs 顶部自动调用） | `node scripts/generate-tag-pages.mjs` |
| `generate-home.mjs` | 首页 6 语义区块 + 热门/最近工具卡从 `tools.json` 单一权威数据源生成 | `node scripts/generate-home.mjs` |
| `generate-category-pages.mjs` | 栏目索引页生成（zh/en 的 calculators·image·text 三个 index.html，从 `tools.json` 重建「计数 + 工具网格」，卡片模板由 scripts/lib/tool-card.mjs 提供，与首页同构；仅替换标记区间，保留各页原创正文；**并在栏目页生成分类筛选 chip（chip 的 `data-category` = 该区块涵盖的原始 tag 集合，如 life 区块为 `life,travel`）供首页「查看全部」的 `?cat=<区块>` 消费**，chip 列表按本页实际工具派生、区块数 ≤1 的页面不生成；build.mjs 顶部自动调用） | `node scripts/generate-category-pages.mjs [--dry-run]` |
| `generate-redirects.mjs` | 工具扁平 URL 重定向生成（从 `tools.json` 补齐 `/zh` 或 `/en` 前缀的旧扁平 URL → 三层新路径，幂等追加、通配规则保持在末尾；**dir 变更时自动修正已登记规则的过期目的地**（2026-09-16 目录归位迁移即靠此自动修 8 条）；后加工具漏登记曾致旧 URL 404——badge-maker 为首个暴露案例；build.mjs 顶部自动调用，**严禁在本脚本 process.exit()**） | `node scripts/generate-redirects.mjs [--dry-run]` |
| `audit-narrow-overflow.mjs` | 窄屏（390px）全站审计：文档横向溢出 + 卡片结构缺陷（裸 `.tool-card` 缺 `.tool-card-wrap` / 空 `.icon` 无 SVG）；默认报告模式，加 `--strict` 可作门禁（R19 多视口验证工具） | `node scripts/audit-narrow-overflow.mjs [--strict]` |
| `gen-pinyin-index.py` | 生成搜索拼音/首字母索引（49 slug） | `python scripts/gen-pinyin-index.py` |
| `extract-critical.mjs` | 构建期按页提取 critical CSS 到 `critical.css` / `critical-tool.css` | `node scripts/extract-critical.mjs` |
| `e2e-server.mjs` | Playwright e2e 本地预览服务器（e2e-server.mjs） | `node scripts/e2e-server.mjs` |
| `r4-screenshots.mjs` | R4 门禁截图回归 | `node scripts/r4-screenshots.mjs` |
| `pre-work-check.sh` / `pre-work-check.ps1` | 会话前置防护：对齐基线 / 防漂移检查 | `sh scripts/pre-work-check.sh` |
| `audit-a11y.mjs` | 全站 axe 扫描（WCAG 2.1 A/AA，msedge 通道；verify #22） | `node scripts/audit-a11y.mjs` |
| `seo-batch-audit.mjs` | SEO 软指标批量审计（title/desc 长度等） | `node scripts/seo-batch-audit.mjs` |
| `gen-allowed-ids.js` | 生成 API 白名单 ID | `node scripts/gen-allowed-ids.js` |
| `inject-url-state.mjs` | 为计算器页注入 `js/url-state.js`（URL 参数预填，幂等） | `node scripts/inject-url-state.mjs [--dry-run]` |
| `strengthen-related-links.mjs` | 强化工具页"相关工具"横向链接（语义映射，跳过 noindex stub） | `node scripts/strengthen-related-links.mjs [--dry-run]` |
| `sync-includes.mjs` | **header/footer 死副本同步（T-7）**：把 `includes/{header,footer}-{zh,en}.html` 权威版本同步进全部页面（改导航不必再手工动 200+ 文件；上次改 header 动了 233 文件）。`--check` 只检查有不同步则 exit 1（改完自检用）；`--dry-run` 只列文件；`--lang zh\|en` 限语言。⚠️ 语言判定须同时匹配「开头 `en/`」与「含 `/en/`」——源码路径无前导斜杠，只判后者会把根级 en/ 全部页面误判为 zh | `node scripts/sync-includes.mjs [--check\|--dry-run]` |
| `check-doc-sync.mjs` | 检查文档与代码的同步状态（README ↔ scripts ↔ 配置；归档脚本须以 `~~名字~~` 标注并落在 `scripts/archive/`）（verify-site [26] 调用） | `node scripts/check-doc-sync.mjs` |
| `check-redirects.mjs` | 重定向门禁：通配 `/(.*).html` 须置于末尾 + 每条 `.html` 规则须有无 `.html` companion（`cleanUrls` 会先剥离 `.html`）（verify-site [24] 调用） | `node scripts/check-redirects.mjs` |
| `check-tool-template.mjs` | 4.2 工具页模板一致性门禁（与 `tool-template-baseline.json` 交叉校验：新增违规/基线过期均 FAIL）（verify-site [23] 调用） | `node scripts/check-tool-template.mjs` |
| `check-embed.mjs` | embed 可嵌入性门禁：全站 `X-Frame-Options` 不得为 DENY + `/embed` 的 CSP `frame-ancestors` 须恰为 `*` + `/embed` 须显式覆盖 `X-Frame-Options` 为单值 `ALLOWALL` + `/embed` 之后不得再有规则下发 `X-Frame-Options` + `embed.html`↔`js/embed.js` 接线 + 嵌入态广告保护（verify-site [27] 调用） | `node scripts/check-embed.mjs` |
| `check-sitemap.mjs` | sitemap 健康门禁：无死链 + noindex 页不进 sitemap + 条数规模下界（verify-site [28] 调用） | `node scripts/check-sitemap.mjs` |
| `check-sitemap-coverage.mjs` | sitemap 反向覆盖门禁：页面存在但漏收录 sitemap 检测 + 豁免清单 stale 检测（判据用文件系统推导期望集，不用 TOOL_IDS/BLOG_IDS 白名单；豁免配置 scripts/sitemap-exclusions.json，每条须带 reason），防"页面写好了却永不被发现"（verify-site [33] 调用，2026-09-10 新增） | `node scripts/check-sitemap-coverage.mjs` |
| `check-asset-version.mjs` | 资源版本戳门禁：`/js`、`/css`、`/assets` 为 `immutable` 一年缓存，故 dist 内**所有**本地静态资源引用（HTML `href`/`src` + `dist/js` 内动态加载字面量）必须带 `?v=<构建戳>`；另断言 `vercel.json` 未对 `/sw.js` 下长缓存。防「漏戳资源被钉死一年 → 页面首次打开样式错乱、Ctrl+F5 才恢复」（verify-site [34] 调用，2026-09-13 新增） | `node scripts/check-asset-version.mjs` |
| `measure-content.mjs` | 内容度量基线（批次 0，2026-09-19 增强）：纯汉字数（zh）/ 词数（en）/ 跨页重叠率（shingle+Jaccard），量化内容厚度与重复度，为内容加密度批次提供可重复基线数字（非门禁，只度量，异常才非 0）。**产物写仓库根 `reports/measure-content.json` 并入库**（原写 dist 会随部署上线、且与 dist 卫生门禁冲突）。**双口径**：全文本 vs 正文（剔除 UI 骨架 + 排除 noindex stub）—— 熔断线判定以正文口径为准（注：剔除 HTML 注释，否则 sprite/R1/R25 注释会虚高读数约 5pp）；`--focus <关键词,..>` 聚焦指定页面子集，精确回答「是否超过 15% 熔断阈值」 | `node scripts/measure-content.mjs --top 8` / `--focus tax2026,housing-fund` |
| `check-dist-hygiene.mjs` | dist 卫生门禁：禁 `.workbuddy/`/`e2e/`/`test-results/`/`__*`/根级配置 `.mjs`/根级 `.json`（白名单放行 `manifest.json`+`tools.json`，二者为 PWA 清单与 `js/embed.js` 运行时依赖），防 P0-3 构建产物泄漏复发（verify-site [29] 调用） | `node scripts/check-dist-hygiene.mjs` |
| `check-design-system.mjs` | 设计系统门禁：统计全站裸 checkbox/radio，阈值只降不升（基线写在 `scripts/design-baseline.json`，由 verkify 当前扫描结果锁定），防 UX 控件回归（verify-site [31] 调用） | `node scripts/check-design-system.mjs` |
| `check-global-contract.mjs` | 全局契约门禁：校验 `window.copyText`+`window.showError` 契约完整且 `runtime-head` 注入 `csp-events`（防删 csp-events 或重命名 break 全站事件委托），硬门禁（verify-site [32] 调用） | `node scripts/check-global-contract.mjs` |
| `check-innerhtml-escape.mjs` | innerHTML 趋势指标（非阻断）：扫描 `.innerHTML` 赋值，提示疑似未转义拼接供 review；不阻断构建/verify | `node scripts/check-innerhtml-escape.mjs` |
| `gsc-submit-daily.sh` | GSC 每日索引提交（2026-09-19 新增，非门禁）：bsk 原生 click 真实点击「Request indexing」；逐条先查 URL Inspection，**已收录自动跳过**（不消耗配额）、未收录才提交；**内置官方配额检测**（页面弹 "Quota exceeded" 即中断本批、队列原样保留，可跨天续跑）。队列 `reports/gsc-pending.txt`、日志 `reports/gsc-submit-log.md`。⚠️ 前置：VPN 须开启 + Edge+bsk 扩展常驻；bash 直接运行，**输出勿接管道** | `bash scripts/gsc-submit-daily.sh 60`（可选 `--dry` 冒烟、`--stop-on-throttle` 限流即停） |
| `scan-csp-inline.py` | 扫描全站内联脚本/事件/样式 | `python scripts/scan-csp-inline.py` |
| ~~`analyze_sitemap.py`~~ | ~~分析 sitemap 结构~~（归档） | `python scripts/archive/analyze_sitemap.py` |
| ~~`full_seo_audit.py`~~ | ~~全维度 SEO 审计~~（归档，被 `seo-batch-audit.mjs` 取代） | `python scripts/archive/full_seo_audit.py` |
| ~~`security_audit.py`~~ | ~~安全审计~~（归档） | `python scripts/archive/security_audit.py` |
| ~~`seo_audit.py`~~ | ~~SEO 审计~~（归档，被 `seo-batch-audit.mjs` 取代） | `python scripts/archive/seo_audit.py` |
| ~~`audit-contrast.mjs`~~ | ~~暗色主题对比度审计（Phase 1 T1.4 一次性）~~（归档，日常由 `audit-a11y.mjs` 覆盖） | `node scripts/archive/audit-contrast.mjs` |
| `deploy-like-system.ps1` | 部署点赞系统 | `powershell scripts/deploy-like-system.ps1` |
| `validate-encoding.ps1` | 验证编码 | `powershell scripts/validate-encoding.ps1` |
| `submit-indexnow.mjs` | **IndexNow 批量提交**（2026-09-20 新增，Tier 1）：把 sitemap 内 URL 推送给必应/Yandex/Naver 等参与的搜索引擎。**无需注册账号**——归属验证＝仓库根 `{32位hex}.txt`（内容须等于文件名，`build.mjs` 自动复制进 `dist/`）。只提交属于本站且**在 sitemap 内**的 URL（`noindex` 壳页天然排除）；本地状态记于 `scripts/.indexnow-state.json`（已 gitignore） | `npm run submit:indexnow`（`--dry-run` / `--force` / `--limit N`） |
| `baidu-push.mjs` | **百度主动推送**（2026-09-20 新增，Tier 1）：大陆最大搜索入口的即时提交。⚠️ **有每日配额**，故默认只推 **10 条**并按优先级排序（首页 → 高频工具 → 博客 → 其余），接口返回的 `remain` 会打印出来供决定下次 `--limit`。token 来自 `BAIDU_PUSH_TOKEN` 或 `scripts/.baidu-push-token`（均 gitignore）；状态记于 `scripts/.baidu-push-state.json` | `npm run submit:baidu`（`--dry-run` 不需 token / `--limit N` / `--priority-only`） |
| `push-any.sh` | **推送通道自动探测**（2026-09-21 新增，非门禁）：VPN（LvniuYun）开启时会把 `github.com` 解析到 fake-ip（`198.18.x.x`），裸 SSH 因此失败。本脚本依次探测 5 条通道 —— 1) 原生 remote；2) 真实 IP:22 直连（`-o HostKeyAlias=github.com` 保持 known_hosts 校验，彻底绕开 DNS）；3) 真实 IP:443（ssh.github.com 端点）；4) 本地代理端口（自动扫 7888/7890/1080 等）+ `curl --proxytunnel` 作 SSH `ProxyCommand`；5) HTTPS 绕行（诊断用）。**先只读 `ls-remote` 探测、成功才 push**；真实 IP 由国内 DoH（223.5.5.5）动态查询，避免硬编码 | `bash scripts/push-any.sh [branch]`（`DRY=1` 仅探测不推送） |

内容审计操作手册见 `docs/content-audit-sop.md`；构建/校验与回滚见 `docs/rollback.md`。

## 构建 + 验证

本地全量验证（与 Vercel 构建一致，零第三方依赖）。

> **一条命令等价 CI**：`npm run ci`（build → verify → 覆盖率 → e2e → a11y → 窄屏溢出）。
> ⚠️ CI 实际有 **3 个作业**（`verify` / `e2e` / `a11y`，见 `.github/workflows/ci.yml`），其中
> **e2e 与 a11y 不在 `npm run verify` 里**（verify 的 #22 对 a11y 全站扫描默认跳过）——
> 只跑 `verify` 会导致「本地全绿、CI 红」。日常快检用 `npm run ci:quick`（跳过 e2e，省约 4 分钟）。

### 分步执行

```bash
# 1) 本地构建：复制到 dist/ → GA4/AdSense 注入 → 版本号 ?v=
#    → 卫生转换（去 BOM / charset 置首 / 懒加载 / inline→.hidden）
#    → CSS 压缩 → CMP 横幅（仅 dist，源码不含 ?v）→ 版本戳兜底补齐（HTML + dist/js）
node scripts/build.mjs

# 2) 集成校验 34 项断言：header/footer 字节一致 + JSON-LD + AdSense 唯一性
#    + 断链 + 浮动控件清零 + GA4 不变量 + CSP 3 项 + 懒加载/alt/SRI/a11y/SEO/var
#    + 首页三源同步(check-home-sync) + 搜索升级专项 + 搜索升级 Phase C
#    + 工具页模板(#23) + 重定向(#24) + CSP 委托层可达性(#25) + 文档同步(#26)
#    + sitemap 反向覆盖(#33) + 资源版本戳(#34)（全绿退出码 0）
node scripts/verify-site.mjs

# 3) 断链回归（单独跑亦可）
node scripts/check-links.js
```

期望结果：
- `build.mjs`：`AdSense 注入: 更新 221 | ...` + `版本号注入: <STAMP> | 221 个文件` + `CMP 横幅注入: 221 个文件`；
- dist 内每页**恰好 1 个** adsbygoogle 标签（与 `includes/adsense-head.html` 字节一致）且含 `?v=`；
- 源码内 **0 个**静态 adsbygoogle 标签、**0 个** `#gw-theme`/`.gw-lang`/内联 `switchLang`；
- `verify-site.mjs` 输出 `✅ verify-site 全绿`（**34/34** 断言）。

> 模板统一说明：全站 header/footer 以 `includes/header-{zh,en}.html`、`includes/footer-{zh,en}.html` 为字节基准；
> 改导航/页脚只需改这 4 个文件，然后跑 `node scripts/normalize-template.mjs` 重新落盘全站 HTML。

## 相关文档

- AGENTS.md — 仓库约定
- docs/ — 设计文档与决策记录

## 安全规范（敏感凭据）

1. **不把密钥贴进对话/文档**：API Key、Token、连接串一律只存在于 Vercel 环境变量 / 本地 `.env*`（已 gitignore）。对话记录、Issue、提交信息中不得出现完整凭据。
2. **暴露即轮换**：一旦凭据出现在对话或非受控渠道，立即轮换（Upstash: Vercel 面板 → 环境变量行 → Rotate Integration Secrets；轮换后必须 Redeploy，旧密钥立即失效）。
3. **只读/最小权限**：能用 READONLY Token 的场景不用主 Token；本地测试一律走 mock（`api/test/`），不落真实 KV。
4. **脱敏约定**：确需提及凭据时只写截断前缀（如 `gQ...`），绝不写完整值；日志/记忆写入前自查。
