/**
 * e2e/stub-redirect.spec.mjs - 6 个 noindex 存根页跳转断言 (迭代六 / T-10)
 *
 * 存根页(age-calc / discount / password-strength 各 zh/en) 实为 noindex + 0 秒
 * <meta http-equiv="refresh" content="0; url=..."> 跳转存根，分别收敛到：
 *   age-calc          → date-calc
 *   discount           → percentage-calc
 *   password-strength  → password-gen
 * 本 spec 锁定这些跳转目标，防止日后误改 canonical/refresh 指向导致权重分裂。
 */
import { test, expect } from '@playwright/test';

const STUBS = [
  ['/zh/calculators/age-calc.html',          '/zh/calculators/date-calc'],
  ['/en/calculators/age-calc.html',          '/en/calculators/date-calc'],
  ['/zh/calculators/discount.html',          '/zh/calculators/percentage-calc'],
  ['/en/calculators/discount.html',          '/en/calculators/percentage-calc'],
  ['/zh/calculators/password-strength.html', '/zh/calculators/password-gen'],
  ['/en/calculators/password-strength.html', '/en/calculators/password-gen'],
];

test.describe('Stub pages 0-sec meta-refresh redirect (T-10)', () => {
  for (const [from, to] of STUBS) {
    test(`${from} → ${to}`, async ({ page }) => {
      // 不跟随同源 3xx；存根页是客户端 meta refresh，故先加载存根
      const resp = await page.goto(from, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${from} status`).toBe(200);
      // meta refresh 为 0 秒，等待 URL 收敛到规范页
      await expect(page, `${from} should redirect to ${to}`).toHaveURL(to, { timeout: 5000 });
      // 落点规范页应可加载且无 4xx/5xx
      const landed = await page.goto(to, { waitUntil: 'domcontentloaded' });
      expect(landed?.status(), `${to} status`).toBeLessThan(400);
    });
  }
});
