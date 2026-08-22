# CSP 迁移 PRD — calculator-site（calc-tools.top）

## 1. 产品目标

**核心目标**：去除 CSP 中的 `'unsafe-inline'`，启用严格 Content Security Policy，提升网站安全性。

**具体目标**：
1. 将 270 个内联 `<script>` 块外链化为独立 JS 文件
2. 将 572 个内联事件处理器（`onclick=`、`onchange=` 等）改写为 `addEventListener`
3. 在 `vercel.json` 中启用严格 CSP 头（不含 `'unsafe-inline'`）
4. 确保所有现有功能在迁移后正常工作

**成功标准**：
- 浏览器控制台无 `Refused to execute inline script` 类 CSP 违规报错
- 所有交互功能（点赞、语言切换、主题切换、工具使用等）正常工作
- GSC 抓取无 CSP 阻断告警

## 2. 用户故事

### 2.1 最终用户视角
- **作为**网站访客
- **我希望**网站的所有功能（计算器、语言切换、主题切换等）在迁移后保持正常工作
- **以便**我能继续使用网站的所有功能，不受任何影响

### 2.2 开发者视角
- **作为**网站开发者
- **我希望**移除 `'unsafe-inline'`，启用严格 CSP
- **以便**网站能抵御第三方脚本/广告注入攻击，提升安全性
- **并且**代码结构更清晰（内联脚本外链化），便于维护和缓存

## 3. 需求池

### P0（必须完成）
1. **功能完整性**：所有现有功能在迁移后必须正常工作
   - 点赞按钮（工具 + 博客）点击计数 + 心跳动画正常
   - 语言切换（`switchLang` / `onchange` → `location.href`）
   - 主题切换（亮/暗）
   - 工具页使用计数 / 热门排序
   - 移动端响应式菜单/折叠

2. **无 CSP 违规**：浏览器控制台无 `Refused to execute inline script` 类报错

### P1（应该完成）
1. **内联脚本外链化**：将 270 个内联 `<script>` 块抽取为独立 JS 文件
   - 机械步骤：抽取内容 → 写入 `js/inline/<page>-<n>.js` → 原位替换为 `<script src="..." defer></script>`
   - 注意执行时机语义（`defer` 等价于原内联在 DOM 后的行为）
   - 主题/语言切换的内联 IIFE 需保证在 `DOMContentLoaded` 前就绪

2. **事件处理器改写**：将 572 个内联事件处理器改为 `addEventListener`
   - 批量将 `onclick="fn()"` 等改为对应元素 `addEventListener('click', fn)`
   - 高频模式（如 `onchange="location.href=..."` 语言切换、`onsubmit` 表单）建统一委托层

3. **CSP 头更新**：在 `vercel.json` 中更新 CSP 头，移除 `'unsafe-inline'`

### P2（可以完成）
1. **监控与报告**：在 `report-only` 模式运行 1-2 天收集违规报告
2. **回归验证**：执行完整的回归验证检查清单
3. **文档更新**：更新 CSP 迁移计划文档，记录实际执行结果

## 4. 技术约束

1. **CSP 的 `script-src` 即使带了 `nonce`，也不会放行内联事件处理器**（`onclick=` 等）
   - 只能靠 `'unsafe-hashes'`（浏览器支持差，Safari 不支持）或**彻底改写为 `addEventListener`**
   - 因此必须面对「572 个内联事件处理器必须全部改写」这一事实

2. **静态站特性**：推荐方案 B（外链化 + addEventListener）
   - 不依赖运行时 nonce 注入
   - 外链化顺带提升缓存命中

3. **百度同步盘 CRLF 注入风险**：以 Node/Python 作为最终写入者，保留 LF

## 5. 待确认问题

1. **执行顺序**：是否按 Phase 1（外链化）→ Phase 2（事件改写）→ Phase 3（启用 CSP）→ Phase 4（回归验证）顺序执行？
2. **灰度策略**：是否先在 `report-only` 模式运行 1-2 天，再切强制模式？
3. **回滚方案**：每个 Phase 是否独立提交，出问题 `git revert` 单笔即可？
4. **style-src 处理**：`style-src` 暂留 `'unsafe-inline'`（内联样式/动画多，单独一轮清理），是否同意？
5. **监控机制**：是否利用既有 `automation-1786958846642` 周报机制叠加 CSP 违规观测？

## 6. 交付物

1. **PRD 文档**：本文档
2. **架构设计文档**：由架构师输出
3. **修改后的代码**：所有 HTML 文件和 JS 文件的修改
4. **更新后的 vercel.json**：包含严格 CSP 头
5. **回归验证报告**：由 QA 工程师输出

## 7. 时间估算

基于 CSP 迁移计划：
- Phase 0：决策与基线锁定（0.5 人日）
- Phase 1：外链化 270 个内联 `<script>`（1 人日）
- Phase 2：改写 572 个内联事件处理器（1 人日）
- Phase 3：启用 CSP（0.5 人日）
- Phase 4：回归验证（0.5 人日）
- **合计：约 3.5 人日（≈2–3 人日量级）**

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 事件处理器改写遗漏 | 点击/切换失效 | Phase 4 全量 QA + 自动化点击冒烟 |
| 内联脚本依赖顺序错乱 | 功能错位 | 外链化时保留 `defer` 顺序，关键初始化置顶 |
| Baidu 同步盘 CRLF 注入 | 脚本语法/差异噪声 | 以 Node/Python 作为最终写入者，保留 LF |
| CSP 头配置错误导致整站白屏 | 严重 | 先用 `report-only`，再强制；保留一键回滚提交 |