<script>
  import { onMount } from 'svelte';
  import {
    currentFamily,
    keluargaStore,
    orangList,
    hubunganList,
    unionList,
    lastRebuildAt
  } from '../stores/keluarga.js';

  let diagnostics = null;
  let exportText = '';
  let showExport = false;

  function refreshDiagnostics() {
    diagnostics = keluargaStore.getDiagnostics();
  }

  onMount(() => {
    refreshDiagnostics();
  });

  function handleExport() {
    exportText = keluargaStore.exportAllData();
    showExport = true;
  }

  function copyExport() {
    navigator.clipboard.writeText(exportText);
    alert('Data disalin ke clipboard.');
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        keluargaStore.importData(reader.result, { replace: false });
        refreshDiagnostics();
        alert('Data berhasil diimpor.');
      } catch (error) {
        alert(error.message || 'Gagal mengimpor data');
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (confirm('Hapus seluruh data lokal? Pastikan sudah ekspor JSON sebelumnya.')) {
      keluargaStore.resetAll();
      refreshDiagnostics();
    }
  }

  const relationTypes = ['biological', 'adoptive', 'step'];
</script>

{#if !$currentFamily}
  <div class="empty-state">
    <h2>Tidak ada keluarga aktif</h2>
    <p>Pilih atau buat keluarga terlebih dahulu.</p>
  </div>
{:else}
  <div class="diagnostic">
    <header>
      <div>
        <h2>Diagnostik Data</h2>
        <p>Ringkasan data untuk keluarga <strong>{$currentFamily.nama}</strong>.</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" on:click={refreshDiagnostics}>🔄 Refresh</button>
        <button class="btn-secondary" on:click={handleExport}>💾 Ekspor</button>
        <label class="btn-secondary upload">
          📥 Impor
          <input type="file" accept="application/json" on:change={handleImport} />
        </label>
        <button class="btn-danger" on:click={handleReset}>🗑️ Reset</button>
      </div>
    </header>

    <section class="stats">
      <div class="stat-card">
        <span class="stat-label">Anggota</span>
        <span class="stat-value">{$orangList.length}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Pasangan</span>
        <span class="stat-value">{$unionList.length}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Relasi</span>
        <span class="stat-value">{$hubunganList.length}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Rebuild terakhir</span>
        <span class="stat-value">{ $lastRebuildAt ? new Date($lastRebuildAt).toLocaleString('id-ID') : '-' }</span>
      </div>
    </section>

    {#if diagnostics}
      <section class="table-section">
        <h3>Rincian Relasi</h3>
        <table>
          <thead>
            <tr>
              <th>Jenis relasi</th>
              <th>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {#each relationTypes as type}
              <tr>
                <td>{type}</td>
                <td>{$hubunganList.filter((r) => r.jenis === type).length}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}

    {#if showExport}
      <section class="export-box">
        <div class="box-header">
          <h3>Data JSON</h3>
          <div class="box-actions">
            <button class="btn-secondary" on:click={copyExport}>Salin</button>
            <button class="btn-secondary" on:click={() => (showExport = false)}>Tutup</button>
          </div>
        </div>
        <textarea readonly rows="10">{exportText}</textarea>
      </section>
    {/if}
  </div>
{/if}

<style>
  .empty-state {
    background: white;
    padding: 3rem;
    border-radius: 12px;
    text-align: center;
    color: #555;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  }

  .diagnostic {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  header {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  }

  header h2 {
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn-secondary, .btn-danger {
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1rem;
    cursor: pointer;
    font-weight: 600;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #111827;
  }

  .btn-danger {
    background: #f87171;
    color: white;
  }

  .btn-secondary.upload {
    position: relative;
    overflow: hidden;
  }

  .btn-secondary.upload input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: white;
    border-radius: 12px;
    padding: 1.25rem;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  }

  .stat-label {
    display: block;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: #4338ca;
  }

  .table-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
  }

  th {
    background: #f9fafb;
  }

  .export-box {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  textarea {
    width: 100%;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    padding: 0.75rem;
    font-family: monospace;
    font-size: 0.85rem;
  }
</style>
