#!/usr/bin/env node
/**
 * scripts/check-token-discipline.mjs — 令牌纪律门禁（V0 新建，2026-09-23，P0-6）
 * -----------------------------------------------------------------
 * 背景：09-23《深度视觉审查报告》P0-1 查明 style.css / critical.css 共 10 处
 *       `box-shadow` 把**值型阴影令牌**与字面 length 混排，浏览器按 CSS 规范整条声明
 *       丢弃（静默失效——既不报错也不生效，属最贵的「沉默逻辑错误」类失效）。
 *       既有门禁完全不覆盖「声明级语义」这一层，故新建本门禁补位。
 *
 * 令牌命名契约（**以此为准，务必不要混淆**）：
 *   --shadow-*        → 存**完整值**：如 `--shadow-sm: 0 1px 3px rgba(0,0,0,0.06);`
 *                        可参与长度运算 → 可被展开（值型）
 *   --shadow-color-*  → 存**颜色**：如 `--shadow-color-dark: rgba(0,0,0,0.3);`
 *                        只是阴影色 → **不得**当值型展开
 *
 * ── R1：box-shadow 值型令牌与字面 length 混排 ─────────────────────
 * 判定：把 `box-shadow:` 声明里的**值型** `var(--shadow-*)` 展开为其定义值后，按 CSS 语法
 *       逐层（逗号分隔的 <shadow> 层）统计 length 个数；任一层的 length 数 **> 4** 即违规。
 *       依据：`<shadow> = <color>? && [<length>{2,4}] && <color>?` —— 单层最多 4 个 length，
 *       超出后整条声明**语法无效、被浏览器静默丢弃**。
 *       逐层判定（而非全声明总长）是刻意的：`0 1px 2px rgba(), 0 2px 4px rgba()` 这类合法的
 *       多层阴影总长可达 4 以上，用总长判定会产生假阳性。
 *
 * 覆盖范围：与 check-p0-gate.mjs 的 CSS 裸色值检查**同作用域** —— css/ 下全部 *.css，
 *          仅豁免 tokens.css（定义源）。
 *
 * 用法：
 *   node scripts/check-token-discipline.mjs          # 详细输出；违规时 exit 1
 *   node scripts/check-token-discipline.mjs --json   # JSON 输出 { r1, allOk }
 *
 * 退出码：0 = 全绿；1 = 存在违规（供 verify-site / CI 阻断）。
 *
 * 说明：本轮（V0）**只报不改** —— 门禁先红起来，10 处 CSS 由后续 V1–V6 批次修复。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = path.join(ROOT, 'css');
const TOKENS_FILE = 'tokens.css'; // 令牌定义源：裸色值检查豁免它，但它正是本门禁的解析输入
const jsonMode = process.argv.includes('--json');

// 单层 <shadow> 的 length 上限（CSS 规范：2–4 个 <length>）
const MAX_LENGTHS_PER_LAYER = 4;

/** 值型阴影令牌：名字以 `--shadow-` 开头，但**排除**颜色型 `--shadow-color-*` */
const VALUE_SHADOW_NAME_RE = /^--shadow-(?!color-)/;
/** 「疑似阴影令牌」引用（含未定义/裸 `--shadow`）——仅用于信息性提示，不阻断 */
const SHADOW_REF_RE = /var\(\s*(--shadow[a-zA-Z0-9_-]*)/g;
/** 长度 token（CSS length / 无单位 0）：用逐 token 测试而非全文正则，避免 `0.5` 被 `\b0\b` 误切 */
const LENGTH_TOKEN_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q|%)?$/i;
/** 颜色函数（含嵌套），在统计 length 前需按平衡括号整体剔除 */
const COLOR_FN_HEAD_RE = /^(?:-webkit-|-moz-)?(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color|light-dark|device-cmyk)\s*\(/i;

/** 把 CSS 注释替换为同长度空白（保留换行）——保持字符偏移与行号不变 */
function blankComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** 解析 CSS 中的自定义属性定义 `--name: value;`，返回 Map */
function parseTokenDefs(src) {
  const defs = new Map();
  const re = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]*);/g;
  for (const m of src.matchAll(re)) defs.set(m[1], m[2].trim());
  return defs;
}

/** 从一批定义中筛出值型阴影令牌 */
function pickValueShadowTokens(defs) {
  const out = new Map();
  for (const [name, value] of defs) if (VALUE_SHADOW_NAME_RE.test(name)) out.set(name, value);
  return out;
}

/** 按平衡括号整体剔除颜色函数调用 */
function stripColorFunctions(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const m = COLOR_FN_HEAD_RE.exec(s.slice(i));
    if (m) {
      let depth = 0;
      let j = i + m[0].length - 1;
      for (; j < s.length; j++) {
        if (s[j] === '(') depth++;
        else if (s[j] === ')') { depth--; if (depth === 0) break; }
      }
      out += ' ';
      i = j + 1;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

/**
 * 展开值型阴影令牌。
 * - 值型 `var(--shadow-*)` → 递归替换为其定义值（最多 8 轮，防定义自引用死循环）
 * - 颜色型 `var(--shadow-color-*)` → 不展开（它只是颜色，不含 length），按 `var()` 剔除
 * - 其他 `var(...)` → 取 fallback（若有），否则剔除
 */
function expandShadowTokens(value, valueShadowTokens) {
  let out = value;
  for (let round = 0; round < 8; round++) {
    let substituted = false;
    out = out.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^()]*))?\)/g, (_full, name, fallback) => {
      if (valueShadowTokens.has(name)) {
        substituted = true;
        return ` ${valueShadowTokens.get(name)} `;
      }
      return fallback === undefined ? ' ' : ` ${fallback} `;
    });
    if (!substituted) break;
  }
  return out;
}

/** 统计一条 box-shadow 声明各层的 length 数 */
function countLengthsPerLayer(expanded) {
  const cleaned = stripColorFunctions(expanded).replace(/#[0-9a-fA-F]{3,8}\b/g, ' ');
  return cleaned
    .split(',')
    .map((layer) => layer.trim().split(/\s+/).filter((t) => t && LENGTH_TOKEN_RE.test(t)).length);
}

function listScannableCss() {
  if (!fs.existsSync(CSS_DIR)) return [];
  return fs.readdirSync(CSS_DIR)
    .filter((f) => f.endsWith('.css') && f !== TOKENS_FILE)
    .sort();
}

function checkR1() {
  // 防「静默变绿」：tokens.css 是本门禁唯一的令牌定义来源。若它缺失/被改名，
  // 值型令牌将无法展开、每条声明都算作 0 个 length → 门禁会**无声通过**（假阴性）。
  // 这正属本门禁要治的「沉默逻辑错误」，故此处必须显式硬失败，绝不降级为 0 违规。
  const tokensPath = path.join(CSS_DIR, TOKENS_FILE);
  if (!fs.existsSync(tokensPath)) {
    console.error(`[token-discipline] ✗ 令牌定义源缺失: css/${TOKENS_FILE}（无法展开值型阴影令牌，判定将失真；拒绝以「0 违规」静默通过）`);
    process.exit(1);
  }
  const globalDefs = parseTokenDefs(blankComments(fs.readFileSync(tokensPath, 'utf8')));
  const globalShadowTokens = pickValueShadowTokens(globalDefs);
  // 已知阴影令牌全集（值型 + 颜色型），用于区分「颜色型（合法）」与「真的未定义」
  const globalShadowNames = new Set([...globalDefs.keys()].filter((n) => /^--shadow/.test(n)));

  const files = listScannableCss();
  const violations = [];
  const unresolved = [];
  let declarations = 0;

  for (const cssFile of files) {
    const raw = fs.readFileSync(path.join(CSS_DIR, cssFile), 'utf8');
    const src = blankComments(raw);

    // 该文件的**局部**阴影令牌定义同样参与解析：如 css/badge-maker.css 在 .badge-maker-root
    // 内定义了 `--shadow` / `--shadow-sm`（局部作用域），若只用 tokens.css 展开会误判为未定义。
    const localDefs = parseTokenDefs(src);
    const valueShadowTokens = new Map([...globalShadowTokens, ...pickValueShadowTokens(localDefs)]);
    // 已知的阴影令牌名（值型 + 颜色型），用于区分「未定义」与「颜色型」
    const knownShadowNames = new Set([
      ...globalShadowNames,
      ...[...localDefs.keys()].filter((n) => /^--shadow/.test(n)),
    ]);

    const declRe = /box-shadow\s*:/g;
    for (const m of src.matchAll(declRe)) {
      const start = m.index + m[0].length;
      let end = start;
      while (end < src.length && src[end] !== ';' && src[end] !== '}') end++;
      const rawValue = src.slice(start, end);
      declarations++;

      // 信息性：引用了无法解析的阴影令牌（如拼写错误 / 未定义）——同样会导致整条声明失效
      for (const ref of rawValue.matchAll(SHADOW_REF_RE)) {
        if (!knownShadowNames.has(ref[1])) {
          unresolved.push({ file: `css/${cssFile}`, line: src.slice(0, start).split('\n').length, token: ref[1] });
        }
      }

      const expanded = expandShadowTokens(rawValue, valueShadowTokens);
      const perLayer = countLengthsPerLayer(expanded);
      const maxLayer = perLayer.length ? Math.max(...perLayer) : 0;
      if (maxLayer > MAX_LENGTHS_PER_LAYER) {
        violations.push({
          file: `css/${cssFile}`,
          line: src.slice(0, start).split('\n').length,
          layers: perLayer,
          maxLayer,
          limit: MAX_LENGTHS_PER_LAYER,
          expanded: expanded.trim().replace(/\s+/g, ' ').slice(0, 140),
          context: rawValue.trim().replace(/\s+/g, ' ').slice(0, 140),
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    scannedFiles: files.length,
    declarations,
    violations: violations.length,
    detail: violations,
    unresolvedShadowTokens: unresolved,
  };
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
const r1 = checkR1();
const allOk = r1.ok;

if (jsonMode) {
  process.stdout.write(JSON.stringify({ r1, allOk }, null, 2) + '\n');
} else {
  console.log(`[token-discipline] R1 box-shadow 值型令牌/length 混排 (扫描 css/*.css 共 ${r1.scannedFiles} 文件, ${r1.declarations} 条 box-shadow 声明, 豁免 ${TOKENS_FILE}): ${r1.ok ? '✓ 0' : '✗ ' + r1.violations} 违规`);
  r1.detail.forEach((v) => {
    console.log(`  ${v.file}:L${v.line} 单层 length ${v.maxLayer} > ${v.limit}（各层 ${v.layers.join('/')}）`);
    console.log(`      源码: ${v.context}`);
    console.log(`      展开: ${v.expanded}`);
  });
  if (r1.unresolvedShadowTokens.length) {
    console.log(`  ℹ 另有 ${r1.unresolvedShadowTokens.length} 处引用了无法解析的阴影令牌（信息性，不阻断）:`);
    r1.unresolvedShadowTokens.forEach((u) => console.log(`      ${u.file}:L${u.line} var(${u.token})`));
  }
  console.log(`\n[token-discipline] 结果: ${allOk ? '✅ 全绿' : '❌ 未通过（阻断）'}`);
}

process.exit(allOk ? 0 : 1);
