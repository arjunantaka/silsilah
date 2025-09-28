# Rencana Pengembangan Sistem Silsilah Keluarga

## Temuan & Kondisi Saat Ini
- Aplikasi frontend Svelte berbasis kanvas dan backend FastAPI sudah ada namun belum dipusatkan pada kebutuhan keluarga pribadi dengan kode generasi sederhana.
- Struktur database (family_group, person, union, parent_child) sudah memadai, tetapi penamaan kode generasi masih mengikuti pola lama.
- Belum ada alur tunggal untuk mengekspor tabel keturunan dari anggota tertentu sesuai format yang diinginkan pengguna.

## Apa yang Sudah Dicapai
- Model data relasional untuk anggota, pasangan, dan hubungan orang tua-anak lengkap dengan timestamp.
- Dataset contoh besar yang membantu pengujian kasus banyak generasi.
- Mekanisme ekspor/impor JSON di frontend serta API CRUD di backend untuk dasar integrasi.

## Apa yang Perlu Diperbaiki / Disederhanakan
- Menentukan sumber data utama (backend SQLModel atau localStorage) agar tidak terjadi duplikasi logika.
- Menyusun ulang generator kode keturunan menjadi skema `A`, `P`, `B`, `C`, dst berdasarkan rute dari root.
- Membuat tampilan dan/atau endpoint laporan keturunan yang menyusun data ke format tabel (kode, nama, TTL, alamat, pekerjaan, pasangan, orang tua).
- Memastikan setiap anggota memiliki data wajib dan relasi silang (orang tua ↔ anak ↔ pasangan) yang konsisten.

## Langkah Kerja Berikutnya
1. **Arsitektur**: Putuskan jalur sederhana (mis. gunakan backend untuk penyimpanan, frontend sebagai form dan tabel) dan rapikan konfigurasi root keluarga.
2. **Generator Kode**: Implementasikan ulang fungsi penomoran berdasarkan traversal tree dari root, lengkap dengan pengujian unit.
3. **Manajemen Data**: Buat form dasar tambah/edit anggota yang mewajibkan data personal dan relasi, serta sinkronisasi kode setiap perubahan.
4. **Laporan Keturunan**: Bangun endpoint/tampilan tabel yang dapat memilih satu anggota (misal Suyati) dan menurunkan daftar anak hingga generasi terdalam.
5. **Validasi**: Siapkan skenario uji manual (dataset kecil) dan otomatis (jika memungkinkan) untuk memastikan kode dan relasi konsisten saat ekspor.

## Catatan
- Dokumentasikan konvensi kode generasi dan contoh penggunaan supaya mudah dipahami anggota keluarga lain yang ikut mengisi data.
- Setelah fungsi dasar stabil, pertimbangkan fitur tambahan (diagram pohon, pencarian) hanya jika tidak mengganggu kesederhanaan alur utama.
