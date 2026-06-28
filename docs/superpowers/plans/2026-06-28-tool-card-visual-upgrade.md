# 工具卡片视觉升级 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 calc-tools.top 的工具卡片升级为方案 B Apple 风格——分类色图标、内嵌分类标签、更细腻的阴影和边框。

**架构：** CSS 类驱动（根据分类添加 `.icon-finance` 等类名），不改变 HTML 结构。JS 渲染逻辑增加分类标签输出。所有工具页通过全局 CSS 自动继承。

**技术栈：** CSS custom properties + CSS 类 + site.js 渲染逻辑微调

**参考规格：** `docs/优化记录/2026-06-28-工具卡片视觉升级设计规格.md`

---

### 任务 1：添加图标分类 CSS 类

**文件：**
- 修改：`css/style.css` — 在 `.tool-card .icon` 样式块附近添加

- [ ] **步骤 1：在 style.css 中添加分类色图标类**

在 `.tool-card .icon {}` 块之后添加以下 CSS：

```css
/* Icon category colors */
.tool-card .icon.icon-finance { background: linear-gradient(135deg, #EEF2FF, #4F46E5); color: #fff; }
.tool-card .icon.icon-health { background: linear-gradient(135deg, #F0FDF4, #16A34A); color: #fff; }
.tool-card .icon.icon-life { background: linear-gradient(135deg, #FEFCE8, #CA8A04); color: #fff; }
.tool-card .icon.icon-shopping { background: linear-gradient(135deg, #FDF2F8, #DB2777); color: #fff; }
.tool-card .icon.icon-travel { background: linear-gradient(135deg, #F0F9FF, #0284C7); color: #fff; }
.tool-card .icon.icon-utility { background: linear-gradient(135deg, #F5F3FF, #7C3AED); color: #fff; }
.tool-card .icon.icon-image { background: linear-gradient(135deg, #ECFDF5, #059669); color: #fff; }
.tool-card .icon.icon-text { background: linear-gradient(135deg, #FFF7ED, #EA580C); color: #fff; }
```

- [ ] **步骤 2：添加深色模式下的分类色图标**

在 `[data-theme="dark"]` 块中添加：

```css
[data-theme="dark"] .tool-card .icon.icon-finance { background: linear-gradient(135deg, #312E81, #6366F1); }
[data-theme="dark"] .tool-card .icon.icon-health { background: linear-gradient(135deg, #14532D, #22C55E); }
[data-theme="dark"] .tool-card .icon.icon-life { background: linear-gradient(135deg, #713F12, #EAB308); }
[data-theme="dark"] .tool-card .icon.icon-shopping { background: linear-gradient(135deg, #831843, #EC4899); }
[data-theme="dark"] .tool-card .icon.icon-travel { background: linear-gradient(135deg, #0C4A6E, #38BDF8); }
[data-theme="dark"] .tool-card .icon.icon-utility { background: linear-gradient(135deg, #4C1D95, #8B5CF6); }
[data-theme="dark"] .tool-card .icon.icon-image { background: linear-gradient(135deg, #064E3B, #10B981); }
[data-theme="dark"] .tool-card .icon.icon-text { background: linear-gradient(135deg, #7C2D12, #F97316); }
```

---

### 任务 2：升级卡片容器阴影和边框

**文件：**
- 修改：`css/style.css` — `.tool-card-wrap` 和 `.tool-card` 样式

- [ ] **步骤 1：更新卡片容器边框和阴影**

找到 `.tool-card-wrap` 选择器，修改为：
```css
.tool-card-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--bg-card);
    border: 1px solid rgba(0,0,0,0.04);
    border-radius: var(--radius-xl);
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04);
    transition: box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

- [ ] **步骤 2：更新 hover 阴影**

找到 `.tool-card-wrap:hover`，修改为：
```css
.tool-card-wrap:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 12px 30px rgba(0,0,0,0.06);
    transform: translateY(-4px);
}
```

- [ ] **步骤 3：添加深色模式卡片边框**

在 `[data-theme="dark"]` 块中添加或更新：
```css
[data-theme="dark"] .tool-card-wrap {
    border-color: rgba(255,255,255,0.06);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.2);
}
```

---

### 任务 3：添加分类标签样式

**文件：**
- 修改：`css/site.css` — 新增 `.tool-tags` 和 `.tag-*` 样式

- [ ] **步骤 1：添加标签容器和基础样式**

在 `site.css` 末尾附近添加（在 `/* ===== Tags ===== */` 区域下）：

```css
/* ===== Tool Card Tags ===== */
.tool-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    padding: 8px 24px 12px 24px;
}
.tool-tags .tag {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 999px;
    line-height: 1.4;
    display: inline-block;
}
.tag-finance { background: #EEF2FF; color: #4F46E5; }
.tag-health { background: #F0FDF4; color: #16A34A; }
.tag-life { background: #FEFCE8; color: #CA8A04; }
.tag-shopping { background: #FDF2F8; color: #DB2777; }
.tag-travel { background: #F0F9FF; color: #0284C7; }
.tag-utility { background: #F5F3FF; color: #7C3AED; }
.tag-image { background: #ECFDF5; color: #059669; }
.tag-text { background: #FFF7ED; color: #EA580C; }
```

- [ ] **步骤 2：添加深色模式标签样式**

在 `[data-theme="dark"]` 块中添加：
```css
[data-theme="dark"] .tag-finance { background: rgba(99,102,241,0.15); color: #A5B4FC; }
[data-theme="dark"] .tag-health { background: rgba(34,197,94,0.15); color: #86EFAC; }
[data-theme="dark"] .tag-life { background: rgba(234,179,8,0.15); color: #FDE047; }
[data-theme="dark"] .tag-shopping { background: rgba(236,72,153,0.15); color: #F9A8D4; }
[data-theme="dark"] .tag-travel { background: rgba(56,189,248,0.15); color: #7DD3FC; }
[data-theme="dark"] .tag-utility { background: rgba(139,92,246,0.15); color: #C4B5FD; }
[data-theme="dark"] .tag-image { background: rgba(16,185,129,0.15); color: #6EE7B7; }
[data-theme="dark"] .tag-text { background: rgba(249,115,22,0.15); color: #FDBA74; }
```

---

### 任务 4：升级热门工具卡片图标

**文件：**
- 修改：`css/site.css` — `.hot-tool-card .tool-card .icon` 样式

- [ ] **步骤 1：更新热门图标为 Amber 渐变**

找到 `.hot-tool-card .tool-card .icon` 选择器，修改为：
```css
.hot-tool-card .tool-card .icon {
    font-size: 1.8rem;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #FFFBEB, #F59E0B);
    border-radius: 12px;
    padding: 10px;
    color: #fff;
}
```

- [ ] **步骤 2：添加深色模式热门图标**

在 `[data-theme="dark"]` 块中添加：
```css
[data-theme="dark"] .hot-tool-card .tool-card .icon {
    background: linear-gradient(135deg, #451A03, #D97706);
}
```

---

### 任务 5：更新 JS 渲染逻辑

**文件：**
- 修改：`js/site.js` — `initTools()` 函数中的卡片渲染

- [ ] **步骤 1：找到 initTools 中的图标渲染位置**

在 `site.js` 中，找到 `initTools()` 函数中渲染 icon 的行。当前大致为：
```javascript
html += '<div class="icon">' + icon + '</div>';
```

改为：
```javascript
var iconClass = "icon";
if (entry.category && entry.category.length > 0) {
    iconClass += " icon-" + entry.category[0];
}
html += '<div class="' + iconClass + '">' + icon + '</div>';
```

- [ ] **步骤 2：在卡片渲染中追加分类标签**

找到 `initTools()` 中卡片内容的末尾（`html += '</a>'` 之前），添加：
```javascript
if (entry.category && entry.category.length > 0) {
    html += '<div class="tool-tags">';
    entry.category.forEach(function(cat) {
        var catKey = prefix === '/' ? cat : cat + '_en';
        var catName = catTexts[catKey] || cat;
        html += '<span class="tag tag-' + cat + '">' + catName + '</span>';
    });
    html += '</div>';
}
```

---

### 任务 6：更新缓存版本号

**文件：**
- 修改：`index.html`
- 修改：`en/index.html`

- [ ] **步骤 1：zh/index.html 更新 cachebuster**

更新 `site.css?v=` 和 `site.js?v=` 版本号 +1（当前 v=7 / v=15 → v=8 / v=16）

- [ ] **步骤 2：en/index.html 更新 cachebuster**

同上。

---

### 任务 7：线上验证

- [ ] **步骤 1：推送至 GitHub**

使用 GitHub REST API 推送，commit message: `style: tool card visual upgrade - category icons, inline tags, refined shadows`

- [ ] **步骤 2：等待 Cloudflare Pages 部署**

等待 30-60 秒。

- [ ] **步骤 3：验证线上效果**

检查以下项目：
- [ ] 卡片阴影更细腻（双层 shadow）
- [ ] 卡片边框更淡（rgba(0,0,0,0.04)）
- [ ] 图标变为分类色渐变（每个分类不同颜色）
- [ ] 分类标签内嵌在卡片底部
- [ ] 深色模式图标/标签颜色适配
- [ ] 热门工具卡片图标 Amber 渐变
- [ ] 暗色模式切换正常
