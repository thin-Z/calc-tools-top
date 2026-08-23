#!/usr/bin/env node
/**
 * scripts/add-main-id.mjs — 全站 <main id="main"> 批量补齐（P1P2-10，可访问性）
 * -----------------------------------------------------------------
 * 遍历全部 HTML（同 verify-site 的排除口径），为缺少 id 的 <main> 补 id="main"，
 * 与 includes/header-{zh,en}.html 中的 skip-link（href="#main"）配套使用。
 * 幂等：已有 id 的 <main> 保持不变；无 <main> 的页面（如 zh/index.html 跳转页）跳过。
 *
 * 用法：
 *   node scripts/add-main-id.mjs            # 落盘
 *   node scripts/add-main-id.mjs --check    # 只报告缺失，不落盘；有缺失则退出码非 0
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

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('dist.bak')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, cb);
    else if (entry.name.endsWith('.html')) cb(full);
  }
}

const MAIN_RE = /<main\b([^>]*)>/i;
const ID_RE = /\bid\s*=\s*["']main["']/i;

const changed = [];
const missing = [];
let scanned = 0;

walkHtml(ROOT, (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  const raw = fs.readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  const m = text.match(MAIN_RE);
  if (!m) return; // 无 <main>（跳转页等），跳过
  scanned++;
  if (ID_RE.test(m[1])) return; // 已有 id="main"，幂等跳过

  missing.push(rel);
  if (!checkMode) {
    const mainTag = m[0];
    const newTag = mainTag.replace(/^<main\b/, '<main id="main"');
    text = text.replace(mainTag, newTag);
    fs.writeFileSync(f, (hadBom ? '\uFEFF' : '') + text, 'utf8');
    changed.push(rel);
  }
});

console.log(`扫描 <main> 页面: ${scanned} | 缺失 id 且需补齐: ${missing.length} | 已处理: ${changed.length}${checkMode ? '（--check，未落盘）' : ''}`);
if (missing.length) {
  for (const r of missing.slice(0, 20)) console.log(`  ${r}`);
  if (missing.length > 20) console.log(`  … 等 ${missing.length - 20} 个`);
  if (checkMode) process.exit(1);
} else {
  console.log('✅ 所有 <main> 均已带 id="main"');
}
