import { test, expect } from '@playwright/test';

test('explore families view in detail', async ({ page }) => {
  await page.goto('http://localhost:1420');
  await page.waitForLoadState('networkidle');
  
  // Navigate to families
  await page.click('text=Keluarga');
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: 'families-view-detail.png', fullPage: true });
  
  // Get the app content
  const appContent = page.locator('.app-content');
  const contentHTML = await appContent.innerHTML();
  console.log('Families view HTML:', contentHTML);
  
  // Look for any specific elements
  const allElements = page.locator('*');
  const elementCount = await allElements.count();
  console.log('Total elements in page:', elementCount);
  
  // Look for buttons
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  console.log('Total buttons:', buttonCount);
  
  for (let i = 0; i < buttonCount; i++) {
    const buttonText = await buttons.nth(i).textContent();
    const isVisible = await buttons.nth(i).isVisible();
    console.log(`Button ${i}: "${buttonText}" - Visible: ${isVisible}`);
  }
  
  // Look for divs with specific classes
  const familySelectors = [
    '.family-selector',
    '.families-container', 
    '.family-list',
    '.family-grid',
    '.empty-state',
    '.header',
    '.family-card'
  ];
  
  for (const selector of familySelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    console.log(`Elements with selector "${selector}": ${count}`);
    
    if (count > 0) {
      const firstElementHTML = await elements.first().innerHTML();
      console.log(`First element HTML for "${selector}":`, firstElementHTML.substring(0, 200));
    }
  }
  
  // Look for text content
  const bodyText = await page.locator('body').textContent();
  console.log('Body text preview:', bodyText.substring(0, 500));
  
  // Check if there's any text that might indicate empty state
  const emptyStateTexts = [
    'Belum Ada Data Keluarga',
    'Tambah Keluarga',
    'Klik',
    'data keluarga'
  ];
  
  for (const text of emptyStateTexts) {
    const hasText = bodyText.includes(text);
    console.log(`Contains "${text}": ${hasText}`);
  }
});