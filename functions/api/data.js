// API cloud silsilah: satu dokumen JSON per kode keluarga di Cloudflare KV.
// Butuh binding KV `SILSILAH_KV` (lihat DEPLOY.md). Tanpa akun/login:
// kode keluarga berfungsi sebagai kunci akses (seperti password).
const POLA_KODE = /^[a-z0-9-]{4,64}$/
const MAKS_KARAKTER = 1_000_000

/** @param {unknown} body @param {number} status */
function balas(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
const sukses = (data) => balas({ ok: true, data }, 200)
const gagal = (pesan, status) => balas({ ok: false, pesan }, status)

const KV_HILANG = 'Database cloud belum dikonfigurasi (binding SILSILAH_KV hilang).'
const KODE_TAK_VALID = 'Kode tidak valid: 4-64 huruf/angka/tanda minus.'
const PREFIX_BACKUP = '__backup__:'

/** @param {any} metadata @returns {number} */
function revisiDari(metadata) {
  const n = metadata?.revisi
  return Number.isInteger(n) && n >= 0 ? n : 0
}

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestGet({ request, env }) {
  if (!env.SILSILAH_KV) return gagal(KV_HILANG, 503)
  const url = new URL(request.url)
  const kode = (url.searchParams.get('kode') || '').trim().toLowerCase()
  if (!POLA_KODE.test(kode)) return gagal(KODE_TAK_VALID, 400)
  const { value: raw, metadata } = await env.SILSILAH_KV.getWithMetadata(kode)
  if (raw === null) return gagal('Kode belum ada di cloud. Simpan dulu dari aplikasi.', 404)
  let dokumen
  try {
    dokumen = JSON.parse(raw)
  } catch {
    return gagal('Data di cloud rusak (bukan JSON).', 500)
  }
  return balas({ ok: true, data: dokumen, revisi: revisiDari(metadata) }, 200)
}

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestPut({ request, env }) {
  if (!env.SILSILAH_KV) return gagal(KV_HILANG, 503)
  let body
  try {
    body = await request.json()
  } catch {
    return gagal('Permintaan bukan JSON.', 400)
  }
  const kode = (body?.kode || '').trim().toLowerCase()
  if (!POLA_KODE.test(kode)) return gagal(KODE_TAK_VALID, 400)
  const dokumen = body?.data
  if (!dokumen || typeof dokumen.nama_keluarga !== 'string' || !Array.isArray(dokumen.anggota)) {
    return gagal('Data tidak dikenali sebagai file silsilah.', 400)
  }
  const teks = JSON.stringify(dokumen)
  if (teks.length > MAKS_KARAKTER) return gagal('Data terlalu besar untuk cloud (maks ±1 MB).', 413)

  // Klien lama tidak mengirim revisi. Tolak supaya cache lama tidak bisa
  // menimpa dokumen yang sudah lebih baru.
  const revisi = body?.revisi
  if (!Number.isInteger(revisi) || revisi < 0) {
    return balas(
      {
        ok: false,
        pesan: 'Revisi dokumen wajib dikirim. Muat ulang aplikasi sebelum menyimpan.',
      },
      409,
    )
  }

  const lama = await env.SILSILAH_KV.getWithMetadata(kode)
  const ada = lama.value !== null
  const revisiLama = ada ? revisiDari(lama.metadata) : 0
  if (revisi !== revisiLama) {
    return balas(
      {
        ok: false,
        pesan: 'Dokumen cloud sudah berubah. Muat ulang data sebelum menyimpan.',
        revisi: revisiLama,
      },
      409,
    )
  }

  // Simpan versi sebelumnya sebagai backup sebelum ditimpa.
  if (ada) {
    await env.SILSILAH_KV.put(PREFIX_BACKUP + kode, /** @type {string} */ (lama.value), {
      metadata: { ...(lama.metadata || {}), kode },
    })
  }

  const revisiBaru = revisiLama + 1
  await env.SILSILAH_KV.put(kode, teks, {
    metadata: {
      nama: dokumen.nama_keluarga,
      jumlah: dokumen.anggota.length,
      revisi: revisiBaru,
      diubah: new Date().toISOString(),
    },
  })
  return balas({ ok: true, data: kode, revisi: revisiBaru }, 200)
}

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestDelete({ request, env }) {
  if (!env.SILSILAH_KV) return gagal(KV_HILANG, 503)
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
  const lama = await env.SILSILAH_KV.getWithMetadata(kode)
  if (lama.value === null) return gagal('Kode belum ada di cloud.', 404)
  const revisiLama = revisiDari(lama.metadata)
  if (revisi !== revisiLama) {
    return balas(
      {
        ok: false,
        pesan: 'Dokumen cloud sudah berubah. Muat ulang data sebelum menghapus.',
        revisi: revisiLama,
      },
      409,
    )
  }
  await env.SILSILAH_KV.put(PREFIX_BACKUP + kode, /** @type {string} */ (lama.value), {
    metadata: { ...(lama.metadata || {}), kode },
  })
  await env.SILSILAH_KV.delete(kode)
  return sukses(kode)
}

