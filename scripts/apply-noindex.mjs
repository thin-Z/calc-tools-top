#!/usr/bin/env node
/**
 * apply-noindex.mjs — 按 scripts/noindex-list.json 注入/移除 noindex（最小可行站缩面）
 *
 * 背景：AdSense 二次驳回 `Low value content`（2026-01-01 22:46，10-04 真机实测坐实）
 *   → 熔断线 2 触发 → 老板 10-05 22:5x 拍板「转最小可行站」。
 *   语义：**页文件不删，只让 Google 逐步退出索引**，可一键回滚。
 *
 *⚠️ 为什么必须写进**源文件**而不是 dist：
 *   生成侧 `scripts/generate-sitemap.ps1` 与门禁 `scripts/check-sitemap-coverage.mjs`
 *   都从**源码**扫 HTML 并按 `<meta name="robots" content="noindex">` 跳过。
 *   若只在 dist 注入 → sitemap 仍会收录这些 URL → GSC 报
 *   "Submitted URL marked noindex"，反而削弱 sitemap 信任（ps1 注释原话）。
 *   故与既有 4 个 mergedInto壳页（discount/age-calc/password-strength/keyword-density）
 *   走**同一机制**：源文件直接带 noindex。
 *
 * 用法：
 *   node scripts/apply-noindex.mjs            # 注入（幂等；已存在则跳过）
 *   node scripts/apply-noindex.mjs --remove   # 移除（回滚）
 *   node scripts/apply-noindex.mjs--check    # 只校验，不写盘（门禁用；清单/磁盘漂移即非 0）
 *
 * 退出码：0 = 通过；1 = 清单/磁盘漂移或写入失败
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIST_PATH = path.join(ROOT, 'scripts', 'noindex-list.json');

const MODE = process.argv.includes('--remove') ? 'remove'
  : process.argv.includes('--check') ? 'check'
    : 'apply';

/** noindex meta 的唯一写法（与既有 4 个壳页逐字一致，避免 verify #20/#28 各判一套）。 */
function metaTag() {
  return '    <meta name="robots" content="noindex">';
}

/** 已有 noindex meta？（两种属性顺序都覆盖，与 check-sitemap.mjs:52-56 同源口径） */
function hasNoindex(html) {
  return /<meta[^>]*name="robots"[^>]*noindex/i.test(html)
    || /<meta[^>]*content="[^"]*noindex[^"]*"[^>]*name="robots"/i.test(html);
}

/** 插入位置：紧跟 <meta charset="..."> 之后（同既有壳页行21 附近的位置约定）。 */
function inject(html) {
  if (/<meta[^>]*charset=["']?utf-8/i.test(html)) {
    return html.replace(/(<meta[^>]*charset=["']?utf-8[^>]*>)/i, `$1\n${metaTag()}`);
  }
  if (/<head>/i.test(html)) return html.replace(/<head>/i, `<head>\n${metaTag()}`);
  return null;
}

function remove(html) {
  // 只删本脚本注入的那一行（精确匹配 metaTag() 的缩进与文本），不误伤他人写法
  const line = new RegExp(`\\n?[ \\t]*${metaTag().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  return html.replace(line, '');
}

// ---------- 读清单 ----------
if (!fs.existsSync(LIST_PATH)) {
  console.error('[apply-noindex] scripts/noindex-list.json 不存在');
  process.exit(1);
}
let list;
try {
  list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'));
} catch (e) {
  console.error(`[apply-noindex] 清单解析失败: ${e.message}`);
  process.exit(1);
}
const entries = Array.isArray(list.noindex) ? list.noindex : [];

if (!entries.length) {
  console.log('[apply-noindex] 清单为空（noindex: []），无需处置');
  process.exit(0);
}

// ---------- 门禁：reason 必填 + 路径去重 ----------
const failures = [];
const seen = new Set();
for (const it of entries) {
  if (!it || typeof it.path !== 'string' || !it.path) {
    failures.push('清单存在缺少 path 的条目');
    continue;
  }
  if (seen.has(it.path)) failures.push(`清单 path 重复: ${it.path}`);
  seen.add(it.path);
  if (typeof it !== 'string' && !it.reason) {
    failures.push(`条目缺少 reason: ${it.path}（每条必须写明理由，否则视为drift）`);
  }
}
if (failures.length) {
  for (const f of failures) console.error(`    ✗ ${f}`);
  console.error(`[apply-noindex] 清单校验失败 ${failures.length} 项`);
  process.exit(1);
}

// ---------- 逐条处置 ----------
let injected = 0, already = 0, removed = 0, absent = 0, skipped = 0;
const missingFiles = [];

for (const it of entries) {
  const abs = path.join(ROOT, it.path);
  if (!fs.existsSync(abs)) { missingFiles.push(it.path); continue; }

  const html = fs.readFileSync(abs, 'utf8');
  const has = hasNoindex(html);

  if (MODE === 'check') {
    // check 模式：注入态要求「必须有 noindex」；清单 _meta.mode=remove 时要求「必须没有」
    const expectNoindex = !(list._meta && list._meta.mode === 'remove');
    if (has !== expectNoindex) {
      failures.push(`${it.path}: 期望 ${expectNoindex ? '有' : '无'} noindex，实际 ${has ? '有' : '无'}`);
    }
    continue;
  }

  if (MODE === 'remove') {
    if (!has) { absent++; continue; }
    const out = remove(html);
    if (out === html) { skipped++; continue; }
    fs.writeFileSync(abs, out, 'utf8');
    removed++;
    continue;
  }

  // apply
  if (has) { already++; continue; }
  const out = inject(html);
  if (out === null) { failures.push(`${it.path}:找不到 <meta charset> 或 <head>，注入位置未知`); continue; }
  fs.writeFileSync(abs, out, 'utf8');
  injected++;
}

if (missingFiles.length) {
  console.error(`[apply-noindex] [警告] 清单中有 ${missingFiles.length} 条对应文件不存在（须清理清单，否则是 drift）:`);
  for (const m of missingFiles.slice(0, 20)) console.error(`    ✗ ${m}`);
  failures.push(`清单含 ${missingFiles.length} 条失效路径（文件已删/路径写错）`);
}

if (failures.length) {
  console.error(`\n[apply-noindex] 失败 ${failures.length} 项:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

const label = { apply: '注入', remove: '移除', check: '校验' }[MODE];
console.log(`[apply-noindex] ${label}完成 | 清单 ${entries.length} 条 | `
  + `新${MODE === 'apply' ? '注入' : '移除'} ${MODE === 'apply' ? injected : removed} | `
  + `已存在/无需动 ${MODE === 'apply' ? already : absent} | 跳过 ${skipped}`);
if (MODE === 'apply' && (injected || already)) {
  console.log('[apply-noindex] 提示：noindex 页已自动从 sitemap 排除（generate-sitemap.ps1 按 meta 跳过）'
    + ' → 须重跑 scripts/generate-sitemap.ps1 并 git diff 复核 loc 变化');
}
if (MODE === 'remove') {
  console.log('[apply-noindex] 提示：回滚后须重跑 scripts/generate-sitemap.ps1 恢复 sitemap');
}