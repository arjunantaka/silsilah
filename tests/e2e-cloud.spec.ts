import { test, expect, type Page } from '@playwright/test'
import { orang, dokumen, pasangDokumen, type AnggotaUji } from './e2e-utils'

type BarisKeluarga = { kode: string; nama: string | null; jumlah: number | null }

type KonfigApi = {
  daftar?: BarisKeluarga[]
  dokumen?: Record<string, unknown>
  gagalPut?: boolean
  gagalHapus?: boolean
  gagalDaftar?: boolean
  /** false = PUT sukses tapi tidak mengubah dokumen cloud (untuk menguji konflik berulang). */
  simpanPut?: boolean
}

type BodyPut = {
  kode?: string
  data?: { nama_keluarga?: string; anggota?: { nama?: string }[] }
}

type ApiUji = {
  put: BodyPut[]
  hapus: URLSearchParams[]
  urutan: string[]
  daftar: BarisKeluarga[]
  dokumen: Record<string, unknown>
  gagalPut: boolean
  gagalHapus: boolean
  gagalDaftar: boolean
  simpanPut: boolean
}

/**
 * Mock seluruh /api: dokumen per kode, daftar keluarga, dan kegagalan yang bisa
 * dinyalakan/dimatikan di tengah tes. Permintaan PUT/DELETE dicatat beserta
 * urutannya agar tes bisa membuktikan "simpan dulu, baru hapus".
 */
async function mockApi(page: Page, awal: KonfigApi = {}): Promise<ApiUji> {
  const api: ApiUji = {
    put: [],
    hapus: [],
    urutan: [],
    daftar: [],
    dokumen: {},
    gagalPut: false,
    gagalHapus: false,
    gagalDaftar: false,
    simpanPut: true,
  }
  Object.assign(api, awal)
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()

    if (url.pathname === '/api/families' && method === 'GET') {
      if (api.gagalDaftar) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, pesan: 'Cloud tidak tersedia.' }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: api.daftar }),
      })
    }

    if (url.pathname === '/api/data' && method === 'PUT') {
      // Body dari aplikasi sendiri (PUT /api/data); bentuknya sudah diketahui.
      const body = req.postDataJSON() as BodyPut
      api.put.push(body)
      api.urutan.push('PUT')
      if (api.gagalPut) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, pesan: 'Cloud sedang gangguan.' }),
        })
      }
      if (api.simpanPut && body.kode && body.data) api.dokumen[body.kode] = body.data
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: body.kode }),
      })
    }

    if (url.pathname === '/api/data' && method === 'DELETE') {
      const kode = (url.searchParams.get('kode') || '').toLowerCase()
      api.hapus.push(url.searchParams)
      api.urutan.push('DELETE')
      if (api.gagalHapus) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, pesan: 'Cloud tidak tersedia.' }),
        })
      }
      delete api.dokumen[kode]
      api.daftar = api.daftar.filter((f) => f.kode !== kode)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: kode }),
      })
    }

    if (url.pathname === '/api/data' && method === 'GET') {
      const kode = (url.searchParams.get('kode') || '').toLowerCase()
      const doc = api.dokumen[kode]
      if (!doc) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, pesan: 'Kode belum ada di cloud. Simpan dulu dari aplikasi.' }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: doc }),
      })
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false }),
    })
  })
  return api
}

/**
 * Bentuk anggota persis seperti hasil normalisasi muatAwal() di store:
 * urutan kunci ikut menentukan kesamaan JSON, bukan hanya nilainya.
 */
function anggotaTernormal(a: AnggotaUji) {
  return {
    kode: a.kode ?? '',
    tempat_lahir: a.tempat_lahir ?? '',
    alamat: a.alamat ?? '',
    pekerjaan: a.pekerjaan ?? '',
    pisah: a.pisah ?? [],
    id: a.id,
    nama: a.nama,
    gender: a.gender ?? '',
    lahir: a.lahir ?? '',
    wafat: a.wafat ?? '',
    catatan: a.catatan ?? '',
    ayah: a.ayah ?? null,
    ibu: a.ibu ?? null,
    pasangan: a.pasangan ?? [],
  }
}

type IsiLokal = { nama_keluarga?: string; anggota: { nama?: string }[] }

function bacaLokal(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem('silsilah:v1') || '{}') as IsiLokal,
  )
}

/** Catat semua dialog; confirm diterima, alert ditutup. */
function catatDialog(page: Page) {
  const pesan: string[] = []
  page.on('dialog', (d) => {
    pesan.push(d.type() + ': ' + d.message())
    if (d.type() === 'confirm') void d.accept()
    else void d.dismiss()
  })
  return pesan
}

test('membuka ?kode dengan perangkat kosong memuat dokumen dari cloud', async ({ page }) => {
  const cloud = dokumen('Keluarga Budi', [
    orang('b', 'Budi'),
    orang('s', 'Sari', { gender: 'P' }),
  ])
  await mockApi(page, {
    dokumen: { 'keluarga-budi-77': cloud },
    daftar: [{ kode: 'keluarga-budi-77', nama: 'Keluarga Budi', jumlah: 2 }],
  })

  await page.goto('/?kode=keluarga-budi-77')

  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(page.locator('.status-cloud')).toContainText(
    'Dimuat dari database cloud: keluarga-budi-77 (2 orang)',
  )
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Budi')
  await expect(page.locator('.kode-sinkron')).toHaveText('keluarga-budi-77')
  await expect(page).toHaveURL(/\?kode=keluarga-budi-77$/)
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-budi-77')
})

test('konflik lokal/cloud: Batal pertahankan lokal, OK timpa dengan cloud', async ({ page }) => {
  test.setTimeout(45000)
  const lokal = dokumen('Keluarga Lokal', [orang('l1', 'Lokal Satu'), orang('l2', 'Lokal Dua')])
  const cloud = dokumen('Keluarga Cloud', [orang('c1', 'Cloud Satu')])
  const api = await mockApi(page, { dokumen: { 'keluarga-lokal-1': cloud }, simpanPut: false })

  // Jalur Batal: perangkat dipertahankan dan isinya didorong ke cloud.
  const putPertama = page.waitForRequest(
    (r) => r.method() === 'PUT' && new URL(r.url()).pathname === '/api/data',
  )
  page.once('dialog', (d) => d.dismiss())
  await pasangDokumen(page, lokal, { kode: 'keluarga-lokal-1', url: '/?kode=keluarga-lokal-1' })

  const dikirim = (await putPertama).postDataJSON() as {
    kode: string
    data: { nama_keluarga: string; anggota: { nama: string }[] }
  }
  expect(dikirim.kode).toBe('keluarga-lokal-1')
  expect(dikirim.data.nama_keluarga).toBe('Keluarga Lokal')
  expect(dikirim.data.anggota.map((a) => a.nama)).toEqual(['Lokal Satu', 'Lokal Dua'])

  await expect(page.locator('.kotak')).toHaveCount(2)
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Lokal')
  await expect(page.locator('.status-sinkron')).toContainText('Tersimpan otomatis')
  expect((await bacaLokal(page)).nama_keluarga).toBe('Keluarga Lokal')

  // Jalur OK: dokumen cloud menggantikan dokumen perangkat.
  page.once('dialog', (d) => d.accept())
  await page.reload()

  await expect(page.locator('.kotak')).toHaveCount(1)
  await expect(page.locator('.kotak').getByText('Cloud Satu', { exact: true })).toBeVisible()
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Cloud')
  await expect(page.locator('.status-cloud')).toContainText(
    'Dimuat dari database cloud: keluarga-lokal-1 (1 orang)',
  )
  await expect.poll(async () => (await bacaLokal(page)).nama_keluarga).toBe('Keluarga Cloud')
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-lokal-1')
  expect(api.put.length).toBeGreaterThanOrEqual(1)
})

test('dokumen identik tidak meminta konfirmasi dan melaporkan sudah sama', async ({ page }) => {
  const lokal = dokumen('Keluarga Sama', [
    orang('a', 'Ani', { gender: 'P' }),
    orang('b', 'Budi'),
  ])
  const cloud = { nama_keluarga: lokal.nama_keluarga, anggota: lokal.anggota.map(anggotaTernormal) }
  const dialogs: string[] = []
  page.on('dialog', (d) => {
    dialogs.push(d.message())
    d.dismiss()
  })
  await mockApi(page, { dokumen: { 'keluarga-sama-1': cloud } })

  await pasangDokumen(page, lokal, { kode: 'keluarga-sama-1', url: '/?kode=keluarga-sama-1' })

  await expect(page.locator('.status-cloud')).toContainText(
    'Dokumen di cloud dan perangkat sudah sama: keluarga-sama-1',
  )
  await expect(page.locator('.kotak')).toHaveCount(2)
  expect(dialogs).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-sama-1')
})

test('kode tidak ada di cloud: status gagal, aplikasi tetap bisa dipakai', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockApi(page)

  await page.goto('/?kode=keluarga-hilang-1')

  await expect(page.locator('.status-cloud')).toContainText('Gagal memuat dari database cloud')
  await expect(page.locator('.status-cloud')).toContainText('Kode belum ada di cloud')
  await expect(page.locator('.kotak')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Mulai: Orang Pertama/ })).toBeVisible()

  // Tetap bisa mulai mengisi; tidak ada layar rusak atau error tak tertangani.
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await expect(page.locator('.panel-bawah')).toBeVisible()
  await expect(page.getByLabel('Nama')).toBeVisible()
  expect(errors).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe(null)
})

test('autosave gagal lalu Coba lagi menyimpan dan menampilkan kode', async ({ page }) => {
  test.setTimeout(45000)
  const api = await mockApi(page, { gagalPut: true })
  await pasangDokumen(page, dokumen('Keluarga Retry', [orang('r1', 'Retry Satu')]))

  await expect(page.locator('.status-sinkron')).toContainText('Gagal simpan ke cloud', {
    timeout: 15000,
  })
  const coba = page.getByRole('button', { name: 'Coba lagi' })
  await expect(coba).toBeVisible()
  expect(api.put.length).toBeGreaterThanOrEqual(1)

  api.gagalPut = false
  await coba.click()

  await expect(page.locator('.status-sinkron')).toContainText('Tersimpan otomatis', {
    timeout: 10000,
  })
  await expect(page.locator('.kode-sinkron')).toHaveText(/^keluarga-retry-[a-z0-9]{6}$/)

  const kode = ((await page.locator('.kode-sinkron').textContent()) || '').trim()
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe(kode)
  const terakhir = api.put[api.put.length - 1]
  expect(terakhir.kode).toBe(kode)
  expect(terakhir.data?.anggota?.some((a) => a.nama === 'Retry Satu')).toBe(true)
})

test('pindah keluarga: PUT gagal menahan di dashboard, lalu pindah berhasil', async ({ page }) => {
  test.setTimeout(45000)
  const aktif = dokumen('Keluarga Aktif', [orang('a1', 'Aktif Satu')])
  const target = dokumen('Keluarga Baru', [orang('b1', 'Baru Satu')])
  const api = await mockApi(page, {
    daftar: [
      { kode: 'keluarga-aktif-1', nama: 'Keluarga Aktif', jumlah: 1 },
      { kode: 'keluarga-baru-2', nama: 'Keluarga Baru', jumlah: 1 },
    ],
    dokumen: { 'keluarga-aktif-1': aktif, 'keluarga-baru-2': target },
    gagalPut: true,
  })
  const pesan = catatDialog(page)

  await pasangDokumen(page, aktif, { kode: 'keluarga-aktif-1', url: '/?daftar=1' })
  const bukaBaru = page.locator('.daftar-keluarga .buka-keluarga', { hasText: 'Keluarga Baru' })
  await expect(bukaBaru).toBeVisible()

  // PUT tertunda gagal: alert, tetap di dashboard, keluarga aktif tidak diganti.
  await bukaBaru.click()
  await expect
    .poll(() => pesan.some((p) => p.startsWith('alert:') && p.includes('belum tersimpan')))
    .toBe(true)
  await expect(page.locator('.daftar-layar')).toBeVisible()
  await expect(page).toHaveURL(/\?daftar=1$/)
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-aktif-1')
  await expect(page.locator('.kotak')).toHaveCount(0)

  // Sambungan pulih: simpan berhasil, konfirmasi pindah, lalu dokumen target dimuat.
  api.gagalPut = false
  await bukaBaru.click()

  await expect(page.locator('.kotak').getByText('Baru Satu', { exact: true })).toBeVisible()
  await expect(page.locator('.daftar-layar')).toHaveCount(0)
  await expect(page.locator('.status-cloud')).toContainText(
    'Dimuat dari database cloud: keluarga-baru-2 (1 orang)',
  )
  expect(pesan.some((p) => p.startsWith('confirm:') && p.includes('Buka keluarga keluarga-baru-2?'))).toBe(
    true,
  )
  await expect(page).toHaveURL(/\?kode=keluarga-baru-2$/)
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-baru-2')
})

test('hapus keluarga aktif: simpan dulu, DELETE konfirmasi=ya, dokumen lokal bersih', async ({
  page,
}) => {
  test.setTimeout(45000)
  const aktif = dokumen('Keluarga Aktif', [orang('a1', 'Aktif Satu')])
  const api = await mockApi(page, {
    daftar: [
      { kode: 'keluarga-aktif-1', nama: 'Keluarga Aktif', jumlah: 1 },
      { kode: 'keluarga-cadangan-2', nama: 'Keluarga Cadangan', jumlah: 1 },
    ],
    dokumen: { 'keluarga-aktif-1': aktif },
  })
  catatDialog(page)

  await pasangDokumen(page, aktif, { kode: 'keluarga-aktif-1', url: '/?daftar=1' })
  const hapus = page.getByRole('button', { name: 'Hapus silsilah Keluarga Aktif' })
  await expect(hapus).toBeVisible()

  await hapus.click()

  await expect.poll(() => api.hapus.length).toBe(1)
  expect(api.hapus[0].get('kode')).toBe('keluarga-aktif-1')
  expect(api.hapus[0].get('konfirmasi')).toBe('ya')
  // Dokumen aktif disimpan lebih dulu supaya PUT yang tertunda tidak menulis ulang setelah DELETE.
  const iPertamaPut = api.urutan.indexOf('PUT')
  const iHapus = api.urutan.indexOf('DELETE')
  expect(iPertamaPut).toBeGreaterThanOrEqual(0)
  expect(iHapus).toBeGreaterThan(iPertamaPut)

  await expect(page.locator('.daftar-keluarga')).not.toContainText('Keluarga Aktif')
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Cadangan')
  await expect(page.locator('.status-cloud')).toContainText('Silsilah "Keluarga Aktif" dihapus.')
  await expect(page).toHaveURL(/\?daftar=1$/)

  await expect.poll(async () => (await bacaLokal(page)).anggota.length).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe(null)
})

test('hapus keluarga lain: gagal memberi alert, lalu berhasil tanpa mengganggu data aktif', async ({
  page,
}) => {
  test.setTimeout(45000)
  const aktif = dokumen('Keluarga Aktif', [orang('a1', 'Aktif Satu')])
  const api = await mockApi(page, {
    daftar: [
      { kode: 'keluarga-aktif-1', nama: 'Keluarga Aktif', jumlah: 1 },
      { kode: 'keluarga-cadangan-2', nama: 'Keluarga Cadangan', jumlah: 1 },
    ],
    dokumen: { 'keluarga-aktif-1': aktif },
    gagalHapus: true,
  })
  const pesan = catatDialog(page)

  await pasangDokumen(page, aktif, { kode: 'keluarga-aktif-1', url: '/?daftar=1' })
  const hapusCadangan = page.getByRole('button', { name: 'Hapus silsilah Keluarga Cadangan' })
  await expect(hapusCadangan).toBeVisible()

  // DELETE gagal: alert tampil dan baris tetap ada.
  await hapusCadangan.click()
  await expect
    .poll(() => pesan.some((p) => p.startsWith('alert:') && p.includes('Gagal menghapus silsilah')))
    .toBe(true)
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Cadangan')
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Aktif')
  expect((await bacaLokal(page)).anggota.map((a) => a.nama)).toEqual(['Aktif Satu'])
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-aktif-1')

  // DELETE berhasil: hanya baris target hilang, data keluarga aktif utuh.
  api.gagalHapus = false
  await hapusCadangan.click()
  await expect.poll(() => api.hapus.length).toBe(2)

  await expect(page.locator('.daftar-keluarga')).not.toContainText('Keluarga Cadangan')
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Aktif')
  expect((await bacaLokal(page)).anggota.map((a) => a.nama)).toEqual(['Aktif Satu'])
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-aktif-1')

  // Kembali ke pohon: dokumen kerja tetap seperti semula.
  await page.getByRole('button', { name: /Kembali ke Keluarga Aktif/ }).click()
  await expect(page.locator('.kotak')).toHaveCount(1)
  await expect(page.locator('.kotak').getByText('Aktif Satu', { exact: true })).toBeVisible()
  await expect(page.locator('.kode-sinkron')).toHaveText('keluarga-aktif-1')
  await expect(page).toHaveURL(/\?kode=keluarga-aktif-1$/)
})

test('/api/families gagal: dashboard menampilkan kosong tanpa crash dan tetap bisa kembali', async ({
  page,
}) => {
  const aktif = dokumen('Keluarga Aktif', [orang('a1', 'Aktif Satu')])
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockApi(page, { gagalDaftar: true, dokumen: { 'keluarga-aktif-1': aktif } })

  await pasangDokumen(page, aktif, { kode: 'keluarga-aktif-1', url: '/?daftar=1' })

  await expect(page.locator('.daftar-layar h2')).toHaveText('Daftar Keluarga')
  await expect(page.locator('.daftar-layar')).toContainText('Belum ada keluarga di database.')
  await expect(page.getByRole('button', { name: /Kembali ke Keluarga Aktif/ })).toBeVisible()
  expect(errors).toEqual([])

  // Data lokal tetap bisa dibuka kembali walau daftar cloud gagal dimuat.
  await page.getByRole('button', { name: /Kembali ke Keluarga Aktif/ }).click()
  await expect(page.locator('.kotak')).toHaveCount(1)
  await expect(page.locator('.kode-sinkron')).toHaveText('keluarga-aktif-1')
  await expect(page).toHaveURL(/\?kode=keluarga-aktif-1$/)
})

test('ganti nama: batal dan spasi saja tidak mengubah, nama di-trim dan tersimpan', async ({
  page,
}) => {
  const aktif = dokumen('Keluarga Awal', [orang('a1', 'Aktif Satu')])
  await mockApi(page, { dokumen: { 'keluarga-aktif-1': aktif } })

  const aksi: (string | null)[] = []
  const dialogs: string[] = []
  page.on('dialog', (d) => {
    dialogs.push(d.type() + ': ' + d.message())
    const berikut = aksi.shift()
    if (berikut == null) d.dismiss()
    else d.accept(berikut)
  })

  await pasangDokumen(page, aktif, { kode: 'keluarga-aktif-1' })
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Awal')

  // Batal.
  aksi.push(null)
  await page.locator('.nama-keluarga').click()
  await expect.poll(() => dialogs.length).toBe(1)
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Awal')
  expect((await bacaLokal(page)).nama_keluarga).toBe('Keluarga Awal')

  // Hanya spasi: prompt valid secara teknis, tapi nama tidak boleh berubah.
  aksi.push('   ')
  await page.locator('.nama-keluarga').click()
  await expect.poll(() => dialogs.length).toBe(2)
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Awal')
  expect((await bacaLokal(page)).nama_keluarga).toBe('Keluarga Awal')

  // Nama berisi spasi di ujung: disimpan dalam bentuk ter-trim.
  const put = page.waitForRequest(
    (r) =>
      r.method() === 'PUT' &&
      new URL(r.url()).pathname === '/api/data' &&
      (r.postData() || '').includes('Keluarga Rapi'),
  )
  aksi.push('  Keluarga Rapi  ')
  await page.locator('.nama-keluarga').click()
  await expect.poll(() => dialogs.length).toBe(3)
  const dikirim = (await put).postDataJSON() as { data: { nama_keluarga: string } }
  expect(dikirim.data.nama_keluarga).toBe('Keluarga Rapi')

  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Rapi')
  await expect.poll(async () => (await bacaLokal(page)).nama_keluarga).toBe('Keluarga Rapi')
})

test('?daftar=1 tanpa data lokal dan keluarga kosong menampilkan ajakan mulai', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockApi(page)

  await page.goto('/?daftar=1')

  await expect(page.locator('.daftar-layar h2')).toHaveText('Daftar Keluarga')
  await expect(page.locator('.daftar-layar')).toContainText('Belum ada keluarga di database.')
  await expect(page.getByRole('button', { name: /Silsilah Baru/ })).toBeVisible()
  await expect(page.locator('.kotak')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Kembali ke/ })).toHaveCount(0)
  await expect(page).toHaveURL(/\?daftar=1$/)
  expect(errors).toEqual([])
})
