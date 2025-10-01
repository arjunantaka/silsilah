import { test, expect } from '@playwright/test';
import { SEL } from './utils/selectors';

// Tests for export (and future import if applicable)

test.describe('Export / Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('export buttons disabled when no data (placeholder)', async ({ page }) => {
    await expect(page.locator(SEL.btnExportCsv)).toBeDisabled();
    await expect(page.locator(SEL.btnPrintTable)).toBeDisabled();
  });
});
