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
 * 输出：人类可读摘要（stdout）+ 机器可读 dist/measure-content.json（CI/批次用）。
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
function textOf(rel) {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
  // 去 <style>/<script>/<head> 内非正文，保留 body 文本
  const body = (raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [null, raw])[1];
  return body.replace(TAG_RE, ' ').replace(WS_RE, ' ').trim();
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
  return { rel, lang, category: categoryOf(rel), hanzi, words, _sh: sh };
});

// 两两重叠（同语言，降成本）+ 找最相似 topN 对
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
console.log(`\n全站平均跨页重叠率(近似): ${(siteAvg * 100).toFixed(2)}%`);
console.log(`最相似 top ${topN} 对（同语言 Jaccard）:`);
for (const p of pairs.slice(0, topN)) console.log(`  ${(p.jaccard * 100).toFixed(1)}%  ${p.a}  ↔  ${p.b}`);

// JSON 产物（落在 dist，供 CI/后续批次读取；脚本自带，非临时草稿）
const out = {
  generatedAt: new Date().toISOString(),
  total: pages.length,
  summary: {
    zhToolHanzi: zhTool, enToolWords: enTool, zhBlogHanzi: zhBlog,
    siteAvgOverlap: +siteAvg.toFixed(4),
  },
  pages: pages.map(({ _sh, ...rest }) => rest),
  topPairs: pairs.slice(0, topN),
};
fs.writeFileSync(path.join(TARGET, 'measure-content.json'), JSON.stringify(out, null, 2), 'utf8');
console.log(`\n✅ 已写出 ${path.join(TARGET, 'measure-content.json')}（${pages.length} 页度量 + top${topN} 相似对）`);
