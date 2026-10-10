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

  // Sambung satu generasi lagi: Dani → Eka (buyut dari sudut Ani)
  await page.locator('.kotak', { hasText: 'Dani' }).click()
  await page.getByRole('button', { name: /Tambah Anak/ }).click()
  await page.getByLabel('Nama').fill('Eka')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet(page)

  // Hitungan di kader Ani: 1 anak, 1 cucu, 1 buyut, diringkas jadi rantai teks (.kait)
  // (hasText 'Ani' ikut cocok ke 'Dani': case-insensitive; pakai teks persis)
  await page.locator('.kotak').getByText('Ani', { exact: true }).click()
  const panel = page.locator('.panel-bawah')
  await expect(panel).toContainText('Anak (1):')
  await expect(panel).toContainText('Cucu (1):')
  await expect(panel).toContainText('Buyut (1):')
  await expect(panel.locator('.kait', { hasText: 'Dani' })).toHaveCount(1)
  await expect(panel.locator('.kait', { hasText: 'Putra' })).toHaveCount(1)
  // Rantai padat: jarak antar nama bukan chip pil; klik tetap membuka kadernya
  await panel.locator('.kait', { hasText: 'Eka' }).click()
  await expect(page.locator('.panel-kepala h2')).toContainText('Eka')
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

test('tandai pisah + exclude dari CSV keturunan', async ({ page }) => {
  await bangunKeluarga(page)

  // Budi menikah lagi dengan Rani
  await page.locator('.kotak', { hasText: 'Budi' }).click()
  await page.getByRole('button', { name: /Tambah Pasangan/ }).click()
  await page.getByLabel('Nama').fill('Rani')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet(page)

  // Tandai pisah dengan Sari: chip bertanda, relasi tidak hilang, garis jadi ✕
  await page.locator('.kotak', { hasText: 'Budi' }).click()
  await page.getByLabel('Tandai pisah dengan Sari').click()
  const panel = page.locator('.panel-bawah')
  await expect(panel.locator('.chip', { hasText: 'Sari' })).toContainText('(pisah)')
  await expect(panel.locator('.chip-nama', { hasText: 'Rani' })).toBeVisible()
  await expect(page.locator('.kawin.putus')).toHaveCount(1)

  // Batalkan: tanda hilang, garis kembali ⚭
  await page.getByLabel('Batalkan pisah dengan Sari').click()
  await expect(panel.locator('.chip', { hasText: 'Sari' })).not.toContainText('(pisah)')
  await page.getByLabel('Tandai pisah dengan Sari').click()
  await tutupSheet(page)

  // CSV keturunan Budi: Sari dikecualikan dari kolom suami/istri, Rani tetap ada
  const dl = page.waitForEvent('download')
  await page.locator('.kotak', { hasText: 'Budi' }).click()
  await page.getByRole('button', { name: /Tabel Keturunan/ }).click()
  const unduhan = await dl
  const isi = await readFile(await unduhan.path()!, 'utf8')
  expect(isi).toContain('"Rani"')
  expect(isi).not.toContain('"Sari"')
})

test('CSV utama: kolom kode dulu & baris terurut kode', async ({ page }) => {
  await bangunKeluarga(page)
  await buatLepas(page, 'Dewi', 'A2')
  await tutupSheet(page)

  // Kode: Ani A1B1, Sari A1; Budi tanpa kode → harus di baris terakhir data
  for (const [nama, kode] of [['Ani', 'A1B1'], ['Sari', 'A1']] as const) {
    await page.locator('.kotak', { hasText: nama }).click()
    await page.getByRole('button', { name: /Edit/ }).click()
    await page.locator('#f-kode').fill(kode)
    await page.getByRole('button', { name: 'Simpan' }).click()
    await tutupSheet(page)
  }

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: '☰ Menu' }).click()
  await page.getByRole('button', { name: /Unduh CSV/ }).click()
  const unduhan = await dl
  const isi = await readFile(await unduhan.path()!, 'utf8')
  expect(isi).toContain('"kode","nama","gender","tempat_lahir"')
  const iA1 = isi.indexOf('"A1"')
  const iA1B1 = isi.indexOf('"A1B1"')
  const iA2 = isi.indexOf('"A2"')
  // Baris Budi sendiri: kode kosong di awal ("","Budi",...) - nama Budi juga muncul
  // sebagai kolom ayah pada baris Ani, jadi jangan pakai indexOf('"Budi"').
  const iBudi = isi.indexOf('\n"","Budi"')
  expect(iA1).toBeGreaterThan(0)
  expect(iA1).toBeLessThan(iA1B1)
  expect(iA1B1).toBeLessThan(iA2)
  expect(iA2).toBeLessThan(iBudi)
})

test('anak dengan satu orang tua tidak hilang dari pohon', async ({ page }) => {
  await bangunKeluarga(page)

  // Istri kedua Budi (menantu tanpa orang tua sendiri)
  await page.locator('.kotak', { hasText: 'Budi' }).click()
  await page.getByRole('button', { name: /Tambah Pasangan/ }).click()
  await page.getByLabel('Nama').fill('Rani')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet(page)

  // Orang lepas, disambungkan hanya ke ibunya (ayah dibiarkan tidak diketahui)
  await buatLepas(page, 'Yuni')
  await tutupSheet(page)
  await page.locator('.kotak', { hasText: 'Yuni' }).click()
  await page.getByRole('button', { name: /Jadikan Anak/ }).click()
  await page.locator('#f-ibu').selectOption({ label: 'Rani' })
  await page.getByRole('button', { name: 'Simpan' }).click()
  await tutupSheet(page)

  // Tidak dobel, tidak hilang: 5 orang = 5 kotak
  await expect(page.locator('.kotak')).toHaveCount(5)
  // Yuni tergambar di baris ibunya (Rani), bukan di baris istri pertama
  const barisRani = page.locator('.node', { has: page.locator('.kotak', { hasText: 'Rani' }) })
  await expect(barisRani.locator('ul.anak .kotak', { hasText: 'Yuni' })).toHaveCount(1)
  // Baris istri kedua tetap terlihat tersambung: acuan nama suami + simbol pernikahan
  await expect(barisRani.locator('.rujukan', { hasText: 'Budi' })).toHaveCount(1)
  await expect(barisRani.locator('.kawin')).toHaveCount(1)

  // Yuni ikut masuk keturunan Budi (ibunya istri Budi); sisi ayah ditandai "ayah X"
  await page.locator('.kotak').getByText('Budi', { exact: true }).click()
  const panel = page.locator('.panel-bawah')
  await expect(panel).toContainText('Anak (2):')
  await expect(panel.locator('.kait', { hasText: 'Yuni' })).toHaveCount(1)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: /Tabel Keturunan/ }).click()
  const isi = await readFile(await (await dl).path()!, 'utf8')
  expect(isi).toContain('"Yuni"')
  expect(isi).toContain('"ayah X & Rani"')
  // Ani punya kedua orang tua → tanpa penanda X
  expect(isi).toContain('"Budi & Sari"')
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
