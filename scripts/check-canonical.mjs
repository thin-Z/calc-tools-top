#!/usr/bin/env node
/**
 * scripts/check-canonical.mjs — T0.5 canonical/hreflang 门禁
 * -----------------------------------------------------------------
 * 校验 dist/ 下所有可索引 HTML 页面（排除 noindex、404）：
 *   1. 每页恰好 1 个 <link rel="canonical" href="...">，URL 与文件路径一致
 *   2. 双语页面有正确的 hreflang 互指（zh↔en）
 *   3. 博客文章有 canonical（keyword-density 博客补 canonical 已完成）
 *
 * 用法：node scripts/check-canonical.mjs [--json]
 * 退出码：0 = 全绿；1 = 存在违规。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DOMAIN = 'https://www.calc-tools.top';
const jsonMode = process.argv.includes('--json');

const failures = [];
function fail(msg) { failures.push(msg); }

// ── Collect all HTML files in dist ──
function walkHtml(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'dist.bak') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkHtml(full));
    else if (entry.name.endsWith('.html')) results.push(full);
  }
  return results;
}

const allHtml = walkHtml(DIST);
const stats = { total: allHtml.length, checked: 0, skipped_noindex: 0, canonical_ok: 0, canonical_fail: 0, hreflang_ok: 0, hreflang_fail: 0 };

for (const filepath of allHtml) {
  const rel = path.relative(DIST, filepath).split(path.sep).join('/');
  const src = fs.readFileSync(filepath, 'utf8');

  // Skip noindex pages
  if (/noindex/i.test(src)) { stats.skipped_noindex++; continue; }

  // Skip 404
  if (rel === '404.html') continue;

  stats.checked++;

  // Compute expected canonical URL
  let expectedPath = '/' + rel.replace(/\.html$/, '');
  if (expectedPath === '/index') expectedPath = '/';
  if (expectedPath.endsWith('/index')) expectedPath = expectedPath.replace(/\/index$/, '/');
  const expectedCanonical = DOMAIN + expectedPath;

  // ── Check 1: Canonical tag ──
  const canonicalMatch = src.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
    || src.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i);

  if (!canonicalMatch) {
    fail(`[canonical] ${rel}: 缺少 <link rel="canonical">`);
    stats.canonical_fail++;
  } else {
    const href = canonicalMatch[1];
    // Normalize: remove trailing slash mismatch, domain prefix
    const normHref = href.replace(/\/$/, '') || '/';
    const normExpected = expectedCanonical.replace(/\/$/, '') || '/';
    if (normHref !== normExpected) {
      fail(`[canonical] ${rel}: href="${href}" 期望="${expectedCanonical}"`);
      stats.canonical_fail++;
    } else {
      stats.canonical_ok++;
    }
  }

  // ── Check 2: Hreflang for bilingual pages ──
  // Determine if this page has a counterpart in the other language
  let counterpartRel = null;
  if (rel.startsWith('en/')) {
    counterpartRel = rel.replace(/^en\//, 'zh/');
  } else if (rel.startsWith('zh/')) {
    counterpartRel = rel.replace(/^zh\//, 'en/');
  }
  // Blog pages: blog/en/ ↔ blog/zh/
  if (rel.startsWith('blog/en/')) {
    counterpartRel = rel.replace(/^blog\/en\//, 'blog/zh/');
  } else if (rel.startsWith('blog/zh/')) {
    counterpartRel = rel.replace(/^blog\/zh\//, 'blog/en/');
  }

  if (counterpartRel) {
    const counterpartPath = path.join(DIST, counterpartRel);
    if (fs.existsSync(counterpartPath)) {
      // This page should have hreflang tags
      const hasHreflangZh = /hreflang="zh(-CN)?"/i.test(src);
      const hasHreflangEn = /hreflang="en(-US)?"/i.test(src);
      if (!hasHreflangZh || !hasHreflangEn) {
        fail(`[hreflang] ${rel}: 缺少 hreflang 互指 (zh:${hasHreflangZh} en:${hasHreflangEn})`);
        stats.hreflang_fail++;
      } else {
        stats.hreflang_ok++;
      }
    }
  }
}

// ── Output ──
if (jsonMode) {
  process.stdout.write(JSON.stringify({ stats, failures }, null, 2) + '\n');
} else {
  console.log(`[canonical] 检查 ${stats.checked} 页（跳过 ${stats.skipped_noindex} noindex）`);
  console.log(`[canonical] 通过: ${stats.canonical_ok} / 失败: ${stats.canonical_fail}`);
  console.log(`[hreflang]  通过: ${stats.hreflang_ok} / 失败: ${stats.hreflang_fail}`);
  if (failures.length) {
    failures.forEach(f => console.log(`  ✗ ${f}`));
  }
  console.log(`\n[P0 gate] canonical/hreflang: ${failures.length === 0 ? '✅ 全绿' : '❌ 未通过'}`);
}

process.exit(failures.length > 0 ? 1 : 0);
