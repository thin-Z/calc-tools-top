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
node scripts/verify-site.mjs
```

**集成校验 28 项断言**（`verify-site.mjs`）：header/footer 字节一致 / JSON-LD / AdSense 唯一性 / 断链 / 浮动控件 / GA4 不变量 / CSP 无内联脚本 / 无内联事件 / CSP 头 / 懒加载 / alt / SRI / a11y 结构 / SEO / 无 var / 首页三源同步 / 搜索升级 / P0 门禁 / canonical-hreflang / JS 语法 / a11y 全站扫描 / 工具页模板一致性(#23) / 重定向顺序(#24) / CSP 委托层可达性(#25) / 文档同步(#26) / embed 可嵌入性(#27) / sitemap×noindex 交叉(#28)。

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
| `scripts/verify-site.mjs` | 集成校验 26 项 |
| `scripts/audit-a11y.mjs` | 全站 axe 扫描 |
| `includes/adsense-head.html` | GA4/AdSense 注入单源 |
| `js/tools.json` | 工具权威数据源（49 工具） |
| `docs/` | 设计/决策文档（Obsidian 知识库镜像） |

---

*Last updated: 2026-08-28（Phase 5）*
