# CONTRIBUTING — calc-tools.top 贡献指南

> 本文档供开发者/协作者（含 AI 代理、WB）开工前阅读，统一构建、校验、提交、部署流程，避免踩环境坑。

---

## 一、开工前（必做）

每次会话开始改代码前，**先对齐基线**（防百度同步盘回滚/误删导致的漂移）：

```bash
# Windows
powershell -ExecutionPolicy Bypass -File scripts/pre-work-check.ps1
# 或 Unix
sh scripts/pre-work-check.sh
```

若脚本报告「本地落后远端」，说明同步盘回滚过，需先 `git fetch origin main` + `git reset --hard origin/main` 对齐（会丢弃本地未提交改动，确认后执行）。

---

## 二、构建

```bash
node scripts/build.mjs
```

作用：复制到 `dist/` → 清理旧 cookie-consent → GA4 注入 → AdSense 注入（`includes/adsense-head.html` 单源）→ 版本号注入（`?v=时间戳`，仅 dist）→ 卫生转换（去 BOM/charset 置首/懒加载/inline→.hidden）→ CSS 压缩 → CMP 横幅 → Inline sprite 注入。

> `dist/` 已被 gitignore（构建产物，Vercel 会重新构建），**无需提交 dist**。

---

## 三、校验（提交前必跑，全绿才提交）

```bash
# 0) 提交前深度审查（第一步；含跨文件一致性自动检查）
npm run audit:pre

# 1) 集成校验（36 项断言）
node scripts/verify-site.mjs

# 2) a11y 必须按 CI 通道跑（默认 msedge 会假绿）+ 亮暗双主题
E2E_CHANNEL=chromium node scripts/audit-a11y.mjs
```

**集成校验 36 项断言**（`verify-site.mjs`）：header/footer 字节一致 / JSON-LD / AdSense 唯一性 / 断链 / 浮动控件 / GA4 不变量 / CSP 无内联脚本 / 无内联事件 / CSP 头 / 懒加载 / alt / SRI / a11y 结构 / SEO / 无 var / 首页三源同步 / 搜索升级 / P0 门禁 / canonical-hreflang / JS 语法 / a11y 全站扫描 / 工具页模板一致性(#23) / 重定向顺序(#24) / CSP 委托层可达性(#25) / 文档同步(#26) / embed 可嵌入性(#27) / sitemap×noindex 交叉(#28) / dist 卫生门禁(#29，防 P0-3 构建产物泄漏复发) / csp-events 解耦(#30，事件委托层与 AdSense 片段解耦 + 全页覆盖) / 设计系统门禁(#31，裸 checkbox/radio 只降不升，基线 scripts/design-baseline.json) / 全局契约门禁(#32，window.copyText+window.showError 契约完整 + runtime-head 注入 csp-events) / sitemap 反向覆盖门禁(#33，页面存在但漏收录 sitemap 检测 + 豁免清单 stale 检测，2026-09-10 新增) / 资源版本戳门禁(#34，immutable 长缓存下所有本地资源引用必须带 `?v=`，2026-09-13 新增) / 令牌纪律门禁(#35，box-shadow 值型令牌与字面 length 混排 → 单层 length 超上限被静默丢弃，2026-09-23 新增)/ **自定义属性引用门禁（#36，自引用/循环引用 + 无定义且无回退的 `var()` 引用，期望均 0；令牌引用自身属计算值阶段非法 → 计算值为空且**不回退** `:root`，消费处整条声明被浏览器静默丢弃，2026-09-27 新增）**。

- **全绿（exit 0）才能提交**。这是项目硬规则。
- a11y 全站扫描（#22）**默认跳过**（需浏览器），启用：`E2E_A11Y=1 node scripts/audit-a11y.mjs`（本地需 playwright + msedge）。
- 新增断言必须**同批次**接入 `verify-site.mjs` 与 `.github/workflows/*.yml`，否则 FAIL 不可见（R5）。

### 门禁规则（不可协商）

| 规则 | 内容 |
|------|------|
| **R1** | 图标必须 inline sprite（`<use href="#id">` 同文档引用），禁跨文档 `<use href="外部.svg#id">` |
| **R2** | 改 `.js` 必过 verify #21（`node --check`），**禁纯正则盲替**（字符串感知） |
| **R3** | 阶段收尾临时文件清零：仓库根 `_*.mjs` 为空；新临时脚本即时 `mv` 至 `.workbuddy/archive/` |
| **R4** | verify 伪绿防御：图标/CSS/JS 变更，除 verify 外**必须叠加真实浏览器渲染断言**（Playwright 或 opencli 真实 Edge），不可仅以 verify 全绿宣称完成 |
| **R5** | innerHTML 动态内容须转义：任何 `el.innerHTML = ...` 拼接**用户输入/外部数据**时，必须先用 `escapeHtml()` 转义；纯常量/纯数字结果（如 percentage-calc 拼接数值）可豁免。趋势指标 `node scripts/check-innerhtml-escape.mjs`（非阻断，供 review） |
| **R6** | 新工具「零 DOM + 单测」准入（Q-5）：算法逻辑抽到 `js/calculators/<tool>.js` **纯函数**（无 `document` 依赖），UI 交互在 `js/inline/<tool>.js`；纯函数文件**必须配 `js/test/<tool>.test.js` 单测**。样板：`js/calculators/bmi.js`（纯函数 `calculateBMI`）+ `js/inline/bmi.js`（UI）。存量 26 个耦合计算器按页逐步拆（长线，非阻断） |
| **R7** | **提交前深度审查（2026-09-28 立）**：任何 `commit` / `push` 前必须 ① `npm run audit:pre` 无 FAIL ② `npm run ci:quick` 全绿 ③ `E2E_CHANNEL=chromium node scripts/audit-a11y.mjs` 通过（本地默认通道会假绿）。`audit:pre` 内含**跨文件一致性自动检查**：`scripts/` 实际脚本 ↔ 两份 README 登记录双向差集 · `verify-site` 实测断言数 ↔ 三份文档声明比对。④ 新增门禁或任何「期望 0」类断言，**必须先证明装置有效**（注入真实违规 → 改动前报得出、改动后归零），**只报 0 不算证明** ⑤ 文档同步（报告就地校正 / 待办 / 日志 / 记忆）。<br>**设计原则**：凡是**可机械判定**的一致性检查，一律写进 `audit:pre` 这类必跑脚本，**不要留给「主动想起来」** —— 靠记忆的检查在长任务末尾必掉（多次实证：2026-09-27 一次提交易漏 2 个脚本登记，靠人工双向差集才发现）。 |
| **R8** | **图标体系单一来源（2026-10-01 立，R1 的延伸）**：全站图标走自托管 Lucide sprite（`assets/icons/icons.svg`，构建期**按页 tree-shake** 内联，故新增 symbol 对其它页零成本）。**禁止新增自绘内联 SVG**；确有工具特有字形（sprite 无等价）时必须三步：① 核对 sprite **115 个 symbol 全量**确认无等价（判据：`maximize`/`minimize`/`expand` 等均不存在，`minimize-2`≠`minimize`）② **登记到下表 R8 清单**③ 需指定颜色时用 SVG 的 `color` **表现属性**，**禁内联 `style="..."`**（CSP `style-src` 无 `unsafe-inline`，仅有一个 sha256 hash 白名单）。<br>**在册自绘集**（`badge-maker`）：全屏进入/退出 ×4 · `.bd-ico` 边框示意图 ×12（`viewBox 0 0 20 20`，`stroke-width 1.2–2.8` **刻意不等宽** —— 描边宽度即边框样式，**"统一描边"会破坏语义，勿做**）· `.brand-mark` 三同心圆 ×2。**已迁库**：空态上传箭头 ×2 → `icon-upload`（Lucide `upload` 字形等价）。⚠️ **新增自绘图标不登记 = 违规**，否则重演「图标体系混用」。 |

---

## 四、提交

```bash
git add <files>
git commit -m "type(scope): 说明"
git push origin main   # 触发 Vercel 部署
```

- **提交前先 `verify-site` 全绿**（见上）。
- 分批提交（≤5 文件/批，语义清晰），便于回滚。
- commit message 用 `feat/fix/chore/docs/refactor(scope): 描述`。

---

## 五、部署

push `main` 即触发 Vercel 自动部署（`outputDirectory=dist`）。部署后探活：

```bash
# 确认页面 200 + 关键资源正确
curl -I https://www.calc-tools.top/js/web-vitals-report.js
```

---

## 六、本机环境坑（重要，勿重踩）

1. **百度同步盘回滚/CRLF**：会回滚 `.git` 与工作区、注入 CRLF 导致 "File has been modified since read"。**开工前 `pre-work-check` + 落后则 `reset --hard origin/main`**。
2. **SSH 22 端口劫持**：git 拉/推走 **443 通道**（`GIT_SSH_COMMAND="ssh -o Port=443 -o HostName=ssh.github.com"`），本仓库用 HTTPS remote + PAT（credential.helper=store）。
3. **`git rm` 会被中断**：用 `rm <files>` + `git add -A`。
4. **CSP 硬核**：script-src/style-src 无 `unsafe-inline`（外链化 + `.st-N` 委托层），改页面内联结构需走 CSP 合规路径。
5. **主题切换读取 URL `?theme=dark|light` 优先**（theme-init.js），测试 dark 用 URL 参数而非仅 localStorage。
6. **Playwright 用 `channel:'msedge'` 复用系统 Edge**（默认 chromium 缺 headless_shell 会失败）；axe 全站扫描需 `E2E_A11Y=1`。

---

## 七、关键文件

| 文件 | 用途 |
|------|------|
| `scripts/build.mjs` | Vercel 构建入口 |
| `scripts/verify-site.mjs` | 集成校验 **36 项**（2026-10-02 实测） |
| `scripts/audit-a11y.mjs` | 全站 axe 扫描 |
| `includes/adsense-head.html` | GA4/AdSense 注入单源 |
| `tools.json`（仓库根） | 工具权威数据源（**51 条** = 28 calculators + 8 image + 15 text；其中 4 条带 `mergedInto` → 展示集 **47**） |
| ~~`docs/`~~ | **已迁出仓库（2026-10-02）**：设计/决策文档权威源 = 知识库 `02-个人项目/projects/2_AI建站项目/docs/`（本目录曾为其镜像，已分叉 5 周 → 统一到知识库单源） |

---

*Last updated: 2026-10-02（仓库 docs/ 迁出收尾）*
