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
// M2：构建期按页抽取关键 CSS（工具页 critical-tool.css）
import { buildToolCriticalCss, isToolPagePath } from './extract-critical.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// 源码中不复制到 dist 的目录/文件
const EXCLUDE_DIRS = new Set([
  '.git',
  '.githooks',
  '.github',      // P0-3：CI 工作流属内部资产，禁止进入生产产物
  '.workbuddy',   // P0-3：本地智能体工作区（含一次性脚本/快照），禁止进入生产产物
  '.audit_tmp',   // P0-3：审计临时目录
  'node_modules',
  'dist',
  'scripts',
  'includes',
  'docs',
  'snapshots',
  'deliverables',
  'api',
  'e2e',          // P0-3：E2E 测试源码（tools.spec.mjs 等）禁止进入生产产物
  'test-results', // P0-3：测试产物与探针输出，禁止进入生产产物
]);
const EXCLUDE_FILES = new Set([
  '.gitignore',
  'vercel.json',
  'AGENTS.md',
  'package.json',      // P0-3：依赖清单属内部资产，暴露依赖版本利于供应链攻击
  'package-lock.json', // P0-3：锁定文件同理
]);
// ⚠️ tools.json 必须保留，不可加入排除：
//    js/embed.js:38 在运行时 fetch('/tools.json') 解析工具目录（供 /embed 嵌入 widget 使用），
//    排除后会直接破坏线上嵌入功能。已全仓核实为该文件唯一的运行时消费者。
//    其内容是公开的工具目录，与首页展示一致，无敏感信息。
// 按相对路径排除的子目录（P3：测试文件不应进入生产产物）
const EXCLUDE_SUBDIRS = new Set(['js/test']);
// 按扩展名排除的脚本/临时文件（P0-3：内部脚本与工作区遗留不进入生产产物）
// 已核实站点运行时无 .mjs/.py/.sh 等依赖（HTML 与 js/ 下均无此类文件）
const EXCLUDE_FILE_RE = /\.(?:tmp|cjs|mjs|py|ps1|sh|bash|zsh|rb|pl)$/;
// 根级一次性探针/临时文件（__* 前缀，如 __a11y_probe.mjs / __perf-results.json / __struct.txt）
const EXCLUDE_PROBE_RE = /^__/;
// Playwright 配置（各扩展名，如 playwright.config.mjs）
const EXCLUDE_CONFIG_RE = /^playwright\.config\./;

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
      if (!EXCLUDE_FILES.has(name)
        && !EXCLUDE_FILE_RE.test(name)
        && !EXCLUDE_PROBE_RE.test(name)
        && !EXCLUDE_CONFIG_RE.test(name)) {
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

// 3a) 注入 runtime-head（csp-events 事件委托层，与 AdSense 解耦，迭代二 Q-3，2026-09-09）
//      csp-events.js 是全站 232 处事件委托层，原寄生在 includes/adsense-head.html；
//      广告片段一变（如替换 client id / A-B 测试）全站静默失效。现独立注入，
//      事件层生命周期与广告/GA4 彻底解耦（参考 scripts/verify-site.mjs [30] 断言）。
const runtimeHeadPath = join(root, 'includes', 'runtime-head.html');
if (!existsSync(runtimeHeadPath)) {
  console.error('[build] FATAL: 找不到 includes/runtime-head.html');
  process.exit(1);
}
let runtimeSnippet = readFileSync(runtimeHeadPath, 'utf8').trim();
if (!runtimeSnippet.includes('csp-events.js')) {
  console.error('[build] FATAL: includes/runtime-head.html 不含 csp-events.js');
  process.exit(1);
}
const cspEventsRe = /<script\b[^>]*\bcsp-events\.js\b[^>]*>\s*<\/script>/gi;
let runtimeUpdated = 0;
let runtimeSkipped = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);
  if (text.includes('csp-events.js')) { runtimeSkipped++; return; } // 幂等：已含则跳过
  if (!headRe.test(text)) { console.warn('[build] 跳过 runtime-head(无 <head>):', f.replace(dist, '')); return; }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const newText = text.replace(headRe, `<head>${eol}    ${runtimeSnippet}`);
  if (newText === text) { runtimeSkipped++; return; }
  writeFileSync(f, newText, 'utf8');
  runtimeUpdated++;
});
console.log(`[build] runtime-head(csp-events) 注入: 更新 ${runtimeUpdated} | 跳过 ${runtimeSkipped}`);

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

// M2：从 style.css 抽取工具页首屏关键 CSS → dist/css/critical-tool.css（构建期实时抽取，避免与 style.css 漂移）
mkdirSync(join(dist, 'css'), { recursive: true });
const toolCssOut = join(dist, 'css', 'critical-tool.css');
const toolCriticalCss = buildToolCriticalCss(join(root, 'css', 'style.css'));
const minToolCss = toolCriticalCss
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*([{}:;,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();
writeFileSync(toolCssOut, minToolCss, 'utf8');
console.log(`[build] 工具关键CSS抽取: ${minToolCss.length} 字节 → dist/css/critical-tool.css`);

// L1 DRY：构建时从 tokens.css 提取 @font-face + :root 块，注入 dist/css/critical.css（单一来源，消除漂移）
const tokensSrc = readFileSync(join(root, 'css', 'tokens.css'), 'utf8');
const distCriticalPath = join(dist, 'css', 'critical.css');
if (existsSync(distCriticalPath)) {
  let critDist = readFileSync(distCriticalPath, 'utf8');
  // 提取 tokens.css 中的 @font-face 块和 :root { ... } 块
  const fontFaceBlock = (tokensSrc.match(/@font-face\s*\{[^}]*\}/) || [''])[0];
  const rootBlockMatch = tokensSrc.match(/:root\s*\{/);
  let rootBlock = '';
  if (rootBlockMatch) {
    let depth = 0, si = rootBlockMatch.index;
    for (let i = si; i < tokensSrc.length; i++) {
      if (tokensSrc[i] === '{') depth++;
      if (tokensSrc[i] === '}') { depth--; if (depth === 0) { rootBlock = tokensSrc.slice(si, i + 1); break; } }
    }
  }
  // 替换 critical.css 中的硬编码 @font-face 和 :root 块
  if (fontFaceBlock) {
    critDist = critDist.replace(/@font-face\s*\{[^}]*\}/, fontFaceBlock);
  }
  if (rootBlock) {
    const critRootMatch = critDist.match(/:root\s*\{/);
    if (critRootMatch) {
      let depth = 0, si = critRootMatch.index;
      for (let i = si; i < critDist.length; i++) {
        if (critDist[i] === '{') depth++;
        if (critDist[i] === '}') { depth--; if (depth === 0) { critDist = critDist.slice(0, si) + rootBlock + critDist.slice(i + 1); break; } }
      }
    }
  }
  writeFileSync(distCriticalPath, critDist, 'utf8');
  console.log(`[build] L1 DRY: critical.css :root 已从 tokens.css 同步`);
}

// 仅匹配 style.css 的阻塞样式表 link（用 lookahead 排除同带 rel=stylesheet 的 Google Fonts link）
const STYLE_LINK_RE = /<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["'][^"']*style\.css[^"']*["'])[^>]*>/i;
// 仅匹配 Google Fonts 的阻塞样式表 link（必须 rel=stylesheet，排除已转换的 rel=preload；全局以覆盖多实例）
const FONT_LINK_RE = /<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["']https:\/\/fonts\.googleapis\.com\/css2[^"']*["'])[^>]*>/ig;
// 主题初始化同步脚本（保留同步执行以防 FOUC；仅加 preload 重叠其网络获取）
const THEME_INIT_RE = /<script\b[^>]*\bsrc\s*=\s*["']\/js\/theme-init\.js["'][^>]*>\s*<\/script>/i;

let criticalInjected = 0, fontNonblock = 0, themePreloaded = 0, toolCriticalInjected = 0;
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
    const isTool = isToolPagePath(f.replace(dist, ''));
    const criticalToolHref = isTool ? criticalHref.replace('critical.css', 'critical-tool.css') : null;
    const replacement =
      `<link rel="stylesheet" href="${criticalHref}">\n` +
      (isTool ? `    <link rel="stylesheet" href="${criticalToolHref}">\n` : '') +
      `    <link rel="preload" as="style" href="${href}" data-async-style>\n` +
      `    <noscript><link rel="stylesheet" href="${href}"></noscript>\n` +
      `    <script src="/js/css-async.js" defer></script>`;
    text = text.replace(whole, replacement);
    changed = true;
    criticalInjected++;
    if (isTool) toolCriticalInjected++;
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
console.log(`[build] 关键CSS注入: ${criticalInjected} 页（工具页补充 ${toolCriticalInjected} 页 critical-tool.css）`);
console.log(`[build] 字体非阻塞: ${fontNonblock} 页`);
console.log(`[build] 主题脚本预载: ${themePreloaded} 页`);

// 4) 在 dist/ 内注入缓存版本号（构建时间戳 YYYYMMDDHHmm，仅 dist，源码不含 ?v）
//    覆盖所有本地静态资源：/js/*.js、/css/*.css、/assets/*（含相对写法 css/、js/、assets/）
//    及嵌套页相对路径（../../css/style.css 等，H1 修复）。
//    锚定本地根路径（/ 或 相对），绝不触碰外部 URL（http/ https/ //）。
//    保留 #fragment（SVG sprite <use href=".../icons.svg#icon-x"> 必须保真）。
//    保留既有 query（如有），追加/覆盖 v=STAMP；immutable 长缓存依赖此戳保证改后内容访客立即可见。
const now = new Date();
const pad2 = (n) => String(n).padStart(2, '0');
const STAMP = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}${pad2(now.getHours())}${pad2(now.getMinutes())}`;
const ASSET_RE = /(["'])((?:\.\.\/)*(?:\/)?(?:js|css|assets)\/[^\s"']*?\.(?:js|css|svg|png|jpe?g|gif|webp|ico|woff2?))((?:\?[^"'\s#]*)?)(#[^"']*)?\1/g;

// 统一的版本戳写入函数：第 4 步（HTML 首轮）与第 8 步（兜底 + JS 内动态引用）共用，
// 避免两处逻辑漂移（两条路径必须产出完全一致的 URL，否则同一资源会出现两个缓存键）。
function applyStamp(text) {
  ASSET_RE.lastIndex = 0; // 全局正则带 g：重复调用前重置，避免残留 lastIndex 造成漏匹配
  return text.replace(ASSET_RE, (m, q, path, query, frag) => {
    let vq;
    if (query) {
      // 保留既有 query；若已有 v= 则覆盖其值，否则追加（L2）
      if (/\bv=/i.test(query)) vq = query.replace(/([?&])v=[^&#]*/i, '$1v=' + STAMP);
      else vq = query + '&v=' + STAMP;
    } else {
      vq = '?v=' + STAMP;
    }
    return `${q}${path}${vq}${frag || ''}${q}`;
  });
}

let versioned = 0;
walkHtml(dist, (f) => {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  const newText = applyStamp(text);
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
// L3：同时重写 @import url('./tokens.css') → @import url('./tokens.css?v=STAMP')，防止 immutable 缓存下子资源滞留
const cssPath = join(dist, 'css', 'style.css');
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, 'utf8');
  const min = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@import\s+url\(['"]\.\/tokens\.css['"]\)/g, `@import url('./tokens.css?v=${STAMP}')`)
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
const consentSnippet = `<div id="cmp-banner" class="cmp-banner" role="dialog" aria-label="Cookie 同意" hidden>\n  <p>使用 Cookie 改善体验，继续浏览即同意<a href="/privacy">隐私政策</a>。</p>\n  <div class="cmp-actions">\n    <button id="cmp-decline" class="cmp-btn cmp-btn-ghost">仅必要</button>\n    <button id="cmp-accept" class="cmp-btn cmp-btn-primary">同意</button>\n  </div>\n</div>\n<script src="/js/cmp.js" defer></script>`;
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
//    并将【仅本页用到】的 symbol 内联到 <body> 开头（P0-1 按页 tree-shake，降 HTML 体积）。
//    保留 R1（同文档 <use href="#id">）；未用到的 symbol 不注入，减小每页 HTML。
const spritePath = join(root, 'assets', 'icons', 'icons.svg');
if (existsSync(spritePath)) {
  let spriteSrc = readFileSync(spritePath, 'utf8');
  // 确保有 xmlns（内联时必须）
  if (!spriteSrc.includes('xmlns=')) {
    spriteSrc = spriteSrc.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }
  // 切开 <svg ...> 外层 / symbols / 收尾（含尾注释与 </svg>）
  const firstSym = spriteSrc.indexOf('<symbol');
  const lastSymEnd = spriteSrc.lastIndexOf('</symbol>');
  const spriteOpen = (lastSymEnd >= 0 ? spriteSrc.slice(0, firstSym) : spriteSrc).trim();
  const spriteClose = (lastSymEnd >= 0 ? spriteSrc.slice(lastSymEnd + '</symbol>'.length) : '').trim();
  // id -> <symbol>...</symbol>（保持 sprite 原始顺序）
  const symbolMap = new Map();
  const symRe = /<symbol\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/symbol>/g;
  let sm;
  while ((sm = symRe.exec(spriteSrc))) symbolMap.set(sm[1], sm[0]);
  // 全站 JS 引用到的图标 id（JS 会动态注入 <use href="#icon-x">，这些 symbol 必须在场）
  const jsIconIds = new Set();
  const jsDirAll = join(dist, 'js');
  if (existsSync(jsDirAll)) {
    for (const e of readdirSync(jsDirAll, { withFileTypes: true })) {
      if (!e.name.endsWith('.js')) continue;
      const t = readFileSync(join(jsDirAll, e.name), 'utf8');
      for (const m of t.matchAll(/#(icon-[a-z0-9-]+)/g)) jsIconIds.add(m[1]);
    }
  }
  // 递归补齐 symbol 内部嵌套 <use href="#icon-y"> 的依赖（防漏）
  function expandNeeded(set) {
    const out = new Set(set);
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of [...out]) {
        const sym = symbolMap.get(id);
        if (!sym) continue;
        for (const m of sym.matchAll(/href="#(icon-[a-z0-9-]+)"/g)) {
          if (!out.has(m[1])) { out.add(m[1]); changed = true; }
        }
      }
    }
    return out;
  }
  const SPRITE_RE = /href="\/assets\/icons\/icons\.svg(?:\?[^"#]*)?#/g;
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
    // 已注入（含 class="icon-sprite" 的外层）则跳过
    if (text.includes('class="icon-sprite"')) { spriteUpdated++; return; }
    // 本页静态引用的图标 id + 全站 JS 引用集
    const pageIconIds = new Set();
    for (const m of text.matchAll(/#(icon-[a-z0-9-]+)/g)) pageIconIds.add(m[1]);
    for (const id of jsIconIds) pageIconIds.add(id);
    const needed = expandNeeded(pageIconIds);
    const keptSym = [];
    for (const [id, block] of symbolMap) if (needed.has(id)) keptSym.push(block);
    let miniSprite = spriteOpen;
    if (keptSym.length) miniSprite += '\n' + keptSym.join('\n');
    if (spriteClose) miniSprite += '\n' + spriteClose;
    // 替换外部引用为同文档引用
    const newText = text
      .replace(SPRITE_RE, 'href="#')
      .replace(bodyOpenRe, (m) => `${m}\n${miniSprite}`);
    if (newText !== text) {
      writeFileSync(f, newText, 'utf8');
      spriteUpdated++;
    }
  });
  console.log(`[build] Inline sprite 注入: ${spriteUpdated} 个文件（按页 tree-shake，全站 ${symbolMap.size} symbols）`);
} else {
  console.warn('[build] Inline sprite: 跳过(assets/icons/icons.svg 不存在)');
}

// 8) 版本戳兜底补齐 + JS 内动态引用打戳（2026-09-13「首次打开样式错乱」根因修复 · 防回归）
//    背景：/js/(.*) 与 /css/(.*) 是 immutable + max-age=31536000（一年不校验），
//    因此「未带 ?v= 的本地资源引用」一旦上线就被浏览器钉住，改后一年内不会更新。
//    第 4 步版本注入之后仍有代码往 dist 追加/改写引用，会漏出这类资源：
//      · 第 6 步注入的 /js/cmp.js —— 220+ 页全部漏戳（实测线上确认）
//      · JS 内的动态加载字面量 —— js/home-loader.js 注入 /js/site-home.js、
//        js/text-tools/compress-decompress.js 懒加载 /js/vendor/brotli-*.min.js
//    这些资源必须与 HTML 使用同一个 STAMP，否则「新页面 + 旧脚本」仍会错乱。
//    ⚠️ sw.js 位于 dist 根、刻意不打戳：Service Worker 脚本必须保持稳定 URL，
//       其更新依赖浏览器对 /sw.js 的校验（max-age=0 + updateViaCache:'none'）。
function walkJs(dir, cb) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkJs(full, cb);
    else if (name.endsWith('.js')) cb(full);
  }
}

function stampFile(f) {
  const raw = readFileSync(f);
  let text = raw.toString('utf8');
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) text = text.slice(1);
  const newText = applyStamp(text);
  if (newText === text) return false;
  writeFileSync(f, newText, 'utf8');
  return true;
}

let restampedHtml = 0;
walkHtml(dist, (f) => { if (stampFile(f)) restampedHtml++; });

let stampedJs = 0;
const distJs = join(dist, 'js');
if (existsSync(distJs)) {
  walkJs(distJs, (f) => { if (stampFile(f)) stampedJs++; });
}
console.log(`[build] 版本戳兜底: HTML 补齐 ${restampedHtml} 页 | JS 动态引用补齐 ${stampedJs} 个文件`);

process.exit(0);
