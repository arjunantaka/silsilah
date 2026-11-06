// Daftar keluarga langsung dari tabel keluarga D1 (tanpa filter backup lagi).
import { gagal, dbDari } from './bersama.js'

const MAKS_DAFTAR = 100

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestGet({ env }) {
  let db
  try {
    db = dbDari(env)
  } catch (e) {
    return gagal(/** @type {Error} */ (e).message, 503)
  }
  const hasil = await db
    .prepare('SELECT kode, nama, jumlah, revisi, diubah FROM keluarga ORDER BY diubah DESC LIMIT ?')
    .bind(MAKS_DAFTAR)
    .all()
  const keluarga = hasil.results.map((/** @type {any} */ k) => ({
    kode: k.kode,
    nama: k.nama,
    jumlah: k.jumlah,
    revisi: k.revisi,
    diubah: k.diubah,
  }))
  return Response.json({ ok: true, data: keluarga }, { headers: { 'cache-control': 'no-store' } })
}
