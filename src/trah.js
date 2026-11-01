// Menyiapkan sub-pohon untuk satu orang: dirinya + semua pasangan + seluruh
// keturunan. Dipakai oleh mode "fokus trah" dari pencarian.
//
// Kenapa datanya disalin dan bukan cuma difilter saat render: CoupleNode
// menentukan pemilik baris anak dari ada/tidaknya orang tua di dokumen. Dengan
// menyalin hanya anggota trah, orang tua di luar trah dianggap tidak diketahui,
// sehingga pasangan yang menikah masuk tetap tergambar sebagai pasangan, bukan
// "punya orang tua" yang tidak ikut ditampilkan.

import { bandingKode } from './urut.js'

/**
 * @import { Anggota } from './store.js'
 */

/**
 * @typedef {Object} Trah
 * @property {Anggota[]} anggota
 * @property {number} jumlah
 * @property {number} jumlahDarah
 * @property {string} nama
 * @property {{ ayah: string|null, ibu: string|null }} ortu
 * @property {Anggota[]} saudara
 */

/** @param {string|null|undefined} id @param {Set<string>} ada @returns {string|null} */
function dalam(id, ada) {
  return id && ada.has(id) ? id : null
}

/**
 * Semua anak dari sekumpulan orang tua, satu generasi.
 * @param {Anggota[]} anggota
 * @param {Set<string>} orangTua
 * @param {Set<string>} sudah
 * @returns {Anggota[]}
 */
function anakDari(anggota, orangTua, sudah) {
  return anggota.filter(
    (a) =>
      !sudah.has(a.id) &&
      ((a.ayah !== null && orangTua.has(a.ayah)) || (a.ibu !== null && orangTua.has(a.ibu))),
  )
}

/**
 * @param {Anggota[]} anggota
 * @param {string} rootId
 * @returns {Trah|null}
 */
export function trahDari(anggota, rootId) {
  const byId = new Map(anggota.map((a) => [a.id, a]))
  const akar = byId.get(rootId)
  if (!akar) return null

  // 1. Garis darah: BFS anak -> cucu -> seterusnya. Pasangan tidak dipakai
  //    untuk mencari anak, supaya anak dari pernikahan lain tidak ikut.
  /** @type {Set<string>} */
  const darah = new Set([rootId])
  /** @type {string[]} */
  const darahUrut = []
  let batas = new Set([rootId])
  while (batas.size > 0) {
    const anak = anakDari(anggota, batas, darah)
    if (anak.length === 0) break
    anak.sort(bandingKode)
    for (const a of anak) {
      darah.add(a.id)
      darahUrut.push(a.id)
    }
    batas = new Set(anak.map((a) => a.id))
  }

  // 2. Tambahkan semua pasangan (dua arah, karena data impor bisa satu arah).
  /** @type {Set<string>} */
  const tampil = new Set(darah)
  for (const a of anggota) {
    if (darah.has(a.id)) {
      for (const id of a.pasangan || []) if (byId.has(id)) tampil.add(id)
    }
    for (const id of a.pasangan || []) {
      if (darah.has(id)) tampil.add(a.id)
    }
  }

  // 3. Urutan stabil: akar dulu, lalu pasangan akar, lalu keturunan per generasi.
  //    Urutan penting bagi TreeView: akar harus lebih dulu dari pasangannya agar
  //    akar tidak "hilang" dan digambar sebagai pasangan orang lain.
  /** @type {string[]} */
  const urutan = []
  /** @param {string} id */
  const masukkan = (id) => {
    if (tampil.has(id) && !urutan.includes(id)) urutan.push(id)
  }
  /** @param {string} id @returns {Anggota[]} */
  const pasanganDari = (id) => {
    const orang = byId.get(id)
    if (!orang) return []
    return anggota
      .filter((a) => (orang.pasangan || []).includes(a.id) || (a.pasangan || []).includes(id))
      .sort(bandingKode)
  }
  masukkan(rootId)
  for (const a of pasanganDari(rootId)) masukkan(a.id)
  for (const id of darahUrut) {
    masukkan(id)
    for (const a of pasanganDari(id)) masukkan(a.id)
  }

  /** @type {Anggota[]} */
  const hasil = urutan.map((id) => {
    const a = /** @type {Anggota} */ (byId.get(id))
    return {
      ...a,
      ayah: dalam(a.ayah, tampil),
      ibu: dalam(a.ibu, tampil),
      pasangan: (a.pasangan || []).filter((pid) => tampil.has(pid)),
      pisah: (a.pisah || []).filter((pid) => tampil.has(pid)),
    }
  })

  // Saudara sederajat: berbagi setidaknya satu orang tua. Ditampilkan sebagai
  // chips di banner agar pencarian nama anak tetap memberi konteks generasinya.
  const saudara = anggota
    .filter(
      (a) =>
        a.id !== rootId &&
        ((akar.ayah !== null && a.ayah === akar.ayah) || (akar.ibu !== null && a.ibu === akar.ibu)),
    )
    .sort(bandingKode)

  return {
    anggota: hasil,
    jumlah: hasil.length,
    jumlahDarah: darah.size,
    nama: akar.nama,
    ortu: { ayah: akar.ayah, ibu: akar.ibu },
    saudara,
  }
}
