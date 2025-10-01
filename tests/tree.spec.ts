import { test, expect } from '@playwright/test';
import { SEL } from './utils/selectors';

// Tests for tree view expansion / structure

test.describe('Tree View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('tree root visible (placeholder)', async ({ page }) => {
    await page.locator(SEL.treeRoot).waitFor();
    await expect(page.locator(SEL.treeContainer)).toBeVisible();
  });
});
