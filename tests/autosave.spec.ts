import { test, expect } from '@playwright/test'

type PerubahanTerkirim = { kode?: string; nama?: string; perubahan?: { id: string; rec: { nama?: string } | null }[] }

test('create keluarga → tersimpan otomatis dengan kode baru', async ({ page }) => {
  const kirim: PerubahanTerkirim[] = []
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname === '/api/sync') {
      const body = route.request().postDataJSON()
      kirim.push(body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, revisi: kirim.length }),
      })
    } else if (url.pathname === '/api/delta') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, revisi: 0, nama_keluarga: 'Keluarga Saya', ubah: [] }),
      })
    } else if (url.pathname === '/api/data') {
      // Kode baru dicek lewat GET 404; tidak ada data lain di tes ini.
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, pesan: 'Kode belum ada di cloud.' }),
      })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) })
    }
  })

  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await page.waitForTimeout(3500) // debounce 1,5 detik + margin

  expect(kirim.length).toBeGreaterThanOrEqual(1)
  expect(kirim[0].kode).toMatch(/^keluarga-saya-[a-z0-9]{6}$/)
  const perubahan = kirim[0].perubahan ?? []
  expect(perubahan.some((p) => p.rec?.nama === 'Budi')).toBe(true)
  expect(kirim[0].nama).toBe('Keluarga Saya')

  await expect(page.locator('.status-sinkron')).toContainText('Tersimpan otomatis')
  await expect(page.locator('.kode-sinkron')).toHaveText(/^keluarga-saya-[a-z0-9]{6}$/)
})

test('layar kosong menampilkan daftar keluarga dari database', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/families') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: [{ kode: 'keluarga-budi-1', nama: 'Keluarga Budi', jumlah: 3 }] }),
      })
      return
    }
    if (url.pathname === '/api/data' && url.searchParams.get('kode') === 'keluarga-budi-1') {
      const orang = (id: string, nama: string, gender: string, ayah: string | null, ibu: string | null) => ({
        id,
        nama,
        kode: '',
        gender,
        lahir: '',
        wafat: '',
        catatan: '',
        tempat_lahir: '',
        alamat: '',
        pekerjaan: '',
        ayah,
        ibu,
        pasangan: [],
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          revisi: 4,
          data: {
            nama_keluarga: 'Keluarga Budi',
            anggota: [orang('a', 'Budi', 'L', null, null), orang('b', 'Sari', 'P', null, null), orang('c', 'Ani', 'P', 'a', 'b')],
          },
        }),
      })
      return
    }
    if (url.pathname === '/api/delta') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, revisi: 4, nama_keluarga: 'Keluarga Budi', ubah: [] }),
      })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
  })

  await page.goto('/')
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Budi · 3 orang')
  await page.locator('.daftar-keluarga .buka-keluarga', { hasText: 'Keluarga Budi' }).click()
  await expect(page.locator('.kotak')).toHaveCount(3)
})

test('silsilah baru: bersihkan lalu tetap bisa membuka keluarga lama dari daftar', async ({ page }) => {
  page.on('dialog', (d) => d.accept()) // konfirmasi "Silsilah Baru" & alert
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/families') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: [
            { kode: 'keluarga-lama-1', nama: 'Keluarga Lama', jumlah: 1 },
            { kode: 'keluarga-baru-2', nama: 'Keluarga Baru', jumlah: 2 },
          ],
        }),
      })
      return
    }
    if (url.pathname === '/api/data' && url.searchParams.get('kode') === 'keluarga-lama-1') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          revisi: 2,
          data: {
            nama_keluarga: 'Keluarga Lama',
            anggota: [
              {
                id: 'x',
                nama: 'Mbah Slamet',
                kode: '',
                gender: 'L',
                lahir: '',
                wafat: '',
                catatan: '',
                tempat_lahir: '',
                alamat: '',
                pekerjaan: '',
                ayah: null,
                ibu: null,
                pasangan: [],
              },
            ],
          },
        }),
      })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
  })

  await page.goto('/?kode=keluarga-lama-1')
  await expect(page.locator('.kotak')).toHaveCount(1)
  await expect(page.locator('.kode-sinkron')).toHaveText('keluarga-lama-1')

  // Buat silsilah baru dari dashboard: dokumen kerja dikosongkan, kode dilepas.
  await page.getByRole('button', { name: 'Daftar keluarga' }).click()
  await expect(page.locator('.daftar-layar')).toBeVisible()
  await page.getByRole('button', { name: /Silsilah Baru/ }).click()

  await expect(page.locator('.panel-bawah')).toBeVisible() // langsung ke form orang pertama
  expect(await page.evaluate(() => localStorage.getItem('silsilah:kode'))).toBe(null)
  expect(await page.evaluate(() => localStorage.getItem('silsilah:antrean'))).toContain('"entri":[]')
  await page.keyboard.press('Escape')
  await expect(page.locator('.layar-kosong')).toBeVisible()
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Lama')
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Baru')
})

test('perubahan saat kirim berjalan tetap masuk flush berikutnya', async ({ page }) => {
  test.setTimeout(30000)
  const bodies: PerubahanTerkirim[] = []

  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'POST' && url.pathname === '/api/sync') {
      bodies.push(JSON.parse(req.postData() || '{}'))
      // Kirim pertama lambat: perubahan nama terjadi saat request ini masih jalan.
      if (bodies.length === 1) {
        const { promise, resolve } = Promise.withResolvers<void>()
        setTimeout(resolve, 4000)
        await promise
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, revisi: bodies.length }),
      })
      return
    }
    if (url.pathname === '/api/families') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) })
      return
    }
    if (url.pathname === '/api/delta') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, revisi: 0, nama_keluarga: 'Keluarga Saya', ubah: [] }),
      })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
  })
  page.on('dialog', (d) => d.accept('Keluarga Antre'))

  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/api/sync'))
  await page.locator('.nama-keluarga').click()
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Antre')

  await expect.poll(() => bodies.length, { timeout: 15000 }).toBeGreaterThanOrEqual(2)
  expect(bodies[bodies.length - 1]?.nama).toBe('Keluarga Antre')
})

test('hapus keluarga dari dashboard butuh konfirmasi Ya', async ({ page }) => {
  const deleted: URLSearchParams[] = []
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.pathname === '/api/families') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: [
            { kode: 'keluarga-budi-1', nama: 'Keluarga Budi', jumlah: 3, revisi: 2 },
            { kode: 'keluarga-sari-2', nama: 'Keluarga Sari', jumlah: 2, revisi: 1 },
          ],
        }),
      })
      return
    }
    if (req.method() === 'DELETE') {
      deleted.push(url.searchParams)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: url.searchParams.get('kode') }) })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
  })

  await page.goto('/')
  const tombol = page.getByRole('button', { name: 'Hapus silsilah Keluarga Budi' })
  await expect(tombol).toBeVisible()

  // Batal = tidak ada permintaan DELETE dan daftar tetap.
  page.once('dialog', (d) => d.dismiss())
  await tombol.click()
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Budi')
  expect(deleted).toHaveLength(0)

  // Ya = DELETE dengan konfirmasi=ya, lalu baris hilang.
  page.once('dialog', (d) => d.accept())
  await tombol.click()
  await expect.poll(() => deleted.length).toBe(1)
  expect(deleted[0]?.get('kode')).toBe('keluarga-budi-1')
  expect(deleted[0]?.get('konfirmasi')).toBe('ya')
  await expect(page.locator('.daftar-keluarga')).not.toContainText('Keluarga Budi')
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Sari')
})
