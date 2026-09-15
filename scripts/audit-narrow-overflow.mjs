#!/usr/bin/env node
/**
 * scripts/audit-narrow-overflow.mjs — 窄屏横向溢出 / 卡片结构缺陷 全站审计
 * ============================================================
 * 背景（2026-09-15）：
 *   站点 CSS 存在一类共性缺陷——「长无空格文本串」（英文标题、连续数字、
 *   含 "/" 的长串如 Length/weight/temperature）在 CSS 默认断行规则下不可断行，
 *   窄屏会撑破容器并产生**文档级横向滚动条**；另有栏目索引页因缺少
 *   `.tool-card-wrap` 包裹层而退化为无卡片外观的裸链接。
 *   这类问题在桌面视口完全不可见，只在 ≤390px 暴露（违反 R19 多视口验证铁律）。
 *
 * 本脚本在 390px 视口下遍历 dist/ 全部页面，报告：
 *   ① 文档横向溢出（scrollWidth > innerWidth，含溢出像素数）
 *   ② 卡片结构缺陷（裸 a.tool-card 缺父级 .tool-card-wrap / 空 .icon 无 SVG）
 *
 * 用法：
 *   npm run build && node scripts/audit-narrow-overflow.mjs
 *   node scripts/audit-narrow-overflow.mjs --strict   # 有任何问题即 exit 1
 *
 * 说明：默认报告模式（exit 0），供人工核查；不接入 verify 门禁，
 *       以避免已知历史遗留页阻塞主干（当前已知遗留见交付报告）。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.SCAN_PORT || 4188);
const BASE = `http://127.0.0.1:${PORT}`;
const STRICT = process.argv.includes('--strict');
const VIEW = { width: 390, height: 844 };

if (!fs.existsSync(DIST)) {
  console.error('[narrow-overflow] 未找到 dist/，请先执行 `npm run build`');
  process.exit(2);
}

const walk = (d, out = []) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
};
const urlOf = (abs) => {
  let rel = path.relative(DIST, abs).split(path.sep).join('/');
  if (rel.endsWith('index.html')) rel = rel.slice(0, -'index.html'.length);
  return '/' + rel;
};

const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'e2e-server.mjs')], {
  env: { ...process.env, E2E_PORT: String(PORT) },
  stdio: 'ignore',
});
const waitReady = async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok || res.status === 404) return true;
    } catch { /* 尚未启动 */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

let exitCode = 0;
try {
  if (!(await waitReady())) throw new Error('本地静态服务启动失败');

  const files = walk(DIST).sort();
  console.log(`[narrow-overflow] 扫描 ${files.length} 个页面 @ ${VIEW.width}px`);

  const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'msedge' });
  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();

  const overflow = [];
  const defects = [];
  let n = 0;

  for (const abs of files) {
    const url = urlOf(abs);
    try {
      await page.goto(BASE + url, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        const iw = window.innerWidth;
        const sw = document.documentElement.scrollWidth;
        const bare = [...document.querySelectorAll('a.tool-card')].filter((a) => {
          const p = a.parentElement;
          return !p || !/tool-card-wrap|hot-tool-card/.test(p.className || '');
        }).length;
        const emptyIcon = document.querySelectorAll('.tool-grid .icon:empty').length;
        return { iw, sw, bare, emptyIcon };
      });
      if (r.sw > r.iw + 1) overflow.push({ url, over: r.sw - r.iw, sw: r.sw });
      if (r.bare > 0) defects.push({ url, kind: `裸 .tool-card ×${r.bare}（缺 .tool-card-wrap）` });
      if (r.emptyIcon > 0) defects.push({ url, kind: `空 .icon ×${r.emptyIcon}（无 SVG 图标）` });
    } catch (e) {
      defects.push({ url, kind: 'ERROR: ' + e.message.slice(0, 60) });
    }
    if (++n % 50 === 0) console.log(`  ...${n}/${files.length}`);
  }
  await browser.close();

  console.log('\n========== 审计结果 ==========');
  console.log(`① 390px 横向溢出: ${overflow.length} 页`);
  overflow.sort((a, b) => b.over - a.over).forEach((o) => console.log(`   ${o.url}  溢出 ${o.over}px`));
  console.log(`② 卡片结构缺陷: ${defects.length} 页`);
  defects.forEach((d) => console.log(`   ${d.url}  ${d.kind}`));

  if (overflow.length || defects.length) {
    console.log('\n提示：横向溢出多为「长无空格串不可断行」所致，修法见 css/style.css 内');
    console.log('      「窄屏长文本防溢出」规则块（overflow-wrap: anywhere）。');
    if (STRICT) exitCode = 1;
  } else {
    console.log('\n✅ 无非预期横向溢出，无卡片结构缺陷');
  }
} catch (e) {
  console.error('[narrow-overflow] 失败:', e.message);
  exitCode = 2;
} finally {
  server.kill();
}
process.exit(exitCode);
