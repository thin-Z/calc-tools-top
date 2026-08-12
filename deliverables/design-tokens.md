# calc-tools.top 设计系统（Design Tokens & 组件规范）

> 权威来源：`css/style.css` 的 `:root` 与 `[data-theme="dark"]` 区块（2026-08-12 样式改版后）。
> 本文档与 style.css **同步维护**——改 token 必须先改 style.css，再更新本文档。
> 设计语言：Apple（SF 感观、玻璃拟态、克制阴影、克制的品牌色点缀）。

---

## 1. 品牌色

| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--brand-blue` | `#007AFF` | `#0A84FF` | 主品牌蓝（链接、激活态、渐变起点） |
| `--brand-purple` | `#5856D6` | `#6856E8` | 次级（渐变终点、阅读进度条） |
| `--brand-orange` | `#FF9500` | `#FF9F0A` | 警示/强调（warning 引用块、趋势） |
| `--brand-green` | `#34C759` | `#30D158` | 成功/正向（tip 引用块、隐私徽章） |

## 2. 中性色

| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--bg` | `#F5F5F7` | `#000000` | 页面背景 |
| `--bg-card` | `#FFFFFF` | `#1C1C1E` | 卡片/输入框/浮层 |
| `--bg-surface` | `#F8F8FA` | `#2C2C2E` | 次级表面（按钮次态、feature-card） |
| `--bg-elevated` | `#F8F8FA` | `#2C2C2E` | 悬浮表面（footer、代码块） |
| `--bg-muted` | `#F8F8FA` | `#2C2C2E` | 弱化底（表头、keyword-bar 轨） |
| `--border` | `#E8E8ED` | `#3A3A3C` | 边框/分隔线 |
| `--text-primary` | `#1D1D1F` | `#F5F5F7` | 主文本 |
| `--text-secondary` | `#86868B` | `#98989D` | 次级文本（描述、meta） |
| `--text-tertiary` | `#98989D` | 同 | 弱化文本（placeholder、计数） |

## 3. 主色与效果（语义色）

| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--primary` | `#007AFF` | `#0A84FF` | 主操作（btn-primary、激活 chip） |
| `--primary-hover` | `#0056CC` | `#0056CC` | 主操作 hover |
| `--primary-light` | `rgba(0,122,255,.15)` | `rgba(10,132,255,.15)` | 主色浅底（focus ring、hover 底） |
| `--primary-glow` | `rgba(0,122,255,.4)` | `rgba(10,132,255,.4)` | 按钮光晕（shadow） |
| `--like` / `--like-bg` | `#f43f5e` / `#fff1f2` | `#f43f5e` / `rgba(244,63,94,.15)` | 点赞态 |
| `--danger` / `--danger-strong` | `#ef4444` / `#dc2626` | `#f87171` / `#fca5a5` | 错误/警告文本 |
| `--success` / `--success-bg` | `#16a34a` / `#f0fdf4` | `#34d399` / `rgba(22,163,74,.2)` | 成功态 |

## 4. 分类色（工具 8 类）

| Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--cat-finance` / `--cat-finance-bg` | `#4f46e5` / `#eef2ff` | `#a5b4fc` / `rgba(79,70,229,.2)` | 财务 |
| `--cat-life` / `--cat-life-bg` | `#ca8a04` / `#fefce8` | `#fde68a` / `rgba(202,138,4,.2)` | 生活 |
| `--cat-shopping` / `--cat-shopping-bg` | `#db2777` / `#fdf2f8` | `#f9a8d4` / `rgba(219,39,119,.2)` | 购物 |
| `--cat-travel` / `--cat-travel-bg` | `#0284c7` / `#f0f9ff` | `#7dd3fc` / `rgba(2,132,199,.2)` | 出行 |
| `--cat-utility` / `--cat-utility-bg` | `#7c3aed` / `#f5f3ff` | `#c4b5fd` / `rgba(124,58,237,.2)` | 实用 |
| `--cat-image` / `--cat-image-bg` | `#059669` / `#ecfdf5` | `#6ee7b7` / `rgba(5,150,105,.2)` | 图片 |
| 文本类 | `--trend-up-bg`/`--trend-up-text` | 同左 | 文字工具 tag |

应用方式：`class="tag tag-finance"`（背景 `--cat-finance-bg`、文字 `--cat-finance`）；卡片图标 `.icon.icon-finance` 用分类渐变。

## 5. 暗色模式

- 机制：`[data-theme="dark"]` 属性选择器覆盖（`<html data-theme="dark">`）；**无** `@media (prefers-color-scheme)`。
- 初始化：`js/theme-init.js`（head 同步，防 FOUC）读取 `localStorage['theme-preference']`（兼容旧 `theme` key）→ 系统偏好 → 默认亮色。
- 切换：`js/theme-toggle.js`（自包含，注入/接管 `#theme-toggle` 与浮动 `#gw-theme`，写入双 key）。
- 新增样式规则必须同步提供暗色覆盖；背景一律用 token（`var(--bg-card)` 等），避免硬编码 `#fff`。

## 6. Spacing 刻度（4px 基准）

| Token | 值 | 典型用途 |
|---|---|---|
| `--space-1` | `4px` | 微间隙 |
| `--space-2` | `8px` | 图标间距、紧凑 gap |
| `--space-3` | `12px` | 标签内距 |
| `--space-4` | `16px` | 标准 gap、卡片内边距 |
| `--space-5` | `24px` | 区块间距 |
| `--space-6` | `32px` | 分区间距 |
| `--space-7` | `48px` | 页面主 padding |
| `--space-8` | `64px` | 大分区 |

## 7. 字号刻度

| Token | 值 | 典型用途 |
|---|---|---|
| `--fs-xs` | `0.75rem` | tag、badge、脚注 |
| `--fs-sm` | `0.875rem` | 次要文本、meta |
| `--fs-md` | `1rem` | 正文基准 |
| `--fs-lg` | `1.125rem` | 强调正文 |
| `--fs-xl` | `1.25rem` | 小节标题 |
| `--fs-2xl` | `1.5rem` | 区块标题 |
| `--fs-3xl` | `2rem` | 页面主标题（h1） |
| `--fs-4xl` | `3rem` | 大数字展示（结果值） |

## 8. 圆角

| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | `8px` | 代码块、小控件 |
| `--radius-md` | `10px` | 按钮、输入框 |
| `--radius-lg` | `12px` | 卡片 |
| `--radius-xl` | `16px` | 热榜卡片 |
| `--radius-full` | `999px` | 胶囊（tag、chip、圆钮） |

## 9. 阴影

| Token | 值 | 用途 |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.06)` | 卡片静止态 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,.08)` | 悬浮态（hover） |
| `--shadow-lg` | `0 12px 30px rgba(0,0,0,.08)` | 浮层/弹窗 |

暗色下透明度提升（0.3/0.4/0.5）。

## 10. 断点（响应式）

| Token | 值 | 行为 |
|---|---|---|
| `--bp-sm` | `480px` | 手机：1 列网格、紧凑 padding |
| `--bp-md` | `768px` | 平板：2 列网格、header 收紧 |
| `--bp-lg` | `1000px` | 桌面：3 列网格 |
| `--bp-xl` | `1200px` | 宽屏（预留） |

媒体查询中**使用字面量 px**（CSS 变量在 media query 兼容性不佳），token 仅作文档参考。主内容区 `max-width:1100px`。

## 11. Z-index 刻度

| Token | 值 | 用途 |
|---|---|---|
| `--z-base` | `1` | 徽标（hot-badge） |
| `--z-raised` | `2` | 悬浮控件（like-btn、usage-count） |
| `--z-sticky` | `90` | back-to-top、reading-progress |
| `--z-header` | `100` | sticky header |
| `--z-overlay` | `200` | 浮动语言切换 |
| `--z-modal` | `300` | 弹窗（预留） |
| `--z-toast` | `400` | 浮动主题按钮、toast |

## 12. 组件规范

命名：全小写 kebab-case，无 BEM；状态类平级（`.active`/`.liked`/`.visible`/`.filtered-out`）。

| 组件 | class | 关键 token |
|---|---|---|
| Header | `header` + `.logo` + `nav` | 玻璃 `--glass-bg/--glass-blur/--glass-border`，`height:64px`，`--z-header` |
| 主题切换 | `#theme-toggle.theme-toggle`（36px 圆钮）、浮动 `#gw-theme.gw-float-btn` | `--bg-card`/`--border`；图标 🌙/☀️ 由 theme-toggle.js 维护 |
| 工具卡片 | `.tool-card-wrap > a.tool-card(.icon/h3/p) + .tool-tags + .like-btn` | `--bg-card`/`--radius-lg`/`--shadow-sm`，hover `translateY(-4px)` + `--shadow-md` |
| 分类 tag | `.tag.tag-{8类}` | `--cat-*-bg`/`--cat-*` |
| 按钮 | `.btn.btn-primary` / `.btn-secondary` | `--primary`/`--primary-hover`/`--primary-glow`；active `scale(.97)` |
| 表单 | `.tool-form > .form-group(label+input/select) + .form-actions` | `--bg-card`/`--radius-md`；focus `0 0 0 3px var(--primary-light)` |
| 结果卡片 | `.result-card(.result-value/.result-label/.result-detail)` | `--primary` 大数字 `--fs-4xl` |
| 博客列表 | `.article-item(h2>a/.article-meta/.article-like/.article-summary/.article-tags)` | `--bg-card`/`--radius-lg`/`--shadow-sm` |
| 文章页 | `.blog-post` + `.breadcrumb` + `.blog-cta` + `.related-posts` | `max-width:720px`；引用块 info/warning/tip 三色 |
| 静态页 | `.about-page`/`.contact-page`/`.policy-page`/`.error-page`（+`.feature-grid`/`.contact-card`/`.highlight-box`） | 均走 token，`max-width:720/640px` |
| 分类索引 | `.category-header` + `.tool-grid` + `.tool-count` | 复用 style.css 公共 .tool-grid |
| 图片工具 | `.upload-zone`/`.tool-controls`/`.control-group`/`.preview-card`/`.result-summary`/`.color-info` | 背景 `--bg-card`（暗色自动） |
| 文字工具 | `.text-input`/`.mode-chip`/`.result-area`/`.stat-card`/`.copy-btn`/`.strength-meter` | 等宽 `SF Mono/Fira Code`；chip 激活 `--primary` |
| UUID / 密码生成器 | `.gen-tabs`/`.gen-tab(.active)`/`.gen-panel(.active)`/`.uuid-row`/`.uuid-text`/`.pw-options`/`.pw-length-wrap`/`.pw-length-val` | 激活态 `--primary`；等宽 UUID 列表 |
| 随机数生成器 | `.random-numbers`/`.random-number-badge` | `--bg-card`/`--border`/8px radius；Courier 等宽 |

广告位：`.ad-container`（max-width 728px、min-height 90px）与 `.ad-slot`/`.ad-placeholder` 结构**必须保留**，勿删勿改。

## 13. 使用约定

1. **新页面引用**：`<link href=".../css/style.css">` + `<link href=".../css/cookie-consent.css">`（顺序固定），head 注入 `js/theme-init.js` + `js/theme-toggle.js`，并加载 Google Fonts Inter（`wght@400;500;600;700`）。
2. **颜色一律用 token**，禁止硬编码色值（亮暗自动适配）。
3. **间距/字号**：新样式优先 `--space-*` / `--fs-*`。
4. **内联样式**：禁止新增 `<style>` 块与 `style=""` 样式声明（功能性 `display:none` 等 JS 控制除外）。
5. **i18n**：`data-i18n` 属性由 `js/i18n.js` 运行时替换，**不可删结构**。
6. **SEO**：canonical / hreflang / JSON-LD 结构勿动。
7. 改 token 顺序：先 `css/style.css`，再本文件，最后回归验证（亮/暗 × 480/768/1000px）。
