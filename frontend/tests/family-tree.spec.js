import { test, expect } from '@playwright/test';

test.describe('Family Tree Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:1420');
    
    // Wait for the app to load
    await page.waitForSelector('.app-header', { state: 'visible' });
  });

  test('should load the application successfully', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('Silsilah Keluarga');
    
    // Check if navigation buttons are visible
    await expect(page.locator('.nav-btn')).toHaveCount(4);
    
    // Check if debug info shows database is ready
    await expect(page.locator('.debug-info')).toBeVisible();
  });

  test('should navigate between different views', async ({ page }) => {
    // Test navigation to Families view
    await page.click('text=Keluarga');
    await expect(page.locator('.nav-btn.active')).toContainText('Keluarga');
    
    // Test navigation to Persons view (should be disabled initially)
    const personsBtn = page.locator('text=Anggota Keluarga');
    await expect(personsBtn).toBeDisabled();
    
    // Test navigation to Relations view (should be disabled initially)
    const relationsBtn = page.locator('text=Hubungan Keluarga');
    await expect(relationsBtn).toBeDisabled();
    
    // Test navigation to Tree view (should be disabled initially)
    const treeBtn = page.locator('text=Pohon Keluarga');
    await expect(treeBtn).toBeDisabled();
  });

  test('should create a new family', async ({ page }) => {
    // Navigate to Families view
    await page.click('text=Keluarga');
    
    // Click "Tambah Keluarga" button
    await page.click('text=Tambah Keluarga');
    
    // Wait for modal to appear
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    
    // Fill in family form
    await page.fill('#nama_keluarga', 'Test Family');
    await page.fill('#kepala_keluarga', 'Test Head');
    await page.fill('#deskripsi', 'Test family description');
    
    // Submit the form
    await page.click('text=Simpan Keluarga');
    
    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Check if family was created
    await expect(page.locator('text=Test Family')).toBeVisible();
  });

  test('should create family members after family is created', async ({ page }) => {
    // First create a family
    await page.click('text=Keluarga');
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Test Family for Members');
    await page.fill('#kepala_keluarga', 'Test Head');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Click on the created family to select it
    await page.click('text=Test Family for Members');
    
    // Wait for other buttons to be enabled
    await expect(page.locator('text=Anggota Keluarga')).toBeEnabled();
    
    // Navigate to Persons view
    await page.click('text=Anggota Keluarga');
    await expect(page.locator('.nav-btn.active')).toContainText('Anggota Keluarga');
    
    // Click "Tambah Anggota" button
    await page.click('text=Tambah Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    
    // Fill in person form
    await page.fill('#nama_lengkap', 'John Doe');
    await page.fill('#nama_panggilan', 'John');
    await page.selectOption('#jenis_kelamin', 'L');
    await page.fill('#tanggal_lahir', '1990-01-01');
    await page.fill('#tempat_lahir', 'Jakarta');
    await page.fill('#pekerjaan', 'Software Engineer');
    await page.selectOption('#status_hidup', 'hidup');
    
    // Submit the form
    await page.click('text=Simpan Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Check if person was created
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should create family relationships', async ({ page }) => {
    // Create a family first
    await page.click('text=Keluarga');
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Test Family for Relations');
    await page.fill('#kepala_keluarga', 'Test Head');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Select the family
    await page.click('text=Test Family for Relations');
    
    // Create two family members
    await page.click('text=Anggota Keluarga');
    
    // Create parent
    await page.click('text=Tambah Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_lengkap', 'Parent Doe');
    await page.fill('#nama_panggilan', 'Parent');
    await page.selectOption('#jenis_kelamin', 'L');
    await page.click('text=Simpan Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Create child
    await page.click('text=Tambah Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_lengkap', 'Child Doe');
    await page.fill('#nama_panggilan', 'Child');
    await page.selectOption('#jenis_kelamin', 'L');
    await page.click('text=Simpan Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Navigate to Relations view
    await page.click('text=Hubungan Keluarga');
    await expect(page.locator('.nav-btn.active')).toContainText('Hubungan Keluarga');
    
    // Click "Tambah Hubungan" button
    await page.click('text=Tambah Hubungan');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    
    // Select parent and child
    await page.selectOption('#orang_tua_id', '1'); // Parent Doe
    await page.selectOption('#anak_id', '2'); // Child Doe
    await page.fill('#urutan_lahir', '1');
    
    // Submit the form
    await page.click('text=Simpan Hubungan');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Check if relationship was created
    await expect(page.locator('text=Parent Doe')).toBeVisible();
    await expect(page.locator('text=Child Doe')).toBeVisible();
  });

  test('should display family tree visualization', async ({ page }) => {
    // Create a family with relationships first
    await page.click('text=Keluarga');
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Test Family Tree');
    await page.fill('#kepala_keluarga', 'Test Head');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Select the family
    await page.click('text=Test Family Tree');
    
    // Create family members and relationships (simplified)
    await page.click('text=Anggota Keluarga');
    await page.click('text=Tambah Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_lengkap', 'Root Person');
    await page.fill('#nama_panggilan', 'Root');
    await page.selectOption('#jenis_kelamin', 'L');
    await page.click('text=Simpan Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Navigate to Tree view
    await page.click('text=Pohon Keluarga');
    await expect(page.locator('.nav-btn.active')).toContainText('Pohon Keluarga');
    
    // Check if tree container is visible
    await expect(page.locator('.tree-container')).toBeVisible();
    
    // Check if SVG tree is rendered
    await expect(page.locator('.tree-svg')).toBeVisible();
    
    // Check if tree info is displayed
    await expect(page.locator('.tree-info')).toBeVisible();
  });

  test('should handle lineage management', async ({ page }) => {
    // Create a family with relationships
    await page.click('text=Keluarga');
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_keluarga', 'Test Lineage Family');
    await page.fill('#kepala_keluarga', 'Test Head');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Select the family
    await page.click('text=Test Lineage Family');
    
    // Create family members
    await page.click('text=Anggota Keluarga');
    await page.click('text=Tambah Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    await page.fill('#nama_lengkap', 'Test Person');
    await page.fill('#nama_panggilan', 'Test');
    await page.selectOption('#jenis_kelamin', 'L');
    await page.click('text=Simpan Anggota');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Navigate to Relations view
    await page.click('text=Hubungan Keluarga');
    
    // Check if "Perbarui Silsilah" button is visible
    await expect(page.locator('text=Perbarui Silsilah')).toBeVisible();
    
    // Check if "Root" buttons are visible for persons
    await expect(page.locator('text=🌳 Root')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.app-nav')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.app-nav')).toBeVisible();
    
    // Check if navigation is still functional on mobile
    await page.click('text=Keluarga');
    await expect(page.locator('.nav-btn.active')).toContainText('Keluarga');
  });

  test('should handle form validation', async ({ page }) => {
    // Navigate to Families view
    await page.click('text=Keluarga');
    
    // Click "Tambah Keluarga" button
    await page.click('text=Tambah Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'visible' });
    
    // Try to submit empty form
    await page.click('text=Simpan Keluarga');
    
    // Check if validation prevents submission
    await expect(page.locator('.modal-overlay')).toBeVisible();
    
    // Fill required field and submit
    await page.fill('#nama_keluarga', 'Valid Family');
    await page.click('text=Simpan Keluarga');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // Check if family was created
    await expect(page.locator('text=Valid Family')).toBeVisible();
  });
});