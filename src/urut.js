// Urutan tampilan berdasarkan kode, bukan urutan input.
// Kode dinormalisasi ke huruf besar supaya typo seperti "A4p1B1" tetap
// sekelompok dengan "A4P1B1". Kode kosong diletakkan paling akhir; nama
// menjadi tie-breaker agar hasil stabil.

/**
 * @param {{ kode?: string, nama?: string }} a
 * @param {{ kode?: string, nama?: string }} b
 * @returns {number}
 */
export function bandingKode(a, b) {
  const ka = (a.kode || '').trim().toUpperCase()
  const kb = (b.kode || '').trim().toUpperCase()
  if (ka && !kb) return -1
  if (!ka && kb) return 1
  if (!ka && !kb) return 0
  if (ka !== kb) return ka.localeCompare(kb, 'id', { numeric: true, sensitivity: 'base' })
  return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' })
}

/**
 * @template {{ kode?: string, nama?: string }} T
 * @param {T[]} daftar
 * @returns {T[]}
 */
export function urutKode(daftar) {
  return [...daftar].sort(bandingKode)
}
