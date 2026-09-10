#!/usr/bin/env node
/**
 * check-sitemap-coverage.mjs — sitemap 反向覆盖门禁（verify #33，2026-09-10）
 *
 * 背景（技术债审计 #1）：verify #28（scripts/check-sitemap.mjs）只做单向断言
 * 「sitemap 里的每个 <loc> 都能映射到真实源文件」，缺反向断言
 * 「页面存在但漏收录进 sitemap」。漏收录 = 该页永不被发现 → 直接拖累核心增长
 * 目标（Indexed 143/350 → ≥250）。此前 32 项断言无一覆盖。
 *
 * 判据：文件系统推导（与生成侧 scripts/generate-sitemap.ps1 同口径同源），
 *       **不用** TOOL_IDS / BLOG_IDS 白名单（理由见 README「为什么不用白名单」）。
 *
 *   期望集 = walkHtml(源码 HTML，与 generate-sitemap.ps1:14 同排除集)
 *          − {404.html, zh/index.html, embed.html}      // 与 ps1:7 同
 *          − noindex 页                                  // 复用 check-sitemap.mjs:52-56 口径
 *          − 工程目录（snapshots/ e2e/ test-results/ …） // 与 verify-site.mjs:30-33 同
 *          − scripts/sitemap-exclusions.json 显式豁免（每条须带 reason）
 *
 *   对期望集每条 → 按 ps1:84-87 规则算 URL → 断言 sitemap <loc> 命中
 *
 * 反向断言（防豁免清单腐化）：豁免条目对应的源文件必须存在，否则 FAIL（stale 检测）。
 *
 * 用法：node scripts/check-sitemap-coverage.mjs
 * 退出码：0 = 通过；1 = 存在漏收录页（或豁免清单过期）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const EXCLUSIONS_PATH = path.join(ROOT, 'scripts', 'sitemap-exclusions.json');
const BASE = 'https://www.calc-tools.top';

/**
 * 目录排除集：与 scripts/generate-sitemap.ps1 严格对齐（同集：node_modules/dist/docs/deliverables/
 * includes/api/scripts/css/js/assets/snapshots/e2e/test-results/playwright-report/.workbuddy/.git/.githooks），
 * 任一改动须双向同步；避免把测试产物/快照 HTML 扫进来造成误报或漏报。
 */
const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', '.workbuddy', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
  'e2e', 'test-results', 'playwright-report',
]);

/** 文件排除集：与 scripts/generate-sitemap.ps1:7 完全一致。 */
const EXCLUDE_FILES = new Set(['404.html', 'zh/index.html', 'embed.html']);

const failures = [];
function fail(msg) { failures.push(msg); }

/** 递归收集源码 HTML（返回相对 ROOT 的 POSIX 路径）。 */
function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('dist.bak')) continue; // 与 verify-site.mjs:41 同口径
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return out;
}

/**
 * noindex 判定：与 scripts/check-sitemap.mjs:52-56 / generate-sitemap.ps1:23-27 同源
 * （两种 meta 属性顺序都覆盖），保证门禁与生成侧口径一致。
 */
function isNoindex(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return /<meta[^>]*name="robots"[^>]*noindex/i.test(raw)
    || /<meta[^>]*content="[^"]*noindex[^"]*"[^>]*name="robots"/i.test(raw);
}

/** 文件路径 → sitemap URL，规则与 generate-sitemap.ps1:84-87 逐字对齐。 */
function toUrl(relPath) {
  let cleanPath = `/${relPath.replace(/\.html$/, '')}`;
  if (/\/index$/.test(cleanPath)) cleanPath = cleanPath.replace(/\/index$/, '/');
  return `${BASE}${cleanPath}`;
}

/** 读取显式豁免清单；返回 { paths:Set<string>, stale:string[] }。 */
function loadExclusions(allRelPaths) {
  const paths = new Set();
  if (!fs.existsSync(EXCLUSIONS_PATH)) return { paths };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(EXCLUSIONS_PATH, 'utf8'));
  } catch (e) {
    fail(`scripts/sitemap-exclusions.json 解析失败: ${e.message}`);
    return { paths };
  }
  const list = Array.isArray(parsed && parsed.exclusions) ? parsed.exclusions : [];
  const onDisk = new Set(allRelPaths);
  const stale = [];
  for (const item of list) {
    const rel = typeof item === 'string' ? item : item && item.path;
    if (!rel) { fail('scripts/sitemap-exclusions.json 存在缺少 path 的条目'); continue; }
    if (typeof item !== 'string' && !item.reason) {
      fail(`豁免条目缺少 reason: ${rel}（每条豁免必须写明理由，否则视为 drift）`);
    }
    if (!onDisk.has(rel)) stale.push(rel); // 文件已删但仍挂豁免 → stale
    paths.add(rel);
  }
  return { paths, stale };
}

// ---------- 1. 收集期望集 ----------
const allRel = walkHtml(ROOT).sort();
const { paths: excluded, stale } = loadExclusions(allRel);

const expected = [];
let skippedPreset = 0;
let skippedNoindex = 0;
let skippedExclusion = 0;
for (const rel of allRel) {
  if (EXCLUDE_FILES.has(rel)) { skippedPreset++; continue; }
  if (excluded.has(rel)) { skippedExclusion++; continue; }
  if (isNoindex(path.join(ROOT, rel))) { skippedNoindex++; continue; }
  expected.push(rel);
}

// ---------- 2. 读取 sitemap ----------
if (!fs.existsSync(SITEMAP)) {
  fail('sitemap.xml 不存在');
  report();
}
const xml = fs.readFileSync(SITEMAP, 'utf8');
const locs = new Set(
  [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].trim())
);

// ---------- 3. 反向覆盖比对 ----------
const missing = expected.filter((rel) => !locs.has(toUrl(rel))).sort();

console.log(`[1] 源码 HTML: ${allRel.length} 页`);
console.log(`[2] 排除（生成侧预置 ${EXCLUDE_FILES.size} / noindex / 显式豁免）: `
  + `预置 ${skippedPreset} + noindex ${skippedNoindex} + 豁免 ${skippedExclusion}`);
console.log(`[3] 期望收录: ${expected.length} 页 | sitemap <loc>: ${locs.size} 条`);
console.log(`[4] 漏收录检查: ${missing.length ? `❌ ${missing.length} 页` : '✓ 0 页'}`);
if (missing.length) {
  for (const rel of missing.slice(0, 30)) {
    console.error(`    ✗ 页面存在但未进 sitemap: ${rel} → ${toUrl(rel)}`);
  }
  if (missing.length > 30) console.error(`    … 另有 ${missing.length - 30} 页`);
  fail(`sitemap 漏收录 ${missing.length} 页（页面存在但不在 sitemap.xml 中，须重跑 scripts/generate-sitemap.ps1）`);
}

// ---------- 4. 豁免清单 stale 反向断言 ----------
if (stale.length) {
  for (const rel of stale) console.error(`    ✗ 豁免条目已失效（文件不存在）: ${rel}`);
  fail(`scripts/sitemap-exclusions.json 含 ${stale.length} 条失效豁免（对应文件已删除，应清理）`);
}
console.log(`[5] 豁免清单: ${excluded.size} 条${stale.length ? `（含 ${stale.length} 条失效）` : ' ✓ 无失效条目'}`);

report();

function report() {
  if (failures.length) {
    console.error(`\n❌ check-sitemap-coverage 失败 ${failures.length} 项:`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`✅ check-sitemap-coverage: 期望 ${expected.length} 页 / sitemap ${locs.size} 条 / 漏收录 0 页`);
}
