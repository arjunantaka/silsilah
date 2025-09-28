<script>
  import {
    keluargaStore,
    currentFamily,
    keluargaList,
    lineagePreference,
    lastRebuildAt
  } from '../stores/keluarga.js';
  import { onDestroy } from 'svelte';

  let families = [];
  let unsubscribe = keluargaList.subscribe((value) => {
    families = value;
  });

  onDestroy(() => unsubscribe());

  let showForm = false;
  let editingFamily = null;
  let formData = {
    nama: '',
    catatan: ''
  };

  let showImport = false;
  let importError = '';

  function openForm(family = null) {
    editingFamily = family;
    if (family) {
      formData = {
        nama: family.nama,
        catatan: family.catatan || ''
      };
    } else {
      formData = {
        nama: '',
        catatan: ''
      };
    }
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingFamily = null;
  }

  function handleSubmit() {
    if (!formData.nama.trim()) return;
    if (editingFamily) {
      keluargaStore.updateFamily(editingFamily.id, {
        nama: formData.nama,
        deskripsi: formData.catatan
      });
    } else {
      keluargaStore.createFamily({ nama_keluarga: formData.nama, deskripsi: formData.catatan });
    }
    closeForm();
  }

  function handleDelete(family) {
    if (confirm(`Hapus seluruh data keluarga "${family.nama}"?`)) {
      keluargaStore.deleteFamily(family.id);
    }
  }

  function selectFamily(family) {
    keluargaStore.setActiveFamily(family.id);
  }

  function downloadBackup() {
    const blob = new Blob([keluargaStore.exportAllData()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup-silsilah-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        keluargaStore.importData(reader.result, { replace: false });
        importError = '';
        showImport = false;
      } catch (error) {
        console.error('Gagal impor data:', error);
        importError = error.message || 'Format data tidak valid';
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    if (confirm('Tindakan ini akan menghapus seluruh data lokal. Lanjutkan?')) {
      keluargaStore.resetAll();
    }
  }
</script>

<div class="family-selector">
  <div class="header">
    <div>
      <h2>Kelompok Keluarga</h2>
      <p class="subtitle">Pilih keluarga yang ingin diedit atau buat baru.</p>
    </div>
    <div class="actions">
      <button class="btn-secondary" on:click={downloadBackup} disabled={families.length === 0}>
        💾 Ekspor JSON
      </button>
      <button class="btn-secondary" on:click={() => { showImport = true; importError = ''; }}>
        📥 Impor JSON
      </button>
      <button class="btn-primary" on:click={() => openForm()}>
        + Tambah Keluarga
      </button>
    </div>
  </div>

  {#if families.length === 0}
    <div class="empty-state">
      <p>Belum ada data keluarga.</p>
      <p>Mulai dengan klik tombol <strong>Tambah Keluarga</strong>.</p>
    </div>
  {:else}
    <div class="family-grid">
      {#each families as family}
        <div class="family-card" class:selected={$currentFamily && $currentFamily.id === family.id}>
          <div class="family-header">
            <div>
              <h3>{family.nama}</h3>
              <p class="meta">Anggota: {family.jumlah_anggota}</p>
              {#if family.root_id}
                <p class="meta">Root: {family.root_id}</p>
              {:else}
                <p class="meta warning">Root belum ditetapkan</p>
              {/if}
            </div>
            <div class="family-actions">
              <button class="btn-icon" on:click={() => openForm(family)} title="Edit data keluarga">
                ✏️
              </button>
              <button class="btn-icon" on:click={() => handleDelete(family)} title="Hapus keluarga">
                🗑️
              </button>
            </div>
          </div>

          {#if family.catatan}
            <p class="family-desc">{family.catatan}</p>
          {/if}

          <button class="btn-select" on:click={() => selectFamily(family)}>
            {$currentFamily && $currentFamily.id === family.id ? '✓ Aktif' : 'Pilih'}
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if $currentFamily}
    <div class="current-info">
      <h3>Pengaturan Keluarga Aktif</h3>
      <div class="info-grid">
        <div>
          <span class="label">Preferensi kode</span>
          <span class="value">{$lineagePreference === 'patrilineal' ? 'Patrilineal' : 'Matrilineal'}</span>
        </div>
        <div>
          <span class="label">Rebuild terakhir</span>
          <span class="value">{ $lastRebuildAt ? new Date($lastRebuildAt).toLocaleString('id-ID') : '-' }</span>
        </div>
      </div>
    </div>
  {/if}

  {#if showForm}
    <div
      class="modal-overlay"
      role="presentation"
      tabindex="-1"
      on:click={(event) => {
        if (event.target === event.currentTarget) closeForm();
      }}
      on:keydown={(event) => event.key === 'Escape' && closeForm()}
    >
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>{editingFamily ? 'Edit Keluarga' : 'Tambah Keluarga Baru'}</h3>
          <button class="btn-close" on:click={closeForm}>×</button>
        </div>
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="nama">Nama Keluarga *</label>
            <input
              id="nama"
              type="text"
              bind:value={formData.nama}
              required
              placeholder="Misal: Keluarga Suyati"
            />
          </div>
          <div class="form-group">
            <label for="catatan">Catatan</label>
            <textarea
              id="catatan"
              rows="3"
              bind:value={formData.catatan}
              placeholder="Keterangan singkat mengenai keluarga ini"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" on:click={closeForm}>Batal</button>
            <button type="submit" class="btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if showImport}
    <div
      class="modal-overlay"
      role="presentation"
      tabindex="-1"
      on:click={(event) => {
        if (event.target === event.currentTarget) {
          showImport = false;
        }
      }}
      on:keydown={(event) => event.key === 'Escape' && (showImport = false)}
    >
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Impor Data JSON</h3>
          <button class="btn-close" on:click={() => { showImport = false; }}>×</button>
        </div>
        <p>Pilih berkas JSON hasil ekspor sebelumnya. Data akan digabungkan dengan data yang ada.</p>
        <input type="file" accept="application/json" on:change={handleFileSelected} />
        {#if importError}
          <p class="error">{importError}</p>
        {/if}
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => { showImport = false; }}>Tutup</button>
          <button type="button" class="btn-danger" on:click={resetData}>Reset Semua Data</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .family-selector {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .subtitle {
    margin: 0.25rem 0 0 0;
    color: #666;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .empty-state {
    text-align: center;
    padding: 2.5rem;
    color: #666;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  }

  .family-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .family-card {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    border: 2px solid transparent;
  }

  .family-card.selected {
    border-color: #667eea;
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
  }

  .family-header {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .family-header h3 {
    margin: 0;
  }

  .meta {
    margin: 0.15rem 0 0 0;
    color: #556;
    font-size: 0.85rem;
  }

  .meta.warning {
    color: #a94442;
  }

  .family-desc {
    margin: 0;
    color: #555;
    min-height: 48px;
  }

  .family-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary, .btn-secondary, .btn-danger, .btn-select {
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1rem;
    cursor: pointer;
    font-weight: 600;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-secondary {
    background: #e9ecef;
    color: #333;
  }

  .btn-danger {
    background: #f56565;
    color: white;
  }

  .btn-select {
    background: #f1f3ff;
    color: #4c51bf;
  }

  .btn-icon {
    background: #f5f5f5;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
  }

  .btn-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    z-index: 10;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    width: min(480px, 100%);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 6px 30px rgba(0,0,0,0.25);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-group input,
  .form-group textarea {
    padding: 0.65rem;
    border-radius: 8px;
    border: 1px solid #d0d4dd;
    font-size: 1rem;
  }

  .form-actions {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .current-info {
    background: white;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-top: 0.75rem;
  }

  .label {
    display: block;
    color: #6b7280;
    font-size: 0.85rem;
  }

  .value {
    font-weight: 600;
    color: #1f2937;
  }

  .error {
    color: #c53030;
    font-weight: 600;
  }
</style>
