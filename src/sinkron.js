// Sinkron otomatis: tiap perubahan data dikirim ke cloud (debounce 3 detik).
// Kode keluarga dibuat otomatis saat penyimpanan pertama.
import { writable, get } from 'svelte/store'
import { data } from './store.js'
import { simpanKeCloud, buatKodeBaru } from './cloud.js'

const JEDA_MS = 3000
const KEY_KODE = 'silsilah:kode'

/** @type {import('svelte/store').Writable<'idle'|'menyimpan'|'tersimpan'|'gagal'>} */
export const statusSinkron = writable('idle')
/** @type {import('svelte/store').Writable<string>} */
export const kodeKeluarga = writable(localStorage.getItem(KEY_KODE) || '')

/** @type {any} */
let timer = null
let sedang = false

/** @param {string} kode */
function setKode(kode) {
  kodeKeluarga.set(kode)
  try {
    localStorage.setItem(KEY_KODE, kode)
  } catch {}
}

// Lepas kode: data berikutnya mendapat kode keluarga baru
// (dipakai saat membuka file JSON dan Silsilah Baru - jangan menimpa keluarga lama).
export function lepasKode() {
  kodeKeluarga.set('')
  try {
    localStorage.removeItem(KEY_KODE)
  } catch {}
}

/** Simpan sekarang tanpa menunggu debounce; juga tombol "Coba lagi". */
export async function simpanSekarang() {
  const d = get(data)
  if (sedang || d.anggota.length === 0) return
  sedang = true
  statusSinkron.set('menyimpan')
  try {
    let kode = get(kodeKeluarga)
    if (!kode) {
      kode = await buatKodeBaru()
      setKode(kode)
    }
    await simpanKeCloud(kode)
    statusSinkron.set('tersimpan')
  } catch {
    statusSinkron.set('gagal')
  } finally {
    sedang = false
  }
}

function jadwal() {
  clearTimeout(timer)
  timer = setTimeout(() => simpanSekarang(), JEDA_MS)
}

/**
 * Mulai sinkron otomatis; kembalikan unsubscribe. Subscribe langsung menembakkan
 * nilai sekarang, jadi perangkat dengan data lokal lama ikut terdorong 3 detik setelah dibuka.
 */
export function mulaiSinkron() {
  return data.subscribe((d) => {
    if (d.anggota.length > 0) jadwal()
  })
}