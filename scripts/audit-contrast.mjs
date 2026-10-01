#!/usr/bin/env node
/**
 * scripts/audit-contrast.mjs — 文字对比度门禁（渲染级直测，补 axe 的 incomplete 盲区）
 * -----------------------------------------------------------------------------
 * 为什么需要它（2026-10-01 实证，见 deliverables/2026-10-01-吧唧制作页视觉审查报告.html）：
 *   axe 的 color-contrast 遇到**毛玻璃 / 线性渐变**背景时**放弃判定**，把结果降级为
 *   `incomplete` 而不计违规。实测某页真实不可读 57 个文本节点，axe 只报出 1 个 violation、
 *   其余 56 个全在 incomplete —— 于是「axe 0 违规」与「肉眼半个界面不可读」可以同时成立。
 *   本脚本用 computed + 像素两级口径补上这块盲区。
 *
 * 两条判据（都要求 ≥4.5:1，除非字号构成 WCAG 大字号则 ≥3:1）：
 *   A. 常规口径：文字色 = getComputedStyle(el).color；背景 = 从 body 向下**逐层叠加**祖先
 *      background-color（source-over）。若在遇到第一个不透明背景之前经过带 background-image
 *      的元素、或该元素落在 `<canvas>` 承载区之上 → **背景不可推定**，归入「不可判定」桶，
 *      **不阻断**（但会计数输出，避免被当成"通过"）。
 *   B. 字形盒口径：对「不可判定」桶里的**控件**，改用元素级截图 + `Range` 取**真实字形包围盒**，
 *      沿字形盒四缘外侧取小块作为文字直接背景，逐块算比值取最差。
 *      ⚠️ 判据必须锚定**字形包围盒**，不能锚定**元素盒角点** —— 文字居中时角点区域没有字形，
 *      角点底色不构成阅读背景。实测同一控件两种口径结论相反：角点 4.27:1(FAIL) vs 字形缘 6.56:1(PASS)。
 *      ⚠️ 也不要在字形盒**内部**采样（内部是笔画区，会把文字色当背景，报 1:1 假 FAIL）。
 *
 * 用法：
 *   node scripts/audit-contrast.mjs           # 人读输出；阻断项 exit 1
 *   node scripts/audit-contrast.mjs --json
 * 前置：npm run build（读 dist/）
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
  console.error('[audit-contrast] dist/ 不存在，请先 `npm run build`');
  process.exit(1);
}

/**
 * 页面清单。`controls` 用于判据 B（需要字形盒口径的控件 / 链接）。
 * ⚠️ 扩展本清单时：先把新页面做到「可信不达标 = 0」再纳入，避免一次性把 CI 变红而无法归因。
 */
const PAGES = [
  {
    url: '/zh/image/badge-maker.html',
    controls: ['.badge-maker-root .btn-primary', '.dock-tabs button.active', '#specGroup .pill.active',
      '#modeSwitch button.active', '.badge-maker-root .btn-ghost:not(:disabled)', '.spec-info', '.badge-live', '.slider-row .value'],
    prepare: 'expandAll',
  },
  { url: '/en/image/badge-maker.html', controls: ['#specGroup .pill.active', '#modeSwitch button.active'], prepare: 'expandAll' },
];

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp' };
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

// ---------- 判据 A：常规口径（可信 / 不可判定 分桶） ----------
const SCAN_TEXT = `() => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  const parse = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    const a = m[1].split(',').map((x) => parseFloat(x.trim())); return { r: a[0], g: a[1], b: a[2], a: a[3] === undefined ? 1 : a[3] }; };
  const out = []; let scanned = 0;
  document.querySelectorAll('body *').forEach((el) => {
    if (!el.checkVisibility || !el.checkVisibility()) return;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 0);
    if (!hasText) return;
    scanned++;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); if (!fg) return;
    // 祖先背景链（含自身），source-over 叠加；遇到 image/gradient 或 canvas 承载区 → 不可推定
    let list = [], n = el, untrusted = false, solidFound = false;
    if (el.closest('.editor-stage, .preview-stage, .drop-overlay')) untrusted = true;
    while (n && n.nodeType === 1) { const c2 = getComputedStyle(n); const bg = c2.backgroundColor;
      const solid = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
      if (!solidFound) { if (c2.backgroundImage && c2.backgroundImage !== 'none' && !solid) untrusted = true; if (solid) solidFound = true; }
      if (solid) list.push(bg); n = n.parentElement; }
    let acc = { r: 255, g: 255, b: 255 };
    for (const s of list.reverse()) { const c = parse(s); if (!c) continue;
      acc = { r: c.r * c.a + acc.r * (1 - c.a), g: c.g * c.a + acc.g * (1 - c.a), b: c.b * c.a + acc.b * (1 - c.a) }; }
    const comp = { r: fg.r * fg.a + acc.r * (1 - fg.a), g: fg.g * fg.a + acc.g * (1 - fg.a), b: fg.b * fg.a + acc.b * (1 - fg.a) };
    const L1 = lum([comp.r, comp.g, comp.b]), L2 = lum([acc.r, acc.g, acc.b]);
    const ratio = Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100;
    const fsPx = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight, 10) || 400;
    const need = (fsPx >= 24 || (fsPx >= 18.66 && fw >= 700)) ? 3 : 4.5;
    if (ratio >= need) return;
    out.push({ cls: (el.getAttribute('class') || '').trim().slice(0, 44), txt: (el.textContent || '').trim().slice(0, 22),
      ratio, need, fs: cs.fontSize, fw: cs.fontWeight, color: cs.color,
      bg: 'rgb(' + Math.round(acc.r) + ',' + Math.round(acc.g) + ',' + Math.round(acc.b) + ')', untrusted });
  });
  return { scanned, bad: out };
}`;

// ---------- 判据 B：字形盒口径（元素级截图 + Range 取字形包围盒）----------
const SCAN_GLYPH = `async ({ b64, textColor, gbox }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c2) => 0.2126 * f(c2[0]) + 0.7152 * f(c2[1]) + 0.0722 * f(c2[2]);
  const m = textColor.match(/rgba?\\(([^)]+)\\)/); const tg = m[1].split(',').map(Number);
  const W = img.width, H = img.height;
  const patch = (x, y, w, h) => {
    const xx = Math.max(0, Math.min(Math.round(x), W - 1)), yy = Math.max(0, Math.min(Math.round(y), H - 1));
    const ww = Math.max(1, Math.min(Math.round(w), W - xx)), hh = Math.max(1, Math.min(Math.round(h), H - yy));
    const d = g.getImageData(xx, yy, ww, hh).data; const hist = new Map();
    for (let k = 0; k < d.length; k += 4) { const key = d[k] + ',' + d[k + 1] + ',' + d[k + 2]; hist.set(key, (hist.get(key) || 0) + 1); }
    let mode = null, n0 = -1; for (const [kk, n] of hist) if (n > n0) { n0 = n; mode = kk; }
    const bg = mode.split(',').map(Number);
    const Lb = lum(bg), Lf = lum(tg);
    return { bg: mode, ratio: Math.round(((Math.max(Lb, Lf) + 0.05) / (Math.min(Lb, Lf) + 0.05)) * 100) / 100 };
  };
  const pad = 3;
  const parts = [patch(gbox.x - pad, gbox.y, pad, gbox.h), patch(gbox.x + gbox.w, gbox.y, pad, gbox.h),
    patch(gbox.x, gbox.y - pad, gbox.w, pad), patch(gbox.x, gbox.y + gbox.h, gbox.w, pad)];
  return { worst: parts.reduce((a, b) => (b.ratio < a.ratio ? b : a), parts[0]) };
}`;

const PORT = Number(process.env.E2E_PORT_CONTRAST || 4322);
const srv = await startServer(PORT);
const channel = process.env.E2E_CHANNEL || 'chromium';
const launchOpts = { headless: true };
if (channel !== 'chromium') launchOpts.channel = channel;
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const shot = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const shotPage = await shot.newPage();
await shotPage.setContent('<html><body></body></html>');

const report = [];
for (const theme of ['light', 'dark']) {
  for (const cfg of PAGES) {
    const row = { theme, url: cfg.url, trusted: [], untrusted: 0, controls: [], err: null, scanned: 0 };
    try {
      await page.goto(`http://127.0.0.1:${PORT}${cfg.url}?theme=${theme}`, { waitUntil: 'load', timeout: 25000 });
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      if (cfg.prepare === 'expandAll') await page.evaluate(() => { document.querySelectorAll('.panel .card[data-cat]').forEach((c) => c.classList.add('is-active')); });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(450);
      const res = await page.evaluate((s) => (0, eval)(s)(), SCAN_TEXT);
      row.scanned = res.scanned;
      row.trusted = res.bad.filter((b) => !b.untrusted);
      row.untrusted = res.bad.filter((b) => b.untrusted).length;
      for (const sel of cfg.controls) {
        const el = await page.$(sel);
        if (!el) { row.controls.push({ sel, missing: true }); continue; }
        await el.scrollIntoViewIfNeeded();
        await page.mouse.move(3, 3);
        await page.waitForTimeout(120);
        const info = await el.evaluate((e) => { const eb = e.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(e); const rb = r.getBoundingClientRect();
          return { textColor: getComputedStyle(e).color, gbox: { x: Math.round(rb.x - eb.x), y: Math.round(rb.y - eb.y), w: Math.round(rb.width), h: Math.round(rb.height) } }; });
        if (info.gbox.w < 2 || info.gbox.h < 2) { row.controls.push({ sel, empty: true }); continue; }
        const buf = await el.screenshot();
        const gr = await shotPage.evaluate((o) => (0, eval)(o.src)(o.payload), { src: SCAN_GLYPH, payload: { b64: buf.toString('base64'), ...info } });
        row.controls.push({ sel, ratio: gr.worst.ratio, bg: gr.worst.bg, textColor: info.textColor });
      }
      await page.evaluate(() => localStorage.clear()).catch(() => {});
    } catch (e) { row.err = String(e.message).split('\n')[0]; }
    report.push(row);
  }
}
await shot.close();
await browser.close();
srv.close();

// ---------- 汇总 ----------
const trustedFails = report.reduce((a, r) => a + r.trusted.length, 0);
const controlFails = report.reduce((a, r) => a + r.controls.filter((c) => c.ratio !== undefined && c.ratio < 4.5).length, 0);
const errs = report.filter((r) => r.err).length;
const blocking = trustedFails + controlFails + errs;

if (jsonMode) {
  process.stdout.write(JSON.stringify({ totals: { trustedFails, controlFails, errs, pages: report.length }, pages: report }, null, 2) + '\n');
} else {
  for (const r of report) {
    const bad = [];
    if (r.err) bad.push(`ERR ${r.err}`);
    if (r.trusted.length) bad.push(`可信不达标 ${r.trusted.length}`);
    if (r.controls.some((c) => c.ratio !== undefined && c.ratio < 4.5)) bad.push('控件字形盒不达标');
    console.log(`[${r.theme}] ${r.url} — ${bad.length ? '✗ ' + bad.join(' / ') : '✓'}（扫描 ${r.scanned} 节点；不可判定 ${r.untrusted}）`);
    r.trusted.forEach((b) => console.log(`    ✗ ${String(b.ratio).padStart(5)}:1 (需 ${b.need}) ${b.fs}/${b.fw} .${b.cls} 「${b.txt}」 ${b.color} on ${b.bg}`));
    r.controls.filter((c) => c.ratio !== undefined && c.ratio < 4.5).forEach((c) => console.log(`    ✗ 控件 ${c.sel} 字形盒最不利 ${c.ratio}:1`));
  }
  console.log(`\n═══ 对比度门禁汇总 ═══`);
  console.log(`  可信不达标: ${trustedFails}`);
  console.log(`  控件字形盒不达标: ${controlFails}`);
  console.log(`  页面错误: ${errs}`);
  console.log(blocking === 0
    ? '\n✅ 对比度门禁通过（可信不达标 0；不可判定项见上，不阻断但需按判据 B 覆盖）'
    : `\n❌ 发现 ${blocking} 处对比度缺陷（阻断）`);
}
process.exit(blocking === 0 ? 0 : 1);
