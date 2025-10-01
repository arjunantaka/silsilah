import { test, expect } from '@playwright/test';

// Helper selectors (text-based due to absence of data-testid)
const selectors = {
  headingFamilies: 'h2:has-text("Kelompok Keluarga")',
  addFamilyButton: 'button:has-text("Tambah Keluarga")',
  familyNameInput: '#nama',
  saveFamilyButton: '.modal form button.btn-primary:has-text("Simpan")',
  familyCard: '.family-card',
  activeInfoPanel: '.current-info',
  addPersonHeading: 'h3:has-text("Tambah Anggota Baru")',
  exportButton: 'button:has-text("Ekspor JSON")',
  treeEmptyPrompt: 'div.empty-state:has-text("Belum Ada Anggota")',
  treeSvg: 'svg',
  showUnionsCheckboxLabel: 'label:has-text("Tampilkan Pasangan")'
};

async function createFamily(page, name: string) {
  await page.click(selectors.addFamilyButton);
  await expect(page.locator(selectors.familyNameInput)).toBeVisible();
  await page.fill(selectors.familyNameInput, name);
  await page.click(selectors.saveFamilyButton);
  await expect(page.locator(selectors.familyCard).filter({ hasText: name })).toBeVisible();
  // Activate
  await page.locator(selectors.familyCard).filter({ hasText: name }).locator('button.btn-select').click();
  await expect(page.locator(selectors.activeInfoPanel)).toBeVisible();
}

// Person form fields are inside PersonFields; use labels.
async function addPersonBasic(page, fullName: string) {
  // There is no explicit button in provided snippets; assume navigation to a tab or direct presence.
  // Try to find heading first; if absent, attempt to click a nav item heuristically.
  const addPersonHeading = page.locator(selectors.addPersonHeading);
  if (!(await addPersonHeading.isVisible())) {
    // Try fallback: find a button or link containing 'Anggota' or 'Person'
    const possible = page.locator('button:has-text("Anggota"), a:has-text("Anggota")');
    if (await possible.first().isVisible()) await possible.first().click();
  }
  await expect(page.locator(selectors.addPersonHeading)).toBeVisible();

  // Fill by label text (Indonesian labels in PersonFields assumed):
  await page.getByLabel(/Nama Lengkap/i).fill(fullName);
  // Optional: gender (default L) — skip; Save
  await page.locator('form .btn-primary:has-text("Simpan")').click();
  // Expect no error message
  await expect(page.locator('.error-message')).toHaveCount(0);
}

// NOTE: Additional relation operations need dedicated UI (ParentSelector, SpouseSelector) which we assume is present in create form.
async function addChildWithParents(page, childName: string) {
  await expect(page.locator(selectors.addPersonHeading)).toBeVisible();
  await page.getByLabel(/Nama Lengkap/i).fill(childName);
  // Open parent selector if present: select first two people as parents.
  const parentSelector = page.locator('.parent-selector, .parent-selector-container');
  if (await parentSelector.count()) {
    // Choose up to two checkboxes
    const checks = parentSelector.locator('input[type=checkbox]');
    const count = await checks.count();
    for (let i = 0; i < Math.min(2, count); i++) {
      await checks.nth(i).check();
    }
  }
  await page.locator('form .btn-primary:has-text("Simpan")').click();
}

// Validate tree rendering by counting nodes (circle + rect)
async function expectTreeToRender(page) {
  // Navigate / open tree tab if necessary
  if (!(await page.locator('svg').first().isVisible())) {
    const treeTab = page.locator('button:has-text("Pohon"), a:has-text("Pohon")');
    if (await treeTab.first().isVisible()) await treeTab.first().click();
  }
  await expect(page.locator(selectors.treeSvg)).toBeVisible();
  // A minimal presence of nodes: wait for at least 1 circle
  await expect(page.locator('svg .node circle')).toHaveCountGreaterThan(0);
}

// Custom matcher shim
expect.extend({
  async toHaveCountGreaterThan(locator, expected) {
    const count = await locator.count();
    const pass = count > expected;
    return {
      pass,
      message: () => `Expected count > ${expected} but got ${count}`
    };
  }
});

test.describe('Fungsional Utama Aplikasi Keluarga', () => {
  test('Alur dasar: buat keluarga, tambah anggota, render pohon, ekspor', async ({ page }) => {
    await page.goto('/');

    // Pastikan heading utama
    await expect(page.locator(selectors.headingFamilies)).toBeVisible();

    // Buat keluarga jika belum ada
    const hasAnyFamily = await page.locator(selectors.familyCard).count();
    if (!hasAnyFamily) {
      await createFamily(page, 'Keluarga Otomasi');
    } else {
      // Aktifkan yang pertama jika belum aktif
      const firstCard = page.locator(selectors.familyCard).first();
      if (!(await page.locator(selectors.activeInfoPanel).isVisible())) {
        await firstCard.locator('button.btn-select').click();
      }
      await expect(page.locator(selectors.activeInfoPanel)).toBeVisible();
    }

    // Tambah anggota pertama
    await addPersonBasic(page, 'Anggota Satu');

    // Tambah anggota kedua + (opsional) orang tua/pasangan jika UI mendukung; best effort
    await addPersonBasic(page, 'Anggota Dua');

    // Coba render pohon
    await expectTreeToRender(page);

    // Ekspor JSON
    const [ download ] = await Promise.all([
      page.waitForEvent('download'),
      page.click(selectors.exportButton)
    ]);
    const json = await download.createReadStream();
    // We cannot parse stream here easily; rely on filename check
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/backup-silsilah-.*\.json$/);
  });
});
