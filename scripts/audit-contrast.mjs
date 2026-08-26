#!/usr/bin/env node
/**
 * scripts/audit-contrast.mjs — 暗色/亮色对比度审计（T1.4，WCAG 2.1 AA）
 * -----------------------------------------------------------------
 * 用 Playwright + axe-core 对代表页面集做 color-contrast 规则扫描，
 * 明/暗双主题各跑一遍。violations>0 时退出码 1（可接入 CI 阻断）。
 * incomplete（无法判定，如渐变文字/玻璃拟态背景）仅记录不阻断。
 *
 * 用法：
 *   node scripts/audit-contrast.mjs           # 人读输出；违规 exit 1
 *   node scripts/audit-contrast.mjs --json    # JSON 输出
 *   E2E_CHANNEL=msedge 可切换浏览器（默认 chromium / 系统 Edge）
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

// 代表页面集：覆盖首页 / 工具页(计算器·文本·图片) / 帮助 / 404 / 标签聚合 / 博客文章
const PAGES = [
  '/',
  '/zh/calculators/mortgage.html',
  '/zh/calculators/bmi.html',
  '/zh/text/word-counter.html',
  '/zh/image/compress.html',
  '/help.html',
  '/404.html',
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
const PORT = Number(process.env.E2E_PORT || 4317);
await startServer(PORT);

const channel = process.env.E2E_CHANNEL || undefined;
const browser = await chromium.launch(channel ? { channel } : {});
const context = await browser.newContext({ baseURL: `http://127.0.0.1:${PORT}`, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const report = [];
let totalViolations = 0;

for (const theme of THEMES) {
  for (const url of PAGES) {
    await page.addInitScript((t) => localStorage.setItem('theme-preference', t), theme);
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // 关 CMP 横幅，避免遮盖内容影响对比度采样
    await page.locator('#cmp-accept').click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.evaluate(AXE_SRC);
    const results = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: { type: 'rule', values: ['color-contrast'] },
        resultTypes: ['violations', 'incomplete'],
      });
      return {
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 6).map((n) => ({
            target: n.target,
            summary: (n.any[0] && n.any[0].message) || '',
          })),
        })),
        incompleteCount: r.incomplete.reduce((a, v) => a + v.nodes.length, 0),
      };
    });
    report.push({ theme, url, status: resp?.status(), ...results });
    totalViolations += results.violations.length;
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  }
}

await browser.close();

if (jsonMode) {
  process.stdout.write(JSON.stringify({ totalViolations, pages: report }, null, 2) + '\n');
} else {
  for (const r of report) {
    console.log(`\n[${r.theme}] ${r.url} — violations: ${r.violations.length}, incomplete: ${r.incompleteCount}`);
    for (const v of r.violations) {
      console.log(`  ✗ [${v.impact}] ${v.help}`);
      for (const n of v.nodes) console.log(`      ${JSON.stringify(n.target)} — ${n.summary.slice(0, 140)}`);
    }
  }
  console.log(`\n═══ 总计 violations: ${totalViolations} ═══`);
  console.log(totalViolations === 0 ? '✅ 对比度审计通过（AA）' : '❌ 存在 AA 对比度违规');
}

process.exit(totalViolations === 0 ? 0 : 1);
