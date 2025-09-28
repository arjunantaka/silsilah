import { test, expect } from '@playwright/test';

test('debug console errors and page source', async ({ page }) => {
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    console.log('Console:', msg.type(), msg.text());
  });
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log('Page Error:', error.message);
  });
  
  // Navigate to the page
  await page.goto('http://localhost:1420');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Wait a bit more for any dynamic content
  await page.waitForTimeout(3000);
  
  // Get page source
  const pageSource = await page.content();
  console.log('Page source length:', pageSource.length);
  console.log('Page source preview:', pageSource.substring(0, 1000));
  
  // Check if the app div exists
  const appDiv = page.locator('#app');
  const appDivExists = await appDiv.count() > 0;
  console.log('App div exists:', appDivExists);
  
  if (appDivExists) {
    const appDivHTML = await appDiv.innerHTML();
    console.log('App div HTML:', appDivHTML.substring(0, 500));
  }
  
  // Check for any error messages in the page
  const errorElements = page.locator('.error, .error-message, [class*="error"]');
  const errorCount = await errorElements.count();
  console.log('Error elements found:', errorCount);
  
  for (let i = 0; i < errorCount; i++) {
    const errorText = await errorElements.nth(i).textContent();
    console.log(`Error ${i}:`, errorText);
  }
  
  // Take screenshot
  await page.screenshot({ path: 'console-debug-screenshot.png', fullPage: true });
  
  // Log summary
  console.log('Summary:');
  console.log('- Console logs:', consoleLogs.length);
  console.log('- Page errors:', pageErrors.length);
  console.log('- App div exists:', appDivExists);
  
  // If there are errors, fail the test with details
  if (pageErrors.length > 0) {
    throw new Error(`Page errors detected: ${pageErrors.join(', ')}`);
  }
});