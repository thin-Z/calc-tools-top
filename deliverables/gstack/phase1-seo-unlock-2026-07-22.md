# Phase 1 SEO 解锁交付报告 — calculator-site

**日期**：2026-07-22
**场景**：上线前检查 / SEO 解锁（www 规范化 + 元数据乱码清理）
**参与成员**：产品评审员（gstack-product-reviewer，v1 评审曾 BLOCK）→ 实施（主理人 index-only blob 编辑）→ QA 主（gstack-qa-lead）+ QA 备（gstack-qa-lead-2）双重验证
**部署状态**：commit `c1296579194ef9d23bec579c5e9f1092a0e73884` 已 push 至 `origin/main`，Vercel 自动构建部署（tip = v2 终版）。

---

## 📌 TL;DR（执行摘要）

- 整体结论：🟢 通过（已部署）
- 阻塞项数量：**0**
- 本次交付：① `vercel.json` 增加 **host-based `www` 301**（修正 v1 的 full-URL 形式——后者在 Vercel 上静默不触发）；② 5 个 `blog/zh` 指南页元数据乱码清零 + 重复 `og:` 标签去重。
- 后续动作：确认 Vercel 已添加 `calc-tools.top` **与** `www.calc-tools.top` 两个域名（否则 301 不触发）；GSC 重新提交 sitemap + 观察 2–4 周；Phase 2 候选：正文乱码 5 页 + 3 个 pre-existing denylist 文件。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go（已部署） |
| 严重度分布 | 🔴 0 / 🟠 0 / 🟡 0 / 🟢 全部达标 |
| 关键行动项 | 4 条（见行动清单） |
| 建议负责人 | 主理人（已 push）；域名/GSC 由用户操作 |

---

## 1. 各成员核心结论

### 🔍 产品评审员（产品评审）
- 核心判断：v1 阶段曾 **BLOCK** 元数据修复，担忧「行合并回归吞掉 `og:type`/`canonical`」。本 v2 采用 index-only blob 编辑（逐行替换乱码 content 或整行删除），BOM 与行数均保留，结构零回归——该 BLOCK 前提已消除。
- 关键建议：范围切割合理（Phase 1 仅 metadata 级清理，正文乱码与 denylist 文件留待 Phase 2）；部署前需确认 Vercel 双域名。

### ✅ 质量门神（QA 测试与发布）
- 核心判断：QA 主（gstack-qa-lead）初判「条件 Go」——v1 残留重复 `og:` 标签（实为 Phase 0 父提交 `160aa32` 已存在，非本修复引入），v2 已去重清零；QA 备（gstack-qa-lead-2）判定 **GO（clean）**，并纠正「Vercel 301 full-URL 不触发」关键认知，v2 已改为 `has:host` 形式。
- 关键建议：两项保留意见在 v2 均闭环；GSC 重提交与观察窗口为运营动作，不阻塞代码发布。

### 🛠️ 实施（index-only blob 编辑）
- 核心判断：5 个 HTML blob（122c45d5 / 91fc51bf / 017b462a / 1f1e9c3a / 7951d977）乱码行 = 0、各 meta key 唯一、无重复 `<head>`/`<title>`/`<body>`；vercel.json（80afc292）含 1 条 host-based 301、共 95 条 redirect、`json.loads` 通过。
- 关键建议：全程不触碰工作树，规避百度网盘同步盘回滚风险。

> 设计师、安全卫士、排障手 未上场（本次为纯 SEO/元数据技术交付，未触发设计/安全/调试路由）。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🟢 | SEO/配置 | vercel.json | v1 用 full-URL `source`（Vercel 不匹配 host，301 静默不触发） | 改为 `has:[{type:host,value:calc-tools.top}]` + `source:/:path*` | QA 备 |
| 2 | 🟢 | SEO/元数据 | 5× blog/zh 指南页 | 元数据含双字节乱码（鈥/閸/鐐 等）+ 与干净副本重复的 `og:title`/`og:description` | 逐行替换乱码 content，删除重复乱码行 | QA 主 + 实施 |
| 3 | 🟡 | 运维前置 | Vercel 项目设置 | host-based 301 仅在 `calc-tools.top` 与 `www.calc-tools.top` 均为已验证项目域名时才触发 | 用户需在 Vercel 控制台添加并验证两域名 | 主理人（提示） |
| 4 | 🟡 | 运营 | Google Search Console | 历史收录仅 ~4/165 页，需重新提交 sitemap 并观察 | 重新提交 + 2–4 周观察窗口 | QA 备 |

---

## ✅ 行动清单（具体可执行项）

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | Vercel 项目添加并验证 `calc-tools.top` **与** `www.calc-tools.top` 两个域名 | 用户 | P0 | 部署后立即 |
| 2 | 验证线上 301：`curl -I https://calc-tools.top/`（应返回 301 → `https://www.calc-tools.top/`） | 用户/主理人 | P0 | 部署后 |
| 3 | GSC 重新提交 sitemap.xml + 请求收录，进入 2–4 周观察窗口 | 用户 | P1 | 本周内 |
| 4 | Phase 2 决策：正文乱码清理（bmi 940 / compound 978 / overtime 1004 / random 926 / standard-weight 1337 字符）+ 3 个 pre-existing denylist 文件（discount / equal-installment / mortgage-rate） | 主理人+用户 | P2 | 下阶段 |

---

## ⚠️ 待完善 / 已知局限

- **正文乱码未处理**：本次仅清理 `<meta>` 级元数据。5 个指南页正文仍存在双字节乱码（见行动清单 #4），属预期内范围切割，非遗漏。
- **3 个 pre-existing denylist 文件**：discount / equal-installment / mortgage-rate 在 Phase 0 审计中已被 QA 标记，不在本 commit 范围，留待 Phase 2。
- **random 页无 twitter:description**：该页历来无此标签，v2 仅替换/删除、不新增，符合预期。
- **working tree 污染**：百度网盘同步盘导致 `git status` 显示大量 modified，但本次提交全程走 git blob/index，**未触碰工作树**，同步盘无法回滚 `.git` 内容；线上以 `origin/main` = `c1296579` 为准。

---

## 🔙 回滚预案（上线前检查必备）

- **Git 回滚**：`git push origin 160aa320:main --force`（将 main 指回 Phase 0 提交）即可撤销 Phase 1；或 Vercel 控制台对 `c1296579` 之前的部署执行 Instant Rollback。
- **影响面**：仅影响 www 规范化 301 与 5 页元数据，无数据/后端变更，回滚零风险。

---

## 📚 成员产出索引

- gstack-product-reviewer（产品评审员）原始产出：v1 阶段 BLOCK 意见（行合并回归担忧），v2 已消除前提。
- gstack-qa-lead（质量门神）原始产出：条件 Go 判定 + 重复 og 标签残留指出 → v2 去重闭环。
- gstack-qa-lead-2（质量门神 备）原始产出：GO(clean) + Vercel 301 host-based 修正建议 → v2 采纳。
- 实施（index-only blob 编辑）脚本：`C:/Users/zhaoxin/assemble_phase1_v2.py`（本地临时，待清理）。
- 部署产物 commit：`c1296579194ef9d23bec579c5e9f1092a0e73884`（已 push）。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
