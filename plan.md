# Rencana Refactor: Unifikasi Form Tambah/Edit Anggota

## Objektif
Menyatukan 3 mode form (Tambah Anggota, Tambah Lengkap, Edit) menjadi 1 form universal dengan progressive disclosure dan field nullable.

## Prinsip Desain
- **One Entry Point**: Satu tombol "Tambah Anggota" untuk semua kebutuhan
- **Progressive Disclosure**: Data wajib tampil dulu, relasi opsional (collapsible/hidden)
- **Nullable by Default**: Semua field opsional kecuali nama_lengkap
- **Edit-Friendly**: Mode edit bisa mengelola data pribadi DAN relasi
- **Atomic Operations**: Buat person dulu → return ID → baru mutasi relasi

---

## Fase 1: Persiapan & Ekstraksi Komponen (Tidak Merusak yang Ada)

### 1.1 Buat Komponen Atomik
- [ ] **PersonFields.svelte** - Form data pribadi (reusable)
  - Props: `person` (object), `mode` ('create'|'edit')
  - Fields: nama_lengkap*, tempat_lahir, tanggal_lahir, gender, pekerjaan, birth_order
  - Emit: `change` event dengan data terbaru
  - Validasi: nama_lengkap wajib
  
- [ ] **ParentSelector.svelte** - Pilih/tambah orang tua
  - Props: `selectedIds`, `availablePersons`, `currentPersonId` (untuk edit)
  - Mode: none / existing / new
  - Support: Pilih 1-2 orang tua dari list atau buat baru
  - Guard: Hindari circular dependency (anak tidak boleh jadi parent ancestor)
  - Emit: `change` dengan `{ mode, parent1Data, parent2Data, existingIds }`

- [ ] **SpouseSelector.svelte** - Pilih/tambah pasangan
  - Props: `selectedId`, `availablePersons`, `currentPersonId`
  - Mode: none / existing / new
  - Support: 1 pasangan (bisa diperluas ke array nanti)
  - Emit: `change` dengan `{ mode, spouseData, existingId }`

- [ ] **ChildrenManager.svelte** - Kelola daftar anak
  - Props: `children` (array), `existingChildren` (array of person objects)
  - Support: Tambah/hapus anak baru (form inline)
  - Display: List anak yang sudah ada (read-only atau editable link)
  - Emit: `change` dengan array `childrenData[]`

### 1.2 Buat Store Helper Functions
- [ ] **stores/keluarga.js** - Tambah fungsi granular:
  ```javascript
  // Core operations
  createPerson(data) → personId
  updatePerson(id, patch) → success
  deletePerson(id) → success
  
  // Relational operations
  linkParents(childId, parentIds[]) → success
  unlinkParents(childId) → success
  linkSpouse(personId, spouseId) → success (bidirectional)
  unlinkSpouse(personId, spouseId) → success
  addChildToParents(parentIds[], childData) → childId
  unlinkChild(parentId, childId) → success
  
  // Validation helpers
  validateNoCircularParent(childId, proposedParentId) → boolean
  getAvailableForParent(excludeId) → persons[]
  getAvailableForSpouse(excludeId) → persons[]
  ```

### 1.3 Utilitas Validasi
- [ ] **utils/relationValidator.js**
  ```javascript
  isCircularParent(childId, parentId, store) → boolean
  isDuplicateSpouse(personId, spouseId, store) → boolean
  suggestBirthOrder(parentIds, store) → number
  ```

---

## Fase 2: Buat Form Unified (Paralel, Tidak Merusak yang Lama)

### 2.1 PersonFormUnified.svelte
- [ ] **Struktur**
  ```
  Modal
    ├─ Header: "Tambah Anggota" / "Edit Anggota: {nama}"
    ├─ Section: Data Pribadi (PersonFields) - Always visible
    ├─ Divider + Toggle: "Kelola Relasi (Opsional)" - Collapsible
    │   ├─ ParentSelector
    │   ├─ SpouseSelector
    │   └─ ChildrenManager
    ├─ Error/Success Messages
    └─ Footer: [Batal] [Simpan]
  ```

- [ ] **Props**
  ```javascript
  export let mode = 'create'; // 'create' | 'edit'
  export let editingPerson = null; // Person object jika edit
  export let preselectedParentId = null; // Jika add child dari tree
  export let onClose = () => {};
  export let onSuccess = () => {};
  ```

- [ ] **State Management**
  ```javascript
  // Data pribadi
  let personData = { nama_lengkap: '', ... };
  
  // Relasi (nullable)
  let relationsExpanded = false; // Toggle section relasi
  let parentData = { mode: 'none', parent1: null, parent2: null, existingIds: [] };
  let spouseData = { mode: 'none', spouse: null, existingId: null };
  let childrenData = [];
  
  // UI State
  let isSaving = false;
  let errorMessage = '';
  let successMessage = '';
  ```

- [ ] **Submit Logic**
  ```javascript
  async function handleSubmit() {
    1. Validasi data pribadi (minimal nama_lengkap)
    2. if (mode === 'create'):
         - createPerson(personData) → personId
       else:
         - updatePerson(editingPerson.id, personData)
    3. if (relationsExpanded):
         - Process parents (create new or link existing)
         - Process spouse (create new or link existing)
         - Process children (create new with link)
    4. Handle errors → rollback jika perlu (minimal notify)
    5. onSuccess() → refresh list
    6. onClose()
  }
  ```

- [ ] **Guard & Validasi**
  - Debounce submit button (prevent double submit)
  - Validasi circular parent sebelum submit
  - Validasi duplikasi spouse
  - Auto-assign birth_order jika kosong

### 2.2 Styling & UX
- [ ] Animasi smooth collapse/expand untuk section relasi
- [ ] Indicator "(Opsional)" di header section relasi
- [ ] Badge count: "Relasi: 2 orang tua, 1 pasangan, 3 anak"
- [ ] Loading state saat saving
- [ ] Success toast/message transient (auto-hide 3s)

---

## Fase 3: Integrasi ke PersonList.svelte

### 3.1 Replace Multiple Buttons
- [ ] Hapus tombol:
  - ❌ "Tambah Anggota" (simple form)
  - ❌ "Tambah Lengkap (Relasi)"
  - ❌ "Tambah Relasi"

- [ ] Tambah tombol baru:
  - ✅ **"+ Tambah Anggota"** → buka PersonFormUnified (mode='create')

### 3.2 Update Edit Flow
- [ ] Tombol "Edit" di setiap row → buka PersonFormUnified (mode='edit', editingPerson={person})
- [ ] Pastikan relasi ter-load untuk person yang di-edit

### 3.3 State Management
- [ ] Hapus state tidak terpakai:
  ```javascript
  // HAPUS INI:
  let showSimpleForm = false;
  let showIntegratedForm = false;
  let showRelationForm = false;
  ```
  
  ```javascript
  // GANTI DENGAN:
  let showUnifiedForm = false;
  let unifiedFormMode = 'create'; // 'create' | 'edit'
  let editingPerson = null;
  let preselectedParentId = null;
  ```

---

## Fase 4: Testing & Validasi

### 4.1 Test Cases Manual
- [ ] **Create Simple** - Tambah person tanpa relasi → sukses
- [ ] **Create with Existing Parents** - Pilih 1-2 parent dari list → link terbentuk
- [ ] **Create with New Parents** - Buat parent baru inline → parent & link terbentuk
- [ ] **Create with Spouse** - Tambah person + pasangan baru → bidirectional link
- [ ] **Create with Children** - Tambah person + 2 anak → children_ids terisi
- [ ] **Edit Person Only** - Update nama/tanggal lahir tanpa ubah relasi → sukses
- [ ] **Edit Person + Add Relations** - Edit existing person → tambah relasi → sukses
- [ ] **Edit Person + Remove Relations** - Putuskan link orang tua/pasangan → sukses
- [ ] **Circular Parent Prevention** - Coba set anak sebagai parent ancestor → ditolak
- [ ] **Duplicate Spouse Prevention** - Coba link spouse yang sudah ter-link → ditolak
- [ ] **Birth Order Auto** - Buat anak tanpa isi birth_order → auto assign

### 4.2 Edge Cases
- [ ] Tambah person dengan semua field kosong kecuali nama → nullable work
- [ ] Tambah parent1 + parent2 yang sama (edge case duplikasi) → warning
- [ ] Edit person yang punya relasi kompleks (parent, spouse, children) → tidak rusak
- [ ] Batal di tengah form (data tidak tersimpan) → rollback
- [ ] Submit double-click rapid → debounce work

### 4.3 Data Integrity Check
- [ ] Verify: parent_ids array konsisten bidirectional
- [ ] Verify: spouse_ids bidirectional (A → B, B → A)
- [ ] Verify: children_ids vs parent_ids coherence
- [ ] Verify: kode generator tidak konflik saat batch create
- [ ] Verify: birth_order tidak ada duplikat dalam sibling group

---

## Fase 5: Deprecation & Cleanup

### 5.1 Hapus File Lama (Setelah Verifikasi)
- [ ] ❌ `PersonFormNew.svelte` - Digantikan PersonFormUnified
- [ ] ❌ `PersonFormIntegrated.svelte` - Digantikan PersonFormUnified
- [ ] ❌ (Opsional) `PersonForm.svelte` jika ada form lama lain

### 5.2 Cleanup Code
- [ ] Hapus import yang tidak terpakai di PersonList.svelte
- [ ] Hapus fungsi helper lama jika ada duplikasi
- [ ] Update comments/documentation jika ada

### 5.3 Commit & Documentation
- [ ] Commit dengan pesan: "Refactor: Unify person form (create/edit) with progressive relational editing"
- [ ] Update README jika ada dokumentasi form
- [ ] (Opsional) Screenshot/GIF demo untuk dokumentasi

---

## Fase 6: Enhancement (Opsional - Future)

### 6.1 Advanced Features
- [ ] **Multi-spouse Support** - Array pasangan (poligami/remarriage)
- [ ] **Foto Upload** - Tambah field foto_url
- [ ] **Status Hidup/Wafat** - Field is_alive, tanggal_wafat
- [ ] **Catatan** - Field notes (textarea)
- [ ] **Validasi Gender** - Opsional enforce gender rules untuk parent/spouse

### 6.2 UX Improvements
- [ ] **Preview Relasi** - Panel preview tree snippet sebelum save
- [ ] **Batch Import** - Upload CSV/JSON untuk tambah banyak person
- [ ] **Undo Last Action** - Rollback person creation/edit
- [ ] **Search in Modal** - Autocomplete untuk pilih parent/spouse
- [ ] **Relationship Diagram** - Visualisasi inline relasi saat edit

### 6.3 Performance
- [ ] Lazy load person list jika > 100 entries
- [ ] Virtual scroll untuk dropdown parent/spouse jika banyak
- [ ] Debounce filter/search input

---

## Metrics Keberhasilan
- ✅ Hanya ada 1 tombol tambah di UI
- ✅ Mode edit bisa mengelola relasi
- ✅ Tidak ada crash saat sorting/filtering
- ✅ Semua field nullable work (kecuali nama_lengkap)
- ✅ Validasi circular parent & duplicate spouse berfungsi
- ✅ Kode lebih modular & reusable
- ✅ UX lebih intuitif (tidak bingung pilih tombol)

---

## Timeline Estimasi
- **Fase 1**: 2-3 jam (komponen atomik + store helpers)
- **Fase 2**: 2-3 jam (PersonFormUnified + logic)
- **Fase 3**: 1 jam (integrasi ke PersonList)
- **Fase 4**: 1-2 jam (testing menyeluruh)
- **Fase 5**: 30 menit (cleanup)
- **Total**: ~7-10 jam kerja

---

## Risk Mitigation
- ⚠️ **Data Loss**: Backup data atau commit state sebelum refactor mayor
- ⚠️ **Breaking Changes**: Buat branch baru, jangan langsung di main
- ⚠️ **Rollback Plan**: Simpan file lama sampai verifikasi penuh
- ⚠️ **User Confusion**: Buat change log / release notes jika multi-user

---

## Dependencies
- Svelte 3.x (sudah ada)
- Store: keluarga.js, trah.js (sudah ada)
- Utils: kodeGenerator.js (sudah ada)

---

## Notes
- File lama (PersonFormNew, PersonFormIntegrated) TIDAK dihapus dulu sampai fase 4 selesai
- Mode backward-compatible: Jika ada bug, bisa rollback ke form lama sementara
- Prioritas: Stabilitas > Feature lengkap
- Follow existing code style (tabs/spaces, naming convention)

---

## Status Tracking
- [ ] Fase 1: Persiapan & Ekstraksi Komponen
- [ ] Fase 2: Buat Form Unified
- [ ] Fase 3: Integrasi ke PersonList
- [ ] Fase 4: Testing & Validasi
- [ ] Fase 5: Deprecation & Cleanup
- [ ] Fase 6: Enhancement (Optional)

---

**Last Updated**: 2025-09-30  
**Status**: PLANNING - Ready to start Phase 1
