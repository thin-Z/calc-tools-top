/**
 * e2e/regression.spec.mjs - Known runtime bug regression guards (T1.5 E5)
 */
import { test, expect } from '@playwright/test';
import { dismissCmp } from './helpers.mjs';

test.describe('R-1 currency NAMES regression (cb3cfc7)', () => {
  for (const lang of ['zh', 'en']) {
    test(`window.NAMES / window.currencies exposed (${lang})`, async ({ page }) => {
      await page.goto(`/${lang}/calculators/currency-converter.html`, { waitUntil: 'domcontentloaded' });
      await dismissCmp(page);
      const api = await page.evaluate(() => ({
        names: typeof window.NAMES,
        namesKeys: window.NAMES ? Object.keys(window.NAMES).length : 0,
        currencies: typeof window.currencies,
      }));
      expect(api.names, 'window.NAMES should be an object').toBe('object');
      expect(api.namesKeys).toBeGreaterThan(0);
      expect(api.currencies, 'window.currencies should be a function').toBe('function');
    });
  }
});

test.describe('R-2 recent-tools toolCardUrl regression (805fce9)', () => {
  test('pre-seeded toolbox_recent renders valid tool links', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('toolbox_recent', JSON.stringify(['bmi', 'mortgage']));
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    const section = page.locator('#recent-tools');
    await expect(section).toBeVisible();
    await expect(section).not.toHaveClass(/hidden/);
    const links = page.locator('#recent-tools-grid a');
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count, 'Should render 2 recent tools').toBe(2);
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href, `Link ${i} href should not be empty`).toBeTruthy();
      expect(href).not.toMatch(/undefined|null/);
      expect(href).toMatch(/^\/zh\/(calculators|image|text)\/[a-z0-9-]+\.html$/);
    }
  });
});

test.describe('R-3 brand consistency regression (D7)', () => {
  test('light mode primary button is blue not purple', async ({ page }) => {
    await page.goto('/zh/calculators/mortgage.html', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    const colors = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).backgroundColor + '|' + getComputedStyle(el).color : '';
      };
      return [pick('.btn-primary'), pick('a.logo')].join(' ; ');
    });
    expect(colors).not.toMatch(/124,\s*58,\s*237/);
  });

  test('dark mode tag-utility uses slate not violet', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme-preference', 'dark'));
    await page.goto('/zh/calculators/unit-converter.html', { waitUntil: 'domcontentloaded' });
    const tagColor = await page.evaluate(() => {
      const tag = document.querySelector('.tag-utility');
      return tag ? getComputedStyle(tag).color : '';
    });
    expect(tagColor).not.toBe('rgb(196, 181, 253)');
  });
});
