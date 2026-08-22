# calc-tools.top — 在线工具箱

免费在线工具站（计算器 / 图片 / 文字工具 + 中英双语博客）。纯静态站点托管在 Vercel，点赞/点击计数通过 Vercel Serverless Function + Upstash Redis（Vercel KV）实现。

## 技术栈与结构

| 部分 | 说明 |
|------|------|
| 前端 | 纯静态 HTML/CSS/JS（无框架），`zh/`、`en/` 双语，`blog/` 博客（**全站 173 页**） |
| 构建 | Vercel `buildCommand = node scripts/build.mjs`，`outputDirectory = dist`（复制站点 → GA4/AdSense 注入 → 版本号 → 卫生转换 → CSS 压缩 → CMP 横幅） |
| API | `api/likes.js`（点赞）、`api/clicks.js`（点击），Node Serverless Function |
| 存储 | **Vercel KV（Upstash Redis）**，点赞/点击计数 + 限速/防刷均存于此 |
| 广告 | AdSense Auto Ads，client ID 单一来源 `includes/adsense-head.html`，构建期注入全站 |
| 分析 | GA4 `G-B61D908J5F`（`includes/adsense-head.html` 单一来源，构建期剥离占位符守卫） |
| 安全 | **CSP 全站硬化**：script-src / style-src 无 `unsafe-inline`（`js/csp-events.js` 委托层 + `js/inline/*.js` 外链化），img-src 白名单化；`verify-site.mjs` 9 项断言守护 |

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
| `build.mjs` | Vercel 构建入口：复制到 `dist/` → 清理旧 cookie-consent → GA4 启用/占位守卫 → 注入 AdSense（单一来源 `includes/adsense-head.html`）→ 注入缓存版本号（`?v=YYYYMMDDHHmm`，仅 dist）→ 卫生转换（去 BOM / charset 置首 / 懒加载 / inline→.hidden）→ CSS 压缩 → CMP 横幅注入 | `node scripts/build.mjs` |
| `verify-site.mjs` | 集成校验 9 项断言：header/footer 字节一致 / JSON-LD 5 项 / 静态 AdSense 唯一性 / 断链 / 浮动控件清零 / GA4 ID 不变量 / CSP 无内联脚本 / 无内联事件处理器 / CSP 头无 unsafe-inline | `node scripts/verify-site.mjs`（全绿退出码 0） |
| `normalize-template.mjs` | 全站 header/footer 模板归一（T02）：按 `includes/header-{zh,en}.html` / `footer-{zh,en}.html` 替换，移除静态 AdSense 标签与 `#gw-theme`/`.gw-lang`/内联 `switchLang`，脚本引用绝对化 | `node scripts/normalize-template.mjs --dry-run`（报告）/ 无参数（落盘） |
| `inject-adsense.mjs` | 独立版 AdSense/GA4 注入（build.mjs 内嵌同逻辑） | `node scripts/inject-adsense.mjs` |
| `check-links.js` | 断链扫描（相对/绝对路径存在性 + 越界 + cleanUrls） | `node scripts/check-links.js` |
| `check-jsonld.mjs` | 全站 JSON-LD 5 项断言（解析 / @context+type\|graph / 无双斜杠 URL / FAQPage mainEntity / @graph 节点 @type），退出码非 0 | `node scripts/check-jsonld.mjs` |
| `check-csp-fns.mjs` | CSP 函数级断言（assertNoInlineScripts / assertNoInlineEventHandlers / assertCspHeader），verify-site 的 [7][8][9] 独立版 | `node scripts/check-csp-fns.mjs` |
| `csp-migrate-t02.mjs` / `csp-migrate-styles.mjs` | CSP 迁移历史脚本（内联脚本外链化 / 内联 style class 化），迁移已完成，保留作审计参考 | `node scripts/csp-migrate-t02.mjs --dry-run` |
| `measure-content.mjs` | 正文词数审计（h1→CTA 口径），支持 `--json` / `--summary` | `node scripts/measure-content.mjs [阈值] [根] [--json] [--summary]` |
| `generate-blog-posts.py` / `generate-sitemap.ps1` | 博客生成 / sitemap 生成（**ps1 须排除 dist/docs/deliverables**，见记忆） | 见脚本头注释 |

内容审计操作手册见 `docs/content-audit-sop.md`；构建/校验与回滚见 `docs/rollback.md`。

## 构建 + 验证

本地全量验证（与 Vercel 构建一致，零第三方依赖）：

```bash
# 1) 本地构建：复制到 dist/ → GA4/AdSense 注入 → 版本号 ?v=
#    → 卫生转换（去 BOM / charset 置首 / 懒加载 / inline→.hidden）
#    → CSS 压缩 → CMP 横幅（仅 dist，源码不含 ?v）
node scripts/build.mjs

# 2) 集成校验 9 项断言：header/footer 字节一致 + JSON-LD + AdSense 唯一性
#    + 断链 + 浮动控件清零 + GA4 不变量 + CSP 3 项（全绿退出码 0）
node scripts/verify-site.mjs

# 3) 断链回归（单独跑亦可）
node scripts/check-links.js
```

期望结果：
- `build.mjs`：`AdSense 注入: 更新 173 | ...` + `版本号注入: <STAMP> | ...` + `CMP 横幅注入: ...`；
- dist 内每页**恰好 1 个** adsbygoogle 标签（与 `includes/adsense-head.html` 字节一致）且含 `?v=`；
- 源码内 **0 个**静态 adsbygoogle 标签、**0 个** `#gw-theme`/`.gw-lang`/内联 `switchLang`；
- `verify-site.mjs` 输出 `✅ verify-site 全绿`（9/9 断言）。

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
