import type { Page } from '@playwright/test'

/**
 * Bentuk anggota yang dipakai fixture E2E. Field opsional diisi default supaya
 * dokumen yang disuntikkan ke localStorage menyerupai hasil aplikasi.
 */
export type AnggotaUji = {
  id: string
  nama: string
  kode?: string
  gender?: 'L' | 'P' | ''
  lahir?: string
  wafat?: string
  catatan?: string
  tempat_lahir?: string
  alamat?: string
  pekerjaan?: string
  ayah?: string | null
  ibu?: string | null
  pasangan?: string[]
  pisah?: string[]
}

export type DokumenUji = {
  nama_keluarga: string
  anggota: AnggotaUji[]
}

/** Anggota lengkap dengan default yang aman untuk dokumen localStorage. */
export function orang(id: string, nama: string, patch: Partial<AnggotaUji> = {}): AnggotaUji {
  return {
    id,
    nama,
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
    pisah: [],
    ...patch,
  }
}

/** Dokumen keluarga lengkap; anggota boleh diberikan ringkas. */
export function dokumen(nama_keluarga: string, anggota: AnggotaUji[]): DokumenUji {
  return { nama_keluarga, anggota }
}

/**
 * Isi localStorage sebelum aplikasi dimuat. `kode` mensimulasikan keluarga yang
 * sudah pernah tersimpan di cloud.
 */
export async function pasangDokumen(
  page: Page,
  doc: DokumenUji,
  opsi: { kode?: string; url?: string } = {},
): Promise<void> {
  await page.addInitScript(
    ({ doc, kode }) => {
      localStorage.setItem('silsilah:v1', JSON.stringify(doc))
      if (kode) localStorage.setItem('silsilah:kode', kode)
      else localStorage.removeItem('silsilah:kode')
    },
    { doc, kode: opsi.kode ?? '' },
  )
  await page.goto(opsi.url ?? '/')
}

/** Kotak orang di pohon, dicocokkan tepat pada nama agar tidak kena substring. */
export function kotak(page: Page, nama: string) {
  return page.locator('.kotak').getByText(nama, { exact: true })
}

/** Tutup panel kader/form yang sedang terbuka, bila ada. */
export async function tutupPanel(page: Page): Promise<void> {
  const tombol = page.locator('.panel-bawah .tutup')
  if (await tombol.count()) await tombol.first().click()
}

/** Buka kader orang lewat kotaknya di pohon. */
export async function bukaOrang(page: Page, nama: string): Promise<void> {
  await kotak(page, nama).click()
  await page.locator('.panel-bawah').waitFor()
}

/** Buka menu utama. */
export async function bukaMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: '☰ Menu' }).click()
}

/** Ambil isi panel kader sebagai teks yang dinormalkan. */
export async function teksPanel(page: Page): Promise<string> {
  return ((await page.locator('.panel-bawah').textContent()) ?? '').replace(/\s+/g, ' ').trim()
}
