# scripts/ — 构建与校验脚本

> 本目录为 calc-tools.top 的构建 / 校验 / 工具脚本。**`verify-site.mjs` 与 `build.mjs` 会引用其中部分脚本，移动/重命名前务必确认引用**（详见「保留清单」）。

## 保留清单（被 verify/build 引用，勿移）

| 脚本 | 被谁引用 | 用途 |
|------|----------|------|
| `build.mjs` | Vercel build | 构建入口（复制→注入→卫生→压缩） |
| `verify-site.mjs` | CI / 本地 | 集成校验 28 项断言（#27 embed 可嵌入性 / #28 sitemap×noindex 交叉，2026-09-02 新增） |
| `check-jsonld.mjs` | verify #2 | JSON-LD 5 项断言 |
| `check-links.js` | verify #4 | 断链检查 |
| `seo-batch-audit.mjs` | verify #14 | SEO 批量审计 |
| `check-no-var.mjs` | verify #15 | site.js 无 var |
| `check-home-sync.mjs` | verify #16 | 首页三源同步 |
| `check-p0-gate.mjs` | verify #19 | P0 门禁（裸色/emoji/紫） |
| `check-canonical.mjs` | verify #20 | canonical/hreflang |
| `check-js-syntax.mjs` | verify #21 | JS 语法门禁 |
| `audit-a11y.mjs` | verify #22 | 全站 axe 扫描（默认跳过，E2E_A11Y=1 启用） |
| `check-csp-fns.mjs` | verify #7/8/9 | CSP 函数级断言 |
| `check-doc-sync.mjs` | — | 文档-代码同步检查 |
| `generate-home.mjs` | build | 首页生成（读源码） |
| `generate-tag-pages.mjs` | build | 标签聚合页生成 |
| `extract-critical.mjs` | build | 关键 CSS 抽取 |
| `generate-blog-posts.py` | 内容 | 博客生成（内容维护用） |
| `generate-sitemap.ps1` | 内容 | sitemap 生成 |
| `gen-pinyin-index.py` | 搜索 | 拼音索引生成 |
| `gen-allowed-ids.js` | API | API 白名单生成 |
| `strengthen-related-links.mjs` | 内链 | 相关工具内链强化 |
| `inject-url-state.mjs` | 工具页 | URL 参数预填注入 |
| `e2e-server.mjs` | 测试 | Playwright 本地预览服务器 |
| `pre-work-check.ps1/.sh` | 会话 | 开工前基线防护 |
| `r4-screenshots.mjs` | R4 | 截图回归 |
| `scan-csp-inline.py` | verify 口径 | 扫描内联脚本/事件（verify #7/8 口径依赖，保留） |
| `deploy-like-system.ps1` | 部署 | 点赞系统部署 |
| `validate-encoding.ps1` | 工具 | 编码验证 |

## 归档清单（scripts/archive/，一次性 / 旧审计，非 verify 引用）

见 `scripts/archive/README.md`。已归档：`full_seo_audit.py`、`security_audit.py`、`seo_audit.py`、`analyze_sitemap.py`、`audit-contrast.mjs`（被 `audit-a11y.mjs` 取代）。

> 归档脚本可手动运行（需从仓库根执行，相对路径以仓库为基准）：
> `node scripts/archive/audit-contrast.mjs`
