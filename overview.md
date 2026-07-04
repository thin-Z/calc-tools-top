# 站点全面扫描报告

> 扫描时间: 2026-07-05 00:05 | 工具: 36 个 | 博客: 70 篇 | 总页数: ~170

---

## ✅ 已修复的问题（本轮）

| # | 问题 | 严重度 | 修复 |
|---|------|--------|------|
| 1 | `base64-encode.js` 引用不存在 → 实际文件是 `base64.js` | 🔴 **致命** | 已修复，2 个文件 |
| 2 | 新工具缺少 vercel.json 重定向（旧URL路径兼容） | 🟡 中等 | 已修复，8 条重定向 |

## 📋 发现的优化点

### 🔴 关键
- **暂无** — 未发现致命性错误

### 🟡 建议修复

| # | 问题 | 影响 | 说明 |
|---|------|------|------|
| 1 | **159 个 HTML 文件含 UTF-8 BOM** | 低 | BOM 不影响现代浏览器，但增加文件大小（每文件~3字节），部分工具可能报 Warning |
| 2 | **工具页面内部链接使用 `.html` 扩展名** | 低 | 如 `href="/zh/calculators/discount.html"`，Vercel cleanUrls 自动处理但多一次 308 跳转 |
| 3 | **新博客未在 blog/zh|en/index.html 注册** | 低 | 博客首页靠 JS 渲染，但静态列表缺少新文章条目 |
| 4 | **CSS 有重复的暗色模式规则** | 低 | site.css 中 .like-btn dark mode 样式有重复定义 |

### 🟢 性能/体验优化建议

| # | 优化项 | 预期收益 | 难度 |
|---|--------|---------|------|
| 1 | **合并 CSS 文件** (style.css + site.css + text-tools.css + cookie-consent.css) | 减少 HTTP 请求数 | 低 |
| 2 | **对字体和 qrcode.js CDN 使用 preconnect/preload** | 加快加载速度 | 低 |
| 3 | **图片工具页增加 Service Worker 离线支持** | 图片处理是 PWA 好场景 | 中 |
| 4 | **减少 version 号更新频率** (site.js?v=18 → 用内容 hash) | 避免不必要的 CDN 回源 | 低 |
| 5 | **热门工具 URL 使用 clean URL**（当前用了 /zh/ovulation.html） | 统一 URL 风格 | 低 |

### 📈 内容策略建议

| # | 建议 | 理由 |
|---|------|------|
| 1 | **为新 4 个工具各写一篇博客** | 已有代码预留了链接，内容准备就绪 |
| 2 | **新增 1-2 个高流量工具**：汇率换算、科学计算器 | 搜索量大，填补空白 |
| 3 | **考虑添加 "工具推荐" 或 "本周热门" 模块** | 提高用户粘性和 PV |

---

## 📊 站点数据

| 指标 | 数值 |
|------|------|
| HTML 页面总数 | ~170 |
| JS 文件数 | 35 |
| CSS 文件数 | 4 |
| 总代码量（不算 node_modules） | ~3.5MB |
| 第三方 CDN 依赖 | Chart.js, qrcode.js, Google Fonts(Inter), Google AdSense |
| 后端依赖 | Vercel Serverless (2 个 API) + Upstash Redis |
