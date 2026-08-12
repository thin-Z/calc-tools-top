# Phase 2 站点乱码清理交付报告

**日期**：2026-07-22
**场景**：代码审查 + 调试复盘 + QA测试与发布（多成员协作）
**参与成员**：排障手（gstack-investigator）+ 产品评审员（gstack-product-reviewer）+ 实现代理（impl-phase2）+ 质量门神（gstack-qa-lead / gstack-qa-lead-2）

---

## 📌 TL;DR（执行摘要）

- 整体结论：🟢 通过（已部署 `ebaf53f`）
- 真实乱码范围：全站 167 个 .html 中，仅 5 个 `blog/zh` 文件的 `<meta>` 属性值含 PUA/€ 污染双字节乱码；其余 162 文件（含曾被怀疑的 discount/404/index/json-formatter/keyword-density/privacy/about/contact）均干净，属误报。
- 修复方式：以 HEAD(`c1296579`) 为基底，仅将含 PUA/€/U+FFFD 的 `<meta>` 标签整段替换为本地干净快照 `1efe0d78b9` 中同名/同 property 的干净标签（保留 www canonical + 设计包裹 + 正文）。
- 阻塞项数量：0（代码层面）。运维侧 1 项：apex 域名 `calc-tools.top` 尚未在 Vercel 配置，导致 Phase 1 的 www 301 未生效（见已知局限）。
- 下一步：Vercel 添加 apex 域名后 301 即生效；进入 GSC 收录观察窗。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go（已部署 `ebaf53f`） |
| 严重度分布 | 🔴 0 / 🟠 0 / 🟡 0 / 🟢 修复 5 文件 meta 乱码 |
| 关键行动项 | 3 条（Vercel apex 域名、GSC 重交、canonical 统一待办） |
| 建议负责人 | 运维（Vercel 配置）/ 主理人（后续 canonical 统一任务） |

---

## 1. 各成员核心结论

### 🔧 排障手（调试与根因）
- 核心判断：全站权威扫描（`encode('gbk').decode('utf-8')` 全 CJK = 真性乱码）确认——真性乱码仅存在于 5 个 `blog/zh` 文件，且全部为 PUA/€ 污染的 B 类（0% 算法可反转，因 PUA 把 CJK run 碎成 1–3 字碎片，回环必丢字节）。最初认为的"5 个指南页正文 ≈940 字符乱码"是过时数字（指南页正文早在 `7f85f7c` 已被历史纯净版还原，HEAD 已干净）。
- 关键建议：绝不可对干净中文跑 `encode('utf-8').decode('gbk')` 反转（会把正确中文二次破坏）；修复只能走历史还原或策展。编辑须 index-only git blob，不碰工作树。

### 🔍 产品评审员（产品评审）
- 核心判断：**否决"整体还原 5 文件自 `1efe0d78b9`"**。该快照非 HEAD 祖先，快照→HEAD 对这 5 文件 diff 高达 +677/−444，中间 5 个提交（含 `d5157e8` www canonical 统一、`936de56` 设计统一、`160aa32` Phase 0）都改过它们；整体还原会回滚合法 SEO/设计更新，并使 canonical 从 www 退化回非 www。
- 关键建议：改走**外科式逐段替换**（HEAD 基底 + 仅替换 PUA/€ 乱码段），并明确 DoD（5 文件 PUA/€/mojibake=0、`diff --stat` 恰好 5 文件、www canonical 无回退）。canonical 全站统一留给独立任务，本次不批量改。

### 🛠 实现代理（impl-phase2）
- 核心判断：实际定位到污染 **100% 在 `<head>` 的 `<meta>` 属性值**（description/og:title/og:description/twitter:title/twitter:description），且乱码啃掉闭合引号导致标签畸形（如 `content="涔…銆?>"`）；正文 `<body>` 本身干净。故 Phase 2 实质是补全 Phase 1 漏掉的这 5 个文件的 metadata 清洗。
- 关键建议：仅把含 PUA/€/U+FFFD 的 `<meta>` 标签整段替换为快照干净标签，index-only 提交。自检达标：5 文件 PUA/€/U+FFFD/mojibake 全 = 0，`diff HEAD~1 HEAD --stat` = 恰好 5 文件（17 ins/17 del），www canonical 计数一致无回归。commit `ebaf53f`。

### ✅ 质量门神（QA测试与发布）
- 核心判断：独立验收 **Go / 可 push**。逐文件权威判定 5 文件 PUA/€/U+FFFD/真性 mojibake runs 全 = 0（基线 6/17/2/2/7）；`diff --name-only` 恰好 5 文件、其余未动；变更仅 `<meta>` 内容、无结构/canonical 回归；vercel.json 两提交逐字节一致（95 redirects + host 301 保留）；JSON-LD 合法无泄漏。
- 关键建议：可部署。另注 Phase 1 的 www 301 线上未生效为运维配置问题（apex 域名未加 Vercel），非代码问题。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🟢 | 乱码 | 5× `blog/zh/*.html` `<meta>` | PUA/€/U+FFFD 污染双字节乱码，破坏闭合引号 | 已用快照干净标签整段替换 | 排障手/实现/QA |
| 2 | 🟡 | 运维 | Vercel 域名 | apex `calc-tools.top` 未添加/验证，host-based 301 静默不触发 | Vercel Domains 添加并验证 apex | QA |
| 3 | 🟡 | 待办 | 全站 canonical | 62 文件 www / 158 文件非 www 混合，未统一 | 独立 canonical 统一任务，勿批量改 | 产品评审员 |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | Vercel 项目 Domains 添加并验证 `calc-tools.top`（A 记录指向 Vercel），双域名归 Vercel 托管后 www 301 生效 | 老板（运维） | P0 | 部署后即时 |
| 2 | 部署后 `curl -I https://calc-tools.top/` 验证 301 → `https://www.calc-tools.top/` | 老板 / 主理人 | P0 | 域名就绪后 |
| 3 | Google Search Console 重交 sitemap.xml + 申请收录，进入 2–4 周观察窗（GSC 索引量回升关键） | 老板 | P1 | 本周 |
| 4 | 规划独立"canonical 全站统一为 www"任务（影响 158 个非 www 文件，需谨慎评估） | 主理人 | P2 | 观察窗后 |

---

## ⚠️ 待完善 / 已知局限

- **301 未生效（运维）**：Phase 1 的 www 301 代码正确，但 Vercel 仅托管 `www.calc-tools.top`，apex `calc-tools.top` 未配置（实测 apex HTTPS TLS reset，www 200）。需老板在 Vercel 加 apex 域名。
- **canonical 全站统一未做**：本次仅保留既有 www canonical，未统一 158 个非 www 文件（按用户"勿擅自批量改"约束，留给独立任务）。
- **历史前提纠偏**：原 Phase 2 计划的"5 指南页正文 ≈940 字符乱码"为过时数字（指南页正文 `7f85f7c` 已还原）；实际乱码在 5 个其他 blog/zh 文件的 `<meta>`，由本交付修复。
- **同步盘干扰**：百度网盘同步盘会覆盖工作树，全程走 index-only git blob（`read-tree`/`hash-object`/`update-index`/`write-tree`/`commit-tree`/`update-ref`），未触碰工作树，部署以 git 对象为准。

---

## 📚 成员产出索引

- gstack-investigator（排障手）原始产出：全站 167 html 权威扫描，5 文件 PUA/€ 污染 B 类清单 + 干净来源 `1efe0d78b9`。
- gstack-product-reviewer（产品评审员）原始产出：NO-GO 整体还原 + 条件 GO 外科替换方案 + DoD。
- impl-phase2（实现代理）原始产出：外科式 `<meta>` 标签替换落地，commit `ebaf53f5e6fb56d8f386777a933e8e95a1beffe9`，5 blob SHA（equal-installment 18aebb36 / housing-fund 443d9585 / image-compression 3743f394 / mortgage-rate 79e923d5 / tax-deduction f4739f74）。
- gstack-qa-lead-2（质量门神）原始产出：独立验收 Go/可 push，5 文件乱码全清零、diff 恰好 5 文件、canonical 无回归、vercel.json 不变。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
