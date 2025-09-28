import { test, expect } from '@playwright/test';

test('app loads and shows header and initializes database', async ({ page }) => {
  await page.goto('/');

  // Check header
  await expect(page.locator('h1')).toContainText('Silsilah Keluarga');

  // Initially shows loading message or spinner
  // The loading UI can be transient; wait for the app debug info which shows DB readiness.
  const debug = page.locator('.debug-info');
  await debug.waitFor({ timeout: 20000 });
  await expect(debug).toContainText('DB Ready: true');
});
