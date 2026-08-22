#!/usr/bin/env node
/**
 * scripts/csp-migrate-t02.mjs — CSP T02 内联脚本外链化与冗余清理（幂等，v2）
 * ---------------------------------------------------------------
 * 依据：docs/csp-migration-arch.md D4 处置矩阵
 * v2 修复：chart 逻辑与 i18n init 混在同一 <script> 块 —— 先移除块内 i18n 子片段，
 *          剩余逻辑抽取 js/inline/<page>.js；纯 i18n 块/点赞 IIFE 整块删除。
 * 动作：
 *  1. includes/adsense-head.html: gtag 内联块 → /js/gtag-init.js 外链 + 追加 /js/csp-events.js
 *  2. 新建 js/gtag-init.js
 *  3. 全站根目录 HTML（排除 dist/）按 blockAction 处理每个可执行内联块
 * 用法：node scripts/csp-migrate-t02.mjs
 * 幂等：检测已有产物跳过；HTML 无匹配块即无操作
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'deliverables']);
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

// 块内冗余 i18n 初始化子片段（i18n.js:253 已覆盖）——从任意块中移除
const I18N_SUB_RE = /document\.querySelectorAll\("\[data-i18n\]"\)\.forEach\(function\(el\) \{[\s\S]*?el\.textContent = t\(key\);\s*\}\);/g;

let stats = { deleted: 0, extracted: 0, keptMojibake: 0, mixedToInline: 0 };

function walkHtml(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(full, cb);
    else if (e.name.endsWith('.html')) cb(full);
  }
}

function pageName(rel) {
  return rel.split('/').pop().replace(/\.html$/, '');
}

/** 返回块级动作 */
function blockAction(body) {
  const t = body.trim();
  if (/var k="toolbox_likes"/.test(t)) return 'DELETE_LIKE';                              // 点赞 IIFE
  if (/document\.querySelectorAll\("<data-i18n>"\)/.test(t)) return 'KEEP_MOJIBAKE';        // i18n 乱码（T04）
  if (/let chartInstance = null;/.test(t) && /getCategoryLabel/.test(t) && /ƫ/.test(t)) return 'PLACEHOLDER'; // chart 乱码（T04）
  return 'PROCESS';                                                                         // 常规：去 i18n 子片段后抽取或删除
}

/* ---------- 2. 新建 js/gtag-init.js（幂等） ---------- */
const gtagInitPath = path.join(ROOT, 'js', 'gtag-init.js');
if (fs.existsSync(gtagInitPath)) {
  console.log('[skip] js/gtag-init.js 已存在');
} else {
  fs.writeFileSync(gtagInitPath, [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){ dataLayer.push(arguments); }',
    "gtag('js', new Date());",
    "gtag('config', 'G-B61D908J5F');",
    ''
  ].join('\n'), 'utf8');
  console.log('[ok] 新建 js/gtag-init.js');
}

/* ---------- 1. includes/adsense-head.html gtag 外链化（幂等） ---------- */
const adsHeadPath = path.join(ROOT, 'includes', 'adsense-head.html');
let adsHead = fs.readFileSync(adsHeadPath, 'utf8');
const gtagInlineRe = /<script>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\('config',\s*'G-B61D908J5F'\);\s*<\/script>/i;
if (gtagInlineRe.test(adsHead)) {
  adsHead = adsHead.replace(gtagInlineRe, '<script src="/js/gtag-init.js" defer></script>');
  console.log('[ok] adsense-head.html: gtag 内联块 → /js/gtag-init.js 外链');
} else if (!/\/js\/gtag-init\.js/.test(adsHead)) {
  console.log('[warn] adsense-head.html 未找到 gtag 内联块，跳过');
}
if (!/\/js\/csp-events\.js/.test(adsHead)) {
  adsHead = adsHead.replace(/\s*$/, '\n') + '<script src="/js/csp-events.js" defer></script>\n';
  console.log('[ok] adsense-head.html: 追加 csp-events.js');
}
fs.writeFileSync(adsHeadPath, adsHead, 'utf8');

/* ---------- 3. 遍历 HTML：处理每个可执行内联块 ---------- */
const inlineDir = path.join(ROOT, 'js', 'inline');
fs.mkdirSync(inlineDir, { recursive: true });

const unitConverterJs = fs.readFileSync(path.join(ROOT, 'js', 'calculators', 'unit-converter.js'), 'utf8');
const unitConverterHasInit = /updateUnits/.test(unitConverterJs);

walkHtml(ROOT, (file) => {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const pname = pageName(rel);
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 收集可执行内联脚本块（带 rel）
  const blocks = [];
  let m;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(html)) !== null) {
    const attrs = m[1];
    const body = m[2];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/application\/ld\+json/i.test(attrs)) continue;
    if (/\btype\s*=/i.test(attrs) && !/text\/(javascript|template)|module/i.test(attrs)) continue;
    blocks.push({ start: m.index, end: m.index + m[0].length, attrs, body, rel });
  }
  if (!blocks.length) return;

  // 从后往前替换
  for (const b of blocks.reverse()) {
    const act = blockAction(b.body);
    let replacement = null;

    if (act === 'DELETE_LIKE') {
      stats.deleted++;
      replacement = '';
    } else if (act === 'KEEP_MOJIBAKE') {
      stats.keptMojibake++;
      replacement = null;
    } else if (act === 'PLACEHOLDER') {
      stats.deleted++;
      replacement = '<!-- TODO(T04): 修复编码后抽取 -->';
    } else {
      // PROCESS：先移除块内冗余 i18n 子片段
      let body2 = b.body.replace(I18N_SUB_RE, '');
      const rest = body2.trim();
      if (!rest) {
        stats.deleted++;
        replacement = ''; // 纯 i18n init 块 → 删除
      } else {
        // unit-converter 初始化特判（calculators 脚本已覆盖则删除）
        if (/updateUnits\(\);\s*setTimeout\(doConvert,\s*100\)/.test(rest) && unitConverterHasInit) {
          stats.deleted++;
          replacement = '';
        } else {
          const fname = `js/inline/${pname}.js`;
          const fpath = path.join(ROOT, fname);
          if (!fs.existsSync(fpath)) {
            fs.writeFileSync(fpath, rest + '\n', 'utf8');
            console.log(`[ok] 抽取 ${rel} → ${fname}${act === 'PROCESS' && /data-i18n/.test(b.body) ? '（混合块已去 i18n 子片段）' : ''}`);
          }
          stats.extracted++;
          replacement = `<script src="/${fname}" defer></script>`;
        }
      }
    }

    if (replacement !== null) {
      html = html.slice(0, b.start) + replacement + html.slice(b.end);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, html, 'utf8');
  }
});

/* ---------- 汇总 ---------- */
console.log('\n========== T02 执行汇总 ==========');
console.log(JSON.stringify(stats, null, 2));
console.log('完成。下一步：node build.mjs && node verify-site.mjs');
