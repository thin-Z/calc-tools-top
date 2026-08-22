#!/usr/bin/env node
/**
 * scripts/csp-migrate-t03.mjs — CSP T03 统一事件委托层迁移（幂等）
 * ---------------------------------------------------------------
 * 依据：docs/csp-migration-arch.md D1（data-csp-* 属性 + document 级委托）
 * 动作：全站根目录 HTML（排除 dist/）将内联事件处理器 onxxx="..." 替换为 data-csp-*：
 *   - onsubmit="return false;" → data-csp-submit="prevent"
 *   - onclick="fn('arg')"      → data-csp-click="fn" data-csp-arg="arg"
 *   - onchange="fn(this.value)"→ data-csp-change="fn"（change 委托自动传 el.value）
 *   - onclick/onchange/oninput 的 fn() → data-csp-click/change/input="fn"
 *   - 其余 on*（onload 等非交互类）→ 保留并打印警告
 * 用法：node scripts/csp-migrate-t03.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'deliverables']);

// 需要委托的事件类型（交互类）
const DELEGATED = new Set(['click', 'change', 'input']);
// 保留不动的 on*（非交互/特殊；submit 由委托层处理，不放这里）
const KEEP = new Set(['load', 'error', 'pageshow', 'scroll', 'mouseover', 'mouseout', 'focus', 'blur', 'keydown', 'keyup', 'dragstart', 'dragover', 'drop']);

let stats = { replaced: 0, submit: 0, withArg: 0, kept: 0, unknown: 0 };
const unknownPatterns = new Map();

function walkHtml(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(full, cb);
    else if (e.name.endsWith('.html')) cb(full);
  }
}

/** 返回替换片段或 null（保留原样） */
function mapHandler(type, body) {
  const fnCall = body.trim();
  if (type === 'submit' && /^return\s+false;?$/.test(fnCall)) {
    stats.submit++;
    return 'data-csp-submit="prevent"';
  }
  // fn('arg')
  let m = fnCall.match(/^([A-Za-z_$][\w$]*)\(\s*['"]([^'"]*)['"]\s*\)$/);
  if (m) {
    stats.withArg++;
    return `data-csp-${type}="${m[1]}" data-csp-arg="${m[2]}"`;
  }
  // fn(this.value)（change/input 语义：委托层自动传 el.value）
  m = fnCall.match(/^([A-Za-z_$][\w$]*)\(this\.value\)$/);
  if (m && (type === 'change' || type === 'input')) {
    stats.replaced++;
    return `data-csp-${type}="${m[1]}"`;
  }
  // fn()
  m = fnCall.match(/^([A-Za-z_$][\w$]*)\(\)$/);
  if (m && DELEGATED.has(type)) {
    stats.replaced++;
    return `data-csp-${type}="${m[1]}"`;
  }
  // 未知模式
  stats.unknown++;
  const key = `on${type}="${fnCall}"`;
  unknownPatterns.set(key, (unknownPatterns.get(key) || 0) + 1);
  return null;
}

walkHtml(ROOT, (file) => {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  html = html.replace(/\son([a-z]+)\s*=\s*("([^"]*)"|'([^']*)')/gi, (full, type, q, dq, sq) => {
    const body = dq !== undefined ? dq : sq;
    if (KEEP.has(type.toLowerCase())) {
      stats.kept++;
      return full;
    }
    if (!DELEGATED.has(type.toLowerCase()) && !(type.toLowerCase() === 'submit')) {
      // 非交互但不在 KEEP 列表
      stats.unknown++;
      const key = `on${type}="${body}"`;
      unknownPatterns.set(key, (unknownPatterns.get(key) || 0) + 1);
      return full;
    }
    const rep = mapHandler(type.toLowerCase(), body);
    if (rep === null) return full;
    changed = true;
    return ' ' + rep;
  });

  if (changed) fs.writeFileSync(file, html, 'utf8');
});

console.log('\n========== T03 执行汇总 ==========');
console.log(JSON.stringify(stats, null, 2));
if (unknownPatterns.size) {
  console.log('\n--- 未处理模式（保留原样）---');
  for (const [k, v] of unknownPatterns) console.log(`[${v}x] ${k}`);
}
console.log('\n完成。下一步：node build.mjs && node verify-site.mjs');
