// Export/buka file JSON & CSV, dan util nama file.
import { get } from 'svelte/store'
import { data, muatJSON } from './store.js'

/**
 * @import { Anggota } from './store.js'
 */

export function slugNama() {
  const slug = get(data).nama_keluarga.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return slug || 'keluarga'
}

/** @param {Blob} blob @param {string} namaFile */
function unduh(blob, namaFile) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function unduhJSON() {
  const d = get(data)
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })
  unduh(blob, `silsilah-${slugNama()}.json`)
}

/** @param {unknown} nilai @returns {string} */
function kolomCSV(nilai) {
  return `"${String(nilai ?? '').replace(/"/g, '""')}"`
}

export function unduhCSV() {
  const d = get(data)
  const byId = new Map(d.anggota.map((a) => [a.id, a.nama]))
  const baris = [
    ['nama', 'kode', 'gender', 'tempat_lahir', 'lahir', 'wafat', 'alamat', 'pekerjaan', 'ayah', 'ibu', 'pasangan', 'catatan'],
  ]
  for (const a of d.anggota) {
    baris.push([
      a.nama,
      a.kode || '',
      a.gender,
      a.tempat_lahir,
      a.lahir,
      a.wafat,
      a.alamat,
      a.pekerjaan,
      a.ayah ? byId.get(a.ayah) || '' : '',
      a.ibu ? byId.get(a.ibu) || '' : '',
      (a.pasangan || []).map((p) => byId.get(p) || '').filter(Boolean).join('; '),
      a.catatan,
    ])
  }
  const csv = '\uFEFF' + baris.map((r) => r.map(kolomCSV).join(',')).join('\r\n')
  unduh(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `silsilah-${slugNama()}.csv`)
}

// Tabel keturunan: orang akarnya di baris pertama, lalu keturunan BFS per generasi
// (anak → putu → buyut → ...) hingga terbawah. seen menahan siklus dari file impor rusak.
/** @param {string} akarId */
export function unduhKeturunanCSV(akarId) {
  const d = get(data)
  const byId = new Map(d.anggota.map((a) => [a.id, a]))
  const akar = byId.get(akarId)
  if (!akar) return

  const urut = [akar]
  const seen = new Set([akarId])
  let batas = [akarId]
  while (batas.length > 0) {
    const gen = d.anggota
      .filter(
        (c) =>
          !seen.has(c.id) &&
          ((c.ayah !== null && batas.includes(c.ayah)) || (c.ibu !== null && batas.includes(c.ibu))),
      )
      .map((c) => c.id)
    for (const id of gen) {
      seen.add(id)
      urut.push(/** @type {Anggota} */ (byId.get(id)))
    }
    batas = gen
  }

  const baris = [['kode', 'nama', 'tempat tanggal lahir', 'alamat', 'pekerjaan', 'suami/istri', 'orang tua']]
  for (const a of urut) {
    baris.push([
      a.kode || '',
      a.nama,
      [a.tempat_lahir, a.lahir].filter(Boolean).join(', '),
      a.alamat,
      a.pekerjaan,
      (a.pasangan || []).map((p) => byId.get(p)?.nama || '').filter(Boolean).join('; '),
      [a.ayah ? byId.get(a.ayah)?.nama || '' : '', a.ibu ? byId.get(a.ibu)?.nama || '' : '']
        .filter(Boolean)
        .join(' & '),
    ])
  }
  const csv = '\uFEFF' + baris.map((r) => r.map(kolomCSV).join(',')).join('\r\n')
  const slug = akar.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  unduh(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `keturunan-${slug || 'silsilah'}.csv`)
}

/** @param {File} file */
export async function bukaFile(file) {
  let obj
  try {
    obj = JSON.parse(await file.text())
  } catch {
    alert('File tidak dikenali sebagai file silsilah.')
    return
  }
  return muatJSON(obj)
}
