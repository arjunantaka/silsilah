# Plan 003: Satu Sumber Kebenaran (D1) dan Sinkronisasi Otomatis

Status: TEREKSEKUSI 2026-11-06 (semua fase, termasuk rekonsiliasi satu edit
user yang masuk KV di antara snapshot dan cutover: Imas disambungkan ayahnya,
revisi 44). Sisa satu: hapus kompat PUT/DELETE /api/data setelah 2 minggu.
Tujuan dari pemilik: SETIAP perubahan oleh user/perangkat mana pun tersimpan otomatis (auto save) dan langsung tersinkron ke user lain. Tidak ada lagi pilihan "Muat Cloud vs data perangkat", tidak ada mode data lokal. Satu trust source: database cloud.

## 1. Mengapa harus ganti arsitektur (bukatan investigasi 2026-11-06)

Keluhan "user A sudah mengubah data, user B gagal terbaca/tersimpan" punya tiga akar, semuanya terverifikasi live:

1. Split-brain dua database: kode `keluarga-saya-ekjqrk` ada di KV produksi ("Trah Sastrodimejo", 189 orang, revisi 43) dan KV preview (draf Oktober, 49 orang). User yang membuka URL preview melihat data lama dan editannya masuk database yang salah.
2. Jebakan "Lihat data perangkat": cache lama di perangkat memicu dialog konflik; sekali user memilih mode data perangkat, autosave ditahan selamanya dan peringatan besar hilang setelah 10 detik. Semua edit berikutnya diam-diam tidak tersimpan.
3. KV tidak strongly consistent: propagasi antar-colo sampai 60 detik. Gerbang revisi (`getWithMetadata` lalu bandingkan) bisa membaca state basi, sehingga tulisan stale bisa lolos (lost update, dokumentasi resmi KV melarang read-modify-write di atasnya). Ini tidak bisa diperbaiki di dalam KV.

Kesimpulan: selama dokumen utuh (whole-doc) disimpan di KV dengan gerbang revisi, konflik dan "gagal tersimpan" adalah sifat bawaan, bukan bug. Perlu ganti primitif penyimpanan sekaligus hapus UX konflik.

## 2. Keputusan arsitektur

Dipilih: D1 (SQLite edge) sebagai satu-satunya sumber kebenaran, satu baris per anggota, tanpa gerbang revisi untuk menulis, sinkronisasi delta-pull.

Alasan vs alternatif:

| Opsi | Konsisten? | Konflik? | Kerumitan | Putus |
|---|---|---|---|---|
| KV utuh + revisi (sekarang) | Tidak (60 s) | Ya, harus ada dialog | Rendah | Ganti |
| R2 if-match, dokumen utuh | Ya | Ya, tetap whole-doc | Sedang | Tolak |
| Durable Object + WebSocket | Ya | Bisa dihilangkan | Tinggi (worker terpisah, binding, local dev) | Terlalu besar untuk kebutuhan |
| D1 per-baris anggota | Ya (satu primary) | Hilang total | Sedang | PAKAI |

D1 menang karena: strongly consistent tanpa pekerjaan tambahan, binding native di Pages Functions, `wrangler pages dev` mendukungnya lokal, free tier jauh cukup (5 GB, 5M baca/hari, 100k tulis/hari), dan memecah dokumen per anggota menghapus limit statement 100 KB sekaligus menghapus konflik: dua user yang mengedit anggota berbeda tidak pernah saling menimpa. Tanpa WebSocket dulu; sinkronisasi lewat polling delta yang murah. Real-time push bisa jadi fase lanjutan tanpa mengubah skema.

Prinsip hasil akhir:

- Cloud D1 = sumber kebenaran. localStorage hanya cache render (untuk offline) plus antrean perubahan. Tidak pernah lagi dipakai sebagai pilihan yang "dibandingkan" dengan cloud.
- Tulis tidak butuh revisi yang cocok (tidak ada 409 untuk user baru). Setiap flush dijamin masuk; urutan datang ke server menentukan hasil (last writer wins per anggota, didokumentasikan).
- Revisi tetap ada tetapi hanya sebagai kursor sinkronisasi (nomor urut perubahan), bukan gerbang.

## 3. Skema D1

```sql
CREATE TABLE keluarga (
  kode   TEXT PRIMARY KEY,
  nama   TEXT NOT NULL,
  revisi INTEGER NOT NULL,          -- kursor, bukan gerbang
  diubah TEXT NOT NULL,
  jumlah INTEGER NOT NULL
);
CREATE TABLE anggota (
  kode TEXT NOT NULL,
  id   TEXT NOT NULL,
  rec  TEXT NOT NULL,               -- JSON satu anggota lengkap
  rev  INTEGER NOT NULL,            -- revisi saat baris ini terakhir disentuh
  PRIMARY KEY (kode, id)
);
CREATE INDEX anggota_delta ON anggota (kode, rev);
CREATE TABLE hapus (                -- tombstone penghapusan anggota
  kode TEXT NOT NULL,
  id   TEXT NOT NULL,
  rev  INTEGER NOT NULL,
  PRIMARY KEY (kode, id)
);
CREATE TABLE arsip (                -- dokumen keluarga yang dihapus (pemulihan manual)
  kode TEXT PRIMARY KEY,
  rec  TEXT NOT NULL,
  diubah TEXT NOT NULL
);
```

Setiap tulisan = satu `batch()` D1 (atomik): `UPDATE keluarga SET revisi = revisi + 1 ... RETURNING revisi`, lalu upsert baris anggota yang disentuh dengan `rev = revisi_baru`, dan/atau tombstone. SQLite menuliskan secara serial sehingga dua flush paralel keduanya masuk; tidak ada yang ditolak.

## 4. API (functions/api/)

| Endpoint | Fungsi |
|---|---|
| `GET /api/data?kode=` | Dokumen penuh + revisi (dari D1). Kompabilitas dengan klien lama; dipakai juga saat load awal. |
| `GET /api/delta?kode=&sejak=N` | `{ revisi, nama_keluarga, ubah: [{id, rec\|null, rev}] }` semua baris `rev > N` termasuk tombstone. Kalau hasilnya > 2000 baris, balas dokumen penuh dengan penanda `penuh: true`. |
| `POST /api/sync` | Body `{ kode, perubahan: [{id, rec\|null}], nama? }`. Jalan batch: revisi++, upsert/tombstone, perbarui nama/jumlah/diubah. Balas `{ ok, revisi }`. Keluarga baru otomatis dibuat kalau kode belum ada. Validasi: pola kode, bentuk rec, maks 500 baris per flush, maks ukuran rec 8 KB. |
| `GET /api/families` | Daftar dari tabel keluarga, urut diubah desc, maks 100. Tidak ada lagi filter `__backup__:`. |
| `PUT /api/data` | KOMPATIBILITAS terbatas untuk bundle lama yang masih menulis dokumen utuh: tetap wajib revisi dan tetap ditolak 409 bila revisi basi (melindungi D1 dari cache lama). Implementasi: replace seluruh baris dalam satu batch dengan CAS `WHERE kode = ? AND revisi = ?`. Hapus setelah 2 minggu rilis. |
| `DELETE /api/data` | Sama seperti sekarang: wajib konfirmasi + revisi; sebelum hapus, salin dokumen ke tabel arsip. |

Backup: D1 Time Travel (retensi 7 hari di paket gratis) plus skrip `npm run cf:export` (`wrangler d1 export`) yang dijalankan berkala manual. Mekanisme `__backup__:` di KV tidak dipindahkan.

## 5. Perubahan klien (src/)

`store.js`
- Semua fungsi mutasi yang ada (tambahAkar, tambahAnak, tambahPasangan, setOrtu, tautkanPasangan, tandaiPisah, pisahkanPasangan, perbarui, hapus, gantiNamaKeluarga, muatJSON, hapusSemua) tetap dengan tanda tangan sama, jadi komponen tidak berubah.
- Tambahan: setiap mutasi mencatat "perubahan baris" ke Map antrean internal: `id -> rec terbaru` (atau `id -> null` untuk hapus). hapus(id) juga mencatat semua anggota lain yang pointernya dibersihkan. muatJSON/hapusSemua = replace penuh (tandai semua id lama null plus semua id baru). Antrean di-flush per id, last write wins lokal.

`sinkron.js` (tulisan ulang total)
- Flush: debounce 1,5 detik setelah mutasi, atau langsung saat `beforeunload`/`visibilitychange` ke hidden. POST /api/sync; sukses = simpan revisi, status `tersimpan`.
- Gagal jaringan: status `offline` plus jumlah antrean; antrean persist di localStorage `silsilah:antrean`; coba ulang otomatis saat `online` dan saat tab kembali terlihat. Tidak pernah ada status `konflik`, `ditahan`, `gagal` menetap.
- Pull: polling `GET /api/delta` tiap 10 detik hanya saat tab terlihat (15 detik saat idle, 5 detik selama 1 menit setelah aktivitas lokal), plus langsung setelah flush sukses, saat `visibilitychange` ke visible, dan `online`. Terapkan hasil ke store dengan penanda remote supaya tidak memicu antrean. BroadcastChannel supaya tab lain di browser sama langsung tahu.
- Hapus total: `tahanSinkron`, status `ditahan`/`lokal`/`konflik`, logika antrean lama.

`App.svelte`
- Hapus: dialog konflik, `konflikCloud`, `pakaiDataLokal`, tombol "Muat Cloud" sebagai alat resolusi.
- Load: `GET /api/data` dengan state memuat (spinner). Gagal karena offline: tampilkan cache render dengan badge "Offline: N perubahan menunggu terkirim". Tidak ada perbandingan cloud vs lokal, tidak ada pilihan.
- Tombol "🔄 Segarkan" (pull manual) menggantikan "Muat Cloud".
- Dashboard dari /api/families (D1).

`cloud.js`: fungsi baru kirimPerubahan, ambilDelta; ambilDariCloud tetap; hapusDariCloud tetap; `buatKodeBaru` tetap (cek 404).

`public/sw.js`: tidak meng-cache /api (tetap); bump CACHE ke v4 karena bundle baru.

Bug yang ikut hilang karena desain baru: PUT redundan setiap buka `?kode=` (sekarang load tidak pernah menulis).

## 6. Migrasi data produksi

Data saat ini (KV `ccea02ef…`, 9 kunci): 5 keluarga (`keluarga-saya-ekjqrk` 189 anggota revisi 43, `keluarga-saya-42afqt` 37, `keluarga-saya-zr9q3a` revisi 1, `keluarga-saya-3mas3g` 5, `keluarga-sutrisno-1940` 17) plus 4 kunci backup.

1. `wrangler d1 create silsilah` (produksi) dan `wrangler d1 create silsilah-preview` (untuk `[env.preview]`, isolasi tetap dijaga).
2. Skrip `tools/impor-kv.mjs`: unduh tiap kunci keluarga dari KV (sudah ada dump di /tmp hasil investigasi, regenerasi deterministik), pecah jadi baris SQL dengan rev = revisi metadata (ekjqrk mulai dari 43 supaya kursor berlanjut), tulis `migrations/0001_impor_kv.sql`.
3. `wrangler d1 execute silsilah --remote --file migrations/0001_skema.sql` lalu `0001_impor_kv.sql`.
4. KV produksi DIBEKUKAN read-only selama 2 minggu sebagai sumber rollback (tidak dihapus, tidak ditulis lagi).

## 7. Pembersihan hasil investigasi (urutan penting)

1. Arsipkan draf preview ke file JSON di `/home/nantaka/silsilah-backups/`: `keluarga-saya-ekjqrk` (49 orang) dan `backup-ekjqrk-20261010` dari KV `00f0ef62…`. Catatan isi: 6 dari 10 anggota "hanya di preview" ternyata sama orang dengan kode yang diubah di produksi (Raharjo, Budi Sri, Siti, Pramono, Setiyono, Setiyanto, Berto); 3 nama benar-benar tidak ada di produksi (Dani Eka SW, Sigit AKS, Prapti). Pemilik memutuskan apakah ditambah ulang manual dari arsip.
2. Hapus kunci KV preview: `keluarga-saya-ekjqrk`, `backup-ekjqrk-20261010`, `uji-diagnosis-nov6`, `__backup__:uji-revisi-1793582507`.
3. Hapus kunci KV produksi sisa uji: `__backup__:uji-diagnosis-nov6`, `__backup__:uji-client-rev-1793582560`.
4. Tumpahkan deployment preview purba (build `index-0e025620.js`, API tanpa revisi, tanpa DELETE, alias `preview.silsilah-keluarga-43j.pages.dev` yang jadi sumber split-brain): deploy ulang branch `preview` dengan kode baru, atau hapus deployment lamanya. Preview baru memakai D1 preview sendiri.
5. Standarkan: `cf:preview` hanya ke branch `preview`; kebiasaan deploy branch `rombak` sebagai preview yang membuat alias berubah-ubah dihentikan.
6. Higien token: token OAuth root kedaluwarsa 2026-11-02 dulu (login baru berhasil hari ini). Buat API token berumur panjang (scope: Pages edit, D1 write) untuk skrip deploy, simpan di root, dokumentasikan di DEPLOY.md. Standarkan versi wrangler (hapus pin `wrangler@3.114.17` di package.json, pakai wrangler 4 global yang sudah terbukti dipakai log deploy).

## 8. Pengujian

- Baru `tests/sinkron-api.spec.ts` (jalan melawan `wrangler pages dev` + D1 lokal yang sudah di-migrate): flush mengembalikan revisi naik; delta sejak N benar; tombstone terkirim; keluarga baru otomatis; PUT lama tetap 409 saat revisi basi; delete mengisi arsip.
- Baru `tests/e2e-sinkron.spec.ts` dua konteks browser (simulasi dua user):
  - A mengedit, B melihat hasilnya tanpa reload dalam jendela polling.
  - A offline (route abort /api) lalu edit, kembali online, antrean terkirim, B menerima.
  - A dan B mengedit anggota berbeda nyaris bersamaan, keduanya tersimpan (tidak ada yang hilang).
  - B hapus anggota, A melihat hilang via delta.
  - Import file JSON replace penuh, B menerima.
- Ubah spec lama yang menaut perilaku konflik/ditahan (autosave.spec, e2e-cloud.spec): hapus skenario konflik, ganti skenario offline-antrean. Spec yang menaut teks implementasi lama dihapus, bukan disesuaikan paksa.
- `npm run check` bersih, build sukses, e2e penuh hijau sebelum deploy.

## 9. Rencana eksekusi

| Fase | Isi | Kriteria lulus |
|---|---|---|
| F0 Spike | d1 create, binding di wrangler.toml (prod + env.preview), `wrangler d1 migrations apply --local`, pages dev jalan, satu POST /api/sync via curl lokal | round trip sync lokal hijau |
| F1 Backend | skema D1, functions/api/{data,delta,sync,families}.js baru, kompat PUT/DELETE, impor data, arsip | curl semua endpoint lokal; data ekjqrk 189 baris; revisi lanjut 44 |
| F2 Klien | store pencatatan perubahan, sinkron.js baru, App.svelte bersih dari konflik, cloud.js baru | e2e dua konteks hijau; tidak ada string konflik lagi di src/ |
| F3 Rilis | deploy branch preview, verifikasi URL preview (D1 preview), verifikasi produksi data utuh (189 orang, revisi lanjut), deploy main | produksi: A edit, B terima, tanpa dialog |
| F4 Bersih | pembersihan KV + deployment (bagian 7), perbarui DEPLOY.md + README, hapus kompat PUT setelah 2 minggu, lepas binding KV | families list bersih; DEPLOY.md menggambarkan D1 |

Rollback tiap fase: revert git + deploy ulang; selama fase transisi KV produksi masih berisi snapshot pra-migrasi (data baru di D1 sejak cutover tidak kembali otomatis ke KV, itu dianggap dapat diterima untuk jendela 2 minggu dan dinyatakan di sini).

## 10. Risiko

- LWW per anggota: dua user mengedit orang yang sama nyaris bersamaan, yang datang belakangan menang. Didokumentasikan ke user; jauh lebih baik daripada sekarang (whole doc saling menimpa penuh).
- Kuota: polling 10 detik per tab terlihat, sekitar 8,6k permintaan/hari per tab; Functions free 100k/hari, D1 baca 5M/hari. Aman untuk skala keluarga; backoff idle sudah dirancang.
- Klien bundle lama (tab yang tidak di-reload sejak sebelum rilis): masih PUT /api/data; ditangani gerbang 409 kompat sampai SW memperbarui mereka, sama seperti hari ini.
- D1 gangguan: jarang; antrean offline menahan perubahan sampai pulih.
