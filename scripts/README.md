# scripts/ — 构建与校验脚本

> 本目录为 calc-tools.top 的构建 / 校验 / 工具脚本。**`verify-site.mjs` 与 `build.mjs` 会引用其中部分脚本，移动/重命名前务必确认引用**（详见「保留清单」）。
>
> **触发方式**（迭代二 Q-4，2026-09-09 新增列，由 `check-doc-sync.mjs` 校验）：
> - `自动`：被 Vercel build 或 `verify-site.mjs` 引用，CI/构建自动执行
> - `手动`：需开发者主动运行（内容维护 / 部署 / 测试 / 审计）
> - `一次性`：历史归档或单次迁移用途

## 保留清单（被 verify/build 引用，勿移）

| 脚本 | 被谁引用 | 用途 | 触发方式 |
|------|----------|------|----------|
| `build.mjs` | Vercel build | 构建入口（复制→注入→卫生→压缩） | 自动 |
| `verify-site.mjs` | CI / 本地 | 集成校验 36 项断言（#27 embed / #28 sitemap / #29 dist 卫生 / #30 csp-events 解耦 / #31 设计系统门禁 / #32 全局契约门禁 / #33 sitemap 反向覆盖 / #34 资源版本戳 / #35 令牌纪律 / #36 自定义属性引用 R2，2026-09-02 / 2026-09-09 / 2026-09-13 / 2026-09-23 / 2026-09-27 新增） | 自动 |
| `check-jsonld.mjs` | verify #2 | JSON-LD 5 项断言 | 自动 |
| `check-links.js` | verify #4 | 断链检查 | 自动 |
| `seo-batch-audit.mjs` | verify #14 | SEO 批量审计 | 自动 |
| `check-no-var.mjs` | verify #15 | site.js 无 var | 自动 |
| `check-home-sync.mjs` | verify #16 | 首页三源同步 | 自动 |
| `check-p0-gate.mjs` | verify #19 | P0 门禁（裸色/emoji/孤儿变体选择符/紫） | 自动 |
| `check-token-discipline.mjs` | verify #35 | 令牌纪律门禁（8 条规则）。R1：box-shadow 值型令牌 `--shadow-*` 与字面 length 混排 → 单层 length 超上限 4，整条声明被浏览器静默丢弃（`--shadow-color-*` 为颜色型，不得当值型展开）。R3–R9 令牌阶梯纪律七条：字号 `--fs-*` / 行高 `--lh-*` / 间距 `--space-*` / 圆角 `--radius-*` / 动效时长 `--dur-*` / z-index `--z-*` / 字重 `--fw-*`，每条含**两条独立信号**——计数只降不升（基线 BASELINES，低于基线只提示不自动改）+ 白名单外**新值**独立阻断（防「旧值换新值」的等价交换：计数可纹丝不动），并用 LEGACY_UNKNOWN 冻结词表区分「存量待迁移」与「新增违规」。白名单范围与计数口径同口径（`whitelistScope`），防合法值被误伤。另有**属性口径自检** `validatePropCoverage()`（与 `validateRules()` 同模式：模块加载即跑、不符即 exit 1）**三条**守卫断言（判据**全部静态**，不取自被测正则）：**(a) 基数下限** —— 每个有 fixture 的规则声明 `mustMin` / `mustNotMin`（当前 R5 19/7、R6 9/8、R7 4/5，**恰等于实际条数 → 删 1 条即红**）；下限字段缺失亦硬失败，防 `n < undefined` 恒 false 的静默放行。**(b) 属性族完整性** —— 凡 `propFamily: true`（**静态声明**，R5 / R6 / R7）的规则**必须**有非空 fixture，判据**与 prop 正则当前形态无关**。**(c) 属性族 × 探针交叉校验** —— `propFamily` 规则须在 `PROP_FAMILY_PROBE`（25 个真实属性名，硬编码、独立于 fixture）上命中 ≥2；反向：未声明 `propFamily` 却命中 ≥2 → 报「疑似漏标」。修的是两类绕过路径：① 掏空 fixture + 换回坏正则；② **整块删除 fixture + 退化正则** —— 旧版把「是不是属性族」用 `探针命中数 > 1` 从**被测正则**反推，属**循环前提**（退化正则只命中 1 个 → 被判「单属性」→ 完整性断言被跳过 → 无条目可比 → exit 0 全绿）；收口轮改为**静态声明 + 静态期望 ≥2** 后堵住（2026-09-28） | 自动 |
| `check-var-refs.mjs` | verify #36 | 自定义属性引用门禁 R2：R2-a1 自引用/循环引用 + R2-a2 无定义且无回退的 `var()` 引用，期望均为 0。自引用属计算值阶段非法 → 令牌计算值为空且不回退 `:root`，消费处整条声明被静默丢弃（暗色标签底板消失 / 点赞配色丢失）。注入点（JS `setProperty` / HTML 内联）由门禁自推导进白名单 | 自动 |
| `check-canonical.mjs` | verify #20 | canonical/hreflang | 自动 |
| `check-js-syntax.mjs` | verify #21 | JS 语法门禁 | 自动 |
| `check-csp-fns.mjs` | verify #7/8/9 | CSP 函数级断言 | 自动 |
| `audit-a11y.mjs` | verify #22 | 全站 axe 扫描（默认跳过，E2E_A11Y=1 启用） | 自动 |
| `audit-visual.mjs` | 本地 CI 链 | 渲染级视觉审查（图标隐形/断裂引用/孤儿变体选择符/替换符/未捕获异常，亮暗双主题，默认 chromium 通道）；`ci:quick` 已接入 | 手动 |
| `audit-narrow-overflow.mjs` | 本地 CI 链 | 全站 390px 横向溢出 + 卡片结构缺陷审计（GitHub Actions 不含此作业，需本地 `npm run ci:quick`） | 手动 |
| `check-embed.mjs` | verify #27 | embed 可嵌入性门禁（XFO 冲突 / frame-ancestors / 接线） | 自动 |
| `check-redirects.mjs` | verify #24 | 重定向门禁（通配须置末 + companion） | 自动 |
| `check-sitemap.mjs` | verify #28 | sitemap 健康门禁（无死链 + noindex 不进 + 规模下界） | 自动 |
| `check-sitemap-coverage.mjs` | verify #33 | sitemap 反向覆盖门禁：页面存在但漏收录 sitemap 检测 + 豁免清单 stale 检测（判据用文件系统推导，不用 ID 白名单；配置 scripts/sitemap-exclusions.json，每条须带 reason） | 自动 |
| `check-asset-version.mjs` | verify #34 | 资源版本戳门禁：dist 内所有本地静态资源引用（HTML href/src + dist/js 动态字面量）必须带 `?v=<构建戳>`，且 vercel.json 未对 `/sw.js` 长缓存（2026-09-13 新增） | 自动 |
| `measure-content.mjs` | 独立（非门禁） | 内容度量基线：zh 纯汉字 / en 词数 / 跨页重叠率，量化厚度与重复度，供内容加密度批次对比 | 手动 |
| `check-tool-template.mjs` | verify #23 | 工具页模板一致性门禁 | 自动 |
| `check-dist-hygiene.mjs` | verify #29 | dist 卫生门禁（禁 .workbuddy/e2e/test-results/__*/根级配置 .mjs/.json，白名单放行 manifest.json+tools.json） | 自动 |
| `check-design-system.mjs` | verify #31 | 设计系统门禁：裸 checkbox/radio 数量只降不升（基线 scripts/design-baseline.json，退化即 fail） | 自动 |
| `check-global-contract.mjs` | verify #32 | 全局契约门禁：copyText+showError 契约完整 + runtime-head 注入 csp-events（硬门禁） | 自动 |
| `check-innerhtml-escape.mjs` | 独立趋势（非阻断） | innerHTML 赋值扫描，提示疑似未转义拼接供 review，不阻断构建/verify | 手动 |
| `check-global-contract.mjs` | verify #32 | 全局契约门禁：js/csp-events.js 须同时定义 window.copyText + window.showError，且 runtime-head 注入 csp-events | 自动 |
| `check-innerhtml-escape.mjs` | 独立（非阻断趋势） | innerHTML 动态内容转义趋势指标：统计拼接用法 + 标记无 escapeHtml 工具的可疑项（供 review，不阻断构建） | 手动 |
| `check-doc-sync.mjs` | — | 文档-代码同步检查（README ↔ scripts ↔ archive ↔ 配置） | 手动 |
| `generate-home.mjs` | build | 首页生成（读源码） | 自动 |
| `generate-category-pages.mjs` | build | 栏目索引页卡片生成器（tools.json 单一数据源，按标记区间替换，幂等） | 自动 |
| `generate-tag-pages.mjs` | build | 标签聚合页生成 | 自动 |
| `generate-redirects.mjs` | build | 工具扁平 URL 重定向生成（tools.json 单一数据源补齐 zh/en 扁平旧 URL，幂等；**dir 变更时自动修正已登记规则的过期目的地**；**严禁 process.exit()**——被 build.mjs import，exit 会终止整个构建） | 自动 |
| `extract-critical.mjs` | build | 关键 CSS 抽取 | 自动 |
| `generate-blog-posts.py` | 内容 | 博客生成（内容维护用） | 手动 |
| `generate-sitemap.ps1` | 内容 | sitemap 生成 | 手动 |
| `gen-pinyin-index.py` | 搜索 | 拼音索引生成 | 手动 |
| `gen-allowed-ids.js` | API | API 白名单生成（API 变更时） | 手动 |
| `gen-social-assets.py` | 资产 | 社交分享位图生成：`assets/og-image.png`（1200×630）+ `assets/apple-touch-icon.png`（180×180），品牌蓝阶单一色源，落盘后读回 PNG 实测对比度 | 一次性 |
| `strengthen-related-links.mjs` | 内链 | 相关工具内链强化 | 手动 |
| `sync-includes.mjs` | 布局 | header/footer 死副本同步（includes 权威版本 → 全站页面；`--check` 自检、`--dry-run` 预览、`--lang` 限语言） | 手动 |
| `inject-url-state.mjs` | 工具页 | URL 参数预填注入（**默认 dry-run，须 `--write` 才真实写入**） | 手动 |
| `e2e-server.mjs` | 测试 | Playwright 本地预览服务器 | 手动 |
| `pre-work-check.ps1/.sh` | 会话 | 开工前基线防护 | 手动 |
| `pre-submit-audit.mjs` | 提交 | **提交前深度审查**（强制流程）：改动面分类 / 未跟踪清单 / 安全扫描（敏感文件+超大文件）/ 新增文件行尾 / 按改动类型的专项核查提示 / 必做清单；FAIL 时退出码 1。**定位是自检器不是门禁**（不接入 verify-site、不改断言数） | 手动 |
| `r4-screenshots.mjs` | R4 | 截图回归 | 手动 |
| `scan-csp-inline.py` | verify 口径 | 扫描内联脚本/事件（verify #7/8 口径依赖，保留） | 手动 |
| `validate-encoding.ps1` | 工具 | 编码验证 | 手动 |

## 运维 / 发布脚本（已迁出）

> `gsc-submit-daily.sh`、`baidu-push.mjs`、`submit-indexnow.mjs`、`push-any.sh`、`deploy-like-system.ps1`
> 因仓库为 **public**，已迁至知识库 `_ObsidianVault/90-运维工具/`（2026-09-23，附用法与依赖说明）。

## 归档清单（scripts/archive/，一次性 / 旧审计，非 verify 引用）

见 `scripts/archive/README.md`。已归档：`full_seo_audit.py`、`security_audit.py`、`seo_audit.py`、`analyze_sitemap.py`、`audit-contrast.mjs`（被 `audit-a11y.mjs` 取代）。

> 归档脚本可手动运行（需从仓库根执行，相对路径以仓库为基准）：
> `node scripts/archive/audit-contrast.mjs`
