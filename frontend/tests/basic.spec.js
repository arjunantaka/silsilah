import { test, expect } from '@playwright/test';

test('basic page load test', async ({ page }) => {
  await page.goto('http://localhost:1420');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see what's on the page
  await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
  
  // Check if the title is correct
  await expect(page).toHaveTitle('Silsilah Keluarga');
  
  // Check if the main heading is visible
  const heading = page.locator('h1');
  await expect(heading).toBeVisible();
  await expect(heading).toContainText('Silsilah Keluarga');
  
  // Check if navigation buttons are present
  const navButtons = page.locator('.nav-btn');
  await expect(navButtons).toHaveCount(4);
  
  console.log('Basic test completed successfully');
});