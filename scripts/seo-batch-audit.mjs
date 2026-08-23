#!/usr/bin/env node
/**
 * scripts/seo-batch-audit.mjs — 全站 SEO 批量审计（P1P2-01 / 断言 [14]）
 * -----------------------------------------------------------------
 * 对全站 HTML（不含 dist/includes/docs 等）做可机检的 SEO 审计：
 *   1. title 存在率（应 100%）与长度分布（目标 30-60 字符）
 *   2. meta description 存在率（应 100%）与长度分布（目标 50-160 字符）
 *   3. 重复 title（应 = 0）
 *   4. 占位符文案检测（TODO/FIXME/占位/待定 等，应 = 0）
 *   5. 工具页站内内链数（目标 ≥3，报告指标；不阻断 --check）
 *
 * 输出：默认人类可读报告；--json 输出机器可读 JSON。
 * 断言模式：--check 时若 title 缺失 >0 / description 缺失 >0 / 重复 title >0 /
 *           占位符 >0，退出码非 0（供 verify-site [14] 与 CI 复用）。
 *
 * 用法：
 *   node scripts/seo-batch-audit.mjs             # 报告
 *   node scripts/seo-batch-audit.mjs --check     # 断言模式
 *   node scripts/seo-batch-audit.mjs --json      # 机器可读
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
]);

const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const jsonMode = args.includes('--json');

// 占位符/模板残留文案（保守口径，避免误伤正常内容）
const PLACEHOLDER_RE = /\b(TODO|FIXME|TBD|PLACEHOLDER|Lorem ipsum|待定|占位|测试页面|示例内容)\b/i;

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('dist.bak')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, cb);
    else if (entry.name.endsWith('.html')) cb(full);
  }
}

// 工具页判定：zh/en 的 calculators / text / image 目录下（含 index）
function isToolPage(rel) {
  return /^(?:zh|en)\/(?:calculators|text|image)\//.test(rel);
}

// 站内链接判定：相对路径或以 / 开头且非外部域
function isInternalLink(href) {
  if (!href) return false;
  if (/^(?:https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(href)) {
    // / 开头的站内绝对路径；// 开头为协议相对，算站内；http(s) 算站外
    if (/^https?:/i.test(href) || /^mailto:|^tel:|^data:|^javascript:/i.test(href)) return false;
    return true;
  }
  return true; // 相对路径
}

function countInternalLinks(html) {
  const hrefRe = /\bhref\s*=\s*["']([^"']*)["']/gi;
  const seen = new Set();
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    if (isInternalLink(href)) seen.add(href);
  }
  return seen.size;
}

const pages = [];
walkHtml(ROOT, (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  let text;
  try {
    text = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
  } catch (e) {
    return;
  }
  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
  const descMatch = text.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
    || text.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  const desc = descMatch ? descMatch[1].trim() : '';

  pages.push({
    file: rel,
    title,
    titleLen: title.length,
    desc,
    descLen: desc.length,
    placeholder: PLACEHOLDER_RE.test(title) || PLACEHOLDER_RE.test(desc),
    toolPage: isToolPage(rel),
    internalLinks: countInternalLinks(text),
  });
});

// ---- 聚合统计 ----
const noTitle = pages.filter((p) => !p.title);
const noDesc = pages.filter((p) => !p.desc);
const placeholderPages = pages.filter((p) => p.placeholder);

const titleCounts = new Map();
for (const p of pages) {
  if (!p.title) continue;
  titleCounts.set(p.title, (titleCounts.get(p.title) || 0) + 1);
}
const dupTitles = [...titleCounts.entries()].filter(([, n]) => n > 1);

const titleLenStats = pages.filter((p) => p.title).map((p) => p.titleLen);
const descLenStats = pages.filter((p) => p.desc).map((p) => p.descLen);
const titleShort = pages.filter((p) => p.title && p.titleLen < 30);
const titleLong = pages.filter((p) => p.title && p.titleLen > 60);
const descShort = pages.filter((p) => p.desc && p.descLen < 50);
const descLong = pages.filter((p) => p.desc && p.descLen > 160);

const toolPages = pages.filter((p) => p.toolPage);
const toolLowLinks = toolPages.filter((p) => p.internalLinks < 3);

const summarize = (arr) => {
  if (!arr.length) return { min: 0, max: 0, avg: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return { min: Math.min(...arr), max: Math.max(...arr), avg: Math.round((sum / arr.length) * 10) / 10 };
};

// ---- 输出 ----
const report = {
  scanned: pages.length,
  toolPages: toolPages.length,
  title: {
    present: pages.length - noTitle.length,
    missing: noTitle.length,
    len: summarize(titleLenStats),
    tooShort: titleShort.length,
    tooLong: titleLong.length,
  },
  description: {
    present: pages.length - noDesc.length,
    missing: noDesc.length,
    len: summarize(descLenStats),
    tooShort: descShort.length,
    tooLong: descLong.length,
  },
  duplicateTitles: dupTitles.length,
  placeholderPages: placeholderPages.length,
  toolPagesBelow3Links: toolLowLinks.length,
  details: {
    noTitle: noTitle.map((p) => p.file),
    noDesc: noDesc.map((p) => p.file),
    duplicateTitles: dupTitles.map(([t, n]) => ({ title: t, count: n })),
    placeholder: placeholderPages.map((p) => p.file),
    toolLowLinks: toolLowLinks.map((p) => `${p.file}=${p.internalLinks}`),
  },
};

if (jsonMode) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log(`扫描 HTML: ${report.scanned} 页（工具页 ${report.toolPages}）`);
  console.log(`title: 存在 ${report.title.present}/${report.scanned}，缺失 ${report.title.missing}，长度 ${report.title.len.min}-${report.title.len.max}（avg ${report.title.len.avg}，目标 30-60），过短 ${report.title.tooShort} 过长 ${report.title.tooLong}`);
  console.log(`description: 存在 ${report.description.present}/${report.scanned}，缺失 ${report.description.missing}，长度 ${report.description.len.min}-${report.description.len.max}（avg ${report.description.len.avg}，目标 50-160），过短 ${report.description.tooShort} 过长 ${report.description.tooLong}`);
  console.log(`重复 title: ${report.duplicateTitles}`);
  console.log(`占位符: ${report.placeholderPages}`);
  console.log(`工具页内链 <3: ${report.toolPagesBelow3Links}`);
  if (report.details.noTitle.length) console.log('  缺失 title:', report.details.noTitle.join(', '));
  if (report.details.noDesc.length) console.log('  缺失 description:', report.details.noDesc.join(', '));
  if (report.details.duplicateTitles.length) {
    for (const d of report.details.duplicateTitles) console.log(`  重复: "${d.title}" ×${d.count}`);
  }
  if (report.details.placeholder.length) console.log('  占位符页:', report.details.placeholder.join(', '));
  if (report.details.toolLowLinks.length) console.log('  工具页内链<3:', report.details.toolLowLinks.join(', '));
}

// ---- 断言模式（verify-site [14] 复用） ----
if (checkMode) {
  const fatal = [];
  if (report.title.missing > 0) fatal.push(`title 缺失 ${report.title.missing} 页`);
  if (report.description.missing > 0) fatal.push(`description 缺失 ${report.description.missing} 页`);
  if (report.duplicateTitles > 0) fatal.push(`重复 title ${report.duplicateTitles} 组`);
  if (report.placeholderPages > 0) fatal.push(`占位符页 ${report.placeholderPages} 页`);
  if (fatal.length) {
    console.error(`[seo-audit] 断言失败：${fatal.join('；')}`);
    process.exit(1);
  }
  console.log('[seo-audit] 断言通过：title/description 存在率 100%、重复 title=0、无占位符 ✓');
}
