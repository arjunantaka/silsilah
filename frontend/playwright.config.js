/* Playwright test config for Family Tree Application
   - Uses the built-in test runner
   - Starts vite dev server before tests and stops afterwards
 */
import { devices } from '@playwright/test';

export default {
  testDir: 'tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    actionTimeout: 10 * 1000,
    trace: 'on-first-retry',
    baseURL: 'http://localhost:1420',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 0.0.0.0 --port 1420',
    url: 'http://localhost:1420',
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
};
