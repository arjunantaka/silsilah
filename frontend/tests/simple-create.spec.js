import { test, expect } from '@playwright/test';

test('simple family creation test', async ({ page }) => {
  await page.goto('http://localhost:1420');
  await page.waitForLoadState('networkidle');
  
  // Navigate to families
  await page.click('text=Keluarga');
  await page.waitForTimeout(1000);
  
  // Click add button
  await page.click('text=Tambah Keluarga Baru');
  await page.waitForTimeout(1000);
  
  // Check if modal is visible
  const modal = page.locator('.modal-overlay');
  await expect(modal).toBeVisible();
  
  // Fill form
  await page.fill('#nama_keluarga', 'Simple Test Family');
  await page.fill('#kepala_keluarga', 'Simple Head');
  
  // Submit form
  await page.click('text=Simpan Keluarga');
  await page.waitForTimeout(2000);
  
  // Check if modal is closed
  await expect(modal).not.toBeVisible();
  
  // Check if family was created
  await expect(page.locator('text=Simple Test Family')).toBeVisible();
  
  console.log('Simple test completed');
});