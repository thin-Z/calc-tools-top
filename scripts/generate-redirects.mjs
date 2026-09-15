#!/usr/bin/env node
/**
 * scripts/generate-redirects.mjs — vercel.json 工具扁平 URL 重定向生成器
 * -----------------------------------------------------------------
 * 背景（2026-09-15 线上缺陷）：https://www.calc-tools.top/zh/badge-maker 返回「页面未找到」。
 * 站点历史上有 `/zh/<slug>` → `/zh/<dir>/<slug>` 的旧扁平 URL 重定向约定（早期页面直接放在
 * /zh/ 下，后按 calculators|image|text 三层重构），但这些规则是**手工维护**的，后加的工具
 * 从未登记 → 旧 URL 直接 404。实测 tools.json 51 个工具中有 12 个（24 条 zh/en 规则）缺失，
 * badge-maker 只是被用户先撞上的那一个。
 *
 * 修法：与 generate-home / generate-category-pages 同一范式 —— **单一数据源驱动**，
 * 由 tools.json 自动补齐缺失的扁平重定向，杜绝「手工维护必然漂移」再次发生。
 *   - 幂等：已存在的规则不动（保留人工条目与既有顺序），只追加缺失项。
 *   - 安全：通配规则 /(.*).html 必须留在 redirects 数组末尾，新规则插在它之前。
 *   - 只在内容变化时写盘，避免每次构建产生无意义 diff。
 *
 * 配套门禁：scripts/check-redirects.mjs 断言 4（每个工具都须有 zh/en 扁平规则）。
 *
 * 用法: node scripts/generate-redirects.mjs [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_PATH = path.join(ROOT, 'tools.json');
const VERCEL_PATH = path.join(ROOT, 'vercel.json');
const DRY = process.argv.includes('--dry-run');
const WILDCARD = '/(.*).html';

// ⚠️ 严禁在本模块调用 process.exit()：build.mjs 通过 `import './generate-redirects.mjs'`
//    在构建前执行本文件，任何 exit 都会直接终止整个构建（2026-09-15 实测踩坑：dist 未刷新）。
const tools = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
const vc = JSON.parse(fs.readFileSync(VERCEL_PATH, 'utf8'));
const redirects = Array.isArray(vc.redirects) ? vc.redirects : [];

const sources = new Set(redirects.map((r) => r.source));
const missing = [];
for (const t of tools) {
  if (!t.slug || !t.dir) continue;
  for (const lang of ['zh', 'en']) {
    const source = `/${lang}/${t.slug}`;
    // cleanUrls:true 下 .html 会被先行剥离，只需登记无扩展名规则（与较新条目一致）
    if (!sources.has(source)) {
      missing.push({ source, destination: `/${lang}/${t.dir}/${t.slug}`, permanent: true });
      sources.add(source);
    }
  }
}

if (missing.length === 0) {
  console.log('[generate-redirects] 无需变更：全部工具扁平重定向已登记');
} else {
  // 通配规则必须置于末尾：插到它前面；无通配规则则直接追加
  const wildIdx = redirects.findIndex((r) => r.source === WILDCARD);
  if (wildIdx === -1) redirects.push(...missing);
  else redirects.splice(wildIdx, 0, ...missing);

  console.log(`[generate-redirects] 待补 ${missing.length} 条扁平重定向：`);
  for (const m of missing) console.log(`  + ${m.source} -> ${m.destination}`);

  if (DRY) {
    console.log('[generate-redirects] --dry-run：未写盘');
  } else {
    fs.writeFileSync(VERCEL_PATH, JSON.stringify(vc, null, 2) + '\n', 'utf8');
    console.log(`[generate-redirects] 已写入 vercel.json（redirects 合计 ${redirects.length} 条）`);
  }
}
