<script>
  import { trahStore } from '../stores/trah.js';
  import { createSampleFamily } from '../sample-data-full.js';

  let namaTrah = "";
  let namaRoot = "";
  let tempatLahir = "";
  let tanggalLahir = "";
  let alamat = "";
  let pekerjaan = "";
  let showForm = false;

  $: isInitialized = $trahStore.initialized;

  function handleInitTrah() {
    if (!namaTrah.trim() || !namaRoot.trim()) {
      alert("Nama Trah dan Nama Pendiri harus diisi");
      return;
    }

    trahStore.initTrah(namaTrah, {
      nama_lengkap: namaRoot,
      tempat_lahir: tempatLahir,
      tanggal_lahir: tanggalLahir,
      alamat: alamat,
      pekerjaan: pekerjaan
    });

    showForm = false;
  }

  function handleLoadSample() {
    if ($trahStore.initialized) {
      if (!confirm("Data Trah yang ada akan ditimpa dengan data contoh. Lanjutkan?")) {
        return;
      }
    }
    
    try {
      const { trah, persons } = createSampleFamily();
      const sampleData = JSON.stringify({ trah, persons, initialized: true });
      trahStore.importData(sampleData);
      alert("Data contoh berhasil dimuat! Total " + persons.length + " orang dalam silsilah.");
    } catch (error) {
      console.error("Error loading sample data:", error);
      alert("Gagal memuat data contoh: " + error.message);
    }
  }

  function handleReset() {
    if (confirm("Yakin ingin menghapus semua data Trah? Tindakan ini tidak dapat dibatalkan.")) {
      trahStore.reset();
      namaTrah = "";
      namaRoot = "";
      tempatLahir = "";
      tanggalLahir = "";
      alamat = "";
      pekerjaan = "";
      showForm = false;
    }
  }

  function handleExport() {
    const data = trahStore.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trah-${$trahStore.trah.nama_trah}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        trahStore.importData(e.target.result);
        alert("Data berhasil diimpor");
      } catch (error) {
        alert("Gagal mengimpor data: " + error.message);
      }
    };
    reader.readAsText(file);
  }

  function handleValidate() {
    const result = trahStore.validateDataIntegrity();
    if (result.valid) {
      alert("✅ Data valid! Tidak ada masalah integritas data.");
    } else {
      const message = `⚠️ Ditemukan ${result.issues.length} masalah:\n\n${result.issues.join('\n')}`;
      alert(message);
    }
  }

  function handleRebuild() {
    if (confirm("Rebuild data akan memperbaiki inkonsistensi relasi dan regenerate kode. Lanjutkan?")) {
      try {
        trahStore.rebuildDataIntegrity();
        alert("✅ Data berhasil di-rebuild! Silakan cek kembali data Anda.");
      } catch (error) {
        alert("❌ Gagal rebuild data: " + error.message);
      }
    }
  }
</script>

{#if !isInitialized}
  <div class="trah-setup">
    <h2>Setup Silsilah Keluarga</h2>
    
    {#if !showForm}
      <div class="welcome">
        <p>Belum ada data silsilah keluarga. Mulai dengan membuat Trah baru, muat data contoh, atau impor data yang sudah ada.</p>
        <div class="actions">
          <button class="primary" data-testid="btn-new-trah" on:click={() => showForm = true}>Buat Trah Baru</button>
          <button class="secondary" data-testid="btn-load-sample" on:click={handleLoadSample}>Muat Data Contoh</button>
           <label class="import-btn" data-testid="btn-import-trah">
             <input type="file" accept=".json" on:change={handleImport} hidden data-testid="input-import-file">
             Impor Data
           </label>
        </div>
      </div>
    {:else}
       <form on:submit|preventDefault={handleInitTrah} data-testid="form-init-trah">
        <div class="form-group">
          <label for="namaTrah">Nama Trah/Silsilah *</label>
           <input 
             id="namaTrah" 
             type="text" 
             bind:value={namaTrah} 
             placeholder="Contoh: Keluarga Sastro Dimejo"
             data-testid="input-nama-trah"
             required
           >
          <small>Nama untuk keseluruhan silsilah keluarga</small>
        </div>

        <div class="form-group">
          <label for="namaRoot">Nama Pendiri/Leluhur *</label>
           <input 
             id="namaRoot" 
             type="text" 
             bind:value={namaRoot} 
             placeholder="Nama lengkap pendiri Trah"
             data-testid="input-nama-root"
             required
           >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="tempatLahir">Tempat Lahir</label>
           <input 
               id="tempatLahir" 
               type="text" 
               bind:value={tempatLahir}
               placeholder="Kota/Kabupaten"
               data-testid="input-root-tempat"
             >
          </div>

          <div class="form-group">
            <label for="tanggalLahir">Tanggal Lahir</label>
           <input 
               id="tanggalLahir" 
               type="date" 
               bind:value={tanggalLahir}
               data-testid="input-root-tanggal"
             >
          </div>
        </div>

        <div class="form-group">
          <label for="alamat">Alamat</label>
           <textarea 
             id="alamat" 
             bind:value={alamat}
             placeholder="Alamat lengkap"
             rows="2"
             data-testid="input-root-alamat"
           ></textarea>
        </div>

        <div class="form-group">
          <label for="pekerjaan">Pekerjaan</label>
           <input 
               id="pekerjaan" 
               type="text" 
               bind:value={pekerjaan}
               placeholder="Pekerjaan/profesi"
               data-testid="input-root-pekerjaan"
             >
        </div>

        <div class="form-actions">
           <button type="submit" class="primary" data-testid="btn-create-trah">Buat Trah</button>
           <button type="button" on:click={() => showForm = false} data-testid="btn-cancel-create-trah">Batal</button>
        </div>
      </form>
    {/if}
  </div>
{:else}
  <div class="trah-info">
    <div class="trah-header">
      <div>
        <h2>{$trahStore.trah.nama_trah}</h2>
        <p class="subtitle">Pendiri: {$trahStore.persons.find(p => p.is_root)?.nama_lengkap}</p>
      </div>
      <div class="trah-actions">
        <button class="secondary" on:click={handleValidate} data-testid="btn-validate-data">Validasi Data</button>
        <button class="secondary" on:click={handleRebuild} data-testid="btn-rebuild-data">Rebuild Data</button>
        <button class="secondary" on:click={handleExport} data-testid="btn-export-trah">Ekspor Data</button>
        <button class="danger" on:click={handleReset} data-testid="btn-reset-trah">Reset Trah</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .trah-setup {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }

  .trah-setup h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  .welcome {
    text-align: center;
    padding: 2rem;
    background: #f9f9f9;
    border-radius: 8px;
  }

  .welcome p {
    margin-bottom: 1.5rem;
    color: #666;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  input[type="text"],
  input[type="date"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #4CAF50;
  }

  textarea {
    resize: vertical;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #666;
    font-size: 0.875rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  button.primary {
    background: #4CAF50;
    color: white;
  }

  button.primary:hover {
    background: #45a049;
  }

  button.secondary {
    background: #2196F3;
    color: white;
  }

  button.secondary:hover {
    background: #0b7dda;
  }

  button.danger {
    background: #f44336;
    color: white;
  }

  button.danger:hover {
    background: #da190b;
  }

  button[type="button"] {
    background: #f5f5f5;
    color: #333;
  }

  button[type="button"]:hover {
    background: #e0e0e0;
  }

  .import-btn {
    padding: 0.75rem 1.5rem;
    background: #2196F3;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .import-btn:hover {
    background: #0b7dda;
  }

  .trah-info {
    padding: 1.5rem;
    background: #f9f9f9;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .trah-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .trah-header h2 {
    margin: 0;
    color: #333;
  }

  .subtitle {
    margin: 0.5rem 0 0 0;
    color: #666;
    font-size: 0.95rem;
  }

  .trah-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
