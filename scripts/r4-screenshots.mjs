#!/usr/bin/env node
/**
 * scripts/r4-screenshots.mjs — R4 真实渲染验证：Edge headless 截图（明暗双主题）
 * -----------------------------------------------------------------
 * 截图存入 snapshots/ 目录（已被 .gitignore 排除）。
 * 用于证明 Phase 1 CSS 改动后图标正常渲染、品牌渐变一致。
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const SNAPS = path.resolve(process.cwd(), 'snapshots');
fs.mkdirSync(SNAPS, { recursive: true });

const PAGES = [
  { url: '/', name: 'home-zh' },
  { url: '/en/', name: 'home-en' },
  { url: '/zh/calculators/mortgage.html', name: 'mortgage-zh' },
  { url: '/zh/calculators/bmi.html', name: 'bmi-zh' },
  { url: '/zh/calculators/percentage-calc.html', name: 'percentage-zh' },
  { url: '/zh/text/word-counter.html', name: 'word-counter-zh' },
  { url: '/zh/image/compress.html', name: 'compress-zh' },
  { url: '/help.html', name: 'help-zh' },
  { url: '/404.html', name: '404' },
];
const THEMES = ['light', 'dark'];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await ctx.newPage();
    await page.addInitScript((t) => localStorage.setItem('theme-preference', t), theme);
    for (const { url, name } of PAGES) {
      await page.goto(`http://127.0.0.1:4399${url}`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await page.locator('#cmp-accept').click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(600);
      const file = path.join(SNAPS, `${name}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`✓ ${file}`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\n✅ ${PAGES.length * THEMES.length} 截图已保存至 snapshots/`);
})();
