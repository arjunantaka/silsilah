import { test, expect, type Page } from '@playwright/test'
import { orang, dokumen, kotak, tutupPanel, bukaOrang, type DokumenUji } from './e2e-utils'

const panelData = (page: Page) => page.locator('.panel-bawah:not(.form-di-atas)')
const formPanel = (page: Page) => page.locator('.panel-bawah.form-di-atas')

/**
 * Mock /api supaya autosave dan daftar keluarga tidak bergantung jaringan.
 * GET /api/data sengaja 404 agar kode keluarga baru dianggap tersedia.
 */
async function siapkanApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'PUT' && url.pathname === '/api/data') {
      let kode = ''
      try {
        kode = JSON.parse(req.postData() || '{}').kode || ''
      } catch {
        kode = ''
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: kode }),
      })
      return
    }
    if (url.pathname === '/api/families') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: [] }),
      })
      return
    }
    if (req.method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
      return
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, pesan: 'Tidak ditemukan' }),
    })
  })
}

/**
 * Seed dokumen hanya pada navigasi pertama. Berbeda dari pasangDokumen yang
 * menimpa localStorage di setiap navigasi, guard ini membuat page.reload()
 * membaca hasil editan - syarat untuk menguji persistensi.
 */
async function pasangSekali(page: Page, doc: DokumenUji) {
  await page.addInitScript((d) => {
    if (!localStorage.getItem('silsilah:v1')) localStorage.setItem('silsilah:v1', JSON.stringify(d))
  }, doc)
  await page.goto('/')
}

/** Baca dokumen kerja dari localStorage untuk memeriksa pembersihan pointer. */
async function bacaDokumen(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('silsilah:v1') || '{"anggota":[]}'))
}

test('nama wajib: simpan kosong tidak menambah orang, simpan valid berhasil', async ({ page }) => {
  await siapkanApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()

  const form = formPanel(page)
  await expect(form).toBeVisible()

  // Submit dengan nama kosong: validasi bawaan menahan form, tidak ada anggota baru.
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(form).toBeVisible()
  expect(
    await page.locator('#f-nama').evaluate((el) => !(el as HTMLInputElement).checkValidity()),
  ).toBe(true)
  await expect(page.locator('.pohon')).toHaveCount(0)
  expect((await bacaDokumen(page)).anggota?.length ?? 0).toBe(0)

  // Nama valid: form tertutup dan orang muncul di pohon.
  await page.locator('#f-nama').fill('Budi')
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(form).toHaveCount(0)
  await expect(kotak(page, 'Budi')).toBeVisible()
  expect((await bacaDokumen(page)).anggota.map((a: { nama: string }) => a.nama)).toEqual(['Budi'])
})

test('Batal membuang isian, Escape menutup form tapi menyisakan kader, batal tidak tersimpan', async ({
  page,
}) => {
  await siapkanApi(page)
  await pasangSekali(
    page,
    dokumen('Batal Uji', [
      orang('budi', 'Budi', { kode: 'A1', tempat_lahir: 'Klaten', pekerjaan: 'Petani' }),
    ]),
  )
  await bukaOrang(page, 'Budi')

  // Batal pada form tambah pasangan: tidak ada orang baru, kader tetap terbuka.
  await page.getByRole('button', { name: /Tambah Pasangan/ }).click()
  const form = formPanel(page)
  await expect(form).toBeVisible()
  await page.locator('#f-nama').fill('Sari')
  await page.locator('.tombol-form').getByRole('button', { name: 'Batal' }).click()
  await expect(form).toHaveCount(0)
  await expect(panelData(page)).toContainText('Budi')
  await expect(kotak(page, 'Sari')).toHaveCount(0)

  // Form edit terisi nilai awal.
  await page.getByRole('button', { name: '✏️ Edit' }).click()
  await expect(form).toBeVisible()
  await expect(page.locator('#f-nama')).toHaveValue('Budi')
  await expect(page.locator('#f-kode')).toHaveValue('A1')
  await expect(page.locator('#f-tempat')).toHaveValue('Klaten')
  await expect(page.locator('#f-pekerjaan')).toHaveValue('Petani')

  // Escape menutup form saja; kader masih tampil dengan data lama.
  await page.locator('#f-nama').fill('Budi Diubah')
  await page.keyboard.press('Escape')
  await expect(form).toHaveCount(0)
  await expect(panelData(page)).toBeVisible()
  await expect(panelData(page).locator('.panel-kepala h2')).toContainText('Budi')

  // Escape berikutnya menutup kader; pembatalan tidak pernah tersimpan.
  await page.keyboard.press('Escape')
  await expect(page.locator('.panel-bawah')).toHaveCount(0)
  await expect(kotak(page, 'Budi')).toHaveCount(1)
  await expect(kotak(page, 'Budi Diubah')).toHaveCount(0)

  await page.reload()
  await expect(kotak(page, 'Budi')).toHaveCount(1)
  await expect(kotak(page, 'Budi Diubah')).toHaveCount(0)
})

test('edit lengkap: gender, lahir/wafat, alamat, pekerjaan, catatan tampil dan bertahan', async ({
  page,
}) => {
  await siapkanApi(page)
  await pasangSekali(page, dokumen('Edit Uji', [orang('budi', 'Budi', { kode: 'A1' })]))
  await bukaOrang(page, 'Budi')

  await page.getByRole('button', { name: '✏️ Edit' }).click()
  const form = formPanel(page)
  await form.getByRole('radio', { name: 'Perempuan' }).check()
  await page.locator('#f-tempat').fill('Klaten')
  await page.locator('#f-lahir').fill('12 Juli 1970')
  await page.locator('#f-wafat').fill('3 Maret 2020')
  await page.locator('#f-alamat').fill('Jl. Kenanga 12, Yogyakarta')
  await page.locator('#f-pekerjaan').fill('Guru SD')
  await page.locator('#f-catatan').fill('Penyabar')
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(form).toHaveCount(0)

  const panel = panelData(page)
  await expect(panel).toContainText('Lahir: Klaten, 12 Juli 1970')
  await expect(panel).toContainText('Wafat: 3 Maret 2020')
  await expect(panel).toContainText('Alamat: Jl. Kenanga 12, Yogyakarta')
  await expect(panel).toContainText('Pekerjaan: Guru SD')
  await expect(panel).toContainText('📝 Penyabar')
  await tutupPanel(page)

  // Kotak pohon merangkum tanggal lahir & wafat.
  await expect(page.locator('.kotak', { hasText: 'Budi' })).toContainText('(12 Juli 1970 - 3 Maret 2020)')

  // Reload: semua field personal (termasuk gender) tetap ada di form edit.
  await page.reload()
  await bukaOrang(page, 'Budi')
  await expect(panelData(page)).toContainText('Wafat: 3 Maret 2020')
  await page.getByRole('button', { name: '✏️ Edit' }).click()
  await expect(page.getByRole('radio', { name: 'Perempuan' })).toBeChecked()
  await expect(page.locator('#f-tempat')).toHaveValue('Klaten')
  await expect(page.locator('#f-lahir')).toHaveValue('12 Juli 1970')
  await expect(page.locator('#f-wafat')).toHaveValue('3 Maret 2020')
  await expect(page.locator('#f-alamat')).toHaveValue('Jl. Kenanga 12, Yogyakarta')
  await expect(page.locator('#f-pekerjaan')).toHaveValue('Guru SD')
  await expect(page.locator('#f-catatan')).toHaveValue('Penyabar')
})

test('dua pasangan: baris kedua memakai acuan ⚭ dan anak mengikuti pasangan yang dipilih', async ({
  page,
}) => {
  await siapkanApi(page)
  await pasangSekali(page, dokumen('Dua Pasangan', [orang('budi', 'Budi', { kode: 'A1' })]))
  await bukaOrang(page, 'Budi')
  const sheet = panelData(page)
  const form = formPanel(page)

  for (const [nama, kode] of [
    ['Sari', 'M1'],
    ['Rani', 'M2'],
  ] as const) {
    await sheet.getByRole('button', { name: /Tambah Pasangan/ }).click()
    await page.locator('#f-nama').fill(nama)
    await page.locator('#f-kode').fill(kode)
    await form.getByRole('button', { name: 'Simpan' }).click()
    await expect(form).toHaveCount(0)
  }

  // Anak pertama: pasangan eksplisit Sari (opsi default, tetap dipilih eksplisit).
  await sheet.getByRole('button', { name: /Tambah Anak/ }).click()
  await page.locator('#f-nama').fill('Ani')
  await page.locator('#f-pasangan').selectOption({ label: 'Sari' })
  await expect(form).toContainText('Orang tua: Budi & Sari')
  await form.getByRole('button', { name: 'Simpan' }).click()

  // Anak kedua: ganti eksplisit ke pasangan Rani.
  await expect(form).toHaveCount(0)
  await sheet.getByRole('button', { name: /Tambah Anak/ }).click()
  await page.locator('#f-nama').fill('Rudi')
  await page.locator('#f-pasangan').selectOption({ label: 'Rani' })
  await expect(form).toContainText('Orang tua: Budi & Rani')
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(form).toHaveCount(0)

  // Pohon: dua baris pernikahan; baris kedua memakai acuan nama + ⚭.
  await tutupPanel(page)
  const baris = page.locator('.pohon > .kolom > .node')
  await expect(baris).toHaveCount(2)
  await expect(baris.nth(0).locator('.kotak', { hasText: 'Sari' })).toHaveCount(1)
  await expect(baris.nth(0).locator('ul.anak .kotak', { hasText: 'Ani' })).toHaveCount(1)
  await expect(baris.nth(1).locator('.rujukan', { hasText: 'Budi' })).toHaveCount(1)
  await expect(baris.nth(1).locator('.kawin')).toHaveText('⚭')
  await expect(baris.nth(1).locator('ul.anak .kotak', { hasText: 'Rudi' })).toHaveCount(1)
  await expect(baris.nth(1).locator('ul.anak .kotak', { hasText: 'Ani' })).toHaveCount(0)
  await expect(page.locator('.kotak')).toHaveCount(5)

  // Detail tiap anak menunjuk orang tua sesuai barisnya.
  await bukaOrang(page, 'Ani')
  await expect(panelData(page)).toContainText('Orang tua: Budi & Sari')
  await tutupPanel(page)
  await bukaOrang(page, 'Rudi')
  await expect(panelData(page)).toContainText('Orang tua: Budi & Rani')
})

test('Pasangkan dengan menyimpan relasi dua arah dan menyaring kandidat', async ({ page }) => {
  await siapkanApi(page)
  await pasangSekali(
    page,
    dokumen('Pasang Uji', [
      orang('anton', 'Anton', { kode: 'A1', pasangan: ['dewi'] }),
      orang('dewi', 'Dewi', { kode: 'D1', gender: 'P', pasangan: ['anton'] }),
      orang('bunga', 'Bunga', { kode: 'B1', gender: 'P' }),
      orang('citra', 'Citra', { kode: 'C1', gender: 'P' }),
    ]),
  )
  await bukaOrang(page, 'Anton')
  await page.getByRole('button', { name: /Pasangkan dengan/ }).click()
  const form = formPanel(page)
  await expect(form).toBeVisible()

  // Diri sendiri dan pasangan yang sudah ada tidak muncul sebagai kandidat.
  const opsi = page.locator('#f-pasang option')
  await expect(opsi).toHaveText(['(pilih orang)', 'Bunga · B1', 'Citra · C1'])

  // Pencarian kode menyaring daftar; kata tanpa hasil memberi pesan.
  await page.locator('#f-cari-pasang').fill('b1')
  await expect(opsi).toHaveText(['(pilih orang)', 'Bunga · B1'])
  await expect(form).toContainText('1 orang, urut A–Z.')
  await page.locator('#f-cari-pasang').fill('zz')
  await expect(form).toContainText('Tidak ada nama yang cocok.')
  await page.locator('#f-cari-pasang').fill('b1')
  await page.locator('#f-pasang').selectOption({ label: 'Bunga · B1' })
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(form).toHaveCount(0)

  // Relasi tampil di kedua arah dan pohon menggambar dua baris pernikahan.
  const panel = panelData(page)
  await expect(panel.locator('.chip-nama', { hasText: 'Bunga' })).toHaveCount(1)
  await expect(panel.locator('.chip-nama', { hasText: 'Dewi' })).toHaveCount(1)
  await tutupPanel(page)
  await expect(page.locator('.pohon .kawin')).toHaveCount(2)
  await expect(page.locator('.kotak')).toHaveCount(4)
  await expect(kotak(page, 'Bunga')).toHaveCount(1)

  await bukaOrang(page, 'Bunga')
  await expect(panelData(page).locator('.chip-nama', { hasText: 'Anton' })).toHaveCount(1)
})

test('Jadikan Anak menyambung ke orang tua lalu melepasnya kembali tanpa duplikat', async ({
  page,
}) => {
  await siapkanApi(page)
  await pasangSekali(
    page,
    dokumen('Sambung Uji', [
      orang('slamet', 'Slamet', { kode: 'A1', pasangan: ['sri'] }),
      orang('sri', 'Sri', { kode: 'A2', gender: 'P', pasangan: ['slamet'] }),
      orang('tono', 'Tono', { kode: 'B1' }),
    ]),
  )
  // Dua akar: pasangan Slamet & Sri, dan Tono yang masih lepas.
  await expect(page.locator('.pohon > .kolom')).toHaveCount(2)
  await expect(page.locator('.kotak')).toHaveCount(3)

  await bukaOrang(page, 'Tono')
  await page.getByRole('button', { name: /Jadikan Anak/ }).click()
  const form = formPanel(page)
  await page.locator('#f-ayah').selectOption({ label: 'Slamet' })
  await page.locator('#f-ibu').selectOption({ label: 'Sri' })
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(form).toHaveCount(0)
  await expect(panelData(page)).toContainText('Orang tua: Slamet & Sri')

  // Pindah ke bawah orang tua: satu akar, Tono tergambar sebagai anak.
  await tutupPanel(page)
  await expect(page.locator('.pohon > .kolom')).toHaveCount(1)
  await expect(page.locator('.pohon ul.anak .kotak', { hasText: 'Tono' })).toHaveCount(1)
  await expect(page.locator('.kotak')).toHaveCount(3)

  // Lepas kedua orang tua: kembali ke akar, tetap satu kotak (tidak dobel).
  await bukaOrang(page, 'Tono')
  await page.getByRole('button', { name: /Jadikan Anak/ }).click()
  await page.locator('#f-ayah').selectOption({ label: '(tidak diketahui)' })
  await page.locator('#f-ibu').selectOption({ label: '(tidak diketahui)' })
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(form).toHaveCount(0)
  await expect(panelData(page)).not.toContainText('Orang tua:')

  await tutupPanel(page)
  await expect(page.locator('.pohon > .kolom')).toHaveCount(2)
  await expect(page.locator('.pohon > .kolom > .node > .unit .kotak', { hasText: 'Tono' })).toHaveCount(1)
  await expect(page.locator('.pohon ul.anak')).toHaveCount(0)
  await expect(page.locator('.kotak')).toHaveCount(3)

  const sisa = await bacaDokumen(page)
  const tono = sisa.anggota.find((a: { id: string }) => a.id === 'tono')
  expect(tono.ayah).toBe(null)
  expect(tono.ibu).toBe(null)
})

test('hapus pasangan berstatus pisah membersihkan pointer tanpa menghapus anak', async ({
  page,
}) => {
  await siapkanApi(page)
  await pasangSekali(
    page,
    dokumen('Hapus Pasangan', [
      orang('budi', 'Budi', { kode: 'A1', pasangan: ['sari'] }),
      orang('sari', 'Sari', { kode: 'M1', gender: 'P', pasangan: ['budi'] }),
      orang('ani', 'Ani', { kode: 'A2', gender: 'P', ayah: 'budi', ibu: 'sari' }),
    ]),
  )
  await bukaOrang(page, 'Budi')

  // Tandai pisah dulu supaya pembersihan pointer `pisah` ikut teruji.
  await page.getByLabel('Tandai pisah dengan Sari').click()
  await expect(panelData(page)).toContainText('(pisah)')
  await expect(page.locator('.pohon .kawin.putus')).toHaveCount(1)
  await tutupPanel(page)

  // Hapus Sari: dialog konfirmasi menyebut anak/pasangan tidak ikut terhapus.
  const pesanDialog: string[] = []
  page.on('dialog', async (d) => {
    pesanDialog.push(d.message())
    await d.accept()
  })
  await bukaOrang(page, 'Sari')
  await page.getByRole('button', { name: '🗑️ Hapus' }).click()
  await expect.poll(() => pesanDialog.length).toBe(1)
  expect(pesanDialog[0]).toContain('Hapus Sari?')
  expect(pesanDialog[0]).toContain('Anak dan pasangan tidak ikut terhapus.')

  // Pohon: Budi + Ani saja, tanpa chip pasangan atau garis pernikahan tersisa.
  await expect(page.locator('.panel-bawah')).toHaveCount(0)
  await expect(kotak(page, 'Sari')).toHaveCount(0)
  await expect(kotak(page, 'Ani')).toHaveCount(1)
  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(page.locator('.pohon .kawin')).toHaveCount(0)

  await bukaOrang(page, 'Budi')
  await expect(panelData(page).locator('.chip')).toHaveCount(0)
  await expect(panelData(page)).not.toContainText('Pasangan:')
  await tutupPanel(page)

  // Anak tidak ikut terhapus; hanya satu orang tua yang diketahui.
  await bukaOrang(page, 'Ani')
  await expect(panelData(page)).toContainText('Orang tua: Budi & ?')

  const sisa = await bacaDokumen(page)
  const budi = sisa.anggota.find((a: { id: string }) => a.id === 'budi')
  const ani = sisa.anggota.find((a: { id: string }) => a.id === 'ani')
  expect(budi.pasangan).toEqual([])
  expect(budi.pisah).toEqual([])
  expect(ani.ayah).toBe('budi')
  expect(ani.ibu).toBe(null)
})

test('hasil pencarian: label relasi, tanpa hasil, batas 12, dan urut kode', async ({ page }) => {
  const kerabat = Array.from({ length: 15 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return orang(`k${n}`, `Kerabat ${n}`, { kode: `K${n}` })
  })
  await siapkanApi(page)
  await pasangSekali(
    page,
    dokumen('Cari Uji', [
      orang('budi', 'Budi', { pasangan: ['sari'] }),
      orang('sari', 'Sari', { kode: 'M1', gender: 'P', pasangan: ['budi'] }),
      orang('ani', 'Ani', { kode: 'A1', gender: 'P', ayah: 'budi', ibu: 'sari' }),
      ...kerabat,
    ]),
  )

  const cari = page.locator('#cari')

  // Tanpa hasil.
  await cari.fill('zzz')
  await expect(page.locator('.hasil-kosong')).toHaveText('Tidak ada yang cocok.')
  await expect(page.locator('.hasil-cari')).toHaveCount(0)

  // Tiga label relasi berbeda pada hasil.
  await cari.fill('ani')
  await expect(page.locator('.hasil-cari button')).toHaveCount(1)
  await expect(page.locator('.hasil-cari button small')).toHaveText('Anak dari Budi & Sari')

  await cari.fill('sari')
  await expect(page.locator('.hasil-cari button')).toHaveCount(1)
  await expect(page.locator('.hasil-cari button small')).toHaveText('Pasangan Budi')

  await cari.fill('kerabat 01')
  await expect(page.locator('.hasil-cari button')).toHaveCount(1)
  await expect(page.locator('.hasil-cari button small')).toHaveText('Akar keluarga')

  // 15 kecocokan dipotong 12, terurut kode.
  await cari.fill('kerabat')
  await expect(page.locator('.hasil-cari button')).toHaveCount(12)
  await expect(page.locator('.hasil-nama')).toHaveText(
    Array.from({ length: 12 }, (_, i) => new RegExp(`^Kerabat ${String(i + 1).padStart(2, '0')}`)),
  )
  await expect(page.locator('.hasil-cari button', { hasText: 'Kerabat 13' })).toHaveCount(0)
})

test('fokus trah: chip saudara dibatasi 8 dan menyembunyikan cabang lain', async ({ page }) => {
  const anak = Array.from({ length: 10 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return orang(`anak${n}`, `Anak ${n}`, {
      kode: `A${n}`,
      ayah: 'kakek',
      ibu: 'nenek',
      ...(i === 0 ? { pasangan: ['menantu'] } : {}),
    })
  })
  await siapkanApi(page)
  await pasangSekali(
    page,
    dokumen('Fokus Trah', [
      orang('kakek', 'Kakek', { kode: 'K0', pasangan: ['nenek'] }),
      orang('nenek', 'Nenek', { kode: 'N0', gender: 'P', pasangan: ['kakek'] }),
      ...anak,
      orang('menantu', 'Menantu 01', { kode: 'X1', gender: 'P', pasangan: ['anak01'] }),
    ]),
  )

  await page.locator('#cari').fill('Anak 01')
  await page.locator('.hasil-cari button', { hasText: 'Anak 01' }).click()

  // Trah Anak 01: dirinya + pasangan, plus 9 saudara (8 chip + "+1").
  const fokus = page.locator('.fokus-trah')
  await expect(fokus).toContainText('Trah Anak 01')
  await expect(fokus).toContainText('2 orang')
  await expect(fokus).toContainText('Anak dari Kakek & Nenek')
  await expect(page.locator('.fokus-saudara .chip-kecil')).toHaveText([
    'Anak 02',
    'Anak 03',
    'Anak 04',
    'Anak 05',
    'Anak 06',
    'Anak 07',
    'Anak 08',
    'Anak 09',
  ])
  await expect(page.locator('.fokus-saudara .saudara-label')).toHaveText(['Saudara:', '+1'])
  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(page.locator('.kotak .nama')).toHaveText(['Anak 01', 'Menantu 01'])

  // Pindah fokus ke saudara: cabang lain (orang tua, pasangan) hilang dari pohon.
  await page.locator('.fokus-saudara .chip-kecil', { hasText: 'Anak 02' }).click()
  await expect(fokus).toContainText('Trah Anak 02')
  await expect(fokus).toContainText('1 orang')
  await expect(page.locator('.kotak')).toHaveCount(1)
  await expect(page.locator('.kotak .nama')).toHaveText(['Anak 02'])
  await expect(kotak(page, 'Kakek')).toHaveCount(0)
  await expect(kotak(page, 'Menantu 01')).toHaveCount(0)

  // Kembali ke silsilah penuh: seluruh 13 kotak tampil lagi.
  await page.getByRole('button', { name: /Kembali ke Silsilah/i }).click()
  await expect(page.locator('.fokus-trah')).toHaveCount(0)
  await expect(page.locator('.kotak')).toHaveCount(13)
})
