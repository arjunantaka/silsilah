// Klien cloud: satu dokumen JSON per kode keluarga di /api/data (Pages Function + KV).
import { get } from 'svelte/store'
import { data } from './store.js'

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
