# Deploy ke Cloudflare (gratis) — Pages + KV

Database = **Cloudflare KV**: satu dokumen JSON per kode keluarga (format sama dengan
file "Simpan File"). Data model silsilah memang satu dokumen, jadi KV lebih tepat
daripada D1/SQL yang akan memaksa tabel relasional.

## Cara kerja

- Aplikasi (PWA) tetap berjalan offline dengan autosave `localStorage`.
- Cloud dipakai manual lewat menu: **☁️ Simpan ke Cloud** (unggah) dan
  **☁️ Ambil dari Cloud** (unduh + konfirmasi timpa). Seperti "Simpan File",
  tapi tersimpan di awan dan bisa dibuka dari HP lain.
- Kunci = **kode keluarga** (4–64 huruf/angka/tanda minus, otomatis huruf kecil),
  contoh: `keluarga-budi-42`. Kode disimpan di perangkat setelah berhasil.
- Keamanan: kode berlaku seperti password — siapa pun yang tahu kode bisa
  membaca/menimpa data. Pakai kode yang tidak mudah ditebak.

## Batas kuota gratis (KV)

100.000 baca/hari, 1.000 tulis/hari, 1 GB penyimpanan — jauh di atas kebutuhan
satu keluarga. Permintaan `/api` tidak di-cache service worker.

## Deploy lewat CLI (paling cepat)

```bash
npx -y wrangler@3.114.17 login                              # sekali, buka browser
npx -y wrangler@3.114.17 kv namespace create SILSILAH_KV    # salin "id" ke wrangler.toml
npm run cf:deploy                               # build + wrangler pages deploy
```

`wrangler pages deploy` akan menanyakan project saat pertama kali — pilih
buat baru (nama dari `wrangler.toml`: `silsilah-keluarga`). URL hasil: 
`https://silsilah-keluarga.pages.dev`.

## Deploy lewat dashboard (connect Git)

1. Push repo ini ke GitHub/GitLab.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command: `npm run build` — Output directory: `dist`.
4. Setelah jadi: Settings → Functions → **KV namespace bindings** → tambah
   binding `SILSILAH_KV` → pilih namespace yang sudah dibuat
   (`wrangler.toml` di repo boleh dihapus/dibiarkan; dashboard yang menang).

## Uji lokal dengan KV tiruan

```bash
npm run cf:dev    # build + wrangler pages dev di http://localhost:8788
```

KV lokal disimulasikan wrangler — tidak perlu akun untuk uji coba.

## API

- `GET /api/data?kode=<kode>` → `{ ok: true, data: <dokumen> }` atau
  `{ ok: false, pesan }` (404 bila kode belum ada).
- `PUT /api/data` body `{ kode, data }` → `{ ok: true }`.
- Kode dinormalisasi huruf kecil; validasi bentuk dokumen sama seperti
  "Buka File" (`nama_keluarga` string, `anggota` array), maks ±1 MB.

Kode sumber: `functions/api/data.js` (server), `src/cloud.js` (klien).
