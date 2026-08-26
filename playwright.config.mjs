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

const channel = process.env.E2E_CHANNEL || '';
const PORT = Number(process.env.E2E_PORT || 4173);

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
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
