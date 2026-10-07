// API cloud silsilah: satu dokumen JSON per kode keluarga di Cloudflare KV.
// Butuh binding KV `SILSILAH_KV` (lihat DEPLOY.md). Tanpa akun/login:
// kode keluarga berfungsi sebagai kunci akses (seperti password).
const POLA_KODE = /^[a-z0-9-]{4,64}$/
const MAKS_KARAKTER = 1_000_000

/** @param {unknown} body @param {number} status */
function balas(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
const sukses = (data) => balas({ ok: true, data }, 200)
const gagal = (pesan, status) => balas({ ok: false, pesan }, status)

const KV_HILANG = 'Database cloud belum dikonfigurasi (binding SILSILAH_KV hilang).'
const KODE_TAK_VALID = 'Kode tidak valid: 4–64 huruf/angka/tanda minus.'

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestGet({ request, env }) {
  if (!env.SILSILAH_KV) return gagal(KV_HILANG, 503)
  const url = new URL(request.url)
  const kode = (url.searchParams.get('kode') || '').trim().toLowerCase()
  if (!POLA_KODE.test(kode)) return gagal(KODE_TAK_VALID, 400)
  const raw = await env.SILSILAH_KV.get(kode)
  if (raw === null) return gagal('Kode belum ada di cloud. Simpan dulu dari aplikasi.', 404)
  let dokumen
  try {
    dokumen = JSON.parse(raw)
  } catch {
    return gagal('Data di cloud rusak (bukan JSON).', 500)
  }
  return sukses(dokumen)
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
  await env.SILSILAH_KV.put(kode, teks)
  return sukses(kode)
}
