import { test, expect } from '@playwright/test';

test.describe('Family CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:1420');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to Families view
    await page.click('text=Keluarga');
  });

  test('should display empty state when no families exist', async ({ page }) => {
    // Check if empty state message is shown
    await expect(page.locator('text=Belum ada keluarga yang terdaftar')).toBeVisible();
    await expect(page.locator('text=Klik "Tambah Keluarga Baru" untuk memulai')).toBeVisible();
  });

  test('should create a new family successfully', async ({ page }) => {
    // Click "Tambah Keluarga Baru" button
    await page.click('text=Tambah Keluarga Baru');
    
    // Wait for modal to appear
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    
    // Fill in family form
    await page.fill('#nama_keluarga', 'Test Family CRUD');
    await page.fill('#kepala_keluarga', 'Test Head');
    await page.fill('#deskripsi', 'Test family description for CRUD operations');
    
    // Submit the form
    await page.click('text=Simpan Keluarga');
    
    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Check if family was created and appears in the list
    await expect(page.locator('text=Test Family CRUD')).toBeVisible();
    await expect(page.locator('text=Test Head')).toBeVisible();
  });

  test('should validate required fields when creating family', async ({ page }) => {
    // Click "Tambah Keluarga Baru" button
    await page.click('text=Tambah Keluarga Baru');
    
    // Wait for modal to appear
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    
    // Try to submit without filling required fields
    await page.click('text=Simpan Keluarga');
    
    // Modal should still be visible (validation should prevent submission)
    await expect(page.locator('.modal-overlay')).toBeVisible();
    
    // Fill required field
    await page.fill('#nama_keluarga', 'Validated Family');
    
    // Now submit should work
    await page.click('text=Simpan Keluarga');
    
    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Check if family was created
    await expect(page.locator('text=Validated Family')).toBeVisible();
  });

  test('should edit an existing family', async ({ page }) => {
    // First create a family
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Family to Edit');
    await page.fill('#kepala_keluarga', 'Original Head');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Find and click edit button for the created family
    const editButton = page.locator('text=Family to Edit').locator('..').locator('button', { hasText: 'Edit' });
    await editButton.click();
    
    // Wait for edit modal to appear
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    
    // Update family information
    await page.fill('#nama_keluarga', 'Updated Family Name');
    await page.fill('#kepala_keluarga', 'Updated Head');
    await page.fill('#deskripsi', 'Updated description');
    
    // Submit the form
    await page.click('text=Update Keluarga');
    
    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Check if family was updated
    await expect(page.locator('text=Updated Family Name')).toBeVisible();
    await expect(page.locator('text=Updated Head')).toBeVisible();
    await expect(page.locator('text=Family to Edit')).not.toBeVisible();
  });

  test('should delete a family', async ({ page }) => {
    // First create a family
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Family to Delete');
    await page.fill('#kepala_keluarga', 'Delete Head');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Verify family exists
    await expect(page.locator('text=Family to Delete')).toBeVisible();
    
    // Find and click delete button for the created family
    const deleteButton = page.locator('text=Family to Delete').locator('..').locator('button', { hasText: 'Hapus' });
    await deleteButton.click();
    
    // Wait for confirmation dialog (if any) or handle the deletion
    // Note: Based on the implementation, there might be a confirmation dialog
    try {
      // If there's a confirmation dialog
      await page.waitForSelector('.modal-overlay', { state: 'visible', timeout: 5000 });
      await page.click('text=Hapus'); // Confirm deletion
      await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    } catch (e) {
      // If no confirmation dialog, deletion happens immediately
      console.log('No confirmation dialog found, deletion completed immediately');
    }
    
    // Check if family was deleted
    await expect(page.locator('text=Family to Delete')).not.toBeVisible();
  });

  test('should select a family and enable other menu items', async ({ page }) => {
    // Create a family first
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Selectable Family');
    await page.fill('#kepala_keluarga', 'Selectable Head');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Initially, other menu items should be disabled
    await expect(page.locator('text=Anggota Keluarga')).toBeDisabled();
    await expect(page.locator('text=Hubungan Keluarga')).toBeDisabled();
    await expect(page.locator('text=Pohon Keluarga')).toBeDisabled();
    
    // Click on the family to select it
    await page.click('text=Selectable Family');
    
    // Now other menu items should be enabled
    await expect(page.locator('text=Anggota Keluarga')).toBeEnabled();
    await expect(page.locator('text=Hubungan Keluarga')).toBeEnabled();
    await expect(page.locator('text=Pohon Keluarga')).toBeEnabled();
  });

  test('should display family details correctly', async ({ page }) => {
    // Create a family with complete details
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Detailed Family');
    await page.fill('#kepala_keluarga', 'Detailed Head');
    await page.fill('#deskripsi', 'This is a detailed family description with complete information');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    
    // Check if family details are displayed correctly
    await expect(page.locator('text=Detailed Family')).toBeVisible();
    await expect(page.locator('text=Detailed Head')).toBeVisible();
    
    // The description might be visible in a details section or tooltip
    // This depends on the UI implementation
    const familyCard = page.locator('text=Detailed Family').locator('..');
    await expect(familyCard).toBeVisible();
  });

  test('should handle multiple families creation', async ({ page }) => {
    // Create multiple families
    const families = [
      { name: 'Family One', head: 'Head One', description: 'First family' },
      { name: 'Family Two', head: 'Head Two', description: 'Second family' },
      { name: 'Family Three', head: 'Head Three', description: 'Third family' }
    ];
    
    for (const family of families) {
      await page.click('text=Tambah Keluarga');
      await page.waitForSelector('.modal-overlay', { state: 'visible' });
      await page.fill('#nama_keluarga', family.name);
      await page.fill('#kepala_keluarga', family.head);
      await page.fill('#deskripsi', family.description);
      await page.click('text=Simpan Keluarga');
      await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    }
    
    // Check if all families are displayed
    for (const family of families) {
      await expect(page.locator(`text=${family.name}`)).toBeVisible();
      await expect(page.locator(`text=${family.head}`)).toBeVisible();
    }
    
    // Should have at least 3 families displayed
    const familyCards = page.locator('.family-card, .family-item, .families-list > div');
    const count = await familyCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});