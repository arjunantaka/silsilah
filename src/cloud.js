// Klien cloud: /api di atas D1 (functions/api). Dokumen per kode keluarga,
// kirim perubahan per baris anggota, tarik delta sejak kursor revisi.
import { slugNama } from './export.js'

export const POLA_KODE = /^[a-z0-9-]{4,64}$/

/**
 * Kirim antrean perubahan (satu baris per anggota) ke /api/sync.
 * @param {string} kode
 * @param {{ perubahan: { id: string, rec: any }[], nama: string }} isi
 * @param {{ keepalive?: boolean }} [opsi]
 * @returns {Promise<{ revisi: number|null }>}
 */
export async function kirimPerubahan(kode, isi, opsi = {}) {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kode, nama: isi.nama, perubahan: isi.perubahan }),
    cache: 'no-store',
    keepalive: opsi.keepalive === true,
  })
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok) {
    const err = /** @type {Error & { status?: number, revisi?: number }} */ (
      new Error(hasil?.pesan || 'Cloud tidak tersedia.')
    )
    err.status = res.status
    if (Number.isInteger(hasil?.revisi)) err.revisi = hasil.revisi
    throw err
  }
  return { revisi: Number.isInteger(hasil.revisi) ? hasil.revisi : null }
}

/**
 * Tarik baris yang berubah sejak kursor revisi.
 * @param {string} kode
 * @param {number} sejak
 * @returns {Promise<{ revisi: number, nama_keluarga: string, ubah: { id: string, rec: any, rev: number }[], penuh?: boolean, data?: any }>}
 */
export async function ambilDelta(kode, sejak) {
  const res = await fetch(`/api/delta?kode=${encodeURIComponent(kode)}&sejak=${sejak}`, {
    cache: 'no-store',
  })
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok) throw new Error(hasil?.pesan || 'Cloud tidak tersedia.')
  return hasil
}

/**
 * Dokumen penuh + revisi (dipakai saat memuat keluarga).
 * @param {string} kode
 * @returns {Promise<{ data: any, revisi: number }>}
 */
export async function ambilDariCloud(kode) {
  const res = await fetch(`/api/data?kode=${encodeURIComponent(kode)}`, { cache: 'no-store' })
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok) {
    const err = /** @type {Error & { status?: number }} */ (
      new Error(hasil?.pesan || 'Cloud tidak tersedia.')
    )
    err.status = res.status
    throw err
  }
  return {
    data: hasil.data,
    revisi: Number.isInteger(hasil.revisi) ? hasil.revisi : 0,
  }
}

const HURUF_AKHIRAN = 'abcdefghijkmnpqrstuvwxyz23456789' // tanpa karakter membingungkan (0/o/1/l/i)

/** @param {number} n @returns {string} */
function akhiran(n) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => HURUF_AKHIRAN[b % HURUF_AKHIRAN.length]).join('')
}

/** @param {string} kode @returns {Promise<boolean>} */
async function kodeTersedia(kode) {
  try {
    const res = await fetch(`/api/data?kode=${encodeURIComponent(kode)}`, { cache: 'no-store' })
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

/**
 * @param {string} kode
 * @param {number} revisi
 * @returns {Promise<void>}
 */
export async function hapusDariCloud(kode, revisi) {
  const res = await fetch(
    `/api/data?kode=${encodeURIComponent(kode)}&konfirmasi=ya&revisi=${revisi}`,
    { method: 'DELETE', cache: 'no-store' },
  )
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok) {
    const err = /** @type {Error & { status?: number, revisi?: number }} */ (
      new Error(hasil?.pesan || 'Gagal menghapus dari cloud.')
    )
    err.status = res.status
    if (Number.isInteger(hasil?.revisi)) err.revisi = hasil.revisi
    throw err
  }
}

/**
 * Daftar keluarga di database.
 * @returns {Promise<{ kode: string, nama: string|null, jumlah: number|null, revisi: number }[]>}
 */
export async function ambilDaftarKeluarga() {
  const res = await fetch('/api/families', { cache: 'no-store' })
  const hasil = await res.json().catch(() => null)
  if (!res.ok || !hasil?.ok || !Array.isArray(hasil.data)) throw new Error(hasil?.pesan || 'Cloud tidak tersedia.')
  return hasil.data
}
