import { test } from '@playwright/test';
import { SEL } from './utils/selectors';

// Tests for parent/child/spouse relations

test.describe('Relations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('add child relation (placeholder)', async ({ page }) => {
    // TODO: implement
  });
});
