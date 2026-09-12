#!/usr/bin/env node
/**
 * scripts/check-asset-version.mjs — 资源版本戳一致性门禁（2026-09-13）
 * -----------------------------------------------------------------
 * 背景（真实线上故障根因）：
 *   vercel.json 对 /js/(.*)、/css/(.*)、/assets/(.*) 下发
 *   `Cache-Control: public, max-age=31536000, immutable` —— 一年内不做任何校验。
 *   该策略成立的前提是**每个资源 URL 都随构建变化**（?v=<构建戳>）。一旦某个本地资源
 *   被引用时漏掉 ?v=，它就会被浏览器/中间层钉死一年，改后永不更新，表现为
 *   「页面首次打开样式错乱、按 Ctrl+F5 才恢复」（硬刷新绕过缓存）。
 *   已发生实例：第 6 步注入的 /js/cmp.js 在 220+ 页全部漏戳（实测线上确认）。
 *
 * 本门禁断言（dist 为唯一判据）：
 *   1. dist/**\/*.html 中所有指向本地静态资源（css/js/svg/png/jpg/jpeg/gif/webp/avif/ico/woff/woff2）
 *      的 href/src 引用均带合法 `?v=<戳>`；外部 URL / data: / 纯 fragment 不在检查范围。
 *   2. dist/js/**\/*.js 中所有本地资源路径字面量均带 `?v=<戳>`
 *      （覆盖 JS 内动态注入 <script>/<link> 的场景：home-loader.js、compress-decompress.js）。
 *      块注释先剥离，避免文档注释里的路径字面量造成假阳性。
 *   3. vercel.json 必须为 /sw.js 显式声明不全量缓存（Service Worker 脚本必须可及时更新，
 *      否则缓存策略修复无法下发）。
 *
 * ⚠️ 刻意豁免：dist 根 sw.js 自身不参与版本戳检查（SW 脚本必须保持稳定 URL）。
 *
 * 用法：node scripts/check-asset-version.mjs
 * 退出码：0 = 通过（或 dist 不存在时跳过）；1 = 存在未打戳资源 / SW 缓存头缺失
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const ASSET_EXT = 'css|js|svg|png|jpe?g|gif|webp|avif|ico|woff2?';
// HTML 属性级引用（href/src）——语义准确，覆盖浏览器真实发起请求的资源
const HTML_REF_RE = new RegExp(`\\b(?:href|src)\\s*=\\s*["']([^"']+\\.(?:${ASSET_EXT}))(?:\\?[^"']*)?["']`, 'gi');
// JS 内的本地资源路径字面量（与 build.mjs 的 ASSET_RE 同形：以 js/ css/ assets/ 开头，可含相对前缀）
const JS_LITERAL_RE = new RegExp(`["']((?:\\.\\.\\/)*(?:\\/)?(?:js|css|assets)\\/[^\\s"']*?\\.(?:${ASSET_EXT}))((?:\\?[^"'\\s#]*)?)["']`, 'g');
// 版本戳合法性：构建脚本产出 YYYYMMDDHHmm（12 位数字）
const STAMP_RE = /^(?=.*\bv=\d{8,14}\b)/;

const violations = [];

function isExternalOrInline(u) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(u);
}

function walk(dir, rel, cb) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(full, relPath, cb);
    else cb(full, relPath);
  }
}

function htmlRefs(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  const out = [];
  let m;
  HTML_REF_RE.lastIndex = 0;
  while ((m = HTML_REF_RE.exec(text))) out.push(m[1] + (m[0].match(/\?[^"']*/)?.[0] || ''));
  return out;
}

function jsLiterals(absPath) {
  // 剥离块注释（文档注释内的路径字面量不构成运行时引用）
  const text = fs.readFileSync(absPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let m;
  JS_LITERAL_RE.lastIndex = 0;
  while ((m = JS_LITERAL_RE.exec(text))) out.push(m[1] + (m[2] || ''));
  return out;
}

if (!fs.existsSync(DIST)) {
  console.log('[34] 资源版本戳门禁: ⏭ 跳过（dist 不存在；请先 npm run build）');
  process.exit(0);
}

let htmlChecked = 0;
let jsChecked = 0;

walk(DIST, '', (abs, rel) => {
  if (rel.endsWith('.html')) {
    for (const ref of htmlRefs(abs)) {
      if (isExternalOrInline(ref)) continue;
      htmlChecked++;
      const query = ref.includes('?') ? '?' + ref.split('?').slice(1).join('?') : '';
      if (!STAMP_RE.test(query)) violations.push(`HTML 资源未打版本戳: ${rel} → ${ref}`);
    }
  } else if (rel.endsWith('.js')) {
    // sw.js（dist 根）刻意豁免：Service Worker 脚本必须保持稳定 URL
    if (rel === 'sw.js') return;
    for (const ref of jsLiterals(abs)) {
      if (isExternalOrInline(ref)) continue;
      jsChecked++;
      const query = ref.includes('?') ? '?' + ref.split('?').slice(1).join('?') : '';
      if (!STAMP_RE.test(query)) violations.push(`JS 动态资源未打版本戳: ${rel} → ${ref}`);
    }
  }
});

// 3. vercel.json：/sw.js 必须显式声明不全量缓存（否则 SW 修复无法及时下发）
try {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const swRule = (vercel.headers || []).find((h) => h.source === '/sw.js');
  const swCc = swRule && (swRule.headers || []).find((h) => /^cache-control$/i.test(h.key));
  if (!swCc) {
    violations.push('vercel.json 缺少 /sw.js 显式 Cache-Control 规则（SW 脚本须可及时更新，不可长缓存）');
  } else if (!/max-age=0|no-cache|no-store/i.test(swCc.value)) {
    violations.push(`vercel.json /sw.js Cache-Control 过强（${swCc.value}），须为 max-age=0/no-cache，否则 SW 更新无法下发`);
  }
} catch (e) {
  violations.push(`vercel.json 解析失败: ${e.message}`);
}

const MAX_SHOW = 12;
if (violations.length) {
  console.error(`\n❌ 资源版本戳门禁失败 ${violations.length} 项：`);
  for (const v of violations.slice(0, MAX_SHOW)) console.error(`   ✗ ${v}`);
  if (violations.length > MAX_SHOW) console.error(`   … 其余 ${violations.length - MAX_SHOW} 项已省略`);
  console.error('\n说明：/js、/css、/assets 为 immutable 一年缓存，未打戳的资源改后不会更新。');
  console.error('修复：确保引用出现在 build.mjs 版本注入之前，或走第 8 步兜底补齐（HTML + dist/js）。');
  process.exit(1);
}

console.log(`[check-asset-version] HTML 资源引用 ${htmlChecked} 处、JS 动态资源字面量 ${jsChecked} 处，全部带版本戳 ✓；/sw.js 缓存头合规 ✓`);
