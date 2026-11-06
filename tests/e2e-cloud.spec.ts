// E2E cloud: UX sinkronisasi baru di atas mock /api yang meniru D1
// (baris per anggota, revisi sebagai kursor, tombstone, delta).
// Tidak ada lagi skenario konflik "Muat Cloud vs data perangkat": cloud
// selalu menang tanpa dialog (lihat plan-003).
import { test, expect, type Page } from '@playwright/test'
import { orang, dokumen, pasangDokumen, type AnggotaUji } from './e2e-utils'

/** Bentuk body POST /api/sync yang dicatat mock. */
interface PerubahanKirim {
  id: string
  rec: Record<string, unknown> | null
}

interface Kiriman {
  kode: string
  nama: string
  perubahan: PerubahanKirim[]
}
type Baris = { id: string; rec: object | null; rev: number }

function backendPalsu(awal: { kode: string; nama: string; anggota: AnggotaUji[] }[] = []) {
  const keluarga = new Map<string, { nama: string; revisi: number; baris: Map<string, Baris> }>()
  for (const k of awal) {
    keluarga.set(k.kode, {
      nama: k.nama,
      revisi: 1,
      baris: new Map(k.anggota.map((a) => [a.id, { id: a.id, rec: a, rev: 1 }])),
    })
  }
  const catatan = { kirim: [] as Kiriman[], hapus: [] as string[] }
  let gagalKirim = false
  const api = {
    catatan,
    gagalkanKirim() {
      gagalKirim = true
    },
    pulihkanKirim() {
      gagalKirim = false
    },
    /** Edit dari "user lain": langsung ke baris backend, naikkan revisi. */
    ubahLuar(kode: string, id: string, rec: object | null) {
      const k = keluarga.get(kode)
      if (!k) return
      k.revisi += 1
      if (rec === null) k.baris.set(id, { id, rec: null, rev: k.revisi })
      else k.baris.set(id, { id, rec, rev: k.revisi })
    },
    pasang(page: Page, opsi: { tanpaFamilies?: boolean } = {}) {
      return page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url())
        const metode = route.request().method()
        const kode = url.searchParams.get('kode') || ''
        const k = keluarga.get(kode)
        if (metode === 'POST' && url.pathname === '/api/sync') {
          const body = route.request().postDataJSON() as Kiriman
          catatan.kirim.push(body)
          if (gagalKirim) {
            await route.abort()
            return
          }
          let k2 = keluarga.get(body.kode)
          if (!k2) {
            k2 = { nama: body.nama, revisi: 0, baris: new Map() }
            keluarga.set(body.kode, k2)
          }
          k2.revisi += 1
          k2.nama = body.nama
          for (const p of body.perubahan) {
            if (p.rec === null) k2.baris.set(p.id, { id: p.id, rec: null, rev: k2.revisi })
            else k2.baris.set(p.id, { id: p.id, rec: p.rec, rev: k2.revisi })
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, revisi: k2.revisi }),
          })
          return
        }
        if (metode === 'GET' && url.pathname === '/api/delta') {
          if (!k) {
            await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
            return
          }
          const sejak = Number(url.searchParams.get('sejak') || 0)
          const ubah = [...k.baris.values()].filter((b) => b.rev > sejak).sort((a, b) => a.rev - b.rev)
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, revisi: k.revisi, nama_keluarga: k.nama, ubah }),
          })
          return
        }
        if (metode === 'GET' && url.pathname === '/api/data') {
          if (!k) {
            await route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ ok: false, pesan: 'Kode belum ada di cloud. Simpan dulu dari aplikasi.' }),
            })
            return
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              revisi: k.revisi,
              data: { nama_keluarga: k.nama, anggota: [...k.baris.values()].filter((b) => b.rec !== null).map((b) => b.rec) },
            }),
          })
          return
        }
        if (metode === 'DELETE') {
          catatan.hapus.push(kode)
          keluarga.delete(kode)
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: kode }) })
          return
        }
        if (url.pathname === '/api/families') {
          if (opsi.tanpaFamilies) {
            await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
            return
          }
          const daftar = [...keluarga.entries()].map(([kk, v]) => ({ kode: kk, nama: v.nama, jumlah: v.baris.size, revisi: v.revisi }))
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: daftar }) })
          return
        }
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
      })
    },
  }
  return api
}

const DOK_180 = dokumen('Keluarga Besar', Array.from({ length: 180 }, (_, i) => orang(`p${i}`, `Orang ${i}`)))
const CACHE_49 = dokumen('Keluarga Saya', Array.from({ length: 49 }, (_, i) => orang(`c${i}`, `Cache ${i}`)))

test('membuka ?kode dengan perangkat kosong memuat dokumen dari cloud', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-besar-1', nama: 'Keluarga Besar', anggota: DOK_180.anggota }])
  await api.pasang(page)
  await page.goto('/?kode=keluarga-besar-1')
  await expect(page.locator('.cetak-kepala')).toContainText('Keluarga Besar')
  await expect(page.locator('.kotak')).toHaveCount(180)
  await expect(page.locator('.status-sinkron')).toContainText('keluarga-besar-1')
})

test('cache lama di perangkat langsung diganti data cloud, tanpa dialog konflik', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-besar-1', nama: 'Keluarga Besar', anggota: DOK_180.anggota }])
  await api.pasang(page)
  await pasangDokumen(page, CACHE_49, { kode: 'keluarga-besar-1' })
  page.on('dialog', (d) => d.dismiss()) // konflik dulu memakai dialog; sekarang tidak boleh muncul

  await page.goto('/?kode=keluarga-besar-1')
  await expect(page.locator('.cetak-kepala')).toContainText('Keluarga Besar')
  await expect(page.locator('.kotak')).toHaveCount(180)
  await expect(page.locator('.konflik-cloud')).toHaveCount(0)
  // Tidak ada tulisan ulang ke cloud: cloud sudah benar, GET saja.
  expect(api.catatan.kirim).toHaveLength(0)
})

test('delta dari user lain diterapkan tanpa reload lewat tombol Segarkan', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-besar-1', nama: 'Keluarga Besar', anggota: DOK_180.anggota }])
  await api.pasang(page)
  await page.goto('/?kode=keluarga-besar-1')
  await expect(page.locator('.kotak')).toHaveCount(180)

  // "User lain" mengubah satu orang dan menambah satu orang di backend.
  api.ubahLuar('keluarga-besar-1', 'p0', { ...DOK_180.anggota[0], nama: 'Orang 0 Baru' })
  api.ubahLuar('keluarga-besar-1', 'baru-1', orang('baru-1', 'Pendatang Baru'))

  await page.getByRole('button', { name: '🔄 Segarkan' }).click()
  await expect(page.locator('.kotak')).toHaveCount(181)
  await expect(page.locator('.kotak', { hasText: 'Pendatang Baru' })).toHaveCount(1)
  await expect(page.locator('.kotak', { hasText: 'Orang 0 Baru' })).toHaveCount(1)
})

test('hapus oleh user lain juga sampai lewat delta (tombstone)', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-besar-1', nama: 'Keluarga Besar', anggota: DOK_180.anggota }])
  await api.pasang(page)
  await page.goto('/?kode=keluarga-besar-1')
  await expect(page.locator('.kotak')).toHaveCount(180)

  api.ubahLuar('keluarga-besar-1', 'p5', null)
  await page.getByRole('button', { name: '🔄 Segarkan' }).click()
  await expect(page.locator('.kotak')).toHaveCount(179)
})

test('offline: antrean menunggu, status jelas, terkirim begitu pulih (tanpa kehilangan data)', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-besar-1', nama: 'Keluarga Besar', anggota: DOK_180.anggota }])
  await api.pasang(page)
  await page.goto('/?kode=keluarga-besar-1')
  await expect(page.locator('.kotak')).toHaveCount(180)

  api.gagalkanKirim()
  page.on('dialog', (d) => d.accept())
  await page.getByRole('button', { name: '☰ Menu' }).click()
  await page.getByRole('button', { name: /Tambah Orang/ }).click()
  await page.getByLabel('Nama').fill('Anak Offline')
  await page.getByRole('button', { name: 'Simpan' }).click()
  await expect(page.locator('.status-sinkron')).toContainText('Offline', { timeout: 8000 })
  await expect(page.locator('.status-sinkron')).toContainText('1 perubahan')
  await expect(page.locator('.kotak', { hasText: 'Anak Offline' })).toHaveCount(1)

  // Muat ulang saat masih offline: antrean dipulihkan dari localStorage.
  await page.reload()
  await expect(page.locator('.status-sinkron')).toContainText('Offline', { timeout: 8000 })

  // Koneksi pulih: kirim ulang otomatis saat online.
  api.pulihkanKirim()
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.locator('.status-sinkron')).toContainText('Tersimpan otomatis', { timeout: 8000 })
  const kirim = api.catatan.kirim.find((k) => k.perubahan.some((p) => p.rec?.nama === 'Anak Offline'))
  expect(kirim).toBeDefined()
})

test('kode tidak ada di cloud: pesan jelas, aplikasi tetap bisa dipakai', async ({ page }) => {
  const api = backendPalsu()
  await api.pasang(page)
  await pasangDokumen(page, CACHE_49)
  await page.goto('/?kode=keluarga-tidak-ada')
  await expect(page.locator('.status-cloud')).toContainText('belum ada di database')
  // Data perangkat tetap tampil dan bisa diedit; autosave tetap aktif.
  await expect(page.locator('.kotak')).toHaveCount(49)
})

test('/api/families gagal: dashboard menampilkan kosong tanpa crash dan tetap bisa kembali', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-a-1', nama: 'Keluarga A', anggota: [orang('a', 'Ani')] }])
  await api.pasang(page, { tanpaFamilies: true })
  await pasangDokumen(page, dokumen('Keluarga A', [orang('a', 'Ani')]), { kode: 'keluarga-a-1' })
  await page.goto('/?daftar=1')
  await expect(page.locator('.daftar-layar')).toBeVisible()
  await expect(page.locator('.daftar-layar')).toContainText('Belum ada keluarga di database')
  await expect(page.getByRole('button', { name: /Kembali ke/ })).toBeVisible()
  await page.getByRole('button', { name: /Kembali ke/ }).click()
  await expect(page.locator('.kotak')).toHaveCount(1)
})

test('hapus keluarga aktif: simpan dulu, DELETE konfirmasi=ya, dokumen lokal bersih', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-aktif-1', nama: 'Keluarga Aktif', anggota: [orang('a', 'Ani')] }])
  await api.pasang(page)
  await pasangDokumen(page, dokumen('Keluarga Aktif', [orang('a', 'Ani')]), { kode: 'keluarga-aktif-1' })
  await page.goto('/?daftar=1')
  page.on('dialog', (d) => d.accept())

  await page.getByRole('button', { name: 'Hapus silsilah Keluarga Aktif' }).click()
  await expect.poll(() => api.catatan.hapus.length).toBe(1)
  expect(api.catatan.hapus[0]).toContain('keluarga-aktif-1')
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe(null)
  await expect(page.locator('.daftar-layar')).toContainText('Belum ada keluarga di database')
})

test('hapus keluarga lain: data keluarga aktif tidak terganggu', async ({ page }) => {
  const api = backendPalsu([
    { kode: 'keluarga-aktif-1', nama: 'Keluarga Aktif', anggota: [orang('a', 'Ani')] },
    { kode: 'keluarga-lain-2', nama: 'Keluarga Lain', anggota: [orang('b', 'Budi')] },
  ])
  await api.pasang(page)
  await pasangDokumen(page, dokumen('Keluarga Aktif', [orang('a', 'Ani')]), { kode: 'keluarga-aktif-1' })
  await page.goto('/?daftar=1')
  page.on('dialog', (d) => d.accept())

  await page.getByRole('button', { name: 'Hapus silsilah Keluarga Lain' }).click()
  await expect.poll(() => api.catatan.hapus.length).toBe(1)
  expect(api.catatan.hapus[0]).toContain('keluarga-lain-2')
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe('keluarga-aktif-1')
})

test('ganti nama: batal dan spasi saja tidak mengubah, nama di-trim dan tersimpan', async ({ page }) => {
  const api = backendPalsu([{ kode: 'keluarga-nama-1', nama: 'Nama Lama', anggota: [orang('a', 'Ani')] }])
  await api.pasang(page)
  await pasangDokumen(page, dokumen('Nama Lama', [orang('a', 'Ani')]), { kode: 'keluarga-nama-1' })
  await page.goto('/?kode=keluarga-nama-1')

  // Batal: prompt ditutup tanpa nilai.
  page.once('dialog', (d) => d.dismiss())
  await page.locator('.nama-keluarga').click()
  await expect(page.locator('.nama-keluarga')).toContainText('Nama Lama')

  // Spasi saja: tidak mengubah apa pun.
  page.once('dialog', (d) => d.accept('   '))
  await page.locator('.nama-keluarga').click()
  await expect(page.locator('.nama-keluarga')).toContainText('Nama Lama')

  // Nama baru dengan spasi di tepi: di-trim lalu dikirim ke cloud.
  page.once('dialog', (d) => d.accept('  Nama Baru  '))
  await page.locator('.nama-keluarga').click()
  await expect(page.locator('.nama-keluarga')).toContainText('Nama Baru')
  await expect.poll(() => api.catatan.kirim.length, { timeout: 8000 }).toBeGreaterThanOrEqual(1)
  expect(api.catatan.kirim[api.catatan.kirim.length - 1].nama).toBe('Nama Baru')
})

test('?daftar=1 tanpa data lokal dan keluarga kosong menampilkan ajakan mulai', async ({ page }) => {
  const api = backendPalsu()
  await api.pasang(page)
  await page.goto('/?daftar=1')
  await expect(page.locator('.daftar-layar')).toBeVisible()
  await expect(page.locator('.daftar-layar')).toContainText('Belum ada keluarga di database')
})
