/**
 * e2e/tools.spec.mjs - 49-tool full interaction suite (T1.5 E5, D4)
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dismissCmp, trackPageErrors } from './helpers.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = JSON.parse(readFileSync(path.join(ROOT, 'tools.json'), 'utf8'));

test.describe('49 tools x zh/en load smoke', () => {
  for (const t of TOOLS) {
    for (const lang of ['zh', 'en']) {
      test(`[${t.slug}/${lang}] loads + controls present + no errors`, async ({ page }) => {
        const errors = trackPageErrors(page);
        const url = `/${lang}/${t.dir}/${t.slug}.html`;
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
        expect(resp?.status(), `${url} status`).toBe(200);
        await page.waitForSelector('#main, main', { timeout: 5000 }).catch(() => {});
        await dismissCmp(page);
        await page.waitForTimeout(400);
        const title = await page.title();
        expect(title.trim().length, `${url} title should not be empty`).toBeGreaterThan(0);
        await expect(page.locator('#main, main').first()).toBeVisible();
        const controlCount = await page.locator(
          '.tool-form input, .calculator-form input, .tool-form select, .calculator-form select, .tool-form textarea, .calculator-form textarea, .upload-zone, .btn-primary'
        ).count();
        // 允许「已合并/废弃、无表单控件」的跳转页（如 password-strength 已并入 password-gen、
        // keyword-density 已并入 word-counter）：无控件但 <main> 内有「<p><a>跳到其它工具」说明 → 视为合并/重定向页。
        const isMergeRedirect = controlCount === 0 && await page.locator(
          'main p:has(> a)'
        ).count() > 0;
        expect(controlCount > 0 || isMergeRedirect, `${url} should have interactive controls (or be a merged/redirected tool page)`).toBe(true);
        await page.waitForTimeout(350);
        expect(errors, `${url} errors:\n${errors.join('\n')}`).toEqual([]);
      });
    }
  }
});

test.describe('Representative tool deep interactions', () => {
  test('bmi: fill height+weight -> calculate -> result visible', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/zh/calculators/bmi.html', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    await page.locator('#height').fill('175');
    await page.locator('#weight').fill('68');
    await page.locator('button[data-csp-click="doCalculate"]').first().click();
    await expect(page.locator('.result-card').first()).toBeVisible();
    await expect(page.locator('.result-value, .result-card').first()).toContainText(/\d/);
    expect(errors).toEqual([]);
  });

  test('timestamp: unix timestamp to datetime conversion', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/zh/calculators/timestamp.html', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    await page.locator('#ts-value').fill('1600000000');
    // ts→dt 的输出在结果区 #ts-local（#dt-value 是反向 dt→ts 的输入框）
    await expect(page.locator('#ts-local')).toContainText(/2020-09/, { timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test('currency-converter: currency dropdowns populate', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/zh/calculators/currency-converter.html', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    await expect.poll(async () => page.locator('#fx-from option').count(), { timeout: 8000 }).toBeGreaterThan(3);
    await expect.poll(async () => page.locator('#fx-to option').count(), { timeout: 8000 }).toBeGreaterThan(3);
    expect(errors).toEqual([]);
  });

  test('percentage-calc: mode switch renders input controls', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/zh/calculators/percentage-calc.html', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    await page.locator('#percentMode').selectOption('percentOf');
    await page.waitForTimeout(300);
    const inputs = await page.locator('.tool-form input, .calculator-form input').count();
    expect(inputs).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});
