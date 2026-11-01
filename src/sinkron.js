// Sinkron otomatis: tiap perubahan data dikirim ke cloud (debounce 3 detik).
// Kode keluarga dibuat otomatis saat penyimpanan pertama.
import { writable, get } from 'svelte/store'
import { data } from './store.js'
import { simpanKeCloud, buatKodeBaru } from './cloud.js'

const JEDA_MS = 3000
const KEY_KODE = 'silsilah:kode'

/** @type {import('svelte/store').Writable<'idle'|'menyimpan'|'tersimpan'|'gagal'|'ditahan'>} */
export const statusSinkron = writable('idle')
/** @type {import('svelte/store').Writable<string>} */
export const kodeKeluarga = writable(localStorage.getItem(KEY_KODE) || '')

/** @type {any} */
let timer = null
/** @type {Promise<void>|null} */
let antre = null
// Ada perubahan baru yang belum masuk ke permintaan PUT mana pun.
let perlu = false
// Konflik cloud vs cache belum diputuskan: jangan tulis apa pun ke cloud.
let ditahan = false

/**
 * Tahan/lepas autosave. Dipakai saat cloud dan cache perangkat berbeda supaya
 * cache lama tidak menimpa database sebelum pengguna memilih.
 * @param {boolean} nilai
 */
export function tahanSinkron(nilai) {
  ditahan = nilai
  if (nilai) {
    clearTimeout(timer)
    timer = null
    statusSinkron.set('ditahan')
  } else if (get(statusSinkron) === 'ditahan') {
    statusSinkron.set('idle')
  }
}

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
  if (ditahan) {
    statusSinkron.set('ditahan')
    return Promise.resolve()
  }
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
  if (ditahan) return
  clearTimeout(timer)
  timer = setTimeout(() => simpanSekarang(), JEDA_MS)
}

/**
 * Mulai sinkron otomatis; kembalikan unsubscribe.
 *
 * Emisi pertama dari subscribe bukan perubahan pengguna: itu dokumen lama dari
 * localStorage. Jangan langsung mendorongnya ke cloud karena bisa menimpa
 * dokumen yang lebih baru (mis. cache 49 orang vs database 180 orang).
 * Dokumen tanpa kode tetap didorong agar keluarga lama mendapat kode baru.
 */
export function mulaiSinkron() {
  let pertama = true
  const berhenti = data.subscribe((d) => {
    if (pertama) {
      pertama = false
      if (!get(kodeKeluarga) && d.anggota.length > 0) jadwal()
      return
    }
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
