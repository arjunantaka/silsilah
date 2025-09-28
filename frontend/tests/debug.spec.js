import { test, expect } from '@playwright/test';

test('debug database and component loading', async ({ page }) => {
  await page.goto('http://localhost:1420');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  
  // Check debug info
  const debugInfo = page.locator('.debug-info');
  const isDebugVisible = await debugInfo.isVisible();
  console.log('Debug info visible:', isDebugVisible);
  
  if (isDebugVisible) {
    const debugText = await debugInfo.textContent();
    console.log('Debug text:', debugText);
  }
  
  // Check if loading state is shown
  const loading = page.locator('.loading');
  const isLoadingVisible = await loading.isVisible();
  console.log('Loading visible:', isLoadingVisible);
  
  if (isLoadingVisible) {
    const loadingText = await loading.textContent();
    console.log('Loading text:', loadingText);
  }
  
  // Wait a bit longer for everything to load
  await page.waitForTimeout(5000);
  
  // Take another screenshot
  await page.screenshot({ path: 'debug-screenshot-2.png', fullPage: true });
  
  // Check debug info again
  const debugInfo2 = page.locator('.debug-info');
  const isDebugVisible2 = await debugInfo2.isVisible();
  console.log('Debug info visible after 5s:', isDebugVisible2);
  
  if (isDebugVisible2) {
    const debugText2 = await debugInfo2.textContent();
    console.log('Debug text after 5s:', debugText2);
  }
  
  // Check console for any errors
  page.on('console', msg => {
    console.log('Console log:', msg.type(), msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  // Navigate to families and wait
  await page.click('text=Keluarga');
  await page.waitForTimeout(3000);
  
  // Take screenshot of families view
  await page.screenshot({ path: 'debug-families-screenshot.png', fullPage: true });
  
  // Check what's rendered in families view
  const appContent = page.locator('.app-content');
  const contentText = await appContent.textContent();
  console.log('App content text:', contentText);
  
  // Look for any specific elements
  const familySelector = page.locator('.family-selector, .families-container, .family-list');
  const familySelectorCount = await familySelector.count();
  console.log('Family selector elements found:', familySelectorCount);
});