import { test, expect } from '@playwright/test';

test('debug modal behavior', async ({ page }) => {
  await page.goto('http://localhost:1420');
  await page.waitForLoadState('networkidle');
  
  // Navigate to families
  await page.click('text=Keluarga');
  await page.waitForTimeout(2000);
  
  // Take screenshot before clicking
  await page.screenshot({ path: 'modal-before-click.png', fullPage: true });
  
  // Click the "Tambah Keluarga Baru" button
  console.log('Clicking Tambah Keluarga Baru button...');
  await page.click('text=Tambah Keluarga Baru');
  
  // Wait a bit for modal to appear
  await page.waitForTimeout(2000);
  
  // Take screenshot after clicking
  await page.screenshot({ path: 'modal-after-click.png', fullPage: true });
  
  // Check if modal appeared
  const modalOverlay = page.locator('.modal-overlay');
  const modalVisible = await modalOverlay.isVisible();
  console.log('Modal overlay visible:', modalVisible);
  
  if (modalVisible) {
    console.log('Modal found!');
    const modalHTML = await modalOverlay.innerHTML();
    console.log('Modal HTML:', modalHTML.substring(0, 500));
    
    // Look for form elements
    const formElements = page.locator('.modal-overlay input, .modal-overlay select, .modal-overlay textarea');
    const formElementCount = await formElements.count();
    console.log('Form elements in modal:', formElementCount);
    
    for (let i = 0; i < formElementCount; i++) {
      const elementType = await formElements.nth(i).getAttribute('type') || await formElements.nth(i).tagName();
      const elementId = await formElements.nth(i).getAttribute('id') || await formElements.nth(i).getAttribute('name');
      console.log(`Form element ${i}: ${elementType} (id/name: ${elementId})`);
    }
    
    // Look for buttons in modal
    const modalButtons = page.locator('.modal-overlay button');
    const modalButtonCount = await modalButtons.count();
    console.log('Buttons in modal:', modalButtonCount);
    
    for (let i = 0; i < modalButtonCount; i++) {
      const buttonText = await modalButtons.nth(i).textContent();
      console.log(`Modal button ${i}: "${buttonText}"`);
    }
  } else {
    console.log('Modal not found. Checking what happened...');
    
    // Check if any new elements appeared
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('Body HTML after click (first 1000 chars):', bodyHTML.substring(0, 1000));
    
    // Check for any error messages
    const errorElements = page.locator('.error, .error-message, [class*="error"]');
    const errorCount = await errorElements.count();
    console.log('Error elements found:', errorCount);
    
    // Check console for errors
    page.on('console', msg => {
      console.log('Console after click:', msg.type(), msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('Page error after click:', error.message);
    });
    
    // Wait a bit more and check again
    await page.waitForTimeout(3000);
    const modalVisible2 = await modalOverlay.isVisible();
    console.log('Modal overlay visible after 3 more seconds:', modalVisible2);
  }
});