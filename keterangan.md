# Keterangan Sistem Silsilah Keluarga

## Temuan Saat Ini
- Repositori sudah memiliki frontend Svelte interaktif dengan penyimpanan `localStorage` dan dataset contoh keluarga besar.
- Backend FastAPI berbasis SQLModel juga tersedia untuk penyimpanan terstruktur (tabel `family_group`, `person`, `union`, `parent_child`) namun belum dipadukan dengan frontend.
- Penomoran generasi yang digunakan aplikasi saat ini berbeda dari kebutuhan kode sederhana (A, P, B, C) yang diminta.

## Apa yang Sudah Berjalan
- Struktur data dasar individu–pasangan–anak sudah lengkap, termasuk dukungan multi-orang tua, urutan kelahiran, dan catatan personal.
- Dataset contoh "Keluarga Sadinan Sastro Dimejo" memuat relasi lintas generasi yang bisa dijadikan referensi awal.
- Mekanisme ekspor/impor JSON di frontend dan API dasar di backend siap dipakai untuk kebutuhan sederhana.

## Apa yang Perlu Diperbaiki
- Menyederhanakan alur menjadi fokus tunggal: pengelolaan keluarga pribadi dengan kode akar-trah dan generasi A/P/B/C sesuai tradisi yang dijelaskan.
- Memastikan setiap anggota memiliki kolom wajib: nama, tempat & tanggal lahir, alamat, pekerjaan/sekolah, pasangan (jika ada), orang tua, dan daftar anak yang saling terhubung.
- Mengimplementasikan generator kode keturunan berbasis rute dari akar: `ROOT`, `A{n}`, `A{n}P{m}`, `A{n}P{m}B{k}`, `A{n}P{m}B{k}C{l}`, dan seterusnya.
- Menambahkan kemampuan ekspor tabel keturunan dari anggota mana pun (contoh: pilih "Suyati" lalu tampilkan daftar anak → cucu → buyut → canggah dengan kolom lengkap).

## Kebutuhan Sistem
- **Akar/Tahap Awal**: satu keluarga induk (Trah) menjadi root. Root dapat diberi kode `ROOT` atau mengikuti prefiks khusus keluarga.
- **Penomoran Generasi**:
  - Anak langsung root: `A{index}` berdasarkan urutan kelahiran.
  - Cucu (anak dari A): `A{index}P{subindex}`.
  - Buyut (anak dari P): `A{index}P{subindex}B{index}`.
  - Canggah (anak dari B): `A{index}P{subindex}B{index}C{index}`.
  - Generasi berikutnya dapat meneruskan huruf alfabet berikutnya (D, E, dst) bila diperlukan.
- **Relasi**:
  - Setiap orang memiliki referensi `orang_tua_id` (bisa dua) dan daftar `anak_id` sehingga navigasi dua arah selalu konsisten.
  - Pasangan disimpan sebagai `suami_id` atau `istri_id` (opsional) dengan tanggal/ catatan.
- **Data Wajib per Anggota**:
  - `nama`, `tempat_lahir`, `tanggal_lahir`, `alamat`, `pekerjaan_atau_sekolah`, `status_pernikahan` + `nama_pasangan`, `orang_tua`, `anak`.
- **Operasi Inti**:
  - Tambah/ubah/hapus anggota.
  - Tetapkan orang tua dan pasangan.
  - Hitung dan perbarui kode generasi otomatis saat struktur berubah.
  - Ekspor data keturunan lengkap dari satu orang ke bentuk tabel.

## Langkah Selanjutnya
- Putuskan apakah frontend akan dimodifikasi menjadi tampilan tabel/form sederhana atau memakai API backend untuk penyimpanan persist.
- Bangun modul generator kode generasi berbasis traversal tree dari node root.
- Kembangkan tampilan/endpoint laporan keturunan (contoh: `/descendants/{personId}`) yang menampilkan kolom kode, nama, TTL, alamat, pekerjaan, pasangan, dan orang tua.
- Uji dengan skenario: pilih satu anggota (mis. Suyati) dan validasi bahwa tabel menampilkan seluruh turunan hingga generasi terdalam.
