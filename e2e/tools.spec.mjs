/**
 * e2e/tools.spec.mjs - 50-tool full interaction suite (T1.5 E5, D4)
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dismissCmp, trackPageErrors } from './helpers.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = JSON.parse(readFileSync(path.join(ROOT, 'tools.json'), 'utf8'));

test.describe('50 tools x zh/en load smoke', () => {
  for (const t of TOOLS) {
    for (const lang of ['zh', 'en']) {
      test(`[${t.slug}/${lang}] loads + controls present + no errors`, async ({ page }) => {
        const errors = trackPageErrors(page);
        const url = `/${lang}/${t.dir}/${t.slug}.html`;
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
        expect(resp?.status(), `${url} status`).toBe(200);
        // 已合并/重定向的 stub 页（如 discount→percentage-calc、age-calc→date-calc、
        // password-strength→password-gen、keyword-density→word-counter）会带 <meta http-equiv="refresh">
        // 自动跳到合并目标——属废弃跳转页，无需校验控件/错误（其重定向过程在 chromium 还会抛隐性 "Y"）。
        const respHtml = resp ? await resp.text().catch(() => '') : '';
        if (/http-equiv\s*=\s*["']refresh["']/i.test(respHtml)) return;
        await page.waitForSelector('#main, main', { timeout: 5000 }).catch(() => {});
        await dismissCmp(page);
        await page.waitForTimeout(400);
        const title = await page.title();
        expect(title.trim().length, `${url} title should not be empty`).toBeGreaterThan(0);
        await expect(page.locator('#main, main').first()).toBeVisible();
        const controlCount = await page.locator(
          '.tool-form input, .calculator-form input, .tool-form select, .calculator-form select, .tool-form textarea, .calculator-form textarea, .upload-zone, .btn-primary'
        ).count();
        expect(controlCount, `${url} should have interactive controls`).toBeGreaterThan(0);
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

  test('currency-converter: dropdowns populate + live render + swap + reset (主模板回归)', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/zh/calculators/currency-converter.html', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    // 下拉框填充（fillSelect）
    await expect.poll(async () => page.locator('#fx-from option').count(), { timeout: 8000 }).toBeGreaterThan(3);
    await expect.poll(async () => page.locator('#fx-to option').count(), { timeout: 8000 }).toBeGreaterThan(3);
    // 主模板结构：page-header / tool-form / result-card（视觉一致性回归）
    await expect(page.locator('.page-header h1')).toBeVisible();
    await expect(page.locator('.tool-form')).toBeVisible();
    // 默认 100 USD→CNY 实时渲染
    const resultCard = page.locator('#result-area');
    await expect(resultCard).toBeVisible();
    await expect(page.locator('#fx-result')).toContainText(/CNY/);
    await expect(page.locator('#fx-rate')).toContainText(/1 USD/);
    // 交换货币（data-csp-click 委托 → swapCurrencies）
    await page.locator('button[data-csp-click="swapCurrencies"]').first().click();
    await expect(page.locator('#fx-from')).toHaveValue('CNY');
    await expect(page.locator('#fx-to')).toHaveValue('USD');
    await expect(resultCard).toBeVisible();
    await expect(page.locator('#fx-result')).toContainText(/USD/);
    // 重置（data-csp-click 委托 → resetCurrency）：结果区隐藏
    await page.locator('button[data-csp-click="resetCurrency"]').first().click();
    await expect(resultCard).toBeHidden();
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
