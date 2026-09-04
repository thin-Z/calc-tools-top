/**
 * e2e/smoke.spec.mjs - Site-wide structure smoke (T1.5 E5)
 */
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dismissCmp, trackPageErrors } from './helpers.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test.describe('Homepage', () => {
  for (const [url, name] of [['/', 'zh'], ['/en/', 'en']]) {
    test(`homepage ${name} loads without runtime errors`, async ({ page }) => {
      const errors = trackPageErrors(page);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await dismissCmp(page);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForTimeout(600);
      expect(errors, `Page errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }

  test('R4: inline sprite icons render with getBBox > 0', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    await page.waitForTimeout(800);
    const result = await page.evaluate(() => {
      const icons = [...document.querySelectorAll('.tool-card .icon svg')].slice(0, 24);
      let checked = 0, empty = [];
      for (const svg of icons) {
        try {
          const bb = svg.getBBox();
          checked++;
          if (bb.width <= 0 || bb.height <= 0) empty.push(svg.outerHTML.slice(0, 80));
        } catch (e) { empty.push('getBBox threw: ' + String(e).slice(0, 60)); }
      }
      return { checked, empty };
    });
    expect(result.checked, 'Should check at least one icon').toBeGreaterThan(0);
    expect(result.empty, `Empty icons: ${JSON.stringify(result.empty)}`).toEqual([]);
    const symbolCount = await page.locator('body > svg symbol[id^="icon-"], svg symbol[id^="icon-"]').count();
    expect(symbolCount, 'Should have inline <symbol> definitions').toBeGreaterThan(0);
  });

  test('theme toggle: data-theme flips + localStorage persists', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', /light|^$/);
    await page.locator('#theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('theme-preference'))).toBe('dark');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('dark mode body bg is pure black (D7)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme-preference', 'dark'));
    await page.goto('/zh/calculators/mortgage.html', { waitUntil: 'domcontentloaded' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toMatch(/rgba?\(0,\s*0,\s*0/);
  });
});

test.describe('Structure and feature pages', () => {
  const pages = [
    ['/help.html', 'help-zh'],
    ['/en/help.html', 'help-en'],
    ['/fraction-decimal-table.html', 'ref-table-zh'],
    ['/en/fraction-decimal-table.html', 'ref-table-en'],
    ['/about.html', 'about'],
  ];
  for (const [url, name] of pages) {
    test(`${name} (${url}) renders correctly`, async ({ page }) => {
      const errors = trackPageErrors(page);
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${url} status`).toBeLessThan(400);
      await dismissCmp(page);
      await expect(page.locator('main').or(page.locator('h1')).first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('embed.html loads tool iframe with attribution', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/embed.html?tool=mortgage&lang=zh&height=600', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    const frame = page.frameLocator('iframe.embed-frame');
    await expect(frame.locator('h1').first()).toBeVisible();
    await expect(page.locator('.embed-attribution, a[href*="calc-tools"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('404 page renders error code and back button', async ({ page }) => {
    const resp = await page.goto('/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBe(404);
    await expect(page.locator('.error-code')).toContainText('404');
    await expect(page.locator('.btn-primary-404, .error-actions a').first()).toBeVisible();
  });
});

test.describe('PWA', () => {
  test('manifest.json is valid with app name and icons', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name || manifest.short_name).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('sw.js is fetchable and JS', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] || '').toMatch(/javascript/);
  });

  test('Service Worker registers successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const registered = await page.evaluate(async () => {
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) return true;
        await new Promise((r) => setTimeout(r, 300));
      }
      return false;
    }).catch(() => false);
    expect(registered, 'SW should register within 8s').toBe(true);
  });
});

test.describe('Asset integrity', () => {
  test('tools.json matches disk pages (zh/en)', async ({ request }) => {
    const tools = JSON.parse(readFileSync(path.join(ROOT, 'tools.json'), 'utf8'));
    // Derive the expected page count from disk so this assertion never bit-rots
    // when a tool is added/removed (was hard-coded to 49, broke at tool #50).
    let diskPages = 0;
    for (const lang of ['zh', 'en']) {
      for (const t of tools) {
        if (existsSync(path.join(ROOT, lang, t.dir, `${t.slug}.html`))) diskPages++;
      }
    }
    expect(diskPages, 'every tool must have a zh+en page on disk').toBe(tools.length * 2);
    for (const t of tools) {
      for (const lang of ['zh', 'en']) {
        const url = `/${lang}/${t.dir}/${t.slug}.html`;
        const res = await request.get(url);
        expect(res.status(), `${url} should exist`).toBe(200);
      }
    }
  });
});
