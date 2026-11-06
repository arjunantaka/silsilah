// Sinkron dua user SUNGGUHAN: dua konteks browser terisolasi melawan
// wrangler pages dev + D1 lokal (data produksi diimpor). Inilah gerjak utama
// plan-003: perubahan user mana pun tersimpan otomatis dan muncul di
// perangkat lain tanpa reload, tanpa dialog.
import { test, expect, type BrowserContext, type APIRequestContext, type Page } from '@playwright/test'

const BASE = 'http://127.0.0.1:8788'

async function buatKeluargaUji(api: APIRequestContext, kode: string) {
  const r = await api.post(`${BASE}/api/sync`, {
    data: {
      kode,
      nama: 'Keluarga Uji Dua User',
      perubahan: [
        {
          id: 'a',
          rec: { id: 'a', nama: 'Ani', kode: '', gender: 'P', lahir: '', wafat: '', catatan: '', ayah: null, ibu: null, pasangan: [] },
        },
      ],
    },
  })
  expect(r.ok()).toBeTruthy()
}

async function hapusKeluargaUji(api: APIRequestContext, kode: string) {
  const g = await (await api.get(`${BASE}/api/data?kode=${kode}`)).json()
  if (g?.ok) await api.delete(`${BASE}/api/data?kode=${kode}&konfirmasi=ya&revisi=${g.revisi}`)
}

async function tambahOrang(page: Page, nama: string) {
  await page.getByRole('button', { name: '☰ Menu' }).click()
  await page.getByRole('button', { name: /Tambah Orang/ }).click()
  await page.getByLabel('Nama').fill(nama)
  await page.getByRole('button', { name: 'Simpan' }).click()
}

test('dua user: edit satu user muncul otomatis di user lain tanpa reload', async ({ browser, request }) => {
  const kode = `uji-dua-user-${Date.now().toString(36)}`
  await buatKeluargaUji(request, kode)

  // User A dan user B: konteks terisolasi, localStorage masing-masing.
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const halA = await ctxA.newPage()
  await halA.goto(`${BASE}/?kode=${kode}`)
  await expect(halA.locator('.kotak')).toHaveCount(1)

  const halB = await ctxB.newPage()
  await halB.goto(`${BASE}/?kode=${kode}`)
  await expect(halB.locator('.kotak')).toHaveCount(1)

  // A menambah orang; B menerima tanpa reload dalam jendela polling.
  await tambahOrang(halA, 'Budi dari A')
  await expect(halA.locator('.status-sinkron')).toContainText('Tersimpan otomatis', { timeout: 10000 })
  await expect(halB.locator('.kotak', { hasText: 'Budi dari A' })).toHaveCount(1, { timeout: 15000 })

  // A menghapus orang; B melihat hilangnya lewat delta (tombstone).
  halA.on('dialog', (d) => d.accept())
  await halA.locator('.kotak', { hasText: 'Budi dari A' }).first().click()
  await halA.getByRole('button', { name: /🗑️ Hapus/ }).click()
  await expect(halB.locator('.kotak', { hasText: 'Budi dari A' })).toHaveCount(0, { timeout: 15000 })

  await hapusKeluargaUji(request, kode)
  await ctxA.close()
  await ctxB.close()
})

test('offline lalu online: antrean terkirim dan sampai ke database', async ({ browser, request }) => {
  const kode = `uji-offline-${Date.now().toString(36)}`
  await buatKeluargaUji(request, kode)

  const ctxA = await browser.newContext()
  const halA = await ctxA.newPage()
  await halA.goto(`${BASE}/?kode=${kode}`)
  await expect(halA.locator('.kotak')).toHaveCount(1)

  // Putuskan hanya pengiriman; GET/delta tetap jalan.
  await halA.route('**/api/sync', (r) => r.abort())
  await tambahOrang(halA, 'Cici Offline')
  await expect(halA.locator('.status-sinkron')).toContainText('Offline', { timeout: 10000 })
  await expect(halA.locator('.kotak', { hasText: 'Cici Offline' })).toHaveCount(1)

  // Sambung lagi: antrean terkirim otomatis, database menerima.
  await halA.unroute('**/api/sync')
  await halA.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(halA.locator('.status-sinkron')).toContainText('Tersimpan otomatis', { timeout: 10000 })

  const g = await (await request.get(`${BASE}/api/data?kode=${kode}`)).json()
  const nama = g.data.anggota.map((a: { nama: string }) => a.nama)
  expect(nama).toContain('Cici Offline')

  await hapusKeluargaUji(request, kode)
  await ctxA.close()
})
