import { test, expect } from '@playwright/test';

test('explore page structure', async ({ page }) => {
  await page.goto('http://localhost:1420');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot to see current state
  await page.screenshot({ path: 'explore-screenshot.png', fullPage: true });
  
  // Log the page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Log the main heading
  const headingText = await page.locator('h1').textContent();
  console.log('Main heading:', headingText);
  
  // Check navigation buttons
  const navButtons = page.locator('.nav-btn');
  const buttonCount = await navButtons.count();
  console.log('Navigation buttons count:', buttonCount);
  
  for (let i = 0; i < buttonCount; i++) {
    const buttonText = await navButtons.nth(i).textContent();
    console.log(`Button ${i}:`, buttonText);
  }
  
  // Check what's in the main content area
  const mainContent = page.locator('.app-content');
  const contentHTML = await mainContent.innerHTML();
  console.log('Main content HTML:', contentHTML.substring(0, 500));
  
  // Navigate to families and check structure
  await page.click('text=Keluarga');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of families view
  await page.screenshot({ path: 'families-screenshot.png', fullPage: true });
  
  // Check what's in the families view
  const familiesContent = page.locator('.app-content');
  const familiesHTML = await familiesContent.innerHTML();
  console.log('Families content HTML:', familiesHTML.substring(0, 500));
  
  // Look for the "Tambah Keluarga" button
  const tambahButton = page.locator('text=Tambah Keluarga');
  const isTambahVisible = await tambahButton.isVisible();
  console.log('Tambah Keluarga button visible:', isTambahVisible);
  
  if (isTambahVisible) {
    console.log('Found Tambah Keluarga button');
  } else {
    // Look for any buttons
    const allButtons = page.locator('button');
    const buttonCount2 = await allButtons.count();
    console.log('Total buttons on page:', buttonCount2);
    
    for (let i = 0; i < Math.min(buttonCount2, 10); i++) {
      const buttonText = await allButtons.nth(i).textContent();
      console.log(`Button ${i}:`, buttonText);
    }
  }
});