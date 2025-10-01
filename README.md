# Keluarga - Sistem Silsilah Keluarga

Aplikasi web untuk membuat dan mengelola pohon keluarga dengan data sample keluarga Soekarno.

## Fitur
- Visualisasi pohon keluarga dengan union nodes
- Tampilan tabel data lengkap dengan export CSV
- Toggle untuk nama bersih dan tampilan union
- Data tersimpan di localStorage (offline)

## Menjalankan Aplikasi
```bash
npm install
npm run dev
```

Buka browser ke `http://localhost:1420`

## Desktop App (Tauri)
```bash
npm run tauri:dev
```

## Teknologi
- Svelte 4 + Vite
- D3.js untuk visualisasi pohon
- Tauri untuk desktop app
- Playwright untuk E2E testing
- CSS Grid untuk layout responsif