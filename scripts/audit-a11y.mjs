#!/usr/bin/env node
/**
 * scripts/audit-a11y.mjs — 全站可访问性审计（WCAG 2.1 A/AA，Phase 4 T4.1）
 * -----------------------------------------------------------------
 * 用 Playwright(msedge channel, 复用系统 Edge) + axe-core 对代表性页面集做
 * 全规则(`wcag2a/2aa/21a/21aa`) axe 扫描，明/暗双主题各跑一遍。
 * violations>0 时退出码 1（可接入 verify-site #22 / CI 阻断）。
 * incomplete（无法判定）仅记录不阻断。
 *
 * 说明：默认 `chromium.launch()` 会找 chromium_headless_shell-*（本机缺失），
 *       务必用 `channel:'msedge'`（复用系统 Edge）或 E2E_CHANNEL=msedge。
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

// 复用系统 Edge（msedge channel），兜底 E2E_CHANNEL
const channel = process.env.E2E_CHANNEL || 'msedge';
const browser = await chromium.launch({ channel, headless: true });
const context = await browser.newContext({ baseURL: `http://127.0.0.1:${PORT}`, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const report = [];
let totalViolations = 0;
const ruleIds = new Set();

for (const theme of THEMES) {
  for (const url of PAGES) {
    let row;
    try {
      await page.addInitScript((t) => localStorage.setItem('theme-preference', t), theme);
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.locator('#cmp-accept').click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.evaluate(AXE_SRC);
      const results = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
          resultTypes: ['violations', 'incomplete'],
        });
        return {
          violations: r.violations.map((v) => ({
            id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target, summary: (n.any[0] && n.any[0].message) || '' })),
          })),
          incompleteCount: r.incomplete.reduce((a, v) => a + v.nodes.length, 0),
        };
      });
      results.violations.forEach((v) => ruleIds.add(v.id));
      row = { theme, url, status: resp?.status(), ...results };
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
