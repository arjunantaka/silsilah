// Delta sinkronisasi: baris anggota yang rev-nya lebih baru dari kursor klien.
// Klien memanggil ini secara berkala; hasilnya diterapkan tanpa konfirmasi
// apa pun karena cloud adalah sumber kebenaran.
import { POLA_KODE, KODE_TAK_VALID, balas, gagal, dbDari, rakitDokumen } from './bersama.js'

const MAKS_DELTA = 2000

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestGet({ request, env }) {
  let db
  try {
    db = dbDari(env)
  } catch (e) {
    return gagal(/** @type {Error} */ (e).message, 503)
  }
  const url = new URL(request.url)
  const kode = (url.searchParams.get('kode') || '').trim().toLowerCase()
  if (!POLA_KODE.test(kode)) return gagal(KODE_TAK_VALID, 400)
  const sejakParam = url.searchParams.get('sejak')
  const sejak = sejakParam !== null && /^\d+$/.test(sejakParam) ? Number(sejakParam) : NaN
  if (!Number.isInteger(sejak) || sejak < 0) return gagal('Kursor sejak wajib angka >= 0.', 400)

  const k = await db.prepare('SELECT nama, revisi FROM keluarga WHERE kode = ?').bind(kode).first()
  if (!k) return gagal('Kode belum ada di cloud.', 404)

  const hidup = await db
    .prepare('SELECT id, rec, rev FROM anggota WHERE kode = ? AND rev > ? ORDER BY rev')
    .bind(kode, sejak)
    .all()
  const mati = await db
    .prepare('SELECT id, NULL AS rec, rev FROM hapus WHERE kode = ? AND rev > ? ORDER BY rev')
    .bind(kode, sejak)
    .all()
  const ubah = [...hidup.results, ...mati.results].sort((a, b) => a.rev - b.rev)

  if (ubah.length > MAKS_DELTA) {
    // Klien tertinggal terlalu jauh: kirim dokumen penuh saja.
    const baris = await db.prepare('SELECT rec FROM anggota WHERE kode = ?').bind(kode).all()
    return balas(
      { ok: true, penuh: true, revisi: k.revisi, nama_keluarga: k.nama, ubah: [], data: rakitDokumen(k.nama, baris.results) },
      200,
    )
  }

  return balas({ ok: true, revisi: k.revisi, nama_keluarga: k.nama, ubah }, 200)
}
