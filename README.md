# calc-tools.top — 工具箱里
> 中英双语在线工具站，纯静态 HTML/CSS/JS，零依赖，隐私优先
> 线上地址：https://calc-tools.top | 风格：Apple 设计语言
---
## 工具清单
### 📐 计算工具（16个）
| 工具 | 说明 |
|------|------|
| 🏔 房贷计算器 | 等额本息/等额本金，含图表对比 |
| 🧵 2026 个税计算器 | 最新个税税率计算 |
| 👤 BMI 计算器 | 身体质量指数计算 |
| 📮 日期计算器 | 日期推算 & 日期差计算 |
| 💵 公积金贷款计算器 | 等额本息还款计算 |
| 🎶 年龄计算器 | 精确年龄计算 |
| 🏷️ 折扣计算器 | 打折价格计算 |
| ⛽ 油耗计算器 | 汽车油耗计算 |
| 💡 电费计算器 | 电器用电费用计算 |
| 👤 标准体重计算器 | 身高体重标准计算 |
| 🏢 加班费计算器 | 加班工资计算 |
| 📻 单位换算器 | 多单位互相转换 |
| 🍼 排卵期计算器 | 女性生理周期计算 |
| 🏟 贷款对比计算器 | 多贷款方案对比 |
| 📈 复利计算器 | 复利投资计算 |
| 🚗 车贷计算器 | 购车贷款计算 |
### 🖼️ 图片工具（5个）
| 工具 | 说明 |
|------|------|
| 📦 图片压缩 | 浏览器本地压缩 JPG/PNG/WebP |
| 🔄 格式转换 | 图片格式互转 |
| ✂️ 裁剪缩放 | 图片裁剪与尺寸调整 |
| 🔤 图片转 Base64 | 图片编码为 Base64 |
| 🎨 取色器 | 屏幕取色与调色板 |
### ✏️ 文字工具（11个）
| 工具 | 说明 |
|------|------|
| 📊 字数统计 | 字数、字符、段落统计 |
| 🔠 大小写转换 | 英文大小写转换 |
| 🎯 JSON 格式化 | JSON 格式化/压缩/校验 |
| 🔄 Base64 编解码 | Base64 编码解码 |
| 🌐 URL 编解码 | URL 编码解码 |
| 🧹 文本清理 | 去除多余空格空行 |
| 📝 HTML 剥离 | 去除 HTML 标签 |
| 📋 文本对比 | 文本差异对比 |
| 🔑 UUID 生成器 | 批量 UUID 生成 |
| ⏱ 阅读时间 | 文章阅读时间估算 |
| 🔍 关键词密度 | 关键词密度分析 |
---
## 技术架构
| 项目 | 选型 |
|------|------|
| 前端 | 纯 HTML + CSS + JS，零依赖 |
| 字体 | Inter (Google Fonts) |
| 图表 | Chart.js CDN |
| 图片处理 | Canvas API（本地处理，不上传）|
| 部署 | GitHub → Vercel |
| 域名 | calc-tools.top |
| 国际化 | URL 路径 /zh/ /en/ 分离 |
## 项目结构
```
└─── index.html              # 首页（中文）
└─── /zh/                    # 中文工具（35页）
│   └─── index.html
│   └─── about.html          # 关于我们
│   └─── contact.html        # 联系我们
│   └─── privacy.html        # 隐私政策
│   └─── /calculators/        # 16 计算器
│   └─── /image/             # 5 图片工具
│   └─── /text/              # 11 文字工具
└─── /en/                    # 英文工具（22页）
│   └─── index.html / about.html / contact.html / privacy.html
│   └─── /calculators/        # 16 计算器
│   └─── /image/             # 5 图片工具
│   └─── /text/              # 11 文字工具

└─── /blog/zh/               # 33 篇中文博客（含 index.html）
└─── /blog/en/               # 33 篇英文博客（含 index.html）
└─── /css/
│   └─── style.css           # 全局基础样式
│   └─── site.css            # 站点组件样式
│   └─── text-tools.css      # 文字工具样式
│   └─── cookie-consent.css  # Cookie 同意弹窗
└─── /js/
│   └─── site.js             # 首页交互 + 博客分页/筛选/阅读进度条
│   └─── like.js             # 点赞功能
│   └─── i18n.js             # 国际化
│   └─── api-client.js        # API 客户端
│   └─── cookie-consent.js   # Cookie 同意
│   └─── calculators/        # 16 计算器
│   └─── image-tools/        # 5 图片工具
│   └─── text-tools/         # 11 文字工具
└─── /api/likes.js          # Vercel Serverless Function — 点赞 API (Upstash Redis)
└─── /api/clicks.js          # Vercel Serverless Function — 点击量 API (Upstash Redis)
└─── /assets/               # 图标、Logo
└─── /scripts/              # 部署脚本
└─── /docs/                 # 存档文档（含 README 说明）
└─── vercel.json / _headers / _redirects / robots.txt / sitemap.xml
└─── 404.html
```

## SEO 配置

### 结构化数据

| 类型 | 覆盖范围 | 说明 |
|------|---------|------|
| Open Graph | 全站 102 页 | og:title/og:description/og:type/og:url/og:image/og:locale |
| Twitter Card | 全站 102 页 | summary_large_image + twitter:title/twitter:description |
| SoftwareApplication | 64 个工具页 | applicationCategory+operatingSystem 标注 |
| Article | 66 篇博客 | headline+url+description+inLanguage |
| BreadcrumbList | 工具页 | 面包屑导航路径 |
| FAQPage | 部分工具页 | 常见问题 FAQ 结构化 |
| WebSite | 首页 | 站点名称、描述 |
| CollectionPage | 首页 | 工具集列表 + SoftwareApplication 项目 |

### Sitemap

- 文件：`/sitemap.xml`（自动生成，144 条 URL）
- 覆盖：中英文首页、64 个工具页、66 篇博客、9 个关于/联系/隐私页
- 双语：每页均有 xhtml:link hreflang 标注 zh-CN / en / x-default
- 生成脚本：`scripts/generate-sitemap.ps1`（扫描实际文件结构自动生成）

### 站内链接

- 38 个工具页底部增加「相关阅读」区域，链回对应博客文章
- 66 篇博客文章底部有 CTA 按钮链向对应工具
- 注入脚本：`scripts/inject-internal-links.ps1`

### 搜索引擎提交

**Google Search Console**

1. 打开 https://search.google.com/search-console
2. 添加站点 https://www.calc-tools.top（网址前缀方式）
3. 验证域名所有权（DNS TXT 记录 或 HTML 文件验证）
4. 提交 sitemap：`sitemap.xml`

**Baidu 站长平台**

- 已有验证标签（baidu-site-verification: codeva-BFCPLYBA5D）
- 登录 https://ziyuan.baidu.com 添加站点
- 提交 sitemap：`https://www.calc-tools.top/sitemap.xml`

### SEO 标签批量注入脚本

| 脚本 | 用途 |
|------|------|
| `scripts/generate-sitemap.ps1` | 扫描文件结构生成完整 sitemap.xml |
| `scripts/inject-seo-tags.ps1` | 批量注入 OG/Twitter/Schema 标签到所有页面 |
| `scripts/inject-internal-links.ps1` | 批量注入工具↔博客站内链接 |

## 状态

| 项目 | 值 |
|------|-----|
| 工具总数 | **39**（21 计算器 + 12 文字 + 6 图片）/ 语言 × 2 = 78 工具页 |
| 页面总数 | 167（sitemap 166 条 URL） |
| 博客文章 | 76（38 zh + 38 en） |
| 最新提交 | b4777db — 工具排序规则修复（远程改版） |
| Sitemap | 166 条 URL，路径全部匹配实际文件 |
| 点赞/点击量 | Vercel Serverless Functions + Upstash Redis |
| 热门排序 | 全工具综合评分（无类别配额），取前 8 |

## 博客功能

| 功能 | 说明 |
|------|------|
| 卡片网格布局 | 文章以 2 列卡片展示，带悬停动画效果 |
| 分页加载 | 首页/列表页每页 8 篇文章，"加载更多"按钮增量加载 |
| 分类筛选 | 按标签筛选文章，筛选时不限分页（展示全部匹配结果） |
| 阅读进度条 | 文章详情页顶部显示阅读进度指示条 |
| 回到顶部 | 文章详情页右下角回到顶部按钮 |
| 标签样式统一 | 首页热门工具标签 + 博客标签共用 `tag-tools` 样式，适配亮/暗色模式 |
| 编码修复 | 已修复 blog/zh 和 blog/en 的 GBK 编码问题 |
| 暗色模式适配 | 博客页全文区域使用 CSS 变量，与全局深色模式切换联动 |

### Commit 记录

| commit | 说明 |
|--------|------|
| **318ad22** | feat: blog card layout, pagination, dark mode, tag unification & hot-tool icons |
| f068bc0 | docs: fix deployment platform (Vercel, not Cloudflare Pages) |
| 529bd2c | docs: update README with latest stats (66 blogs, 32 tools, Cloudflare Pages) |
| 0b4499c | feat: auto-update homepage when generating blog posts |
| d85021c | fix: add 21 missing blog entries to homepage tool guide section |
| 1889f7f | feat: optimize tool guide module with cross-linking, CTA, breadcrumbs & related posts |
| 4bbca1d | content: add 21 blog posts × 2 languages = 42 pages covering all tool gaps |
| 46801e6 | SEO: sitemap重构 + OG标签 + Schema结构化数据 + 站内链接 |
| 064bb08 | feat: 热门工具全工具排序、全局点击量、热度值展示 |
| 0cdf279 | fix: 热门工具双计数修复 -- updateClickUI 限定范围 |
| cd87b8f | fix: 恢复 Vercel Serverless Function，新增点击量 API |
| 09d1998 | chore: 知识库结构优化，移除 docs 追踪 |
| d0d2c82 | fix: U+FFFD 编码修复 + 编码保护体系 |
| e673cda | fix: 热门工具点击数 + script + CSS + 暗色模式 |
| 69cfec3 | fix: 热门工具样式 -- 描述/标签/图标颜色 |
| d9a27e7 | feat: 隐私政策/关于/联系 + Cookie 同意 |
| 50d253b | docs: update README for Vercel + Upstash Redis, click tracking, hot score |
