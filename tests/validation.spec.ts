import { test } from '@playwright/test';
import { SEL } from './utils/selectors';

// Tests for form validation behaviors

test.describe('Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('missing required name shows error (placeholder)', async ({ page }) => {
    // TODO: implement validation check
  });
});
