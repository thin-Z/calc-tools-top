# 项目总览 (2026-07-20)

## 站点
**calc-tools.top** → 永久 308 重定向 → **www.calc-tools.top** ✅

## GSC 索引状态
| 项目 | 数值 |
|------|:----:|
| 已索引 | 141 |
| 未索引 | 205（含 72 个 redirects *已修复*）|
| 首页索引请求 | ✅ 已提交 |
| Sitemap | 165 URLs，已重新生成（全部 www） |

## 本次修复成果
- ✅ **Sitemap** 改用 www.calc-tools.top
- ✅ **167 个 HTML 文件** canonical/og:url/hreflang 统一为 www
- ✅ **42 篇博客**（21 zh + 21 en）重新生成，中文编码完美
- ✅ **首页**手动索引请求已提交
- ✅ **AdSense** 账户设置完成

## 待解决问题
### 🚨 54 个中文文件编码损坏
- 16 篇旧博客 + 38 个工具页存在 UTF-8→GBK→UTF-8 双重编码损坏
- 字节级反向修复不可行（孤儿字节无法恢复）
- 建议：后期从源头重建

## 回顾
- 本次共有 2 个 commit 部署到线上
- Sitemap 重新提交后等待 Google 处理
- AdSense 审核中
