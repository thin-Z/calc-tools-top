#!/usr/bin/env node
/**
 * scripts/check-jsonld.mjs — 全站 JSON-LD 结构化数据校验（P2 T03）
 * -----------------------------------------------------------------
 * 遍历全部 HTML，提取所有 type="application/ld+json" 块，断言：
 *   1. JSON.parse 通过
 *   2. 顶层含 @context 且（@type 或 @graph）存在
 *   3. 块内不含 "://host//" 双斜杠 URL（如 https://www.calc-tools.top//en/）
 *   4. 含 FAQPage 的块 mainEntity 为非空数组
 *   5. @graph 内各节点均有 @type
 * 输出：块总数 / 失败数 + 失败明细；退出码非 0 供审计/CI 使用。
 * 用法：node scripts/check-jsonld.mjs [根目录]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
]);

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('dist.bak')) continue; // build.mjs 同样排除 dist.bak-* 备份目录
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, cb);
    else if (entry.name.endsWith('.html')) cb(full);
  }
}

const LD_RE = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const DOUBLE_SLASH_URL_RE = /:\/\/[^\/"'\s]*\/\//;

const failures = [];
let total = 0;
let files = 0;

walkHtml(ROOT, (f) => {
  let text;
  try {
    text = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
  } catch (e) {
    failures.push(`${path.relative(ROOT, f)}: 无法读取 (${e.message})`);
    return;
  }
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  let m;
  LD_RE.lastIndex = 0;
  let blocks = 0;
  while ((m = LD_RE.exec(text)) !== null) {
    const raw = m[1].trim();
    total++;
    blocks++;
    const label = `${rel} (块 #${blocks})`;
    if (!raw) {
      failures.push(`${label}: 空 JSON-LD 块`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      failures.push(`${label}: JSON.parse 失败 — ${e.message}`);
      continue;
    }
    // 断言 2：顶层 @context + (@type 或 @graph)
    if (!data['@context']) {
      failures.push(`${label}: 缺 @context`);
    }
    if (!data['@type'] && !data['@graph']) {
      failures.push(`${label}: 缺 @type 且缺 @graph`);
    }
    // 断言 3：无双斜杠 URL
    if (DOUBLE_SLASH_URL_RE.test(raw)) {
      failures.push(`${label}: 含双斜杠 URL（${raw.match(DOUBLE_SLASH_URL_RE)[0]}）`);
    }
    // 断言 4：FAQPage mainEntity 非空数组
    if (data['@type'] === 'FAQPage' || (Array.isArray(data['@graph']) && data['@graph'].some((n) => n && n['@type'] === 'FAQPage'))) {
      const faq = data['@type'] === 'FAQPage' ? data : data['@graph'].find((n) => n && n['@type'] === 'FAQPage');
      if (!Array.isArray(faq.mainEntity) || faq.mainEntity.length === 0) {
        failures.push(`${label}: FAQPage mainEntity 为空或非数组`);
      }
    }
    // 断言 5：@graph 各节点均有 @type
    if (Array.isArray(data['@graph'])) {
      data['@graph'].forEach((node, i) => {
        if (!node || !node['@type']) {
          failures.push(`${label}: @graph 节点 #${i} 缺 @type`);
        }
      });
    }
  }
  if (blocks > 0) files++;
});

console.log(`扫描文件: ${files} | JSON-LD 块: ${total} | 失败: ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✅ 全部 JSON-LD 块通过 5 项断言');
