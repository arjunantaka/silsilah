// Bersama untuk semua endpoint /api: validasi + pembalas + alat bantu D1.
// Modul ini tanpa handler onRequest, jadi tidak menjadi rute Pages Functions.

export const POLA_KODE = /^[a-z0-9-]{4,64}$/
export const POLA_ID = /^[\w-]{1,64}$/
export const MAKS_PERUBAHAN = 2000
export const MAKS_REC = 8192
const MAKS_KARAKTER = 1_000_000

/** @param {unknown} body @param {number} status */
export function balas(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export const sukses = (data) => balas({ ok: true, data }, 200)
export const gagal = (pesan, status) => balas({ ok: false, pesan }, status)

export const DB_HILANG = 'Database cloud belum dikonfigurasi (binding DB hilang).'
export const KODE_TAK_VALID = 'Kode tidak valid: 4-64 huruf/angka/tanda minus.'

/** @param {Record<string, unknown>} env */
export function dbDari(env) {
  if (!env.DB) throw new Error(DB_HILANG)
  return /** @type {any} */ (env.DB)
}

/**
 * Normalisasi satu baris perubahan: rec wajib ber-id sama dengan kolom id.
 * @param {any} item
 * @returns {{ id: string, rec: string|null }|null} null bila tidak valid
 */
export function normalPerubahan(item) {
  const id = item?.id
  if (typeof id !== 'string' || !POLA_ID.test(id)) return null
  if (item.rec === null || item.rec === undefined) return { id, rec: null }
  if (typeof item.rec !== 'object') return null
  const rec = { ...item.rec, id }
  const teks = JSON.stringify(rec)
  if (teks.length > MAKS_REC) return null
  return { id, rec: teks }
}

/**
 * Validasi dokumen utuh (kompatibilitas PUT /api/data).
 * @param {any} dokumen
 */
export function dokumenValid(dokumen) {
  if (!dokumen || typeof dokumen.nama_keluarga !== 'string' || !Array.isArray(dokumen.anggota))
    return false
  return JSON.stringify(dokumen).length <= MAKS_KARAKTER
}

/**
 * Rakit dokumen { nama_keluarga, anggota } dari baris D1.
 * @param {string} nama
 * @param {{ rec: string }[]} baris
 */
export function rakitDokumen(nama, baris) {
  return { nama_keluarga: nama, anggota: baris.map((b) => JSON.parse(b.rec)) }
}
