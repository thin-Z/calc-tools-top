#!/usr/bin/env node
/**
 * scripts/check-p0-gate.mjs — Phase 0 P0 门禁（T0.4）+ Phase 1 紫色清零门禁（T1.1）
 * -----------------------------------------------------------------
 * 三项阻断检查：
 *   1. CSS 裸色值：`css/` 下全部 *.css 中非变量定义行不允许出现 rgba() 或 #hex
 *      （tokens.css 是令牌定义源，豁免）
 *   2. Emoji 清零：全站源码（.js/.mjs/.cjs/.html/.py/.css）不允许出现图形 emoji
 *      （注释行豁免）。A2-b(2026-09-24)：按 AC-05 分「UI 侧 / 内容侧」——UI 侧
 *      （CSS content / 图标槽位 / CLI）阻断；内容侧（blog 正文 + 模板源
 *      generate-blog-posts.py）为已知例外，完整计数并显式报告但不阻断
 *   3. 紫二次色清零（Phase 1 T1.1，D7 决策）：全站禁止 purple/violet/indigo
 *      色值与 token（css 全部 + 非 dist 的 HTML/JS/SVG），注释行豁免
 *
 * ═══ V0（2026-09-23）修复门禁三重结构性缺陷（P0-6）═══
 * 背景：09-23《深度视觉审查报告》查明门禁体系自身有三处作用域/语义缺口，使多个 P0 视觉
 *       缺陷长期「全绿」。修复原则：**先让违规面红起来**，门禁严格化后才允许修资产。
 *
 *   A1 裸色值作用域缺口
 *      旧：`const files = ['style.css','critical.css']` —— 硬编码两个文件名，
 *          导致 css/badge-maker.css（48KB）/ css/admin.css 从未被扫描。
 *      新：扫 `css/*.css` 全部，仅豁免 tokens.css（定义源）。
 *
 *   A2 Emoji 扫描语义误判
 *      旧：`if (isBlog) { blogFilesSkipped++; return; }` 把 blog 整目录排除，注释称
 *          「UGC emoji preserved per D1 decision」。
 *      新：取消整目录豁免 —— blog 正文由 scripts/generate-blog-posts.py **模板生成**，
 *          其中的 📖/📅/📰/🧮 是功能性 UI 图标，不是用户产出（UGC），原判定为语义误判，
 *          后果是内容量最大的板块（80 个 HTML）完全脱离门禁。
 *          同时后缀扩展为 .js/.mjs/.cjs/.html/.py/.css（原仅 .js/.html）。
 *      ⚠️ EMOJI_RE 的区间豁免（箭头 2190-21FF、box-drawing 2500-257F、misc technical
 *         2300-23FF 不进入正则）**必须保留** —— 历史踩坑：误把非 emoji 符号纳入会导致
 *         箭头被误报。正则区间不得改动。
 *
 *   A3 紫值扫描缺口
 *      旧：仅扫 css 三文件 + 非 dist 的 .html/.js。
 *      新：追加 `.svg` 扫描（assets/ 等全仓 svg 含子目录，仍排除 dist/node_modules）；正则补
 *          `#3730a3`（indigo-800，3 个 logo 资产命中但旧正则未列）。
 *
 * 用法：
 *   node scripts/check-p0-gate.mjs          # 详细输出；违规时 exit 1
 *   node scripts/check-p0-gate.mjs --json   # JSON 输出 { css, emoji, purple, duplicateSelectors, allOk }
 *
 * 退出码：0 = 全绿；1 = 存在违规（供 verify-site / CI 阻断）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonMode = process.argv.includes('--json');

const CSS_DIR = path.join(ROOT, 'css');
// CSS 定义源白名单：只允许 tokens.css 出现色字面量（它是令牌定义方）
const CSS_DEFINITION_SOURCE = 'tokens.css';

/** 列出门禁扫描范围内的 css 文件名（排除定义源），按名字排序保证输出稳定 */
function listScannableCss() {
  if (!fs.existsSync(CSS_DIR)) return [];
  return fs.readdirSync(CSS_DIR)
    .filter((f) => f.endsWith('.css') && f !== CSS_DEFINITION_SOURCE)
    .sort();
}

// ═══════════════════════════════════════════════════════════════
// 1. CSS 裸色值检查（css/*.css — tokens.css 是定义方，豁免）
// ═══════════════════════════════════════════════════════════════
function checkCssColors() {
  // A1(2026-09-23)：作用域由硬编码 ['style.css','critical.css'] 扩为 css/ 下全部 *.css。
  // 旧写法使 badge-maker.css / admin.css 长期脱离门禁（实测 badge-maker.css 含 97 处色字面量）。
  const files = listScannableCss();
  const violations = [];
  let scanned = 0;
  // 行级条目数（violations.length）与色字面量出现次数是两个口径：
  // 同一行同时含 hex 与 rgba、或一行多个同类型字面量时，条目数为 1 而字面量数 > 1。
  // 这里分别统计，避免「违规面清单」在不同口径下互相矛盾。
  let literals = { hex: 0, rgba: 0 };

  for (const cssFile of files) {
    const file = path.join(CSS_DIR, cssFile);
    if (!fs.existsSync(file)) continue;
    scanned++;

    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // Skip variable definitions (--xxx: ...) and @import and comment lines
      if (/^\s*--/.test(ln) || ln.trim().startsWith('@import') || ln.trim().startsWith('//') || ln.trim().startsWith('/*') || ln.trim().startsWith('*')) continue;

      // 「RGB 分量令牌 + 字面 alpha」属合法令牌化写法（色值来自令牌，仅 alpha 为字面量），
      // 例：rgba(var(--bm-ink-rgb), .09) —— 设计系统的标准 alpha 变体模式（Bootstrap/Tailwind 同款）。
      // 先剔除这类再判裸色值，否则会被误报为硬编码。
      // ⚠️ 豁免边界：只放行「第一个分量必须是 var()」的形式；rgba(255,255,255,.5) 仍判违规。
      const withoutTokenRgba = ln.replace(
        /rgba?\(\s*var\(\s*--[a-z0-9-]+\s*\)\s*(?:,\s*(?:var\(\s*--[a-z0-9-]+\s*\)|[0-9.]+%?)\s*)*\)/gi,
        '',
      );
      // Strip var() contexts to avoid false positives
      const stripped = withoutTokenRgba.replace(/var\([^)]+\)/g, '');

      // Check rgba (standalone, not inside var())
      const rgbaMatch = stripped.match(/rgba?\([^)]+\)/g);
      if (rgbaMatch) {
        literals.rgba += rgbaMatch.length;
        violations.push({ file: `css/${cssFile}`, line: i + 1, type: 'rgba', values: rgbaMatch, context: ln.trim().slice(0, 120) });
      }

      // Check hex colors (standalone, not inside var())
      const hexMatch = stripped.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (hexMatch) {
        literals.hex += hexMatch.length;
        violations.push({ file: `css/${cssFile}`, line: i + 1, type: 'hex', values: hexMatch, context: ln.trim().slice(0, 120) });
      }
    }
  }

  return {
    ok: violations.length === 0,
    scannedFiles: scanned,
    violations: violations.length,
    literals,
    literalTotal: literals.hex + literals.rgba,
    detail: violations,
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. Emoji 扫描（全站源码，含 blog）
// ═══════════════════════════════════════════════════════════════
// Emoji ranges — exclude arrows (2190-21FF), box-drawing (2500-257F),
// misc technical (2300-23FF), and FE0F variation selector
// ⚠️ 该区间表不得改动（历史踩坑：误纳入非 emoji 符号 → 箭头被误报）。
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu;
// A2(2026-09-23)：后缀由 .js/.html 扩为下列六种，覆盖模板生成器（.py）与样式（.css）
const EMOJI_EXTS = ['.js', '.mjs', '.cjs', '.html', '.py', '.css'];

function walkDir(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name.startsWith('dist')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, cb);
    else cb(full);
  }
}

function checkEmoji() {
  const violations = [];
  const contentSide = [];   // AC-05 内容侧已知例外：不阻断，但完整计数与文件清单可见
  let blogFilesScanned = 0;
  let emojiCount = 0;

  walkDir(ROOT, (filepath) => {
    const rel = path.relative(ROOT, filepath).split(path.sep).join('/');
    const ext = path.extname(filepath);
    if (!EMOJI_EXTS.includes(ext)) return;

    // A2(2026-09-23)：取消 blog 整目录豁免（改为「扫描并分类」，不再静默 return）。
    // A2-b(2026-09-24)：按 AC-05 落地——emoji 分「UI 侧」与「内容侧」两类：
    //   · UI 侧（CSS content / HTML 图标槽位 / CLI 输出）→ 即 emoji 作功能图标，**阻断**
    //   · 内容侧（blog 正文 + 生成它的模板源 generate-blog-posts.py）→ 属正文内容装饰，
    //     实测 0 个位于图标槽位；AC-05 明确允许「确认维持现状并记录为风格取舍」，
    //     故**完整计数 + 显式报告，但不阻断**。
    // ⚠️ 与旧的「blog 整目录 return」有本质区别：旧写法完全不可见（假绿）；
    //    此处是已知例外清单——计数、文件清单、判定依据全部可见可追溯，
    //    且例外范围被严格限定为上面两个，不得扩为整目录或按后缀放宽。
    const isBlog = /(^|\/)blog(\/|$)/.test(rel);
    const isContentSide = isBlog || rel === 'scripts/generate-blog-posts.py';
    if (isBlog) blogFilesScanned++;

    // 注释行豁免（沿用原 .js 语义，随后缀扩展一并适用到 .mjs/.cjs/.py/.css）：
    // 注释里的符号不是「功能图标」，计入会制造噪声底噪；功能位（HTML 结构 / CSS 声明 /
    // 模板字符串 / Python 字符串字面量）一律扫描。
    const isHtml = ext === '.html';
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      const t = ln.trim();
      if (!isHtml && (t.startsWith('//') || t.startsWith('*') || t.startsWith('#'))) return;
      const m = ln.match(EMOJI_RE);
      if (m) {
        emojiCount += m.length;
        const item = { file: rel, line: i + 1, emoji: [...new Set(m)].join(''), context: t.slice(0, 100) };
        if (isContentSide) contentSide.push(item); else violations.push(item);
      }
    });
  });

  return {
    ok: violations.length === 0,
    violations: violations.length,
    emojiCount,
    blogFilesScanned,
    contentSide: { lines: contentSide.length, files: [...new Set(contentSide.map((v) => v.file))].length },
    detail: violations,
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. 紫二次色清零（Phase 1 T1.1，D7 决策：纯 #007AFF 单一品牌蓝阶）
// ═══════════════════════════════════════════════════════════════
// 覆盖：css/ 全部 *.css（定义与引用双向禁止）+ 非 dist 的 HTML/JS/SVG（防 JS 内联 /
// 文档类名 / 图标资产回潮）。注释行豁免（允许「已移除」类说明文字）。
// A3(2026-09-23)：正则补 #3730a3（indigo-800）——3 个 logo 资产命中而旧正则未列，
// 造成「logo 仍是紫渐变、门禁全绿」的假阴性。
const PURPLE_HEX_RE = /#(?:5856[Dd]6|6856[Ee]8|7[Cc]3[Aa][Ee][Dd]|8[Bb]5[Cc][Ff]6|[Aa]78[Bb][Ff][Aa]|[Cc]4[Bb]5[Ff][Dd]|[Dd][Dd][Dd]6[Ff][Ee]|[Ee][Dd][Ee]9[Ff][Ee]|[Ff]5[Ff]3[Ff][Ff]|4[Cc]1[Dd]95|6[Dd]28[Dd]9|5[Bb]21[Bb]6|4[Ff]46[Ee]5|6366[Ff]1|[Aa]5[Bb]4[Ff][Cc]|312[Ee]81|3730[Aa]3|5[Ee]5[Cc][Ee]6|[Ff]0[Ff]0[Ff][Ff]|[Ee][Ee][Ff]2[Ff][Ff])\b/g;
const PURPLE_RGBA_RE = /rgba?\(\s*(?:124\s*,\s*58\s*,\s*237|88\s*,\s*86\s*,\s*214|104\s*,\s*86\s*,\s*232|79\s*,\s*70\s*,\s*229|99\s*,\s*102\s*,\s*241)\b/g;
const PURPLE_TOKEN_DEF_RE = /--(?:brand-purple[\w-]*|purple-[\w]+|violet-[\w]+|indigo-[\w]+)\s*:/;
const PURPLE_TOKEN_USE_RE = /var\(\s*--(?:brand-purple[\w-]*|purple-[\w]+|violet-[\w]+|indigo-[\w]+)/;
// A3(2026-09-23)：扫描后缀追加 svg（资产图形同样承载品牌色，此前为零覆盖盲区）
const PURPLE_EXTS = /\.(html|js|svg)$/;

function checkPurple() {
  const violations = [];
  let scannedFiles = 0;
  let hitsCount = 0;

  const scanLine = (rel, i, ln) => {
    const t = ln.trim();
    if (t.startsWith('/*') || t.startsWith('*') || t.startsWith('//')) return; // 注释豁免
    const hits = [];
    for (const m of ln.matchAll(PURPLE_HEX_RE)) hits.push(m[0]);
    for (const m of ln.matchAll(PURPLE_RGBA_RE)) hits.push(m[0]);
    if (PURPLE_TOKEN_DEF_RE.test(ln) || PURPLE_TOKEN_USE_RE.test(ln)) hits.push('purple-token');
    if (hits.length) {
      hitsCount += hits.length;
      violations.push({ file: rel, line: i + 1, what: [...new Set(hits)].join(','), context: t.slice(0, 110) });
    }
  };

  // a) CSS 文件逐行扫描（tokens.css + 其余全部 css）
  for (const cssFile of [CSS_DEFINITION_SOURCE, ...listScannableCss()]) {
    const p = path.join(CSS_DIR, cssFile);
    if (!fs.existsSync(p)) continue;
    scannedFiles++;
    fs.readFileSync(p, 'utf8').split('\n').forEach((ln, i) => scanLine(`css/${cssFile}`, i, ln));
  }

  // b) 非 dist 的 HTML/JS/SVG 扫描（hex/rgba/token 引用）
  walkDir(ROOT, (filepath) => {
    const rel = path.relative(ROOT, filepath).split(path.sep).join('/');
    if (!PURPLE_EXTS.test(filepath) || filepath.endsWith('.cjs')) return;
    scannedFiles++;
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      const t = ln.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;
      const hits = [];
      for (const m of ln.matchAll(PURPLE_HEX_RE)) hits.push(m[0]);
      for (const m of ln.matchAll(PURPLE_RGBA_RE)) hits.push(m[0]);
      if (PURPLE_TOKEN_USE_RE.test(ln)) hits.push('purple-token');
      if (hits.length) {
        hitsCount += hits.length;
        violations.push({ file: rel, line: i + 1, what: [...new Set(hits)].join(','), context: t.slice(0, 110) });
      }
    });
  });

  return { ok: violations.length === 0, scannedFiles, violations: violations.length, hits: hitsCount, detail: violations };
}

// ═══════════════════════════════════════════════════════════════
// 4. 重复选择器数（T-1 趋势指标，非阻断）
//    仅观察 style.css 内重复出现的选择器数量，用于跟踪 CSS 膨胀趋势；
//    不计入 allOk（不阻断构建 / verify）。
// ═══════════════════════════════════════════════════════════════
function checkDuplicateSelectors() {
  const p = path.join(ROOT, 'css', 'style.css');
  if (!fs.existsSync(p)) return { ok: true, total: 0, duplicates: 0, top: [] };

  const src = fs.readFileSync(p, 'utf8');
  const freq = new Map();
  let total = 0;

  for (const block of src.split('}')) {
    const idx = block.lastIndexOf('{');
    if (idx < 0) continue;
    const head = block.slice(0, idx).trim();
    // 跳过 at-rule（@media / @keyframes / @supports 等），避免伪选择器噪声
    if (head.startsWith('@')) continue;
    for (const raw of head.split(',')) {
      const sel = raw.trim();
      if (!sel) continue;
      total++;
      freq.set(sel, (freq.get(sel) || 0) + 1);
    }
  }

  const dups = [...freq.entries()].filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([sel, n]) => ({ sel, n }));

  return { ok: true, total, duplicates: dups.length, top: dups };
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
const css = checkCssColors();
const emoji = checkEmoji();
const purple = checkPurple();
const dupSel = checkDuplicateSelectors(); // 趋势指标，非阻断

const allOk = css.ok && emoji.ok && purple.ok;

/** 按文件聚合计数，方便 V1–V6 批次修复定位（Top N） */
function groupByFile(detail, n = 8) {
  const m = new Map();
  for (const v of detail) m.set(v.file, (m.get(v.file) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([file, count]) => ({ file, count }));
}

if (jsonMode) {
  process.stdout.write(JSON.stringify({
    css: { ...css, byFile: groupByFile(css.detail) },
    emoji: { ...emoji, byFile: groupByFile(emoji.detail) },
    purple: { ...purple, byFile: groupByFile(purple.detail) },
    duplicateSelectors: dupSel,
    allOk,
  }, null, 2) + '\n');
} else {
  console.log(`[P0 gate] CSS 裸色值 (css/*.css 共 ${css.scannedFiles} 文件, 豁免 ${CSS_DEFINITION_SOURCE}): ${css.violations === 0 ? '✓ 0' : '✗ ' + css.violations + ' 行级条目 / ' + css.literalTotal + ' 处字面量'} (hex ${css.literals.hex} + rgba ${css.literals.rgba})`);
  if (!css.ok) css.detail.slice(0, 10).forEach(v => console.log(`  ${v.file}:L${v.line} [${v.type}]: ${v.context}`));
  if (css.detail.length > 10) console.log(`  ... and ${css.detail.length - 10} more`);
  if (!css.ok) groupByFile(css.detail).forEach(g => console.log(`   ×${g.count}  ${g.file}`));

  console.log(`[P0 gate] Emoji 清零 (UI 侧阻断 / 内容侧已知例外): ${emoji.violations === 0 ? '✓ 0 阻断违规' : '✗ ' + emoji.violations + ' 行级阻断条目 / ' + emoji.emojiCount + ' 个 emoji'}`);
  console.log(`           ↳ 内容侧已知例外 ${emoji.contentSide.lines} 行 / ${emoji.contentSide.files} 文件（blog 正文 ${emoji.blogFilesScanned} + 模板源 generate-blog-posts.py）；AC-05 路径②「维持现状并记录为风格取舍」，完整计数但不阻断`);
  if (!emoji.ok) emoji.detail.slice(0, 10).forEach(v => console.log(`  ${v.file}:${v.line} [${v.emoji}]: ${v.context}`));
  if (emoji.detail.length > 10) console.log(`  ... and ${emoji.detail.length - 10} more`);
  if (!emoji.ok) groupByFile(emoji.detail).forEach(g => console.log(`   ×${g.count}  ${g.file}`));

  console.log(`[P0 gate] 紫二次色清零 (T1.1/D7, 覆盖 css+html+js+svg 共 ${purple.scannedFiles} 文件): ${purple.violations === 0 ? '✓ 0' : '✗ ' + purple.violations + ' 行级条目 / ' + purple.hits + ' 处紫值'}`);
  if (!purple.ok) purple.detail.slice(0, 10).forEach(v => console.log(`  ${v.file}:${v.line} [${v.what}]: ${v.context}`));
  if (purple.detail.length > 10) console.log(`  ... and ${purple.detail.length - 10} more`);

  // 趋势指标（非阻断）
  console.log(`[P0 gate] 重复选择器(趋势,不阻断): 总计 ${dupSel.total} / 重复 ${dupSel.duplicates} 个`);
  dupSel.top.forEach(d => console.log(`   ×${d.n}  ${d.sel.slice(0, 80)}`));

  console.log(`\n[P0 gate] 结果: ${allOk ? '✅ 全绿' : '❌ 未通过（阻断）'}`);
}

process.exit(allOk ? 0 : 1);
