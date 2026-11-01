import { test, expect } from '@playwright/test'

test('create keluarga → tersimpan otomatis dengan kode baru', async ({ page }) => {
  const put: { kode?: string; data?: { anggota?: { nama: string }[] } }[] = []
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname === '/api/data' && method === 'PUT') {
      const body = route.request().postDataJSON()
      put.push(body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: body.kode }),
      })
    } else if (url.pathname === '/api/data') {
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

  await page.waitForTimeout(5000) // debounce 3 detik + margin

  expect(put.length).toBeGreaterThanOrEqual(1)
  expect(put[0].kode).toMatch(/^keluarga-saya-[a-z0-9]{6}$/)
  const anggota = put[0].data?.anggota ?? []
  expect(anggota.some((a) => a.nama === 'Budi')).toBe(true)

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
          data: {
            nama_keluarga: 'Keluarga Budi',
            anggota: [orang('a', 'Budi', 'L', null, null), orang('b', 'Sari', 'P', null, null), orang('c', 'Ani', 'P', 'a', 'b')],
          },
        }),
      })
      return
    }
    if (url.pathname === '/api/data') {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) })
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
  await page.keyboard.press('Escape')
  await expect(page.locator('.layar-kosong')).toBeVisible()
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Lama')
  await expect(page.locator('.daftar-keluarga')).toContainText('Keluarga Baru')
})
test('perubahan saat PUT berjalan tetap masuk antrean', async ({ page }) => {
  test.setTimeout(30000)
  /** @type {{ data?: { nama_keluarga?: string } }[]} */
  const bodies: { data?: { nama_keluarga?: string } }[] = []

  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'PUT' && url.pathname === '/api/data') {
      bodies.push(JSON.parse(req.postData() || '{}'))
      // PUT pertama lambat: perubahan nama terjadi saat request ini masih jalan.
      if (bodies.length === 1) await new Promise((r) => setTimeout(r, 5000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: 'keluarga-saya-abc123' }),
      })
      return
    }
    if (url.pathname === '/api/families') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
  })
  page.on('dialog', (d) => d.accept('Keluarga Antre'))

  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()
  await page.getByLabel('Nama').fill('Budi')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await page.waitForRequest((r) => r.method() === 'PUT')
  await page.locator('.nama-keluarga').click()
  await expect(page.locator('.nama-keluarga')).toContainText('Keluarga Antre')

  await expect.poll(() => bodies.length, { timeout: 15000 }).toBeGreaterThanOrEqual(2)
  expect(bodies[bodies.length - 1]?.data?.nama_keluarga).toBe('Keluarga Antre')
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
            { kode: 'keluarga-budi-1', nama: 'Keluarga Budi', jumlah: 3 },
            { kode: 'keluarga-sari-2', nama: 'Keluarga Sari', jumlah: 2 },
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
