#!/usr/bin/env node
/**
 * scripts/check-p0-gate.mjs — Phase 0 P0 门禁（T0.4）+ Phase 1 紫色清零门禁（T1.1）
 * -----------------------------------------------------------------
 * 三项阻断检查：
 *   1. CSS 裸色值：style.css 与 critical.css 中非变量定义行不允许出现 rgba() 或 #hex
 *   2. Emoji 清零：非博客 HTML + JS 源码不允许出现图形 emoji
 *      （排除：箭头区间 2190-21FF、博客 /blog/ 正文 UGC）
 *   3. 紫二次色清零（Phase 1 T1.1，D7 决策）：全站禁止 purple/violet/indigo
 *      色值与 token（css 两文件 + 非 dist HTML/JS），注释行豁免
 *
 * 用法：
 *   node scripts/check-p0-gate.mjs          # 详细输出；违规时 exit 1
 *   node scripts/check-p0-gate.mjs --json   # JSON 输出 { css_violations, emoji_violations, purple_violations }
 *
 * 退出码：0 = 全绿；1 = 存在违规（供 verify-site / CI 阻断）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonMode = process.argv.includes('--json');

// ═══════════════════════════════════════════════════════════════
// 1. CSS 裸色值检查（style.css + critical.css — tokens.css 是定义方，豁免）
// ═══════════════════════════════════════════════════════════════
function checkCssColors() {
  // 覆盖 style.css + critical.css（T2.1 新增的关键 CSS，M3 补齐门禁）；tokens.css 为定义源不检
  const files = ['style.css', 'critical.css'];
  const violations = [];

  for (const cssFile of files) {
    const file = path.join(ROOT, 'css', cssFile);
    if (!fs.existsSync(file)) continue;

    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // Skip variable definitions (--xxx: ...) and @import and comment lines
      if (/^\s*--/.test(ln) || ln.trim().startsWith('@import') || ln.trim().startsWith('//') || ln.trim().startsWith('/*') || ln.trim().startsWith('*')) continue;

      // Strip var() contexts to avoid false positives
      const stripped = ln.replace(/var\([^)]+\)/g, '');

      // Check rgba (standalone, not inside var())
      const rgbaMatch = stripped.match(/rgba?\([^)]+\)/g);
      if (rgbaMatch) {
        violations.push({ file: cssFile, line: i + 1, type: 'rgba', values: rgbaMatch, context: ln.trim().slice(0, 120) });
      }

      // Check hex colors (standalone, not inside var())
      const hexMatch = stripped.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (hexMatch) {
        violations.push({ file: cssFile, line: i + 1, type: 'hex', values: hexMatch, context: ln.trim().slice(0, 120) });
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations: violations.length,
    detail: violations,
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. Emoji 扫描（非博客 HTML + 所有 JS）
// ═══════════════════════════════════════════════════════════════
// Emoji ranges — exclude arrows (2190-21FF), box-drawing (2500-257F),
// misc technical (2300-23FF), and FE0F variation selector
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu;

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
  let blogFilesSkipped = 0;

  walkDir(ROOT, (filepath) => {
    const rel = path.relative(ROOT, filepath).split(path.sep).join('/');
    const isBlog = /(^|\/)blog(\/|$)/.test(rel);

    // Blog files are fully exempt (UGC emoji preserved per D1 decision)
    if (isBlog) { blogFilesSkipped++; return; }

    if (filepath.endsWith('.js')) {
      const lines = fs.readFileSync(filepath, 'utf8').split('\n');
      lines.forEach((ln, i) => {
        // Skip lines that are comments
        if (ln.trim().startsWith('//') || ln.trim().startsWith('*')) return;
        const m = ln.match(EMOJI_RE);
        if (m) {
          violations.push({ file: rel, line: i + 1, emoji: [...new Set(m)].join(''), context: ln.trim().slice(0, 100) });
        }
      });
    } else if (filepath.endsWith('.html')) {
      // Non-blog HTML: any emoji is a violation
      const lines = fs.readFileSync(filepath, 'utf8').split('\n');
      lines.forEach((ln, i) => {
        const m = ln.match(EMOJI_RE);
        if (m) {
          violations.push({ file: rel, line: i + 1, emoji: [...new Set(m)].join(''), context: ln.trim().slice(0, 100) });
        }
      });
    }
  });

  return {
    ok: violations.length === 0,
    violations: violations.length,
    blogFilesSkipped,
    detail: violations,
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. 紫二次色清零（Phase 1 T1.1，D7 决策：纯 #007AFF 单一品牌蓝阶）
// ═══════════════════════════════════════════════════════════════
// 覆盖：css/tokens.css、css/style.css、css/critical.css（定义与引用双向禁止）+ 非 dist HTML/JS
// （防 JS 内联/文档类名回潮）。注释行豁免（允许"已移除"类说明文字）。
const PURPLE_HEX_RE = /#(?:5856[Dd]6|6856[Ee]8|7[Cc]3[Aa][Ee][Dd]|8[Bb]5[Cc][Ff]6|[Aa]78[Bb][Ff][Aa]|[Cc]4[Bb]5[Ff][Dd]|[Dd][Dd][Dd]6[Ff][Ee]|[Ee][Dd][Ee]9[Ff][Ee]|[Ff]5[Ff]3[Ff][Ff]|4[Cc]1[Dd]95|6[Dd]28[Dd]9|5[Bb]21[Bb]6|4[Ff]46[Ee]5|6366[Ff]1|[Aa]5[Bb]4[Ff][Cc]|312[Ee]81|5[Ee]5[Cc][Ee]6|[Ff]0[Ff]0[Ff][Ff]|[Ee][Ee][Ff]2[Ff][Ff])\b/g;
const PURPLE_RGBA_RE = /rgba?\(\s*(?:124\s*,\s*58\s*,\s*237|88\s*,\s*86\s*,\s*214|104\s*,\s*86\s*,\s*232|79\s*,\s*70\s*,\s*229|99\s*,\s*102\s*,\s*241)\b/g;
const PURPLE_TOKEN_DEF_RE = /--(?:brand-purple[\w-]*|purple-[\w]+|violet-[\w]+|indigo-[\w]+)\s*:/;
const PURPLE_TOKEN_USE_RE = /var\(\s*--(?:brand-purple[\w-]*|purple-[\w]+|violet-[\w]+|indigo-[\w]+)/;

function checkPurple() {
  const violations = [];

  const scanLine = (rel, i, ln) => {
    const t = ln.trim();
    if (t.startsWith('/*') || t.startsWith('*') || t.startsWith('//')) return; // 注释豁免
    const hits = [];
    for (const m of ln.matchAll(PURPLE_HEX_RE)) hits.push(m[0]);
    for (const m of ln.matchAll(PURPLE_RGBA_RE)) hits.push(m[0]);
    if (PURPLE_TOKEN_DEF_RE.test(ln) || PURPLE_TOKEN_USE_RE.test(ln)) hits.push('purple-token');
    if (hits.length) {
      violations.push({ file: rel, line: i + 1, what: [...new Set(hits)].join(','), context: t.slice(0, 110) });
    }
  };

  // a) CSS 文件逐行扫描（tokens.css + style.css + critical.css）
  for (const cssFile of ['tokens.css', 'style.css', 'critical.css']) {
    const p = path.join(ROOT, 'css', cssFile);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach((ln, i) => scanLine(`css/${cssFile}`, i, ln));
  }

  // b) 非 dist HTML/JS 扫描（hex/rgba/token 引用）
  walkDir(ROOT, (filepath) => {
    const rel = path.relative(ROOT, filepath).split(path.sep).join('/');
    if (!/\.(html|js)$/.test(filepath) || filepath.endsWith('.cjs')) return;
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      const t = ln.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;
      const hits = [];
      for (const m of ln.matchAll(PURPLE_HEX_RE)) hits.push(m[0]);
      for (const m of ln.matchAll(PURPLE_RGBA_RE)) hits.push(m[0]);
      if (PURPLE_TOKEN_USE_RE.test(ln)) hits.push('purple-token');
      if (hits.length) {
        violations.push({ file: rel, line: i + 1, what: [...new Set(hits)].join(','), context: t.slice(0, 110) });
      }
    });
  });

  return { ok: violations.length === 0, violations: violations.length, detail: violations };
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
const css = checkCssColors();
const emoji = checkEmoji();
const purple = checkPurple();

const allOk = css.ok && emoji.ok && purple.ok;

if (jsonMode) {
  process.stdout.write(JSON.stringify({ css, emoji, purple, allOk }, null, 2) + '\n');
} else {
  console.log(`[P0 gate] CSS 裸色值: ${css.violations === 0 ? '✓ 0' : '✗ ' + css.violations} 违规`);
  if (!css.ok) css.detail.forEach(v => console.log(`  ${v.file||''}:L${v.line} [${v.type}]: ${v.context}`));

  console.log(`[P0 gate] Emoji 清零: ${emoji.violations === 0 ? '✓ 0' : '✗ ' + emoji.violations} 违规 (博客 ${emoji.blogFilesSkipped} 文件豁免)`);
  if (!emoji.ok) emoji.detail.slice(0, 10).forEach(v => console.log(`  ${v.file}:${v.line} [${v.emoji}]: ${v.context}`));
  if (emoji.detail.length > 10) console.log(`  ... and ${emoji.detail.length - 10} more`);

  console.log(`[P0 gate] 紫二次色清零 (T1.1/D7): ${purple.violations === 0 ? '✓ 0' : '✗ ' + purple.violations} 违规`);
  if (!purple.ok) purple.detail.slice(0, 10).forEach(v => console.log(`  ${v.file}:${v.line} [${v.what}]: ${v.context}`));
  if (purple.detail.length > 10) console.log(`  ... and ${purple.detail.length - 10} more`);

  console.log(`\n[P0 gate] 结果: ${allOk ? '✅ 全绿' : '❌ 未通过（阻断）'}`);
}

process.exit(allOk ? 0 : 1);
