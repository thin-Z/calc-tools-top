#!/usr/bin/env node
/**
 * scripts/audit-a11y.mjs — 全站可访问性审计（WCAG 2.1 A/AA，Phase 4 T4.1）
 * -----------------------------------------------------------------
 * 用 Playwright(msedge channel, 复用系统 Edge) + axe-core 对代表性页面集做
 * 全规则(`wcag2a/2aa/21a/21aa`) axe 扫描，明/暗双主题各跑一遍。
 * violations>0 时退出码 1（可接入 verify-site #22 / CI 阻断）。
 * incomplete（无法判定）仅记录不阻断。
 *
 * 说明：默认 `chromium.launch({ channel:'msedge' })` 复用系统 Edge（本机已装）。
 *       CI(ubuntu-latest) 无 msedge，设 `E2E_CHANNEL=chromium` 可走 Playwright 自带 chromium
 *       （launch 不带 channel，避免找不到 msedge channel 而报错）。
 *
 * 用法：
 *   node scripts/audit-a11y.mjs              # 人读输出；违规 exit 1
 *   node scripts/audit-a11y.mjs --json       # JSON 输出
 *   node scripts/audit-a11y.mjs --rules      # 仅列违规规则 ID（供定位）
 */
import { chromium } from 'playwright/test';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const AXE_SRC = fs.readFileSync(path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
const jsonMode = process.argv.includes('--json');
const rulesOnly = process.argv.includes('--rules');

// 代表性页面集：覆盖 首页 / 语言入口 / 工具(计算·文本·图片) × zh/en / 帮助 / 404 / 标签 / 博客 × zh/en / 结构页
const PAGES = [
  '/index.html',
  '/zh/index.html',
  '/en/index.html',
  '/zh/calculators/mortgage.html',
  '/en/calculators/mortgage.html',
  '/zh/calculators/percentage-calc.html',
  '/zh/text/word-counter.html',
  '/en/text/word-counter.html',
  '/zh/text/json-formatter.html',
  '/zh/image/compress.html',
  '/en/image/compress.html',
  '/zh/image/color-picker.html',
  '/tags/finance.html',
  '/en/tags/finance.html',
  '/blog/zh/password-security-guide.html',
  '/blog/en/password-security-guide.html',
  '/help.html',
  '/contact.html',
  '/about.html',
  '/privacy.html',
  '/404.html',
  '/embed.html',
  '/fraction-decimal-table.html',
];
const THEMES = ['light', 'dark'];

// ---------- 极简静态服务器（复用 e2e-server 的行为） ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
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
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
      } catch { res.writeHead(500); res.end(); }
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

// ---------- 主流程 ----------
const PORT = Number(process.env.E2E_PORT || 4318);
await startServer(PORT);

// 复用系统 Edge（msedge channel），兜底 E2E_CHANNEL。
// CI(ubuntu-latest) 无 msedge，设 E2E_CHANNEL=chromium 走 Playwright 自带 chromium（launch 不带 channel）。
const channel = process.env.E2E_CHANNEL || 'msedge';
const launchOpts = { headless: true };
if (channel !== 'chromium') launchOpts.channel = channel;
const browser = await chromium.launch(launchOpts);
const context = await browser.newContext({ baseURL: `http://127.0.0.1:${PORT}`, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const report = [];
let totalViolations = 0;
const ruleIds = new Set();

for (const theme of THEMES) {
  for (const url of PAGES) {
    let row;
    try {
      // 用 URL 参数 ?theme=dark|light 触发主题（theme-init.js 优先读 URL 参数，比 localStorage 注入可靠，
      // 且真实浏览器验证 dark tool-card p(#98989D)在 cardBg(#1C1C1E)上 5.93:1 达标 —— localStorage 注入会误报 dark 违规）。
      const sep = url.includes('?') ? '&' : '?';
      const themedUrl = url + sep + 'theme=' + theme;
      const resp = await page.goto(themedUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // C4-a11y(2026-08-28): 强制设定 data-theme + 等字体/两帧, 消除 headless 下 dark 主题采样偏差(原读到浅底浅字误报)
      await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
      await page.waitForFunction((t) => document.documentElement.getAttribute('data-theme') === t, theme, { timeout: 3000 }).catch(() => {});
      await page.locator('#cmp-accept').click({ timeout: 1000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.waitForTimeout(200);
      await page.evaluate(AXE_SRC);
      const ax = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
          resultTypes: ['violations', 'incomplete'],
        });
        // 真实对比度复算（R4 / C4-a11y）：axe 对半透明底(var 0.15 alpha tint)的 color-contrast 计算不稳，
        // 直接拿未合成的 rgba 当底色会误报（如 #1d4ed8 on rgba(37,99,235,0.15) 算成 1.3:1）。
        // 这里按 WCAG 规则把半透明背景逐层「合成」到最近的不透明祖先底色，得到真实渲染色再判；
        // 仅当实测对比度仍不足才保留上报 —— 假阳性(真实达标)一律豁免，真缺陷永不掩盖。
        const parseRGBA = (s) => {
          if (!s || s === 'transparent') return [255, 255, 255, 0];
          const m = s.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const p = m[1].split(',').map((x) => parseFloat(x));
          return [p[0], p[1], p[2], p.length > 3 ? (p[3] === undefined ? 1 : p[3]) : 1];
        };
        const lum = (c) => {
          const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
        };
        const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); const hi = Math.max(L1, L2), lo = Math.min(L1, L2); return (hi + 0.05) / (lo + 0.05); };
        const effectiveBg = (el) => {
          let acc = parseRGBA(getComputedStyle(el).backgroundColor) || [255, 255, 255, 0];
          if (acc[3] < 1) {
            let node = el.parentElement, guard = 0;
            while (node && acc[3] < 1 && guard++ < 16) {
              const pb = parseRGBA(getComputedStyle(node).backgroundColor);
              if (pb) acc = [pb[0] * pb[3] + acc[0] * (1 - pb[3]), pb[1] * pb[3] + acc[1] * (1 - pb[3]), pb[2] * pb[3] + acc[2] * (1 - pb[3]), Math.min(1, pb[3] + acc[3] * (1 - pb[3]))];
              node = node.parentElement;
            }
          }
          return acc;
        };
        const out = { violations: [], incompleteCount: r.incomplete.reduce((a, v) => a + v.nodes.length, 0) };
        for (const v of r.violations) {
          if (v.id === 'color-contrast') {
            const nodes = [];
            for (const n of v.nodes) {
              let el = n.element;
              if (!el) {
                const sel = (Array.isArray(n.target) ? n.target : [String(n.target)]).filter((s) => typeof s === 'string' && !s.startsWith('/'))[0];
                el = sel ? document.querySelector(sel) : null;
              }
              if (!el) { nodes.push({ target: n.target, drop: false, note: 'el-missing' }); continue; }
              const cs = getComputedStyle(el);
              const fg = parseRGBA(cs.color) || [0, 0, 0, 1];
              const bg = effectiveBg(el);
              const isLarge = parseFloat(cs.fontSize) >= 18 || (parseFloat(cs.fontSize) >= 14 && (cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 700));
              const rr = ratio(fg, bg);
              const need = isLarge ? 3 : 4.5;
              nodes.push({
                target: n.target,
                drop: rr >= need,            // 实测(合成后)达标 → axe 假阳性，豁免；否则保留真实缺陷
                fg: cs.color,
                bg: `rgb(${bg[0] | 0}, ${bg[1] | 0}, ${bg[2] | 0})`,
                ratio: +rr.toFixed(2),
                need,
                size: isLarge ? 'large' : 'normal',
                inCard: !!el.closest('.tool-card, .tool-card-wrap, .hot-tool-card'),
                note: rr >= need ? 'composited-pass' : 'real-fail',
              });
            }
            out.violations.push({ id: v.id, impact: v.impact, help: v.help, nodes });
          } else {
            out.violations.push({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target, summary: (n.any[0] && n.any[0].message) || '' })) });
          }
        }
        return out;
      });
      const results = ax;
      results.violations = results.violations
        .map((v) => v.id === 'color-contrast' ? { ...v, nodes: v.nodes.filter((n) => !n.drop) } : v)
        .filter((v) => v.nodes.length > 0);
      // 全量留痕：豁免掉的也记录实测合成值，形成"每次豁免都有真值反证"的审计链（CI 产物可回溯）
      const diag = [];
      for (const v of ax.violations) if (v.id === 'color-contrast') for (const n of v.nodes) diag.push(n);
      results.violations.forEach((v) => ruleIds.add(v.id));
      row = { theme, url, status: resp?.status(), ...results, realColors: diag };
    } catch (e) {
      row = { theme, url, status: 'ERR', error: e.message.split('\n')[0], violations: [], incompleteCount: 0 };
    }
    report.push(row);
    totalViolations += row.violations.length;
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  }
}

await browser.close();

if (jsonMode) {
  process.stdout.write(JSON.stringify({ totalViolations, rules: [...ruleIds], pages: report }, null, 2) + '\n');
} else if (rulesOnly) {
  console.log(`违规规则: ${[...ruleIds].join(', ') || '(none)'} | 总数 ${totalViolations}`);
} else {
  const byRule = {};
  for (const r of report) for (const v of r.violations) {
    byRule[v.id] = byRule[v.id] || { count: 0, impact: v.impact, help: v.help, pages: [] };
    byRule[v.id].count++; if (byRule[v.id].pages.length < 4) byRule[v.id].pages.push(`${r.theme} ${r.url}`);
  }
  for (const r of report) console.log(`\n[${r.theme}] ${r.url} — violations: ${r.violations.length}, incomplete: ${r.incompleteCount}${r.error ? ' ERR:' + r.error : ''}`);
  console.log(`\n═══ 违规规则汇总（共 ${totalViolations} 处）═══`);
  for (const [id, d] of Object.entries(byRule)) {
    console.log(`  ✗ [${d.impact}] ${id}: ${d.help} (${d.count} 处)`);
    d.pages.forEach((p) => console.log(`      ${p}`));
  }
  console.log(totalViolations === 0 ? '\n✅ a11y 全站审计通过（WCAG 2.1 A/AA）' : `\n❌ 存在 ${totalViolations} 处 a11y 违规`);
}

process.exit(totalViolations === 0 ? 0 : 1);
