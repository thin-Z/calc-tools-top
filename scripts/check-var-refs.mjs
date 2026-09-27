#!/usr/bin/env node
/**
 * scripts/check-var-refs.mjs — 自定义属性引用门禁（R2 新建，2026-09-27，批 D）
 * -----------------------------------------------------------------
 * 背景：批 D 修 P1 缺陷时查明 css/style.css 的 `[data-theme="dark"]` 块里存在 5 条
 *       **自引用**声明：
 *           --like: var(--like);
 *           --cat-life-bg: var(--cat-life-bg);      （另 shopping / travel / image）
 *       自定义属性引用自身属**计算值阶段非法**：该令牌的计算值变为「guaranteed-invalid」，
 *       且**不会**回退到 :root 里的同名定义。后果是暗色主题下 4 类标签
 *       （.tag-life / .tag-shopping / .tag-travel / .tag-image）底板整片消失，
 *       以及 ~20 处取 --like 的点赞控件失去配色。
 *       这类失效**不报错、不崩溃、也不被任何既有门禁覆盖**——裸色值门禁只看字面颜色，
 *       令牌纪律门禁只看 box-shadow 声明级语法，都照不到「令牌之间的引用关系」。
 *       它与 R1 同属最贵的「沉默逻辑错误」，故新建本门禁补位。
 *
 * ── 命门：为什么必须机械守住，而不是靠人眼 ─────────────────────────
 * style.css 与 critical.css 的暗色块是**逐行孪生**的，但 critical.css 那一份
 * **恰好没有** -bg 自环。因此「保持一致」的直觉操作——把 style.css 的整块复制进
 * critical.css——会**新造 4 条自环**，把已修好的缺陷原样搬回来。
 * 本门禁把期望值钉在 0 并接入 verify-site：任何人再犯，计数立刻 0 → 4，门禁直接红。
 *
 * ── R2-a1：自引用 / 循环引用（期望 0，阻断）──────────────────────
 * 判定：对每条自定义属性声明，看它是否**能经由引用链回到自身**（直接自环或间接环）。
 *       逐条声明计数（而非逐令牌），便于直接定位到行。
 *
 * ── R2-a2：无定义且无回退的引用（期望 0，阻断）──────────────────
 * 判定：`var(--x)` 中，--x 既不在 css/ 任何文件中定义、也没有内联回退
 *       `var(--x, ...)`、且**不是运行时注入**的令牌 → 违规（该引用会整条失效）。
 *       运行时注入的令牌由本门禁自行扫描供给，故不会假阳性。
 *
 * ── 注入点自推导 ─────────────────────────────────────────────────
 * 扫描 js/**\/*.js（排除 vendor）中的 `el.style.setProperty('--x', ...)`，以及
 * *.html 中的内联 `style="--x: ..."` 与 <style> 块内定义。这些令牌的生命周期在运行时，
 * 静态查不到定义，必须计入白名单，否则会误报。
 *
 * 覆盖范围：css/ 下全部 *.css（含 tokens.css —— 它正是定义源，必须一起解析，
 *          这与「裸色值检查豁免 tokens.css」的口径不同，勿混淆）。
 *          CSS 注释先按同长度空白抹除，故文档里写 `var(--cat-*-bg)` 不会假阳性。
 *
 * 用法：
 *   node scripts/check-var-refs.mjs          # 详细输出；违规时 exit 1
 *   node scripts/check-var-refs.mjs --json   # JSON 输出 { a1, a2, injected, allOk }
 *
 * 退出码：0 = 全绿；1 = 存在违规（供 verify-site / CI 阻断）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = path.join(ROOT, 'css');
const JS_DIR = path.join(ROOT, 'js');
const jsonMode = process.argv.includes('--json');

/** 自定义属性定义：`--name: value;`（值里可含 var()、颜色函数等，不含裸 ; { }） */
const DECL_RE = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]*)/g;
/** var() 引用：捕获令牌名，并检测紧随其后的逗号即「有内联回退」 */
const VAR_RE = /var\(\s*(--[a-zA-Z0-9_-]+)\s*(,)?/g;
/** 运行时注入：el.style.setProperty('--x', ...) */
const SETPROP_RE = /setProperty\(\s*['"](--[a-zA-Z0-9_-]+)['"]/g;
/** 运行时注入：内联 style="... --x: ..." */
const INLINE_STYLE_RE = /style\s*=\s*["'][^"']*?(--[a-zA-Z0-9_-]+)\s*:/g;

/** 把 CSS 注释替换为同长度空白（保留换行）——保持字符偏移与行号不变 */
function blankComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** 收集块区间 {start, end, selector} —— 给命中项标注所在条件块（如 [[data-theme="dark"]]）
    好处：本轮 6 处命中全部落在暗色块内，「亮色全绿、只有暗色坏」一眼可读，
    否则报告会被误读为「全站坏」而错判严重度。 */
function collectBlocks(src) {
  const blocks = [];
  const stack = [];
  let headStart = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      const head = src.slice(headStart, i).replace(/\s+/g, ' ').trim().slice(-80);
      stack.push({ start: i, selector: head });
      headStart = i + 1;
    } else if (ch === '}') {
      const b = stack.pop();
      if (b) blocks.push({ start: b.start, end: i, selector: b.selector });
      headStart = i + 1;
    } else if (ch === ';') {
      headStart = i + 1;
    }
  }
  return blocks;
}

/** 行号查询：由字符偏移算出行号（1 起） */
function lineAt(src, offset) {
  let n = 1;
  for (let i = 0; i < offset && i < src.length; i++) if (src[i] === '\n') n++;
  return n;
}

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'test-results'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// ────────────── 1) 采集：定义 / 引用 / 注入点 ──────────────
const cssFiles = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css')).map((f) => path.join(CSS_DIR, f)).sort();
const jsFiles = walk(JS_DIR, (p) => p.endsWith('.js') && !rel(p).includes('vendor/'));
const htmlFiles = walk(ROOT, (p) => p.endsWith('.html'));

/** token -> Set(token)：该令牌的声明值里引用了哪些令牌（引用图，用于环检测） */
const graph = new Map();
/** 全部定义声明：{file,line,token} */
const decls = [];
/** 全部引用：{file,line,token,hasFallback} */
const refs = new Map(); // token -> [{file,line,hasFallback}]
/** 定义来源：token -> [{file,line}] */
const defs = new Map();
/** 每条声明自身引用了哪些令牌：index 与 decls 对齐（用于逐条定位，而非逐令牌） */
const declRefs = [];

for (const f of cssFiles) {
  const src = blankComments(fs.readFileSync(f, 'utf8'));
  const blocks = collectBlocks(src);
  for (const m of src.matchAll(DECL_RE)) {
    const token = m[1];
    const value = m[2];
    const line = lineAt(src, m.index);
    const innerBlock = blocks.filter((b) => b.start < m.index && m.index < b.end).sort((x, y) => y.start - x.start)[0];
    decls.push({ file: rel(f), line, token, block: innerBlock ? innerBlock.selector : '' });
    if (!defs.has(token)) defs.set(token, []);
    defs.get(token).push({ file: rel(f), line });
    if (!graph.has(token)) graph.set(token, new Set());
    const own = new Set();
    for (const v of value.matchAll(VAR_RE)) {
      graph.get(token).add(v[1]);
      own.add(v[1]);
    }
    declRefs.push(own);
  }
  for (const m of src.matchAll(VAR_RE)) {
    const token = m[1];
    if (!refs.has(token)) refs.set(token, []);
    const refBlock = blocks.filter((b) => b.start < m.index && m.index < b.end).sort((x, y) => y.start - x.start)[0];
    refs.get(token).push({ file: rel(f), line: lineAt(src, m.index), hasFallback: !!m[2], block: refBlock ? refBlock.selector : '' });
  }
}

/** 运行时注入的令牌（JS setProperty + HTML 内联 style / <style> 定义） */
const injected = new Map();
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(SETPROP_RE)) {
    if (!injected.has(m[1])) injected.set(m[1], []);
    injected.get(m[1]).push(`${rel(f)}:${lineAt(src, m.index)}`);
  }
}
for (const f of htmlFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(INLINE_STYLE_RE)) {
    if (!injected.has(m[1])) injected.set(m[1], []);
    injected.get(m[1]).push(rel(f));
  }
  for (const st of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const d of st[1].matchAll(DECL_RE)) {
      if (!injected.has(d[1])) injected.set(d[1], []);
      injected.get(d[1]).push(`${rel(f)} (<style>)`);
    }
  }
}

// ────────────── 2) R2-a1：自引用 / 循环引用 ──────────────
/** 从 start 出发沿引用图能否到达 target */
function reaches(start, target) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const t = stack.pop();
    if (t === target) return true;
    if (seen.has(t)) continue;
    seen.add(t);
    for (const n of graph.get(t) || []) stack.push(n);
  }
  return false;
}

// 逐条声明判定：只有「该声明自身」构成闭环才算违规。
// 不能按令牌判定——:root 里同一令牌的字面定义（rgba(...)）是无辜的，
// 按令牌判定会把它一并点名，计数虚高（实测会把 4 报成 12）。
const a1Findings = decls.filter((d, i) => {
  const own = declRefs[i];
  if (own.has(d.token)) return true;            // 直接自环
  for (const r of own) if (reaches(r, d.token)) return true; // 经引用链回到自身
  return false;
});

// ────────────── 3) R2-a2：无定义且无回退的引用 ──────────────
const a2Findings = [];
for (const [token, sites] of refs) {
  if (defs.has(token) || injected.has(token)) continue;
  for (const s of sites) if (!s.hasFallback) a2Findings.push({ token, ...s });
}
a2Findings.sort((x, y) => x.token.localeCompare(y.token) || x.file.localeCompare(y.file) || x.line - y.line);

// ────────────── 4) 输出 ──────────────
const ok = a1Findings.length === 0 && a2Findings.length === 0;

if (jsonMode) {
  console.log(JSON.stringify({
    a1: { expected: 0, actual: a1Findings.length, findings: a1Findings },
    a2: { expected: 0, actual: a2Findings.length, findings: a2Findings },
    injected: Object.fromEntries([...injected].map(([k, v]) => [k, v])),
    allOk: ok,
  }, null, 2));
} else {
  console.log(`[var-refs] 扫描范围: css/*.css 共 ${cssFiles.length} 文件 / 自定义属性定义 ${decls.length} 条 / 唯一令牌 ${defs.size} 个`);
  console.log(`[var-refs] 注入点扫描：js/**/*.js, *.html → 命中 ${injected.size} 个令牌`);
  for (const [k, v] of [...injected].sort()) console.log(`             ${k}  ←  ${v.slice(0, 4).join(', ')}${v.length > 4 ? ` 等 ${v.length} 处` : ''}`);

  console.log('');
  console.log(`[var-refs] R2-a1 自引用/循环引用（期望 0）: ${a1Findings.length === 0 ? '✓ 0' : `✗ ${a1Findings.length}`}`);
  for (const d of a1Findings) console.log(`             ${d.file}:${d.line}  ${d.token}${d.block ? `    in block: ${d.block}` : ''}`);
  if (a1Findings.length) {
    console.log('             → 自定义属性引用自身属计算值阶段非法，令牌计算值为空且不回退 :root，');
    console.log('               消费处整条声明失效（暗色标签底板消失 / 点赞配色丢失）。');
  }

  console.log('');
  console.log(`[var-refs] R2-a2 无定义且无回退的引用（期望 0）: ${a2Findings.length === 0 ? '✓ 0' : `✗ ${a2Findings.length}`}`);
  for (const d of a2Findings) console.log(`             ${d.token}  ${d.file}:${d.line}${d.block ? `    in block: ${d.block}` : ''}`);

  console.log('');
  console.log(`[var-refs] 结果: ${ok ? '✅ 全绿' : '❌ 未通过（阻断）'}`);
}

process.exit(ok ? 0 : 1);
