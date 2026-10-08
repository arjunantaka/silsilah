# 🌳 Silsilah Keluarga: PWA pencatatan silsilah

Aplikasi pencatatan silsilah keluarga bergaya "kasir": sederhana, besar tombolnya, bisa dipakai dari HP, offline, dan datanya milik Anda sendiri (localStorage + file JSON). Setiap orang diberi kode keturunan yang Anda ketik sendiri (mis. `A1`, `A1P1`, `A1P1B1`) supaya gampang ditelusuri sampai canggah.

## ✨ Fitur

- **Satu pohon, satu daftar orang.** Anggota bisa ditambah dari mana saja (termasuk sebagai orang lepas tanpa relasi) lalu disambungkan kapan pun.
- **Kode ditulis sendiri** di form, disimpan sebagai data (aplikasi tidak menghitungnya):
  - `A1`, `A2`, …: anak dari trah (orang di pangkal pohon).
  - `P1`, `P2`, …: putu/cucu (`A1P1`).
  - `B1`, `B2`, …: buyut (`A1P1B1`), lalu `C…` untuk canggah, dan seterusnya.
  - Kode boleh sama antar orang; form hanya memberi peringatan kuning, tidak melarang.
- **Data anggota lengkap**: nama, kode, gender, tempat lahir, tanggal lahir, alamat, pekerjaan/sekolah, wafat, catatan.
- **Sambung belakangan** dari kader orang: `🔗 Jadikan Anak…` (pilih ayah/ibu) dan `💑 Pasangkan dengan…` (pilih orang yang sudah ada).
- **Kader menampilkan hitungan** `Anak (n)` dan `Cucu (n)`; tiap nama adalah chip yang bisa ditekan untuk pindah ke orangnya.
- **📊 Tabel Keturunan** (di kader): unduh CSV berisi orang itu di baris pertama, lalu anak, putu, buyut, … hingga terbawah; kolom Kode, Nama, Tempat Tanggal Lahir, Alamat, Pekerjaan, Suami/Istri, Orang Tua.
- **Pencarian** nama atau kode (mis. `a1p1`): hasil di-tap → kader terbuka, kotak orang disorot dan digulir ke tengah.
- **Tanpa validasi mengikat**: pasangan boleh banyak, urutan anak = urutan pencatatan, tanggal bebas teks.
- **Simpan otomatis** ke localStorage; tambahan: **Simpan/Buka File JSON**, **Unduh CSV** (semua anggota, kolom kode + tempat lahir/alamat/pekerjaan), **Cetak/PDF** (landscape, hanya pohon).
- **Cloud sebagai database** dengan kunci keluarga: **tersimpan otomatis** - setiap perubahan dikirim ke cloud 3 detik setelah berhenti mengetik. Saat keluarga dibuat, kode dibuat otomatis (mis. `keluarga-sutrisno-7k2m9x`) dan muncul di baris status bersama tombol **🔗 Salin Tautan**.
- **Daftar keluarga** di layar kosong: semua keluarga yang sudah tersimpan di database ditampilkan (nama, jumlah orang, kode) dan bisa dibuka dengan satu tekan; membuka lewat `?kode=...` juga selalu menarik dokumen itu dari database.
- **Buat silsilah baru**: menu → **➕ Silsilah Baru** — dokumen kerja dikosongkan dan kode dilepas, jadi keluarga berikutnya mendapat kode baru; keluarga lama tetap di database dan bisa dibuka lagi dari daftar. (Di perangkat/HP yang belum pernah dipakai, cukup buka situs lalu tekan **➕ Mulai: Orang Pertama**.)
- **PWA**: bisa di-install ke home screen, service worker cache-first untuk offline.

## 🚀 Menjalankan

```bash
npm install
npm run dev      # server di http://localhost:1420
npm run build    # build produksi ke dist/
npm run preview  # pratinjau hasil build
```

## 📖 Cara Pakai Singkat

1. **Mulai**: buka aplikasi, tekan `➕ Mulai: Orang Pertama`, isi nama + kode (gender/tanggal boleh dikosongkan).
2. **Tambah keluarga**: tap kotak orang → `➕ Tambah Anak` / `💑 Tambah Pasangan`; isi Kode, Tempat Lahir, Alamat, Pekerjaan/Sekolah bila perlu.
3. **Orang lepas**: `☰ Menu` → `👤 Tambah Orang (Lepas)` untuk mencatat siapa pun dulu; sambungkan nanti lewat `🔗 Jadikan Anak…` atau `💑 Pasangkan dengan…`.
4. **Cari**: kolom `🔍 Cari nama atau kode…` di bawah toolbar.
5. **Lihat keturunan**: tap kotak orang → kader menampilkan `Anak (n)` dan `Cucu (n)`; tekan `📊 Tabel Keturunan` untuk mengunduh keturunannya sebagai CSV.
6. **Backup**: `☰ Menu` → `💾 Simpan File` (JSON) atau `📂 Buka File` untuk memuat kembali; `📊 Unduh CSV` untuk Excel.

## 🛠️ Teknologi

- Svelte 4 + Vite, tanpa framework CSS. Database: Cloudflare KV lewat Pages Functions (opsional).
- Satu sumber kebenaran: `anggota[]` dengan pointer `ayah`/`ibu`/`pasangan[]` (tidak ada tabel turunan).
- Identitas orang = UUID. Kode (`A1P1B1`, …) diketik manual dan disimpan apa adanya; file JSON lama yang belum punya `kode`/`tempat_lahir`/`alamat`/`pekerjaan` tetap bisa dibuka (kolomnya diisi kosong).

## 📁 Struktur

```
src/
├── App.svelte          # toolbar, menu, pencarian, layar kosong
├── TreeView.svelte     # daftar akar pohon
├── CoupleNode.svelte   # kotak pasangan + anak (rekursif, garis CSS)
├── Sheet.svelte        # kader data orang + aksi (tambah/hubung/edit/hapus/ekspor keturunan)
├── PersonForm.svelte   # form tambah/edit & form sambung relasi
├── store.js            # data + ui + aksi (tambah/set ortu/pasangkan/hapus)
├── export.js           # unduh JSON/CSV/tabel keturunan & buka file
├── cloud.js            # simpan/ambil via kunci keluarga + kode otomatis + daftar keluarga
├── sinkron.js          # autosave (debounce 3 detik) + status tersimpan/gagal
├── app.css             # gaya global + pola garis pohon + @media print
└── main.js             # entry + registrasi service worker
public/                 # icon.svg, manifest.webmanifest, sw.js
functions/api/          # endpoint cloud (Pages Functions)
tests/                  # Playwright e2e
```

## 🔧 Commands

| Command | Deskripsi |
|---------|-----------|
| `npm start` | Dev server + buka browser |
| `npm run dev` | Dev server (port 1420) |
| `npm run build` | Build produksi |
| `npm run preview` / `serve` | Pratinjau hasil build |
| `npm run check` | Type-check Svelte |
| `npm test:e2e` | Jalankan tes Playwright |

## 📝 Changelog

- **v1.3.0**: Kode keturunan kini diketik manual dan disimpan (`kode`), bukan lagi dihitung dari relasi; `src/kode.js` dihapus. Kolom anggota dilengkapi **Tempat Lahir, Alamat, Pekerjaan/Sekolah** (form, kader, JSON, CSV). Kader menampilkan `Anak (n)` dan `Cucu (n)` dengan chip yang bisa ditekan. Tombol `📊 Tabel Keturunan` mengunduh keturunan seseorang sebagai CSV (orangnya dulu, lalu anak → putu → buyut, dengan kolom Suami/Istri dan Orang Tua). Kode duplikat diperingatkan, tidak dilarang. File lama tetap kompatibel.
- **v1.2.0**: Kode hierarki tampil di kotak/kader/CSV (`A1`, `A1P1`, `A1B1`, …), pencarian nama & kode dengan sorot otomatis, dan tombol `Tambah Orang (Lepas)` + `Jadikan Anak…` / `Pasangkan dengan…` untuk menyambungkan orang yang sudah ada. JSON tetap tanpa kolom kode (kompatibel dengan file lama).

## 📄 Lisensi

MIT: bebas dipakai dan diubah.