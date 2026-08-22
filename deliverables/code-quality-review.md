# calculator-site 代码质量与一致性审查报告

**审查人**: Bob (Architect)  
**审查日期**: 2026-08-22  
**项目版本**: commit 8c83224  
**站点**: https://www.calc-tools.top  
**统计**: 178 HTML / 7 core JS / 2 CSS / 1560+ JS lines / 2797 CSS lines

---

## 一、总览评分

| 维度 | 评级 | 说明 |
|------|------|------|
| 文件结构一致性 | ✅ 优 | zh/en 双语文件完全镜像对齐，计算器/图片/文字/博客目录结构一致 |
| 模板统一性 | ✅ 优 | includes/header-{zh,en} + footer-{zh,en} 已归一化，verify-site.mjs 有断言保护 |
| 命名约定一致性 | ✅ 优 | 文件名 kebab-case，CSS变量 --kebab-case，JS函数 camelCase，保持统一 |
| CSS质量 | ✅ 良 | CSS变量体系完善（122个token），暗黑模式支持完整，但有少量硬编码颜色 |
| JS代码质量 | ⚠️ 中 | 功能完整，但 var/const/let 混用，三文件间有重复逻辑 |
| 构建脚本 | ✅ 优 | build.mjs 设计清晰，dist隔离、BOM处理、AdSense注入、版本号注入逻辑健壮 |
| 文档与注释 | ⚠️ 中 | 关键脚本有JSDoc级注释，但calculator JS大多缺乏注释 |
| 代码重复 | ⚠️ 中 | api-client.js / like.js / site.js 存在 localStorage + API 逻辑重复 |

---

## 二、详细问题清单

### P1 - 高优先级（影响一致性/可维护性）

#### P1-1: UTF-8 BOM 不一致（34/178 个文件）
- **严重度**: P1
- **问题**: 34 个 HTML 文件包含 UTF-8 BOM (`\uFEFF`)，144 个没有。分布不规律。
- **涉及文件**: 根目录 (index.html, 404.html, about.html, contact.html, privacy.html)、blog/zh (19/38篇)、en/text (8/12页)、zh/contact|index|privacy
- **影响**: 虽然 build.mjs 和 normalize-template.mjs 已正确处理 BOM，但源码不一致是技术债务。
- **建议**: 统一去除所有 BOM，运行一次全站 BOM 清理脚本。

#### P1-2: api-client.js / like.js / site.js 三重重复
- **严重度**: P1
- **问题**:
  - `LIKE_KEY = 'toolbox_likes'` 在三个文件中重复定义
  - localStorage 读写逻辑在 api-client.js (getLocalLikes/setLocalLikes) 和 like.js (getLikes/saveLikes) 中完全重复
  - API base URL `/api/likes` 在 api-client.js 和 like.js 中各定义一次
  - fetch + AbortController + timeout 逻辑在 api-client.js (apiFetch) 和 like.js (apiPost/apiGet) 中重复实现
  - site.js 又有一套 getLikes/saveLikes 作为 fallback
- **影响**: 修改 localStorage key 或 API 路径需同步改三处，易遗漏。
- **建议**: like.js 已是 "single source of truth"（注释明确声明），应从 api-client.js 移除重复的 localStorage 方法，like.js 优先使用 ApiClient 而非自行 fetch（当前已这样做，但仍有冗余 fallback）。

#### P1-3: `<meta charset>` 位置不规范（~150个文件）
- **严重度**: P1
- **问题**: 多数页面的 `<meta charset="UTF-8">` 出现在 `<head>` 内第 5-7 行，排在 Google Fonts `<link>` 之后。
- **最佳实践**: `<meta charset>` 应为 `<head>` 内第一个子元素（HTML 规范要求在前 1024 字节内）。
- **影响**: 极端情况下，非 UTF-8 编码的字节可能影响后续标签解析。
- **建议**: 在 normalize-template.mjs 中添加 charset 位置校正逻辑，或在所有模板生成器中统一。

#### P1-4: 内联样式使用过多（79/173 个文件）
- **严重度**: P1
- **问题**: 79 个页面使用了 `style=""` 内联样式。
- **典型场景**: `<div class="hot-search" style="display:none;">`（首页工具隐藏元素）、计算器页面的间距/布局微调。
- **影响**: 暗黑模式下内联样式可能覆盖 CSS 变量，且维护成本高。
- **建议**: 将 `display:none` 等模式切换到 CSS 类（如 `.hidden { display: none; }`），逐步消除内联样式。

---

### P2 - 中优先级（代码规范/可改进）

#### P2-1: var / const / let 声明风格不统一
- **严重度**: P2
- **问题**:
  - `site.js`: 143 `var` / 32 `const` / 1 `let`（混合使用）
  - `like.js`: 21 `var` / 0 `const`（全 var，IIFE 严格模式）
  - `api-client.js`: 5 `var`（全 var，IIFE 严格模式）
  - `i18n.js`: 0 `var` / 10 `const` / 2 `let`（现代风格）
  - `theme-toggle.js` / `theme-init.js`: 全 `var`（IIFE 兼容风格）
- **建议**: 项目无需兼容 IE，应统一使用 `const`（不可变）和 `let`（可变），移除 `var`。

#### P2-2: Calculator JS 缺乏文档注释
- **严重度**: P2
- **问题**: `js/calculators/` 下的 20 个文件中，仅 mortgage.js 有 JSDoc 注释，其余如 bmi.js、date-calc.js、age-calc.js 等仅包含裸函数定义，无参数说明、返回值文档。
- **建议**: 至少为每个计算器的主函数添加 `/** @description */` 和 `@returns` 注释。

#### P2-3: CSS 暗黑模式硬编码颜色
- **严重度**: P2
- **问题**: `[data-theme="dark"] .tool-card .icon.icon-finance` 等规则直接使用硬编码 `linear-gradient(135deg, #312E81, #6366F1)` 而非 CSS 变量。
- **影响**: 如需调整暗黑模式品牌色需改 8 处规则。
- **建议**: 将渐变色提取为 CSS 变量（如 `--icon-finance-from` / `--icon-finance-to`）。

#### P2-4: 部分 en/text 页面缺失 like.js
- **严重度**: P2
- **问题**: `en/text/index.html` 和 `en/text/keyword-density.html` 缺少 `<script src="/js/like.js">` 引用。
- **影响**: 这两个页面的点赞按钮无法初始化。
- **建议**: 补充 like.js 引用，或确保 normalize-template.mjs 自动补充。

#### P2-5: 缺少 .editorconfig 配置
- **严重度**: P2
- **问题**: 项目无 `.editorconfig`、`.prettierrc` 或 `.eslintrc` 配置文件。
- **影响**: 不同开发者的编辑器可能产生格式不一致。
- **建议**: 添加 `.editorconfig` 统一缩进（4 spaces for HTML/CSS, 2 for JS）、行尾（LF）、BOM（无）。

---

### P3 - 低优先级（架构建议/优化方向）

#### P3-1: site.js 过大（934 行），可模块化拆分
- **问题**: site.js 承载了工具网格渲染、分类过滤、搜索、点击追踪、热门排序、URL 路由等多个职责。
- **建议**: 拆分为 tool-grid.js、search.js、click-tracker.js 等，通过 `<script defer>` 按需加载。

#### P3-2: i18n.js 翻译 key 与实际 HTML data-i18n 属性覆盖不完全
- **问题**: 173 个页面中仅 38 个使用了 `data-i18n` 属性。部分工具页的静态文本（如按钮 label、结果展示）直接写死中文/英文。
- **建议**: 计算器结果展示区统一使用 `data-i18n` 属性配合 i18n.js 实现运行时切换。

#### P3-3: CSS 文件单文件 77KB / 2797行
- **问题**: 所有样式集中在一个 `style.css` 中，包含 574 个选择器。
- **建议**: 可按功能拆分为 `base.css` + `components.css` + `dark.css` + `pages.css`，但考虑到 Vercel CDN 缓存效果，当前单文件方案也可接受。

#### P3-4: cookie-consent.js 已是空壳但仍被引入
- **问题**: `js/cookie-consent.js` 仅含空 IIFE 注释（2026-08-17 已弃用），但 `css/cookie-consent.css` 仍存在（274 bytes）。
- **建议**: 确认 build.mjs 的 cleanup 逻辑已完全剥离引用后，可安全删除这两个文件。

---

## 三、亮点与良好实践 ✅

1. **模板归一化机制**: `normalize-template.mjs` 以 `includes/` 模板为单一来源，自动替换全站 header/footer，`verify-site.mjs` 断言模板字节一致性——这是一个非常可靠的工程实践。

2. **构建隔离**: build.mjs 使用 `dist/` 目录隔离输出，不污染源码目录，Vercel 每次部署获取全新构建。

3. **CSS 变量体系**: 122 个 CSS 变量覆盖颜色、间距、字体、阴影、z-index，dark mode 通过 `[data-theme="dark"]` 重写变量——这是标准的 Design Token 模式。

4. **双语文件完全对齐**: zh/ 和 en/ 下的文件名、目录结构完全镜像（diff 输出为空），确保双语一致性。

5. **GA4 占位符守卫**: build.mjs 检测 `G-XXXXXXXXXX` 占位符，未替换时自动剥离 GA4 代码避免线上无效请求。

6. **like.js IIFE 封装 + window.LikeSystem API**: 严格的模块化模式，通过 DOMContentLoaded + pageshow 双重初始化确保 SPA 导航兼容。

7. **安全头完善**: vercel.json 配置了 CSP、HSTS、X-Frame-Options 等安全头。

8. **vercel.json 重定向完善**: 301 重定向覆盖了 www/non-www、旧路径迁移、HTML 后缀兼容等场景。

---

## 四、修复优先级排序

| 优先级 | 编号 | 问题 | 修复难度 | 影响范围 |
|--------|------|------|----------|----------|
| P1 | P1-1 | BOM 不一致 | 低（脚本批量清理） | 34 文件 |
| P1 | P1-2 | JS 三重重复逻辑 | 中（需重构 like.js/api-client.js） | 3 文件 |
| P1 | P1-3 | charset 位置 | 低（normalize 脚本修正） | ~150 文件 |
| P1 | P1-4 | 内联样式 | 中（逐步提取到 CSS） | 79 文件 |
| P2 | P2-1 | var/const/let 混用 | 低（全文替换） | 5 核心 JS |
| P2 | P2-2 | Calculator 缺注释 | 低（逐文件补充） | 20 文件 |
| P2 | P2-3 | 暗黑模式硬编码 | 低（提取变量） | 1 CSS |
| P2 | P2-4 | like.js 缺失 | 低（补充引用） | 2 文件 |
| P2 | P2-5 | 无 editorconfig | 低（新增文件） | 全项目 |

---

## 五、总结

calculator-site 整体代码质量**良好**，工程化水平高于同规模静态站点的平均水平。核心优势在于：
- 完善的模板归一化 + 验证机制
- CSS 变量体系的 Design Token 实践
- 双语文件的严格镜像对齐
- 构建脚本的防御性编程（BOM 处理、GA4 占位符守卫）

主要技术债务集中在：
- 三核心 JS 文件的逻辑重复（api-client / like / site）
- 源码中 BOM 和 charset 位置的不一致
- var 与 const/let 混用的代码风格问题

建议按 P1→P2 顺序逐步修复，预计可在 2-3 个迭代内清零 P1 问题。
