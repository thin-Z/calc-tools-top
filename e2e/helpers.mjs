/**
 * e2e/helpers.js — E2E 公共工具（T1.5）
 * -----------------------------------------------------------------
 * - dismissCmp: 关闭 CMP cookie 横幅，避免遮挡交互元素
 * - trackPageErrors: 收集未捕获 JS 异常（pageerror）；资源加载失败不计入
 *   （本地/CI 无外网，AdSense/GA4 请求失败属预期噪音）
 */

/** 关闭 CMP 横幅（存在才点，不等待） */
export async function dismissCmp(page) {
  const accept = page.locator('#cmp-accept');
  try {
    await accept.click({ timeout: 1500 });
  } catch {
    /* 横幅未出现（已同意过 / 被上一用例处理），忽略 */
  }
}

/**
 * 收集页面未捕获异常。返回 errors 数组；
 * 断言用 expect(errors).toEqual([])。
 */
export function trackPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => {
    const msg = String((err && err.message) || err);
    // External scripts blocked by network/CDN = environment noise, not code bugs.
    if (/adsbygoogle|gtag|googletagmanager|Chart|qrcodejs|IntersectionObserver|ServiceWorkerRegistration|registerServiceWorker/i.test(msg)) return;
    errors.push(msg);
  });
  return errors;
}
