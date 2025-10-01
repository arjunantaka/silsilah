import { test, expect } from '@playwright/test';
import { SEL } from './utils/selectors';

// Initialization / basic load tests
// TODO: implement creating/loading initial trah or sample data if workflow supports it

test.describe('Initialization', () => {
  test('app loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SEL.appRoot)).toBeVisible();
  });
});
