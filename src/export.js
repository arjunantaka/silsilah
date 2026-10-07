// Export/buka file JSON & CSV, dan util nama file.
import { get } from 'svelte/store'
import { data, muatJSON } from './store.js'

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
  const baris = [['nama', 'gender', 'lahir', 'wafat', 'ayah', 'ibu', 'pasangan', 'catatan']]
  for (const a of d.anggota) {
    baris.push([
      a.nama,
      a.gender,
      a.lahir,
      a.wafat,
      a.ayah ? byId.get(a.ayah) || '' : '',
      a.ibu ? byId.get(a.ibu) || '' : '',
      (a.pasangan || []).map((p) => byId.get(p) || '').filter(Boolean).join('; '),
      a.catatan,
    ])
  }
  const csv = '\uFEFF' + baris.map((r) => r.map(kolomCSV).join(',')).join('\r\n')
  unduh(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `silsilah-${slugNama()}.csv`)
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
  muatJSON(obj)
}
