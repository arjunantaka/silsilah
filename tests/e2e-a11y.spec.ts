import { test, expect, type Page } from '@playwright/test'
import { bukaOrang, dokumen, kotak, orang, pasangDokumen } from './e2e-utils'

/**
 * Aksesibilitas dasar: label medan, Escape & fokus setelah panel ditutup,
 * aria-expanded menu, wilayah status, nama tombol, alur keyboard murni,
 * indikator fokus, dan nama aksi yang tidak ambigu.
 *
 * Tidak memakai axe (tidak terpasang); semua asersi memakai role/nama aksesibel
 * dan perilaku yang terlihat pengguna.
 */

type OpsiApi = {
  keluarga?: { kode: string; nama: string | null; jumlah: number | null }[]
  /** GET /api/data selalu gagal, untuk memicu status-cloud "Gagal memuat". */
  gagalMuat?: boolean
}

/** Semua panggilan cloud dipalsukan agar tes tidak bergantung Worker/Internet. */
async function palsukanApi(page: Page, opsi: OpsiApi = {}) {
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const kirim = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.pathname === '/api/data' && req.method() === 'PUT') {
      let kode = ''
      try {
        kode = JSON.parse(req.postData() || '{}').kode || ''
      } catch {}
      await kirim(200, { ok: true, data: kode })
      return
    }
    if (url.pathname === '/api/data') {
      if (opsi.gagalMuat) {
        await kirim(503, { ok: false, pesan: 'Cloud sedang gangguan.' })
        return
      }
      await kirim(404, { ok: false, pesan: 'Kode belum ada di cloud.' })
      return
    }
    if (url.pathname === '/api/families') {
      await kirim(200, { ok: true, data: opsi.keluarga ?? [] })
      return
    }
    await kirim(200, { ok: true, data: [] })
  })
}

function keluargaA11y() {
  return dokumen('Keluarga A11y', [
    orang('budi', 'Budi', { kode: 'A1', pasangan: ['sari'] }),
    orang('sari', 'Sari', { kode: 'A2', gender: 'P', pasangan: ['budi'] }),
  ])
}

function panelForm(page: Page) {
  return page.locator('section.panel-bawah.form-di-atas')
}

type Fokus = { tag: string; id: string; text: string }

/** Tekan Tab berulang sampai elemen yang cocok menerima fokus (navigasi keyboard murni). */
async function tabKe(page: Page, cocok: (f: Fokus) => boolean, maks = 60): Promise<Fokus> {
  for (let i = 0; i < maks; i++) {
    await page.keyboard.press('Tab')
    const fokus = await page.evaluate((): Fokus => {
      const el = document.activeElement as HTMLElement | null
      return { tag: el?.tagName ?? '', id: el?.id ?? '', text: (el?.textContent ?? '').trim() }
    })
    if (cocok(fokus)) return fokus
  }
  throw new Error('Tab tidak pernah mencapai elemen yang dituju')
}

/** Gaya outline + status :focus-visible dari elemen yang sedang fokus. */
async function gayaFokus(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return { terfokus: false, outlineStyle: '', outlineWidth: '', focusVisible: false }
    const s = getComputedStyle(el)
    return {
      terfokus: true,
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      focusVisible: el.matches(':focus-visible'),
    }
  })
}

test('semua medan form punya label, nama wajib, gender berupa radiogroup', async ({ page }) => {
  await palsukanApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: /Mulai: Orang Pertama/ }).click()

  const form = panelForm(page)
  await expect(form).toBeVisible()

  // getByLabel membuktikan <label for> terhubung ke kontrol yang tepat;
  // toHaveCount(1) sekaligus menolak label ganda yang membingungkan.
  const medan: [string | RegExp, string][] = [
    ['Nama', 'f-nama'],
    ['Kode', 'f-kode'],
    ['Tempat Lahir', 'f-tempat'],
    ['Tanggal Lahir', 'f-lahir'],
    ['Alamat', 'f-alamat'],
    [/^Pekerjaan/, 'f-pekerjaan'],
    ['Wafat', 'f-wafat'],
    ['Catatan', 'f-catatan'],
  ]
  for (const [label, id] of medan) {
    const kontrol = form.getByLabel(label)
    await expect(kontrol, `label ${String(label)} harus menunjuk satu kontrol`).toHaveCount(1)
    await expect(kontrol).toHaveAttribute('id', id)
    await expect(kontrol).toBeVisible()
  }

  // Hanya nama yang wajib diisi; medan lain opsional.
  await expect(form.getByLabel('Nama', { exact: true })).toHaveJSProperty('required', true)
  await expect(form.getByLabel('Kode', { exact: true })).toHaveJSProperty('required', false)

  const gender = form.getByRole('radiogroup', { name: 'Gender' })
  await expect(gender).toBeVisible()
  await expect(gender.getByRole('radio')).toHaveCount(3)
  await expect(gender.getByRole('radio', { name: 'Laki-laki' })).toBeVisible()
  await expect(gender.getByRole('radio', { name: 'Perempuan' })).toBeVisible()
  await expect(gender.getByRole('radio', { name: '(kosong)' })).toBeVisible()

  // Radio bisa dipilih lewat nama aksesibelnya, bukan lewat posisi CSS.
  await gender.getByRole('radio', { name: 'Perempuan' }).check()
  await expect(gender.getByRole('radio', { name: 'Perempuan' })).toBeChecked()
  await expect(gender.getByRole('radio', { name: 'Laki-laki' })).not.toBeChecked()
})

test('Escape menutup form lebih dulu, lalu kader; fokus tidak tertinggal di panel', async ({ page }) => {
  await palsukanApi(page)
  await pasangDokumen(page, keluargaA11y(), { kode: 'keluarga-a11y-1' })
  await bukaOrang(page, 'Budi')

  const kader = page.locator('section.panel-bawah:not(.form-di-atas)')
  await expect(kader).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tutup', exact: true })).toHaveCount(1)

  await kader.getByRole('button', { name: '✏️ Edit' }).click()
  const form = panelForm(page)
  await expect(form).toBeVisible()
  await expect(kader).toBeVisible()
  await expect(form.locator('.panel-kepala .tutup')).toHaveAccessibleName('Batal')

  // Escape pertama: hanya form yang hilang, kader tetap terbuka.
  await page.keyboard.press('Escape')
  await expect(form).toHaveCount(0)
  await expect(kader).toBeVisible()

  // Escape kedua: kader tertutup dan fokus jatuh kembali ke halaman,
  // bukan tertinggal di tombol yang sudah dilepas dari DOM.
  await page.keyboard.press('Escape')
  await expect(page.locator('.panel-bawah')).toHaveCount(0)
  expect(await page.evaluate(() => document.activeElement?.tagName ?? '')).toBe('BODY')

  // Pohon masih bisa dipakai setelah panel ditutup.
  await bukaOrang(page, 'Budi')
  await expect(page.locator('.panel-bawah')).toHaveCount(1)
})

test('tombol menu: aria-expanded, nama aksi bermakna, klik luar menutup', async ({ page }) => {
  await palsukanApi(page)
  await pasangDokumen(page, keluargaA11y(), { kode: 'keluarga-a11y-1' })

  const menu = page.getByRole('button', { name: '☰ Menu' })
  const panel = page.locator('.menu-panel')

  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toHaveCount(0)

  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).toBeVisible()

  for (const nama of [/Daftar Keluarga/, /Tambah Orang/, /Ganti Nama Keluarga/, /Unduh CSV/, /Cetak \/ PDF/]) {
    await expect(panel.getByRole('button', { name: nama })).toBeVisible()
  }
  await expect(panel.getByRole('button')).toHaveCount(5)

  // Klik di luar menu (area kosong di bawah pohon) menutupnya kembali.
  await page.mouse.click(10, 700)
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toHaveCount(0)
})

test('wilayah status (role=status) tersedia untuk pembaca layar', async ({ page }) => {
  await palsukanApi(page, { gagalMuat: true })
  await pasangDokumen(page, keluargaA11y(), {
    kode: 'keluarga-a11y-1',
    url: '/?kode=keluarga-a11y-1',
  })

  // Status autosave: region status dengan aksi yang bisa dibaca.
  const sinkron = page.locator('.status-sinkron')
  await expect(sinkron).toBeVisible()
  await expect(sinkron).toHaveAttribute('role', 'status')
  await expect(page.getByRole('status').filter({ hasText: 'Salin Tautan' })).toHaveCount(1)

  // Status cloud: pesan offline tidak auto-hilang, jadi aman diuji.
  const cloud = page.locator('.status-cloud')
  await expect(cloud).toBeVisible()
  await expect(cloud).toHaveAttribute('role', 'status')
  await expect(cloud).toContainText('Offline: menampilkan data terakhir')
  await expect(page.getByRole('status').filter({ hasText: 'Offline: menampilkan data terakhir' })).toHaveCount(1)

  // Banner fokus trah juga region status.
  await page.locator('#cari').fill('Sari')
  await page.locator('.hasil-cari button', { hasText: 'Sari' }).click()
  const fokusTrah = page.locator('.fokus-trah')
  await expect(fokusTrah).toBeVisible()
  await expect(fokusTrah).toHaveAttribute('role', 'status')
  await expect(page.getByRole('status').filter({ hasText: 'Trah Sari' })).toHaveCount(1)
})

test('kontrol zoom: grup berlabel dan tombol bernama', async ({ page }) => {
  await palsukanApi(page)
  await pasangDokumen(page, keluargaA11y(), { kode: 'keluarga-a11y-1' })

  const grup = page.getByRole('group', { name: 'Zoom pohon' })
  await expect(grup).toBeVisible()
  await expect(grup.getByRole('button')).toHaveCount(4)
  await expect(grup.getByRole('button', { name: 'Perkecil pohon' })).toBeVisible()
  await expect(grup.getByRole('button', { name: 'Perbesar pohon' })).toBeVisible()
  await expect(grup.getByRole('button', { name: '100%' })).toBeVisible()
  await expect(grup.getByRole('button', { name: 'Pas layar', exact: true })).toBeVisible()
})

test('dashboard: tombol buka/hapus/kembali punya nama yang jelas', async ({ page }) => {
  await palsukanApi(page, {
    keluarga: [{ kode: 'keluarga-a11y-1', nama: 'Keluarga A11y', jumlah: 2 }],
  })
  await pasangDokumen(page, keluargaA11y(), {
    kode: 'keluarga-a11y-1',
    url: '/?daftar=1',
  })

  const layar = page.locator('.daftar-layar')
  await expect(layar).toContainText('Daftar Keluarga')

  const buka = page.locator('.daftar-keluarga .buka-keluarga')
  await expect(buka).toHaveAccessibleName(/Keluarga A11y/)
  await expect(buka).toHaveAccessibleName(/2 orang/)
  await expect(buka).toHaveAccessibleName(/keluarga-a11y-1/)

  // Tombol hapus menyebut keluarga mana yang dihapus, bukan sekadar ikon 🗑️.
  await expect(page.locator('.daftar-keluarga .hapus-keluarga')).toHaveAccessibleName(
    'Hapus silsilah Keluarga A11y',
  )

  await expect(layar.getByRole('button', { name: /Kembali ke Keluarga A11y/ })).toBeVisible()
  await expect(layar.getByRole('button', { name: /Silsilah Baru/ })).toBeVisible()
})

test('buat orang pertama hanya dengan keyboard', async ({ page }) => {
  await palsukanApi(page)
  await page.goto('/')

  // Tab sampai tombol awal, aktifkan dengan Enter (tanpa klik mouse).
  const awal = await tabKe(page, (f) => f.text.includes('Mulai: Orang Pertama'))
  expect(awal.tag).toBe('BUTTON')
  await page.keyboard.press('Enter')

  const form = panelForm(page)
  await expect(form).toBeVisible()
  await expect(kotak(page, 'Ketik Saja')).toHaveCount(0)

  // Tab ke medan Nama, isi lewat keyboard, lalu Enter mengirim form.
  await tabKe(page, (f) => f.id === 'f-nama')
  await page.keyboard.type('Ketik Saja')
  await expect(form.getByLabel('Nama', { exact: true })).toHaveValue('Ketik Saja')
  await page.keyboard.press('Enter')

  await expect(form).toHaveCount(0)
  await expect(kotak(page, 'Ketik Saja')).toBeVisible()
})

test('fokus keyboard terlihat pada tombol dan medan isian', async ({ page }) => {
  await palsukanApi(page)
  await page.goto('/')

  const tombol = await tabKe(page, (f) => f.text.includes('Mulai: Orang Pertama'))
  expect(tombol.tag).toBe('BUTTON')
  const gayaTombol = await gayaFokus(page)
  expect(gayaTombol.terfokus).toBe(true)
  expect(gayaTombol.focusVisible).toBe(true)
  expect(gayaTombol.outlineStyle).toBe('solid')
  expect(gayaTombol.outlineWidth).toBe('3px')

  await page.keyboard.press('Enter')
  await expect(panelForm(page)).toBeVisible()

  const medan = await tabKe(page, (f) => f.id === 'f-nama')
  expect(medan.tag).toBe('INPUT')
  const gayaMedan = await gayaFokus(page)
  expect(gayaMedan.terfokus).toBe(true)
  expect(gayaMedan.outlineStyle).toBe('solid')
  expect(gayaMedan.outlineWidth).toBe('3px')
})

test('nama aksi tidak ambigu: satu Simpan, Tutup khusus kader, Batal selalu membatalkan', async ({
  page,
}) => {
  await palsukanApi(page)
  await pasangDokumen(page, keluargaA11y(), { kode: 'keluarga-a11y-1' })
  await bukaOrang(page, 'Budi')
  await page.getByRole('button', { name: '✏️ Edit' }).click()

  const form = panelForm(page)
  const kader = page.locator('section.panel-bawah:not(.form-di-atas)')
  await expect(form).toBeVisible()

  // Wilayah panel punya nama sendiri sehingga bisa dibedakan pembaca layar.
  await expect(form).toHaveAccessibleName('Edit Anggota')
  await expect(kader).toHaveAccessibleName('Data Budi')

  // Hanya ada satu aksi simpan, dan penutup kader bernama "Tutup" (bukan "Batal").
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Tutup', exact: true })).toHaveCount(1)

  // Dua kontrol "Batal" (✕ dan tombol teks) melakukan hal yang sama: menutup form,
  // bukan kader. Jadi namanya kembar tapi tidak ambigu.
  const batal = page.getByRole('button', { name: 'Batal', exact: true })
  await expect(batal).toHaveCount(2)

  await batal.first().click()
  await expect(form).toHaveCount(0)
  await expect(kader).toBeVisible()

  await kader.getByRole('button', { name: '✏️ Edit' }).click()
  await expect(form).toBeVisible()
  await page.getByRole('button', { name: 'Batal', exact: true }).last().click()
  await expect(form).toHaveCount(0)
  await expect(kader).toBeVisible()

  // "Tutup" menutup seluruh kader.
  await page.getByRole('button', { name: 'Tutup', exact: true }).click()
  await expect(page.locator('.panel-bawah')).toHaveCount(0)
})
