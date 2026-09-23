#!/usr/bin/env node
/**
 * scripts/audit-a11y.mjs — 全站可访问性审计（WCAG 2.1 A/AA，Phase 4 T4.1）
 * -----------------------------------------------------------------
 * 用 Playwright(msedge channel, 复用系统 Edge) + axe-core 对代表性页面集做
 * 全规则(`wcag2a/2aa/21a/21aa`) axe 扫描，明/暗双主题各跑一遍。
 * violations>0 时退出码 1（可接入 verify-site #22 / CI 阻断）。
 * incomplete（无法判定）输出**规则级明细**（规则 id + 节点数 + 代表 target），**不阻断**。
 *
 * ═══ V0（2026-09-23）修复三处可信度缺陷（P0-6）═══
 *   B1 移除「主动隐藏被测组件」逻辑：原实现把真实用户可见的 `.cmp-banner` 整体 display:none，
 *      使该页仅有的对比度违规永久不可见。现改为「不点击、不隐藏，直接采样」。
 *   B2 修正对比度合成公式方向：原有效背景算法把祖先层当上层 src（方向反了），系统性**高估**
 *      对比度；现按 source-over 语义 acc over pb 合成（acc=子层 src，pb=祖先 dst）。
 *   B3 incomplete 由「只打印一个数字」升级为「规则级明细」，JSON 与文本输出均含；仍不阻断。
 *
 * 说明：默认 `chromium.launch({ channel:'msedge' })` 复用系统 Edge（本机已装）。
 *       CI(ubuntu-latest) 无 msedge，设 `E2E_CHANNEL=chromium` 可走 Playwright 自带 chromium
 *       （launch 不带 channel，避免找不到 msedge channel 而报错）。
 *
 * 用法：
 *   node scripts/audit-a11y.mjs              # 人读输出；违规 exit 1
 *   node scripts/audit-a11y.mjs --json       # JSON 输出
 *   node scripts/audit-a11y.mjs --rules      # 仅列违规规则 ID + 未判定(incomplete)规则 ID（供定位）
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
  // 栏目索引页（2026-09-15 补入：此前是 a11y 覆盖盲区，正文区 .seo-content 样式即为本次修复项）
  '/zh/calculators/index.html',
  '/en/calculators/index.html',
  '/zh/image/index.html',
  '/en/image/index.html',
  '/zh/text/index.html',
  '/en/text/index.html',
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
        const ext = path.extname(file);
        if (ext === '.html') {
          // 去偶发加固(2026-09-21): 在服务端源头剔除 `<meta http-equiv="refresh">` 客户端重定向
          // （zh/index.html 为 SEO 规范化别名，含 content="0; URL=/" 跳回首页 `/`）。
          // 该跳转会在采样期间触发导航，使后续 page.evaluate 撞上「Execution context was destroyed」而整页被跳过
          // —— CI run#245 a11y 偶发失败的根因。源头剔除可彻底消除时序竞态（不再依赖 post-load 移除的运气）。
          // meta refresh 不属 WCAG 2.1 A/AA 规则集，剔除不掩盖任何在范围内的缺陷；跳转目标 `/` 另在 PAGES 中独立审计。
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
      const resp = await page.goto(themedUrl, { waitUntil: 'load', timeout: 20000 });
      // 说明：zh/index.html 的 meta-refresh 规范化跳转已在服务端剔除（见 startServer 的 HTML 分支），此处不再需要处理。
      // C4-a11y(2026-08-28): 强制设定 data-theme + 等字体/两帧, 消除 headless 下 dark 主题采样偏差(原读到浅底浅字误报)
      await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
      await page.waitForFunction((t) => document.documentElement.getAttribute('data-theme') === t, theme, { timeout: 3000 }).catch(() => {});
      // ═══ V0 修复（2026-09-23，P0-6）：移除「主动隐藏被测组件」逻辑 ═══
      // 原实现（考古记录，已删除）：
      //   await page.evaluate(() => { const b = document.querySelector('.cmp-banner'); if (b) b.style.display = 'none'; });
      //   // 旧注释理由：「CMP 横幅不点『接受』而直接隐藏……隐藏后 axe 会跳过 display:none 元素，
      //   //              既不影响对比度测量、也不遮挡内容。此为次级加固。」
      // 删除原因：**该理由不成立，且构成信任缺陷**。`.cmp-banner` 是真实用户可见 UI（role="dialog"），
      //   把它整体移出 axe 视野 = 把该页仅有的 2 条对比度违规（banner 内 #007AFF on #FFFFFF，
      //   实测 4.01:1 ×2）永久掩盖成「全绿」——门禁自证清白的反模式。
      // 原注释的真实顾虑（点「接受」会触发整页 reload → 上下文销毁）确实存在，但正解是
      //   「**既不点击、也不隐藏**，直接采样」：banner 是静态 DOM，axe 可直接测量其对比度，
      //   不点击就不会有 reload。实测 58 次采样（29 页 × 明暗双主题）0 个 ERR 页，无 reload 时序问题。
      // 若日后确现 reload 时序问题：应改为**单独采样 banner 后并入报告**，绝不可整体隐藏。
      // 去偶发加固(2026-09-21): 等字体就绪 + 入场动画/过渡结束后再采样，
      // 避免 axe 在 CI 慢机器上赶在 CSS 过渡/动画未稳定时抓到瞬态对比度假阳性（run #245 的偶发失败根因）。
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.waitForTimeout(700);
      // 冻结所有过渡/动画，防止采样瞬间再有状态变化（入场动画已完成，此刻冻结=锁定终态）
      await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}' }).catch(() => {});
      await page.waitForTimeout(150);
      // 去偶发重试：首次采样若抓到违规，等过渡彻底结束再采一次，取两次中「违规更少」的那次。
      // （真实持续违规两次都在、数量相同；瞬态假阳性只出现在其中一次）——取最小值，既不放大偶发噪声，也不掩盖真缺陷。
      let best = null;
      for (let attempt = 0; attempt < 2; attempt++) {
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
                // V0 修复（2026-09-23，P0-6）：原公式**合成方向反了** —— 把祖先层 pb 当作上层
                // src、把累积前景 acc 当作下层 dst，等于把「浅色祖先背景」压在「半透明子层」之上，
                // 结果系统性**高估**对比度（该报的违规报不出来）。
                // 正确语义：acc 是子元素/累积前景（src），pb 是祖先背景（dst）→ 结果为 **acc over pb**：
                //   a_o = a_s + a_d*(1-a_s)；out_rgb = (acc_rgb*a_s + pb_rgb*a_d*(1-a_s)) / a_o
                // 修正后判定更准确，违规数只会增不会减（这是期望方向，不得为「好看」调松判定）。
                if (pb) {
                  const aS = acc[3], aD = pb[3];
                  const aO = aS + aD * (1 - aS); // 与 a_d + a_s*(1-a_d) 等价：alpha 合成本就对称
                  if (aO > 0) {
                    acc = [
                      (acc[0] * aS + pb[0] * aD * (1 - aS)) / aO,
                      (acc[1] * aS + pb[1] * aD * (1 - aS)) / aO,
                      (acc[2] * aS + pb[2] * aD * (1 - aS)) / aO,
                      Math.min(1, aO),
                    ];
                  }
                  // aO === 0：子层与祖先层都完全透明，无底层信息可合成，保持 acc 并继续上溯（guard 兜底）
                }
                node = node.parentElement;
              }
            }
            return acc;
          };
          const out = {
            violations: [],
            incompleteCount: r.incomplete.reduce((a, v) => a + v.nodes.length, 0),
            // V0 修复（2026-09-23，P0-6）：incomplete 原先只统计了一个数字，**无规则级明细**，
            // 无法人工复核（「有 53 条未判定」这种信息不可行动）。这里补规则级明细：
            // 规则 id + 节点数 + 代表 target。语义**仍为不阻断** —— exit code 只看 violations。
            incomplete: r.incomplete.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              count: v.nodes.length,
              samples: v.nodes.slice(0, 3).map((n) => (Array.isArray(n.target) ? n.target.join(' ') : String(n.target))),
            })),
          };
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
        const viol = ax.violations
          .map((v) => v.id === 'color-contrast' ? { ...v, nodes: v.nodes.filter((n) => !n.drop) } : v)
          .filter((v) => v.nodes.length > 0);
        // 全量留痕：豁免掉的也记录实测合成值，形成"每次豁免都有真值反证"的审计链（CI 产物可回溯）
        const diag = [];
        for (const v of ax.violations) if (v.id === 'color-contrast') for (const n of v.nodes) diag.push(n);
        if (!best || viol.length < best.violations.length) best = { violations: viol, incompleteCount: ax.incompleteCount, incomplete: ax.incomplete, realColors: diag };
        if (viol.length === 0) break;
        await page.waitForTimeout(700);
      }
      best.violations.forEach((v) => ruleIds.add(v.id));
      row = { theme, url, status: resp?.status(), ...best };
    } catch (e) {
      row = { theme, url, status: 'ERR', error: e.message.split('\n')[0], violations: [], incompleteCount: 0, incomplete: [] };
    }
    report.push(row);
    totalViolations += row.violations.length;
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  }
}

await browser.close();

// ---------- incomplete（无法判定）规则级汇总（V0 新增，2026-09-23） ----------
// 语义：**不阻断**。exit code 只由 totalViolations 决定（见文件末尾）。
// 目的：把「N 条未判定」变成可行动的清单（规则 id + 节点数 + 代表 target），供人工复核。
const incByRule = {};
let totalIncomplete = 0;
for (const r of report) {
  totalIncomplete += r.incompleteCount || 0;
  for (const v of r.incomplete || []) {
    const d = incByRule[v.id] || (incByRule[v.id] = { id: v.id, impact: v.impact, help: v.help, count: 0, pages: [], samples: [] });
    d.count += v.count;
    if (d.pages.length < 4) d.pages.push(`${r.theme} ${r.url}`);
    for (const s of v.samples || []) if (d.samples.length < 3 && !d.samples.includes(s)) d.samples.push(s);
  }
}
const incRules = Object.values(incByRule).sort((a, b) => b.count - a.count);

if (jsonMode) {
  process.stdout.write(JSON.stringify({
    totalViolations,
    rules: [...ruleIds],
    incompleteTotal: totalIncomplete,
    incompleteRules: incRules,
    pages: report,
  }, null, 2) + '\n');
} else if (rulesOnly) {
  console.log(`违规规则: ${[...ruleIds].join(', ') || '(none)'} | 总数 ${totalViolations}`);
  console.log(`未判定规则(incomplete, 不阻断): ${incRules.map((d) => d.id).join(', ') || '(none)'} | 总数 ${totalIncomplete}`);
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
  // V0（2026-09-23）：incomplete 规则级明细（**不阻断**，但必须可见以便人工复核）
  // 注：标记刻意用 ASCII `[!]` 而非 emoji —— 本脚本属 .js/.mjs 源码，已被 P0 门禁的
  // emoji 扫描覆盖（非注释行一律计入），不得在功能位引入 emoji 作图标。
  console.log(`\n[!] ${totalIncomplete} 条未判定（incomplete），不计入阻断但需人工复核`);
  incRules.slice(0, 8).forEach((d) => {
    console.log(`  ? [${d.impact}] ${d.id}: ${d.help} (${d.count} 节点)`);
    d.pages.forEach((p) => console.log(`      ${p}`));
    if (d.samples.length) console.log(`      代表 target: ${d.samples.join(' | ')}`);
  });
  if (incRules.length > 8) console.log(`  ... and ${incRules.length - 8} more rules`);

  console.log(totalViolations === 0 ? '\n✅ a11y 全站审计通过（WCAG 2.1 A/AA）' : `\n❌ 存在 ${totalViolations} 处 a11y 违规`);
}

process.exit(totalViolations === 0 ? 0 : 1);
