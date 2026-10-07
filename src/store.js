// Sumber kebenaran tunggal: satu entitas `anggota` dengan pointer relasi.
// Filosofi "kasir": tanpa validasi relasi, tanpa tabel turunan.
/**
 * @import { Writable } from 'svelte/store'
 */

/**
 * @typedef {Object} Anggota
 * @property {string} id
 * @property {string} nama
 * @property {'L'|'P'|''} gender
 * @property {string} lahir
 * @property {string} wafat
 * @property {string} catatan
 * @property {string|null} ayah
 * @property {string|null} ibu
 * @property {string[]} pasangan
 */

/**
 * @typedef {Object} DataKeluarga
 * @property {string} nama_keluarga
 * @property {Anggota[]} anggota
 */

/**
 * @typedef {Object} Fields
 * @property {string} nama
 * @property {'L'|'P'|''} gender
 * @property {string} lahir
 * @property {string} wafat
 * @property {string} catatan
 */

/**
 * @typedef {Object} FormUI
 * @property {'akar'|'anak'|'pasangan'|'edit'} mode
 * @property {string} [targetId]
 * @property {{ ayah: string|null, ibu: string|null }} [ortu]
 * @property {string[]} [kandidat]
 */

import { writable, get } from 'svelte/store'

const KEY = 'silsilah:v1'

/** @type {DataKeluarga} */
const DEFAULT = { nama_keluarga: 'Keluarga Saya', anggota: [] }

export function idBaru() {
  return crypto.randomUUID()
}

/** @returns {DataKeluarga} */
function muatAwal() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj.nama_keluarga === 'string' && Array.isArray(obj.anggota)) return obj
    }
  } catch {}
  return { ...DEFAULT, anggota: [] }
}

/** @type {Writable<DataKeluarga>} */
export const data = writable(muatAwal())

/** @type {Writable<{ sheetId: string|null, form: FormUI|null, menuBuka: boolean }>} */
export const ui = writable({ sheetId: null, form: null, menuBuka: false })

let dimuat = false
data.subscribe((d) => {
  if (!dimuat) return
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {}
})
dimuat = true

/** @param {Fields} fields @returns {string} */
export function tambahAkar(fields) {
  const id = idBaru()
  data.update((d) => {
    d.anggota.push({ id, ...fields, ayah: null, ibu: null, pasangan: [] })
    return d
  })
  return id
}

// Salah satu dari ayahId/ibuId boleh null, tidak keduanya.
/** @param {string|null} ayahId @param {string|null} ibuId @param {Fields} fields @returns {string} */
export function tambahAnak(ayahId, ibuId, fields) {
  const id = idBaru()
  data.update((d) => {
    d.anggota.push({ id, ...fields, ayah: ayahId, ibu: ibuId, pasangan: [] })
    return d
  })
  return id
}

// Satu-satunya penulisan ganda: dicatat di kedua pihak, atomik dalam satu update.
/** @param {string} orangId @param {Fields} fields @returns {string} */
export function tambahPasangan(orangId, fields) {
  const id = idBaru()
  data.update((d) => {
    d.anggota.push({ id, ...fields, ayah: null, ibu: null, pasangan: [orangId] })
    const org = d.anggota.find((a) => a.id === orangId)
    if (org) org.pasangan = [...(org.pasangan || []), id]
    return d
  })
  return id
}

/** @param {string} aId @param {string} bId */
export function pisahkanPasangan(aId, bId) {
  data.update((d) => {
    const a = d.anggota.find((x) => x.id === aId)
    const b = d.anggota.find((x) => x.id === bId)
    if (a) a.pasangan = (a.pasangan || []).filter((p) => p !== bId)
    if (b) b.pasangan = (b.pasangan || []).filter((p) => p !== aId)
    return d
  })
}

// Hanya field personal; relasi tidak tersentuh.
/** @param {string} id @param {Partial<Fields>} patch */
export function perbarui(id, patch) {
  data.update((d) => {
    const org = d.anggota.find((a) => a.id === id)
    if (org) Object.assign(org, patch)
    return d
  })
}

// Hapus satu anggota; pointer ke dia dibersihkan dari semua orang lain.
// Tidak ada cascade: anak/pasangan tidak ikut terhapus.
/** @param {string} id */
export function hapus(id) {
  data.update((d) => {
    d.anggota = d.anggota.filter((a) => a.id !== id)
    for (const a of d.anggota) {
      if (a.ayah === id) a.ayah = null
      if (a.ibu === id) a.ibu = null
      if ((a.pasangan || []).includes(id)) a.pasangan = a.pasangan.filter((p) => p !== id)
    }
    return d
  })
}

/** @param {any} obj @returns {boolean} */
export function muatJSON(obj) {
  if (!obj || typeof obj.nama_keluarga !== 'string' || !Array.isArray(obj.anggota)) {
    alert('File tidak dikenali sebagai file silsilah.')
    return false
  }
  data.set(obj)
  return true
}

export function hapusSemua() {
  data.set({ ...DEFAULT, anggota: [] })
}

/** @param {string} nama */
export function gantiNamaKeluarga(nama) {
  data.update((d) => {
    d.nama_keluarga = nama
    return d
  })
}

// Menentukan posisi ayah/ibu dari gender: 'P' → ibu, selain itu ('L'/'') → ayah.
// pasanganId null berarti anak dari satu orang tua saja.
/** @param {string|undefined} targetId @param {string|null} pasanganId @returns {{ ayah: string|null, ibu: string|null }} */
export function ortuAnakDari(targetId, pasanganId) {
  const anggota = get(data).anggota
  const target = anggota.find((a) => a.id === targetId)
  if (!pasanganId) {
    return target && target.gender === 'P'
      ? { ayah: null, ibu: /** @type {string} */ (targetId) }
      : { ayah: targetId ?? null, ibu: null }
  }
  const pas = anggota.find((a) => a.id === pasanganId)
  const gt = target?.gender
  const gp = pas?.gender
  if (gt === 'P' && gp !== 'P') return { ayah: pasanganId, ibu: /** @type {string} */ (targetId) }
  if (gp === 'P' && gt !== 'P') return { ayah: /** @type {string} */ (targetId), ibu: pasanganId }
  return { ayah: targetId ?? null, ibu: pasanganId }
}
