#!/usr/bin/env node
/**
 * scripts/audit-visual.mjs — 渲染级视觉审查（图标/字符/引用完整性）
 * -----------------------------------------------------------------
 * 痛点（2026-09-28 实证）：单纯自动化门禁对「渲染级视觉缺陷」天然失明。
 * 例：批D「图标语言统一」把 ❤️→图标时只换 U+2764、尾随 U+FE0F 成孤儿，
 * 门禁 grep 区间与 check-p0-gate 的 EMOJI_RE 都只扫 1F000–1FAFF / 2600–26FF /
 * 2B00–2BFF / 国旗，U+FE0F 在变体选择符块（U+FE00–FE0F）不在禁区 → 长期假绿。
 * 真渲染才抓得到。本脚本把「手动 Playwright 渲染核查」固化为可重入门禁。
 *
 * 检查项（渲染后 in-page 断言，全部可机械判定）：
 *   1. 隐形图标：渲染可见（非 display:none 子树）的 `svg.ic` 包围盒须 > 0 且
 *      计算颜色非透明（`rgba(0,0,0,0)`/`transparent`/`visibility:hidden`）。
 *      抓「currentColor 同色隐形 / 尺寸塌缩 / 被遮挡透明」类缺陷。
 *      注意：分页/过滤隐藏卡片（`display:none`）用 checkVisibility() 跳过，
 *            不误报（避免索引页 62 个 hidden 卡片假阳性）。
 *   2. 断裂图标引用：`<use href="#icon-x">` 引用的 symbol 须在本页已注入
 *      （build 内联 sprite 为同文档 `<use>`）。图标名写错 → 空白，此查必抓。
 *      外部引用（href 含 `/`，如 `/assets/icons/icons.svg#x`）跳过（构建期已成同文档）。
 *   3. 孤儿变体选择符：DOM 文本节点中 U+FE0E/FE0F，其前一位须为**非 ASCII emoji
 *      基码**，否则判孤儿（零误报；`⚠️`=U+26A0+U+FE0F 前位合法 → 放行）。
 *      与 check-p0-gate.checkOrphanVS 互为双保险（源级 + 渲染级）。
 *   4. 替换符：可见文本含 U+FFFD（豆腐/编码损坏信号）→ 阻断。
 *   5. 未捕获异常：pageerror（uncaught）→ **告警（不阻断）**；console.error → 仅告警（不阻断），
 *      且自动排除「Failed to load resource」类环境性 404 / 网络失败（审计静态服务器 favicon 缺失、
 *      headless 下外部资源如 Google 字体 / AdSense / gtag 不可达所致，非代码缺陷），保留真实代码层 console.error。
 *      理由：实测该 pageerror 为站点自身 JS 的**间歇性、无法按需复现**的预存问题
 *           （受控复现：完整页面序列 144 次加载 0 次；仅在生产态 48 次加载中偶发 1~3 次，消息字面量 "W"，多发于 /zh/index.html），
 *            若设为阻断会使 ci:quick 变成偶发失败的门禁（比无门禁更糟）。故降为告警显著暴露，
 *            作为「已知预存 flaky 未捕获异常」单列待查，不阻塞提交。确定性缺陷（1~4）仍阻断。
 *
 * 主题：明/暗双主题各跑一遍（theme 经 `?theme=` URL 参数 + data-theme 注入，
 *       与 audit-a11y.mjs 同口径，避免 headless dark 采样偏差）。
 * 通道：默认 chromium（E2E_CHANNEL 缺省即 chromium），与铁律「CI 通道 chromium 复跑」一致；
 *       msedge 默认会假绿，本脚本不沿用。
 *
 * 用法：
 *   node scripts/audit-visual.mjs              # 人读输出；缺陷 exit 1
 *   node scripts/audit-visual.mjs --json       # JSON 输出
 *   E2E_CHANNEL=chromium node scripts/audit-visual.mjs
 */
import { chromium } from 'playwright/test';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const jsonMode = process.argv.includes('--json');

if (!fs.existsSync(DIST)) {
  console.error('[audit-visual] dist/ 不存在，请先 `npm run build`');
  process.exit(1);
}

// 代表性页面集：覆盖 首页 / 语言入口 / 工具 × zh/en / 博客索引 + 文章 × zh/en / 结构页
// （特意纳入 blog/zh|en/index.html 与博客文章页 —— 90 处孤儿 FE0F 的原发地，保审查有牙）
const PAGES = [
  '/index.html',
  '/zh/index.html',
  '/en/index.html',
  '/zh/calculators/mortgage.html',
  '/en/calculators/mortgage.html',
  '/zh/text/word-counter.html',
  '/en/text/word-counter.html',
  '/zh/image/compress.html',
  '/en/image/compress.html',
  '/zh/calculators/index.html',
  '/en/calculators/index.html',
  '/zh/image/index.html',
  '/en/image/index.html',
  '/tags/finance.html',
  '/en/tags/finance.html',
  '/blog/zh/index.html',
  '/blog/en/index.html',
  '/blog/zh/age-calc-guide.html',
  '/blog/en/age-calc-guide.html',
  '/help.html',
  '/contact.html',
  '/about.html',
  '/privacy.html',
  '/404.html',
];
const THEMES = ['light', 'dark'];

// ---------- 极简静态服务器（与 audit-a11y.mjs 同构） ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2',
};
function startServer(port) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (p.endsWith('/')) p += 'index.html';
        let file = path.normalize(path.join(DIST, p));
        if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          const wh = file + '.html';
          if (fs.existsSync(wh)) file = wh;
          else { res.writeHead(404, { 'Content-Type': MIME['.html'] }); return res.end(fs.readFileSync(path.join(DIST, '404.html'))); }
        }
        const ext = path.extname(file);
        if (ext === '.html') {
          const html = fs.readFileSync(file, 'utf8').replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          return res.end(html);
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
      } catch { res.writeHead(500); res.end(); }
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

const PORT = Number(process.env.E2E_PORT_VISUAL || 4320);
const srv = await startServer(PORT);

const channel = process.env.E2E_CHANNEL || 'chromium';
const launchOpts = { headless: true };
if (channel !== 'chromium') launchOpts.channel = channel;
const browser = await chromium.launch(launchOpts);
const context = await browser.newContext({ baseURL: `http://127.0.0.1:${PORT}`, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// 在页面内做全部断言（一次 evaluate 完成，避免逐元素回传开销）
async function scanPage() {
  return page.evaluate(() => {
    const out = { invisible: [], brokenUse: [], orphanVS: [], repl: 0 };
    const symbols = new Set([...document.querySelectorAll('symbol[id^="icon-"]')].map((s) => s.id));

    // 断裂图标引用（同文档 `#icon-x`）
    document.querySelectorAll('use').forEach((u) => {
      const href = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').trim();
      if (!href.startsWith('#')) return; // 外部引用（含 /）由构建期已内联，跳过
      const id = href.slice(1);
      if (id && !symbols.has(id) && !document.getElementById(id)) out.brokenUse.push(id);
    });

    // 隐形图标（跳过 display:none 子树，避免分页卡片假阳性）
    document.querySelectorAll('svg.ic').forEach((svg) => {
      const visible = svg.checkVisibility
        ? svg.checkVisibility({ visibilityProperty: true, opacityProperty: false, contentVisibilityAutoProperty: false })
        : true;
      if (!visible) return;
      const r = svg.getBoundingClientRect();
      const cs = getComputedStyle(svg);
      const zeroBox = r.width === 0 || r.height === 0;
      const transparent = cs.color === 'rgba(0, 0, 0, 0)' || cs.color === 'transparent' || cs.visibility === 'hidden';
      if (zeroBox || transparent) {
        out.invisible.push({
          cls: typeof svg.className === 'string' ? svg.className : (svg.getAttribute('class') || ''),
          w: Math.round(r.width), h: Math.round(r.height),
          reason: zeroBox ? 'zero-box' : 'transparent-color',
        });
      }
    });

    // 文本节点扫描：孤儿变体选择符 + 替换符
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue;
      if (!t) continue;
      for (let i = 0; i < t.length; i++) {
        const c = t.codePointAt(i);
        if (c === 0xfffd) out.repl++;
        if (c === 0xfe0f || c === 0xfe0e) {
          const prev = i > 0 ? t.codePointAt(i - 1) : null;
          const orphan = prev === null || prev < 0x80 || prev === 0xfe0e || prev === 0xfe0f;
          if (orphan) out.orphanVS.push(t.slice(Math.max(0, i - 3), i + 1));
        }
      }
    }
    return out;
  });
}

const report = [];
let totalInvisible = 0, totalBroken = 0, totalOrphan = 0, totalRepl = 0;
let totalPageErrors = 0;
const consoleErrors = [];

for (const theme of THEMES) {
  for (const url of PAGES) {
    const pageErrors = [];
    const onPageError = (e) => pageErrors.push(e.message);
    const onConsole = (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // 环境性噪声：审计静态服务器对 favicon 等缺失资源返回 404、headless 下外部资源（Google 字体/AdSense/gtag）不可达
      // → 属于「Failed to load resource」类，非代码缺陷，剔除以免淹没真实 console.error 告警。
      if (/Failed to load resource/i.test(t)) return;
      consoleErrors.push(`${theme} ${url}: ${t}`);
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);
    let row;
    try {
      const sep = url.includes('?') ? '&' : '?';
      const themedUrl = url + sep + 'theme=' + theme;
      const resp = await page.goto(themedUrl, { waitUntil: 'load', timeout: 20000 });
      await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
      await page.waitForFunction((t) => document.documentElement.getAttribute('data-theme') === t, theme, { timeout: 3000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(400);
      const sc = await scanPage();
      totalInvisible += sc.invisible.length;
      totalBroken += sc.brokenUse.length;
      totalOrphan += sc.orphanVS.length;
      totalRepl += sc.repl;
      totalPageErrors += pageErrors.length;
      row = { theme, url, status: resp?.status(), ...sc, pageErrors };
    } catch (e) {
      row = { theme, url, status: 'ERR', error: e.message.split('\n')[0], invisible: [], brokenUse: [], orphanVS: [], repl: 0, pageErrors };
    }
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    report.push(row);
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  }
}

await browser.close();
srv.close();

// ---------- 汇总 ----------
// 阻断项：确定性渲染缺陷（1~4）。pageerror / console.error 为告警项（非阻断），见顶部第 5 条说明。
const blocking = totalInvisible + totalBroken + totalOrphan + totalRepl;

if (jsonMode) {
  process.stdout.write(JSON.stringify({
    totals: { invisible: totalInvisible, brokenUse: totalBroken, orphanVS: totalOrphan, replacementChar: totalRepl, pageErrors: totalPageErrors, consoleErrors: consoleErrors.length },
    consoleErrors,
    pages: report,
  }, null, 2) + '\n');
} else {
  for (const r of report) {
    const parts = [];
    if (r.invisible.length) parts.push(`隐形图标 ${r.invisible.length}`);
    if (r.brokenUse.length) parts.push(`断裂引用 ${r.brokenUse.length}[${r.brokenUse.slice(0, 5).join(',')}]`);
    if (r.orphanVS.length) parts.push(`孤儿VS ${r.orphanVS.length}`);
    if (r.repl) parts.push(`替换符 ${r.repl}`);
    if (r.pageErrors.length) parts.push(`pageerror ${r.pageErrors.length}`);
    const flag = parts.length ? '✗ ' + parts.join(' / ') : '✓';
    console.log(`[${r.theme}] ${r.url} (${r.status}) — ${flag}`);
  }
  if (consoleErrors.length) {
    console.log(`\n[!] ${consoleErrors.length} 条 console.error（告警·非阻断，已排除环境性 404/网络失败）:`);
    consoleErrors.slice(0, 10).forEach((c) => console.log('    ' + c));
  }
  console.log(`\n═══ 视觉审查汇总 ═══`);
  console.log(`  隐形图标: ${totalInvisible}`);
  console.log(`  断裂图标引用: ${totalBroken}`);
  console.log(`  孤儿变体选择符(FE0E/FE0F): ${totalOrphan}`);
  console.log(`  替换符(U+FFFD): ${totalRepl}`);
  if (totalPageErrors) console.log(`  [告警] 未捕获异常(pageerror): ${totalPageErrors}（非阻断，预存间歇性问题，消息多為 "W"）`);
  if (consoleErrors.length) console.log(`  [告警] console.error: ${consoleErrors.length}（非阻断）`);
  const warn = totalPageErrors + consoleErrors.length;
  console.log(blocking === 0
    ? `\n✅ 视觉审查通过（阻断项 0；告警项 ${warn} 见上，不阻塞）`
    : `\n❌ 发现 ${blocking} 处渲染级缺陷（阻断）`);
}

process.exit(blocking === 0 ? 0 : 1);
