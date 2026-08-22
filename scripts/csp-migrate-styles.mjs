#!/usr/bin/env node
/**
 * scripts/csp-migrate-styles.mjs — CSP 二期：style-src 'unsafe-inline' 清理（幂等）
 * ---------------------------------------------------------------
 * 目标：全站 HTML 内联 style= 属性 → CSS class（移除 style-src 'unsafe-inline' 前置条件）。
 * 策略：
 *  1. 扫描全站唯一 style= 模式，按频率降序生成映射：
 *     - 纯 "display:none" → 复用已有 .hidden 类
 *     - 其余 → .st-<N>（追加到 css/style.css 集中定义）
 *  2. 批量替换 HTML：style="..." → 合并进 class 属性
 *  3. 删除跳转 stub 页残留 <style> 块（en/text/keyword-density.html）
 * 幂等：检测 css/style.css 中的 CSP 标记注释，已生成则跳过。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'deliverables']);
const CSS_MARK = '/* ==== CSP style-src 硬化工具类（自动生成，勿手改） ==== */';

// 匹配标签内 style 属性：<... style="value" ...>（不带 g——在 replace 回调中 exec 会因 lastIndex 累积跳过匹配）
const TAG_RE = /<[a-zA-Z][a-zA-Z0-9]*\b[^>]*?(?:\/?>|>)/g;
const STYLE_ATTR_RE = /\sstyle\s*=\s*(["'])(.*?)\1/i;
const CLASS_ATTR_RE = /\sclass\s*=\s*(["'])(.*?)\1/i;

function walkHtml(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(full, cb);
    else if (e.name.endsWith('.html')) cb(full);
  }
}

/* ---------- 1. 扫描唯一模式 ---------- */
const freq = new Map();
const styleFiles = [];
walkHtml(ROOT, (file) => {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(html)) !== null) {
    const tag = m[0];
    const sm = STYLE_ATTR_RE.exec(tag);
    if (!sm) continue;
    const val = sm[2].trim().replace(/\s+/g, ' ');
    if (!val) continue;
    freq.set(val, (freq.get(val) || 0) + 1);
  }
});

/* ---------- 2. 生成映射 ---------- */
const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
const map = new Map();
let n = 0;
for (const [val] of sorted) {
  if (val === 'display:none;' || val === 'display:none') {
    map.set(val, 'hidden');
  } else {
    n++;
    map.set(val, `st-${n}`);
  }
}
console.log(`扫描到 ${freq.size} 种唯一模式（display:none → .hidden，其余 → st-1..st-${n}）`);

/* ---------- 3. 追加 CSS（幂等：删除旧段重建，保证增量扫描后完整） ---------- */
const cssPath = path.join(ROOT, 'css', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');
// 删除旧的工具类段（含标记前后）
const markIdx = css.indexOf(CSS_MARK);
if (markIdx !== -1) {
  const endIdx = css.indexOf('\n/* ====', markIdx + CSS_MARK.length);
  const tailIdx = endIdx === -1 ? css.length : endIdx;
  css = css.slice(0, markIdx) + css.slice(tailIdx).replace(/^\n+/, '');
}
const lines = [`\n${CSS_MARK}\n`];
for (const [val, cls] of map.entries()) {
  if (cls === 'hidden') continue;
  lines.push(`.${cls} { ${val} }`);
}
css = css.replace(/\s*$/, '\n') + lines.join('\n') + '\n';
fs.writeFileSync(cssPath, css, 'utf8');
console.log(`[ok] css/style.css 工具类段重建（${n} 个 class）`);

/* ---------- 4. 批量替换 HTML ---------- */
let replaced = 0;
let fileCount = 0;
walkHtml(ROOT, (file) => {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 删除 <style> 块（跳转 stub 残留）
  const styleBlockRe = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
  if (styleBlockRe.test(html)) {
    html = html.replace(styleBlockRe, '');
    console.log(`[ok] ${path.relative(ROOT, file)}: 删除 <style> 块`);
    changed = true;
  }

  // 替换 style= 属性 → class
  html = html.replace(TAG_RE, (tag) => {
    const sm = STYLE_ATTR_RE.exec(tag);
    if (!sm) return tag;
    const val = sm[2].trim().replace(/\s+/g, ' ');
    const cls = map.get(val);
    if (!cls) return tag;
    const withoutStyle = tag.replace(STYLE_ATTR_RE, '');
    const cm = CLASS_ATTR_RE.exec(withoutStyle);
    if (cm) {
      const existing = cm[2].trim();
      if (existing.split(/\s+/).includes(cls)) return tag; // 幂等
      return withoutStyle.replace(CLASS_ATTR_RE, (mm, q, c) => ` class=${q}${c} ${cls}${q}`);
    }
    return withoutStyle.replace(/>\s*$/, ` class="${cls}">`);
  });

  if (html !== fs.readFileSync(file, 'utf8')) {
    const before = fs.readFileSync(file, 'utf8');
    if (html !== before) {
      fs.writeFileSync(file, html, 'utf8');
      changed = true;
    }
  }
  if (changed) { replaced++; fileCount++; }
});

console.log(`替换完成：${fileCount} 个文件改动`);

/* ---------- 5. 验证残留 ---------- */
const scanRe = /\sstyle\s*=\s*(["'])(.*?)\1/gi;
let leftover = 0;
walkHtml(ROOT, (file) => {
  const html = fs.readFileSync(file, 'utf8');
  const hits = html.match(scanRe) || [];
  if (hits.length) {
    leftover += hits.length;
    if (leftover <= 5) console.log(`[残留] ${path.relative(ROOT, file)}: ${hits.join(', ').slice(0, 100)}`);
  }
});
console.log(`残留 style= 属性: ${leftover}`);
