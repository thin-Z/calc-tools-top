#!/usr/bin/env node
/**
 * check-embed.mjs — embed 可嵌入性门禁（verify #27，2026-09-02）
 *
 * 背景（审计 B-1）：js/embed.js 实现了「iframe 嵌入工具页 + 归属外链」功能，但
 * vercel.json 全站下发 `X-Frame-Options: DENY`（DENY 连**同源** iframe 也拒绝），
 * 且线上 CSP 无 frame-ancestors → /embed 页面里的工具 iframe 100% 不渲染。
 * 更糟的是 26 项断言无一覆盖该能力，功能静默失效无人知晓（典型门禁盲区）。
 *
 * 本门禁把「embed 可嵌入性」固化为断言，四条：
 *   1. 全站通配 headers 的 X-Frame-Options 不得为 DENY（否则同源嵌入即失效）
 *   2. /embed（或 /embed.html）必须有独立 headers 规则，且其 CSP 含 frame-ancestors
 *      （无该指令 = 第三方站点无法嵌入；值为 'none' 等同封死）
 *   3. embed.html 必须引用 js/embed.js，且 js/embed.js 存在（功能接线完好）
 *   4. js/ads-units.js 必须含被嵌入时跳过广告填充的保护（Google 政策：iframe 内禁投广告）
 *
 * 用法：node scripts/check-embed.mjs
 * 退出码：0 = 通过；1 = 存在阻断项
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function fail(msg) { failures.push(msg); }

// ---------- 1. vercel.json 解析 ----------
const vercelPath = path.join(ROOT, 'vercel.json');
if (!fs.existsSync(vercelPath)) {
  fail('vercel.json 不存在');
} else {
  let vercel;
  try {
    vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  } catch (e) {
    fail(`vercel.json 解析失败: ${e.message}`);
  }

  if (vercel) {
    const groups = Array.isArray(vercel.headers) ? vercel.headers : [];

    // 1. 通配规则不得为 DENY
    const wildcard = groups.find((g) => g.source === '/(.*)');
    if (!wildcard) {
      fail('vercel.json 缺少通配 headers 规则 "/(.*)"（全站安全头基线）');
    } else {
      const xfo = (wildcard.headers || []).find((h) => h.key.toLowerCase() === 'x-frame-options');
      if (!xfo) {
        console.log('  ℹ 通配规则未下发 X-Frame-Options（由 CSP frame-ancestors 单独约束，合规）');
      } else if (xfo.value.trim().toUpperCase() === 'DENY') {
        fail('vercel.json 通配规则 X-Frame-Options=DENY：连同源 iframe 也拒绝，/embed 内工具页无法渲染（应改为 SAMEORIGIN 或移除并改用 frame-ancestors）');
      } else {
        console.log(`  通配 X-Frame-Options: ${xfo.value} ✓`);
      }
    }

    // 2. /embed 独立规则 + frame-ancestors
    const embedGroup = groups.find((g) => g.source === '/embed' || g.source === '/embed.html');
    if (!embedGroup) {
      fail('vercel.json 缺少 /embed 独立 headers 规则（无 frame-ancestors = 第三方站点无法嵌入该 widget）');
    } else {
      // 2a. 顺序断言：Vercel 同 key 头「按规则顺序后者覆盖」——/embed 规则必须在通配 /(.*)
      //     之后，否则其 CSP（含 frame-ancestors *）会被通配规则的全站 CSP 整体覆盖而失效。
      const wi = wildcard ? groups.indexOf(wildcard) : -1;
      const ei = groups.indexOf(embedGroup);
      if (wi >= 0 && ei < wi) {
        fail(`/embed headers 规则位于通配 /(.*) 之前（索引 ${ei} < ${wi}）：线上 /embed 的 CSP 会被通配规则覆盖，frame-ancestors 不生效（2026-09-02 线上实测）——应将 /embed 规则移到 headers 数组末尾`);
      } else {
        console.log('  /embed 规则位于通配规则之后（CSP 覆盖方向正确）✓');
      }
      const csp = (embedGroup.headers || []).find((h) => h.key.toLowerCase() === 'content-security-policy');
      if (!csp) {
        fail('/embed headers 规则缺少 Content-Security-Policy（需在 CSP 中下发 frame-ancestors 才允许被嵌入）');
      } else if (!/\bframe-ancestors\b/.test(csp.value)) {
        fail('/embed 的 CSP 缺少 frame-ancestors 指令（第三方站点嵌入将被拒绝）');
      } else if (/\bframe-ancestors\s+'none'/.test(csp.value)) {
        fail("/embed 的 CSP frame-ancestors='none'（等同完全禁止嵌入）");
      } else {
        const fa = csp.value.match(/frame-ancestors\s+([^;]+)/)[1].trim();
        console.log(`  /embed frame-ancestors: ${fa} ✓`);
      }
    }
  }
}

// ---------- 3. embed.html ↔ js/embed.js 接线 ----------
const embedHtml = path.join(ROOT, 'embed.html');
const embedJs = path.join(ROOT, 'js', 'embed.js');
if (!fs.existsSync(embedHtml)) {
  fail('embed.html 不存在');
} else {
  const html = fs.readFileSync(embedHtml, 'utf8');
  if (!/js\/embed\.js/.test(html)) {
    fail('embed.html 未引用 js/embed.js（widget 逻辑未接线）');
  } else {
    console.log('  embed.html → js/embed.js 引用 ✓');
  }
}
if (!fs.existsSync(embedJs)) {
  fail('js/embed.js 不存在');
} else {
  console.log('  js/embed.js 存在 ✓');
}

// ---------- 4. 广告嵌入保护 ----------
const adsPath = path.join(ROOT, 'js', 'ads-units.js');
if (!fs.existsSync(adsPath)) {
  fail('js/ads-units.js 不存在（广告激活入口缺失）');
} else {
  const ads = fs.readFileSync(adsPath, 'utf8');
  const hasGuard = /window\.self\s*!==\s*window\.top/.test(ads) && /isEmbedded|embedded/i.test(ads);
  if (!hasGuard) {
    fail('js/ads-units.js 缺少「被 iframe 嵌入时跳过广告填充」保护（第三方嵌入会展示 Google 广告，违反 AdSense 政策）');
  } else {
    console.log('  ads-units.js 嵌入态广告保护 ✓');
  }
}

// ---------- 汇总 ----------
if (failures.length) {
  console.error(`\n❌ check-embed 失败 ${failures.length} 项:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✅ check-embed: embed 可嵌入性门禁通过');
