# calc-tools.top 安全审计报告（OWASP Top 10 + STRIDE）

- 审计人：gstack-security-officer
- 日期：2026-08-12
- 模式：Comprehensive（只读，判定以 `git show HEAD` 为准）
- 范围：api/likes.js、api/clicks.js、js/*（44 文件）、vercel.json、robots.txt、.gitignore、第三方依赖
- 结论：整体安全基线良好（CORS 白名单、GET 强制 toolId、通用错误信息、HSTS、robots 屏蔽 /api 均正确），无 🔴 级漏洞。主要风险集中在 API 防刷的竞态、KV key 无 TTL 的存储放大、CSP unsafe-inline 与第三方脚本无 SRI。

## 问题清单（按严重度）

| 严重度 | 类别 | 位置 | 问题 | 修复建议 |
|---|---|---|---|---|
| 🟠 High | A07/DoS | api/likes.js:69-91、api/clicks.js:69-74 | 限速与每日点赞上限为「GET 后 SET」非原子读改写：同一 IP 并发请求可同时读到旧值再各自写回，绕过 20/min 限速与 5 次/日上限 | 改用 Upstash KV REST 原子递增：`/incr/ratelimit:likes:{ip}/1` 后读 result 判断，或 `/incr/likecap:{ip}:{tool}:{day}/1`（INCR 自带计数，杜绝 TOCTOU） |
| 🟠 High | A04/存储 DoS | api/likes.js:170、api/clicks.js:158 | `set/like:tool:<cleanId>` 与 `set/click:tool:<cleanId>` 均无 EX，key 永久保留；POST 接受任意 toolId（仅清洗字符），配合 IP 轮换可无限写入永久 KV key，造成存储/费用放大 | ① set 加 TTL：`/set/{key}/{n}/EX/31536000`；② 服务端维护已知工具 ID 白名单，POST 不在白名单一律 400；③ GET 校验 cleanId 非空 |
| 🟡 Medium | A05/CSP | vercel.json CSP | `script-src 'unsafe-inline'`：任何一处 XSS 即可直接执行，CSP 兜底失效（当前前端内联 onclick/onchange 依赖它） | 逐步迁移：把内联事件处理器改为 addEventListener/外部 JS，最终可用 `'unsafe-hashes'` 或 nonce 替换；至少补充 `object-src 'none'` |
| 🟡 Medium | A03/DOM XSS | js/calculators/password-gen.js:36 | 生成密码（SYMBOLS 含 `<>&"`）未转义直接拼接 innerHTML。虽为随机自 XSS、远程难触发，但与 text-tools/generator.js 的 escapeHtml 处理不一致，属纵深缺口 | 复用 `escapeHtml(pwd)`（同 generator.js:199 的实现）后再拼接 |
| 🟡 Medium | A06/供应链 | 8 个 HTML 页 `cdn.jsdelivr.net/npm/chart.js` | ① chart.js 未锁版本（浮动 latest，内容可随时变化）；② 全站第三方脚本（chart.js、qrcodejs、AdSense）均无 SRI integrity，CDN 被攻破/包被接管即整页脚本执行 | 锁版本 `chart.js@4.4.x` 并加 `integrity`（用 `openssl dgst -sha384 -binary | base64` 计算）；qrcodejs@1.0.0 同样补 SRI；AdSense 保持 CSP 域名白名单 |
| 🟡 Medium | A07/回退风险 | api/likes.js:43-56、clicks.js:43 | 无 KV 内存模式：限速仅单实例、`isLikeAbuse` 直接 return false（每日上限失效）、`_rateHits` Map 无清理/上限，多实例下数据不一致 | 生产必须配置 KV_REST_API_URL/TOKEN 并在 CI 校验存在；内存回退仅作本地开发，且对 Map 做定期清理与最大条目限制 |
| 🟢 Low | A04/资源 | api/likes.js:95-110（readBody） | 超限 reject 后未 `req.destroy()`，data 事件仍持续 `raw += chunk` 累积内存，慢速长连接可撑到函数超时 | 超限分支加 `req.destroy()`；data 内 `if (done) return;` 提前丢弃 |
| 🟢 Low | A03/理论 XSS | js/image-tools/convert.js:66 | `originalInfo.innerHTML` 内插 `${file.type}`，浏览器 MIME 通常安全但理论可注入（compress.js 已用 textContent，写法不一致） | 改用 textContent/`createElement('span')` 赋值，与 compress.js showPreview 对齐 |
| 🟢 Low | A08/缓存 | api/*.js handler | API 响应未设 `Cache-Control: no-store`，Vercel 边缘可能缓存计数造成陈旧/串数据 | 两 handler 统一加 `res.setHeader('Cache-Control','no-store')` |
| 🟢 Low | A07/GDPR | js/cookie-consent.js | 同意后无撤回入口（CCPA「opt-out」要求）；AdSense pub-id 硬编码在 JS | 页脚/隐私页提供「撤回同意」按钮（清 localStorage 并卸载广告）；pub-id 集中到配置 |
| 🟢 Info | A05 | .gitignore | 未含 `.env*`（本地误建可能被提交泄露 KV_TOKEN） | 追加 `.env*`、`!.env.example` |
| 🟢 Info | A05 | vercel.json | Permissions-Policy 可更全（缺 interest-cohort=()、fullscreen 等）；API 路由同样继承安全头，已 OK | 补充 `interest-cohort=(), fullscreen=(self)` |
| 🟢 Info | 功能 | js/api-client.js fetchAllCounts、site.js fetchAndMergeGlobalClicks | 调 GET /api/likes、/api/clicks 不带 toolId 必 403，全局热度/点击聚合实际失效（死代码） | 移除或改为后端聚合端点；非安全问题但需知悉 |

## STRIDE 摘要
- 亮点：XFF 取最右段（Vercel 追加）正确防伪造；GET 缺 toolId 返回 403 防枚举；错误统一 internal error 不泄露；CORS 白名单+固定回退（无凭据、无反射）；robots.txt Disallow /api；HSTS preload 完整；图片文件名用 textContent 防 DOM XSS。
- 主要威胁面：Tampering（计数竞态丢增量）、DoS（KV 无界增长、限速竞态、readBody 内存）、Supply-chain（无 SRI + 浮动版本）。无认证/授权面，无敏感数据存储，Spoofing/EoP 风险低。

## 统计
Critical 0 / High 2 / Medium 4 / Low 4 / Info 3。建议优先级：P0=修复限速原子性；P1=KV key TTL+白名单、SRI、password-gen 转义；P2=CSP 收紧、cache-control、readBody destroy。
