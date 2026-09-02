#!/usr/bin/env node
/**
 * check-sitemap.mjs — sitemap 健康门禁（verify #28，2026-09-02）
 *
 * 背景（审计 A-2）：8 个「已合并到 X 计算器」跳转壳页带 `<meta robots noindex>`，
 * 却仍列在 sitemap.xml 中 → GSC 报 "Submitted URL marked noindex"，削弱 sitemap
 * 有效性并直接拖累核心增长目标（Indexed 143/350 → ≥250）。此前 26 项断言无一覆盖。
 *
 * 判定口径：以**源码**（非 dist）为准反查每个 <loc> 对应的 HTML 文件，因为
 * sitemap 由 scripts/generate-sitemap.ps1 从源码生成，二者必须同源一致。
 *
 * 断言：
 *   1. sitemap.xml 良构（含 <urlset> 与至少 1 个 <loc>）
 *   2. 每个 <loc> 能映射到真实源文件（无死链）
 *   3. sitemap 中不含 noindex 页（info 输出被跳过的数量）
 *   4. sitemap 条数与预期规模量级一致（防整表丢失/回归，阈值下界 200）
 *
 * 用法：node scripts/check-sitemap.mjs
 * 退出码：0 = 通过；1 = 存在阻断项
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const BASE = 'https://www.calc-tools.top';
const MIN_URLS = 200;

const failures = [];
function fail(msg) { failures.push(msg); }

if (!fs.existsSync(SITEMAP)) {
  fail('sitemap.xml 不存在');
  report();
}

const xml = fs.readFileSync(SITEMAP, 'utf8');
if (!/<urlset[\s>]/.test(xml)) {
  fail('sitemap.xml 缺少 <urlset> 根节点（XML 不良构）');
}

const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].trim());
console.log(`[1] sitemap.xml 解析: ${locs.length} 条 URL`);

if (locs.length < MIN_URLS) {
  fail(`sitemap 条数异常: ${locs.length}（期望 ≥ ${MIN_URLS}，疑似生成脚本回归或大量页面丢失）`);
}

// noindex 判定（与 generate-sitemap.ps1 口径一致：两种属性顺序都覆盖）
function isNoindex(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return /<meta[^>]*name="robots"[^>]*noindex/i.test(raw)
    || /<meta[^>]*content="[^"]*noindex[^"]*"[^>]*name="robots"/i.test(raw);
}

// URL → 源文件映射
function resolveFile(loc) {
  let rel = loc.replace(BASE, '');
  if (!rel.startsWith('/')) rel = rel.replace(/^https?:\/\/[^/]+/, '');
  if (!rel.startsWith('/')) return null;
  const clean = rel.replace(/^\//, '').replace(/\/$/, '');
  const candidates = clean === ''
    ? ['index.html']
    : [`${clean}.html`, `${clean}/index.html`];
  for (const c of candidates) {
    const p = path.join(ROOT, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const dead = [];
const noindexInSitemap = [];
for (const loc of locs) {
  const f = resolveFile(loc);
  if (!f) { dead.push(loc); continue; }
  if (isNoindex(f)) noindexInSitemap.push(loc);
}

console.log(`[2] 死链检查: ${dead.length ? `❌ ${dead.length} 条` : '✓ 0 条'}`);
if (dead.length) {
  for (const d of dead.slice(0, 20)) console.error(`    ✗ 源文件不存在: ${d}`);
  fail(`sitemap 含 ${dead.length} 条死链（URL 无法映射到源码文件）`);
}

console.log(`[3] noindex×sitemap 交叉检查: ${noindexInSitemap.length ? `❌ ${noindexInSitemap.length} 条` : '✓ 0 条'}`);
if (noindexInSitemap.length) {
  for (const n of noindexInSitemap) console.error(`    ✗ noindex 页仍在 sitemap: ${n}`);
  fail(`sitemap 含 ${noindexInSitemap.length} 条 noindex 页（GSC 报 "Submitted URL marked noindex"，须从 sitemap 排除或改为 301 跳转）`);
}

report();

function report() {
  if (failures.length) {
    console.error(`\n❌ check-sitemap 失败 ${failures.length} 项:`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('✅ check-sitemap: sitemap 健康（无死链 / 无 noindex 冲突 / 规模正常）');
}
