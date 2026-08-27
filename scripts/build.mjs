#!/usr/bin/env node
/**
 * Vercel 构建脚本
 * ---------------------------------------------------------------
 * 将站点文件复制到 dist/ 目录，并在 dist/ 内执行：
 * 1. cleanup-deprecated：移除旧版自定义 cookie-consent 引用
 * 2. inject-adsense：从 includes/adsense-head.html 注入 AdSense head 脚本
 *
 * 使用 dist/ 作为 outputDirectory，避免修改源码目录，
 * 确保 Vercel 每次部署都拿到全新输出，不会被旧构建缓存干扰。
 */

import { mkdirSync, readdirSync, statSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// P0：构建前从 tools.json 单一数据源生成首页卡片 + JS 配置（3.4 单数据源）
import './generate-home.mjs';
// P1：构建前自动生成标签聚合落地页（/tags/<cat>.html + /en/tags/<cat>.html）
import './generate-tag-pages.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// 源码中不复制到 dist 的目录/文件
const EXCLUDE_DIRS = new Set([
  '.git',
  '.githooks',
  'node_modules',
  'dist',
  'scripts',
  'includes',
  'docs',
  'snapshots',
  'deliverables',
  'api',
]);
const EXCLUDE_FILES = new Set([
  '.gitignore',
  'vercel.json',
  'AGENTS.md',
]);
// 按相对路径排除的子目录（P3：测试文件不应进入生产产物）
const EXCLUDE_SUBDIRS = new Set(['js/test']);
// 按扩展名排除的临时/脚本文件（P3：工作区遗留 .tmp/.cjs 不进入生产产物）
const EXCLUDE_FILE_RE = /\.(?:tmp|cjs)$/;

function copyDir(src, dst, rel) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const srcPath = join(src, name);
    const dstPath = join(dst, name);
    const relPath = rel ? rel + '/' + name : name;
    const st = statSync(srcPath);
    if (st.isDirectory()) {
      // 排除固定目录 + 所有 dist.bak-* 备份目录 + 指定子目录（防止备份/测试污染构建产物）
      if (!EXCLUDE_DIRS.has(name) && !name.startsWith('dist.bak') && !EXCLUDE_SUBDIRS.has(relPath)) {
        copyDir(srcPath, dstPath, relPath);
      }
    } else {
      if (!EXCLUDE_FILES.has(name) && !EXCLUDE_FILE_RE.test(name)) {
        copyFileSync(srcPath, dstPath);
      }
    }
  }
}

// 1) 清空并重建 dist
if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}
copyDir(root, dist, '');
console.log('[build] 站点文件已复制到 dist/');

// 2) 在 dist/ 内清理旧版 cookie-consent 引用
const linkRe = /<link\b[^>]*\bcookie-consent\.css[^>]*>\s*/gi;
const scriptRe = /<script\b[^>]*\bcookie-consent\.js[^>]*>\s*<\/script>\s*/gi;

function walkHtml(dir, callback) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkHtml(full, callback);
    } else if (name.endsWith('.html')) {
      callback(full);
    }
  }
}

// 1.5) 在 dist/ 内执行「卫生」转换（P1-2 去BOM / P1-3 charset置首 / P2-7 懒加载 / P1-4 inline display:none→.hidden）
// 集中处理可机械化、跨全站的高频修复，确保即便源码被同步盘回滚，生产产物始终正确。
function ensureCharsetFirst(html) {
  const headOpen = html.match(/<head[^>]*>/i);
  if (!headOpen) return html;
  const headTag = headOpen[0];
  const headIdx = headOpen.index;
  const afterHead = html.slice(headIdx + headTag.length);
  const charsetMatch = afterHead.match(/<meta\s+charset[^>]*>/i);
  if (!charsetMatch) return html;
  const rest = afterHead.replace(charsetMatch[0], '').replace(/^\s*/, '');
  return html.slice(0, headIdx + headTag.length) + '\n    ' + charsetMatch[0] + '\n    ' + rest;
}

function lazyImages(html) {
  return html.replace(/<img\b([^>]*)>/gi, (m, attrs) => {
    if (/\sloading\s*=/i.test(attrs)) return m;
    if (/\bclass\s*=\s*["'][^"']*(site-logo|logo|favicon)/i.test(attrs)) return m;
    if (/\bsrc\s*=\s*["']data:/i.test(attrs)) return m;
    let next = attrs;
    if (!/\sdecoding\s*=/i.test(next)) next += ' decoding="async"';
    next += ' loading="lazy"';
    return '<img' + next + '>';
  });
}

function inlineNoneToHidden(html) {
  return html.replace(/(<[a-zA-Z][a-zA-Z0-9]*\b)([^>]*?)\sstyle\s*=\s*["']\s*display\s*:\s*none\s*;?\s*["']([^>]*>)/gi,
    (full, open, b1, b2) => {
      let rest = b1 + b2;
      if (/\bclass\s*=\s*(["'])/i.test(rest)) {
        rest = rest.replace(/(\bclass\s*=\s*(["']))([^"']*)\2/, (m, p1, q, cls) => `${p1}${cls} hidden${q}`);
      } else {
        rest = ' class="hidden"' + rest;
      }
      return open + rest;
    });
}

let cleanupCount = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  linkRe.lastIndex = 0;
  scriptRe.lastIndex = 0;
  const newText = text.replace(linkRe, '').replace(scriptRe, '');
  if (newText !== text) {
    writeFileSync(f, newText, 'utf8');
    cleanupCount++;
  }
});
console.log(`[build] 清理旧版 cookie-consent 引用: ${cleanupCount} 个文件`);

// 3) 在 dist/ 内注入 AdSense head 脚本
const includePath = join(root, 'includes', 'adsense-head.html');
if (!existsSync(includePath)) {
  console.error('[build] FATAL: 找不到 includes/adsense-head.html');
  process.exit(1);
}
let snippet = readFileSync(includePath, 'utf8').trim();
if (!snippet.includes('adsbygoogle.js')) {
  console.error('[build] FATAL: includes/adsense-head.html 内容不含 adsbygoogle.js');
  process.exit(1);
}

// GA4 占位符守卫：未替换占位符时剥离 GA4 代码，仅保留 AdSense，避免线上无效请求
const GA4_PLACEHOLDER = 'G-XXXXXXXXXX';
const htmlCommentRe = /<!--(?:(?!-->)[\s\S])*?-->/g;
const ga4LoaderRe = /<script\b[^>]*\bgoogletagmanager\.com\/gtag\/js\b[^>]*>\s*<\/script>/gi;
const ga4InlineRe = /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?gtag\s*\(\s*['"]config['"][\s\S]*?<\/script>/gi;
const collapse = (s) => s.replace(/(?:\r?\n){2,}/g, '\n').trim();

// 注释仅供维护者阅读，不应进入线上 HTML；同时消除「注释内占位符字面量」误触发守卫
snippet = collapse(snippet.replace(htmlCommentRe, ''));

function stripGa4(raw) {
  return collapse(raw.replace(ga4LoaderRe, '').replace(ga4InlineRe, ''));
}

if (snippet.includes(GA4_PLACEHOLDER)) {
  const stripped = stripGa4(snippet);
  if (!stripped.includes('adsbygoogle.js')) {
    console.error('[build] FATAL: 剥离 GA4 后 AdSense loader 丢失，请检查 includes/adsense-head.html');
    process.exit(1);
  }
  if (stripped.includes('googletagmanager.com') || stripped.includes(GA4_PLACEHOLDER)) {
    console.error('[build] FATAL: 剥离 GA4 不彻底（仍含 googletagmanager.com 或占位符），请检查 includes/adsense-head.html');
    process.exit(1);
  }
  snippet = stripped;
  console.warn('[build] WARN: GA4 仍为占位符（G-XXXXXXXXXX），本次构建不注入 GA4 代码以避免线上无效请求。填入真实 Measurement ID 后将自动启用。');
} else {
  const idMatch = snippet.match(/G-[A-Z0-9]+/);
  console.log(`[build] GA4 已启用: ${idMatch ? idMatch[0] : '(ID 未识别)'}`);
}

const adsenseScriptRe = /<script\b[^>]*\badsbygoogle\.js\b[^>]*>\s*<\/script>/gi;
const headRe = /<head\b[^>]*>/i;
let adsenseUpdated = 0;
let adsenseSkipped = 0;

walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  if (text.includes(snippet)) {
    adsenseSkipped++;
    return;
  }

  if (!headRe.test(text)) {
    console.warn('[build] 跳过(无 <head>):', f.replace(dist, ''));
    return;
  }

  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const stripped = text.replace(adsenseScriptRe, '');
  const newText = stripped.replace(headRe, `<head>${eol}    ${snippet}`);

  if (newText === text) {
    adsenseSkipped++;
    return;
  }

  writeFileSync(f, newText, 'utf8');
  adsenseUpdated++;
});
console.log(`[build] AdSense 注入: 更新 ${adsenseUpdated} | 跳过 ${adsenseSkipped}`);

// 3b) 注入 PWA head 标签（manifest / theme-color / apple-touch-icon / SW 注册脚本）
const PWA_INJECT = '<link rel="manifest" href="/manifest.json">'
  + '\n    <meta name="theme-color" content="#007AFF">'
  + '\n    <meta name="apple-mobile-web-app-capable" content="yes">'
  + '\n    <link rel="apple-touch-icon" href="/assets/logo.svg">'
  + '\n    <script src="/js/pwa.js" defer></script>';
let pwaUpdated = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);
  if (text.includes('rel="manifest"')) return;
  if (!headRe.test(text)) return;
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const newText = text.replace(headRe, `<head>${eol}    ${PWA_INJECT}`);
  if (newText === text) return;
  writeFileSync(f, newText, 'utf8');
  pwaUpdated++;
});
console.log(`[build] PWA 注入: 更新 ${pwaUpdated} 页`);

// 3c) 性能硬指标 T2.1 / T2.2 / T2.3：关键 CSS 非阻塞 + 字体非阻塞 + 主题脚本预载
//     ⚠️ CSP 约束：本站 script-src / style-src 无 'unsafe-inline'（verify [7]/[8]/[9] 强制 0 内联），
//     故采用「外部关键 CSS + preload + 延迟外部脚本应用」方案，等效规范意图且 CSP 合规。
const criticalCssPath = join(root, 'css', 'critical.css');
const themeInitPath = join(root, 'js', 'theme-init.js');
if (!existsSync(criticalCssPath)) {
  console.error('[build] FATAL: 找不到 css/critical.css');
  process.exit(1);
}
const criticalCss = readFileSync(criticalCssPath, 'utf8');
const themeInitJs = readFileSync(themeInitPath, 'utf8');
if (themeInitJs.includes('</script>')) {
  console.error('[build] FATAL: theme-init.js 含 </script> 字面量，无法安全预载');
  process.exit(1);
}

// 仅匹配 style.css 的阻塞样式表 link（用 lookahead 排除同带 rel=stylesheet 的 Google Fonts link）
const STYLE_LINK_RE = /<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["'][^"']*style\.css[^"']*["'])[^>]*>/i;
// 仅匹配 Google Fonts 的阻塞样式表 link（必须 rel=stylesheet，排除已转换的 rel=preload；全局以覆盖多实例）
const FONT_LINK_RE = /<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["']https:\/\/fonts\.googleapis\.com\/css2[^"']*["'])[^>]*>/ig;
// 主题初始化同步脚本（保留同步执行以防 FOUC；仅加 preload 重叠其网络获取）
const THEME_INIT_RE = /<script\b[^>]*\bsrc\s*=\s*["']\/js\/theme-init\.js["'][^>]*>\s*<\/script>/i;

let criticalInjected = 0, fontNonblock = 0, themePreloaded = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);
  let changed = false;

  // T2.1：阻塞样式表 → 外部关键 CSS(阻塞,极小) + 全量 CSS(preload,延迟应用) + noscript 回退
  const styleMatch = text.match(STYLE_LINK_RE);
  if (styleMatch) {
    const whole = styleMatch[0];
    const hrefMatch = whole.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    const href = hrefMatch ? hrefMatch[1] : 'css/style.css';
    const criticalHref = href.replace(/css\/style\.css(\?[^"']*)?/, 'css/critical.css');
    const replacement =
      `<link rel="stylesheet" href="${criticalHref}">\n` +
      `    <link rel="preload" as="style" href="${href}" data-async-style>\n` +
      `    <noscript><link rel="stylesheet" href="${href}"></noscript>\n` +
      `    <script src="/js/css-async.js" defer></script>`;
    text = text.replace(whole, replacement);
    changed = true;
    criticalInjected++;
  }

  // T2.3：Google Fonts 阻塞 link → preload(延迟应用) + noscript 回退（无内联 onload）
  if (FONT_LINK_RE.test(text)) {
    text = text.replace(FONT_LINK_RE, (m) => {
      const hm = m.match(/\bhref\s*=\s*["']([^"']+)["']/i);
      const href = hm ? hm[1] : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      return `<link rel="preload" as="style" href="${href}" data-async-style>\n    <noscript><link rel="stylesheet" href="${href}"></noscript>`;
    });
    changed = true;
    fontNonblock++;
  }

  // T2.2：主题脚本保留同步外部（防 FOUC）；加 preload 重叠其网络获取以降低阻塞窗口
  //      （整站内联 <script> 被 verify [7] 禁止，故不内联；preload 为 CSP 安全优化）
  if (THEME_INIT_RE.test(text)) {
    text = text.replace(THEME_INIT_RE, (m) => `<link rel="preload" as="script" href="/js/theme-init.js">\n    ${m}`);
    changed = true;
    themePreloaded++;
  }

  if (changed) writeFileSync(f, text, 'utf8');
});
console.log(`[build] 关键CSS注入: ${criticalInjected} 页`);
console.log(`[build] 字体非阻塞: ${fontNonblock} 页`);
console.log(`[build] 主题脚本预载: ${themePreloaded} 页`);

// 4) 在 dist/ 内注入缓存版本号（构建时间戳 YYYYMMDDHHmm，仅 dist，源码不含 ?v）
//    覆盖所有本地静态资源：/js/*.js、/css/*.css、/assets/*（含相对写法 css/、js/、assets/）
//    锚定本地根路径（/ 或 相对），绝不触碰外部 URL（http/ https/ //）。
//    保留 #fragment（SVG sprite <use href=".../icons.svg#icon-x"> 必须保真）。
//    幂等：已带 ?v 会统一覆盖为当前 STAMP；immutable 长缓存依赖此戳保证改后内容访客立即可见。
const now = new Date();
const pad2 = (n) => String(n).padStart(2, '0');
const STAMP = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}${pad2(now.getHours())}${pad2(now.getMinutes())}`;
const ASSET_RE = /(["'])((?:\/)?(?:js|css|assets)\/[^\s"']*?\.(?:js|css|svg|png|jpe?g|gif|webp|ico|woff2?))(\?v=[^"'\s#]*)?(#[^"']*)?\1/g;
let versioned = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  const newText = text.replace(ASSET_RE, (m, q, path, v, frag) => `${q}${path}?v=${STAMP}${frag || ''}${q}`);
  if (newText !== text) {
    writeFileSync(f, newText, 'utf8');
    versioned++;
  }
});
console.log(`[build] 版本号注入: ${STAMP} | ${versioned} 个文件`);

// 4.5) 卫生转换（必须在 AdSense/版本注入之后执行，确保 charset 真正位于 <head> 首位）
let hygieneCount = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  let text = raw.toString('utf8');
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) text = text.slice(1);
  const newText = inlineNoneToHidden(lazyImages(ensureCharsetFirst(text)));
  if (newText !== text) {
    writeFileSync(f, newText, 'utf8');
    hygieneCount++;
  }
});
console.log(`[build] 卫生转换(去BOM/charset置首/懒加载/inline→hidden): ${hygieneCount} 个文件`);

// 5) CSS 压缩（P3-1）：移除注释并折叠空白，减小传输体积
const cssPath = join(dist, 'css', 'style.css');
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, 'utf8');
  const min = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
  writeFileSync(cssPath, min, 'utf8');
  console.log(`[build] CSS 压缩: ${css.length} → ${min.length} 字节 (节省 ${css.length - min.length})`);
} else {
  console.log('[build] CSS 压缩: 跳过(未找到 css/style.css)');
}

// 6) 注入轻量 Cookie 同意横幅（P1-6：非 EEA 合规基线；EEA 流量评估后需接入 Google 认证 CMP）
// CSP T03：内联 IIFE 外链化为 /js/cmp.js（严格 CSP 不允许内联脚本）
const consentSnippet = `<div id="cmp-banner" class="cmp-banner" role="dialog" aria-label="Cookie 同意" hidden>\n  <p>我们使用 Cookie 与本地存储以改善体验并展示相关广告。继续浏览即表示你同意我们的 <a href="/privacy">隐私政策</a>。</p>\n  <div class="cmp-actions">\n    <button id="cmp-decline" class="cmp-btn cmp-btn-ghost">仅必要</button>\n    <button id="cmp-accept" class="cmp-btn cmp-btn-primary">同意</button>\n  </div>\n</div>\n<script src="/js/cmp.js" defer></script>`;
const bodyRe = /<\/body>/i;
let cmpCount = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  let text = raw.toString('utf8');
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) text = text.slice(1);
  if (text.includes('cmp-banner')) { cmpCount++; return; }
  if (!bodyRe.test(text)) { console.warn('[build] 跳过 CMP 注入(无 </body>):', f.replace(dist, '')); return; }
  const newText = text.replace(bodyRe, `${consentSnippet}\n</body>`);
  writeFileSync(f, newText, 'utf8');
  cmpCount++;
});
console.log(`[build] CMP 横幅注入: ${cmpCount} 个文件`);

// 7) Inline SVG sprite：将外部 <use href="/assets/icons/icons.svg#id"> 改为同文档 <use href="#id">
//    并将 sprite 内容注入每个 HTML 的 <body> 开头，消除跨文档引用兼容性问题（Safari/部分 Chromium）
const spritePath = join(root, 'assets', 'icons', 'icons.svg');
if (existsSync(spritePath)) {
  let spriteContent = readFileSync(spritePath, 'utf8');
  // 确保有 xmlns（内联时必须）
  if (!spriteContent.includes('xmlns=')) {
    spriteContent = spriteContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }
  const SPRITE_RE = /href="\/assets\/icons\/icons\.svg#/g;
  const bodyOpenRe = /<body[^>]*>/i;
  let spriteUpdated = 0;
  // Fix JS files too (they generate icons dynamically)
  const jsDir = join(dist, 'js');
  if (existsSync(jsDir)) {
    for (const entry of readdirSync(jsDir, { withFileTypes: true })) {
      if (!entry.name.endsWith('.js')) continue;
      const f = join(jsDir, entry.name);
      const raw = readFileSync(f);
      let text = raw.toString('utf8');
      if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) text = text.slice(1);
      const newText = text.replace(SPRITE_RE, 'href="#');
      if (newText !== text) { writeFileSync(f, newText, 'utf8'); spriteUpdated++; }
    }
  }
  walkHtml(dist, (f) => {
    const raw = readFileSync(f);
    let text = raw.toString('utf8');
    if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) text = text.slice(1);
    // 已注入则跳过
    if (text.includes('id="icon-activity"')) { spriteUpdated++; return; }
    // 替换外部引用为同文档引用
    const newText = text
      .replace(SPRITE_RE, 'href="#')
      .replace(bodyOpenRe, (m) => `${m}\n${spriteContent}`);
    if (newText !== text) {
      writeFileSync(f, newText, 'utf8');
      spriteUpdated++;
    }
  });
  console.log(`[build] Inline sprite 注入: ${spriteUpdated} 个文件`);
} else {
  console.warn('[build] Inline sprite: 跳过(assets/icons/icons.svg 不存在)');
}

process.exit(0);
