# Deploy ke Cloudflare (gratis): Pages + D1

Database = **Cloudflare D1** (SQLite edge, strongly consistent): satu baris per
anggota, jadi dua user yang mengedit orang berbeda tidak pernah saling menimpa.
`revisi` adalah kursor perubahan per keluarga, bukan gerbang tulisan. Data model
silsilah memang satu dokumen di sisi klien; di server dipecah per baris supaya
sinkronisasi delta dan penghapusan (tombstone) bisa berjalan tanpa konflik.
KV lama (`SILSILAH_KV`) dibekukan read-only sebagai salinan rollback plan-003.

## Cara kerja

- Aplikasi (PWA) tetap berjalan offline: `localStorage` jadi cache render plus
  antrean perubahan (`silsilah:antrean`) yang dikirim otomatis begitu tersambung.
- **Cloud = satu sumber kebenaran.** Saat halaman dibuka, dokumen diambil dari
  D1 dan langsung dipakai. Tidak ada perbandingan dengan cache perangkat dan
  tidak ada dialog "Muat Cloud vs data perangkat".
- **Kirim**: setiap mutasi (via fungsi di `src/store.js`) mencatat baris yang
  berubah; `src/sinkron.js` mengirimnya lewat `POST /api/sync` 1,5 detik
  setelah ketikan terakhir. Tidak ada 409 untuk user: setiap flush dijamin
  masuk; urutan datang menentukan hasil (last writer wins per baris anggota).
- **Tarik**: `GET /api/delta?kode=&sejak=N` tiap 10 detik saat tab terlihat,
  plus setelah kirim sukses, saat `online`, dan saat tab kembali terlihat.
  Hasil diterapkan tanpa dialog; baris yang masih ada di antrean lokal
  dilewati supaya edit yang belum terkirim tidak tertimpa balikan lama.
  BroadcastChannel menyegarkan tab lain di browser yang sama.
- **Keluarga baru** dibuat otomatis oleh `POST /api/sync` pertama; kode =
  slug nama keluarga + akhiran acak (mis. `keluarga-sutrisno-7k2m9x`).
- **Kompabilitas bundle lama**: `PUT/DELETE /api/data` (dokumen utuh) tetap
  diterima dengan gerbang revisi 409 supaya tab lama tidak bisa menimpa data
  baru. Hapus setelah semua pengguna memakai bundle v1.5.0.
- **Backup**: D1 Time Travel (retensi 7 hari di paket gratis) plus
  `npm run cf:ekspor` (dump SQL) yang sebaiknya dijalankan berkala. Keluarga
  yang dihapus lewat `DELETE /api/data` tersimpan di tabel `arsip`.
- Keamanan: kode berlaku seperti password; **daftar keluarga publik**. Pakai
  Cloudflare Access bila perlu dibatasi.

## Batas kuota gratis (D1)

5 GB penyimpanan, 5 juta baca/hari, 100 ribu tulis/hari: jauh di atas
kebutuhan. Polling 10 detik per tab terlihat sekitar 8,6 ribu permintaan/hari
per tab; Pages Functions 100 ribu/hari.

## Deploy lewat CLI

Sekali saja (sudah dijalankan 2026-11-06):

```bash
wrangler login
wrangler d1 create silsilah            # salin database_id ke wrangler.toml
wrangler d1 create silsilah-preview    # untuk [env.preview]
wrangler pages project create silsilah-keluarga --production-branch main
```

Berulang (build + deploy):

```bash
npm run cf:skema    # migrations/0001_skema.sql ke D1 prod + preview (idempoten)
npm run cf:impor    # sekali: impor data lama dari KV (tools/impor-prod.sql)
npm run cf:preview  # branch preview (database D1 preview, terisolasi)
npm run cf:deploy   # branch main = produksi
npm run cf:ekspor   # dump SQL manual ke ~/silsilah-backups
```

`--branch main` penting: tanpanya deploy masuk sebagai preview, bukan produksi.

- Produksi: <https://silsilah-keluarga-43j.pages.dev>
- Preview: <https://preview.silsilah-keluarga-43j.pages.dev> (alias stabil;
  tiap deploy juga dapat URL unik `https://<hash>.silsilah-keluarga-43j.pages.dev`)
- Akun: 58a4a7fdda22af54934f4720ce2ceaf5 (lihat `wrangler whoami`)
- D1 produksi: `silsilah` id `bff057b6-8bcc-496b-a75d-027eac316aaf`
- D1 preview: `silsilah-preview` id `4121f656-69ec-416f-9c5c-606cc1c41532`
- KV produksi (beku, rollback): `ccea02ef1e054091b1f7d3efe0688f6b`
- KV preview (beku): `00f0ef62e8c2429dbf4128dd57031462`

Peringatan token: login OAuth wrangler bisa kedaluwarsa bila lama tidak
dipakai (kejadian 2026-11-02). Untuk skrip/otomasi, buat API token berumur
panjang (scope Pages edit + D1 write) dan set `CLOUDFLARE_API_TOKEN`.

## Uji lokal dengan D1 lokal

```bash
npm run cf:skema-lokal   # skema ke .wrangler/state (miniflare)
npm run cf:impor-lokal   # data produksi ke D1 lokal
npm run cf:dev           # build + wrangler pages dev di http://127.0.0.1:8788
```

`npx playwright test` otomatis menjalankan dua server: vite (1420) untuk
spec UI mock, dan `wrangler pages dev` (8788) untuk
`tests/sinkron-lokal.spec.ts` (dua user sungguhan di dua konteks browser).

## API

- `GET /api/data?kode=<kode>` → `{ ok, data: <dokumen>, revisi }` atau 404.
- `GET /api/delta?kode=<kode>&sejak=<N>` → `{ ok, revisi, nama_keluarga,
  ubah: [{ id, rec|null, rev }] }` semua baris `rev > N` (tombstone `rec:null`);
  bila hasilnya > 2000 baris, balas dokumen penuh dengan `penuh: true`.
- `POST /api/sync` body `{ kode, nama, perubahan: [{ id, rec|null }] }` →
  `{ ok, revisi }`. Keluarga baru otomatis dibuat; maks 2000 baris per kirim;
  `rec` maks 8 KB dan `id`-nya dipaksa sama dengan kolom `id`.
- `GET /api/families` → `{ ok, data: [{ kode, nama, jumlah, revisi, diubah }] }`,
  urut `diubah` desc, maks 100. Publik, tanpa autentikasi.
- `PUT /api/data` (KOMPATIBILITAS bundle lama) body `{ kode, data, revisi }`:
  replace penuh, wajib revisi yang cocok, selain itu 409.
- `DELETE /api/data?kode=<kode>&konfirmasi=ya&revisi=N` → arsip ke tabel
  `arsip`, lalu hapus. Revisi basi 409. **Permanen.**

Kode dinormalisasi huruf kecil (4-64 huruf/angka/tanda minus). `PUT`/`DELETE`
tanpa autentikasi tambahan; lindungi dengan Cloudflare Access bila perlu.

Kode sumber: `functions/api/{data,delta,sync,families}.js` (server, binding
`DB`), `src/cloud.js` (klien), `src/sinkron.js` (mesin sinkron dua arah),
`src/store.js` (pencatatan perubahan per baris).

## Riwayat masalah yang sudah ditutup (2026-11-06)

- Split-brain dua database: kode keluarga yang sama pernah ada di KV produksi
  (189 orang) dan KV preview (draf 49 orang), jadi pengguna link preview
  melihat data lama dan editannya tidak pernah sampai produksi.
- KV tidak strongly consistent (propagasi 60 detik) sehingga gerbang revisi
  bisa loloskan tulisan stale: diganti D1 yang strongly consistent.
- Jebakan "Lihat data perangkat": mode yang menahan autosave selamanya.
  Dihapus seluruhnya bersama UX konfliknya.
