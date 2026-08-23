# 关键 CSS 内联方案（P1P2-08，本轮不实施）

**结论：方案设计 + Lighthouse 基线锚点，本轮暂缓实施。**

## 背景

- `css/style.css` 压缩后约 65KB，为首屏渲染阻塞资源（render-blocking）。
- 冲突点：`vercel.json` CSP `style-src` **无 'unsafe-inline'**，内联 `<style>` 会被浏览器阻止；直接加 'unsafe-inline' 会弱化安全基线（不推荐）。

## 拆分策略

1. **拆 critical.css**：提取首屏必需样式（header/nav/hero/搜索框/分类筛选/热门工具首屏网格/基础排版），目标 ≤8KB。
2. **内联方式**：构建期（`scripts/build.mjs`）把 critical.css 内容内联为 `<style>` 注入每个 HTML 的 `<head>`。
3. **CSP hash 方案（保持无 unsafe-inline）**：
   - 构建时计算 critical.css 内联块的 `sha256-*`；
   - 把 hash 追加到 `vercel.json` 的 `style-src`（如 `style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'sha256-<hash>'`）；
   - `vercel.json` 静态 hash 需随构建维护 —— 引入一个小脚本 `scripts/update-csp-hash.mjs` 在 build 时重写 vercel.json（或由 CI 校验 hash 与产物一致）。
4. **非关键异步**：style.css 改为 `media="print" onload="this.media='all'"` 异步加载（需外链 JS 或 CSP 兼容写法，本轮不引入内联事件）。

## Lighthouse 基线（锚点）

- 本轮不实测（无浏览器自动化环境）；由用户/QA 在部署后执行：
  - `npx lighthouse https://www.calc-tools.top/ --preset=mobile --output=json --output-path=lh-baseline.json`
- 基线记录要求：记录日期 + 移动端 Performance 分数，作为后续实施 critical CSS 后的对比锚点。

## 风险与权衡

| 项 | 说明 |
|---|---|
| hash 维护成本 | vercel.json 随构建变化，需脚本化；若 CI 校验失败需人工介入 |
| 缓存 | 内联 critical.css 随 HTML 缓存，改动 CSS 后整页缓存失效（可接受） |
| 收益 | 首屏阻塞 CSS 从 ~65KB 降至 ~8KB 内联 + 其余异步，Lighthouse Performance 预期提升 5-15 分 |

## 决策记录

- 本轮**不实施**（收益中等、hash 维护成本与 CSP 风险需谨慎评估）。
- 下一步建议：先由用户跑一次 Lighthouse 基线 → 若 Performance <70 再实施；≥80 则保持现状。
