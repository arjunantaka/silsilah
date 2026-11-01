// Daftar keluarga tersimpan: kunci KV + metadata (nama, jumlah) dari PUT /api/data.
// Tanpa akun/login: daftar ini publik - siapa pun yang buka situs bisa melihat kode.
const MAKS_DAFTAR = 100

/** @param {{ request: Request, env: Record<string, unknown> }} ctx */
export async function onRequestGet({ env }) {
  const json = (/** @type {unknown} */ b, /** @type {number} */ s) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  if (!env.SILSILAH_KV)
    return json({ ok: false, pesan: 'Database cloud belum dikonfigurasi (binding SILSILAH_KV hilang).' }, 503)
  /** @type {{ keys: { name: string, metadata?: { nama?: string, jumlah?: number } | null }[] }} */
  const list = await /** @type {any} */ (env.SILSILAH_KV).list({ limit: MAKS_DAFTAR })
  const keluarga = list.keys.map((k) => ({
    kode: k.name,
    nama: k.metadata?.nama ?? null,
    jumlah: k.metadata?.jumlah ?? null,
  }))
  return json({ ok: true, data: keluarga }, 200)
}