#!/usr/bin/env node
/** 检查 data-csp-* 引用的 42 个函数是否为 window 全局（顶层声明或 window.xx=） */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', 'dist', 'deliverables']);

// 收集 HTML 中 data-csp-* 引用的函数名
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
    } else if (e.name.endsWith('.js')) jsFiles.push(f);
  }
}
walk(ROOT);

const fileCache = new Map();
function fileLines(f) {
  if (!fileCache.has(f)) fileCache.set(f, fs.readFileSync(f, 'utf8').split('\n'));
  return fileCache.get(f);
}

const bad = [];
for (const fn of [...fns].sort()) {
  let found = 'MISSING';
  const topRe = new RegExp('^function\\s+' + fn + '\\s*\\(');
  const nestRe = new RegExp('^\\s+function\\s+' + fn + '\\s*\\(');
  const winRe = new RegExp('window\\.' + fn + '\\s*=');
  const constRe = new RegExp('^(?:const|let|var)\\s+' + fn + '\\s*=\\s*function');
  for (const f of jsFiles) {
    const lines = fileLines(f);
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (topRe.test(line)) { found = 'TOP:' + rel + ':' + (i + 1); break; }
      if (winRe.test(line)) { found = 'WINDOW:' + rel + ':' + (i + 1); break; }
      if (constRe.test(line)) { found = 'TOP_CONST:' + rel + ':' + (i + 1); break; }
      if (nestRe.test(line)) { found = 'NESTED:' + rel + ':' + (i + 1); }
    }
    if (found.startsWith('TOP') || found.startsWith('WINDOW')) break;
  }
  const ok = found.startsWith('TOP') || found.startsWith('WINDOW') || found.startsWith('TOP_CONST');
  if (!ok) bad.push([fn, found]);
}

console.log('被引用函数:', fns.size);
console.log('=== 问题函数（非 window 全局）===');
for (const [k, v] of bad) console.log('  ' + k.padEnd(22) + v);
console.log('=== 非全局数量:', bad.length, '===');
