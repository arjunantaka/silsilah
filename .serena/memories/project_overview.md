Project: Keluarga (Sistem Silsilah Keluarga)
Purpose: Aplikasi web (Svelte + Vite) + desktop (Tauri) untuk membuat, menampilkan, dan mengelola pohon keluarga; data disimpan lokal (localStorage/embedded db via simple-manager.js) dan mendukung ekspor CSV serta visualisasi tree.

Key Features:
- Pohon keluarga dengan node union (pernikahan)
- CRUD anggota keluarga dan relasi (parent, spouse, children)
- Tabel data + export CSV
- Toggle tampilan union & nama bersih
- Offline persistence

Tech Stack:
- Frontend: Svelte 4, Vite
- Visualization: d3-hierarchy, d3-selection, d3-shape, d3-zoom
- Desktop packaging: Tauri (scripts tauri:dev/build)
- Testing: Playwright (@playwright/test)
- Language: TypeScript support (svelte-check) but many .js files

Repo Structure (NEW - after migration):
- src/lib/components: Svelte components (forms, tree, tables)
- src/lib/stores: Svelte stores (keluarga.js core data logic, trah.js lineage)
- src/lib/database: simple-manager.js (DB ops abstractions)
- src/lib/utils: data utilities, code generator, relation validation
- tests: Playwright e2e tests + selector constants
- plan.md: Refactor roadmap (unify person forms)

Entry Points:
- index.html + src/main.js bootstraps src/App.svelte

Data Model (inferred):
- Person (orang) with fields: id, nama_lengkap, gender, lineage_code, lineage_path, etc.
- Pernikahan (union) linking two persons
- HubunganKeluarga entries parent->child (+ unionId, birthOrder, jenis)

Current Refactor Plan: Unify multiple person forms into PersonFormUnified with progressive disclosure (see plan.md phases).
Status: Planning stage; existing forms still present.

IMPORTANT MIGRATION NOTES (Oct 2025):
- All files moved from frontend/ to root directory
- Removed unused backend folders (backup/, data/, logs/)
- Updated commands in README to reflect new structure
- Config files (vite.config, playwright.config) already at root level
