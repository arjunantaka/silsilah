# 🌳 Silsilah - Sistem Manajemen Keluarga Trah

Aplikasi web modern untuk membuat dan mengelola data silsilah keluarga dengan sistem kode hierarkis otomatis.

## ✨ Fitur Utama

### 📊 Manajemen Data Keluarga
- ✅ Tambah/Edit/Hapus anggota keluarga
- ✅ Manajemen pasangan (dari dalam/luar trah)
- ✅ Relasi orang tua & anak (multi-parent support)
- ✅ Sistem kode hierarkis otomatis (A1, A1P1, A1P1B1, dst)
- ✅ Null-safe form dengan validasi lengkap

### 🌲 Visualisasi
- ✅ Pohon silsilah interaktif dengan expand/collapse
- ✅ Daftar anggota dengan search & filter generasi
- ✅ Export data ke CSV
- ✅ Print-friendly layout

### 💾 Storage
- ✅ Data tersimpan di localStorage (offline-first)
- ✅ Import/Export JSON untuk backup
- ✅ Real-time sync antar semua view

## 🚀 Menjalankan Aplikasi

### Quick Start (Development)
```bash
npm install
npm start
```
Aplikasi akan otomatis terbuka di browser pada `http://localhost:5173`

### Pilihan Lain
```bash
# Development mode (manual)
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview

# Desktop app (Tauri)
npm run tauri:dev
```

## 📖 Cara Penggunaan

### 1. Inisialisasi Trah Baru
- Buka tab "Trah Manager"
- Klik "Buat Trah Baru"
- Isi nama trah dan data pendiri (root person)

### 2. Menambah Anggota
- Buka tab "Daftar Anggota"
- Klik tombol "+ Tambah Anggota"
- Isi data pribadi (nama wajib diisi)
- Pilih orang tua (opsional, max 2)
- Pilih mode pasangan:
  - **Tidak ada pasangan**: Tanpa pasangan
  - **Pilih dari anggota yang ada**: Link ke anggota trah lain
  - **Tambah pasangan baru**: Buat data pasangan baru
- Klik "Simpan"

### 3. Mengedit Anggota
- Klik ikon ✏️ "Edit" pada anggota
- Update data yang diperlukan
- Klik tombol "Edit Orang Tua" jika ingin mengubah parent
- Klik "Update"

### 4. Sistem Kode Hierarkis
Kode dihasilkan otomatis berdasarkan hierarki:
- **Root**: (kosong)
- **Generasi 1 (Anak)**: A1, A2, A3, ...
- **Generasi 2 (Putu)**: A1P1, A1P2, A2P1, ...
- **Generasi 3 (Buyut)**: A1P1B1, A1P1B2, ...
- **Generasi 4 (Canggah)**: A1P1B1C1, ...

Urutan ditentukan berdasarkan:
1. `birth_order` (jika diset manual)
2. `tanggal_lahir` (otomatis)
3. `nama_lengkap` (alfabetis)

### 5. Export Data
- Buka tab "Export Data"
- Pilih root person untuk export
- Klik "📥 Export CSV" atau "🖨️ Print"

## 🛠️ Teknologi

- **Frontend**: Svelte 4 + Vite
- **State Management**: Svelte Stores
- **Storage**: Browser localStorage
- **Styling**: CSS3 (No framework)
- **Desktop**: Tauri 2 (optional)
- **Testing**: Playwright

## 📁 Struktur Project

```
silsilah/
├── src/
│   ├── lib/
│   │   ├── components/       # Svelte components
│   │   │   ├── PersonFormUnifiedTrah.svelte
│   │   │   ├── PersonList.svelte
│   │   │   ├── TreeViewNew.svelte
│   │   │   ├── TreeNode.svelte
│   │   │   ├── ExportTable.svelte
│   │   │   └── TrahManager.svelte
│   │   ├── stores/           # State management
│   │   │   └── trah.js
│   │   └── utils/            # Utility functions
│   │       └── kodeGenerator.js
│   ├── App.svelte            # Main app
│   └── main.js               # Entry point
├── package.json
└── vite.config.js
```

## 🔧 Commands Lengkap

| Command | Deskripsi |
|---------|-----------|
| `npm start` | Start development server & auto-open browser |
| `npm run dev` | Start development server (manual) |
| `npm run build` | Build untuk production |
| `npm run preview` | Preview production build |
| `npm run serve` | Serve production build |
| `npm run check` | Type-check dengan Svelte |
| `npm test:e2e` | Run Playwright E2E tests |
| `npm run tauri:dev` | Run desktop app (development) |
| `npm run tauri:build` | Build desktop app |

## 📝 Changelog Terbaru

### v1.1.0 - Perbaikan Major (2025-11-03)
- ✅ Fixed: Fitur tambah pasangan sekarang tersimpan dengan benar
- ✅ Added: Null safety & default values untuk semua form
- ✅ Added: Validasi form yang lebih ketat
- ✅ Fixed: Duplikasi kode di form pasangan
- ✅ Fixed: Accessibility issues pada modal
- ✅ Verified: Kode hierarkis (A1, A1P1, A1P1B1) berfungsi sempurna
- ✅ Verified: Data sinkron di semua view (List, Tree, Export)

## 🤝 Kontribusi

Silakan buat issue atau pull request untuk perbaikan dan fitur baru.

## 📄 License

MIT License - Free to use and modify.