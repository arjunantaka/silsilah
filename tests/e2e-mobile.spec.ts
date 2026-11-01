import { test, expect, type Locator, type Page } from '@playwright/test'
import {
  bukaOrang,
  dokumen,
  kotak,
  orang,
  pasangDokumen,
  tutupPanel,
  type AnggotaUji,
} from './e2e-utils'

// Semua skenario di berkas ini berjalan di layar ponsel.
test.use({ viewport: { width: 390, height: 844 } })

const KODE = 'keluarga-uji-1'
const LEBAR = 390

/**
 * Balasan /api palsu yang tenang: daftar keluarga bisa diatur, PUT selalu sukses
 * supaya baris status autosave tidak berubah bentuk di tengah pengukuran.
 */
async function pasangApi(
  page: Page,
  opsi: { keluarga?: { kode: string; nama: string; jumlah: number }[] } = {},
): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.pathname === '/api/families') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: opsi.keluarga ?? [] }),
      })
      return
    }
    if (req.method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: KODE }),
      })
      return
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, pesan: 'tidak ada' }),
    })
  })
}

/** Keluarga kecil: dua akar (berpasangan) dan satu anak. */
function keluargaKecil(): AnggotaUji[] {
  return [
    orang('sutiyo', 'Sutiyo', { kode: 'A1', pasangan: ['sri'] }),
    orang('sri', 'Sri', { kode: 'A1P1', gender: 'P', pasangan: ['sutiyo'] }),
    orang('ani', 'Ani', { kode: 'A1B1', gender: 'P', ayah: 'sutiyo', ibu: 'sri', pasangan: ['bagas'] }),
    orang('bagas', 'Bagas', { kode: 'A1B1P1', pasangan: ['ani'] }),
    orang('dewi', 'Dewi', { kode: 'A1B1B1', gender: 'P', ayah: 'bagas', ibu: 'ani' }),
  ]
}

/**
 * Keluarga lebar 35 orang dengan tiga akar. Cabang Dewi punya delapan anak
 * beserta pasangannya, jadi pohon jauh lebih lebar dari layar ponsel dan
 * fokus pada Dewi/Ani tetap butuh gulir horizontal.
 */
function keluargaBesar(): AnggotaUji[] {
  const daftar: AnggotaUji[] = [
    orang('sutiyo', 'Sutiyo', { kode: 'A1', pasangan: ['sri'] }),
    orang('sri', 'Sri', { kode: 'A1P1', gender: 'P', pasangan: ['sutiyo'] }),
    orang('ani', 'Ani', { kode: 'A1B1', gender: 'P', ayah: 'sutiyo', ibu: 'sri', pasangan: ['bagas'] }),
    orang('bagas', 'Bagas', { kode: 'A1B1P1', pasangan: ['ani'] }),
    orang('dewi', 'Dewi', { kode: 'A1B1B1', gender: 'P', ayah: 'bagas', ibu: 'ani', pasangan: ['rudi'] }),
    orang('rudi', 'Rudi', { kode: 'A1B1B1P1', pasangan: ['dewi'] }),
  ]
  for (let i = 1; i <= 8; i++) {
    daftar.push(
      orang(`cucu${i}`, `Cucu ${i}`, {
        kode: `A1B1B1B${i}`,
        ayah: 'rudi',
        ibu: 'dewi',
        pasangan: [`pendamping${i}`],
      }),
      orang(`pendamping${i}`, `Pendamping ${i}`, {
        kode: `A1B1B1B${i}P1`,
        gender: i % 2 ? 'P' : 'L',
        pasangan: [`cucu${i}`],
      }),
    )
  }
  daftar.push(
    orang('bima', 'Bima', { kode: 'A1B2', ayah: 'sutiyo', ibu: 'sri', pasangan: ['sinta'] }),
    orang('sinta', 'Sinta', { kode: 'A1B2P1', gender: 'P', pasangan: ['bima'] }),
    orang('cici', 'Cici', { kode: 'A1B3', gender: 'P', ayah: 'sutiyo', ibu: 'sri', pasangan: ['hendra'] }),
    orang('hendra', 'Hendra', { kode: 'A1B3P1', pasangan: ['cici'] }),
    orang('dadang', 'Dadang', { kode: 'A1B4', ayah: 'sutiyo', ibu: 'sri', pasangan: ['maya'] }),
    orang('maya', 'Maya', { kode: 'A1B4P1', gender: 'P', pasangan: ['dadang'] }),
    orang('bambang', 'Bambang', { kode: 'A2', pasangan: ['wati'] }),
    orang('wati', 'Wati', { kode: 'A2P1', gender: 'P', pasangan: ['bambang'] }),
    orang('yoga', 'Yoga', { kode: 'A2B1', ayah: 'bambang', ibu: 'wati' }),
    orang('nina', 'Nina', { kode: 'A2B2', gender: 'P', ayah: 'bambang', ibu: 'wati' }),
    orang('sugeng', 'Sugeng', { kode: 'A3', pasangan: ['lastri'] }),
    orang('lastri', 'Lastri', { kode: 'A3P1', gender: 'P', pasangan: ['sugeng'] }),
    orang('fajar', 'Fajar', { kode: 'A3B1', ayah: 'sugeng', ibu: 'lastri' }),
  )
  return daftar
}

/** Kotak elemen; gagal jelas kalau elemen tidak terlihat. */
async function ukuran(locator: Locator) {
  const b = await locator.boundingBox()
  expect(b, 'elemen harus punya kotak').not.toBeNull()
  return b!
}

/** Halaman tidak boleh melebar melewati viewport. */
async function tanpaGulirHorizontal(page: Page): Promise<void> {
  const { isi, layar } = await page.evaluate(() => ({
    isi: document.documentElement.scrollWidth,
    layar: document.documentElement.clientWidth,
  }))
  expect(isi).toBeLessThanOrEqual(layar)
}

test('layar kosong, pohon lebar, dan dashboard tidak menggulir horizontal', async ({ page }) => {
  await pasangApi(page, { keluarga: [{ kode: 'keluarga-lain-2', nama: 'Keluarga Lain', jumlah: 2 }] })
  await page.goto('/')
  await expect(page.locator('.layar-kosong')).toBeVisible()
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Lain')
  await tanpaGulirHorizontal(page)

  // Dokumen lebar dimasukkan seperti hasil autosave sebelumnya.
  await page.evaluate(
    ({ doc, kode }) => {
      localStorage.setItem('silsilah:v1', JSON.stringify(doc))
      localStorage.setItem('silsilah:kode', kode)
    },
    { doc: dokumen('Keluarga Besar Uji', keluargaBesar()), kode: KODE },
  )
  await page.reload()
  await expect(page.locator('.kotak')).toHaveCount(35)
  await tanpaGulirHorizontal(page)

  // Pohon sendiri yang menggulir, bukan halaman.
  const gulir = await page
    .locator('.pohon-wrap')
    .evaluate((el) => ({ isi: el.scrollWidth, layar: el.clientWidth }))
  expect(gulir.isi).toBeGreaterThan(gulir.layar)

  await page.getByRole('button', { name: 'Daftar keluarga' }).click()
  await expect(page.locator('.daftar-layar')).toBeVisible()
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Lain')
  await tanpaGulirHorizontal(page)
  const daftar = await ukuran(page.locator('.daftar-keluarga'))
  expect(daftar.width).toBeLessThanOrEqual(LEBAR)
})

test('target sentuh toolbar, zoom, pencarian, kader, dan form minimal 44px', async ({ page }) => {
  await pasangApi(page)
  await pasangDokumen(page, dokumen('Keluarga Uji', keluargaKecil()), { kode: KODE })
  await expect(page.locator('.kotak').first()).toBeVisible()

  // Toolbar: rumah, menu, dan nama keluarga.
  for (const sasaran of [
    page.getByRole('button', { name: 'Daftar keluarga' }),
    page.getByRole('button', { name: '☰ Menu' }),
    page.locator('.nama-keluarga'),
  ]) {
    const b = await ukuran(sasaran)
    expect(b.height).toBeGreaterThanOrEqual(44)
    expect(b.width).toBeGreaterThanOrEqual(44)
  }

  // Kontrol zoom.
  for (const tombol of [
    page.getByRole('button', { name: 'Perkecil pohon' }),
    page.locator('.kontrol-zoom .persen'),
    page.getByRole('button', { name: 'Perbesar pohon' }),
    page.getByRole('button', { name: 'Pas layar' }),
  ]) {
    const b = await ukuran(tombol)
    expect(b.height).toBeGreaterThanOrEqual(44)
    expect(b.width).toBeGreaterThanOrEqual(44)
  }

  // Pencarian: input dan tiap hasil.
  const cari = await ukuran(page.locator('#cari'))
  expect(cari.height).toBeGreaterThanOrEqual(44)
  await page.locator('#cari').fill('Ani')
  const hasil = page.locator('.hasil-cari')
  await expect(hasil.locator('button')).toHaveCount(1)
  const kotakHasil = await ukuran(hasil)
  expect(kotakHasil.x).toBeGreaterThanOrEqual(0)
  expect(kotakHasil.x + kotakHasil.width).toBeLessThanOrEqual(LEBAR + 1)
  const tinggiHasil = await hasil
    .locator('button')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
  for (const tinggi of tinggiHasil) expect(tinggi).toBeGreaterThanOrEqual(44)
  await page.locator('#cari').fill('')

  // Kader: tombol tutup dan seluruh aksi.
  await bukaOrang(page, 'Ani')
  const tutup = await ukuran(page.locator('.panel-bawah:not(.form-di-atas) .tutup'))
  expect(tutup.height).toBeGreaterThanOrEqual(44)
  expect(tutup.width).toBeGreaterThanOrEqual(44)
  const tinggiAksi = await page
    .locator('.panel-bawah .aksi button')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
  expect(tinggiAksi.length).toBeGreaterThan(0)
  expect(Math.min(...tinggiAksi)).toBeGreaterThanOrEqual(44)

  // Form: isian, Simpan, dan Batal.
  await page.getByRole('button', { name: '✏️ Edit' }).click()
  const form = page.locator('.panel-bawah.form-di-atas')
  await expect(form).toBeVisible()
  for (const sasaran of [form.locator('#f-nama'), form.locator('button[type="submit"]'), form.locator('.tombol-form button').nth(1)]) {
    const b = await ukuran(sasaran)
    expect(b.height).toBeGreaterThanOrEqual(44)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(LEBAR + 1)
  }
})

test('panel bawah muat di layar pendek dan semua isian form terjangkau', async ({ page }) => {
  await page.setViewportSize({ width: LEBAR, height: 600 })
  await pasangApi(page)
  await pasangDokumen(page, dokumen('Keluarga Uji', keluargaKecil()), { kode: KODE })
  await bukaOrang(page, 'Ani')

  const panel = page.locator('.panel-bawah').first()
  const kotakPanel = await ukuran(panel)
  expect(kotakPanel.x).toBeGreaterThanOrEqual(0)
  expect(kotakPanel.x + kotakPanel.width).toBeLessThanOrEqual(LEBAR + 1)
  expect(kotakPanel.y).toBeGreaterThanOrEqual(0)
  const tutup = await ukuran(page.locator('.panel-bawah:not(.form-di-atas) .tutup'))
  expect(tutup.y).toBeGreaterThanOrEqual(0)
  expect(tutup.y + tutup.height).toBeLessThanOrEqual(600)

  await page.getByRole('button', { name: '✏️ Edit' }).click()
  const form = page.locator('.panel-bawah.form-di-atas')
  await expect(form).toBeVisible()
  const gulir = await form.evaluate((el) => ({ isi: el.scrollHeight, layar: el.clientHeight }))
  expect(gulir.isi).toBeGreaterThan(gulir.layar)

  const medan = ['#f-nama', '#f-kode', '.radio-baris', '#f-tempat', '#f-lahir', '#f-alamat', '#f-pekerjaan', '#f-wafat', '#f-catatan']
  for (const sel of medan) {
    const el = form.locator(sel).first()
    await el.scrollIntoViewIfNeeded()
    const b = await ukuran(el)
    expect(b.y).toBeGreaterThanOrEqual(-1)
    expect(b.y + b.height).toBeLessThanOrEqual(601)
  }

  // Tombol Simpan baru terjangkau setelah panel digulir.
  const simpan = form.locator('button[type="submit"]')
  await simpan.scrollIntoViewIfNeeded()
  const kotakSimpan = await ukuran(simpan)
  expect(kotakSimpan.height).toBeGreaterThanOrEqual(44)
  expect(kotakSimpan.y + kotakSimpan.height).toBeLessThanOrEqual(601)

  await page.locator('#f-nama').fill('Ani Baru')
  await simpan.click()
  await expect(page.locator('.panel-bawah')).toHaveCount(1)
  await expect(page.locator('.panel-bawah .panel-kepala h2')).toContainText('Ani Baru')
  await tutupPanel(page)
  await expect(kotak(page, 'Ani Baru')).toBeVisible()
})

test('zoom dibatasi 5%–180%, persen mengembalikan 100%, dan Pas layar menyusutkan pohon', async ({ page }) => {
  await pasangApi(page)
  await pasangDokumen(page, dokumen('Keluarga Besar Uji', keluargaBesar()), { kode: KODE })
  await expect(page.locator('.kotak')).toHaveCount(35)

  const persen = page.locator('.kontrol-zoom .persen')
  await expect(persen).toHaveText('100%')

  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Perbesar pohon' }).click()
  await expect(persen).toHaveText('180%')
  expect(await page.locator('.pohon').evaluate((el) => Number(getComputedStyle(el).zoom))).toBeCloseTo(1.8, 3)

  await persen.click()
  await expect(persen).toHaveText('100%')
  expect(await page.locator('.pohon').evaluate((el) => Number(getComputedStyle(el).zoom))).toBeCloseTo(1, 3)

  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Perkecil pohon' }).click()
  await expect(persen).toHaveText('5%')
  expect(await page.locator('.pohon').evaluate((el) => Number(getComputedStyle(el).zoom))).toBeCloseTo(0.05, 3)

  await persen.click()
  await expect(persen).toHaveText('100%')

  await page.getByRole('button', { name: 'Pas layar' }).click()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const wrap = document.querySelector('.pohon-wrap') as HTMLElement
        const pohon = document.querySelector('.pohon') as HTMLElement
        return pohon.getBoundingClientRect().width - wrap.clientWidth
      }),
    )
    .toBeLessThanOrEqual(0)
  const setelahPas = await page.locator('.pohon').evaluate((el) => Number(getComputedStyle(el).zoom))
  expect(setelahPas).toBeLessThan(1)
  expect(setelahPas).toBeGreaterThanOrEqual(0.05)
})

test('hasil pencarian memusatkan target, lalu Kembali memulihkan pohon penuh pada 100%', async ({ page }) => {
  await pasangApi(page)
  await pasangDokumen(page, dokumen('Keluarga Besar Uji', keluargaBesar()), { kode: KODE })
  await expect(page.locator('.kotak')).toHaveCount(35)

  await page.locator('#cari').fill('Dewi')
  await page.locator('.hasil-cari button', { hasText: 'Dewi' }).click()
  await expect(page.locator('.fokus-trah')).toContainText('Trah Dewi')
  await expect(page.locator('.fokus-trah')).toContainText('18 orang')
  await expect(page.locator('.kotak')).toHaveCount(18)
  await expect(page.locator('.kontrol-zoom .persen')).toHaveText('100%')

  // Target yang terfokus berada di dalam jendela pohon dan butuh gulir.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const wrap = document.querySelector('.pohon-wrap') as HTMLElement | null
        const fokus = document.querySelector('.kotak.fokus') as HTMLElement | null
        if (!wrap || !fokus) return false
        const w = wrap.getBoundingClientRect()
        const f = fokus.getBoundingClientRect()
        return wrap.scrollLeft > 0 && f.left >= w.left - 1 && f.right <= w.right + 1
      }),
    )
    .toBe(true)

  await page.getByRole('button', { name: /Kembali ke Silsilah/ }).click()
  await expect(page.locator('.fokus-trah')).toHaveCount(0)
  await expect(page.locator('.kotak.fokus')).toHaveCount(0)
  await expect(page.locator('.kontrol-zoom .persen')).toHaveText('100%')
  await expect(page.locator('.kotak')).toHaveCount(35)

  // Akar pertama dikembalikan ke jendela pohon pada skala penuh.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const wrap = document.querySelector('.pohon-wrap') as HTMLElement | null
        const akar = document.querySelector('.kotak[data-id="sutiyo"]') as HTMLElement | null
        if (!wrap || !akar) return false
        const w = wrap.getBoundingClientRect()
        const a = akar.getBoundingClientRect()
        return a.left >= w.left - 1 && a.right <= w.right + 1
      }),
    )
    .toBe(true)
  expect(await page.locator('.pohon').evaluate((el) => Number(getComputedStyle(el).zoom))).toBeCloseTo(1, 3)
})

test('fokus trah hanya menampilkan target, pasangan, dan turunannya', async ({ page }) => {
  await pasangApi(page)
  await pasangDokumen(page, dokumen('Keluarga Besar Uji', keluargaBesar()), { kode: KODE })
  await expect(page.locator('.kotak')).toHaveCount(35)

  await page.locator('#cari').fill('Ani')
  await page.locator('.hasil-cari button', { hasText: 'Ani' }).click()
  const banner = page.locator('.fokus-trah')
  await expect(banner).toContainText('Trah Ani')
  await expect(banner.locator('.fokus-info > span')).toHaveText('20 orang')
  await expect(banner.locator('.fokus-info small')).toContainText('Anak dari Sutiyo & Sri')
  await expect(banner.locator('.chip-kecil')).toHaveText(['Bima', 'Cici', 'Dadang'])

  await expect(page.locator('.kotak')).toHaveCount(20)
  await expect(page.locator('.kotak.fokus')).toHaveCount(1)
  for (const nama of ['Ani', 'Bagas', 'Dewi', 'Rudi', 'Cucu 1', 'Cucu 8', 'Pendamping 1', 'Pendamping 8']) {
    await expect(kotak(page, nama)).toHaveCount(1)
  }
  for (const nama of ['Sutiyo', 'Sri', 'Bima', 'Cici', 'Dadang', 'Bambang', 'Yoga', 'Sugeng', 'Fajar']) {
    await expect(kotak(page, nama)).toHaveCount(0)
  }
})

test('dropdown pencarian muat di viewport, bisa digulir, dan hasilnya bisa ditekan', async ({ page }) => {
  await pasangApi(page)
  await pasangDokumen(page, dokumen('Keluarga Besar Uji', keluargaBesar()), { kode: KODE })
  await page.locator('#cari').fill('Cucu')

  const hasil = page.locator('.hasil-cari')
  await expect(hasil).toBeVisible()
  await expect(hasil.locator('button')).toHaveCount(8)
  const kotakHasil = await ukuran(hasil)
  expect(kotakHasil.x).toBeGreaterThanOrEqual(0)
  expect(kotakHasil.x + kotakHasil.width).toBeLessThanOrEqual(LEBAR + 1)

  const info = await hasil.evaluate((el) => ({
    isi: el.scrollHeight,
    layar: el.clientHeight,
    max: getComputedStyle(el).maxHeight,
  }))
  expect(info.isi).toBeGreaterThan(info.layar)
  expect(info.max).toBe('300px')

  const tinggi = await hasil
    .locator('button')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
  for (const t of tinggi) expect(t).toBeGreaterThanOrEqual(44)

  // Gulir ke dasar daftar lalu tekan hasil terakhir.
  const tergulir = await hasil.evaluate((el) => {
    el.scrollTop = el.scrollHeight
    return el.scrollTop
  })
  expect(tergulir).toBeGreaterThan(0)

  await hasil.locator('button').last().click()
  await expect(page.locator('.fokus-trah')).toContainText('Trah Cucu 8')
})

test('menu muat di viewport, aria-expanded mengikuti, dan klik di luar menutupnya', async ({ page }) => {
  await pasangApi(page)
  await pasangDokumen(page, dokumen('Keluarga Uji', keluargaKecil()), { kode: KODE })

  const tombol = page.locator('.tombol-menu')
  await expect(tombol).toHaveAttribute('aria-expanded', 'false')
  await tombol.click()
  await expect(tombol).toHaveAttribute('aria-expanded', 'true')

  const panel = page.locator('.menu-panel')
  await expect(panel).toBeVisible()
  const kotakPanel = await ukuran(panel)
  expect(kotakPanel.x).toBeGreaterThanOrEqual(0)
  expect(kotakPanel.x + kotakPanel.width).toBeLessThanOrEqual(LEBAR + 1)
  expect(kotakPanel.y).toBeGreaterThanOrEqual(0)
  expect(kotakPanel.y + kotakPanel.height).toBeLessThanOrEqual(844)

  const tinggi = await panel
    .locator('button')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
  expect(tinggi).toHaveLength(5)
  expect(Math.min(...tinggi)).toBeGreaterThanOrEqual(44)

  // Klik di area pohon (jauh dari panel) menutup menu.
  await page.locator('.pohon-wrap').click({ position: { x: 4, y: 200 } })
  await expect(panel).toHaveCount(0)
  await expect(tombol).toHaveAttribute('aria-expanded', 'false')
})

test('dashboard ponsel: keluarga aktif di depan, tombol besar, dan kembali tanpa kehilangan data', async ({ page }) => {
  await pasangApi(page, {
    keluarga: [
      { kode: 'keluarga-lain-2', nama: 'Keluarga Lain', jumlah: 4 },
      { kode: 'keluarga-lain-3', nama: 'Keluarga Tiga', jumlah: 1 },
    ],
  })
  await pasangDokumen(page, dokumen('Keluarga Aktif Uji', keluargaKecil()), { kode: KODE })
  await expect(page.locator('.kotak')).toHaveCount(5)

  await page.getByRole('button', { name: 'Daftar keluarga' }).click()
  await expect(page.locator('.daftar-layar')).toBeVisible()

  const baris = page.locator('.baris-keluarga')
  await expect(baris).toHaveCount(3)
  await expect(baris.first()).toContainText('Keluarga Aktif Uji')
  await expect(baris.first()).toContainText('sedang dibuka')

  const buka = await ukuran(baris.first().locator('.buka-keluarga'))
  expect(buka.height).toBeGreaterThanOrEqual(44)
  const hapus = await ukuran(baris.first().locator('.hapus-keluarga'))
  expect(hapus.height).toBeGreaterThanOrEqual(44)
  expect(hapus.width).toBeGreaterThanOrEqual(44)

  const tinggiBesar = await page
    .locator('.daftar-layar > .besar')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
  expect(tinggiBesar.length).toBe(2)
  for (const t of tinggiBesar) expect(t).toBeGreaterThanOrEqual(44)

  await tanpaGulirHorizontal(page)
  const daftar = await ukuran(page.locator('.daftar-keluarga'))
  expect(daftar.width).toBeLessThanOrEqual(LEBAR)
  expect(daftar.x).toBeGreaterThanOrEqual(0)
  expect(daftar.x + daftar.width).toBeLessThanOrEqual(LEBAR + 1)

  // Keluarga aktif dibuka kembali tanpa dialog dan tanpa memuat ulang dokumen.
  await baris.first().locator('.buka-keluarga').click()
  await expect(page.locator('.daftar-layar')).toHaveCount(0)
  await expect(page.locator('.kotak')).toHaveCount(5)
  const jumlahLokal = await page.evaluate(
    () => JSON.parse(localStorage.getItem('silsilah:v1') || '{}').anggota.length,
  )
  expect(jumlahLokal).toBe(5)
})

test('nama keluarga panjang dipotong tanpa mendorong tombol toolbar keluar layar', async ({ page }) => {
  await pasangApi(page)
  const nama = 'Keluarga Besar Trah Sutiyo ' + 'X'.repeat(90)
  await pasangDokumen(page, dokumen(nama, keluargaKecil()), { kode: KODE })
  await expect(page.locator('.kotak').first()).toBeVisible()

  const teks = page.locator('.nama-teks')
  const potong = await teks.evaluate((el) => ({ isi: el.scrollWidth, layar: el.clientWidth }))
  expect(potong.isi).toBeGreaterThan(potong.layar)

  const namaBtn = await ukuran(page.locator('.nama-keluarga'))
  const rumah = await ukuran(page.getByRole('button', { name: 'Daftar keluarga' }))
  const menu = await ukuran(page.getByRole('button', { name: '☰ Menu' }))
  expect(namaBtn.x + namaBtn.width).toBeLessThanOrEqual(rumah.x + 0.5)
  expect(rumah.x + rumah.width).toBeLessThanOrEqual(menu.x + 0.5)
  expect(menu.x + menu.width).toBeLessThanOrEqual(LEBAR)
  expect(rumah.height).toBeGreaterThanOrEqual(44)
  expect(menu.height).toBeGreaterThanOrEqual(44)
  await tanpaGulirHorizontal(page)
})
