#!/usr/bin/env node
/**
 * scripts/check-p0-gate.mjs — Phase 0 P0 门禁（T0.4）
 * -----------------------------------------------------------------
 * 两项阻断检查：
 *   1. CSS 裸色值：style.css 中非变量定义行不允许出现 rgba() 或 #hex
 *   2. Emoji 清零：非博客 HTML + JS 源码不允许出现图形 emoji
 *      （排除：箭头区间 2190-21FF、博客 /blog/ 正文 UGC）
 *
 * 用法：
 *   node scripts/check-p0-gate.mjs          # 详细输出；违规时 exit 1
 *   node scripts/check-p0-gate.mjs --json   # JSON 输出 { css_violations, emoji_violations }
 *
 * 退出码：0 = 全绿；1 = 存在违规（供 verify-site / CI 阻断）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonMode = process.argv.includes('--json');

// ═══════════════════════════════════════════════════════════════
// 1. CSS 裸色值检查（style.css only — tokens.css 是定义方，豁免）
// ═══════════════════════════════════════════════════════════════
function checkCssColors() {
  const file = path.join(ROOT, 'css', 'style.css');
  if (!fs.existsSync(file)) return { ok: true, violations: 0, detail: 'style.css not found' };

  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    // Skip variable definitions (--xxx: ...) and @import
    if (/^\s*--/.test(ln) || ln.trim().startsWith('@import') || ln.trim().startsWith('//')) continue;

    // Strip var() contexts to avoid false positives
    const stripped = ln.replace(/var\([^)]+\)/g, '');

    // Check rgba (standalone, not inside var())
    const rgbaMatch = stripped.match(/rgba?\([^)]+\)/g);
    if (rgbaMatch) {
      violations.push({ line: i + 1, type: 'rgba', values: rgbaMatch, context: ln.trim().slice(0, 120) });
    }

    // Check hex colors (standalone, not inside var())
    const hexMatch = stripped.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hexMatch) {
      violations.push({ line: i + 1, type: 'hex', values: hexMatch, context: ln.trim().slice(0, 120) });
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
// Main
// ═══════════════════════════════════════════════════════════════
const css = checkCssColors();
const emoji = checkEmoji();

const allOk = css.ok && emoji.ok;

if (jsonMode) {
  process.stdout.write(JSON.stringify({ css, emoji, allOk }, null, 2) + '\n');
} else {
  console.log(`[P0 gate] CSS 裸色值: ${css.violations === 0 ? '✓ 0' : '✗ ' + css.violations} 违规`);
  if (!css.ok) css.detail.forEach(v => console.log(`  L${v.line} [${v.type}]: ${v.context}`));

  console.log(`[P0 gate] Emoji 清零: ${emoji.violations === 0 ? '✓ 0' : '✗ ' + emoji.violations} 违规 (博客 ${emoji.blogFilesSkipped} 文件豁免)`);
  if (!emoji.ok) emoji.detail.slice(0, 10).forEach(v => console.log(`  ${v.file}:${v.line} [${v.emoji}]: ${v.context}`));
  if (emoji.detail.length > 10) console.log(`  ... and ${emoji.detail.length - 10} more`);

  console.log(`\n[P0 gate] 结果: ${allOk ? '✅ 全绿' : '❌ 未通过（阻断）'}`);
}

process.exit(allOk ? 0 : 1);
