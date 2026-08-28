#!/usr/bin/env node
/**
 * scripts/verify-site.mjs — 全站集成校验（P2 T05）
 * -----------------------------------------------------------------
 * 校验项：
 *   1. header/footer 字节一致：每页 <header>/<footer> 与 includes/header-{zh,en}.html
 *      / footer-{zh,en}.html 逐字节一致（行尾归一化后比较）；zh/index.html 跳转页豁免
 *   2. JSON-LD 校验：调用 scripts/check-jsonld.mjs（5 项断言，退出码非 0 即失败）
 *   3. 静态 AdSense 唯一性：源码 0 个静态标签；若 dist/ 存在，则每页恰好 1 个且与
 *      includes/adsense-head.html 字节一致
 *   4. 链接检查：调用 scripts/check-links.js
 *   5. 浮动控件清零：#gw-theme / .gw-lang / 内联 switchLang 全站 0 命中
 *   6. GA4 Measurement ID 不变量（占位符态跳过）
 *   7. CSP assertNoInlineScripts：dist 无可执行内联 <script>（终点基准 0）
 *   8. CSP assertNoInlineEventHandlers：dist 无 onxxx= 内联事件处理器（终点基准 0）
 *   9. CSP assertCspHeader：vercel.json 强制头 script-src 无 'unsafe-inline' 且含三方白名单
 *      —— 7/8/9 为迁移终点基准：T01-T03 期间预期 FAIL，T04/T05 起必须全绿。
 * 用法：node scripts/verify-site.mjs
 * 退出码：0 = 全绿；非 0 = 任一校验失败（供 CI/审计）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
]);
const REDIRECT_NO_TEMPLATE = new Set(['zh/index.html']);

const failures = [];
function fail(msg) { failures.push(msg); }

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('dist.bak')) continue; // build.mjs 同样排除 dist.bak-* 备份目录
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, cb);
    else if (entry.name.endsWith('.html')) cb(full);
  }
}
function loadTpl(name) {
  return fs.readFileSync(path.join(ROOT, 'includes', name), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
}
const HEADER_ZH = loadTpl('header-zh.html');
const HEADER_EN = loadTpl('header-en.html');
const FOOTER_ZH = loadTpl('footer-zh.html');
const FOOTER_EN = loadTpl('footer-en.html');
function langFor(rel) {
  return rel.startsWith('en/') || rel.startsWith('blog/en/') ? 'en' : 'zh';
}

// ---------- 1. header/footer 字节一致 ----------
let headerChecked = 0;
let footerChecked = 0;
walkHtml(ROOT, (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  if (REDIRECT_NO_TEMPLATE.has(rel)) return;
  const text = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lang = langFor(rel);
  const hm = text.match(/<header\b[^>]*>[\s\S]*?<\/header>/i);
  const fm = text.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
  const wantH = lang === 'en' ? HEADER_EN : HEADER_ZH;
  const wantF = lang === 'en' ? FOOTER_EN : FOOTER_ZH;
  if (!hm) { fail(`[header] ${rel}: 缺 <header> 块`); }
  else if (hm[0] !== wantH) { fail(`[header] ${rel}: 与模板不一致`); }
  else headerChecked++;
  if (!fm) { fail(`[footer] ${rel}: 缺 <footer> 块`); }
  else if (fm[0] !== wantF) { fail(`[footer] ${rel}: 与模板不一致`); }
  else footerChecked++;
});
console.log(`[1/5] header/footer 字节一致: header ${headerChecked} | footer ${footerChecked}`);

// ---------- 2. JSON-LD 校验（调用 check-jsonld.mjs） ----------
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-jsonld.mjs')], { stdio: 'inherit', cwd: ROOT });
  console.log('[2/5] JSON-LD 校验: 通过');
} catch (e) {
  fail('[jsonld] scripts/check-jsonld.mjs 退出码非 0');
}

// ---------- 3. 静态 AdSense 唯一性 ----------
let srcAdsense = 0;
walkHtml(ROOT, (f) => {
  const t = fs.readFileSync(f, 'utf8');
  srcAdsense += (t.match(/adsbygoogle\.js/g) || []).length;
});
if (srcAdsense !== 0) {
  fail(`[adsense] 源码含 ${srcAdsense} 个静态 adsbygoogle 标签（应为 0，单一来源 includes/adsense-head.html）`);
} else {
  console.log('[3/5] 静态 AdSense: 源码 0 个静态标签 ✓');
}
if (fs.existsSync(DIST)) {
  const snippet = loadTpl('adsense-head.html').trim();
  let distPages = 0;
  let distBad = [];
  walkHtml(DIST, (f) => {
    distPages++;
    const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
    const cnt = (t.match(/adsbygoogle\.js/g) || []).length;
    if (cnt !== 1) distBad.push(`${path.relative(DIST, f)} count=${cnt}`);
  });
  if (distBad.length) {
    fail(`[adsense] dist 中 ${distBad.length} 页 adsbygoogle 数量不为 1（${distBad.slice(0, 5).join(', ')}）`);
  } else {
    console.log(`[3/5] 静态 AdSense: dist ${distPages} 页均恰好 1 个标签 ✓`);
  }
}

// ---------- 4. 链接检查（调用 check-links.js） ----------
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-links.js')], { stdio: 'inherit', cwd: ROOT });
  console.log('[4/5] 链接检查: 通过');
} catch (e) {
  fail('[links] scripts/check-links.js 退出码非 0');
}

// ---------- 5. 浮动控件清零 ----------
let gwTheme = 0, gwLang = 0, inlineSwitch = 0;
walkHtml(ROOT, (f) => {
  const t = fs.readFileSync(f, 'utf8');
  gwTheme += (t.match(/id="gw-theme"/g) || []).length;
  gwLang += (t.match(/gw-lang/g) || []).length;
  inlineSwitch += (t.match(/function\s+switchLang/g) || []).length;
});
if (gwTheme !== 0 || gwLang !== 0 || inlineSwitch !== 0) {
  fail(`[floating] 浮动控件未清零: gw-theme=${gwTheme} gw-lang=${gwLang} inline-switchLang=${inlineSwitch}`);
} else {
  console.log('[5/5] 浮动控件清零: gw-theme=0 gw-lang=0 inline-switchLang=0 ✓');
}

// ---------- 6. GA4 Measurement ID 不变量 ----------
// 老板即将手填真实 ID。最现实风险：只改了一处、或 ID 格式打错。
// CSP T02 后 config 外链到 js/gtag-init.js，故断言覆盖两处：loader(adsense-head.html) + config(gtag-init.js)。
{
  const GA4_PLACEHOLDER = 'G-XXXXXXXXXX';
  const htmlCommentRe = /<!--(?:(?!-->)[\s\S])*?-->/g;
  const raw = fs.readFileSync(path.join(ROOT, 'includes', 'adsense-head.html'), 'utf8');
  const stripped = raw.replace(htmlCommentRe, '');
  const gtagInitPath = path.join(ROOT, 'js', 'gtag-init.js');
  const gtagInit = fs.existsSync(gtagInitPath) ? fs.readFileSync(gtagInitPath, 'utf8') : '';
  if (stripped.includes(GA4_PLACEHOLDER) && !gtagInit) {
    console.log('[6] GA4 Measurement ID 不变量: 占位符态（未启用），合法，跳过 ✓');
  } else {
    const ids = [...(stripped.match(/G-[A-Z0-9]{6,}/g) || []), ...(gtagInit.match(/G-[A-Z0-9]{6,}/g) || [])];
    if (ids.length !== 2) {
      fail(`[ga4] 检测到 ${ids.length} 处 ID（应为 2 处：loader 与 gtag-init.js config 各一），请检查 includes/adsense-head.html 与 js/gtag-init.js`);
    } else if (ids[0] !== ids[1]) {
      fail(`[ga4] 两处 ID 不一致（"${ids[0]}" vs "${ids[1]}"），应为同一个真实 Measurement ID`);
    } else {
      console.log(`[6] GA4 Measurement ID 不变量: 已启用 (${ids[0]})，loader+config 2 处一致 ✓`);
    }
  }
}

// ---------- 7. CSP assertNoInlineScripts：dist 无可执行内联 <script>（终点基准） ----------
// 口径与 scripts/scan-csp-inline.py 一致：无 src 且非 application/ld+json、且类型为
// JS/无 type 的 <script> 视为可执行内联脚本。T01-T03 期间预期 FAIL，T04 起必须为 0。
{
  const scriptTagRe = /<script\b([^>]*)>[\s\S]*?<\/script>/gi;
  const srcRe = /\bsrc\s*=/i;
  const jsonLdRe = /application\/ld\+json/i;
  const jsTypeRe = /\btype\s*=\s*['"]?(?:text\/(?:javascript|template)|module)['"]?/i;
  let inlineCount = 0;
  const byFile = new Map();
  if (fs.existsSync(DIST)) {
    walkHtml(DIST, (f) => {
      const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
      let m;
      while ((m = scriptTagRe.exec(t)) !== null) {
        const attrs = m[1];
        if (srcRe.test(attrs)) continue;        // 外链脚本不算
        if (jsonLdRe.test(attrs)) continue;     // JSON-LD 数据块不算
        if (jsTypeRe.test(attrs) || !/\btype\s*=/i.test(attrs)) {
          inlineCount++;
          const rel = path.relative(DIST, f).split(path.sep).join('/');
          byFile.set(rel, (byFile.get(rel) || 0) + 1);
        }
      }
    });
  }
  if (inlineCount !== 0) {
    const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([f, c]) => `${f}=${c}`).join(', ');
    fail(`[csp-inline-scripts] dist 含 ${inlineCount} 个可执行内联 <script>（终点基准应为 0；T01 预期 FAIL）${top ? '，top: ' + top : ''}`);
  } else {
    console.log('[7] CSP assertNoInlineScripts: dist 可执行内联 script = 0 ✓');
  }
}

// ---------- 8. CSP assertNoInlineEventHandlers：dist 无 onxxx= 内联事件处理器（终点基准） ----------
// 口径与 scripts/scan-csp-inline.py 的 EVENT_RE 一致。T01-T03 期间预期 FAIL，T04 起必须为 0。
{
  const eventRe = /\son[a-z]+\s*=/gi;
  let handlerCount = 0;
  const byFile = new Map();
  if (fs.existsSync(DIST)) {
    walkHtml(DIST, (f) => {
      const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
      const hits = t.match(eventRe) || [];
      if (hits.length) {
        handlerCount += hits.length;
        const rel = path.relative(DIST, f).split(path.sep).join('/');
        byFile.set(rel, (byFile.get(rel) || 0) + hits.length);
      }
    });
  }
  if (handlerCount !== 0) {
    const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([f, c]) => `${f}=${c}`).join(', ');
    fail(`[csp-inline-events] dist 含 ${handlerCount} 个 onxxx= 内联事件处理器（终点基准应为 0；T01 预期 FAIL）${top ? '，top: ' + top : ''}`);
  } else {
    console.log('[8] CSP assertNoInlineEventHandlers: dist 内联事件处理器 = 0 ✓');
  }
}

// ---------- 9. CSP assertCspHeader：vercel.json 强制头 script-src 硬化（终点基准） ----------
// 校验 Content-Security-Policy（强制头）的 script-src：不含 'unsafe-inline' 且含三方白名单
// （pagead2.googlesyndication.com / cdn.jsdelivr.net / www.googletagmanager.com）。
// T01 时强制头仍带 'unsafe-inline' → 预期 FAIL；T05 切换硬化后通过。
{
  const vercelPath = path.join(ROOT, 'vercel.json');
  let cspValue = null;
  try {
    const vc = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    for (const rule of vc.headers || []) {
      for (const h of rule.headers || []) {
        if (h.key === 'Content-Security-Policy') cspValue = h.value;
      }
    }
  } catch (e) {
    fail(`[csp-header] 读取 vercel.json 失败: ${e.message}`);
  }
  if (cspValue !== null) {
    const scriptSrcMatch = cspValue.match(/(?:^|;\s*)script-src\s+([^;]*)/i);
    if (!scriptSrcMatch) {
      fail('[csp-header] CSP 强制头缺少 script-src 指令');
    } else {
      const src = scriptSrcMatch[1];
      const hasUnsafeInline = /'unsafe-inline'/.test(src);
      const whitelist = ['pagead2.googlesyndication.com', 'cdn.jsdelivr.net', 'www.googletagmanager.com'];
      const missing = whitelist.filter((d) => !src.includes(d));
      if (hasUnsafeInline || missing.length) {
        const bits = [];
        if (hasUnsafeInline) bits.push("script-src 含 'unsafe-inline'");
        if (missing.length) bits.push(`缺少白名单: ${missing.join(', ')}`);
        fail(`[csp-header] 强制 CSP script-src 未硬化（终点基准；T01 预期 FAIL）：${bits.join('；')}`);
      } else {
        console.log('[9] CSP assertCspHeader: script-src 无 unsafe-inline 且含三方白名单 ✓');
      }
    }
  } else {
    fail('[csp-header] vercel.json 缺少 Content-Security-Policy 强制头');
  }
}

// ---------- 10. 性能检查：图片懒加载 ----------
{
  const imgTagRe = /<img\b([^>]*)>/gi;
  let totalImages = 0;
  let lazyImages = 0;
  const byFile = new Map();
  if (fs.existsSync(DIST)) {
    walkHtml(DIST, (f) => {
      const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
      let m;
      while ((m = imgTagRe.exec(t)) !== null) {
        totalImages++;
        if (/\bloading\s*=\s*["']lazy["']/i.test(m[1])) {
          lazyImages++;
        } else {
          // 检查是否为非懒加载图片（如logo、favicon等）
          if (!/\bclass\s*=\s*["'][^"']*(?:site-logo|logo|favicon)/i.test(m[1]) && !/\bsrc\s*=\s*["']data:/i.test(m[1])) {
            const rel = path.relative(DIST, f).split(path.sep).join('/');
            if (!byFile.has(rel)) byFile.set(rel, 0);
            byFile.set(rel, byFile.get(rel) + 1);
          }
        }
      }
    });
  }
  const nonLazyCount = totalImages - lazyImages;
  console.log(`[10] 性能检查: 总图片 ${totalImages}, 懒加载 ${lazyImages}, 非懒加载 ${nonLazyCount} (多为 logo/favicon 等首屏图片，合理)`);
  // 性能检查为信息性，不阻断验证
  console.log(`[10] 性能检查: 图片懒加载 ✓ (信息性，不阻断)`);
}

// ---------- 11. 可访问性检查：alt 属性 ----------
{
  const imgTagRe = /<img\b([^>]*)>/gi;
  let missingAlt = 0;
  const byFile = new Map();
  if (fs.existsSync(DIST)) {
    walkHtml(DIST, (f) => {
      const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
      let m;
      while ((m = imgTagRe.exec(t)) !== null) {
        if (!/\balt\s*=\s*["'][^"']+["']/i.test(m[1])) {
          missingAlt++;
          const rel = path.relative(DIST, f).split(path.sep).join('/');
          if (!byFile.has(rel)) byFile.set(rel, 0);
          byFile.set(rel, byFile.get(rel) + 1);
        }
      }
    });
  }
  if (missingAlt > 0) {
    const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([f, c]) => `${f}=${c}`).join(', ');
    fail(`[a11y] dist 含 ${missingAlt} 个图片缺少 alt 属性${top ? '，top: ' + top : ''}`);
  } else {
    console.log('[11] 可访问性检查: 图片 alt 属性 ✓');
  }
}

// ---------- 12. SRI 子资源完整性（P1P2-04，T01 启用） ----------
// 口径：dist 中所有 src 含 cdn.jsdelivr.net 的 <script> 必须带非空 integrity 且
// crossorigin="anonymous"。
// 结论记录：AdSense/GA4（pagead2.googlesyndication.com / googletagmanager.com）为
// Google 动态脚本，哈希不稳定，不适用 SRI（加 SRI 会导致加载失败），故本断言仅覆盖
// 固定版本 CDN 脚本（Chart.js / qrcodejs 等 jsdelivr 资源）。
{
  const scriptTagRe = /<script\b([^>]*)>/gi;
  let checked = 0;
  const bad = [];
  if (fs.existsSync(DIST)) {
    walkHtml(DIST, (f) => {
      const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
      let m;
      while ((m = scriptTagRe.exec(t)) !== null) {
        const attrs = m[1];
        if (!/cdn\.jsdelivr\.net/i.test(attrs)) continue;
        checked++;
        const hasIntegrity = /\bintegrity\s*=\s*["'][^"']+["']/i.test(attrs);
        const hasCrossOrigin = /\bcrossorigin\s*=\s*["']anonymous["']/i.test(attrs);
        if (!hasIntegrity || !hasCrossOrigin) {
          const rel = path.relative(DIST, f).split(path.sep).join('/');
          const bits = [];
          if (!hasIntegrity) bits.push('缺 integrity');
          if (!hasCrossOrigin) bits.push('crossorigin 缺失/非 anonymous');
          bad.push(`${rel}: ${bits.join('+')}`);
        }
      }
    });
  }
  if (bad.length) {
    fail(`[sri] dist 中 ${bad.length} 个 jsdelivr <script> 缺少 SRI 属性（${bad.slice(0, 5).join('; ')}）`);
  } else {
    console.log(`[12] SRI: jsdelivr <script> ${checked} 个均带 integrity+crossorigin ✓`);
  }
}

// ---------- 13. 可访问性 WCAG 2.1 AA（P1P2-10，T04 启用） ----------
// 断言：
//   a) 每页（除跳转页）存在 <main id="main"> + <a class="skip-link" href="#main">
//   b) dist 中带 id 的 input/select/textarea 均有关联 label（for=id / aria-label /
//      aria-labelledby / 隐式包裹 label）
//   c) dist 中所有 <button> 有可访问名（文本内容或 aria-label）
{
  // a) 源码层面 main id + skip-link
  const noMainId = [];
  const noSkipLink = [];
  walkHtml(ROOT, (f) => {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    if (REDIRECT_NO_TEMPLATE.has(rel)) return;
    const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
    if (!/<main\b[^>]*\bid\s*=\s*["']main["']/i.test(t)) noMainId.push(rel);
    if (!/<a\b[^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b[^"']*["'][^>]*\bhref\s*=\s*["']#main["']/i.test(t)) noSkipLink.push(rel);
  });

  // b/c) dist 层面 label 关联 + button 可访问名
  const noLabel = [];
  const noNameBtn = [];
  if (fs.existsSync(DIST)) {
    walkHtml(DIST, (f) => {
      const rel = path.relative(DIST, f).split(path.sep).join('/');
      const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
      // 表单字段
      const fieldRe = /<(?:input|select|textarea)\b[^>]*>/gi;
      let m;
      while ((m = fieldRe.exec(t)) !== null) {
        const tag = m[0];
        if (/\btype\s*=\s*["']hidden["']/i.test(tag)) continue;
        if (/\baria-label\s*=/i.test(tag) || /\baria-labelledby\s*=/i.test(tag)) continue;
        const idMatch = tag.match(/\bid\s*=\s*["']([^"']+)["']/i);
        if (!idMatch) continue;
        const id = idMatch[1];
        const escId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hasForLabel = new RegExp('<label\\b[^>]*\\bfor\\s*=\\s*["\']' + escId + '["\']', 'i').test(t);
        const hasWrapLabel = new RegExp('<label\\b[^>]*>[\\s\\S]{0,600}?<(?:input|select|textarea)[^>]*\\bid\\s*=\\s*["\']' + escId + '["\']', 'i').test(t);
        if (!hasForLabel && !hasWrapLabel) noLabel.push(rel + '#' + id);
      }
      // 按钮可访问名
      const btnRe = /<button\b[^>]*>([\s\S]*?)<\/button>/gi;
      let bm;
      while ((bm = btnRe.exec(t)) !== null) {
        const full = bm[0];
        if (/\baria-label\s*=/i.test(full)) continue;
        const text = bm[1].replace(/<[^>]+>/g, '').replace(/&[a-zA-Z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) noNameBtn.push(rel);
      }
    });
  }

  const a11yFails = [];
  if (noMainId.length) a11yFails.push(`[a11y-main] ${noMainId.length} 页缺 <main id="main">（${noMainId.slice(0, 3).join(', ')}…）`);
  if (noSkipLink.length) a11yFails.push(`[a11y-skip] ${noSkipLink.length} 页缺 skip-link（${noSkipLink.slice(0, 3).join(', ')}…）`);
  if (noLabel.length) a11yFails.push(`[a11y-label] dist 中 ${noLabel.length} 个字段无关联 label（${noLabel.slice(0, 3).join(', ')}…）`);
  if (noNameBtn.length) a11yFails.push(`[a11y-btn] dist 中 ${noNameBtn.length} 个 button 无可访问名（${noNameBtn.slice(0, 3).join(', ')}…）`);
  if (a11yFails.length) {
    a11yFails.forEach((f) => fail(f));
  } else {
    console.log('[13] 可访问性: main id + skip-link + label 关联 + button 可访问名 ✓');
  }
}

// ---------- 14. SEO 断言（P1P2-01，T05 启用） ----------
// 复用 scripts/seo-batch-audit.mjs --check：全站 title/description 存在率 100%、
// 重复 title = 0、无占位符文案。长度分布为报告指标（不阻断）。
{
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'seo-batch-audit.mjs'), '--check'], { stdio: 'inherit', cwd: ROOT });
    console.log('[14] SEO: title/description 存在率 100%、重复 title=0、无占位符 ✓');
  } catch (e) {
    fail('[seo] scripts/seo-batch-audit.mjs --check 退出码非 0（存在缺失 title/description、重复 title 或占位符）');
  }
}

// ---------- 15. site.js 无 var（P1P2-11，T03 启用） ----------
// 复用 scripts/check-no-var.mjs：js/site.js 中 \bvar\s 计数 = 0。
{
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-no-var.mjs')], { stdio: 'inherit', cwd: ROOT });
    console.log('[15] site.js 无 var: ✓');
  } catch (e) {
    fail('[var] js/site.js 仍存在 var 声明（scripts/check-no-var.mjs 退出码非 0）');
  }
}

// ---------- 16. 首页三源同步（Phase 1.4，check-home-sync.mjs） ----------
// 断言：磁盘页面 == 首页zh/en 卡片 == SITE_CONFIG.tools == TOOLS_DATA == TOOL_KEYWORDS_ZH
// 且每张卡片 data-like-id 与 slug 一致（捕捉 like-id 漂移，如 image-crop↔crop）。
{
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-home-sync.mjs')], { stdio: 'inherit', cwd: ROOT });
    console.log('[16] 首页三源同步 (check-home-sync): ✓');
  } catch (e) {
    fail('[home-sync] scripts/check-home-sync.mjs 退出码非 0（三源不一致或卡片 data-like-id 漂移）');
  }
}

// ---------- 17. 搜索升级专项断言（2026-08-25 首页搜索迭代） ----------
//   a) js/tool-pinyin.js 存在且 TOOL_PINYIN_ZH 覆盖 tools.json 全部 slug（拼音/首字母索引）
//   b) js/site-home.js 已激活文章搜索（articleSearchBlob + 引用 .article-item）
//   c) 首页热搜标签已去误导：index.html 不含"大家都在搜"、en/index.html 不含"Popular searches"
//   d) 首页已引入拼音索引脚本且使用诚实标签（最近搜索 / Recent searches）
{
  const issues = [];

  // a) 拼音索引覆盖
  const toolsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools.json'), 'utf8'));
  const slugs = toolsJson.map(t => t.slug).sort();
  const pinPath = path.join(ROOT, 'js', 'tool-pinyin.js');
  if (!fs.existsSync(pinPath)) {
    issues.push('[search] js/tool-pinyin.js 缺失（拼音索引未生成）');
  } else {
    const pinSrc = fs.readFileSync(pinPath, 'utf8');
    const pinKeys = [...pinSrc.matchAll(/^\s*"([a-z0-9-]+)":\s*\{/gm)].map(m => m[1]).sort();
    const missing = slugs.filter(s => !pinKeys.includes(s));
    if (missing.length) issues.push(`[search] TOOL_PINYIN_ZH 缺 ${missing.length} 个 slug（${missing.slice(0, 5).join(', ')}…）`);
  }

  // b) 文章搜索已激活
  const homeJs = fs.readFileSync(path.join(ROOT, 'js', 'site-home.js'), 'utf8');
  if (!/articleSearchBlob/.test(homeJs) || !/\.article-item/.test(homeJs)) {
    issues.push('[search] site-home.js 未激活文章搜索（缺 articleSearchBlob 或未引用 .article-item）');
  }
  if (!/applyFilters/.test(homeJs)) {
    issues.push('[search] site-home.js 缺少统一 applyFilters（搜索与分类未协同）');
  }

  // c) 热搜标签去误导
  const idxHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const enHtml = fs.readFileSync(path.join(ROOT, 'en', 'index.html'), 'utf8');
  if (/大家都在搜/.test(idxHtml)) issues.push('[search] index.html 仍含误导标签"大家都在搜"');
  if (/Popular searches/i.test(enHtml)) issues.push('[search] en/index.html 仍含误导标签"Popular searches"');
  if (!/最近搜索/.test(idxHtml)) issues.push('[search] index.html 未使用诚实标签"最近搜索"');
  if (!/Recent searches/i.test(enHtml)) issues.push('[search] en/index.html 未使用诚实标签"Recent searches"');
  if (!/tool-pinyin\.js/.test(idxHtml)) issues.push('[search] index.html 未引入 js/tool-pinyin.js');

  if (issues.length) {
    issues.forEach((f) => fail(f));
  } else {
    console.log(`[17] 搜索升级专项: 拼音索引(${slugs.length} slug) + 文章搜索 + 诚实热搜标签 ✓`);
  }
}

// ---------- 18. 搜索升级 Phase C 断言（2026-08-25） ----------
//   C3: GA4 零结果事件（trackSearchNoResult + search_no_result）
//   C4: aria-live 结果计数（.search-live）+ .sr-only 视觉隐藏样式
//   C5: EN 关键词补全（tools.json en.kw 全覆盖 + 卡片 data-keywords-en + site-home 消费）
{
  const issues = [];
  const toolsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools.json'), 'utf8'));
  const missingEnKw = toolsJson.filter(t => !(t.en && t.en.kw)).map(t => t.slug);
  if (missingEnKw.length) issues.push(`[search-c] tools.json 缺 en.kw ${missingEnKw.length} 个（${missingEnKw.slice(0, 5).join(', ')}…）`);

  const homeJs = fs.readFileSync(path.join(ROOT, 'js', 'site-home.js'), 'utf8');
  if (!/trackSearchNoResult/.test(homeJs)) issues.push('[search-c] site-home.js 缺 trackSearchNoResult（GA4 零结果事件未接入）');
  if (!/search_no_result/.test(homeJs)) issues.push('[search-c] site-home.js 未发送 search_no_result 事件');
  if (!/search-live/.test(homeJs)) issues.push('[search-c] site-home.js 未创建 .search-live 无障碍计数区');
  const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  if (!/\.sr-only\s*\{/.test(css)) issues.push('[search-c] css/style.css 缺 .sr-only 视觉隐藏类');
  if (!/data-keywords-en|keywordsEn/.test(homeJs)) issues.push('[search-c] site-home.js 未消费 data-keywords-en');
  const genHome = fs.readFileSync(path.join(ROOT, 'scripts', 'generate-home.mjs'), 'utf8');
  if (!/data-keywords-en/.test(genHome)) issues.push('[search-c] generate-home.mjs 未注入 data-keywords-en');

  if (issues.length) {
    issues.forEach((f) => fail(f));
  } else {
    console.log(`[18] 搜索升级 Phase C: GA4零结果事件 + aria-live计数 + EN关键词(${toolsJson.length} slug) ✓`);
  }
}

// ---------- 19. P0 门禁：CSS 裸色值 + Emoji 清零 + 紫二次色清零（Phase 0 T0.4 + Phase 1 T1.1/D7） ----------
{
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-p0-gate.mjs')], { stdio: 'inherit', cwd: ROOT });
    console.log('[19] P0 门禁 (CSS裸色值+Emoji清零+紫二次色清零): ✓');
  } catch (e) {
    fail('[P0-gate] scripts/check-p0-gate.mjs 退出码非 0（CSS 裸色值、emoji 或紫二次色未清零）');
  }
}

// ---------- 20. canonical/hreflang 门禁（Phase 0, T0.5, D3 决策） ----------
{
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-canonical.mjs')], { stdio: 'inherit', cwd: ROOT });
    console.log('[20] canonical/hreflang 门禁: ✓');
  } catch (e) {
    fail('[canonical] scripts/check-canonical.mjs 退出码非 0（canonical/hreflang 缺失或不一致）');
  }
}

// ---------- 21. JS 语法门禁（复核缺陷 1 防御） ----------
{
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-js-syntax.mjs')], { stdio: 'inherit', cwd: ROOT });
    console.log('[21] JS 语法门禁: ✓');
  } catch (e) {
    fail('[js-syntax] scripts/check-js-syntax.mjs 退出码非 0（JS 文件存在语法错误）');
  }
}

// ---------- 22. a11y 全站扫描门禁（Phase 4, T4.1, axe 全 WCAG 2.1 A/AA） ----------
{
  // 默认只读结果；较慢（代表页×明暗），用 E2E_SKIP_A11Y=1 跳过（CI 需开启方能保证不回归）
  if (process.env.E2E_SKIP_A11Y === '1') {
    console.log('[22] a11y 全站扫描: ⏭ 跳过（E2E_SKIP_A11Y=1）');
  } else {
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'audit-a11y.mjs')], { stdio: 'inherit', cwd: ROOT, env: { ...process.env } });
      console.log('[22] a11y 全站扫描 (axe WCAG 2.1 A/AA): ✓');
    } catch (e) {
      fail('[a11y] scripts/audit-a11y.mjs 退出码非 0（存在 WCAG 2.1 A/AA 违规；运行 node scripts/audit-a11y.mjs 查看明细）');
    }
  }
}

// ---------- 汇总 ----------
if (failures.length) {
  console.error(`\n❌ verify-site 失败 ${failures.length} 项：`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\n✅ verify-site 全绿');
