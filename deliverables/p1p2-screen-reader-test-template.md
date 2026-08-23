# 读屏测试报告模板（P1P2-10d）

> 用途：由用户/QA 使用 NVDA（Windows / 免费）或 VoiceOver（macOS / 内置）对重点页面做人工读屏验证。
> 自动化可机检项已由 `verify-site.mjs` 断言 [13] 覆盖（main id / skip-link / label 关联 / button 可访问名），
> 本模板只记录读屏实感与键盘操作结果，不阻塞其余验收。

## 测试环境

| 项 | 值 |
|---|---|
| 测试日期 | YYYY-MM-DD |
| 读屏软件 | NVDA / VoiceOver |
| 浏览器 | Chrome / Edge / Safari |
| 操作系统 | Windows / macOS |
| 被测页面 URL | 见下方清单 |

## 测试页面清单（建议 3 页）

1. 首页：`https://www.calc-tools.top/`
2. 工具页（任选 1）：`https://www.calc-tools.top/zh/calculators/color-contrast` 或 `https://www.calc-tools.top/zh/calculators/regex-tester`
3. 博客正文页（任选 1）：`https://www.calc-tools.top/blog/zh/age-calc-guide`

## 检查项与结果记录

| # | 检查项 | 通过 | 备注 |
|---|---|---|---|
| 1 | 页面打开后读屏可正常读取页面标题与主要内容，无乱码 | ☐ | |
| 2 | 按 Tab 首键聚焦到「跳到主要内容 / Skip to main content」，Enter 后焦点跳到正文 | ☐ | |
| 3 | 导航区链接逐一可读、可聚焦，读屏能读出链接文本 | ☐ | |
| 4 | 语言切换 select 有可访问名称，读屏能读出当前语言 | ☐ | |
| 5 | 主题切换按钮有可访问名称（切换暗黑模式 / Toggle dark mode） | ☐ | |
| 6 | 工具页表单字段有 label，读屏能读出字段用途 | ☐ | |
| 7 | 工具页操作按钮（如「格式化」「测试」）可读、可键盘触发 | ☐ | |
| 8 | 结果区从隐藏到显示时，读屏能感知内容变化（或至少可 Tab 到结果区） | ☐ | |
| 9 | 点赞按钮可读（❤ + 计数），键盘可触发 | ☐ | |
| 10 | 页脚链接可读、可聚焦 | ☐ | |
| 11 | 全键盘可操作：无需鼠标即可完成一个核心操作闭环 | ☐ | |
| 12 | 焦点指示清晰可见（:focus-visible 样式） | ☐ | |

## 问题记录

| 页面 | 问题描述 | 严重度（高/中/低） | 复现步骤 |
|---|---|---|---|
| | | | |

## 结论

- [ ] 全部通过，可关闭本轮读屏项
- [ ] 存在中/高严重度问题，需工程师修复后复测
