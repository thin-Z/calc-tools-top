#!/usr/bin/env node
/**
 * scripts/verify-site.mjs — 全站集成校验（P2 T05）
 * -----------------------------------------------------------------
 * 校验项：
 *   1. header/footer 字节一致：每页 <header>/<footer> 与 includes/header-{zh,en}.html
 *      / footer-{zh,en}.html 逐字节一致（行尾归一化后比较）；zh/index.html 跳转页豁免
 *   2. JSON-LD 校验：调用 scripts/check-jsonld.mjs（5 项断言，退出码非 0 即失败）
 *   3. 静态 AdSense 唯一性：源码 0 个静态标签；若 dist/ 存在，则每页恰好 1 个且与
 *      includes/adsense-head.html 字节一致
 *   4. 链接检查：调用 scripts/check-links.js
 *   5. 浮动控件清零：#gw-theme / .gw-lang / 内联 switchLang 全站 0 命中
 * 用法：node scripts/verify-site.mjs
 * 退出码：0 = 全绿；非 0 = 任一校验失败（供 CI/审计）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
]);
const REDIRECT_NO_TEMPLATE = new Set(['zh/index.html']);

const failures = [];
function fail(msg) { failures.push(msg); }

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, cb);
    else if (entry.name.endsWith('.html')) cb(full);
  }
}
function loadTpl(name) {
  return fs.readFileSync(path.join(ROOT, 'includes', name), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
}
const HEADER_ZH = loadTpl('header-zh.html');
const HEADER_EN = loadTpl('header-en.html');
const FOOTER_ZH = loadTpl('footer-zh.html');
const FOOTER_EN = loadTpl('footer-en.html');
function langFor(rel) {
  return rel.startsWith('en/') || rel.startsWith('blog/en/') ? 'en' : 'zh';
}

// ---------- 1. header/footer 字节一致 ----------
let headerChecked = 0;
let footerChecked = 0;
walkHtml(ROOT, (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  if (REDIRECT_NO_TEMPLATE.has(rel)) return;
  const text = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lang = langFor(rel);
  const hm = text.match(/<header\b[^>]*>[\s\S]*?<\/header>/i);
  const fm = text.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
  const wantH = lang === 'en' ? HEADER_EN : HEADER_ZH;
  const wantF = lang === 'en' ? FOOTER_EN : FOOTER_ZH;
  if (!hm) { fail(`[header] ${rel}: 缺 <header> 块`); }
  else if (hm[0] !== wantH) { fail(`[header] ${rel}: 与模板不一致`); }
  else headerChecked++;
  if (!fm) { fail(`[footer] ${rel}: 缺 <footer> 块`); }
  else if (fm[0] !== wantF) { fail(`[footer] ${rel}: 与模板不一致`); }
  else footerChecked++;
});
console.log(`[1/5] header/footer 字节一致: header ${headerChecked} | footer ${footerChecked}`);

// ---------- 2. JSON-LD 校验（调用 check-jsonld.mjs） ----------
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-jsonld.mjs')], { stdio: 'inherit', cwd: ROOT });
  console.log('[2/5] JSON-LD 校验: 通过');
} catch (e) {
  fail('[jsonld] scripts/check-jsonld.mjs 退出码非 0');
}

// ---------- 3. 静态 AdSense 唯一性 ----------
let srcAdsense = 0;
walkHtml(ROOT, (f) => {
  const t = fs.readFileSync(f, 'utf8');
  srcAdsense += (t.match(/adsbygoogle\.js/g) || []).length;
});
if (srcAdsense !== 0) {
  fail(`[adsense] 源码含 ${srcAdsense} 个静态 adsbygoogle 标签（应为 0，单一来源 includes/adsense-head.html）`);
} else {
  console.log('[3/5] 静态 AdSense: 源码 0 个静态标签 ✓');
}
if (fs.existsSync(DIST)) {
  const snippet = loadTpl('adsense-head.html').trim();
  let distPages = 0;
  let distBad = [];
  walkHtml(DIST, (f) => {
    distPages++;
    const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
    const cnt = (t.match(/adsbygoogle\.js/g) || []).length;
    if (cnt !== 1) distBad.push(`${path.relative(DIST, f)} count=${cnt}`);
  });
  if (distBad.length) {
    fail(`[adsense] dist 中 ${distBad.length} 页 adsbygoogle 数量不为 1（${distBad.slice(0, 5).join(', ')}）`);
  } else {
    console.log(`[3/5] 静态 AdSense: dist ${distPages} 页均恰好 1 个标签 ✓`);
  }
}

// ---------- 4. 链接检查（调用 check-links.js） ----------
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-links.js')], { stdio: 'inherit', cwd: ROOT });
  console.log('[4/5] 链接检查: 通过');
} catch (e) {
  fail('[links] scripts/check-links.js 退出码非 0');
}

// ---------- 5. 浮动控件清零 ----------
let gwTheme = 0, gwLang = 0, inlineSwitch = 0;
walkHtml(ROOT, (f) => {
  const t = fs.readFileSync(f, 'utf8');
  gwTheme += (t.match(/id="gw-theme"/g) || []).length;
  gwLang += (t.match(/gw-lang/g) || []).length;
  inlineSwitch += (t.match(/function\s+switchLang/g) || []).length;
});
if (gwTheme !== 0 || gwLang !== 0 || inlineSwitch !== 0) {
  fail(`[floating] 浮动控件未清零: gw-theme=${gwTheme} gw-lang=${gwLang} inline-switchLang=${inlineSwitch}`);
} else {
  console.log('[5/5] 浮动控件清零: gw-theme=0 gw-lang=0 inline-switchLang=0 ✓');
}

// ---------- 6. GA4 Measurement ID 不变量 ----------
// 老板即将手填真实 ID。最现实风险：只改了一处、或 ID 格式打错。
// 该断言在校验环节把这类错误钉死，避免「填了却没生效」静默上线。
{
  const GA4_PLACEHOLDER = 'G-XXXXXXXXXX';
  const htmlCommentRe = /<!--(?:(?!-->)[\s\S])*?-->/g;
  const raw = fs.readFileSync(path.join(ROOT, 'includes', 'adsense-head.html'), 'utf8');
  const stripped = raw.replace(htmlCommentRe, '');
  if (stripped.includes(GA4_PLACEHOLDER)) {
    console.log('[6] GA4 Measurement ID 不变量: 占位符态（未启用），合法，跳过 ✓');
  } else {
    const ids = stripped.match(/G-[A-Z0-9]{6,}/g) || [];
    if (ids.length !== 2) {
      fail(`[ga4] 检测到 ${ids.length} 处 ID（应为 2 处：loader 与 gtag config 各一），请检查 includes/adsense-head.html`);
    } else if (ids[0] !== ids[1]) {
      fail(`[ga4] 两处 ID 不一致（"${ids[0]}" vs "${ids[1]}"），应为同一个真实 Measurement ID`);
    } else {
      console.log(`[6] GA4 Measurement ID 不变量: 已启用 (${ids[0]})，2 处一致 ✓`);
    }
  }
}

// ---------- 汇总 ----------
if (failures.length) {
  console.error(`\n❌ verify-site 失败 ${failures.length} 项：`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\n✅ verify-site 全绿');
