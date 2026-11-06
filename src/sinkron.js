// Sinkron otomatis dua arah: setiap perubahan lokal dikirim ke cloud
// (debounce 1,5 detik), perubahan user lain ditarik lewat delta (tiap 10 detik
// saat tab terlihat, langsung setelah kirim/online/tab kembali terlihat).
// Cloud D1 sumber kebenaran: tidak ada konflik, tidak ada mode data lokal.
// localStorage hanya cache render dan antrean offline.
import { writable, get } from 'svelte/store'
import {
  data,
  saatUbah,
  ambilAntrean,
  jumlahAntrean,
  aturKodeAntrean,
  bersihkanAntrean,
  kosongkanAntrean,
  terapkanRemote,
  terapkanDokumen,
} from './store.js'
import { kirimPerubahan, ambilDelta, buatKodeBaru } from './cloud.js'

const JEDA_KIRIM = 1500
const JEDA_TARIK = 10000
const KEY_KODE = 'silsilah:kode'
const KEY_REVISI = 'silsilah:revisi'

/** @type {import('svelte/store').Writable<'idle'|'menyimpan'|'tersimpan'|'offline'>} */
export const statusSinkron = writable('idle')
/** @type {import('svelte/store').Writable<string>} */
export const kodeKeluarga = writable(localStorage.getItem(KEY_KODE) || '')
/** Kursor perubahan cloud yang sudah diterapkan dokumen aktif. */
export const revisiKeluarga = writable(Number(localStorage.getItem(KEY_REVISI)) || 0)

/**
 * Simpan kursor revisi dokumen aktif.
 * @param {number} revisi
 */
export function setRevisi(revisi) {
  const n = Number.isInteger(revisi) && revisi >= 0 ? revisi : 0
  revisiKeluarga.set(n)
  try {
    localStorage.setItem(KEY_REVISI, String(n))
  } catch {}
}

/** @param {string} kode */
function setKode(kode) {
  kodeKeluarga.set(kode)
  try {
    localStorage.setItem(KEY_KODE, kode)
  } catch {}
}

// Lepas kode: data berikutnya mendapat kode keluarga baru (dipakai saat membuka
// file JSON dan Silsilah Baru). Antrean ikut dikosongkan: penahanannya adalah
// ruang kerja lama, bukan keluarga lama di cloud.
export function lepasKode() {
  kodeKeluarga.set('')
  setRevisi(0)
  kosongkanAntrean()
  try {
    localStorage.removeItem(KEY_KODE)
  } catch {}
}

/** @type {any} */
let timerKirim = null
/** @type {any} */
let timerTarik = null
let sedangKirim = false
let sedangTarik = false

function jadwalKirim() {
  clearTimeout(timerKirim)
  timerKirim = setTimeout(() => {
    simpanSekarang()
  }, JEDA_KIRIM)
}

/**
 * Dorong antrean sekarang tanpa menunggu debounce; juga tombol "Coba lagi".
 * true bila tidak ada yang perlu dikirim atau semua terkirim. Kegagalan
 * jaringan tidak melempar: status menjadi 'offline' dan antrean menunggu.
 * @returns {Promise<boolean>}
 */
export async function simpanSekarang() {
  const { kode: kodeAntrean, nama, entri } = ambilAntrean()
  if (entri.length === 0 && !nama) return true
  if (sedangKirim) {
    // Ada kirim lain yang sedang jalan: coba lagi begitu itu selesai.
    jadwalKirim()
    return false
  }
  sedangKirim = true
  try {
    let kode = kodeAntrean || get(kodeKeluarga)
    if (!kode) {
      kode = await buatKodeBaru()
      setKode(kode)
    }
    aturKodeAntrean(kode)
    statusSinkron.set('menyimpan')
    await kirimPerubahan(kode, {
      perubahan: entri.map(([id, rec]) => ({ id, rec })),
      nama: get(data).nama_keluarga,
    })
    bersihkanAntrean(entri, nama)
    statusSinkron.set('tersimpan')
    tarikSekarang()
    return true
  } catch {
    statusSinkron.set('offline')
    // Tidak menjadwalkan ulang otomatis: percobaan berikutnya menunggu
    // perubahan baru, online, atau tab kembali terlihat.
    return false
  } finally {
    sedangKirim = false
  }
}

// Dorong terbaik saat tab ditutup: keepalive membiarkan permintaan tetap
// jalan setelah halaman mati (batas keepalive 64 KB, cukup untuk edit biasa).
function dorongSaatTutup() {
  const { kode: kodeAntrean, nama, entri } = ambilAntrean()
  if (entri.length === 0 && !nama) return
  const kode = kodeAntrean || get(kodeKeluarga)
  if (!kode) return
  kirimPerubahan(
    kode,
    { perubahan: entri.map(([id, rec]) => ({ id, rec })), nama: get(data).nama_keluarga },
    { keepalive: true },
  )
    .then(() => bersihkanAntrean(entri, nama))
    .catch(() => {}) // gagal: antrean tetap ada untuk sesi berikutnya
}

/**
 * Tarik perubahan user lain sekarang. Kursor hanya maju ke revisi yang
 * barisnya benar-benar sudah diterapkan; flush server atomik, jadi tidak ada
 * perubahan yang terlewati.
 */
export async function tarikSekarang() {
  const kode = get(kodeKeluarga)
  if (!kode || sedangTarik || document.hidden) return
  sedangTarik = true
  try {
    const hasil = await ambilDelta(kode, get(revisiKeluarga))
    if (hasil.penuh && hasil.data) {
      if (terapkanDokumen(hasil.data)) setRevisi(hasil.revisi)
    } else {
      terapkanRemote(hasil.ubah, hasil.nama_keluarga)
      setRevisi(hasil.revisi)
    }
    if (hasil.ubah && hasil.ubah.length > 0) kanal?.postMessage('ubah')
  } catch {
    // offline / kode belum ada: coba lagi pada jadwal berikutnya
  } finally {
    sedangTarik = false
  }
}

function jadwalTarik() {
  clearTimeout(timerTarik)
  timerTarik = setTimeout(() => {
    tarikSekarang().finally(jadwalTarik)
  }, JEDA_TARIK)
}

// Tab lain di browser yang sama langsung tahu ada perubahan.
const kanal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('silsilah') : null
kanal?.addEventListener('message', () => tarikSekarang())

/**
 * Mulai sinkron dua arah; kembalikan unsubscribe.
 */
export function mulaiSinkron() {
  saatUbah(jadwalKirim)
  const terlihat = () => {
    if (!document.hidden) {
      tarikSekarang()
      simpanSekarang()
    }
  }
  const online = () => {
    tarikSekarang()
    simpanSekarang()
  }
  document.addEventListener('visibilitychange', terlihat)
  window.addEventListener('online', online)
  // Sisa antrean dari sesi offline kemarin: dorong sekarang. Flush memakai
  // kode asal entri, jadi bila antreannya milik keluarga lain (link ?kode=
  // berbeda dibuka saat offline), perubahan lama tetap sampai ke keluarganya.
  if (jumlahAntrean() > 0) simpanSekarang()
  window.addEventListener('pagehide', dorongSaatTutup)
  jadwalTarik()

  return () => {
    document.removeEventListener('visibilitychange', terlihat)
    window.removeEventListener('online', online)
    window.removeEventListener('pagehide', dorongSaatTutup)
    clearTimeout(timerKirim)
    clearTimeout(timerTarik)
  }
}
