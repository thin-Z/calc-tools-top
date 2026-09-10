/**
 * e2e/stub-redirect.spec.mjs - 6 个 noindex 存根页跳转断言 (迭代六 / T-10)
 *
 * 存根页(age-calc / discount / password-strength 各 zh/en) 实为 noindex + 0 秒
 * <meta http-equiv="refresh" content="0; url=..."> 跳转存根，分别收敛到：
 *   age-calc          → date-calc
 *   discount           → percentage-calc
 *   password-strength  → password-gen
 * 本 spec 锁定这些跳转目标，防止日后误改 canonical/refresh 指向导致权重分裂。
 *
 * ── 防抖根因（batch-0 #4）────────────────────────────────────────────
 * 存根页 <head> 中，渲染阻塞的外部 Google Fonts 样式表（fonts.googleapis.com）
 * 位于同步脚本 /js/theme-init.js 之前。按 HTML 解析规则，同步脚本须等其“前面挂起的
 * 样式表”加载完才能执行；而 theme-init.js 不执行就阻塞解析器前进到 <meta refresh>，
 * 于是 meta 刷新要等字体 CSS 到达后才触发。并行(workers≥2)下该外部请求被争抢、偶发
 * 慢于 5s 断言窗 → 间歇失败，被 CI 的 retries:1 掩盖。
 * 修复：在跳转断言前拦截并即时 fulfill 字体请求（空 CSS），消除这个外部网络耦合，
 * 解析器即可确定性地立刻到达 <meta refresh>；同时去掉尾部冗余的 page.goto(to)
 * （会打断在途的 meta 刷新导航、且 toHaveURL 命中即已证明规范页 200 加载成功）。
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

// 根因（batch-0 #4，并行下复现）：存根页 <head> 中同步脚本 /js/theme-init.js 是唯一的解析阻塞点，
// 位于 <meta http-equiv="refresh">（line 57）之前。并行(workers≥2)下 6 个存根页 × ~20 个外部请求
// （adsbygoogle / gtag / Google Fonts 等）争抢浏览器网络线程，导致本地同步 theme-init.js 被本地
// 服务器在并行负载下饿死 → 解析器迟迟到不了 line 57 → refresh 从未注册 → toHaveURL 超时。
// 修复：对所有非本地（127.0.0.1）请求即时 abort，彻底消除外部网络争用，使唯一阻塞点 theme-init.js
// 在并行下也能瞬时加载，<meta refresh> 确定性触发。
const isLocal = (url) =>
  url.includes('127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:');

test.describe('Stub pages 0-sec meta-refresh redirect (T-10)', () => {
  for (const [from, to] of STUBS) {
    test(`${from} → ${to}`, async ({ page }) => {
      // 拦截所有外部请求并即时中断，解除对 theme-init.js → <meta refresh> 的解析阻塞（并行稳定性根因修复）。
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (isLocal(url)) return route.continue();
        return route.abort();
      });

      // 不跟随同源 3xx；存根页是客户端 meta refresh，故先加载存根
      const resp = await page.goto(from, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${from} status`).toBe(200);

      // meta refresh 为 0 秒，外部争用已解除 → 解析器确定性到达 line 57 → 刷新确定性触发
      await expect(page, `${from} should redirect to ${to}`).toHaveURL(to, { timeout: 5000 });

      // 落点规范页应成功渲染（toHaveURL 命中即说明非 4xx：服务器对 4xx 会回退 404.html，URL 不会等于 to）。
      // 不再二次 page.goto(to)——会打断在途导航且冗余；改为确认规范页主内容已挂载。
      await expect(page.locator('#main, main').first(), `${to} rendered`).toBeAttached({ timeout: 5000 });
    });
  }
});
