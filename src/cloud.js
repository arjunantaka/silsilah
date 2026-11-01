// Klien cloud: satu dokumen JSON per kode keluarga di /api/data (Pages Function + KV).
import { get } from 'svelte/store'
import { data } from './store.js'
import { slugNama } from './export.js'

export const POLA_KODE = /^[a-z0-9-]{4,64}$/

/** @param {string} kode @returns {Promise<string>} */
export async function simpanKeCloud(kode) {
  const res = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kode, data: get(data) }),
  })
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok) throw new Error(hasil?.pesan || 'Cloud tidak tersedia.')
  return /** @type {string} */ (hasil.data)
}

/** @param {string} kode @returns {Promise<any>} */
export async function ambilDariCloud(kode) {
  const res = await fetch(`/api/data?kode=${encodeURIComponent(kode)}`)
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok) throw new Error(hasil?.pesan || 'Cloud tidak tersedia.')
  return hasil.data
}

const HURUF_AKHIRAN = 'abcdefghijkmnpqrstuvwxyz23456789' // tanpa karakter membingungkan (0/o/1/l/i)

/** @param {number} n @returns {string} */
function akhiran(n) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => HURUF_AKHIRAN[b % HURUF_AKHIRAN.length]).join('')
}

/** @param {string} kode @returns {Promise<boolean>} */
async function kodeTersedia(kode) {
  try {
    const res = await fetch(`/api/data?kode=${encodeURIComponent(kode)}`)
    return res.status === 404
  } catch {
    return true // cloud tak terjangkau: pakai saja; kegagalan ditangani saat simpan
  }
}

/**
 * Kode keluarga baru: slug nama keluarga + akhiran acak; cek tabrakan lewat GET 404.
 * @returns {Promise<string>}
 */
export async function buatKodeBaru() {
  const dasar = slugNama().slice(0, 30) || 'keluarga'
  for (const panjang of [6, 6, 6, 10, 10, 10]) {
    const kode = `${dasar}-${akhiran(panjang)}`
    if (POLA_KODE.test(kode) && (await kodeTersedia(kode))) return kode
  }
  return `${dasar}-${akhiran(14)}` // praktis mustahil tabrakan
}

/** @param {string} kode @returns {Promise<void>} */
export async function hapusDariCloud(kode) {
  const res = await fetch(`/api/data?kode=${encodeURIComponent(kode)}&konfirmasi=ya`, {
    method: 'DELETE',
  })
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok) throw new Error(hasil?.pesan || 'Gagal menghapus dari cloud.')
}

/**
 * Daftar keluarga di database.
 * @returns {Promise<{ kode: string, nama: string|null, jumlah: number|null }[]>}
 */
export async function ambilDaftarKeluarga() {
  const res = await fetch('/api/families')
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok || !Array.isArray(hasil.data)) throw new Error(hasil?.pesan || 'Cloud tidak tersedia.')
  return hasil.data
}
