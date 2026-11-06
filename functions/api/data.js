// API cloud silsilah di atas D1 (satu sumber kebenaran).
// - GET: dokumen penuh + revisi (kursor sinkronisasi).
// - PUT: KOMPATIBILITAS bundle lama yang masih mengirim dokumen utuh.
//   Gerbang revisi tetap dijaga supaya cache lama tidak bisa menimpa data baru.
// - DELETE: hapus keluarga setelah arsip disimpan; tetap dijaga revisi.
import { POLA_KODE, KODE_TAK_VALID, DB_HILANG, balas, gagal, dbDari, dokumenValid, rakitDokumen } from './bersama.js'

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

  const k = await db.prepare('SELECT nama, revisi FROM keluarga WHERE kode = ?').bind(kode).first()
  if (!k) return gagal('Kode belum ada di cloud. Simpan dulu dari aplikasi.', 404)
  const baris = await db.prepare('SELECT rec FROM anggota WHERE kode = ?').bind(kode).all()
  return balas({ ok: true, data: rakitDokumen(k.nama, baris.results), revisi: k.revisi }, 200)
}

/**
 * Kompabilitas PUT dokumen utuh. Setiap statement membawa gerbang revisi yang
 * sama supaya batch atomik ini tidak menulis apa pun saat revisi sudah basi.
 * @param {{ request: Request, env: Record<string, unknown> }} ctx
 */
export async function onRequestPut({ request, env }) {
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
  const dokumen = body?.data
  if (!dokumenValid(dokumen)) return gagal('Data tidak dikenali sebagai file silsilah.', 400)
  const revisi = body?.revisi
  if (!Number.isInteger(revisi) || revisi < 0) {
    return balas({ ok: false, pesan: 'Revisi dokumen wajib dikirim. Muat ulang aplikasi sebelum menyimpan.' }, 409)
  }

  const sekarang = new Date().toISOString()
  const kini = await db.prepare('SELECT revisi FROM keluarga WHERE kode = ?').bind(kode).first()
  const ada = kini !== null
  if (ada && revisi !== kini.revisi) {
    return balas({ ok: false, pesan: 'Dokumen cloud sudah berubah. Muat ulang data sebelum menyimpan.', revisi: kini.revisi }, 409)
  }
  if (!ada && revisi !== 0) {
    return balas({ ok: false, pesan: 'Dokumen cloud sudah berubah. Muat ulang data sebelum menyimpan.', revisi: 0 }, 409)
  }

  // Gerbang di setiap statement, bukan hanya di statement pertama:
  // - keluarga lama: revisi harus sudah menjadi revisi+1 (tanda bump ini jalan);
  // - keluarga baru: revisi harus 1 (tanda INSERT baris pertama jalan).
  // Bila gerbang gagal, tidak ada statement yang menulis apa pun.
  const gerbang = ada
    ? '(SELECT revisi FROM keluarga WHERE kode = ?) = ?'
    : '(SELECT revisi FROM keluarga WHERE kode = ?) = 1'
  const paramsGerbang = ada ? [kode, revisi + 1] : [kode]

  const pernyataan = []
  if (ada) {
    pernyataan.push(
      db
        .prepare(
          'UPDATE keluarga SET revisi = revisi + 1, nama = ?, diubah = ? WHERE kode = ? AND revisi = ?',
        )
        .bind(dokumen.nama_keluarga, sekarang, kode, revisi),
    )
  } else {
    pernyataan.push(
      db
        .prepare(
          'INSERT INTO keluarga (kode, nama, revisi, diubah, jumlah) SELECT ?, ?, 1, ?, 0 WHERE (SELECT COUNT(*) FROM keluarga WHERE kode = ?) = 0',
        )
        .bind(kode, dokumen.nama_keluarga, sekarang, kode),
    )
  }
  pernyataan.push(
    db
      .prepare(`DELETE FROM anggota WHERE kode = ? AND ${gerbang}`)
      .bind(kode, ...paramsGerbang),
    db.prepare(`DELETE FROM hapus WHERE kode = ? AND ${gerbang}`).bind(kode, ...paramsGerbang),
  )
  for (const a of dokumen.anggota) {
    if (!a?.id) continue
    pernyataan.push(
      db
        .prepare(
          `INSERT INTO anggota (kode, id, rec, rev) SELECT ?, ?, ?, revisi FROM keluarga WHERE kode = ? AND ${gerbang}`,
        )
        .bind(kode, String(a.id), JSON.stringify(a), kode, ...paramsGerbang),
    )
  }
  pernyataan.push(
    db
      .prepare(
        `UPDATE keluarga SET jumlah = (SELECT COUNT(*) FROM anggota WHERE kode = ?) WHERE kode = ? AND ${gerbang}`,
      )
      .bind(kode, kode, ...paramsGerbang),
  )

  const hasil = await db.batch(pernyataan)
  if (!hasil[0].success || (hasil[0].meta?.changes ?? 1) === 0) {
    return balas({ ok: false, pesan: 'Dokumen cloud sudah berubah. Muat ulang data sebelum menyimpan.' }, 409)
  }
  return balas({ ok: true, data: kode, revisi: (ada ? revisi : 0) + 1 }, 200)
}

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestDelete({ request, env }) {
  let db
  try {
    db = dbDari(env)
  } catch (e) {
    return gagal(/** @type {Error} */ (e).message, 503)
  }
  const url = new URL(request.url)
  const kode = (url.searchParams.get('kode') || '').trim().toLowerCase()
  if (!POLA_KODE.test(kode)) return gagal(KODE_TAK_VALID, 400)
  if (url.searchParams.get('konfirmasi') !== 'ya') {
    return gagal('Konfirmasi hapus diperlukan: sertakan konfirmasi=ya.', 400)
  }
  const revisiParam = url.searchParams.get('revisi')
  const revisi = revisiParam !== null && /^\d+$/.test(revisiParam) ? Number(revisiParam) : NaN
  if (!Number.isInteger(revisi) || revisi < 0) {
    return gagal('Revisi dokumen wajib dikirim sebelum menghapus.', 400)
  }

  const kini = await db.prepare('SELECT nama, revisi FROM keluarga WHERE kode = ?').bind(kode).first()
  if (!kini) return gagal('Kode belum ada di cloud.', 404)
  if (revisi !== kini.revisi) {
    return balas({ ok: false, pesan: 'Dokumen cloud sudah berubah. Muat ulang data sebelum menghapus.', revisi: kini.revisi }, 409)
  }

  const baris = await db.prepare('SELECT rec FROM anggota WHERE kode = ?').bind(kode).all()
  const dokumen = JSON.stringify(rakitDokumen(kini.nama, baris.results))
  const gerbang = '(SELECT revisi FROM keluarga WHERE kode = ?) = ?'
  const hasil = await db.batch([
    db
      .prepare('INSERT INTO arsip (kode, rec, diubah) SELECT ?, ?, ? WHERE ' + gerbang)
      .bind(kode, dokumen, new Date().toISOString(), kode, revisi),
    db.prepare(`DELETE FROM anggota WHERE kode = ? AND ${gerbang}`).bind(kode, kode, revisi),
    db.prepare(`DELETE FROM hapus WHERE kode = ? AND ${gerbang}`).bind(kode, kode, revisi),
    db.prepare(`DELETE FROM keluarga WHERE kode = ? AND ${gerbang}`).bind(kode, kode, revisi),
  ])
  if ((hasil[3].meta?.changes ?? 0) === 0) {
    return balas({ ok: false, pesan: 'Dokumen cloud sudah berubah. Muat ulang data sebelum menghapus.', revisi: revisi }, 409)
  }
  return balas({ ok: true, data: kode }, 200)
}
