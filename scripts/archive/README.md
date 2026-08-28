# scripts/archive/ — 归档脚本（一次性 / 旧审计，非 verify 引用）

> Phase 5（可观测性 + 技术债）T5.2 归档。这些脚本是历史审计 / 一次性工具，**不被 `verify-site.mjs` / `build.mjs` 程序化引用**，故移出 `scripts/` 顶层以免混淆。
> 已归档脚本可能在新版设计下**过时或不再适用**（如 `audit-contrast.mjs` 已被 `audit-a11y.mjs` 取代），保留仅供追溯 / 手动复跑。

| 脚本 | 原用途 | 状态 |
|------|--------|------|
| `full_seo_audit.py` | 全维度 SEO 审计 | 一次性/被 `seo-batch-audit.mjs` 取代 |
| `security_audit.py` | 安全审计 | 一次性 |
| `seo_audit.py` | SEO 审计 | 一次性/被 `seo-batch-audit.mjs` 取代 |
| `analyze_sitemap.py` | sitemap 结构分析 | 一次性 |
| `audit-contrast.mjs` | 暗色/亮色对比度审计（Phase 1 T1.4） | 被 `audit-a11y.mjs`（全规则 axe）取代 |

**手动运行**（从仓库根执行，相对路径以仓库为基准）：
```
node scripts/archive/audit-contrast.mjs
python scripts/archive/full_seo_audit.py
```

> ⚠️ `scan-csp-inline.py` 虽也偏审计，但因 **verify-site.mjs #7/#8 的口径注释依赖**，**保留在 `scripts/` 顶层**（勿归档）。
