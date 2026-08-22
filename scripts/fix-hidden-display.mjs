#!/usr/bin/env node
/**
 * fix-hidden-display.mjs — 修复「.hidden{display:none!important} 覆盖 JS style.display」全站问题
 *
 * 背景：CSP 硬化把 inline style="display:none" 改为 .hidden class（c3496c2），
 * 但各计算器/工具 JS 仍用 style.display='block'/'none' 切换显隐，
 * 内联样式无法覆盖 !important → 结果区永远不显示（全站计算器不可用）。
 *
 * 修复规则（仅对 HTML 中带 hidden class 的 id）：
 *   style.display = 'block'|'flex'|''  →  classList.remove('hidden')
 *   style.display = 'none'             →  classList.add('hidden')
 *
 * 用法：node scripts/fix-hidden-display.mjs [--dry-run]
 * 产物：直接改写 js 目录下所有 .js（幂等，可重复跑）
 */
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry-run');
const root = path.resolve(import.meta.dirname, '..');

// ---------- 1. 收集全站 HTML 带 hidden class 的 id ----------
const hiddenIds = new Set();
function collectHidden(htmlFile) {
  if (!fs.existsSync(htmlFile)) return;
  const html = fs.readFileSync(htmlFile, 'utf8');
  const re = /class="([^"]*hidden[^"]*)"[^>]*id="([^"]+)"|id="([^"]+)"[^>]*class="([^"]*hidden[^"]*)"/g;
  let m;
  while ((m = re.exec(html))) { const id = m[2] || m[3]; if (id) hiddenIds.add(id); }
}
function walkHtml(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p);
    else if (e.name.endsWith('.html')) collectHidden(p);
  }
}
walkHtml(path.join(root, 'zh'));
walkHtml(path.join(root, 'en'));
for (const f of ['index.html', '404.html', 'about.html', 'contact.html', 'privacy.html']) {
  collectHidden(path.join(root, f));
}
console.log(`[scan] 带 hidden class 的 id (${hiddenIds.size}): ${[...hiddenIds].sort().join(', ')}`);

// ---------- 2. 扫描并修复 JS ----------
function walkJs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJs(p));
    else if (e.name.endsWith('.js') && !e.name.endsWith('.min.js')) out.push(p);
  }
  return out;
}

const SHOW_VALS = { block: 'remove', flex: 'remove', '': 'remove', none: 'add', undefined: 'remove' };
let changedFiles = 0, totalRepl = 0;

for (const jsPath of walkJs(path.join(root, 'js'))) {
  let code = fs.readFileSync(jsPath, 'utf8');
  const orig = code;

  // 变量绑定表：变量名 -> id
  const bindings = {};
  const bindRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.getElementById\(['"]([^'"]+)['"]\)/g;
  let bm;
  while ((bm = bindRe.exec(code))) bindings[bm[1]] = bm[2];

  const repls = [];
  // 直接 getElementById 形式
  const directRe = /getElementById\(['"]([^'"]+)['"]\)\s*\.style\.display\s*=\s*['"]([^'"]*)['"]/g;
  let m;
  while ((m = directRe.exec(code))) {
    const id = m[1], val = m[2];
    if (hiddenIds.has(id)) {
      const act = SHOW_VALS[val];
      if (act) repls.push({ from: m[0], to: `getElementById('${id}').classList.${act}('hidden')` });
    }
  }
  // 变量形式
  const varRe = /([A-Za-z_$][\w$]*)\s*\.style\.display\s*=\s*['"]([^'"]*)['"]/g;
  while ((m = varRe.exec(code))) {
    const v = m[1], val = m[2];
    const id = bindings[v];
    if (id && hiddenIds.has(id)) {
      const act = SHOW_VALS[val];
      if (act) repls.push({ from: m[0], to: `${v}.classList.${act}('hidden')` });
    }
  }

  if (repls.length === 0) continue;
  for (const r of repls) {
    if (!code.includes(r.from)) { console.warn(`  ⚠️ 未匹配: ${path.basename(jsPath)}: ${r.from}`); continue; }
    code = code.split(r.from).join(r.to);
    totalRepl++;
  }
  if (code === orig) continue;
  changedFiles++;
  console.log(`  ✏️ ${path.relative(root, jsPath).replace(/\\/g, '/')}: ${repls.length} 处`);
  if (!DRY) fs.writeFileSync(jsPath, code);
}

console.log(`\n[result] ${DRY ? '[dry-run] ' : ''}修改 ${changedFiles} 文件 / ${totalRepl} 处替换`);
if (DRY) console.log('（--dry-run 未落盘；去掉参数执行写入）');
