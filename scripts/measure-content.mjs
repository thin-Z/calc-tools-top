#!/usr/bin/env node
// scripts/measure-content.mjs — 全站正文词数审计（2026-08-17 固化，源自当日排障口径）
// 用法: node scripts/measure-content.mjs [阈值] [仓库根目录] [--json] [--summary]
//       默认阈值 300，默认目录当前目录。
//       --json    输出机器可读 JSON 到 stdout（审计脚本可消费）
//       --summary 只输出计数/聚合，不输出明细（供审计摘要）
//
// 口径说明（重要，勿改）：
//   "正文词数" = <h1> 到 <div class="blog-cta"> 之间的可见文本（CJK 单字计 + 英文单词计），
//   排除导航/面包屑/CTA 卡片/相关文章/页脚等模板文字。整页词数含 ~60-90 词模板噪音，
//   会把健康页误判为薄页（2026-08-17 曾导致"81 页稀薄"高估，实际仅 30 篇 EN 博客是真缺口）。
//   无 CTA 的页面回退到 <article>/<main> 区间，再兜底全文。

import fs from 'node:fs';
import path from 'node:path';

// ---- 参数解析（flags 与位置参数混排） ----
const args = process.argv.slice(2);
let jsonMode = false;
let summaryMode = false;
const positional = [];
for (const a of args) {
  if (a === '--json') jsonMode = true;
  else if (a === '--summary') summaryMode = true;
  else positional.push(a);
}
const threshold = parseInt(positional[0] || '300', 10);
const root = path.resolve(positional[1] || '.');
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist', 'docs', 'snapshots', 'deliverables', 'api', 'assets', 'includes', 'scripts', 'css', 'js']);

function stripTags(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function countWords(s) {
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (s.match(/[A-Za-z]+/g) || []).length;
  return { total: cjk + en, cjk, en };
}
function bodyText(html) {
  const h1cta = html.match(/<h1[^>]*>([\s\S]*?)<div class="blog-cta"/i);
  if (h1cta) return stripTags(h1cta[1]);
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (article) return stripTags(article[1]);
  return stripTags(html);
}

const results = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || EXCLUDE_DIRS.has(e.name)) continue;
    if (e.name.startsWith('dist.bak')) continue; // build.mjs 同样排除 dist.bak-* 备份目录
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(p, 'utf8');
      const w = countWords(bodyText(html));
      results.push({ file: path.relative(root, p).replace(/\\/g, '/'), ...w });
    }
  }
}
walk(root);
results.sort((a, b) => a.total - b.total);
const thin = results.filter((r) => r.total < threshold);
const byDir = {};
for (const r of thin) {
  const d = r.file.split('/')[0];
  byDir[d] = (byDir[d] || 0) + 1;
}
const lo = results[0], hi = results[results.length - 1];

if (jsonMode) {
  const out = {
    scanned: results.length,
    threshold,
    thin: thin.map((r) => ({ file: r.file, total: r.total, cjk: r.cjk, en: r.en })),
    byDir,
    min: lo ? { file: lo.file, total: lo.total } : null,
    max: hi ? { file: hi.file, total: hi.total } : null,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  process.exit(0);
}

console.log(`扫描目录: ${root}`);
console.log(`HTML 页数: ${results.length}   阈值: <${threshold} 词（正文口径）`);
console.log(`薄页数: ${thin.length}`);
if (summaryMode) {
  console.log('--- 薄页按目录 ---');
  if (thin.length) {
    for (const [d, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) console.log(`  ${d}: ${n}`);
  } else {
    console.log('  (无)');
  }
  console.log(`--- 全文范围: 最薄 ${lo.total} (${lo.file}) / 最厚 ${hi.total} (${hi.file}) ---`);
  process.exit(0);
}
if (thin.length) {
  console.log('--- 薄页列表（升序）---');
  for (const r of thin) console.log(`${String(r.total).padStart(5)}  ${r.file}`);
  console.log('--- 薄页按目录 ---');
  for (const [d, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) console.log(`  ${d}: ${n}`);
} else {
  console.log('✅ 无薄页');
}
console.log(`--- 全文范围: 最薄 ${lo.total} (${lo.file}) / 最厚 ${hi.total} (${hi.file}) ---`);
