import { test, expect } from '@playwright/test';

test('should create a new family successfully', async ({ page }) => {
  await page.goto('http://localhost:1420');
  await page.waitForLoadState('networkidle');
  
  // Navigate to Families view
  await page.click('text=Keluarga');
  await page.waitForTimeout(1000);
  
  // Click "Tambah Keluarga Baru" button
  await page.click('text=Tambah Keluarga Baru');
  
  // Wait for modal to appear
  await page.waitForSelector('.modal-overlay', { state: 'visible', timeout: 10000 });
  
  // Take screenshot to see the modal
  await page.screenshot({ path: 'create-family-modal.png', fullPage: true });
  
  // Fill in family form
  await page.fill('#nama_keluarga', 'Test Family CRUD');
  await page.fill('#kepala_keluarga', 'Test Head');
  await page.fill('#deskripsi', 'Test family description for CRUD operations');
  
  // Take screenshot after filling form
  await page.screenshot({ path: 'create-family-form-filled.png', fullPage: true });
  
  // Submit the form
  await page.click('text=Simpan Keluarga');
  
  // Wait for modal to close
  await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
  
  // Take screenshot after submission
  await page.screenshot({ path: 'create-family-after-submit.png', fullPage: true });
  
  // Check if family was created and appears in the list
  await expect(page.locator('text=Test Family CRUD')).toBeVisible();
  await expect(page.locator('text=Test Head')).toBeVisible();
  
  console.log('Family creation test completed successfully');
});