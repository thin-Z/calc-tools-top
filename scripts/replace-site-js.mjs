#!/usr/bin/env node
/**
 * scripts/replace-site-js.mjs — site.js 引用批量替换为 site-core/site-home（P1P2-09，T05）
 * -----------------------------------------------------------------
 * 页面引用规则（与架构设计 §5.2 一致）：
 *   - 首页 + 博客索引（index.html / en/index.html / blog/zh/index.html / blog/en/index.html）
 *     → site-core.js + site-home.js
 *   - 博客正文页 + 7 个 text 工具页 → 仅 site-core.js
 *   - calculators 工具页：不引 site.js（现状不变，无需处理）
 *
 * 幂等：已不含 site.js 引用的页面跳过；重复运行安全。
 *
 * 用法：
 *   node scripts/replace-site-js.mjs            # 落盘
 *   node scripts/replace-site-js.mjs --check    # 只报告，不落盘；存在未替换引用则退出码非 0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkMode = process.argv.includes('--check');

const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
]);

// 首页/博客索引：core + home
const HOME_PAGES = new Set([
  'index.html',
  'en/index.html',
  'blog/zh/index.html',
  'blog/en/index.html',
]);

// 7 个 text 工具页（zh+en）：仅 core
const TEXT_TOOL_IDS = ['word-counter', 'url-encode', 'text-diff', 'text-cleaner', 'reading-time', 'html-stripper', 'keyword-density'];
const TEXT_TOOL_PAGES = new Set();
for (const lang of ['zh', 'en']) {
  for (const id of TEXT_TOOL_IDS) TEXT_TOOL_PAGES.add(`${lang}/text/${id}.html`);
}

const SITE_JS_RE = /<script\b[^>]*\bsrc\s*=\s*["']\/js\/site\.js["'][^>]*>\s*<\/script>/gi;
const CORE_TAG = '<script src="/js/site-core.js" defer></script>';
const HOME_TAG = '<script src="/js/site-core.js" defer></script><script src="/js/site-home.js" defer></script>';

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('dist.bak')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, cb);
    else if (entry.name.endsWith('.html')) cb(full);
  }
}

function replacementFor(rel) {
  if (HOME_PAGES.has(rel)) return HOME_TAG;
  if (TEXT_TOOL_PAGES.has(rel)) return CORE_TAG;
  // 博客正文
  if (/^blog\/(?:zh|en)\/[^/]+\.html$/.test(rel)) return CORE_TAG;
  return null;
}

const changed = [];
const pending = [];
walkHtml(ROOT, (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  const raw = fs.readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  if (!SITE_JS_RE.test(text)) return;
  SITE_JS_RE.lastIndex = 0;

  const repl = replacementFor(rel);
  if (!repl) {
    pending.push(`${rel}: 无法确定替换目标`);
    return;
  }
  const newText = text.replace(SITE_JS_RE, repl);
  if (newText !== text) {
    pending.push(rel);
    if (!checkMode) fs.writeFileSync(f, (hadBom ? '\uFEFF' : '') + newText, 'utf8');
    changed.push(rel);
  }
});

console.log(`待替换 site.js 引用: ${pending.length} | 已处理: ${changed.length}${checkMode ? '（--check，未落盘）' : ''}`);
if (pending.length) {
  for (const r of pending.slice(0, 10)) console.log(`  ${r}`);
  if (pending.length > 10) console.log(`  … 等 ${pending.length - 10} 个`);
  if (checkMode) process.exit(1);
} else {
  console.log('✅ 全站已无 site.js 直接引用（首页/博客索引=core+home，正文/工具页=core）');
}
