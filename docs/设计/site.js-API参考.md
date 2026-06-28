# site.js API 参考文档

**创建日期**: 2026-06-28 | **版本**: v=16（最新）
**文件位置**: `calculator-site/js/site.js`
**相关文档**: [[使用说明书]] | [[建站方法论总结]]

---

## 一、概述

`site.js` 是 calc-tools.top 的核心交互脚本，负责首页的全部动态功能。约 770 行，零外部依赖，原生 ES5/ES6 混合写法。

**初始化顺序**（`DOMContentLoaded`）：
```
initLikes() → initCategoryFilters() → initSearch() → initTagClicks()
→ initArticleLikes() → initToolSort() → initBlogPagination()
→ initHotTools() → initArticleClicks() → initClickTracking()
→ 暗色模式自执行函数
```

---

## 二、全局配置

### SITE_CONFIG

```javascript
const SITE_CONFIG = {
  categories: [
    { id: "all",  label: { zh: "全部", en: "All" } },
    { id: "finance", label: { zh: "财务", en: "Finance" }, icon: "💰" },
    { id: "health", label: { zh: "健康", en: "Health" }, icon: "🏥" },
    { id: "life", label: { zh: "生活", en: "Lifestyle" }, icon: "🏠" },
    { id: "shopping", label: { zh: "购物", en: "Shopping" }, icon: "🛒" },
    { id: "travel", label: { zh: "出行", en: "Travel" }, icon: "🚗" },
    { id: "utility", label: { zh: "工具", en: "Utility" }, icon: "🔧" },
    { id: "image", label: { zh: "图片", en: "Image" }, icon: "🖼️" },
    { id: "text", label: { zh: "文字", en: "Text" }, icon: "✏️" }
  ],
  tools: [
    // 32 个工具条目，每个包含 { id, categories: [...] }
  ]
};
```

### 分页常量

| 常量 | 值 | 用途 |
|------|-----|------|
| `PAGE_SIZE` | 10 | 首页工具卡片分页 |
| `BLOG_PAGINATION_KEY` | "blog_page" | sessionStorage 博客页码 key |

---

## 三、localStorage 键值对照表

| Key | 存储内容 | 读写函数 | 数据类型 |
|-----|---------|---------|---------|
| `toolbox_likes` | 点赞数据 | `getLikes() / saveLikes()` | `{ toolId: 0\|1 }` |
| `toolbox_clicks` | 点击统计数据 | `getClicks() / saveClicks()` | `{ toolId: { total: number, daily: { "YYYY-MM-DD": number } } }` |
| `toolbox_search_terms` | 搜索热词数据 | `getSearchTerms() / saveSearchTerms()` | `{ term: count }`（保留前30）|
| `theme-preference` | 暗色模式偏好 | 暗色模式自执行函数 | `"dark"` 或 `"light"` |
| `preselectCategory` | 标签点击跳转预选分类 | `initCategoryFilters()` | sessionStorage，用完即删 |

---

## 四、函数详解

### 4.1 点赞系统

| 函数 | 说明 |
|------|------|
| `getLikes()` | 读取点赞数据，返回 `{}` 兜底 |
| `saveLikes(likes)` | 写入 localStorage |
| `getTotalLikes(toolId)` | 获取工具点赞数（0/1） |
| `toggleLike(toolId)` | 切换点赞状态（0↔1） |
| `updateLikeUI(toolId)` | 更新页面中所有 `[data-like-id]` 按钮的样式和计数 |
| `initLikes()` | 绑定首页工具卡片 `.like-btn` 点击事件 |

**注意**: 首页使用 site.js 的点赞，详情页使用独立 `like.js`，两者共享同一个 `toolbox_likes` key。

### 4.2 点击统计系统

| 函数 | 说明 |
|------|------|
| `getClicks()` | 读取点击数据，含旧格式自动迁移逻辑 |
| `saveClicks(clicks)` | 写入 localStorage |
| `getTodayStr()` | 获取今天日期字符串 `YYYY-MM-DD` |
| `incrementClick(toolId)` | 增加工具点击次数（total +1，今日 +1） |
| `getDailyClicks(toolId)` | 获取工具每日点击明细 |
| `getTodayClickCount(toolId)` | 获取今日点击次数 |
| `getTotalClicks(toolId)` | 获取总点击次数 |
| `getTrendLabel(toolId)` | 计算趋势标签：`"hot"` / `"up"` / `""` |

**趋势算法**:
- `hot`: 今日点击 ≥ 日均点击的 2 倍 → 显示 🔥 今日热门
- `up`: 近 3 天日均 ≥ 前 3 天日均的 1.5 倍 → 显示 📈 上升中
- 超过 7 天无活动 → 不显示标签

### 4.3 搜索热词

| 函数 | 说明 |
|------|------|
| `getSearchTerms()` | 读取搜索热词数据 |
| `saveSearchTerms(terms)` | 写入（保留前30个） |
| `recordSearchTerm(term)` | 记录搜索词（输入≥2字符，停顿500ms后） |
| `getHotSearchTerms(maxCount)` | 获取 Top N 热词 |

### 4.4 UI 渲染

| 函数 | 说明 |
|------|------|
| `renderTrendBadges()` | 遍历工具卡片，渲染趋势标签（🔥 今日热门 / 📈 上升中） |
| `renderUsageCounts()` | 遍历工具卡片，在描述下方显示 "已使用 X 次" |
| `initClickTracking()` | 绑定工具卡片的点击追踪事件（incrementClick + 跳转） |
| `renderHotSearch(searchInput)` | 渲染搜索框下方的热词列表 |

### 4.5 分类与搜索

| 函数 | 说明 |
|------|------|
| `initCategoryFilters()` | 初始化分类过滤 Chip，含 preselectCategory 预选逻辑 |
| `filterTools(category)` | 按分类过滤工具网格，含淡出淡入 animation |
| `initSearch()` | 初始化搜索功能（模糊匹配 + 清除按钮 + 热词记录） |

### 4.6 首页功能

| 函数 | 说明 |
|------|------|
| `initToolSort()` | 按热度排序工具网格（点击次数高的靠前） |
| `initHotTools()` | 渲染"热门工具"区域（综合评分 Top 8，含排名 badge） |
| `initBlogPagination()` | 博客分页（首页显示 6 篇，其余"加载更多"） |
| `initArticleLikes()` | 博客文章点赞绑定 |
| `initArticleClicks()` | 博客文章整行可点击跳转 |
| `initTagClicks()` | 标签点击跳转到首页并自动过滤分类 |

### 4.7 暗色模式

```javascript
// 自执行函数
// 1. 检查 localStorage 'theme-preference'
// 2. 若无则检测 prefers-color-scheme
// 3. 设置 data-theme 属性 + 切换 ☀️/🌙 图标
// 4. 点击 #theme-toggle 切换 + localStorage 持久化
```

---

## 五、HTML data 属性约定

| 属性 | 元素 | 用途 |
|------|------|------|
| `data-category` | `.tool-card`, `.article-item` | 分类标识（逗号分隔多分类） |
| `data-like-id` | `.like-btn` | 点赞目标工具 ID |
| `data-tool-id` | `.tool-card-wrap` | 点击统计目标工具 ID |
| `data-tag` | `.tag` | 标签分类 ID，点击跳转首页过滤 |
| `data-blog-id` | `.article-like` | 文章点赞目标 ID |
| `data-theme` | `<html>` | 暗色模式状态（dark / light）|
| `lang` | `<html>` | 语言标识（zh-CN / en）|

---

## 六、CSS 类名约定

| 类名 | 用途 | 动态控制 |
|------|------|---------|
| `.filtered-out` | 被搜索/分类过滤隐藏的卡片 | JS 添加/移除 |
| `.liked` | 已点赞状态 | JS 添加/移除 |
| `.active` | 当前活跃的 category-chip | JS 添加/移除 |
| `.visible` | 显示状态（搜索清除按钮、无结果提示） | JS 添加/移除 |
| `.trend-hot` | 🔥 今日热门标签 | JS 添加 |
| `.trend-up` | 📈 上升中标签 | JS 添加 |
| `.hot-search` | 搜索热词容器 | JS 控制 display |
| `.no-results` | 搜索无匹配提示 | JS 控制 display |

---

## 七、版本追踪

| site.js 版本 | 变更说明 |
|-------------|---------|
| v=16（当前） | 暗色模式、视觉优化、cachebuster 更新 |
| v=15 | 工具卡片视觉升级（分类图标、内嵌标签） |
| v=9 | 语法修复、博客分页 BLOG_PAGE_SIZE、移除孤立条目 |
| v=8 | 点击统计 + 趋势标签 + 搜索热词 |
| 更早版本 | MVP 基础功能 |

> 修改 site.js 后必须更新 `index.html` 和 `en/index.html` 中的 `?v=` 版本号。
