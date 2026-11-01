// Sumber kebenaran tunggal: satu entitas `anggota` dengan pointer relasi.
// Filosofi "kasir": tanpa validasi relasi, tanpa tabel turunan.
/**
 * @import { Writable } from 'svelte/store'
 */

/**
 * @typedef {Object} Anggota
 * @property {string} id
 * @property {string} nama
 * @property {string} kode
 * @property {'L'|'P'|''} gender
 * @property {string} lahir
 * @property {string} wafat
 * @property {string} catatan
 * @property {string} tempat_lahir
 * @property {string} alamat
 * @property {string} pekerjaan
 * @property {string|null} ayah
 * @property {string|null} ibu
 * @property {string[]} pasangan
 * @property {string[]} pisah
 */

/**
 * @typedef {Object} DataKeluarga
 * @property {string} nama_keluarga
 * @property {Anggota[]} anggota
 */

/**
 * @typedef {Object} Fields
 * @property {string} nama
 * @property {string} kode
 * @property {'L'|'P'|''} gender
 * @property {string} lahir
 * @property {string} wafat
 * @property {string} catatan
 * @property {string} tempat_lahir
 * @property {string} alamat
 * @property {string} pekerjaan
 */

/**
 * @typedef {Object} FormUI
 * @property {'akar'|'anak'|'pasangan'|'edit'|'ortu'|'pasang'} mode
 * @property {string} [targetId]
 * @property {{ ayah: string|null, ibu: string|null }} [ortu]
 * @property {string[]} [kandidat]
 */

import { writable, get } from 'svelte/store'
import { bandingKode } from './urut.js'

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
      if (obj && typeof obj.nama_keluarga === 'string' && Array.isArray(obj.anggota)) {
        obj.anggota = obj.anggota.map((/** @type {any} */ a) => ({ kode: '', tempat_lahir: '', alamat: '', pekerjaan: '', pisah: [], ...a }))
        return obj
      }
    }
  } catch {}
  return { ...DEFAULT, anggota: [] }
}

// Keturunan per generasi (BFS): hasil[0] = anak, hasil[1] = cucu, dst.
// Anak yang hanya punya satu orang tua ikut dihitung sebagai anak pasangan orang
// tua itu (ayah/ibu yang kosong dianggap pasangannya), supaya tetap masuk keluarga.
// seen menahan siklus dari file impor rusak dan kotak dobel.
/** @param {Anggota[]} anggota @param {string} akarId @returns {Anggota[][]} */
export function generasiKeturunan(anggota, akarId) {
  const seen = new Set([akarId])
  let batas = [akarId]
  /** @type {Anggota[][]} */
  const hasil = []
  /** @param {Anggota} a @param {Anggota} c @returns {boolean} */
  const anakDari = (a, c) => {
    if (c.ayah === a.id || c.ibu === a.id) return true
    const pasangan = a.pasangan || []
    if (c.ayah === null && c.ibu !== null && pasangan.includes(c.ibu)) return true
    if (c.ibu === null && c.ayah !== null && pasangan.includes(c.ayah)) return true
    return false
  }
  while (batas.length > 0) {
    const ortu = anggota.filter((a) => batas.includes(a.id))
    const gen = anggota.filter((c) => !seen.has(c.id) && ortu.some((a) => anakDari(a, c)))
    if (gen.length === 0) break
    gen.sort(bandingKode)
    for (const c of gen) seen.add(c.id)
    hasil.push(gen)
    batas = gen.map((c) => c.id)
  }
  return hasil
}

/** @type {Writable<DataKeluarga>} */
export const data = writable(muatAwal())

/** @type {Writable<{ sheetId: string|null, form: FormUI|null, menuBuka: boolean, fokusId: string|null, trahId: string|null, tampilDaftar: boolean }>} */
export const ui = writable({ sheetId: null, form: null, menuBuka: false, fokusId: null, trahId: null, tampilDaftar: false })

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
    d.anggota.push({ id, ...fields, ayah: null, ibu: null, pasangan: [], pisah: [] })
    return d
  })
  return id
}

// Salah satu dari ayahId/ibuId boleh null, tidak keduanya.
/** @param {string|null} ayahId @param {string|null} ibuId @param {Fields} fields @returns {string} */
export function tambahAnak(ayahId, ibuId, fields) {
  const id = idBaru()
  data.update((d) => {
    d.anggota.push({ id, ...fields, ayah: ayahId, ibu: ibuId, pasangan: [], pisah: [] })
    return d
  })
  return id
}

// Satu-satunya penulisan ganda: dicatat di kedua pihak, atomik dalam satu update.
/** @param {string} orangId @param {Fields} fields @returns {string} */
export function tambahPasangan(orangId, fields) {
  const id = idBaru()
  data.update((d) => {
    d.anggota.push({ id, ...fields, ayah: null, ibu: null, pasangan: [orangId], pisah: [] })
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
    if (a) {
      a.pasangan = (a.pasangan || []).filter((p) => p !== bId)
      a.pisah = (a.pisah || []).filter((p) => p !== bId)
    }
    if (b) {
      b.pasangan = (b.pasangan || []).filter((p) => p !== aId)
      b.pisah = (b.pisah || []).filter((p) => p !== aId)
    }
    return d
  })
}

// Sambungkan orang (yang sudah ada, mungkin lepas) ke orang tua; null = tidak diketahui.
// Kode anggota tidak berubah: kode diketik manual oleh user.
/** @param {string} id @param {string|null} ayahId @param {string|null} ibuId */
export function setOrtu(id, ayahId, ibuId) {
  data.update((d) => {
    const org = d.anggota.find((a) => a.id === id)
    if (org) {
      org.ayah = ayahId
      org.ibu = ibuId
    }
    return d
  })
}

// Pasangkan dua orang yang sudah ada: penulisan ganda atomik di kedua pihak,
// pola sama seperti tambahPasangan/pisahkanPasangan.
/** @param {string} aId @param {string} bId */
export function tautkanPasangan(aId, bId) {
  data.update((d) => {
    const a = d.anggota.find((x) => x.id === aId)
    const b = d.anggota.find((x) => x.id === bId)
    if (!a || !b || a.id === b.id) return d
    if (!(a.pasangan || []).includes(bId)) a.pasangan = [...(a.pasangan || []), bId]
    if (!(b.pasangan || []).includes(aId)) b.pasangan = [...(b.pasangan || []), aId]
    return d
  })
}

// Tandai/batalkan pisah (cerai): relasi pasangan tetap ada, hanya ditandai.
// Penulisan ganda atomik di kedua pihak, pola sama seperti tautkanPasangan.
/** @param {string} aId @param {string} bId */
export function tandaiPisah(aId, bId) {
  data.update((d) => {
    for (const x of d.anggota) {
      if (x.id !== aId && x.id !== bId) continue
      const lawan = x.id === aId ? bId : aId
      const ada = (x.pisah || []).includes(lawan)
      x.pisah = ada ? (x.pisah || []).filter((p) => p !== lawan) : [...(x.pisah || []), lawan]
    }
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
      if ((a.pisah || []).includes(id)) a.pisah = a.pisah.filter((p) => p !== id)
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
  data.set({
    nama_keluarga: obj.nama_keluarga,
    anggota: obj.anggota.map((/** @type {any} */ a) => ({ kode: '', tempat_lahir: '', alamat: '', pekerjaan: '', pisah: [], ...a })),
  })
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
