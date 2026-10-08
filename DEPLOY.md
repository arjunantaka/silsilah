# Deploy ke Cloudflare (gratis): Pages + KV

Database = **Cloudflare KV**: satu dokumen JSON per kode keluarga (format sama dengan
file "Simpan File"). Data model silsilah memang satu dokumen, jadi KV lebih tepat
daripada D1/SQL yang akan memaksa tabel relasional.

## Cara kerja

- Aplikasi (PWA) tetap berjalan offline dengan autosave `localStorage`.
- **Dashboard memuat dari database**: saat halaman dibuka, aplikasi mengambil
  dokumen keluarga dari KV dan menampilkannya di layar utama.
  - `?kode=<kode>` di alamat → selalu ambil dokumen itu dari database.
  - Kode tersimpan di perangkat → ambil otomatis bila perangkat masih kosong.
  - Data lokal tidak pernah ditimpa diam-diam: bila perangkat sudah berisi data,
    penimpaan selalu dikonfirmasi lebih dulu. Bila gagal (offline/kode salah),
    aplikasi tetap memakai data lokal dan menampilkan pesan status.
- Unggah **otomatis**: setiap perubahan dikirim ke cloud (debounce 3 detik) dan
  baris status menampilkan `☁️ Tersimpan otomatis ke database.` beserta kode
  keluarga aktif dan tombol **🔗 Salin Tautan**. Bila gagal (offline), status
  menjadi `⚠️ Gagal simpan ke cloud.` dengan tombol **Coba lagi**, dan percobaan
  ulang otomatis terjadi pada perubahan berikutnya. Menu masih menyediakan
  **☁️ Ambil dari Cloud** (unduh + konfirmasi timpa) untuk menarik dokumen lain.
- Kode keluarga **dibuat otomatis** saat penyimpanan pertama: slug nama keluarga
  + akhiran acak 6 huruf/angka, mis. `keluarga-sutrisno-7k2m9x` (4-64 huruf/angka/
  tanda minus, selalu huruf kecil). Kode disimpan di perangkat dan ditampilkan di
  baris status.
- **Daftar keluarga**: layar kosong menampilkan semua keluarga di database
  (nama, jumlah orang, kode) dari `GET /api/families`, satu tekan untuk membuka.
  Membuka file JSON atau **Hapus Semua** melepaskan kode, sehingga keluarga
  berikutnya mendapat kode baru dan tidak menimpa dokumen lama.
- Keamanan: kode berlaku seperti password: siapa pun yang tahu kode bisa
  membaca/menimpa data. **Daftar keluarga bersifat publik** — semua kode keluarga
  terlihat siapa pun yang membuka situs. Pakai kode yang tidak mudah ditebak.

## Batas kuota gratis (KV)

100.000 baca/hari, 1.000 tulis/hari, 1 GB penyimpanan: jauh di atas kebutuhan
satu keluarga. Permintaan `/api` tidak di-cache service worker.

## Deploy lewat CLI (paling cepat)

Sudah dijalankan sekali; ini perintah persisnya untuk mengulang:

```bash
npx -y wrangler@3.114.17 login                               # sekali, buka browser
npx -y wrangler@3.114.17 kv:namespace create SILSILAH_KV     # salin "id" ke wrangler.toml
npx -y wrangler@3.114.17 pages project create silsilah-keluarga --production-branch main
npm run cf:deploy                                            # build + pages deploy (branch main)
```

`--branch main` penting: tanpanya deploy masuk sebagai *preview*, bukan produksi.

- Produksi: <https://silsilah-keluarga-43j.pages.dev>
- Akun: akun Cloudflare pemilik project (email + account id ada di Dashboard → Workers & Pages)
- KV namespace: `silsilah-keluarga-SILSILAH_KV`, id `ccea02ef1e054091b1f7d3efe0688f6b`

### Mengisi database produksi

Dashboard menarik dokumen dari KV. Isi/ubah sekali lewat API (kode = kunci):

```bash
curl -X PUT https://silsilah-keluarga-43j.pages.dev/api/data \
  -H 'content-type: application/json' \
  --data-binary '{"kode":"keluarga-sutrisno-1940","data":{...dokumen silsilah...}}'
```

## Deploy lewat dashboard (connect Git)

1. Push repo ini ke GitHub/GitLab.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command: `npm run build`, Output directory: `dist`.
4. Setelah jadi: Settings → Functions → **KV namespace bindings** → tambah
   binding `SILSILAH_KV` → pilih namespace yang sudah dibuat
   (`wrangler.toml` di repo boleh dihapus/dibiarkan; dashboard yang menang).

## Uji lokal dengan KV tiruan

```bash
npm run cf:dev    # build + wrangler pages dev di http://localhost:8788
```

KV lokal disimulasikan wrangler: tidak perlu akun untuk uji coba.

## API

- `GET /api/data?kode=<kode>` → `{ ok: true, data: <dokumen> }` atau
  `{ ok: false, pesan }` (404 bila kode belum ada).
- `GET /api/families` → `{ ok: true, data: [{ kode, nama, jumlah }] }` — daftar
  keluarga dari metadata KV (maks 100 kunci; `nama`/`jumlah` null untuk dokumen
  lama yang belum pernah ditulis ulang). **Publik, tanpa autentikasi.**
- `PUT /api/data` body `{ kode, data }` → `{ ok: true }`; sekaligus menulis
  metadata `{ nama, jumlah }` yang dipakai `GET /api/families`.
- Kode dinormalisasi huruf kecil; validasi bentuk dokumen sama seperti
  "Buka File" (`nama_keluarga` string, `anggota` array), maks ±1 MB.

Kode sumber: `functions/api/data.js` + `functions/api/families.js` (server),
`src/cloud.js` (klien), `src/sinkron.js` (autosave).
