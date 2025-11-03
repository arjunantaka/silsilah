# 🚀 Quick Start Guide - Silsilah App

## Menjalankan Aplikasi dengan 1 Command

### Development Mode (Recommended)
```bash
npm start
```
✅ Server akan start otomatis di `http://localhost:5173`
✅ Browser akan terbuka otomatis
✅ Hot Module Replacement (HMR) aktif - perubahan code langsung terlihat

---

## Alternative Commands

### 1. Development (Manual)
```bash
npm run dev
```
Server jalan, tapi browser tidak auto-open. Buka manual di `http://localhost:5173`

### 2. Production Build + Preview
```bash
npm run build
npm run preview
```
Build aplikasi untuk production, lalu preview hasilnya.

### 3. Production Build + Serve
```bash
npm run build
npm run serve
```
Build + serve tanpa auto-open browser.

---

## Troubleshooting

### Port 5173 Sudah Digunakan
Jika port 5173 sudah digunakan, Vite akan otomatis gunakan port lain (5174, 5175, dst).

### Error "command not found: vite"
```bash
npm install
```
Install dependencies terlebih dahulu.

### Browser Tidak Auto-Open
Buka manual di `http://localhost:5173` atau gunakan:
```bash
npm run dev
```

---

## Workflow Lengkap

### First Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm start
```

### Daily Development
```bash
# Start server (sudah punya dependencies)
npm start
```

### Build untuk Production
```bash
# Build
npm run build

# Preview build hasil
npm run preview
```

### Deploy ke Server
```bash
# Build dulu
npm run build

# Upload folder 'dist/' ke web server
# Atau gunakan hosting static seperti:
# - Vercel: vercel --prod
# - Netlify: netlify deploy --prod
# - GitHub Pages: gh-pages -d dist
```

---

## Tips

### 1. Network Access (Akses dari Device Lain)
`npm start` sudah menggunakan flag `--host`, jadi bisa diakses dari device lain di network yang sama:
```
http://192.168.x.x:5173
```
(Lihat IP di output terminal)

### 2. Custom Port
Edit `package.json` jika ingin ganti port:
```json
"start": "vite --host --open --port 3000"
```

### 3. HTTPS (untuk testing PWA, dll)
```json
"start": "vite --host --open --https"
```

---

## Struktur Folder Development

```
silsilah/
├── src/              # Source code (edit di sini)
├── dist/             # Build output (jangan edit manual)
├── node_modules/     # Dependencies (auto-generated)
├── package.json      # Config & scripts
└── vite.config.js    # Vite configuration
```

---

## Next Steps

1. ✅ Baca `README.md` untuk dokumentasi lengkap
2. ✅ Buka tab "Trah Manager" untuk buat trah baru
3. ✅ Tambah anggota keluarga di tab "Daftar Anggota"
4. ✅ Lihat visualisasi di tab "Pohon Silsilah"
5. ✅ Export data di tab "Export Data"

---

**Selamat mencoba! 🎉**
