# 🌳 Silsilah Keluarga: PWA pencatatan silsilah

Aplikasi pencatatan silsilah keluarga bergaya "kasir": sederhana, besar tombolnya, bisa dipakai dari HP, offline, dan datanya milik Anda sendiri (localStorage + Cloudflare D1 sebagai satu sumber kebenaran). Setiap orang diberi kode keturunan yang Anda ketik sendiri (mis. `A1`, `A1P1`, `A1P1B1`) supaya gampang ditelusuri sampai canggah.

## ✨ Fitur

- **Satu pohon, satu daftar orang.** Anggota bisa ditambah dari mana saja (termasuk sebagai orang lepas tanpa relasi) lalu disambungkan kapan pun.
- **Kode ditulis sendiri** di form, disimpan sebagai data (aplikasi tidak menghitungnya):
  - `A1`, `A2`, …: anak dari trah (orang di pangkal pohon).
  - `P1`, `P2`, …: putu/cucu (`A1P1`).
  - `B1`, `B2`, …: buyut (`A1P1B1`), lalu `C…` untuk canggah, dan seterusnya.
  - Kode boleh sama antar orang; form hanya memberi peringatan kuning, tidak melarang.
- **Data anggota lengkap**: nama, kode, gender, tempat lahir, tanggal lahir, alamat, pekerjaan/sekolah, wafat, catatan.
- **Sambung belakangan** dari kader orang: `🔗 Jadikan Anak…` (pilih ayah/ibu, dengan pencarian nama/kode) dan `💑 Pasangkan dengan…` (pilih orang yang sudah ada).
- **Kader ringkas**: hitungan `Anak (n)`, `Cucu (n)`, `Buyut (n)`, `Canggah (n)` (dan `Generasi N` untuk lebih dalam). Nama digambar sebagai rantai teks yang padat, bukan pil besar; tiap nama bisa ditekan untuk pindah ke orangnya.
- **Tanda pisah (cerai)**: di kader, tombol 💔 pada pasangan menandainya `(pisah)`. Relasi tetap tersimpan, di pohon garisnya jadi `✕` dan kotaknya diredupkan, dan mantan pasangan dikecualikan dari kolom Suami/Istri di Tabel Keturunan.
- **📊 Tabel Keturunan** (di kader): unduh CSV berisi orang itu di baris pertama, lalu anak, cucu, buyut, … hingga terbawah; kolom Kode, Nama, Tempat Tanggal Lahir, Alamat, Pekerjaan, Suami/Istri, Orang Tua.
- **Pencarian** nama atau kode (mis. `a1p1`): hasil di-tap → tampil **fokus trah** (orang itu + pasangan + seluruh turunan). Banner menampilkan orang tua dan chip saudara sederajat; tombol besar **↩️ Kembali ke Silsilah** kembali ke pohon lengkap. Di ponsel, tampilan otomatis digeser ke unit orang+pasangan.
- **Pencarian orang** tersedia di **Pasangkan dengan…** dan **Jadikan Anak…**: kolom **Cari orang** menyaring nama/kode, lalu hasilnya tampil sebagai daftar yang bisa langsung dipilih—tanpa dropdown native. Untuk orang tua, pilih peran **Ayah** atau **Ibu**, dan pilihan yang sudah dibuat tetap dipertahankan saat kata pencarian berubah.
- **Tanpa validasi mengikat**: pasangan boleh banyak; urutan tampilan mengikuti **kode** (natural, case-insensitive), bukan waktu input. Anak kandung ditampilkan sebelum anak bawaan pasangan.
- **Simpan otomatis** ke localStorage dan cloud (Cloudflare D1); **Unduh CSV** (semua anggota, kolom `kode` di depan, baris urut kode; yang belum berkode di akhir), **Tabel Keturunan** per orang, dan **Cetak/PDF** (A3 landscape, skala otomatis agar pohon muat).
- **Cloud sebagai satu sumber kebenaran** dengan kunci keluarga: setiap perubahan dikirim otomatis 1,5 detik setelah berhenti mengetik, hanya baris anggota yang berubah. Perangkat lain menarik perubahan itu lewat delta tiap 10 detik saat tab terlihat (serta setelah menyimpan, saat online, dan saat tab kembali dibuka), jadi editan user lain muncul **tanpa reload dan tanpa dialog**. Tidak ada lagi pilihan "Muat Cloud vs data perangkat": saat dibuka, dokumen cloud selalu dipakai; cache perangkat hanya fallback saat offline dan antrean perubahannya dikirim otomatis begitu tersambung. Dua user yang mengedit orang berbeda tidak pernah saling menimpa; orang yang sama memakai aturan datang-terakhir-menang per baris. Kode keluarga dibuat otomatis (mis. `keluarga-sutrisno-7k2m9x`) dan muncul di baris status bersama tombol **🔗 Salin Tautan**; tombol **🔄 Segarkan** menyegarkan data kapan saja.
- **Daftar keluarga**: layar kosong dan tombol 🏠 menampilkan semua keluarga di database (nama, jumlah orang, kode) dan bisa dibuka dengan satu tekan; setiap baris punya tombol 🗑️ untuk menghapus silsilah setelah konfirmasi **OK (Ya)**. Menghapus keluarga yang sedang dibuka juga membersihkan dokumen kerja di perangkat. Membuka lewat `?kode=...` tetap menarik dokumen itu dari database. Pindah keluarga tidak menghapus dokumen kerja lebih dulu. Dashboard memakai URL `?daftar=1`, jadi **refresh tetap di Dashboard**; nama hasil rename langsung disegarkan di daftar.
- **Buat silsilah baru**: dari **Daftar Keluarga** tekan **➕ Silsilah Baru** — dokumen kerja dikosongkan dan kode dilepas, jadi keluarga berikutnya mendapat kode baru; keluarga lama tetap di database dan bisa dibuka lagi dari daftar. (Di perangkat/HP yang belum pernah dipakai, cukup buka situs lalu tekan **➕ Mulai: Orang Pertama**.)
- **Peringatan hapus**: penghapusan di cloud **permanen**. Karena kode keluarga bersifat publik, siapa pun yang bisa membuka daftar juga bisa menghapus; tambahkan Cloudflare Access/autentikasi jika data harus dilindungi.
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
3. **Orang lepas**: `☰ Menu` → `👤 Tambah Orang` untuk mencatat siapa pun dulu; sambungkan nanti lewat `🔗 Jadikan Anak…` atau `💑 Pasangkan dengan…`.
4. **Cari**: kolom `🔍 Cari nama atau kode…` di bawah toolbar; hasilnya membuka fokus trah.
5. **Lihat keturunan**: tap kotak orang → kader menampilkan `Anak (n)`, `Cucu (n)`, `Buyut (n)`, `Canggah (n)` sebagai rantai nama yang bisa ditekan (urut kode); tekan `📊 Tabel Keturunan` untuk mengunduh keturunannya sebagai CSV.
6. **Pindah/backup**: tombol 🏠 membuka daftar keluarga; `📊 Unduh CSV` untuk Excel dan `🖨️ Cetak / PDF` untuk mencetak pohon.

## 🛠️ Teknologi

- Svelte 4 + Vite, tanpa framework CSS. Database: Cloudflare D1 (SQLite edge) lewat Pages Functions.
- Satu sumber kebenaran: `anggota[]` dengan pointer `ayah`/`ibu`/`pasangan[]` (tidak ada tabel turunan). Di cloud, satu baris D1 per anggota; `revisi` kursor perubahan per keluarga.
- Identitas orang = UUID. Kode (`A1P1B1`, …) diketik manual dan disimpan apa adanya; data lama yang belum punya `kode`/`tempat_lahir`/`alamat`/`pekerjaan` tetap kompatibel (kolomnya diisi kosong).

## 📁 Struktur

```
src/
├── App.svelte          # toolbar, menu, pencarian, dashboard
├── DaftarKeluarga.svelte # daftar keluarga + tombol hapus per baris
├── TreeView.svelte     # daftar akar pohon
├── CoupleNode.svelte   # kotak pasangan + anak (rekursif, garis CSS)
├── Sheet.svelte        # kader data orang + aksi (tambah/hubung/edit/hapus/ekspor keturunan)
├── PersonForm.svelte   # form tambah/edit & form sambung relasi
├── store.js            # data + ui + aksi (tambah/set ortu/pasangkan/hapus)
├── urut.js             # urutan natural berdasarkan kode
├── trah.js             # sub-pohon untuk fokus pencarian
├── export.js           # unduh CSV & tabel keturunan
├── cloud.js            # klien /api: kirim perubahan, delta, dokumen, daftar
├── sinkron.js          # sinkron dua arah (kirim 1,5 s, tarik 10 s, antrean offline)
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


- **v1.5.0**: Satu sumber kebenaran di Cloudflare D1 dan sinkron dua arah (plan-003). Penyimpanan pindah dari KV (dokumen utuh per keluarga) ke D1 SQLite dengan **satu baris per anggota**: dua user yang mengedit orang berbeda tidak pernah saling menimpa, dan penghapusan menyebar sebagai tombstone. Setiap perubahan dikirim lewat `POST /api/sync` (debounce 1,5 detik, tanpa gerbang revisi untuk menulis; `revisi` hanya kursor), perangkat lain menarik `GET /api/delta` tiap 10 detik saat tab terlihat jadi editan muncul tanpa reload. UX konflik dihapus seluruhnya: tidak ada lagi banner Muat Cloud vs data perangkat, mode ditahan, atau status gagal menetap; dokumen cloud selalu dipakai saat dibuka, cache perangkat hanya fallback offline dengan antrean yang dikirim otomatis saat tersambung (dan keepalive saat tab ditutup). Kompatibilitas: `PUT/DELETE /api/data` lama tetap diterima dengan gerbang revisi supaya bundle lama tidak menimpa data baru; backup kini lewat D1 Time Travel dan tabel arsip untuk keluarga yang dihapus. Penyimpanan KV lama dibekukan sebagai salinan rollback.
- **v1.4.1**: Perbaikan cache data. Aplikasi selalu membandingkan dokumen cloud dengan cache `localStorage` saat dibuka, termasuk saat perangkat sudah berisi data. Jika cloud dan perangkat berbeda, muncul banner **Muat dari Cloud** / **Lihat data perangkat**; autosave awal tidak lagi menimpa cloud dengan cache lama. Setiap dokumen memakai **revisi** dan server menolak PUT revisi lama, serta menyimpan versi sebelumnya sebagai backup. Ditambah tombol **🔄 Muat Cloud**, API memakai `cache-control: no-store`, fetch data memakai `cache: 'no-store'`, dan cache service worker dinaikkan ke `silsilah-v3`. UX sambung orang diubah menjadi **picker**: klik Jadikan Anak/Pasangkan dengan → kolom Cari orang + daftar hasil yang langsung dipilih (tanpa dropdown native); untuk orang tua pilih peran Ayah/Ibu.
- **v1.4.0**: Navigasi mobile: tombol 🏠 + **Daftar Keluarga** tanpa menghapus dokumen kerja, auto-center pohon ke unit orang+pasangan, kontrol zoom/pinch/`Pas layar`, banner fokus ringkas, dan tap target ≥44 px. Pencarian membuka **fokus trah** (orang + pasangan + turunan) dengan chip saudara sederajat dan tombol besar **Kembali ke Silsilah**. Dashboard memakai `?daftar=1` sehingga refresh tetap di dashboard, dan rename langsung memperbarui daftar. **Pasangkan dengan…** punya pencarian nama/kode + urutan A–Z. Urutan pohon, kader, dan CSV mengikuti **kode** (natural, case-insensitive; anak kandung sebelum anak bawaan). Autosave memakai antrean sehingga rename saat PUT berjalan tidak hilang. Menu dirampingkan (hanya Daftar, Tambah Orang, Ganti Nama, CSV, Cetak); impor/ekspor JSON dan Ambil dari Cloud dihapus. **Hapus silsilah** dari Daftar Keluarga dengan konfirmasi OK (Ya) dan endpoint `DELETE /api/data` yang mensyaratkan `konfirmasi=ya`. Cetak PDF A3 landscape dengan judul keluarga dan skala otomatis; status autosave tidak tercetak.
- **v1.3.1**: Kader diringkas: daftar keturunan jadi rantai teks padat (pil `.chip-tunggal` dihapus) dan kini menghitung semua generasi (`Anak`, `Cucu`, `Buyut`, `Canggah`, lalu `Generasi N`). **Pasangan ke-2 dan seterusnya** digambar tersambung: barisnya memuat nama suami/istri sebagai acuan (bisa ditekan) dengan simbol ⚭/✕ di tengah, jadi istri kedua tidak lagi tampak menggantung tanpa garis. Tanda **pisah/cerai** sederhana: tombol 💔 pada chip pasangan, garis pohon jadi `✕` dengan kotak diredupkan, mantan pasangan dikecualikan dari kolom Suami/Istri di Tabel Keturunan, dan relasi tidak dihapus. **Anak dengan satu orang tua**: tetap tergambar di pohon (ikut baris orang tua yang tercatat, tidak lagi hilang) dan otomatis dihitung sebagai anak pasangan orang tua itu, sehingga masuk keturunan keluarga; sisi orang tua yang kosong ditandai `ayah X` / `ibu X` di kolom Orang Tua pada Tabel Keturunan. `Unduh CSV` utama: kolom `kode` di depan, baris diurutkan natural menurut kode (tanpa kode di akhir). Traversal keturunan disatukan di `generasiKeturunan()` (`store.js`).
- **v1.3.0**: Kode keturunan kini diketik manual dan disimpan (`kode`), bukan lagi dihitung dari relasi; `src/kode.js` dihapus. Kolom anggota dilengkapi **Tempat Lahir, Alamat, Pekerjaan/Sekolah** (form, kader, JSON, CSV). Kader menampilkan `Anak (n)` dan `Cucu (n)` dengan chip yang bisa ditekan. Tombol `📊 Tabel Keturunan` mengunduh keturunan seseorang sebagai CSV (orangnya dulu, lalu anak → putu → buyut, dengan kolom Suami/Istri dan Orang Tua). Kode duplikat diperingatkan, tidak dilarang. File lama tetap kompatibel.
- **v1.2.0**: Kode hierarki tampil di kotak/kader/CSV (`A1`, `A1P1`, `A1B1`, …), pencarian nama & kode dengan sorot otomatis, dan tombol `Tambah Orang (Lepas)` + `Jadikan Anak…` / `Pasangkan dengan…` untuk menyambungkan orang yang sudah ada. JSON tetap tanpa kolom kode (kompatibel dengan file lama).

## 📄 Lisensi

MIT: bebas dipakai dan diubah.