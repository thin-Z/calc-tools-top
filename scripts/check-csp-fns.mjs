#!/usr/bin/env node
/**
 * CSP 委托层处理器可达性门禁
 *
 * 背景：CSP 硬化后所有内联事件处理器改为 data-csp-click/change/input="fnName"，
 * 由 js/csp-events.js 通过 `window[fnName]` 调用（见该文件第 21 行）。
 * 因此被引用的函数必须是**真正的 window 属性**，否则点击无任何反应（只在
 * console 打一条 warn，用户端表现为"按钮失灵"）。
 *
 * 合规形式（classic script，站点 HTML 无 type="module"）：
 *   1. 顶层 `function fn() {}`      → 函数声明挂到 window ✅
 *   2. 顶层 `var fn = function(){}` → var 挂到 window ✅
 *   3. 任意位置 `window.fn = ...`   → 显式挂载 ✅
 *
 * 不合规形式：
 *   - 嵌套在任意 {} 块内的 function 声明（IIFE / 事件回调 / if 分支内）→ NESTED
 *   - 顶层 `const fn = ...` / `let fn = ...` → NOT_ON_WINDOW（词法声明不挂 window）
 *   - 全站 JS 中找不到定义 → MISSING
 *
 * 判定方式：**括号深度**（不是行首缩进）。
 * 早期版本用 /^\s+function/ 近似判断嵌套，导致 js/inline/date-calc.js 中
 * 从内联脚本外链化时保留 8 空格缩进的顶层函数（calcModeA/B/C）被误报为 NESTED。
 * 现在先把注释/字符串/模板/正则内容掩码为空格，再累计 {} 净深度，depth===0 即顶层。
 *
 * 退出码：发现问题函数 → exit 1（供 verify-site 断言 #25 / CI 拦截）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', 'dist', 'deliverables', 'test-results', 'playwright-report']);

// ---------- 1. 收集 HTML 中 data-csp-* 引用的函数名 ----------
const fns = new Set();
const jsFiles = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.html')) {
      const t = fs.readFileSync(f, 'utf8');
      const re = /data-csp-(?:click|change|input)="([^"]+)"/g;
      let m;
      while ((m = re.exec(t))) fns.add(m[1]);
    } else if (e.name.endsWith('.mjs') || e.name.endsWith('.js')) {
      // scripts/ 下为构建脚本，不参与运行时可达性判定
      if (!path.relative(ROOT, f).split(path.sep)[0].startsWith('scripts')) jsFiles.push(f);
    }
  }
}
walk(ROOT);

// ---------- 2. 掩码：注释 / 字符串 / 模板 / 正则内容 → 空格（保留长度与换行） ----------
function maskCode(src) {
  const out = src.split('');
  const n = src.length;
  let i = 0;
  let prevSig = '';
  const blank = (k) => { if (src[k] !== '\n') out[k] = ' '; };
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') { blank(i); i++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      blank(i); blank(i + 1); i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { blank(i); i++; }
      if (i < n) { blank(i); blank(i + 1); i += 2; }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      blank(i); i++;
      while (i < n) {
        if (src[i] === '\\') { blank(i); blank(i + 1); i += 2; continue; }
        if (src[i] === q) { blank(i); i++; break; }
        blank(i); i++;
      }
      prevSig = 'x';
      continue;
    }
    if (c === '/' && !/[\w$)\]]/.test(prevSig)) {
      let j = i + 1;
      let ok = false;
      let inClass = false;
      while (j < n) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '\n') break;
        if (inClass) { if (d === ']') inClass = false; }
        else if (d === '[') inClass = true;
        else if (d === '/') { ok = true; break; }
        j++;
      }
      if (ok) {
        for (let k = i; k <= j; k++) blank(k);
        i = j + 1;
        while (i < n && /[a-z]/.test(src[i])) { blank(i); i++; }
        prevSig = 'x';
        continue;
      }
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return out.join('');
}

// 每个字符位置之前的 {} 净深度
function depthMap(masked) {
  const d = new Int32Array(masked.length + 1);
  let cur = 0;
  for (let i = 0; i < masked.length; i++) {
    d[i] = cur;
    const c = masked[i];
    if (c === '{') cur++;
    else if (c === '}') cur--;
  }
  d[masked.length] = cur;
  return d;
}

const cache = new Map();
function analyze(f) {
  if (!cache.has(f)) {
    const src = fs.readFileSync(f, 'utf8');
    const masked = maskCode(src);
    cache.set(f, { masked, depth: depthMap(masked) });
  }
  return cache.get(f);
}
function lineOf(masked, idx) {
  let line = 1;
  for (let i = 0; i < idx; i++) if (masked[i] === '\n') line++;
  return line;
}

// ---------- 3. 逐函数判定 ----------
const RANK = { WINDOW: 4, TOP_FN: 4, TOP_VAR: 4, NOT_ON_WINDOW: 2, NESTED: 1, MISSING: 0 };
const results = new Map();

for (const fn of [...fns].sort()) {
  let best = { kind: 'MISSING', where: '' };
  const esc = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    { kind: 'WINDOW', re: new RegExp('window\\.' + esc + '\\s*=(?!=)', 'g'), anyDepth: true },
    { kind: 'FN', re: new RegExp('\\bfunction\\s+' + esc + '\\s*\\(', 'g') },
    { kind: 'VAR', re: new RegExp('\\bvar\\s+' + esc + '\\s*=', 'g') },
    { kind: 'LEX', re: new RegExp('\\b(?:const|let)\\s+' + esc + '\\s*=', 'g') },
  ];

  for (const f of jsFiles) {
    const { masked, depth } = analyze(f);
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    for (const p of patterns) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(masked))) {
        const d = depth[m.index];
        let kind;
        if (p.kind === 'WINDOW') kind = 'WINDOW';
        else if (p.kind === 'FN') kind = d === 0 ? 'TOP_FN' : 'NESTED';
        else if (p.kind === 'VAR') kind = d === 0 ? 'TOP_VAR' : 'NESTED';
        else kind = d === 0 ? 'NOT_ON_WINDOW' : 'NESTED';
        if (RANK[kind] > RANK[best.kind]) {
          best = { kind, where: `${rel}:${lineOf(masked, m.index)}` };
        }
      }
    }
    if (RANK[best.kind] === 4) break;
  }
  results.set(fn, best);
}

const bad = [...results.entries()].filter(([, v]) => RANK[v.kind] < 4);

// ---------- 4. 报告 ----------
const HINT = {
  MISSING: '全站 JS 未找到定义 —— 按钮点击无响应',
  NESTED: '定义在 {} 块内（IIFE/回调），未挂 window —— 委托层 window[fn] 取不到',
  NOT_ON_WINDOW: 'const/let 词法声明不挂 window —— 改为 function 声明或显式 window.fn=',
};

console.log(`被引用函数: ${fns.size}（扫描 ${jsFiles.length} 个运行时 JS）`);
if (bad.length === 0) {
  console.log(`✅ check-csp-fns: ${fns.size} 个 data-csp-* 处理器全部可通过 window[fn] 访问`);
  process.exit(0);
}
console.log('=== 问题函数（委托层无法调用）===');
for (const [fn, v] of bad) {
  console.log(`  ${fn.padEnd(22)} ${v.kind}${v.where ? ' @ ' + v.where : ''}`);
  console.log(`  ${''.padEnd(22)} └─ ${HINT[v.kind]}`);
}
console.log(`❌ check-csp-fns: ${bad.length} 个处理器不可达`);
process.exit(1);
