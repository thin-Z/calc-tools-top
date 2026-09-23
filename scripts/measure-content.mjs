#!/usr/bin/env node
/**
 * measure-content.mjs — 内容度量基线（批次 0，2026-09-10）
 *
 * 用途：量化 calc-tools.top 各页「内容厚度」与「跨页重复度」，为内容加密度
 * 批次（A/B/C 批、熔断线「跨页重叠率 >15%」）提供可重复、可对比的数字基线。
 *
 * 此前「96 页 ≥1200 字」口径含英文/标点，偏松导致误判；本脚本按
 * 「纯汉字（zh）/ 词数（en）」精确统计，并引入 shingle + Jaccard 跨页重叠率。
 *
 * 输出：人类可读摘要（stdout）+ 机器可读 JSON 产物。
 *
 * 产物位置（2026-09-19 修正）：
 *   原先写 `dist/measure-content.json` —— 有两个问题：
 *     ① dist 是**要部署上线**的目录，把度量产物写进去等于产物泄漏（且会被上传统计）；
 *     ② 与 dist 卫生门禁（check-dist-hygiene 禁 dist 根级 .json）冲突：
 *        「build 后手跑度量 → 再 verify」必然假失败（实测踩到）。
 *   现改为写 `reports/measure-content.json`（仓库根，**入库**）——
 *   既脱离部署目录，又让每次度量都留下可追溯历史，
 *   避免重演「批次 0 基线文件 content-baseline.json 丢失、无法计算降幅」的教训。
 *   ⚠️ 2026-09-23 再次迁移：产物挪到**知识库** `90-运维工具/reports/measure-content.json`。
 *      原因：站点仓库 `thin-Z/calc-tools-top` 是 PUBLIC，而度量结果会暴露
 *      「哪些页面内容薄弱」（薄页分布 = 站点 SEO 弱点），不宜随代码公开。
 *      知识库根可用 `OBSIDIAN_VAULT` 覆盖；也可用 `--out <path>` 或 `MEASURE_OUT` 指定。
 * 用法：node scripts/measure-content.mjs [--dir <dist>] [--top <N>]
 * 退出码：0（只度量不门禁；异常才非 0）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dirAt = args.indexOf('--dir');
const TARGET = dirAt >= 0 ? path.resolve(args[dirAt + 1]) : path.join(ROOT, 'dist');
const topN = (() => { const i = args.indexOf('--top'); return i >= 0 ? Number(args[i + 1]) || 10 : 10; })();
// --focus：聚焦分析指定页面（逗号分隔的路径关键词），用于批次退出标准 / 熔断线判定。
// 背景（2026-09-19）：熔断线 1 判的是「A 批 12 页跨页重叠率是否 >15%」，
// 而 summary.siteAvgOverlap 是全站 222 页所有 >5% 页面对的平均值 —— 口径不同，
// 无法直接回答熔断线问题。此参数按页面子集精确计算（不设 5% 门槛，取真实最大值）。
// 用法：node scripts/measure-content.mjs --focus tax2026,compound-interest,housing-fund
const focusKeys = (() => {
  const i = args.indexOf('--focus');
  if (i < 0) return [];
  return String(args[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
})();

const HANZI = /[一-鿿]/g;
const EN_WORD = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
const TAG_RE = /<[^>]+>/g;
const WS_RE = /\s+/g;

function walkHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(full, out);
    else if (e.name.endsWith('.html')) out.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return out;
}
function textOf(rel, bodyOnly) {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
  // 去 <style>/<script>/<head> 内非正文，保留 body 文本
  const body = (raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [null, raw])[1];
  let s = body;
  // 剔除 HTML 注释（2026-09-19 修复度量污染）：
  //   站点每个页面都带 SVG sprite 说明 + R1/R25 CSP 规则注释（约 37 个 2-gram），
  //   注释**不是可见文本**，却会被 shingle 计入 → 把重叠率整体虚高。
  //   实测证据：housing-fund ↔ car-loan 的 180 个公共 shingle 中，37 个来自注释、
  //   140+ 来自模板 FAQ/引言（真实内容仅约 14 个）。
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  if (bodyOnly) {
    // 正文口径（2026-09-19 新增，用于熔断线判定）：
    //   剔除「UI 骨架」与「表单控件文案」——导航/页头/页脚/脚本样式，
    //   以及 label/button/select/option/textarea/legend/fieldset 等控件文本。
    //   理由：熔断线的原意是判「AI 是否在复制内容模板」，而工具页天然同构
    //   （都有表单+结果+FAQ），其 UI 文案是**功能性必需**、不构成内容冗余。
    //   全文本口径会把 UI 文案算进重叠率，高估同构性、易误触发熔断。
    s = s
      .replace(/<(script|style|noscript|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(label|button|select|option|textarea|legend|fieldset|datalist|output|optgroup)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/?(input|button|select|option|textarea|label)\b[^>]*>/gi, ' ');
  }
  return s.replace(TAG_RE, ' ').replace(WS_RE, ' ').trim();
}
// 英文内容分布在 dist/en/ 与 dist/blog/en/（含 calculators/text/image/tags 子目录），
// 统一用「路径含 /en/ 段」判定，避免 dist/blog/en/* 被误判为 zh 导致 shingle 空集→假 100% 重叠。
function langOf(rel) { return rel.includes('/en/') ? 'en' : 'zh'; }
function categoryOf(rel) {
  if (rel.includes('/blog/')) return 'blog';
  if (rel.includes('/tags/')) return 'tag';
  if (/dist\/(zh|en)\/(about|contact|privacy|methodology|help|index)\.html$/.test(rel)) return 'static';
  return 'tool';
}
/** 中文按字符 3-gram、英文按词 2-gram 生成 shingle 集合（语言无关近似）。 */
function shingles(text, lang) {
  const set = new Set();
  if (lang === 'en') {
    const w = text.toLowerCase().match(EN_WORD) || [];
    for (let i = 0; i + 2 <= w.length; i++) set.add(w.slice(i, i + 2).join(' '));
  } else {
    const h = text.match(/[一-鿿]/g) || [];
    for (let i = 0; i + 3 <= h.length; i++) set.add(h.slice(i, i + 3).join(''));
  }
  return set;
}
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const s of small) if (big.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}

const rels = walkHtml(TARGET).sort();
const pages = rels.map((rel) => {
  const t = textOf(rel);
  const lang = langOf(rel);
  const hanzi = (t.match(HANZI) || []).length;
  const words = (t.match(EN_WORD) || []).length;
  const sh = shingles(t, lang);
  // 正文口径 shingle（剔除 UI 骨架）：仅用于熔断线判定与 --focus 对比
  const tb = textOf(rel, true);
  const shBody = shingles(tb, lang);
  return {
    rel, lang, category: categoryOf(rel), hanzi, words, _sh: sh, _shBody: shBody,
    // noindex 存根页（stub 重定向）内容天然高度雷同，会污染重叠率读数 —— 标记以便排除
    noindex: /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(
      fs.readFileSync(path.join(ROOT, rel), 'utf8')
    ),
  };
});

// 两两重叠（同语言，降成本）+ 找最相似 topN 对
// 说明：pairs/siteAvg 沿用**全文本口径**（历史可比），正文口径只在 --focus 与 summary 另外给出。
const pairs = [];
for (let i = 0; i < pages.length; i++) {
  for (let j = i + 1; j < pages.length; j++) {
    if (pages[i].lang !== pages[j].lang) continue;
    const jac = jaccard(pages[i]._sh, pages[j]._sh);
    if (jac > 0.05) pairs.push({ a: pages[i].rel, b: pages[j].rel, jaccard: +jac.toFixed(4) });
  }
}
pairs.sort((x, y) => y.jaccard - x.jaccard);
const siteAvg = pairs.length ? pairs.reduce((s, p) => s + p.jaccard, 0) / pairs.length : 0;

// 正文口径 + 排除 noindex 的同类均值（熔断线判定应参考这一口径）
const bodyPairs = [];
for (let i = 0; i < pages.length; i++) {
  if (pages[i].noindex) continue;
  for (let j = i + 1; j < pages.length; j++) {
    if (pages[j].noindex) continue;
    if (pages[i].lang !== pages[j].lang) continue;
    const jac = jaccard(pages[i]._shBody, pages[j]._shBody);
    if (jac > 0.05) bodyPairs.push({ a: pages[i].rel, b: pages[j].rel, jaccard: +jac.toFixed(4) });
  }
}
const siteAvgBody = bodyPairs.length ? bodyPairs.reduce((s, p) => s + p.jaccard, 0) / bodyPairs.length : 0;

function summarize(cat, lang) {
  const xs = pages.filter((p) => p.category === cat && (lang ? p.lang === lang : true));
  if (!xs.length) return null;
  const vals = (lang === 'en' ? xs.map((p) => p.words) : xs.map((p) => p.hanzi)).sort((a, b) => a - b);
  const mean = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  const med = vals[Math.floor(vals.length / 2)];
  return { n: xs.length, mean, median: med };
}

console.log(`\n=== 内容度量基线（扫描 ${TARGET}）===\n`);
console.log(`页面总数: ${pages.length}`);
const zhTool = summarize('tool', 'zh');
const enTool = summarize('tool', 'en');
const zhBlog = summarize('blog', 'zh');
const enBlog = summarize('blog', 'en');
console.log(`zh 工具页  纯汉字: 均值 ${zhTool?.mean} / 中位数 ${zhTool?.median}（${zhTool?.n} 页）`);
console.log(`en 工具页  词数:   均值 ${enTool?.mean} / 中位数 ${enTool?.median}（${enTool?.n} 页）`);
console.log(`zh 博客页  纯汉字: 均值 ${zhBlog?.mean} / 中位数 ${zhBlog?.median}（${zhBlog?.n} 页）`);
console.log(`en 博客页  词数:   均值 ${enBlog?.mean} / 中位数 ${enBlog?.median}（${enBlog?.n} 页）`);
console.log(`\n全站平均跨页重叠率(近似): ${(siteAvg * 100).toFixed(2)}%   ← 全文本口径（含 UI 骨架）`);
console.log(`全站平均跨页重叠率(正文口径): ${(siteAvgBody * 100).toFixed(2)}%   ← 剔除 UI 骨架 + 排除 ${pages.filter((p) => p.noindex).length} 个 noindex stub（熔断线判定基准）`);
console.log(`最相似 top ${topN} 对（同语言 Jaccard）:`);
for (const p of pairs.slice(0, topN)) console.log(`  ${(p.jaccard * 100).toFixed(1)}%  ${p.a}  ↔  ${p.b}`);

// ── --focus 聚焦分析：精确回答「指定页面子集是否存在 >15% 重叠」──
// 两种口径并列输出：①全文本（含 UI 骨架）②正文（剔除 UI 骨架 + 排除 noindex stub）。
// 熔断线判定以②为准（理由见 textOf 内注释）。
const FUSE_THRESHOLD = 0.15;
let focusReport = null;
if (focusKeys.length) {
  const hit = (rel) => focusKeys.some((k) => rel.includes(k));
  const idxs = pages.map((p, i) => ({ p, i })).filter((x) => hit(x.p.rel));

  const collect = (shKey, skipNoindex) => {
    const out = [];
    for (const { i } of idxs) {
      if (skipNoindex && pages[i].noindex) continue;
      for (let j = 0; j < pages.length; j++) {
        if (i === j || pages[i].lang !== pages[j].lang) continue;
        if (skipNoindex && pages[j].noindex) continue;
        const jac = jaccard(pages[i][shKey], pages[j][shKey]);
        out.push({ a: pages[i].rel, b: pages[j].rel, jaccard: jac });
      }
    }
    out.sort((x, y) => y.jaccard - x.jaccard);
    return out;
  };

  const bestFull = collect('_sh', false);
  const bestBody = collect('_shBody', true);
  const maxFull = bestFull.length ? bestFull[0].jaccard : 0;
  const maxBody = bestBody.length ? bestBody[0].jaccard : 0;
  const overBody = bestBody.filter((p) => p.jaccard > FUSE_THRESHOLD).length;

  console.log(`\n=== --focus 分析（关键词: ${focusKeys.join(', ')}）===`);
  console.log(`命中页面: ${idxs.length} 个（其中 noindex stub: ${idxs.filter((x) => x.p.noindex).length} 个）`);
  console.log(`\n【口径①】全文本（含 UI 骨架，历史可比）`);
  console.log(`  最高重叠率: ${(maxFull * 100).toFixed(2)}%   超 15% 对数: ${bestFull.filter((p) => p.jaccard > FUSE_THRESHOLD).length} / ${bestFull.length}`);
  for (const p of bestFull.slice(0, Math.min(5, topN))) console.log(`    ${(p.jaccard * 100).toFixed(1)}%  ${p.a}  ↔  ${p.b}`);
  console.log(`\n【口径②】正文（剔除 UI 骨架 + 排除 noindex stub）← 熔断线判定基准`);
  console.log(`  最高重叠率: ${(maxBody * 100).toFixed(2)}%   超 15% 对数: ${overBody} / ${bestBody.length}`);
  for (const p of bestBody.slice(0, Math.min(5, topN))) console.log(`    ${(p.jaccard * 100).toFixed(1)}%  ${p.a}  ↔  ${p.b}`);
  console.log(
    `\n判定（口径②）: ${maxBody > FUSE_THRESHOLD ? '[!] 超过 15% —— 按熔断线 1 应暂停 B 批' : 'OK 未超 15% —— 熔断线 1 未触发'}`
  );
  console.log(`口径差异: UI 骨架贡献了约 ${((maxFull - maxBody) * 100).toFixed(2)} 个百分点的重叠`);

  focusReport = {
    keys: focusKeys,
    matched: idxs.length,
    noindexStubs: idxs.filter((x) => x.p.noindex).length,
    fulltext: { maxJaccard: +maxFull.toFixed(4), pairsOver15pct: bestFull.filter((p) => p.jaccard > FUSE_THRESHOLD).length, totalPairs: bestFull.length },
    body: { maxJaccard: +maxBody.toFixed(4), pairsOver15pct: overBody, totalPairs: bestBody.length },
    fuseThreshold: FUSE_THRESHOLD,
    fuseTriggered: maxBody > FUSE_THRESHOLD,
    topPairsBody: bestBody.slice(0, topN).map((p) => ({ ...p, jaccard: +p.jaccard.toFixed(4) })),
  };
}

// JSON 产物：2026-09-23 起落在**知识库**（不入 PUBLIC 仓库，避免暴露薄页分布）；
//   仍不放 dist（dist 会部署上线，且与 dist 卫生门禁冲突）。
const outArg = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null; })();
const VAULT_ROOT = process.env.OBSIDIAN_VAULT || 'D:/BaiduSyncdisk/_ObsidianVault';
const DEFAULT_OUT = path.join(VAULT_ROOT, '90-运维工具', 'reports', 'measure-content.json');
const OUT_FILE = outArg ? path.resolve(outArg) : (process.env.MEASURE_OUT || DEFAULT_OUT);
const out = {
  generatedAt: new Date().toISOString(),
  total: pages.length,
  summary: {
    zhToolHanzi: zhTool, enToolWords: enTool, zhBlogHanzi: zhBlog,
    siteAvgOverlap: +siteAvg.toFixed(4),
    // 正文口径 + 排除 noindex stub 的均值（熔断线判定基准）
    siteAvgOverlapBody: +siteAvgBody.toFixed(4),
    noindexPages: pages.filter((p) => p.noindex).length,
  },
  pages: pages.map(({ _sh, ...rest }) => rest),
  topPairs: pairs.slice(0, topN),
  ...(focusReport ? { focus: focusReport } : {}),
};
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
console.log(`\n✅ 已写出 ${OUT_FILE}（${pages.length} 页度量 + top${topN} 相似对）`);
