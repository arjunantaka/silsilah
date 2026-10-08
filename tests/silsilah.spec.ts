import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'fs/promises'

test.describe.configure({ mode: 'serial' })

async function bangunKeluarga(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  // Sheet tetap terbuka setelah simpan; klik yang dimaksud selalu kotak di pohon.
  // Kader bersifat modal: tutup dulu (tap ✕) sebelum pohon bisa diklik.
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

async function buatLepas(page: Page, nama: string, kode = '') {
  await page.getByRole('button', { name: '☰ Menu' }).click()
  await page.getByRole('button', { name: /Tambah Orang \(Lepas\)/ }).click()
  await page.getByLabel('Nama').fill(nama)
  if (kode) await page.locator('#f-kode').fill(kode)
  await page.getByRole('button', { name: 'Simpan' }).click()
}
async function tutupSheet(page: Page) {
  const t = page.locator('.panel-bawah .tutup')
  if (await t.count()) await t.first().click()
}

test('kode manual + data lengkap + peringatan duplikat', async ({ page }) => {
  await bangunKeluarga(page)
  await buatLepas(page, 'Dewi', 'PD-1')
  await expect(page.locator('.kotak', { hasText: 'Dewi' })).toContainText('PD-1')

  // Edit Ani: isi kode + tempat/alamat/pekerjaan → kader menampilkan semuanya
  await page.locator('.kotak', { hasText: 'Ani' }).click()
  await page.getByRole('button', { name: /Edit/ }).click()
  await page.locator('#f-kode').fill('A1')
  await page.locator('#f-tempat').fill('Klaten')
  await page.locator('#f-lahir').fill('1 Jan 2000')
  await page.locator('#f-alamat').fill('Jl. Kenanga 12')
  await page.locator('#f-pekerjaan').fill('Guru SD')
  await page.getByRole('button', { name: 'Simpan' }).click()
  const panel = page.locator('.panel-bawah')
  await expect(panel).toContainText('Lahir: Klaten, 1 Jan 2000')
  await expect(panel).toContainText('Alamat: Jl. Kenanga 12')
  await expect(panel).toContainText('Pekerjaan: Guru SD')
  await expect(page.locator('.panel-kepala h2')).toContainText('A1')
  await tutupSheet(page)

  // Duplikat kode di Sari → peringatan tampil, Simpan tetap jalan
  await page.locator('.kotak', { hasText: 'Sari' }).click()
  await page.getByRole('button', { name: /Edit/ }).click()
  await page.locator('#f-kode').fill('A1')
  await expect(page.locator('.peringatan-kode')).toContainText('Ani')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await expect(page.locator('.kotak', { hasText: 'Sari' })).toContainText('A1')

  await page.reload()
  await expect(page.locator('.kotak', { hasText: 'Dewi' })).toContainText('PD-1')
  await expect(page.locator('.kotak', { hasText: 'Ani' })).toContainText('A1')
})

test('hitungan anak & cucu + tabel keturunan CSV', async ({ page }) => {
  await bangunKeluarga(page)
  // Ani → Putra (kode A1P1), Putra → Dani (kode A1P1B1)
  await page.locator('.kotak', { hasText: 'Ani' }).click()
  await page.getByRole('button', { name: /Tambah Anak/ }).click()
  await page.getByLabel('Nama').fill('Putra')
  await page.locator('#f-kode').fill('A1P1')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet(page)
  await page.locator('.kotak', { hasText: 'Putra' }).click()
  await page.getByRole('button', { name: /Tambah Anak/ }).click()
  await page.getByLabel('Nama').fill('Dani')
  await page.locator('#f-kode').fill('A1P1B1')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet(page)

  // Hitungan di kader Ani: Ani punya 1 anak dan 1 cucu
  // (hasText 'Ani' ikut cocok ke 'Dani': case-insensitive; pakai teks persis)
  await page.locator('.kotak').getByText('Ani', { exact: true }).click()
  const panel = page.locator('.panel-bawah')
  await expect(panel).toContainText('Anak (1):')
  await expect(panel).toContainText('Cucu (1):')
  await expect(panel.locator('.chip-tunggal', { hasText: 'Dani' })).toHaveCount(1)
  await tutupSheet(page)

  // Ekspor tabel keturunan dari Budi
  const dl = page.waitForEvent('download')
  await page.locator('.kotak', { hasText: 'Budi' }).click()
  await page.getByRole('button', { name: /Tabel Keturunan/ }).click()
  const unduhan = await dl
  expect(unduhan.suggestedFilename()).toBe('keturunan-budi.csv')
  const path = await unduhan.path()
  const isi = await readFile(path!, 'utf8')
  expect(isi).toContain('"kode","nama","tempat tanggal lahir","alamat","pekerjaan","suami/istri","orang tua"')
  expect(isi.indexOf('"Budi"')).toBeGreaterThan(0)
  expect(isi.indexOf('"Budi"')).toBeLessThan(isi.indexOf('"Ani"'))
  expect(isi.indexOf('"Ani"')).toBeLessThan(isi.indexOf('"Putra"'))
  expect(isi.indexOf('"Putra"')).toBeLessThan(isi.indexOf('"Dani"'))
  // Kolom relasi: pasangan & orang tua terisi
  expect(isi).toContain('"Sari"') // kolom suami/istri pada baris Budi
  expect(isi).toContain('"Budi & Sari"') // kolom orang tua pada baris Ani
})

test('pencarian nama dan kode manual', async ({ page }) => {
  await bangunKeluarga(page)
  await buatLepas(page, 'Dewi', 'KD-09')

  const cari = page.getByPlaceholder(/Cari nama/)
  await cari.fill('sar')
  await page.locator('.hasil-cari button', { hasText: 'Sari' }).click()
  await expect(page.locator('.panel-kepala h2')).toContainText('Sari')
  await tutupSheet(page)

  await cari.fill('kd-09')
  await expect(page.locator('.hasil-cari button')).toContainText('Dewi · KD-09')
  await page.locator('.hasil-cari button', { hasText: 'Dewi' }).click()
  await expect(page.locator('.panel-kepala h2')).toContainText('Dewi')
})
