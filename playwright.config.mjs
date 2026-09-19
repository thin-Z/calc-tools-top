// @ts-check
/**
 * playwright.config.mjs — T1.5 E5 常驻 E2E 套件配置（Phase 1, D4 决策）
 * -----------------------------------------------------------------
 * - 本地默认用系统 Edge（channel: msedge，免下载浏览器）；CI 用 chromium
 *   （覆盖方式：E2E_CHANNEL=chrome|msedge|... 环境变量）
 * - webServer 自动拉起 scripts/e2e-server.mjs（serve dist/，需先 build）
 * - R4 对应：本套件即"真实浏览器渲染断言"的自动化版
 */
import { defineConfig } from '@playwright/test';

// 本地默认用系统 Edge（msedge），免去下载 chromium；CI 强制回退到空字符串
// （Playwright 自带 chromium），保证 CI 仍走 chromium 且 line 62 的 `playwright install chromium` 生效。
const channel = process.env.E2E_CHANNEL || (process.env.CI ? '' : 'msedge');
const PORT = Number(process.env.E2E_PORT || 4173);

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  // 重试：CI 与本地一致取 1（2026-09-19 修复 E9 flaky）
  //   此前本地 retries=0、CI retries=1 —— 这正是「SW 注册用例只在本地偶发失败」的原因：
  //   本地无重试兜底，并行(workers 不限)下 sw.js 激活受网络/CPU 争用偶发超时即报红。
  //   本地保留 retries=1 与 CI 对齐；Playwright 仍会把重试通过的用例标记为 flaky（黄字），
  //   不掩盖问题、只消除假红。
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...(channel ? { channel } : {}),
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
