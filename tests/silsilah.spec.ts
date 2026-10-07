import { test, expect, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function bangunKeluarga(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await page.getByText('Budi', { exact: true }).click()
  await page.getByRole('button', { name: /Tambah Pasangan/ }).click()
  await page.getByLabel('Nama').fill('Sari')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await page.getByText('Budi', { exact: true }).click()
  await page.getByRole('button', { name: /Tambah Anak/ }).click()
  await page.getByLabel('Nama').fill('Ani')
  await page.getByRole('button', { name: 'Simpan' }).click()
}

test('tambah keluarga lengkap & persist', async ({ page }) => {
  await bangunKeluarga(page)

  await expect(page.getByText('Budi', { exact: true })).toBeVisible()
  await expect(page.getByText('Sari', { exact: true })).toBeVisible()
  await expect(page.getByText('Ani', { exact: true })).toBeVisible()

  // Bukti autosave localStorage: data tetap ada setelah reload.
  await page.reload()
  await expect(page.getByText('Budi', { exact: true })).toBeVisible()
  await expect(page.getByText('Sari', { exact: true })).toBeVisible()
  await expect(page.getByText('Ani', { exact: true })).toBeVisible()
})

test('hapus membersihkan pointer', async ({ page }) => {
  // Konteks baru tiap tes: bangun ulang state yang sama.
  await bangunKeluarga(page)

  page.on('dialog', (d) => d.accept())
  await page.getByText('Budi', { exact: true }).click()
  await page.getByRole('button', { name: /Hapus/ }).click()

  // Budi hilang; Sari kini satu-satunya akar, Ani tetap menggantung padanya.
  await expect(page.getByText('Budi')).toHaveCount(0)
  await expect(page.getByText('Sari', { exact: true })).toBeVisible()
  await expect(page.getByText('Ani', { exact: true })).toHaveCount(1)
})
