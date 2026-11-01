import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'fs/promises'
import { orang, kotak, bukaMenu, bukaOrang, tutupPanel, teksPanel } from './e2e-utils'

// Skenario di file ini sengaja memakai dokumen "tidak sehat" (JSON rusak, field
// lama, pointer yatim, siklus, id/kode ganda, teks raksasa). Fokusnya bukan fitur
// baru, melainkan jaminan bahwa aplikasi tetap terbatas, tidak menggantung, dan
// tidak menghilangkan data.

/** Balasan cloud palsu: daftar keluarga bisa diatur, endpoint lain 404. */
async function mockCloud(
  page: Page,
  keluarga: { kode: string; nama: string | null; jumlah: number | null }[] = [],
) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/families') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: keluarga }),
      })
      return
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, pesan: 'Tidak ada.' }),
    })
  })
}

/**
 * Tanam isi `silsilah:v1` apa adanya. String dipakai mentah (bisa JSON rusak),
 * objek di-JSON.stringify seperti yang dilakukan aplikasi.
 */
async function pasangMentah(page: Page, isi: unknown, kode = '') {
  await page.addInitScript(
    ({ isi, kode }) => {
      localStorage.setItem('silsilah:v1', typeof isi === 'string' ? isi : JSON.stringify(isi))
      if (kode) localStorage.setItem('silsilah:kode', kode)
      else localStorage.removeItem('silsilah:kode')
    },
    { isi, kode },
  )
}

async function dataLokal(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('silsilah:v1') || '{}'))
}

/** Kumpulkan error runtime yang tidak tertangkap; skenario rusak tidak boleh memicunya. */
function catatGalat(page: Page) {
  const galat: string[] = []
  page.on('pageerror', (e) => galat.push(e.message))
  return galat
}

/** Unduh CSV lewat menu utama dan kembalikan isi filenya. */
async function unduhCSVMenu(page: Page) {
  const tunggu = page.waitForEvent('download')
  await bukaMenu(page)
  await page.getByRole('button', { name: /Unduh CSV/ }).click()
  const unduhan = await tunggu
  return readFile((await unduhan.path())!, 'utf8')
}

function dokYatim() {
  return {
    nama_keluarga: 'Yatim',
    anggota: [
      orang('budi', 'Budi', { pasangan: ['sari', 'hantu-pasangan'], pisah: ['hantu-pisah'] }),
      orang('sari', 'Sari', { pasangan: ['budi'] }),
      orang('ani', 'Ani', { ayah: 'budi', ibu: 'sari' }),
      orang('dewi', 'Dewi', { ayah: 'budi', ibu: 'sari' }),
      orang('cucu', 'Cucu', { ayah: 'ani', ibu: 'hantu-ibu' }),
      orang('rara', 'Rara', { ayah: 'hantu-ayah', ibu: 'sari' }),
    ],
  }
}

test('localStorage rusak: layar kosong tampil dan orang pertama bisa ditambah', async ({ page }) => {
  const galat = catatGalat(page)
  await mockCloud(page)
  await pasangMentah(page, '{bukan json')
  await page.goto('/')

  await expect(page.locator('.layar-kosong')).toBeVisible()
  await expect(page.getByRole('button', { name: /Mulai: Orang Pertama/ })).toBeVisible()
  await expect(page.locator('.kotak')).toHaveCount(0)

  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await expect(kotak(page, 'Budi')).toBeVisible()
  const d = await dataLokal(page)
  expect(d.nama_keluarga).toBe('Keluarga Saya')
  expect(d.anggota.map((a: { nama: string }) => a.nama)).toEqual(['Budi'])
  expect(galat).toEqual([])
})

test('dokumen lama tanpa field opsional dinormalisasi tanpa error saat detail/ekspor', async ({ page }) => {
  // Sengaja hanya memuat field inti: kode, tempat_lahir, alamat, pekerjaan, pisah
  // tidak ada, persis seperti dokumen dari versi aplikasi terdahulu.
  const legacy = {
    nama_keluarga: 'Legacy',
    anggota: [
      { id: 'kakek', nama: 'Kakek', gender: 'L', lahir: '1940', wafat: '2010', catatan: '', ayah: null, ibu: null, pasangan: ['nenek'] },
      { id: 'nenek', nama: 'Nenek', gender: 'P', lahir: '1945', wafat: '', catatan: '', ayah: null, ibu: null, pasangan: ['kakek'] },
      { id: 'ayah', nama: 'Ayah', gender: 'L', lahir: '1970', wafat: '', catatan: '', ayah: 'kakek', ibu: 'nenek', pasangan: [] },
    ],
  }
  const galat = catatGalat(page)
  await mockCloud(page)
  await pasangMentah(page, legacy)
  await page.goto('/')

  await expect(page.locator('.kotak')).toHaveCount(3)
  await bukaOrang(page, 'Ayah')
  await expect(page.locator('.panel-bawah')).toContainText('Orang tua: Kakek & Nenek')
  await expect(page.locator('.panel-bawah')).not.toContainText('undefined')

  // Simpan satu perubahan: seluruh dokumen ikut tertulis dengan field default.
  await page.getByRole('button', { name: '✏️ Edit' }).click()
  await page.locator('#f-alamat').fill('Jl. Lama 1')
  await page.getByRole('button', { name: 'Simpan' }).click()

  const d = await dataLokal(page)
  expect(d.anggota).toHaveLength(3)
  for (const a of d.anggota as { nama: string; kode: string; tempat_lahir: string; alamat: string; pekerjaan: string; pisah: string[] }[]) {
    expect(a.kode, a.nama).toBe('')
    expect(a.tempat_lahir, a.nama).toBe('')
    expect(a.pekerjaan, a.nama).toBe('')
    expect(typeof a.alamat, a.nama).toBe('string')
    expect(a.pisah, a.nama).toEqual([])
  }
  expect(d.anggota.find((a: { id: string }) => a.id === 'ayah')).toMatchObject({
    alamat: 'Jl. Lama 1',
    tempat_lahir: '',
    pekerjaan: '',
    kode: '',
  })

  await tutupPanel(page)
  const isi = await unduhCSVMenu(page)
  expect(isi).toContain('"kode","nama","gender","tempat_lahir","lahir","wafat","alamat","pekerjaan","ayah","ibu","pasangan","catatan"')
  for (const nama of ['Kakek', 'Nenek', 'Ayah']) expect(isi).toContain(`"${nama}"`)
  expect(isi).toContain('"Jl. Lama 1"')
  expect(isi).not.toContain('undefined')
  expect(isi.split('\r\n')).toHaveLength(4) // header + 3 orang
  expect(galat).toEqual([])
})

test('pointer yatim diabaikan: semua orang nyata digambar sekali, detail/CSV aman', async ({ page }) => {
  const galat = catatGalat(page)
  await mockCloud(page)
  await pasangMentah(page, dokYatim())
  await page.goto('/')

  await expect(page.locator('.kotak')).toHaveCount(6)
  for (const nama of ['Budi', 'Sari', 'Ani', 'Dewi', 'Cucu', 'Rara']) {
    await expect(kotak(page, nama), nama).toHaveCount(1)
  }

  // Label relasi pencarian tidak boleh menampilkan nama yang tidak ada.
  const cari = page.getByPlaceholder(/Cari nama/)
  await cari.fill('rara')
  await expect(page.locator('.hasil-cari button')).toHaveCount(1)
  await expect(page.locator('.hasil-cari button')).toContainText('Anak dari Sari')
  await expect(page.locator('.hasil-cari button')).not.toContainText('undefined')
  await cari.fill('')

  // Kader tetap bisa dibuka; sisi orang tua yang hilang ditandai "?".
  await bukaOrang(page, 'Rara')
  expect(await teksPanel(page)).toContain('Orang tua: ? & Sari')
  await tutupPanel(page)

  const isi = await unduhCSVMenu(page)
  for (const nama of ['Budi', 'Sari', 'Ani', 'Dewi', 'Cucu', 'Rara']) expect(isi).toContain(`"${nama}"`)
  expect(isi).not.toContain('undefined')
  expect(isi.split('\r\n')).toHaveLength(7) // header + 6 orang
  expect(galat).toEqual([])
})

test('hapus orang nyata membersihkan pointer, pointer yatim lain dibiarkan', async ({ page }) => {
  await mockCloud(page)
  await pasangMentah(page, dokYatim())
  await page.goto('/')
  await expect(page.locator('.kotak')).toHaveCount(6)

  page.on('dialog', (d) => d.accept())
  await bukaOrang(page, 'Budi')
  await page.getByRole('button', { name: '🗑️ Hapus' }).click()

  await expect(page.locator('.kotak').getByText('Budi', { exact: true })).toHaveCount(0)
  await expect(page.locator('.kotak')).toHaveCount(5)

  const d = await dataLokal(page)
  expect(d.anggota.map((a: { id: string }) => a.id)).not.toContain('budi')
  for (const a of d.anggota as { id: string; ayah: string | null; ibu: string | null; pasangan: string[]; pisah: string[] }[]) {
    expect(a.ayah, a.id).not.toBe('budi')
    expect(a.ibu, a.id).not.toBe('budi')
    expect(a.pasangan, a.id).not.toContain('budi')
    expect(a.pisah, a.id).not.toContain('budi')
  }
  // Pointer ke id yang memang tidak pernah ada tidak ikut diubah.
  expect(d.anggota.find((a: { id: string }) => a.id === 'cucu')).toMatchObject({ ibu: 'hantu-ibu' })
  expect(d.anggota.find((a: { id: string }) => a.id === 'rara')).toMatchObject({ ayah: 'hantu-ayah' })
})

test('siklus ayah/ibu tidak menggantungkan halaman; fokus dan kembali tetap terbatas', async ({ page }) => {
  const galat = catatGalat(page)
  await mockCloud(page)
  await pasangMentah(page, {
    nama_keluarga: 'Siklus',
    anggota: [
      orang('a', 'Ayu', { ayah: 'b' }),
      orang('b', 'Bima', { ayah: 'a' }),
      orang('c', 'Citra'),
      orang('d', 'Dewi', { ayah: 'c' }),
    ],
  })
  await page.goto('/')

  // Siklus tanpa akar tidak digambar, dan pohon yang sah tetap muncul utuh.
  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(kotak(page, 'Citra')).toBeVisible()
  await expect(kotak(page, 'Dewi')).toBeVisible()
  await expect(page.locator('.kotak').getByText('Ayu', { exact: true })).toHaveCount(0)

  // Fokus trah dari pencarian: BFS berhenti karena `seen`, bukan berputar.
  // Pemotongan siklus lewat jalur membuat jumlah kotak kecil dan berhingga;
  // jumlah persisnya tidak dijadikan patokan karena cabang siklus memang dirujuk
  // ulang supaya relasinya tetap terlihat.
  await page.getByPlaceholder(/Cari nama/).fill('ayu')
  await expect(page.locator('.hasil-cari button')).toContainText('Anak dari Bima')
  await page.locator('.hasil-cari button', { hasText: 'Ayu' }).click()
  await expect(page.locator('.fokus-trah')).toContainText('Trah Ayu')
  const jumlahKotakSiklus = await page.locator('.kotak').count()
  expect(jumlahKotakSiklus).toBeGreaterThanOrEqual(2)
  expect(jumlahKotakSiklus).toBeLessThanOrEqual(4)

  await page.getByRole('button', { name: /Kembali ke Silsilah/ }).click()
  await expect(page.locator('.fokus-trah')).toHaveCount(0)
  await expect(page.locator('.kotak')).toHaveCount(2)

  // Setelah melewati data bersiklus, fokus pada sub-pohon normal tetap satu kotak per orang.
  await page.getByPlaceholder(/Cari nama/).fill('citra')
  await page.locator('.hasil-cari button', { hasText: 'Citra' }).click()
  await expect(page.locator('.fokus-trah')).toContainText('Trah Citra')
  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(kotak(page, 'Citra')).toHaveCount(1)
  await expect(kotak(page, 'Dewi')).toHaveCount(1)
  await page.getByRole('button', { name: /Kembali ke Silsilah/ }).click()
  await expect(page.locator('.kotak')).toHaveCount(2)

  // Data siklus tidak diubah diam-diam.
  const d = await dataLokal(page)
  const byId = new Map((d.anggota as { id: string }[]).map((a) => [a.id, a]))
  expect(byId.get('a')).toMatchObject({ ayah: 'b' })
  expect(byId.get('b')).toMatchObject({ ayah: 'a' })
  expect(galat).toEqual([])
})

test('dokumen kosong: layar kosong, dashboard tidak mengarang nama tanpa kode, tambah orang jalan', async ({ page }) => {
  await mockCloud(page)
  await pasangMentah(page, { nama_keluarga: 'Kosong Keluarga', anggota: [] })
  await page.goto('/')

  await expect(page.locator('.layar-kosong')).toBeVisible()
  await expect(page.locator('.nama-keluarga')).toContainText('Kosong Keluarga')
  await expect(page.getByRole('button', { name: /Mulai: Orang Pertama/ })).toBeVisible()
  await expect(page.locator('.kotak')).toHaveCount(0)

  // Dashboard: tanpa kode keluarga, dokumen kerja tidak dimasukkan sebagai entri aktif.
  // Dicek saat dokumen masih kosong supaya autosave 3 detik tidak membuat kode baru.
  await page.getByRole('button', { name: 'Daftar keluarga' }).click()
  await expect(page.locator('.daftar-layar')).toBeVisible()
  await expect(page.locator('.daftar-layar')).toContainText('Belum ada keluarga di database')
  await expect(page.locator('.daftar-layar')).not.toContainText('Kosong Keluarga')

  // Muat ulang layar kosong, lalu tambah orang pertama.
  await page.goto('/')
  await expect(page.locator('.layar-kosong')).toBeVisible()
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await expect(kotak(page, 'Budi')).toBeVisible()
  await expect(page.locator('.kotak')).toHaveCount(1)
  const d = await dataLokal(page)
  expect(d.anggota).toHaveLength(1)
})

test('kode duplikat diperingatkan tapi tetap disimpan; pencarian dan CSV tetap benar', async ({ page }) => {
  await mockCloud(page)
  await pasangMentah(page, {
    nama_keluarga: 'Kode Ganda',
    anggota: [orang('budi', 'Budi', { kode: 'A1' }), orang('sari', 'Sari', { kode: 'A1' })],
  })
  await page.goto('/')
  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(page.locator('.kotak .kode')).toHaveText(['A1', 'A1'])

  await bukaMenu(page)
  await page.getByRole('button', { name: /Tambah Orang/ }).click()
  await page.getByLabel('Nama').fill('Cici')
  await page.locator('#f-kode').fill('A1')
  await expect(page.locator('.peringatan-kode')).toContainText('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await expect(page.locator('.kotak')).toHaveCount(3)
  const d = await dataLokal(page)
  expect(d.anggota.filter((a: { kode: string }) => a.kode === 'A1')).toHaveLength(3)

  const cari = page.getByPlaceholder(/Cari nama/)
  await cari.fill('a1')
  await expect(page.locator('.hasil-cari button')).toHaveCount(3)
  await expect(page.locator('.hasil-cari')).toContainText('Cici')
  await cari.fill('')

  const isi = await unduhCSVMenu(page)
  expect(isi.match(/"A1"/g) ?? []).toHaveLength(3)
  expect(isi).toContain('"Cici"')
  expect(isi).not.toContain('undefined')
  expect(isi.split('\r\n')).toHaveLength(4) // header + 3 orang
})

test('id duplikat tidak membuat aplikasi crash dan ekspor tetap memuat keduanya', async ({ page }) => {
  const galat = catatGalat(page)
  await mockCloud(page)
  await pasangMentah(page, {
    nama_keluarga: 'Id Ganda',
    anggota: [
      orang('root', 'Budi'),
      orang('dup', 'Ani'),
      orang('dup', 'Bayu', { ayah: 'root' }),
    ],
  })
  await page.goto('/')

  await expect(kotak(page, 'Budi')).toBeVisible()
  await expect(page.locator('.kotak[data-id="root"]')).toHaveCount(1)
  expect(await page.locator('.kotak').count()).toBeGreaterThanOrEqual(2)

  // Klik kotak ber-id ganda tetap membuka kader tanpa melempar error.
  await page.locator('.kotak[data-id="dup"]').first().click()
  await expect(page.locator('.panel-bawah')).toBeVisible()
  await tutupPanel(page)

  // Ekspor memakai array asli, jadi kedua record tetap ada walau id sama.
  const isi = await unduhCSVMenu(page)
  expect(isi).toContain('"Ani"')
  expect(isi).toContain('"Bayu"')
  expect(galat).toEqual([])
})

test('nama/kode/catatan sangat panjang tetap tampil wajar dan keluar sebagai CSV ter-escape', async ({ page }) => {
  const namaPanjang = 'Ani "Pintar" ' + 'X'.repeat(180)
  const kodePanjang = 'KODE' + '9'.repeat(196)
  const catatanPanjang = 'Catatan "kutip", koma; ' + 'Y'.repeat(150) + '\nbaris kedua'
  await mockCloud(page)
  await pasangMentah(page, {
    nama_keluarga: 'Keluarga Panjang',
    anggota: [
      orang('ani', namaPanjang, { kode: kodePanjang, catatan: catatanPanjang, gender: 'P' }),
      orang('bayu', 'Bayu', { ayah: 'ani' }),
    ],
  })
  await page.goto('/')

  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(kotak(page, namaPanjang)).toBeVisible()
  // Kotak dibatasi CSS; teks panjang tidak boleh melebarkan tata letak halaman.
  const lebar = (await kotak(page, namaPanjang).boundingBox())?.width ?? 0
  expect(lebar).toBeGreaterThan(0)
  expect(lebar).toBeLessThanOrEqual(200)

  await bukaOrang(page, namaPanjang)
  await expect(page.locator('.panel-kepala h2')).toContainText(kodePanjang)
  const panel = await teksPanel(page)
  expect(panel).toContain('Catatan "kutip", koma')
  expect(panel).toContain('baris kedua')
  await tutupPanel(page)

  const isi = await unduhCSVMenu(page)
  expect(isi).toContain(`"${kodePanjang}"`)
  // Kutip di dalam field digandakan sesuai aturan CSV.
  expect(isi).toContain(`"${namaPanjang.replace(/"/g, '""')}"`)
  expect(isi).toContain('""kutip""')
  expect(isi).toContain('baris kedua')
  expect(isi).not.toContain('undefined')
})

for (const [label, isi] of [
  ['array', '[1,2,3]'],
  ['null', 'null'],
] as const) {
  test(`version key berisi ${label} jatuh ke dokumen kosong`, async ({ page }) => {
    const galat = catatGalat(page)
    await mockCloud(page)
    await pasangMentah(page, isi)
    await page.goto('/')

    await expect(page.locator('.layar-kosong')).toBeVisible()
    await expect(page.locator('.kotak')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Mulai: Orang Pertama/ })).toBeVisible()
    // Isi lama tidak ditimpa hanya karena dibuka.
    expect(await page.evaluate(() => localStorage.getItem('silsilah:v1'))).toBe(isi)
    expect(galat).toEqual([])
  })
}

test('kode tersimpan tidak valid tidak memicu ambil dokumen dari cloud', async ({ page }) => {
  const ambilDokumen: string[] = []
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'GET' && url.pathname === '/api/data') ambilDokumen.push(url.search)
    if (url.pathname === '/api/families') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: [] }),
      })
      return
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, pesan: 'Tidak ada.' }),
    })
  })
  await pasangMentah(page, { nama_keluarga: 'Kode Invalid', anggota: [orang('budi', 'Budi')] }, 'Bukan Kode Valid!')
  await page.goto('/')

  await expect(kotak(page, 'Budi')).toBeVisible()
  await expect(page.locator('.status-cloud')).toHaveCount(0)
  expect(ambilDokumen).toEqual([])

  // Parameter URL yang tidak cocok pola juga diabaikan, bukan diambil ke cloud.
  await page.goto('/?kode=BAD')
  await expect(kotak(page, 'Budi')).toBeVisible()
  await expect(page.locator('.status-cloud')).toHaveCount(0)
  expect(ambilDokumen).toEqual([])
})
