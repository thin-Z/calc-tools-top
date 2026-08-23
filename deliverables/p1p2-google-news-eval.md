# Google News 资格评估（P1P2-02）

**结论：不满足 → 不做 Google News 提交。**

## 评估依据

| 维度 | calc-tools.top 现状 | Google News 要求 |
|---|---|---|
| 内容类型 | 工具站（计算器/文本/图片工具）+ 低频工具向博客（80 篇，内容更新不规律） | 新闻媒体 / 持续发布时效性新闻 |
| 发布频率 | 无固定频率，内容扩张期一次性批量发布 | 高频、持续、稳定 |
| 时效性 | 工具指南类内容（长期有效，非时效新闻） | 强调新闻时效性（hours/days） |
| NewsArticle 结构化数据 | 无（博客使用 Article schema） | 推荐 NewsArticle |
| 站点定位 | 工具实用型站点 | 新闻类 |

Google News 收录政策面向「新闻内容」，工具指南类长尾内容不符合其内容政策，即使提交 Publisher Center 也大概率被拒或零展示，且 Publisher Center 提交流程需要人工登录操作（用户成本高、收益低）。

## 替代方案（已落地/可评估）

1. **Google Discover 优化（推荐）**：Discover 面向「长期价值内容」，与工具指南内容匹配度更高。优化点：高质量原创内容（正文 ≥300 词已达标）、清晰 title/description（T05 SEO 优化）、图片（当前全 SVG，无位图，非阻塞）。
2. **常规索引（已生效）**：sitemap.xml 已提交 GSC，站点常规收录路径不受影响。
3. **NewsArticle 结构化数据评估（暂缓）**：仅在计划做「时效性新闻型内容」时再评估，当前无此内容形态。

## 后续动作

- 本轮不做 Publisher Center 提交。
- 若未来站点新增新闻/行业动态栏目且发布频率稳定，再重新评估 NewsArticle + Publisher Center。
