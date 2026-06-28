# 视觉优化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [x]`）语法来跟踪进度。

**目标：** 将 calc-tools.top 的视觉风格升级为现代 Apple 风格——Inter 字体、新色彩体系、16px 圆角组件、毛玻璃 header、交互动效。

**架构：** 纯 CSS 改造，不改变 HTML 结构（只添加 Inter 字体 CDN 引用）。所有工具页、博客页通过全局 CSS 自动继承新样式。

**技术栈：** CSS custom properties + Google Fonts Inter + CSS transitions/keyframes

**参考规格：** `docs/优化记录/2026-06-28-视觉优化设计规格.md`

---

### 任务 1：引入 Inter 字体

**文件：**
- 修改：`index.html:6`（zh）
- 修改：`en/index.html:6`（en）

- [x] **步骤 1：在 zh index.html 中添加 Inter 字体引用**

在 `<head>` 中 `</title>` 之后添加：
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [x] **步骤 2：在 en/index.html 中添加相同的 Inter 字体引用**

同步骤 1，在英文版的 `<head>` 中添加。

---

### 任务 2：重构 CSS 变量体系

**文件：**
- 修改：`css/style.css:1-60` — 色彩变量 + 字号变量 + 全局过渡

- [x] **步骤 1：替换 CSS custom properties（浅色模式）**

将现有 `:root {}` 中的变量替换为：
```css
:root {
  /* Brand Colors */
  --brand-blue: #007AFF;
  --brand-purple: #5856D6;
  --brand-orange: #FF9500;
  --brand-green: #34C759;

  /* Neutrals */
  --bg: #F5F5F7;
  --bg-card: #FFFFFF;
  --bg-surface: #F8F8FA;
  --border: #E8E8ED;
  --text-primary: #1D1D1F;
  --text-secondary: #86868B;
  --text-tertiary: #98989D;

  /* Component */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 999px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 12px 30px rgba(0,0,0,0.08);

  /* Font */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
```

- [x] **步骤 2：更新暗色模式变量**

替换 `[data-theme="dark"]` 中的变量：
```css
[data-theme="dark"] {
  --brand-blue: #0A84FF;
  --bg: #000000;
  --bg-card: #1C1C1E;
  --bg-surface: #2C2C2E;
  --border: #3A3A3C;
  --text-primary: #F5F5F7;
  --text-secondary: #98989D;
  --text-tertiary: #636366;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
  --shadow-lg: 0 12px 30px rgba(0,0,0,0.3);
}
```

- [x] **步骤 3：设置全局字体 + 过渡**

在 `:root` 后添加：
```css
* { font-family: var(--font-sans); }
*, *::before, *::after {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}
body { background: var(--bg); color: var(--text-primary); }
```

- [x] **步骤 4：更新字号比例**

替换 `h1`, `h2`, `h3`, `p`, 以及 `.section-title` 等全局标题样式为：
```css
h1 { font-size: 32px; font-weight: 700; line-height: 1.15; }
h2 { font-size: 24px; font-weight: 600; line-height: 1.3; }
h3 { font-size: 18px; font-weight: 600; line-height: 1.4; }
body, p { font-size: 15px; line-height: 1.6; }
small, .caption, .text-secondary { font-size: 13px; line-height: 1.5; }
.tag, .badge, .chip { font-size: 11px; }
```

---

### 任务 3：升级工具卡片组件

**文件：**
- 修改：`css/style.css` — 搜索 `.tool-card, .tool-card-wrap` 相关样式
- 修改：`css/site.css` — 卡片相关样式

- [x] **步骤 1：更新工具卡片样式**

找到 `.tool-card` 选择器（可能在 site.css），替换为：
```css
.tool-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  position: relative;
  border: none;
}
.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

- [x] **步骤 2：创建图标容器样式**

在 site.css 中添加图标容器样式（工具卡片内的 icon）：
```css
.tool-card .icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--bg-surface), var(--border));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 12px;
}
```

- [x] **步骤 3：更新工具卡片内的标题和描述**

在 site.css 中更新卡片内的文字样式：
```css
.tool-card h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.tool-card p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 10px;
}
```

---

### 任务 4：升级分类标签 Chip & 标签

**文件：**
- 修改：`css/site.css` — `.category-chip` 和 `.tag-*` 相关样式

- [x] **步骤 1：更新分类芯片样式**

找到 `.category-chip`，替换为：
```css
.category-chip {
  padding: 8px 18px;
  border-radius: var(--radius-full);
  border: none;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  background: #F0F0F0;
  color: #555555;
  cursor: pointer;
  transition: all 0.2s ease;
}
.category-chip:hover {
  background: #E5E5EA;
  transform: scale(1.05);
}
.category-chip.active {
  background: linear-gradient(135deg, var(--brand-blue), #0056CC);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,122,255,0.3);
}
```

- [x] **步骤 2：暗色模式 Chip 适配**

在 `[data-theme="dark"]` 区域添加：
```css
[data-theme="dark"] .category-chip {
  background: #3A3A3C;
  color: #98989D;
}
[data-theme="dark"] .category-chip.active {
  background: linear-gradient(135deg, var(--brand-blue), #0056CC);
  color: #fff;
}
```

---

### 任务 5：升级搜索框

**文件：**
- 修改：`css/site.css` — 搜索框相关样式

- [x] **步骤 1：搜索框毛玻璃 + 聚焦发光**

找到搜索框样式，替换为：
```css
.search-box input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--border);
  font-family: var(--font-sans);
  font-size: 15px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  outline: none;
  transition: all 0.2s ease;
}
.search-box input:focus {
  border-color: var(--brand-blue);
  box-shadow: 0 0 0 3px rgba(0,122,255,0.15);
}
```

- [x] **步骤 2：暗色模式搜索框**

在暗色区域添加：
```css
[data-theme="dark"] .search-box input {
  background: rgba(28,28,30,0.8);
  color: var(--text-primary);
}
[data-theme="dark"] .search-box input:focus {
  box-shadow: 0 0 0 3px rgba(10,132,255,0.25);
}
```

---

### 任务 6：升级点赞按钮

**文件：**
- 修改：`css/style.css` 或 `css/site.css` — `.like-btn` 样式

- [x] **步骤 1：更新点赞按钮为 pill 样式 + 心动画效**

找到 `.like-btn` 样式，替换为：
```css
.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.like-btn:hover {
  border-color: #FF6B6B;
  color: #EF4444;
  background: #FFF5F5;
}
.like-btn.liked {
  border-color: #EF4444;
  color: #EF4444;
  background: #FFF5F5;
}
```

- [x] **步骤 2：添加点赞心形弹出动画**

在 CSS 文件中添加：
```css
@keyframes heartPop {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(0.9); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

- [x] **步骤 3：在 js/site.js 的 toggleLike 函数触发动画**

在 `toggleLike` 函数的 `updateLikeUI` 调用之前添加：
```javascript
// 在 toggleLike 函数中找到对应 btn 元素并触发动画
var btn = document.querySelector('[data-like-id="' + toolId + '"] .heart');
if (btn) {
  btn.style.animation = 'none';
  void btn.offsetWidth;
  btn.style.animation = 'heartPop 0.4s ease';
}
```

---

### 任务 7：升级热门工具卡片

**文件：**
- 修改：`css/site.css` — `.hot-tool-card` 相关样式

- [x] **步骤 1：更新热门工具卡片样式**

更新 `.hot-tool-card` 及其子元素的样式：
```css
.hot-tool-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1.5px solid #FEF3C7;
  position: relative;
  transition: all 0.3s ease;
}
.hot-tool-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: #FBBF24;
}
.hot-tool-card .hot-badge {
  position: absolute;
  top: -1px;
  left: -1px;
  background: linear-gradient(135deg, #F59E0B, #EF4444);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-xl) 0 var(--radius-xl) 0;
}
```

- [x] **步骤 2：添加热门工具入场动画**

在 `js/site.js` 的 `initHotTools` 函数末尾（设置 innerHTML 后），添加交错入场：
```javascript
// 热门工具卡片交错入场动画
var hotCards = grid.querySelectorAll('.hot-tool-card');
hotCards.forEach(function(card, i) {
  card.style.opacity = '0';
  card.style.transform = 'translateY(10px)';
  setTimeout(function() {
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '1';
    card.style.transform = '';
  }, i * 100);
});
```

---

### 任务 8：Header 毛玻璃效果

**文件：**
- 修改：`css/style.css` — header 相关样式

- [x] **步骤 1：更新 header 样式为毛玻璃**

找到 header 相关选择器，添加毛玻璃效果：
```css
header {
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  z-index: 100;
}
```

- [x] **步骤 2：暗色模式 header**

在 `[data-theme="dark"]` 中添加：
```css
[data-theme="dark"] header {
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(20px);
  border-bottom-color: rgba(255,255,255,0.06);
}
```

---

### 任务 9：按钮点击缩放反馈

**文件：**
- 修改：`css/style.css` — 通用按钮样式

- [x] **步骤 1：添加按钮 active 缩放**

在 style.css 中找到 `.btn` 或通用的按钮样式，添加：
```css
button:active, .btn:active {
  transform: scale(0.95);
}
```

---

### 任务 10：更新 cachebuster + 清理

**文件：**
- 修改：`index.html` — 更新 site.js 和 site.css 版本号
- 修改：`en/index.html` — 同上

- [x] **步骤 1：更新 cachebuster**

```html
<!-- site.js 版本号 +1 -->
<script src="js/site.js?v=[当前+1]" defer></script>
<!-- 如有 site.css 版本号，也 +1 -->
```

- [x] **步骤 2：Commit**

```bash
git add css/style.css css/site.css js/site.js index.html en/index.html
git commit -m "style: modern visual refresh - Inter font, new colors, glass header, animations"
```

---

### 任务 11：线上验证

- [x] **步骤 1：推送至 GitHub（REST API 或 git push）**

使用 Node.js fetch → GitHub REST API（或 git push）推送到 main 分支。

- [x] **步骤 2：等待 Cloudflare Pages 部署**

等待 30-60 秒让 Cloudflare Pages 自动构建部署。

- [x] **步骤 3：打开线上站点验证**

检查以下项目：
- [x] 首页工具卡片 16px 圆角 + hover 上浮
- [x] 分类 Chip 渐变活跃态 + hover 放大
- [x] 搜索框聚焦蓝色发光
- [x] 点赞按钮 pill 样式 + 点击动画
- [x] 热门工具卡片新样式 + 入场动画
- [x] Header 毛玻璃效果
- [x] 暗色模式正常切换
- [x] 工具详情页输入框样式
- [x] 博客文章页面样式
