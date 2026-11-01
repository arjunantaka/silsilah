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
/** @type {Promise<void>|null} */
let antre = null
// Ada perubahan baru yang belum masuk ke permintaan PUT mana pun.
let perlu = false

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

/**
 * Simpan sekarang tanpa menunggu debounce; juga tombol "Coba lagi".
 *
 * Perubahan yang datang saat PUT sedang berjalan tidak boleh hilang: dulu
 * pemanggilan kedua langsung `return` karena `sedang`, lalu status tetap
 * "tersimpan" padahal nama/anggota terbaru belum pernah dikirim. Sekarang
 * semua pemanggil masuk antrean dan antrean mengulang selama masih ada
 * perubahan baru.
 */
export function simpanSekarang() {
  perlu = true
  if (antre) return antre

  antre = (async () => {
    let berhasil = true
    try {
      while (perlu) {
        perlu = false
        const d = get(data)
        if (d.anggota.length === 0) break
        statusSinkron.set('menyimpan')
        let kode = get(kodeKeluarga)
        if (!kode) {
          kode = await buatKodeBaru()
          setKode(kode)
        }
        await simpanKeCloud(kode)
        statusSinkron.set('tersimpan')
      }
    } catch {
      berhasil = false
      statusSinkron.set('gagal')
    } finally {
      antre = null
    }
    if (perlu) {
      if (berhasil) simpanSekarang()
      else perlu = false // biarkan pengguna menekan "Coba lagi" / perubahan berikutnya
    }
  })()
  return antre
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
  const berhenti = data.subscribe((d) => {
    if (d.anggota.length > 0) jadwal()
  })
  // Coba lagi otomatis setelah koneksi kembali, tanpa menunggu edit berikutnya.
  const online = () => {
    if (get(statusSinkron) === 'gagal') simpanSekarang()
  }
  window.addEventListener('online', online)
  return () => {
    berhenti()
    window.removeEventListener('online', online)
  }
}
