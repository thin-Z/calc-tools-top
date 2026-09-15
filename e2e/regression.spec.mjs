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
      expect(href).toMatch(/^\/zh\/(calculators|image|text)\/[a-z0-9-]+(?:\.html)?$/);
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

test.describe('T-8 check-card :has() fallback (勾选可见性)', () => {
  test('checked .check-box renders primary background (via :has() or sibling fallback)', async ({ page }) => {
    await page.goto('/zh/calculators/password-gen.html', { waitUntil: 'domcontentloaded' });
    await dismissCmp(page);
    const states = await page.evaluate(() => {
      // 固定观察第一个字符集的 check-box，避免动态查询选中其他仍勾选的项
      const input = document.querySelector('.check-card input[type="checkbox"]');
      const cb = input.nextElementSibling; // <span class="check-box">
      cb.style.transition = 'none'; // .check-box 有 0.15s background 过渡，同步读会拿到过渡中间值
      const read = () => getComputedStyle(cb).backgroundColor;
      const checkedBg = read();
      input.checked = false; // 取消勾选，背景必须变化（:has() 与兄弟 fallback 任一生效都应如此）
      const uncheckedBg = read();
      input.checked = true;
      const recheckedBg = read();
      return { checkedBg, uncheckedBg, recheckedBg };
    });
    expect(states.checkedBg, '勾选态应有主色背景').toBeTruthy();
    expect(states.checkedBg, '勾选态背景不应为透明').not.toBe('rgba(0, 0, 0, 0)');
    expect(states.uncheckedBg, '取消勾选后背景必须变化（勾选可见性的行为证据）').not.toBe(states.checkedBg);
    expect(states.recheckedBg, '重新勾选后背景恢复').toBe(states.checkedBg);
  });
});

test.describe('R-4 首页「查看全部」分类筛选回归 (2026-09-15)', () => {
  // 背景：finance/health/life/utility 四区块同属 calculators 目录，「查看全部」曾统一跳
  // /zh/calculators（全量 32 个），点了「财务计算」却看到健康/实用等其它分类。
  // 修法：首页链接带 ?cat=<区块>，calculators 页按该区块的 tag 集合筛选（非单 tag）。
  const CASES = [
    { cat: 'finance', zh: '财务计算', allow: ['finance', 'shopping'], expectCount: 13 },
    { cat: 'health', zh: '健康计算', allow: ['health'], expectCount: 5 },
    // life 区块 = life + travel 两个 tag（首页实为 7 个），只按 life 单 tag 筛会漏 2 个
    { cat: 'life', zh: '生活 · 出行', allow: ['life', 'travel'], expectCount: 7 },
    { cat: 'utility', zh: '实用工具', allow: ['utility'], expectCount: 7 },
  ];

  // dir 归位回归（2026-09-16）：color-contrast/regex-tester/markdown-preview/simplified-traditional
  // 曾目录属 calculators、标签属 image/text，造成「图片工具筛选只剩 1 个」的困惑与筛选死角。
  // 归位后：/zh|en/image = 8（与首页图片工具区块一致）、/zh|en/text = 15（与文字工具区块一致），
  // calculators 页 28 个工具全部属于四个子区块，不再出现 image/text chip。
  for (const lang of ['zh', 'en']) {
    test('[' + lang + '] 图片/文字工具目录归位：栏目页数量与首页区块一致', async ({ page }) => {
      // 本用例含 3 次页面导航，8 并行 + 全量套件时易触 45s 默认超时（09-16 CI 抖动实测），标记 slow
      test.slow();
      await page.goto('/' + lang + '/image/', { waitUntil: 'load' });
      await dismissCmp(page);
      await expect(page.locator('.tool-grid .tool-card-wrap')).toHaveCount(8);
      await expect(page.locator('.tool-grid .tool-card[href*="/color-contrast"]')).toHaveCount(1);

      await page.goto('/' + lang + '/text/', { waitUntil: 'load' });
      await dismissCmp(page);
      await expect(page.locator('.tool-grid .tool-card-wrap')).toHaveCount(15);

      await page.goto('/' + lang + '/calculators/', { waitUntil: 'load' });
      await dismissCmp(page);
      await expect(page.locator('.tool-grid .tool-card-wrap')).toHaveCount(28);
      const strayChips = await page.$$eval('.category-chip', (els) =>
        els.filter((c) => ['image', 'text'].indexOf(c.getAttribute('data-cat-key')) !== -1).length);
      expect(strayChips, 'calculators 页不应再出现图片/文字筛选 chip').toBe(0);
    });
  }

  // 死角回归：本页每个工具都至少能被一个子分类 chip 筛出来（不得只有「全部」可见）
  for (const lang of ['zh', 'en']) {
    test('[' + lang + '] calculators 页无筛选死角：每个工具都归属某个子分类 chip', async ({ page }) => {
      await page.goto('/' + lang + '/calculators', { waitUntil: 'load' });
      await dismissCmp(page);
      const orphans = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('.category-chip'))
          .filter((c) => c.getAttribute('data-cat-key') !== 'all');
        const sets = chips.map((c) => (c.getAttribute('data-category') || '').split(','));
        return Array.from(document.querySelectorAll('.tool-grid .tool-card'))
          .map((card) => ({
            slug: (card.getAttribute('href') || '').split('/').pop(),
            cats: (card.getAttribute('data-category') || '').split(','),
          }))
          .filter((t) => !sets.some((s) => t.cats.some((c) => s.indexOf(c) !== -1)))
          .map((t) => t.slug + '(' + t.cats.join('/') + ')');
      });
      expect(orphans, '这些工具在任何子分类下都不可见（筛选死角）').toEqual([]);
    });
  }

  for (const lang of ['zh', 'en']) {
    for (const c of CASES) {
      test('[' + lang + '] ?cat=' + c.cat + ' 只展示该分类工具（' + c.expectCount + ' 个）', async ({ page }) => {
        await page.goto('/' + lang + '/calculators?cat=' + c.cat, { waitUntil: 'load' });
        await dismissCmp(page);

        const visible = page.locator('.tool-grid .tool-card-wrap:not(.filtered-out)');
        await expect(visible).toHaveCount(c.expectCount);

        // 可见卡片必须全部属于该分类的 tag 集合，不得混入其它分类（health/utility/image/text 等）
        const foreign = await page.evaluate((allow) => {
          return Array.from(document.querySelectorAll('.tool-grid .tool-card-wrap:not(.filtered-out)'))
            .map((w) => {
              const card = w.querySelector('.tool-card');
              return card ? card.getAttribute('data-category') || '' : '';
            })
            .filter((cats) => !cats.split(',').some((x) => allow.indexOf(x) !== -1));
        }, c.allow);
        expect(foreign, '不得出现非「' + c.zh + '」分类的工具').toEqual([]);

        // 分类 chip 唯一高亮 + 计数文案与数量同步
        await expect(page.locator('.category-chip.active')).toHaveCount(1);
        await expect(page.locator('.tool-count')).toContainText(String(c.expectCount));
      });
    }

    test('[' + lang + '] 首页「财务计算 · 查看全部」链接携带 ?cat=finance', async ({ page }) => {
      await page.goto(lang === 'zh' ? '/' : '/en/', { waitUntil: 'load' });
      await dismissCmp(page);
      const href = await page.getAttribute('#sec-finance .section-more', 'href');
      expect(href).toBe((lang === 'zh' ? '/zh' : '/en') + '/calculators?cat=finance');
    });

    test('[' + lang + '] 无 cat 参数 / 非法 cat 回落为全量', async ({ page }) => {
      await page.goto('/' + lang + '/calculators', { waitUntil: 'load' });
      await dismissCmp(page);
      const all = await page.locator('.tool-grid .tool-card-wrap:not(.filtered-out)').count();
      expect(all, '无参数应展示全量').toBeGreaterThan(13);

      await page.goto('/' + lang + '/calculators?cat=__invalid__', { waitUntil: 'load' });
      await dismissCmp(page);
      expect(await page.locator('.tool-grid .tool-card-wrap:not(.filtered-out)').count()).toBe(all);
    });
  }
});
