import { test, expect } from '@playwright/test';
import { SEL } from './utils/selectors';

// CRUD tests for person entities

test.describe('Person CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('create person (placeholder)', async ({ page }) => {
    await page.locator(SEL.btnAddPerson).click();
    // TODO: fill form and assert row appears
  });
});
