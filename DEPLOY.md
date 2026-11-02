# Deploy ke Cloudflare (gratis): Pages + KV

Database = **Cloudflare KV**: satu dokumen JSON per kode keluarga (bentuk dokumen
yang sama dengan yang dikirim aplikasi). Data model silsilah memang satu dokumen,
jadi KV lebih tepat daripada D1/SQL yang akan memaksa tabel relasional.

## Cara kerja

- Aplikasi (PWA) tetap berjalan offline dengan autosave `localStorage`.
- **Dashboard memuat dari database**: saat halaman dibuka, aplikasi mengambil
  dokumen keluarga dari KV dan menampilkannya di layar utama.
  - `?kode=<kode>` di alamat → selalu ambil dokumen itu dari database.
  - `?daftar=1` di alamat → buka Dashboard; refresh tetap di Dashboard.
  - Kode tersimpan di perangkat → dokumen cloud tetap dibandingkan dengan cache
    perangkat saat halaman dibuka. Bila berbeda, pengguna memilih **Muat dari
    Cloud** atau **Lihat data perangkat** (tanpa simpan); cache lama tidak otomatis
    menimpa cloud. Tombol **🔄 Muat Cloud** tersedia untuk menyegarkan manual.
  - Setiap dokumen punya **revisi**. PUT/DELETE dengan revisi lama ditolak
    `409`, sehingga tab/perangkat lama tidak bisa menimpa dokumen baru.
    Versi sebelumnya disimpan sebagai `__backup__:<kode>`.
  - Data lokal tidak pernah ditimpa diam-diam: bila perangkat sudah berisi data,
    penimpaan selalu dikonfirmasi lebih dulu. Bila gagal (offline/kode salah),
    aplikasi tetap memakai data lokal dan menampilkan pesan status.
- Unggah **otomatis**: setiap perubahan dikirim ke cloud (debounce 3 detik) dan
  baris status menampilkan `☁️ Tersimpan otomatis ke database.` beserta kode
  keluarga aktif dan tombol **🔗 Salin Tautan**. Bila gagal (offline), status
  menjadi `⚠️ Gagal simpan ke cloud.` dengan tombol **Coba lagi**, dan percobaan
  ulang otomatis terjadi pada perubahan berikutnya. Pindah keluarga dilakukan
  lewat **Daftar Keluarga** (tombol 🏠); data yang belum terkirim didorong dulu.
- Kode keluarga **dibuat otomatis** saat penyimpanan pertama: slug nama keluarga
  + akhiran acak 6 huruf/angka, mis. `keluarga-sutrisno-7k2m9x` (4-64 huruf/angka/
  tanda minus, selalu huruf kecil). Kode disimpan di perangkat dan ditampilkan di
  baris status.
- **Daftar keluarga**: layar kosong dan tombol 🏠 menampilkan semua keluarga di
  database (nama, jumlah orang, kode) dari `GET /api/families`, satu tekan untuk
  membuka. **➕ Silsilah Baru** dari Dashboard melepaskan kode, sehingga keluarga
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
- Preview: <https://preview.silsilah-keluarga-43j.pages.dev> (alias stabil; tiap deploy juga
  dapat URL unik seperti `https://9c8bf850.silsilah-keluarga-43j.pages.dev`)
- Akun: akun Cloudflare pemilik project (email + account id ada di Dashboard → Workers & Pages)
- KV produksi: `silsilah-keluarga-SILSILAH_KV`, id `ccea02ef1e054091b1f7d3efe0688f6b`
- KV preview: `silsilah-keluarga-SILSILAH_KV_PREVIEW`, id `00f0ef62e8c2429dbf4128dd57031462`
  (dipasang lewat `[env.preview]` di `wrangler.toml`)

### Alur preview dulu, produksi belakangan

```bash
npm run cf:preview    # build + deploy ke branch preview (tidak menyentuh produksi)
npm run cf:deploy     # hanya setelah preview diuji: deploy ke branch main (produksi)
```

Cek isi tiap lingkungan:

```bash
npx -y wrangler@3.114.17 pages deployment list --project-name silsilah-keluarga
curl -s https://preview.silsilah-keluarga-43j.pages.dev/api/families      # database preview
curl -s https://silsilah-keluarga-43j.pages.dev/api/families             # database produksi
```

Database preview terpisah: mengisi atau menghapus data lewat URL preview tidak
menyentuh data produksi. Database preview terisi otomatis saat aplikasi dibuka
dan ada data (autosave 3 detik), jadi aman untuk uji coba.

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

- `GET /api/data?kode=<kode>` → `{ ok: true, data: <dokumen>, revisi: N }` atau
  `{ ok: false, pesan }` (404 bila kode belum ada).
- `GET /api/families` → `{ ok: true, data: [{ kode, nama, jumlah }] }` — daftar
  keluarga dari metadata KV (maks 100 kunci; `nama`/`jumlah` null untuk dokumen
  lama yang belum pernah ditulis ulang). **Publik, tanpa autentikasi.**
- `PUT /api/data` body `{ kode, data, revisi }` → `{ ok: true, data: kode, revisi: N+1 }`.
  Revisi wajib; revisi lama ditolak `409`. Metadata `{ nama, jumlah, revisi, diubah }`
  dipakai `GET /api/families`, dan versi sebelumnya disimpan sebagai backup.
- `DELETE /api/data?kode=<kode>&konfirmasi=ya&revisi=N` → menghapus dokumen dari KV.
  Tanpa `konfirmasi=ya`/`revisi` ditolak `400`; revisi lama `409`; kode yang tidak ada `404`.
  Backup versi terakhir tetap disimpan. **Permanen.**
- Kode dinormalisasi huruf kecil; validasi bentuk dokumen sama seperti
  dokumen aplikasi (`nama_keluarga` string, `anggota` array), maks ±1 MB.
  `PUT` dan `DELETE` tidak memakai autentikasi tambahan; lindungi dengan
  Cloudflare Access bila daftar/penghapusan tidak boleh publik.

Kode sumber: `functions/api/data.js` + `functions/api/families.js` (server),
`src/cloud.js` (klien), `src/sinkron.js` (autosave).
