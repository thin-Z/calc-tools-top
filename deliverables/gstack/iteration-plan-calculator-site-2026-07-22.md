# calc-tools.top 迭代计划（基于双审查报告）

**日期**：2026-07-22
**基线**：HEAD = `6848c44`（origin/main 最新）
**输入报告**：
- 报告一：全站审查（产品+代码+设计+健康）`deliverables/gstack/project-audit-calculator-site-2026-07-22.md`
- 报告二：健康检查（排障手）`C:/Users/zhaoxin/calculator_site_health_report.md`
**当前结论**：🔴 **No-Go**。严重度 P0×5 / P1×10 / P2×7。GSC 仅收录 ~4/166。
**根因主线**：① 构建脚本缺陷（sitemap 两 bug）→ 收录阻断；② 编码回归（正文+元数据+en 漏检）→ 乱码；③ 合规/设计债务未还。
**原则**：先消 P0 解锁收录 → 再清质量/合规/设计债务 → 最后体验打磨。

---

## 📌 TL;DR
- 分 **4 个 Phase**：0 紧急止血（消 P0） → 1 SEO 解锁（重交 GSC+观察窗） → 2 质量合规（GDPR/API/CSP/设计） → 3 体验打磨（CSS/性能）。
- **P0 全消前不可放量**；最终放量判定线：P0+P1 全消 + CI 连续 2 周全绿 + GSC 索引回升 ≥120/166（修复后 2–4 周观察）。
- 最高杠杆 8 条行动见文末；CI 护栏（HTML 非空/lang、JSON-LD `json.loads`、乱码 oracle、未闭合 lint、sitemap 校验）必须落地防回归。

---

## 0. 阶段速览

| Phase | 目标 | 覆盖项 | 预计工作量 |
|---|---|---|---|
| **0 紧急止血** | 消全部 P0，恢复 EN 渠道 + 消除用户可见故障 | 5×P0（EN 空白 / 9 JSON-LD / sitemap 两 bug / 可见乱码） | M×3 + S×2 |
| **1 SEO 解锁** | 修收录阻断 + 重交 GSC + 开观察窗 | www 301 + 元数据/en 乱码 + 重生 sitemap + 重交 | M + S×4 |
| **2 质量合规** | 合规 / 安全 / 设计债务 | GDPR + API 安全 + CSP/CORS + 主题入口 + 未闭合标签 + 浮动/CSS | L×2 + M×3 + S |
| **3 体验打磨** | 设计一致性 + 性能 | CSS 合并 / 死代码 / 暗色收口 | M×2 |

---

## 1. Phase 0 紧急止血（消 P0）

**阶段 DoD**：`/en` 非空且含 `<html lang="en">`+viewport；可见正文 0 乱码；214 个 JSON-LD 全 `json.loads` 通过；新生 sitemap 无幽灵/hreflang 正确。

| # | 任务 | 文件·修复动作 | 负责方 | 依赖 | 工作量 | DoD / 回滚 |
|---|---|---|---|---|---|---|
| P0-1 | 重建 EN 首页 | `en/index.html`（0 字节）由模板派生英文首页，保证 `<html lang="en">`+viewport+非空 | 前端 | 模板 | M | `/en` 非空含 lang/viewport，0 JS 错；回滚：临时 `/en`→`/` 302 |
| P0-2 | 修 9 JSON-LD | 类A `zh/en/calculators/age-calc.html` 替换 `"@graph": <` 占位符为合法 JSON；类B `zh/en/calculators/date-calc.html`+5 `en/text/*` 插值做 JSON 转义 | 前端/模板 | 模板 escape | M | 214 全 `json.loads`；回滚：备份旧文件 |
| P0-3 | 修 sitemap:96 | `scripts/generate-sitemap.ps1:96` 把 `index.html` 归一为根路径 `/`，消除 10 个 `/index` 幽灵 | 脚本·构建 | 无 | S | 重生 sitemap 无 `/index`；回滚：revert 脚本 |
| P0-4 | 修 sitemap:47-66 | `scripts/generate-sitemap.ps1:47-66` blog hreflang 自引用 → en/zh-CN/x-default 三向互指正确 | 脚本·构建 | 无 | S | 76 条 blog hreflang 正确；回滚：revert 脚本 |
| P0-5 | 清可见乱码 | `404.html`（h1/描述/按钮整段）、`zh/index.html`（链接文本）重存 UTF-8 | 前端 | UTF-8 源 | S | 可见正文 GBK oracle 0 命中；回滚：CI guard |

> P0 阶段内部全可并行：`en/index.html` 重建 ∥ 9 JSON-LD 修复 ∥ sitemap 两脚本修复 ∥ 可见乱码修复，彼此无文件依赖。

---

## 2. Phase 1 SEO 解锁（修复收录阻断 + 重交 GSC + 观察窗）

**阶段 DoD**：www 301 生效；12 元数据文件 + en 全站 0 乱码；新生 sitemap 正确；GSC 已重交；观察窗启动。
**排序关键**：先修脚本（P0-3/4）+ 清内容（P0-5/1-2/1-3），最后才重生+重交，避免反复提交触发质检波动。

| # | 任务 | 文件·修复动作 | 负责方 | 依赖 | 工作量 | DoD / 回滚 |
|---|---|---|---|---|---|---|
| P1-1 | www 301 | `vercel.json` 加 non-www→www 301 | DevOps | 无 | S | 访问 non-www 返回 301→www；回滚：revert |
| P1-2 | 清元数据乱码 | 12 文件 `about.html`/`privacy.html`/`zh/privacy.html` + 9 `blog/zh/*-guide*.html` HEAD meta/og/twitter | SEO/前端 | 无 | M | 12 文件 HEAD 0 乱码；回滚：git revert |
| P1-3 | en 编码回归 | `en/text/json-formatter.html`、`zh/text/keyword-density.html` 清 `鉂?/鈿?/鈥?/閸/鐐`；CI **显式覆盖 en**（报告二证自动化漏检 en） | 前端/SEO | P0-5 | S | en 全站 0 乱码；回滚：CI guard |
| P1-4 | 重生+重交 | 重跑 `generate-sitemap.ps1` 再生 sitemap.xml，GSC 重新提交 | 脚本·SEO | P0-3,P0-4 | S | 新 sitemap 正确、GSC 已重交；回滚：旧 sitemap 备份 |
| P1-5 | 观察窗 | GSC 收录监控 2–4 周，记录索引数回升 | SEO | P1-4 | S(持续) | 索引数回升；无（仅监控） |

> 可并行：`www 301`(P1-1) ∥ 元数据乱码(P1-2) ∥ en 乱码(P1-3)。

---

## 3. Phase 2 质量合规（合规 / 安全 / 设计债务）

**阶段 DoD**：AdSense 同意前 0 请求；API 写用 POST、限速不可绕过、无全量枚举泄露；CSP enforce 无 inline 违规、CORS 无 localhost；全站可切主题；HTML 0 未闭合；浮动不遮挡、国旗正确、dark 覆盖全、按钮品牌蓝。

| # | 任务 | 文件·修复动作 | 负责方 | 依赖 | 工作量 | DoD / 回滚 |
|---|---|---|---|---|---|---|
| P2-1 | AdSense 同意门 | 静态 AdSense 改 Cookie 同意后注入 | 前端 | consent 机制 | M | 未同意前无 AdSense 请求；回滚：恢复即载（有合规风险） |
| P2-2 | API 安全 | `api/clicks.js`/`api/likes.js`：限速改 KV 不可绕过；`GET /api/clicks` 强制 toolId 消全 key 泄露/N+1；写改标准 POST | 后端·API | Vercel KV | L | 写用 POST、限速生效、无泄露/N+1；回滚：旧函数 |
| P2-3 | CSP/CORS | CSP `Report-Only`+`unsafe-inline` → `enforce`+nonce；prod CORS 去 localhost | DevOps/后端 | 无内联残留 | M | CSP enforce 无违规、CORS 无 localhost；回滚：切回 Report-Only |
| P2-4 | 主题入口 | 全站子页加 `#theme-toggle`（现仅 `index.html` 有） | 前端 | 共享 header | M | 所有子页可切主题；回滚：组件 revert |
| P2-5 | 未闭合标签 | 5 en 文本页 heart `<span>` 缺 `</`、zh `<option>` 缺 `/`、`index.html:45-47` `<button>` 缺 `</button>` | 前端/模板 | 模板修复 | S | HTML 校验 0 未闭合；回滚：模板 revert |
| P2-6 | 浮动/CSS 归一 | `gw-lang`/`gw-theme` 不遮挡+国旗 `🇳`→`🇨🇳`；`cookie-consent.css` 畸形 `:root`；404 按钮回归品牌蓝；双 CSS（style.css token vs site.css 硬编码）归一/分层；图片工具页补 `[data-theme=dark]` | 设计·UX/前端 | P2-4 | L | 浮动不遮挡、国旗对、dark 覆盖全、按钮品牌蓝；回滚：CSS revert |

---

## 4. Phase 3 体验打磨（设计一致性 + 性能）

**阶段 DoD**：无渲染阻塞 CSS、无死代码/乱码注释；暗色 token/间距/字体一致，设计评审通过。

| # | 任务 | 文件·修复动作 | 负责方 | 依赖 | 工作量 | DoD / 回滚 |
|---|---|---|---|---|---|---|
| P3-1 | CSS 合并/死代码 | 合并渲染阻塞 CSS，删死代码/乱码注释 | 前端 | P2-6 | M | 无渲染阻塞 CSS、无死代码；回滚：git revert |
| P3-2 | 设计收口 | 暗色 token/间距/字体一致性复核，`cookie-consent.css` 收口 | 设计·UX | P2-6 | M | 设计评审通过、暗色一致；回滚：设计稿回退 |

---

## 5. 依赖与排序理由

- **先修脚本**：sitemap 由 `generate-sitemap.ps1` 生成，只改 XML 不改脚本必复现 bug → 根因修脚本（P0-3/4）。
- **再清乱码**：页面内容+JSON-LD 须在重交 GSC 前全清，否则爬虫重抓仍是坏页。
- **最后重交**：P0/P1 全就绪后一次性重生 sitemap+GSC 重交，避免反复提交触发质检波动。
- **依赖门**：P1-4 依赖 P0-3/P0-4；P1-5 依赖 P1-4；P2-6 依赖 P2-4；P3 依赖 P2-6。

---

## 6. CI / 回归护栏（阻断级，防再次回归）

| 检查 | 实现 | 验收口径 | 级别 |
|---|---|---|---|
| HTML 非空 + lang + viewport | 构建后扫描所有 HTML（重点 `/en`） | 每文件非空、含 `<html lang>`+viewport | 阻断 |
| JSON-LD 解析 | 抽取 `application/ld+json` 跑 `json.loads` | 214 全通过 | 阻断 |
| 乱码 artifact（GBK oracle） | 扫 `鉂? 鈿? 鈥? 閸 鐐 妞ょ敻娼…` + U+FFFD + 双编码；**显式覆盖 en 目录** | 0 命中 | 阻断 |
| 未闭合标签 lint | HTML 解析校验 | 0 未闭合 | 阻断 |
| 死链检查 | 站内链接爬取 | 0 死链 | 阻断 |
| sitemap 校验 | 校验无 `/index` 幽灵、hreflang 非自引用 | 通过 | 阻断 |
| 构建脚本单测 | 对 `generate-sitemap.ps1` 单测两 bug 不复现 | 通过 | 阻断 |

---

## 7. Go/No-Go 里程碑与放量判定线

| 里程碑 | 结束时状态 | 可放量？ |
|---|---|---|
| Phase 0 完 | 条件 No-Go → EN 恢复、可见故障消除；但收录仍阻断 | 否 |
| Phase 1 完（重生+重交+观察启动） | 条件 Go → 收录重建中 | 否，待收录回升 |
| Phase 2 完 | 合规 Go → GDPR/API/CSP 合规 | 否，待收录确认 |
| Phase 3 完 | 最终 Go | 是 |

**最终"可放量推广"判定线**：
1. P0 + P1 全部消除，CI 连续 **2 周全绿**、0 关键回归；
2. GSC 重交后 **2–4 周内索引数回升至 ≥120/166**（从 ~4/166 起步）；
3. 无新 P0/P1 产生（护栏持续绿）。

---

## 8. Top 优先级行动（最高杠杆）

1. **根因修 `generate-sitemap.ps1`（:47-66, :96）**——一次性消除 sitemap 两 bug，避免手动改 XML 复现。
2. **重建 `en/index.html`**——恢复失效 EN 渠道（产品级故障，当前 `/en` 空白）。
3. **加 GBK oracle 乱码 CI guard**——根治"编码战争"复发，覆盖自动化漏检的 en 页。
4. **修 9 JSON-LD + 加 `json.loads` CI**——消除 9 破裂结构化数据，恢复富结果资格。
5. **加 www→www 301 + 清 12 元数据乱码**——闭合剩余收录阻断。
6. **AdSense 加 Cookie 同意门**——关 GDPR 缺口，解锁 EU 流量安全。
7. **API 安全加固（KV 限速 + toolId 枚举 + POST）**——关数据泄露/N+1，消限速可绕过。
8. **主题切换全站化 + 双 CSS 归一**——消设计债务，统一 UX 与暗色体验。

---

> 本计划由软件工坊 AI 协作生成（主理人汇编 + 产品评审员产出），仅作执行 backlog，未修改任何源文件。关键决策请由工程负责人复核。
