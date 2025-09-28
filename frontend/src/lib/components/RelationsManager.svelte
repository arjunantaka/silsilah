<script>
  import {
    currentFamily,
    orangList,
    hubunganList,
    unionList,
    keluargaStore
  } from '../stores/keluarga.js';
  import { get } from 'svelte/store';

  let activeTab = 'relations';

  let relationForm = createRelationForm();
  let editingRelationId = null;
  let relationError = '';

  let unionForm = createUnionForm();
  let editingUnionId = null;
  let unionError = '';

  function createRelationForm() {
    return {
      parentId: '',
      childId: '',
      unionId: '',
      birthOrder: 1,
      jenis: 'biological'
    };
  }

  function createUnionForm() {
    return {
      partner1_id: '',
      partner2_id: '',
      status: 'menikah',
      tanggal_mulai: '',
      tanggal_akhir: '',
      catatan: ''
    };
  }

  function resetRelationForm() {
    relationForm = createRelationForm();
    editingRelationId = null;
    relationError = '';
  }

  function resetUnionForm() {
    unionForm = createUnionForm();
    editingUnionId = null;
    unionError = '';
  }

  function handleRelationSubmit() {
    try {
      if (!relationForm.parentId || !relationForm.childId) {
        relationError = 'Pilih orang tua dan anak';
        return;
      }

      if (editingRelationId) {
        keluargaStore.updateRelation(editingRelationId, {
          parent_id: relationForm.parentId,
          child_id: relationForm.childId,
          union_id: relationForm.unionId || null,
          birth_order: Number(relationForm.birthOrder),
          jenis: relationForm.jenis
        });
      } else {
        keluargaStore.createRelation({
          parentId: relationForm.parentId,
          childId: relationForm.childId,
          unionId: relationForm.unionId || null,
          birthOrder: Number(relationForm.birthOrder),
          jenis: relationForm.jenis
        });
      }

      resetRelationForm();
    } catch (error) {
      console.error('gagal menyimpan relasi', error);
      relationError = error.message || 'Gagal menyimpan relasi';
    }
  }

  function editRelation(relation) {
    editingRelationId = relation.id;
    relationForm = {
      parentId: relation.parent_id,
      childId: relation.child_id,
      unionId: relation.union_id || '',
      birthOrder: relation.birth_order,
      jenis: relation.jenis
    };
  }

  function deleteRelation(relationId) {
    if (confirm('Hapus relasi ini?')) {
      keluargaStore.deleteRelation(relationId);
      resetRelationForm();
    }
  }

  function handleUnionSubmit() {
    try {
      if (!unionForm.partner1_id || !unionForm.partner2_id) {
        unionError = 'Pilih kedua pasangan';
        return;
      }

      if (unionForm.partner1_id === unionForm.partner2_id) {
        unionError = 'Pasangan tidak boleh orang yang sama';
        return;
      }

      if (editingUnionId) {
        keluargaStore.updateUnion(editingUnionId, { ...unionForm });
      } else {
        keluargaStore.createUnion({ ...unionForm });
      }

      resetUnionForm();
    } catch (error) {
      console.error('gagal menyimpan pernikahan', error);
      unionError = error.message || 'Gagal menyimpan data pernikahan';
    }
  }

  function editUnion(union) {
    editingUnionId = union.id;
    unionForm = {
      partner1_id: union.partner1_id,
      partner2_id: union.partner2_id,
      status: union.status || 'menikah',
      tanggal_mulai: union.tanggal_mulai || '',
      tanggal_akhir: union.tanggal_akhir || '',
      catatan: union.catatan || ''
    };
  }

  function deleteUnion(unionId) {
    if (confirm('Hapus data pasangan ini? Relasi anak tetap dipertahankan.')) {
      keluargaStore.deleteUnion(unionId);
      if (editingUnionId === unionId) resetUnionForm();
    }
  }

  function getPersonName(personId) {
    const person = get(orangList).find((p) => p.id === personId);
    return person ? person.nama_lengkap : 'Tidak diketahui';
  }

  function getUnionLabel(unionId) {
    if (!unionId) return 'Tidak terkait pasangan';
    const union = get(unionList).find((u) => u.id === unionId);
    if (!union) return 'Pasangan tidak ditemukan';
    const p1 = getPersonName(union.partner1_id);
    const p2 = getPersonName(union.partner2_id);
    return `${p1} ↔ ${p2}`;
  }
</script>

{#if !$currentFamily}
  <div class="empty-state">
    <h2>Pilih Keluarga Terlebih Dahulu</h2>
    <p>Gunakan tab "Keluarga" untuk membuat atau memilih keluarga.</p>
  </div>
{:else}
  <div class="relation-layout">
    <div class="tab-bar">
      <button class:active={activeTab === 'relations'} on:click={() => activeTab = 'relations'}>
        Hubungan Orang Tua - Anak
      </button>
      <button class:active={activeTab === 'unions'} on:click={() => activeTab = 'unions'}>
        Pasangan (Union)
      </button>
    </div>

    {#if activeTab === 'relations'}
      <section class="panel">
        <header class="panel-header">
          <div>
            <h2>Hubungan Anak</h2>
            <p>Atur siapa orang tua dan urutan lahir setiap anak.</p>
          </div>
          <button class="btn-secondary" on:click={resetRelationForm}>Bersihkan Form</button>
        </header>

        <form class="form-grid" on:submit|preventDefault={handleRelationSubmit}>
          <div class="form-group">
            <label for="relation-parent">Orang Tua</label>
            <select id="relation-parent" bind:value={relationForm.parentId} required>
              <option value="">-- pilih orang tua --</option>
              {#each $orangList as person}
                <option value={person.id}>{person.nama_lengkap}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="relation-child">Anak</label>
            <select id="relation-child" bind:value={relationForm.childId} required>
              <option value="">-- pilih anak --</option>
              {#each $orangList as person}
                <option value={person.id}>{person.nama_lengkap}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="relation-union">Pasangan (opsional)</label>
            <select id="relation-union" bind:value={relationForm.unionId}>
              <option value="">Tidak terkait pasangan</option>
              {#each $unionList as union}
                <option value={union.id}>{getUnionLabel(union.id)}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="relation-birth-order">Urutan lahir</label>
            <input id="relation-birth-order" type="number" min="1" bind:value={relationForm.birthOrder} required />
          </div>
          <div class="form-group">
            <label for="relation-type">Jenis relasi</label>
            <select id="relation-type" bind:value={relationForm.jenis}>
              <option value="biological">Biologis</option>
              <option value="adoptive">Adopsi</option>
              <option value="step">Tiri</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">{editingRelationId ? 'Simpan Perubahan' : 'Tambah Relasi'}</button>
          </div>
        </form>
        {#if relationError}
          <p class="error">{relationError}</p>
        {/if}

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Orang Tua</th>
                <th>Anak</th>
                <th>Urutan Lah</th>
                <th>Jenis</th>
                <th>Pasangan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each $hubunganList as relation}
                <tr>
                  <td>{getPersonName(relation.parent_id)}</td>
                  <td>{getPersonName(relation.child_id)}</td>
                  <td>{relation.birth_order}</td>
                  <td>{relation.jenis}</td>
                  <td>{getUnionLabel(relation.union_id)}</td>
                  <td>
                    <button class="btn-icon" on:click={() => editRelation(relation)}>✏️</button>
                    <button class="btn-icon" on:click={() => deleteRelation(relation.id)}>🗑️</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else}
      <section class="panel">
        <header class="panel-header">
          <div>
            <h2>Pasangan / Union</h2>
            <p>Catat pasangan resmi untuk mengelompokkan anak berdasarkan pernikahan.</p>
          </div>
          <button class="btn-secondary" on:click={resetUnionForm}>Bersihkan Form</button>
        </header>

        <form class="form-grid" on:submit|preventDefault={handleUnionSubmit}>
          <div class="form-group">
            <label for="union-partner1">Pasangan 1</label>
            <select id="union-partner1" bind:value={unionForm.partner1_id} required>
              <option value="">-- pilih orang --</option>
              {#each $orangList as person}
                <option value={person.id}>{person.nama_lengkap}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="union-partner2">Pasangan 2</label>
            <select id="union-partner2" bind:value={unionForm.partner2_id} required>
              <option value="">-- pilih orang --</option>
              {#each $orangList as person}
                <option value={person.id}>{person.nama_lengkap}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="union-status">Status</label>
            <select id="union-status" bind:value={unionForm.status}>
              <option value="menikah">Menikah</option>
              <option value="cerai">Cerai</option>
              <option value="wafat">Berakhir karena wafat</option>
              <option value="unknown">Tidak diketahui</option>
            </select>
          </div>
          <div class="form-group">
            <label for="union-start">Tanggal mulai</label>
            <input id="union-start" type="date" bind:value={unionForm.tanggal_mulai} />
          </div>
          <div class="form-group">
            <label for="union-end">Tanggal akhir</label>
            <input id="union-end" type="date" bind:value={unionForm.tanggal_akhir} />
          </div>
          <div class="form-group full-width">
            <label for="union-notes">Catatan</label>
            <textarea id="union-notes" rows="2" bind:value={unionForm.catatan}></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">{editingUnionId ? 'Simpan Perubahan' : 'Tambah Pasangan'}</button>
          </div>
        </form>
        {#if unionError}
          <p class="error">{unionError}</p>
        {/if}

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Pasangan</th>
                <th>Status</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Akhir</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each $unionList as union}
                <tr>
                  <td>{getUnionLabel(union.id)}</td>
                  <td>{union.status}</td>
                  <td>{union.tanggal_mulai || '-'}</td>
                  <td>{union.tanggal_akhir || '-'}</td>
                  <td>{union.catatan || '-'}</td>
                  <td>
                    <button class="btn-icon" on:click={() => editUnion(union)}>✏️</button>
                    <button class="btn-icon" on:click={() => deleteUnion(union.id)}>🗑️</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  </div>
{/if}

<style>
  .empty-state {
    background: white;
    padding: 3rem;
    text-align: center;
    border-radius: 12px;
    color: #555;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  }

  .relation-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .tab-bar {
    display: flex;
    gap: 0.75rem;
  }

  .tab-bar button {
    flex: 1;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    border: none;
    background: #e5e7eb;
    cursor: pointer;
    font-weight: 600;
  }

  .tab-bar button.active {
    background: #667eea;
    color: white;
  }

  .panel {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .panel-header h2 {
    margin: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  select,
  input,
  textarea {
    padding: 0.6rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
  }

  textarea {
    resize: vertical;
  }

  .form-actions {
    display: flex;
    align-items: flex-end;
  }

  .btn-primary, .btn-secondary {
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1.2rem;
    cursor: pointer;
    font-weight: 600;
  }

  .btn-primary {
    background: #6366f1;
    color: white;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #111827;
  }

  .table-container {
    overflow-x: auto;
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
    font-weight: 600;
  }

  .btn-icon {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 1rem;
    margin-right: 0.25rem;
  }

  .error {
    color: #b91c1c;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
