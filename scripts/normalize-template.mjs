#!/usr/bin/env node
/**
 * scripts/normalize-template.mjs — 全站 header/footer 模板归一化（P2 T02）
 * -----------------------------------------------------------------
 * 遍历全部 HTML 页面（实测 167 页，不含 includes/adsense-head.html），按
 * includes/header-{zh,en}.html / footer-{zh,en}.html 字节基准执行：
 *   1. 替换/补插 <header>…</header> 与 <footer>…</footer>（zh/en 两套模板）
 *   2. 移除 <head> 内静态 adsbygoogle 标签（单一来源保留 includes/adsense-head.html）
 *   3. 移除浮动控件 #gw-theme 与 .gw-lang
 *   4. 删除页尾残缺内联 switchLang 脚本
 *   5. 脚本引用统一为绝对路径 /js/… 并去掉 ?v=（版本号由 build.mjs 注入 dist）
 *   6. 给缺 i18n.js 的结构页/索引页补加载绝对路径 i18n.js
 *   7. 保留原文件 BOM 与 CRLF/LF 行尾
 * 特殊页：zh/index.html 跳转页不套模板（仅清理浮动控件/静态标签），404 页保留正文语义。
 * 用法：
 *   node scripts/normalize-template.mjs --dry-run   # 只报告变更统计，不落盘
 *   node scripts/normalize-template.mjs              # 落盘
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
]);

// zh/index.html 跳转页：不套模板（R1 特判），仅清理
const REDIRECT_NO_TEMPLATE = new Set([
  path.join('zh', 'index.html').split(path.sep).join('/'),
]);

// ---------- 读取模板（LF 基准，插入时按目标文件行尾转换） ----------
function loadTpl(name) {
  return fs.readFileSync(path.join(ROOT, 'includes', name), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
}
const HEADER_ZH = loadTpl('header-zh.html');
const HEADER_EN = loadTpl('header-en.html');
const FOOTER_ZH = loadTpl('footer-zh.html');
const FOOTER_EN = loadTpl('footer-en.html');

// ---------- 正则 ----------
const ADSENSE_RE = /<script\b[^>]*\badsbygoogle\.js\b[^>]*>\s*<\/script>\s*/gi;
const GW_THEME_RE = /<button\b[^>]*\bid="gw-theme"[^>]*>[\s\S]*?<\/button>\s*/gi;
const GW_LANG_RE = /<div\b[^>]*\bgw-lang\b[^>]*>[\s\S]*?<\/div>\s*/gi;
const INLINE_SWITCHLANG_RE = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?function\s+switchLang[\s\S]*?<\/script>\s*/gi;
// 脚本绝对化：<script src="任意相对前缀 + js/xxx.js[?v=]"> → <script src="/js/xxx.js">
const SCRIPT_SRC_RE = /(<script\b[^>]*\bsrc=)(["'])([^"']*\/)?(js\/[^"']+?)(\?v=[^"']*)?\2/gi;
const HEADER_RE = /<header\b[^>]*>[\s\S]*?<\/header>/i;
const FOOTER_RE = /<footer\b[^>]*>[\s\S]*?<\/footer>/i;
const BODY_OPEN_RE = /<body\b[^>]*>/i;
const BODY_CLOSE_RE = /<\/body>/i;
const HEAD_CLOSE_RE = /<\/head>/i;
const I18N_ABS_RE = /<script\b[^>]*\bsrc=["']\/js\/i18n\.js["']/i;

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, cb);
    else if (entry.name.endsWith('.html')) cb(full);
  }
}

function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}
function renderTpl(tpl, eol) {
  return tpl.replace(/\n/g, eol);
}
function langFor(rel) {
  return rel.startsWith('en/') || rel.startsWith('blog/en/') ? 'en' : 'zh';
}

function processFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const raw = fs.readFileSync(file);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  const eol = detectEol(text);
  const lang = langFor(rel);
  const headerTpl = renderTpl(lang === 'en' ? HEADER_EN : HEADER_ZH, eol);
  const footerTpl = renderTpl(lang === 'en' ? FOOTER_EN : FOOTER_ZH, eol);
  const isRedirect = REDIRECT_NO_TEMPLATE.has(rel);

  const ops = [];
  const orig = text;

  // 2) 移除静态 adsbygoogle 标签
  if (ADSENSE_RE.test(text)) {
    text = text.replace(ADSENSE_RE, '');
    ops.push('adsense-removed');
  }
  // 3) 移除浮动控件
  if (GW_THEME_RE.test(text)) {
    text = text.replace(GW_THEME_RE, '');
    ops.push('gw-theme-removed');
  }
  if (GW_LANG_RE.test(text)) {
    text = text.replace(GW_LANG_RE, '');
    ops.push('gw-lang-removed');
  }
  // 4) 删除页尾内联 switchLang
  if (INLINE_SWITCHLANG_RE.test(text)) {
    text = text.replace(INLINE_SWITCHLANG_RE, '');
    ops.push('inline-switchLang-removed');
  }
  // 5) 脚本绝对化 + 去 ?v=
  if (SCRIPT_SRC_RE.test(text)) {
    text = text.replace(SCRIPT_SRC_RE, (m, pre, q, prefix, jsPath) => pre + q + '/' + jsPath + q);
    ops.push('script-abs-path');
  }
  // 6) 补加载 i18n.js（绝对路径）
  if (!I18N_ABS_RE.test(text)) {
    text = text.replace(HEAD_CLOSE_RE, '    <script src="/js/i18n.js" defer></script>\n</head>');
    ops.push('i18n-added');
  }
  // 1) header/footer 模板
  if (!isRedirect) {
    if (HEADER_RE.test(text)) {
      text = text.replace(HEADER_RE, headerTpl);
      ops.push('header-replaced');
    } else {
      text = text.replace(BODY_OPEN_RE, (m) => m + '\n' + headerTpl);
      ops.push('header-inserted');
    }
    if (FOOTER_RE.test(text)) {
      text = text.replace(FOOTER_RE, footerTpl);
      ops.push('footer-replaced');
    } else {
      text = text.replace(BODY_CLOSE_RE, footerTpl + '\n</body>');
      ops.push('footer-inserted');
    }
  }

  const changed = text !== orig;
  if (changed && !dryRun) {
    fs.writeFileSync(file, (hadBom ? '\uFEFF' : '') + text, 'utf8');
  }
  return { rel, changed, ops, hadBom, text };
}

// ---------- 主流程 ----------
const results = [];
const files = [];
walkHtml(ROOT, (f) => files.push(f));
for (const f of files) results.push(processFile(f));

const changedFiles = results.filter((r) => r.changed);
const opCount = {};
for (const r of changedFiles) for (const op of r.ops) opCount[op] = (opCount[op] || 0) + 1;

console.log(`扫描 HTML: ${results.length} 页`);
console.log(`变更: ${changedFiles.length} 页${dryRun ? '（dry-run，未落盘）' : '（已落盘）'}`);
console.log('--- 操作统计 ---');
for (const [op, n] of Object.entries(opCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${op.padEnd(24)} ${n}`);
}
const untouched = results.filter((r) => !r.changed);
if (untouched.length) {
  console.log('--- 未变更页面 ---');
  for (const r of untouched) console.log(`  ${r.rel}`);
}

// 断言：所有页面 header/footer 与模板字节一致（内容级，行尾归一化后）
let headerMismatch = 0;
let footerMismatch = 0;
for (const r of results) {
  if (REDIRECT_NO_TEMPLATE.has(r.rel)) continue;
  const text = r.text.replace(/\r\n/g, '\n');
  const hm = text.match(/<header\b[^>]*>[\s\S]*?<\/header>/i);
  const fm = text.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
  const lang = langFor(r.rel);
  const wantH = (lang === 'en' ? HEADER_EN : HEADER_ZH);
  const wantF = (lang === 'en' ? FOOTER_EN : FOOTER_ZH);
  if (!hm || hm[0] !== wantH) { headerMismatch++; console.log(`  HEADER MISMATCH: ${r.rel}`); }
  if (!fm || fm[0] !== wantF) { footerMismatch++; console.log(`  FOOTER MISMATCH: ${r.rel}`); }
}
console.log(`--- 模板一致性断言: header 不一致 ${headerMismatch} | footer 不一致 ${footerMismatch} ---`);
if (headerMismatch || footerMismatch) process.exit(1);
