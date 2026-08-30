#!/usr/bin/env node
/**
 * scripts/check-redirects.mjs — vercel.json 重定向门禁（P0-1 防回归）
 * -----------------------------------------------------------------
 * 背景：站点启用 cleanUrls:true，Vercel 在重定向匹配前会先剥离请求路径的 .html
 * 扩展名（/en/calorie-calculator.html → /en/calorie-calculator）。因此所有以
 * .html 结尾的源规则实质失效，只有「无 .html」的 companion 规则才能真正生效。
 * 2026-08-30 审计实测：28 个旧 URL 线上 404，根因正是这些工具【缺少无 .html
 * companion 规则】（通配 /(.*).html 位于索引 94 也只是次要因素）。
 *
 * 断言：
 *   1. 通配规则 /(.*).html 必须位于 redirects 数组【末尾】（否则其后具体规则被遮蔽）。
 *   2. 所有以 .html 结尾的具体源规则（非通配），必须存在对应的【无 .html companion
 *      规则】（source 去掉 .html、destination 去掉 .html），否则 cleanUrls 剥离后
 *      该旧 URL 将 404。
 *   3. 所有 .html 源规则的 destination 必须为合法绝对路径（以 / 开头）。
 *
 * 用法：node scripts/check-redirects.mjs
 * 退出码：0 = 通过；非 0 = 失败（供 CI/verify-site 调用）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vercelPath = path.join(ROOT, 'vercel.json');

let vc;
try {
  vc = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
} catch (e) {
  console.error(`❌ check-redirects: 读取 vercel.json 失败: ${e.message}`);
  process.exit(1);
}

const redirects = Array.isArray(vc.redirects) ? vc.redirects : [];
const WILDCARD = '/(.*).html';
const wildIdx = redirects.findIndex((r) => r.source === WILDCARD);

const errors = [];

if (wildIdx === -1) {
  // 无通配规则：cleanUrls:true 已兜底 .html 剥离，位置校验不适用
  console.log('[redirects] 无通配 /(.*).html 规则（已由 cleanUrls 兜底），跳过位置校验');
} else if (wildIdx !== redirects.length - 1) {
  const shadowed = redirects.length - 1 - wildIdx;
  errors.push(
    `通配规则 /(.*).html 位于索引 ${wildIdx}，但其后仍有 ${shadowed} 条具体规则被遮蔽 ` +
    `（通配规则必须置于 redirects 数组末尾，否则 Vercel 命中即返回，旧 URL 会 404）`
  );
}

// 2) companion 覆盖：每个 .html 具体源规则都必须有无 .html companion 规则
//    （cleanUrls 剥离 .html 后，只有 companion 能命中）
const sources = new Set(redirects.map((r) => r.source));
redirects.forEach((r, i) => {
  if (r.source === WILDCARD) return;
  if (typeof r.source !== 'string' || !r.source.endsWith('.html')) return;
  const companion = r.source.replace(/\.html$/, '');
  if (!sources.has(companion)) {
    errors.push(
      `#${i} ${r.source} 缺少无 .html companion 规则 (${companion}) —— ` +
      `cleanUrls 剥离 .html 后该旧 URL 将 404`
    );
  }
});

// 3) destination 合法性：所有 .html 源规则的 destination 必须是绝对路径
redirects.forEach((r, i) => {
  if (typeof r.source === 'string' && r.source.endsWith('.html')) {
    if (typeof r.destination !== 'string' || !r.destination.startsWith('/')) {
      errors.push(`#${i} ${r.source} -> destination 非合法绝对路径: ${JSON.stringify(r.destination)}`);
    }
  }
});

if (errors.length) {
  console.error('❌ check-redirects 失败:');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(
  `✅ check-redirects: 通配位置合规 (索引 ${wildIdx}/${redirects.length - 1})，` +
  `全部 ${redirects.length} 条重定向均有无 .html companion 覆盖，destination 合法`
);
