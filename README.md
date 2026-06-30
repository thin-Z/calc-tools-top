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
\`\`\`
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

└─── /blog/zh/               # 13 篇中文博客
└─── /blog/en/               # 13 篇英文博客
└─── /css/
│   └─── style.css           # 全局基础样式
│   └─── site.css            # 站点组件样式
│   └─── text-tools.css      # 文字工具样式
│   └─── cookie-consent.css  # Cookie 同意弹窗
└─── /js/
│   └─── site.js             # 首页交互
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
└─── /docs/                 # 设计文档
└─── vercel.json / _headers / _redirects / robots.txt / sitemap.xml
└─── 404.html
\`\`\`

## 核心功能
- **搜索**：实时模糊匹配 + 分类过滤
- **点赞**：Upstash Redis 全局共享 + localStorage 本地缓存降级
- **热门工具**：综合评分 + 排名 badge
- **暗色模式**：跟随系统 / 手动切换，localStorage 持久化
- **趋势标识**：今日热门 / 上升中统计
- **搜索热词**：记录并展示热门搜索词
- **博客**：26 篇工具指南，分页加载
## 状态
| 项目 | 值 |
|------|-----|
| 工具总数 | **35**（16 计算器 + 5 图片 + 11 文字）|
| 页面总数 | ~70（32 工具 × 2 语言 + 首页 + 26 博客）|
| 博客文章 | 26（13 zh + 13 en）|
| 最新部署 | 064bb08 - 热门工具排序重构 + 点击量全局持久化 |
| 点赞/点击量 | Vercel Serverless Functions + Upstash Redis |
| 热门排序 | 全工具综合打分（无类目配额），取前 8 |
| commit | 说明 |
|--------|------|
| 064bb08 | feat: 热门工具全工具排序、全局点击量、热度值展示 |
| 0cdf279 | fix: 热门工具双计数修复 — updateClickUI 限定范围 |
| cd87b8f | fix: 恢复 Vercel Serverless Function，新增点击量 API |
| 09d1998 | chore: 知识库结构优化，移除 docs 追踪 |
| d0d2c82 | fix: U+FFFD 编码修复 + 编码保护体系 |
| e673cda | fix: 热门工具点击数 + script + CSS + 暗色模式 |
| 69cfec3 | fix: 热门工具样式 — 描述/标签/图标颜色 |
| d9a27e7 | feat: 隐私政策/关于/联系 + Cookie 同意 |
## 本地开发
```bash
# 无需构建，直接在浏览器打开
start index.html
# 或用 Python 启动本地服务器
python -m http.server 8080
```
Deploy trigger: 2026-06-29 02:00:00
存储后端: Upstash Redis (Vercel Serverless Functions)

## 全局数据部署指南（Vercel + Upstash Redis）

### 前提
- Vercel 账号（已有），已关联 GitHub 仓库
- Upstash Redis 实例（[upstash.com](https://upstash.com) 免费套餐即可）

### 步骤

1. **创建 Upstash Redis 数据库**

   - 登录 [Upstash Dashboard](https://console.upstash.com)
   - 创建 Redis 数据库（免费套餐）
   - 记下 REST API URL 和 Token

2. **在 Vercel 配置环境变量**

   - Vercel Dashboard -> calc-tools-top -> Settings -> Environment Variables
   - 添加以下两个变量：

     | 变量名 | 值 |
     |--------|-----|
     | KV_REST_API_URL | https://xxxx.upstash.io |
     | KV_REST_API_TOKEN | xxxxxxxxxxxxxxxx |

3. **推送代码**

   `ash
   git push
   `

   Vercel 自动检测 pi/ 目录下的 .js 文件作为 Serverless Function 部署。
