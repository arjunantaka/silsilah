// Unduh CSV, dan util nama file.
import { get } from 'svelte/store'
import { data, generasiKeturunan } from './store.js'
import { bandingKode } from './urut.js'

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

/** @param {unknown} nilai @returns {string} */
function kolomCSV(nilai) {
  return `"${String(nilai ?? '').replace(/"/g, '""')}"`
}

export function unduhCSV() {
  const d = get(data)
  const byId = new Map(d.anggota.map((a) => [a.id, a.nama]))
  const baris = [
    ['kode', 'nama', 'gender', 'tempat_lahir', 'lahir', 'wafat', 'alamat', 'pekerjaan', 'ayah', 'ibu', 'pasangan', 'catatan'],
  ]
  // Urut kode natural (A1P2 < A1P10), case-insensitive; tanpa kode di akhir.
  const urut = [...d.anggota].sort(bandingKode)
  for (const a of urut) {
    baris.push([
      a.kode || '',
      a.nama,
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
// (anak → cucu → buyut → canggah) hingga terbawah.
/** @param {string} akarId */
export function unduhKeturunanCSV(akarId) {
  const d = get(data)
  const byId = new Map(d.anggota.map((a) => [a.id, a]))
  const akar = byId.get(akarId)
  if (!akar) return

  const urut = [akar, ...generasiKeturunan(d.anggota, akarId).flat()]

  const baris = [['kode', 'nama', 'tempat tanggal lahir', 'alamat', 'pekerjaan', 'suami/istri', 'orang tua']]
  for (const a of urut) {
    baris.push([
      a.kode || '',
      a.nama,
      [a.tempat_lahir, a.lahir].filter(Boolean).join(', '),
      a.alamat,
      a.pekerjaan,
      // Mantan pasangan (pisah) dikecualikan dari keterangan suami/istri.
      (a.pasangan || [])
        .filter((p) => !(a.pisah || []).includes(p))
        .map((p) => byId.get(p)?.nama || '')
        .filter(Boolean)
        .join('; '),
      // Sisi orang tua yang kosong ditandai "ayah X" / "ibu X"; akar (keduanya
      // kosong) tetap dikosongkan.
      a.ayah || a.ibu
        ? [
            a.ayah ? byId.get(a.ayah)?.nama || '' : 'ayah X',
            a.ibu ? byId.get(a.ibu)?.nama || '' : 'ibu X',
          ].join(' & ')
        : '',
    ])
  }
  const csv = '\uFEFF' + baris.map((r) => r.map(kolomCSV).join(',')).join('\r\n')
  const slug = akar.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  unduh(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `keturunan-${slug || 'silsilah'}.csv`)
}
