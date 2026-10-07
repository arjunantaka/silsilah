import { test, expect, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function bangunKeluarga(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  // Sheet tetap terbuka setelah simpan; klik yang dimaksud selalu kotak di pohon.
  // Kader bersifat modal — tutup dulu (tap ✕) sebelum pohon bisa diklik.
  const kotak = (nama: string) => page.locator('.kotak').getByText(nama, { exact: true })
  const tutupSheet = async () => {
    const t = page.locator('.panel-bawah .tutup')
    if (await t.count()) await t.first().click()
  }
  await tutupSheet()

  await kotak('Budi').click()
  await page.getByRole('button', { name: /Tambah Pasangan/ }).click()
  await page.getByLabel('Nama').fill('Sari')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet()

  await kotak('Budi').click()
  await page.getByRole('button', { name: /Tambah Anak/ }).click()
  await page.getByLabel('Nama').fill('Ani')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet()
  return kotak
}

test('tambah keluarga lengkap & persist', async ({ page }) => {
  const kotak = await bangunKeluarga(page)

  await expect(kotak('Budi')).toBeVisible()
  await expect(kotak('Sari')).toBeVisible()
  await expect(kotak('Ani')).toBeVisible()

  // Bukti autosave localStorage: data tetap ada setelah reload.
  await page.reload()
  await expect(kotak('Budi')).toBeVisible()
  await expect(kotak('Sari')).toBeVisible()
  await expect(kotak('Ani')).toBeVisible()
})

test('hapus membersihkan pointer', async ({ page }) => {
  // Konteks baru tiap tes: bangun ulang state yang sama.
  const kotak = await bangunKeluarga(page)

  page.on('dialog', (d) => d.accept())
  // Kader mungkin masih terbuka dari langkah terakhir bangunKeluarga.
  const silang = page.locator('.panel-bawah .tutup')
  if (await silang.count()) await silang.first().click()
  await kotak('Budi').click()
  await page.getByRole('button', { name: /Hapus/ }).click()

  // Budi hilang; Sari kini satu-satunya akar, Ani tetap menggantung padanya.
  await expect(page.getByText('Budi')).toHaveCount(0)
  await expect(kotak('Sari')).toBeVisible()
  await expect(kotak('Ani')).toBeVisible()
  await expect(page.locator('.kotak').getByText('Ani', { exact: true })).toHaveCount(1)
})
