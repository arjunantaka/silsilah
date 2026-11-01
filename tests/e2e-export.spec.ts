import { test, expect, type Download, type Page } from '@playwright/test'
import { readFile } from 'fs/promises'
import {
  orang,
  dokumen,
  pasangDokumen,
  bukaOrang,
  bukaMenu,
  type DokumenUji,
} from './e2e-utils'

type Hasil = { nama: string; isi: string }

/** `window.print` diganti stub; penghitungnya satu-satunya bukti cetak dipanggil. */
type JendelaUji = Window & { __cetak?: number }

/**
 * Cloud selalu ditiru: ekspor dan cetak tidak butuh jaringan, dan PUT debounce
 * autosave tidak boleh menembak server dev.
 */
async function tiruApi(page: Page) {
  await page.route('**/api/families', (rute) =>
    rute.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [] }),
    }),
  )
  await page.route('**/api/data**', (rute) => {
    if (rute.request().method() !== 'GET') {
      return rute.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: 'uji-kode' }),
      })
    }
    // Kode belum terpakai: pengecekan ketersediaan menerima 404.
    return rute.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, pesan: 'tidak ada' }),
    })
  })
}

/** Isi dokumen lalu muat aplikasi dengan print distub dan cloud ditiru. */
async function muat(page: Page, doc: DokumenUji) {
  await tiruApi(page)
  await page.addInitScript(() => {
    const w = window as JendelaUji
    w.__cetak = 0
    window.print = () => {
      w.__cetak = (w.__cetak ?? 0) + 1
    }
  })
  await pasangDokumen(page, doc)
}

function jumlahCetak(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as JendelaUji
    return w.__cetak ?? 0
  })
}

/** Parser CSV kecil: kutip ganda, escape "", baris dipisah CRLF. */
function parseCSV(teks: string): string[][] {
  const isi = teks.replace(/^\uFEFF/, '')
  const baris: string[][] = []
  let sel: string[] = []
  let nilai = ''
  let dalamKutip = false
  for (let i = 0; i < isi.length; i++) {
    const c = isi[i]
    if (dalamKutip) {
      if (c === '"') {
        if (isi[i + 1] === '"') {
          nilai += '"'
          i++
        } else dalamKutip = false
      } else nilai += c
      continue
    }
    if (c === '"') dalamKutip = true
    else if (c === ',') {
      sel.push(nilai)
      nilai = ''
    } else if (c === '\r' && isi[i + 1] === '\n') {
      sel.push(nilai)
      baris.push(sel)
      sel = []
      nilai = ''
      i++
    } else if (c === '\n') {
      // Baris tanpa CR di luar kutip tetap dihitung supaya isi rusak terlihat.
      sel.push(nilai)
      baris.push(sel)
      sel = []
      nilai = ''
    } else nilai += c
  }
  if (nilai !== '' || sel.length > 0) {
    sel.push(nilai)
    baris.push(sel)
  }
  return baris
}

async function bacaUnduhan(janji: Promise<Download>): Promise<Hasil> {
  const unduhan = await janji
  const jalur = await unduhan.path()
  if (!jalur) throw new Error('Unduhan tidak menghasilkan berkas di disk')
  return { nama: unduhan.suggestedFilename(), isi: await readFile(jalur, 'utf8') }
}

async function unduhMenu(page: Page, label: RegExp): Promise<Hasil> {
  await bukaMenu(page)
  const janji = page.waitForEvent('download')
  await page.locator('.menu-panel').getByRole('button', { name: label }).click()
  return bacaUnduhan(janji)
}

async function unduhKeturunan(page: Page, nama: string): Promise<Hasil> {
  await bukaOrang(page, nama)
  const janji = page.waitForEvent('download')
  await page.locator('.panel-bawah').getByRole('button', { name: /Tabel Keturunan/ }).click()
  return bacaUnduhan(janji)
}

const KEPALA_UTAMA = [
  'kode',
  'nama',
  'gender',
  'tempat_lahir',
  'lahir',
  'wafat',
  'alamat',
  'pekerjaan',
  'ayah',
  'ibu',
  'pasangan',
  'catatan',
]

const KEPALA_KETURUNAN = [
  'kode',
  'nama',
  'tempat tanggal lahir',
  'alamat',
  'pekerjaan',
  'suami/istri',
  'orang tua',
]

test('CSV utama: BOM, CRLF, escaping kolom, dan slug nama file', async ({ page }) => {
  const doc = dokumen("Keluarga O'Brien: Sari & Co 2024", [
    orang('b', 'Budi "Bejo", Santoso', {
      kode: 'A1',
      gender: 'L',
      tempat_lahir: 'Solo',
      lahir: '1960-01-02',
      wafat: '2020-03-04',
      alamat: 'Jl. Mawar 🔥 No. 5',
      pekerjaan: 'Petani',
      catatan: 'baris1\nbaris2',
    }),
  ])
  await muat(page, doc)

  const { nama, isi } = await unduhMenu(page, /Unduh CSV/)

  // Slug: apostrof, titik dua, dan ampersand jadi pemisah tunggal.
  expect(nama).toBe('silsilah-keluarga-o-brien-sari-co-2024.csv')
  expect(isi.charCodeAt(0)).toBe(0xfeff)
  // Berkas tidak diakhiri newline: tepat satu pemisah CRLF untuk dua baris.
  expect(isi.split('\r\n')).toHaveLength(2)
  // Kutip di dalam nilai di-escape jadi "" (bukan dihapus).
  expect(isi).toContain('"Budi ""Bejo"", Santoso"')

  const baris = parseCSV(isi)
  expect(baris[0]).toEqual(KEPALA_UTAMA)
  expect(baris).toHaveLength(2)
  expect(baris[1]).toEqual([
    'A1',
    'Budi "Bejo", Santoso',
    'L',
    'Solo',
    '1960-01-02',
    '2020-03-04',
    'Jl. Mawar 🔥 No. 5',
    'Petani',
    '',
    '',
    '',
    'baris1\nbaris2',
  ])
})

test('CSV utama: urut kode natural, case-insensitive, tanpa kode di akhir', async ({ page }) => {
  const doc = dokumen('Keluarga Urut', [
    orang('n1', 'Tanpa Satu'),
    orang('b2', 'B dua', { kode: 'B2' }),
    orang('p10', 'P10 sepuluh', { kode: 'a1p10' }),
    orang('p2', 'P2 dua', { kode: 'A1P2' }),
    orang('p1', 'P1 satu', { kode: 'a1p1' }),
    orang('z', 'Zaki', { kode: 'A1' }),
    orang('a', 'ani', { kode: 'A1' }),
    orang('n2', 'Tanpa Dua'),
  ])
  await muat(page, doc)

  const { isi } = await unduhMenu(page, /Unduh CSV/)
  const nama = parseCSV(isi)
    .slice(1)
    .map((r) => r[1])

  expect(nama).toEqual([
    'ani', // kode sama: nama dibandingkan tanpa peduli besar-kecil huruf
    'Zaki',
    'P1 satu', // a1p1 < A1P2 < a1p10 secara natural
    'P2 dua',
    'P10 sepuluh',
    'B dua',
    'Tanpa Satu', // tanpa kode selalu paling akhir, urutan input dipertahankan
    'Tanpa Dua',
  ])
})

test('CSV utama: kolom opsional terisi sesuai relasinya', async ({ page }) => {
  const doc = dokumen('Keluarga Kolom', [
    orang('b', 'Budi', {
      kode: 'A1',
      gender: 'L',
      tempat_lahir: 'Solo',
      lahir: '1960-01-02',
      wafat: '2020-03-04',
      alamat: 'Jl. Mawar 1',
      pekerjaan: 'Petani',
      pasangan: ['s', 'r', 'hilang'],
      catatan: 'Pendiri',
    }),
    orang('s', 'Sari', { kode: 'A1P1', gender: 'P', pasangan: ['b'] }),
    orang('r', 'Rani', { kode: 'A1P2', gender: 'P', pasangan: ['b'] }),
    orang('a', 'Ani', { kode: 'A1B1', gender: 'P', ayah: 'b', ibu: 's' }),
  ])
  await muat(page, doc)

  const { isi } = await unduhMenu(page, /Unduh CSV/)
  const baris = parseCSV(isi)
  expect(baris).toHaveLength(5)
  const budi = baris.find((r) => r[1] === 'Budi')!
  const ani = baris.find((r) => r[1] === 'Ani')!

  // Pasangan yang id-nya tidak ada dibuang, daftar relasi digabung "; ".
  expect(budi).toEqual([
    'A1',
    'Budi',
    'L',
    'Solo',
    '1960-01-02',
    '2020-03-04',
    'Jl. Mawar 1',
    'Petani',
    '',
    '',
    'Sari; Rani',
    'Pendiri',
  ])
  // Anak: ayah & ibu jadi nama, bukan id.
  expect(ani).toEqual([
    'A1B1',
    'Ani',
    'P',
    '',
    '',
    '',
    '',
    '',
    'Budi',
    'Sari',
    '',
    '',
  ])
})

test('CSV keturunan: akar tanpa turunan hanya header + satu baris', async ({ page }) => {
  await muat(page, dokumen('Keluarga Tunggal', [orang('b', 'Budi', { kode: 'A1' })]))

  const { nama, isi } = await unduhKeturunan(page, 'Budi')

  expect(nama).toBe('keturunan-budi.csv')
  expect(isi.charCodeAt(0)).toBe(0xfeff)
  // Hanya header + baris akar; tidak ada newline tambahan di akhir berkas.
  expect(isi.split('\r\n')).toHaveLength(2)
  const baris = parseCSV(isi)
  expect(baris[0]).toEqual(KEPALA_KETURUNAN)
  expect(baris).toHaveLength(2)
  expect(baris[1][1]).toBe('Budi')
  expect(baris[1][5]).toBe('') // tanpa pasangan
  expect(baris[1][6]).toBe('') // akar tanpa orang tua tetap kosong
})

test('CSV keturunan: lima generasi turunan, label sampai Canggah & Generasi 5', async ({
  page,
}) => {
  const doc = dokumen('Keluarga Enam Generasi', [
    orang('g0', 'Kakek Buyut', { kode: 'A1' }),
    orang('g1', 'Anak Satu', { kode: 'A1P1', ayah: 'g0' }),
    orang('g2', 'Cucu Dua', { kode: 'A1P1B1', ayah: 'g1', tempat_lahir: 'Bandung', lahir: '1990' }),
    orang('g3', 'Buyut Tiga', { kode: 'A1P1B1C1', ayah: 'g2' }),
    orang('g4', 'Canggah Empat', { kode: 'A1P1B1C1D1', ayah: 'g3' }),
    orang('g5', 'Generasi Lima', { kode: 'A1P1B1C1D1E1', ayah: 'g4' }),
  ])
  await muat(page, doc)

  await bukaOrang(page, 'Kakek Buyut')
  const panel = page.locator('.panel-bawah')
  await expect(panel).toContainText('Anak (1):')
  await expect(panel).toContainText('Cucu (1):')
  await expect(panel).toContainText('Buyut (1):')
  await expect(panel).toContainText('Canggah (1):')
  await expect(panel).toContainText('Generasi 5 (1):')

  const janji = page.waitForEvent('download')
  await panel.getByRole('button', { name: /Tabel Keturunan/ }).click()
  const { nama, isi } = await bacaUnduhan(janji)
  expect(nama).toBe('keturunan-kakek-buyut.csv')

  // BFS: akar dulu, lalu satu orang per generasi.
  const baris = parseCSV(isi)
  expect(baris.slice(1).map((r) => r[1])).toEqual([
    'Kakek Buyut',
    'Anak Satu',
    'Cucu Dua',
    'Buyut Tiga',
    'Canggah Empat',
    'Generasi Lima',
  ])
  // Tempat dan tanggal lahir digabung ", ".
  const cucu = baris[3]
  expect(cucu[1]).toBe('Cucu Dua')
  expect(cucu[2]).toBe('Bandung, 1990')
  // Orang tua satu sisi juga ditandai "ibu X".
  expect(cucu[6]).toBe('Anak Satu & ibu X')
})

test('CSV keturunan: mantan pasangan dilewati, orang tua tak dikenal ditandai X', async ({
  page,
}) => {
  const doc = dokumen('Keluarga Pisah', [
    orang('b', 'Budi', { kode: 'A1', pasangan: ['s', 'r', 'd'], pisah: ['s'] }),
    orang('s', 'Sari', { kode: 'A2', pasangan: ['b'], pisah: ['b'] }),
    orang('r', 'Rani', { kode: 'A3', pasangan: ['b'] }),
    orang('d', 'Dewi', { kode: 'A4', pasangan: ['b'] }),
    orang('a', 'Ani', { kode: 'A1P1', gender: 'P', ayah: 'b', ibu: null }),
    orang('y', 'Bayu', { kode: 'A1P2', ayah: null, ibu: 's' }),
  ])
  await muat(page, doc)

  const { isi } = await unduhKeturunan(page, 'Budi')
  const baris = parseCSV(isi)
  expect(baris[0]).toEqual(KEPALA_KETURUNAN)
  expect(baris.slice(1).map((r) => r[1])).toEqual(['Budi', 'Ani', 'Bayu'])
  const budi = baris[1]
  const ani = baris[2]
  const bayu = baris[3]

  // Pisah: Sari dilewati, dua pasangan lain tetap terdaftar. Akar tanpa orang tua dikosongkan.
  expect(budi[5]).toBe('Rani; Dewi')
  expect(budi[5]).not.toContain('Sari')
  expect(budi[6]).toBe('')
  // Ibu tidak diketahui → "ibu X"; ayah tidak diketahui → "ayah X".
  expect(ani[6]).toBe('Budi & ibu X')
  expect(bayu[6]).toBe('ayah X & Sari')
})

test('Cetak dari pohon: print sekali, --print-zoom dipasang, menu tertutup', async ({ page }) => {
  await muat(
    page,
    dokumen('Keluarga Cetak', [
      orang('b', 'Budi', { kode: 'A1' }),
      orang('a', 'Ani', { kode: 'A1P1', ayah: 'b' }),
    ]),
  )
  await expect(page.locator('.pohon')).toBeVisible()

  await bukaMenu(page)
  await page.locator('.menu-panel').getByRole('button', { name: /Cetak \/ PDF/ }).click()

  await expect.poll(() => jumlahCetak(page)).toBe(1)
  expect(await jumlahCetak(page)).toBe(1)
  await expect(page.locator('.menu-panel')).toHaveCount(0)

  const zoom = await page.locator('.pohon').evaluate((el) => {
    const pohon = el as HTMLElement // elemen DOM hasil locator .pohon
    return pohon.style.getPropertyValue('--print-zoom')
  })
  expect(zoom).not.toBe('')
  const angka = Number(zoom)
  expect(Number.isFinite(angka)).toBe(true)
  expect(angka).toBeGreaterThan(0)
  expect(angka).toBeLessThanOrEqual(1)
})

test('Cetak dari dashboard: pohon dipulihkan dan kepala cetak berisi nama & jumlah', async ({
  page,
}) => {
  await muat(
    page,
    dokumen('Keluarga Dashboard', [
      orang('k', 'Kakek', { kode: 'A1' }),
      orang('n', 'Nenek', { kode: 'A2', gender: 'P' }),
      orang('a', 'Ayah', { kode: 'A1P1', ayah: 'k', ibu: 'n' }),
      orang('c', 'Cucu', { kode: 'A1P1B1', ayah: 'a' }),
    ]),
  )

  await page.getByRole('button', { name: 'Daftar keluarga', exact: true }).click()
  await expect(page.locator('.daftar-layar h2')).toHaveText('Daftar Keluarga')

  await bukaMenu(page)
  await page.locator('.menu-panel').getByRole('button', { name: /Cetak \/ PDF/ }).click()

  // Dashboard ditutup lagi supaya yang tercetak pohonnya, bukan daftar kosong.
  await expect(page.locator('.daftar-layar')).toHaveCount(0)
  await expect(page.locator('.pohon')).toBeVisible()
  await expect.poll(() => jumlahCetak(page)).toBe(1)
  await expect(page.locator('.menu-panel')).toHaveCount(0)

  const kepala = page.locator('.cetak-kepala')
  await expect(kepala.locator('h1')).toHaveText('Keluarga Dashboard')
  await expect(kepala.locator('p').first()).toHaveText('4 orang')

  // Kepala cetak memang bagian dari hasil cetak (tampil di media print).
  await page.emulateMedia({ media: 'print' })
  await expect(kepala).toBeVisible()
  await expect(kepala.locator('p').first()).toHaveText('4 orang')
  await page.emulateMedia({ media: 'screen' })
})

test('Cetak keluarga kosong: peringatan tampil, print tidak dipanggil', async ({ page }) => {
  const pesan: string[] = []
  page.on('dialog', async (dialog) => {
    pesan.push(dialog.message())
    await dialog.dismiss()
  })

  await muat(page, dokumen('Keluarga Kosong', []))
  await expect(page.locator('.layar-kosong')).toBeVisible()
  await expect(page.locator('.pohon')).toHaveCount(0)

  await bukaMenu(page)
  await page.locator('.menu-panel').getByRole('button', { name: /Cetak \/ PDF/ }).click()

  await expect.poll(() => pesan.length).toBe(1)
  expect(pesan[0]).toBe('Belum ada silsilah untuk dicetak.')
  expect(await jumlahCetak(page)).toBe(0)
  await expect(page.locator('.menu-panel')).toHaveCount(0)
})

test('Cetak saat fokus trah: kepala memakai jumlah trah, bukan seluruh keluarga', async ({
  page,
}) => {
  await muat(
    page,
    dokumen('Keluarga Trah', [
      orang('k', 'Kakek', { kode: 'A1' }),
      orang('a1', 'Anak Satu', { kode: 'A1P1', ayah: 'k' }),
      orang('a2', 'Anak Dua', { kode: 'A1P2', ayah: 'k' }),
      orang('c1', 'Cucu Satu', { kode: 'A1P1B1', ayah: 'a1' }),
      orang('x', 'Orang Lain', { kode: 'Z9' }),
    ]),
  )

  await page.locator('#cari').fill('Kakek')
  await page.locator('.hasil-cari button', { hasText: 'Kakek' }).click()
  await expect(page.locator('.fokus-trah')).toContainText('Trah Kakek')

  await bukaMenu(page)
  await page.locator('.menu-panel').getByRole('button', { name: /Cetak \/ PDF/ }).click()
  await expect.poll(() => jumlahCetak(page)).toBe(1)

  const kepala = page.locator('.cetak-kepala')
  await expect(kepala).toContainText('Trah Kakek · 4 orang')
  await expect(kepala).not.toContainText('5 orang')
})
