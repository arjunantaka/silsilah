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
  await page.getByRole('button', { name: /Keluarga Budi/ }).click()
  await expect(page.locator('.kotak')).toHaveCount(3)
})