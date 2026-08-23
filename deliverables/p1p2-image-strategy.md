# 图片策略评估（P1P2-06 / 07）

**结论：WebP 转换与图片 CDN（Vercel Image Optimization）均不做。**

## 现状审计

| 资产 | 文件 | 格式 |
|---|---|---|
| 站点图标 | `assets/favicon.svg` | SVG |
| Logo（暗色） | `assets/logo.svg` | SVG |
| Logo（横向） | `assets/logo-h.svg` | SVG |
| og:image | 引用 `/assets/logo.svg` | SVG |

全站图片资产仅 3 个 SVG 文件，**无 PNG/JPG 位图**：
- WebP 转换无目标文件（收益为 0）；
- Vercel Image Optimization 主要面向 Next.js `next/image`，纯静态站需自建 sharp 端点；当前无位图，收益极低且引入维护成本。

## 未来位图规范（新增位图时强制执行）

1. 格式一律 **WebP**（透明场景可保留 PNG，但优先 WebP）；
2. 必须带 `width` + `height` 属性（防 CLS）；
3. 必须带 `loading="lazy"`（已有 verify-site [10] 懒加载断言兜底，首屏 logo/favicon 豁免）；
4. 压缩目标：单图 ≤100KB，总页重 ≤300KB。

## 后续动作

- 本轮不引入 sharp / Vercel Image Optimization。
- 若未来内容需要位图（如博客配图、工具截图），按上述规范落地，并重新评估是否需要图片 CDN。
