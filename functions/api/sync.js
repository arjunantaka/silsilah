// Inti sinkronisasi dua arah: kirim perubahan per-baris anggota.
// Tidak ada gerbang revisi untuk menulis: setiap flush dijamin masuk; urutan
// datang ke server menentukan hasil (last writer wins per anggota).
// `revisi` hanya kursor perubahan, dinaikkan satu per flush.
import { POLA_KODE, KODE_TAK_VALID, MAKS_PERUBAHAN, balas, gagal, dbDari, normalPerubahan } from './bersama.js'

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestPost({ request, env }) {
  let db
  try {
    db = dbDari(env)
  } catch (e) {
    return gagal(/** @type {Error} */ (e).message, 503)
  }
  let body
  try {
    body = await request.json()
  } catch {
    return gagal('Permintaan bukan JSON.', 400)
  }
  const kode = (body?.kode || '').trim().toLowerCase()
  if (!POLA_KODE.test(kode)) return gagal(KODE_TAK_VALID, 400)
  const nama = typeof body?.nama === 'string' ? body.nama.trim().slice(0, 100) : null
  if (!nama) return gagal('Nama keluarga wajib dikirim.', 400)
  if (!Array.isArray(body?.perubahan)) return gagal('perubahan wajib berupa daftar.', 400)
  if (body.perubahan.length > MAKS_PERUBAHAN) {
    return gagal('Terlalu banyak perubahan sekali kirim (maks 2000).', 413)
  }

  /** @type {{ id: string, rec: string|null }[]} */
  const perubahan = []
  for (const item of body.perubahan) {
    const n = normalPerubahan(item)
    if (!n) return gagal('Perubahan tidak valid (id/rec tidak dikenali).', 400)
    perubahan.push(n)
  }

  const ada = await db.prepare('SELECT revisi FROM keluarga WHERE kode = ?').bind(kode).first()
  if (!ada && !perubahan.some((p) => p.rec !== null)) {
    return gagal('Keluarga baru wajib punya minimal satu anggota.', 400)
  }
  // perubahan boleh kosong (mis. hanya ganti nama keluarga); nama tetap
  // diterapkan dan revisi tetap naik sebagai penanda perubahan.
  const sekarang = new Date().toISOString()
  const pernyataan = [
    ada
      ? db
          .prepare('UPDATE keluarga SET revisi = revisi + 1, nama = ?, diubah = ? WHERE kode = ?')
          .bind(nama, sekarang, kode)
      : db
          .prepare(
            'INSERT INTO keluarga (kode, nama, revisi, diubah, jumlah) VALUES (?, ?, 1, ?, 0) ON CONFLICT(kode) DO UPDATE SET revisi = keluarga.revisi + 1, nama = excluded.nama, diubah = excluded.diubah',
          )
          .bind(kode, nama, sekarang),
  ]
  for (const p of perubahan) {
    if (p.rec !== null) {
      pernyataan.push(
        db
          .prepare(
            `INSERT INTO anggota (kode, id, rec, rev) VALUES (?, ?, ?, (SELECT revisi FROM keluarga WHERE kode = ?)) ON CONFLICT(kode, id) DO UPDATE SET rec = excluded.rec, rev = excluded.rev`,
          )
          .bind(kode, p.id, p.rec, kode),
        db.prepare('DELETE FROM hapus WHERE kode = ? AND id = ?').bind(kode, p.id),
      )
    } else {
      pernyataan.push(
        db
          .prepare(
            `INSERT INTO hapus (kode, id, rev) VALUES (?, ?, (SELECT revisi FROM keluarga WHERE kode = ?)) ON CONFLICT(kode, id) DO UPDATE SET rev = excluded.rev`,
          )
          .bind(kode, p.id, kode),
        db.prepare('DELETE FROM anggota WHERE kode = ? AND id = ?').bind(kode, p.id),
      )
    }
  }
  pernyataan.push(
    db
      .prepare('UPDATE keluarga SET jumlah = (SELECT COUNT(*) FROM anggota WHERE kode = ?) WHERE kode = ?')
      .bind(kode, kode),
  )

  await db.batch(pernyataan)
  const kini = await db.prepare('SELECT revisi FROM keluarga WHERE kode = ?').bind(kode).first()
  return balas({ ok: true, revisi: kini?.revisi ?? null }, 200)
}
