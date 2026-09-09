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
| `verify-site.mjs` | CI / 本地 | 集成校验 31 项断言（#27 embed / #28 sitemap / #29 dist 卫生 / #30 csp-events 解耦 / #31 设计系统门禁，2026-09-02 / 2026-09-09 新增） | 自动 |
| `check-jsonld.mjs` | verify #2 | JSON-LD 5 项断言 | 自动 |
| `check-links.js` | verify #4 | 断链检查 | 自动 |
| `seo-batch-audit.mjs` | verify #14 | SEO 批量审计 | 自动 |
| `check-no-var.mjs` | verify #15 | site.js 无 var | 自动 |
| `check-home-sync.mjs` | verify #16 | 首页三源同步 | 自动 |
| `check-p0-gate.mjs` | verify #19 | P0 门禁（裸色/emoji/紫） | 自动 |
| `check-canonical.mjs` | verify #20 | canonical/hreflang | 自动 |
| `check-js-syntax.mjs` | verify #21 | JS 语法门禁 | 自动 |
| `check-csp-fns.mjs` | verify #7/8/9 | CSP 函数级断言 | 自动 |
| `audit-a11y.mjs` | verify #22 | 全站 axe 扫描（默认跳过，E2E_A11Y=1 启用） | 自动 |
| `check-embed.mjs` | verify #27 | embed 可嵌入性门禁（XFO 冲突 / frame-ancestors / 接线） | 自动 |
| `check-redirects.mjs` | verify #24 | 重定向门禁（通配须置末 + companion） | 自动 |
| `check-sitemap.mjs` | verify #28 | sitemap 健康门禁（无死链 + noindex 不进 + 规模下界） | 自动 |
| `check-tool-template.mjs` | verify #23 | 工具页模板一致性门禁 | 自动 |
| `check-dist-hygiene.mjs` | verify #29 | dist 卫生门禁（禁 .workbuddy/e2e/test-results/__*/根级配置 .mjs/.json，白名单放行 manifest.json+tools.json） | 自动 |
| `check-design-system.mjs` | verify #31 | 设计系统门禁：裸 checkbox/radio 数量只降不升（基线 scripts/design-baseline.json，退化即 fail） | 自动 |
| `check-doc-sync.mjs` | — | 文档-代码同步检查（README ↔ scripts ↔ archive ↔ 配置） | 手动 |
| `generate-home.mjs` | build | 首页生成（读源码） | 自动 |
| `generate-tag-pages.mjs` | build | 标签聚合页生成 | 自动 |
| `extract-critical.mjs` | build | 关键 CSS 抽取 | 自动 |
| `generate-blog-posts.py` | 内容 | 博客生成（内容维护用） | 手动 |
| `generate-sitemap.ps1` | 内容 | sitemap 生成 | 手动 |
| `gen-pinyin-index.py` | 搜索 | 拼音索引生成 | 手动 |
| `gen-allowed-ids.js` | API | API 白名单生成（API 变更时） | 手动 |
| `strengthen-related-links.mjs` | 内链 | 相关工具内链强化 | 手动 |
| `inject-url-state.mjs` | 工具页 | URL 参数预填注入（**默认 dry-run，须 `--write` 才真实写入**） | 手动 |
| `e2e-server.mjs` | 测试 | Playwright 本地预览服务器 | 手动 |
| `pre-work-check.ps1/.sh` | 会话 | 开工前基线防护 | 手动 |
| `r4-screenshots.mjs` | R4 | 截图回归 | 手动 |
| `scan-csp-inline.py` | verify 口径 | 扫描内联脚本/事件（verify #7/8 口径依赖，保留） | 手动 |
| `deploy-like-system.ps1` | 部署 | 点赞系统部署 | 手动 |
| `validate-encoding.ps1` | 工具 | 编码验证 | 手动 |

## 归档清单（scripts/archive/，一次性 / 旧审计，非 verify 引用）

见 `scripts/archive/README.md`。已归档：`full_seo_audit.py`、`security_audit.py`、`seo_audit.py`、`analyze_sitemap.py`、`audit-contrast.mjs`（被 `audit-a11y.mjs` 取代）。

> 归档脚本可手动运行（需从仓库根执行，相对路径以仓库为基准）：
> `node scripts/archive/audit-contrast.mjs`
