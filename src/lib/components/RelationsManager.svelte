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
  let successMessage = '';

  let relationForm = createRelationForm();
  let editingRelationId = null;
  let relationError = '';
  let searchQuery = '';

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

      if (relationForm.parentId === relationForm.childId) {
        relationError = 'Orang tua dan anak tidak boleh orang yang sama';
        return;
      }

      const existingRelation = get(hubunganList).find(rel => 
        rel.parent_id === relationForm.parentId && 
        rel.child_id === relationForm.childId &&
        rel.id !== editingRelationId
      );
      
      if (existingRelation) {
        relationError = 'Relasi orang tua-anak ini sudah ada';
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
        successMessage = 'Relasi berhasil diperbarui';
      } else {
        keluargaStore.createRelation({
          parentId: relationForm.parentId,
          childId: relationForm.childId,
          unionId: relationForm.unionId || null,
          birthOrder: Number(relationForm.birthOrder),
          jenis: relationForm.jenis
        });
        successMessage = 'Relasi berhasil ditambahkan';
      }

      setTimeout(() => successMessage = '', 3000);
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

      if (unionForm.tanggal_mulai && unionForm.tanggal_akhir && 
          unionForm.tanggal_akhir < unionForm.tanggal_mulai) {
        unionError = 'Tanggal akhir harus setelah tanggal mulai';
        return;
      }

      const existingUnion = get(unionList).find(u => 
        ((u.partner1_id === unionForm.partner1_id && u.partner2_id === unionForm.partner2_id) ||
         (u.partner1_id === unionForm.partner2_id && u.partner2_id === unionForm.partner1_id)) &&
        u.id !== editingUnionId
      );
      
      if (existingUnion) {
        unionError = 'Pasangan ini sudah ada dalam daftar';
        return;
      }

      if (editingUnionId) {
        keluargaStore.updateUnion(editingUnionId, { ...unionForm });
        successMessage = 'Pasangan berhasil diperbarui';
      } else {
        keluargaStore.createUnion({ ...unionForm });
        successMessage = 'Pasangan berhasil ditambahkan';
      }

      setTimeout(() => successMessage = '', 3000);
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

  function getShortUnionLabel(unionId) {
    if (!unionId) return '—';
    const union = get(unionList).find((u) => u.id === unionId);
    if (!union) return '—';
    const p1 = getPersonName(union.partner1_id);
    const p2 = getPersonName(union.partner2_id);
    const firstName1 = p1.split(' ')[0];
    const firstName2 = p2.split(' ')[0];
    return `${firstName1} & ${firstName2}`;
  }

  function calculateNextBirthOrder(parentId) {
    const childrenOfParent = get(hubunganList).filter(
      rel => rel.parent_id === parentId
    );
    
    if (childrenOfParent.length === 0) return 1;
    
    const maxOrder = Math.max(...childrenOfParent.map(rel => rel.birth_order || 0));
    return maxOrder + 1;
  }

  $: filteredUnions = relationForm.parentId 
    ? $unionList.filter(u => 
        u.partner1_id === relationForm.parentId || 
        u.partner2_id === relationForm.parentId
      )
    : $unionList;

  $: if (relationForm.parentId && !editingRelationId) {
    relationForm.birthOrder = calculateNextBirthOrder(relationForm.parentId);
  }

  $: if (editingRelationId) {
    const relationStillExists = $hubunganList.find(r => r.id === editingRelationId);
    const parentStillExists = $orangList.find(p => p.id === relationForm.parentId);
    const childStillExists = $orangList.find(p => p.id === relationForm.childId);
    
    if (!relationStillExists || !parentStillExists || !childStillExists) {
      resetRelationForm();
    }
  }

  $: sortedRelations = [...$hubunganList].sort((a, b) => {
    const parentNameA = getPersonName(a.parent_id).toLowerCase();
    const parentNameB = getPersonName(b.parent_id).toLowerCase();
    
    if (parentNameA !== parentNameB) {
      return parentNameA.localeCompare(parentNameB);
    }
    
    return (a.birth_order || 0) - (b.birth_order || 0);
  });

  $: parentsWithChildren = (() => {
    const map = new Map();
    for (const rel of sortedRelations) {
      if (!map.has(rel.parent_id)) {
        const parent = get(orangList).find(p => p.id === rel.parent_id);
        map.set(rel.parent_id, {
          parent,
          children: []
        });
      }
      map.get(rel.parent_id).children.push(rel);
    }
    return [...map.values()];
  })();

  $: filteredParentsWithChildren = parentsWithChildren.filter(group => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const parentMatch = (group.parent?.nama_lengkap || '').toLowerCase().includes(query);
    const childMatch = group.children.some(rel => 
      getPersonName(rel.child_id).toLowerCase().includes(query)
    );
    return parentMatch || childMatch;
  });

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
              {#each filteredUnions as union}
                <option value={union.id}>{getUnionLabel(union.id)}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="relation-birth-order">
              Urutan lahir
              <span class="tooltip-icon" title="Kosongkan untuk penomoran otomatis">ℹ️</span>
            </label>
            <input id="relation-birth-order" type="number" min="0" placeholder="Otomatis jika 0" bind:value={relationForm.birthOrder} />
            <small class="field-hint">Isi 0 atau kosongkan untuk penomoran otomatis</small>
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
        {#if successMessage}
          <p class="success">{successMessage}</p>
        {/if}

        <div class="search-bar">
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama orang tua atau anak..." 
            bind:value={searchQuery}
          />
        </div>

        <div class="relations-grouped">
          {#if filteredParentsWithChildren.length === 0}
            <p class="empty-message">Tidak ada relasi yang ditemukan.</p>
          {:else}
            {#each filteredParentsWithChildren as group}
              <div class="parent-group">
                <div class="parent-header">
                  <h3>{group.parent?.nama_lengkap || 'Tidak diketahui'}</h3>
                  <span class="child-count">{group.children.length} anak</span>
                </div>
                <div class="children-list">
                  {#each group.children as relation}
                    <div class="child-row" class:editing={relation.id === editingRelationId}>
                      <div class="child-info">
                        <span class="birth-order-badge">Anak ke-{relation.birth_order}</span>
                        <span class="child-name">{getPersonName(relation.child_id)}</span>
                        <span class="union-label">{getShortUnionLabel(relation.union_id)}</span>
                      </div>
                      <div class="child-actions">
                        <button class="btn-icon" on:click={() => editRelation(relation)}>✏️</button>
                        <button class="btn-icon" on:click={() => deleteRelation(relation.id)}>🗑️</button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          {/if}
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
        {#if successMessage}
          <p class="success">{successMessage}</p>
        {/if}

        <div class="search-bar">
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama orang tua atau anak..." 
            bind:value={searchQuery}
          />
        </div>

        <div class="relations-grouped">
          {#if filteredParentsWithChildren.length === 0}
            <p class="empty-message">Tidak ada relasi yang ditemukan.</p>
          {:else}
            {#each filteredParentsWithChildren as group}
              <div class="parent-group">
                <div class="parent-header">
                  <h3>{group.parent?.nama_lengkap || 'Tidak diketahui'}</h3>
                  <span class="child-count">{group.children.length} anak</span>
                </div>
                <div class="children-list">
                  {#each group.children as relation}
                    <div class="child-row" class:editing={relation.id === editingRelationId}>
                      <div class="child-info">
                        <span class="birth-order-badge">Anak ke-{relation.birth_order}</span>
                        <span class="child-name">{getPersonName(relation.child_id)}</span>
                        <span class="union-label">{getShortUnionLabel(relation.union_id)}</span>
                      </div>
                      <div class="child-actions">
                        <button class="btn-icon" on:click={() => editRelation(relation)}>✏️</button>
                        <button class="btn-icon" on:click={() => deleteRelation(relation.id)}>🗑️</button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          {/if}
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

  .success {
    color: #16a34a;
    font-weight: 600;
  }

  tr.editing {
    background-color: #fef3c7;
  }

  .search-bar {
    margin-top: 0.5rem;
  }

  .search-bar input {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-size: 0.95rem;
  }

  .relations-grouped {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .empty-message {
    text-align: center;
    color: #6b7280;
    padding: 2rem;
  }

  .parent-group {
    background: #f9fafb;
    border-radius: 10px;
    padding: 1rem;
    border: 1px solid #e5e7eb;
  }

  .parent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #d1d5db;
  }

  .parent-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #111827;
  }

  .child-count {
    background: #667eea;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .children-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .child-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .child-row.editing {
    background-color: #fef3c7;
    border-color: #fbbf24;
  }

  .child-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .birth-order-badge {
    background: #3b82f6;
    color: white;
    padding: 0.25rem 0.65rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .child-name {
    font-weight: 600;
    color: #111827;
  }

  .union-label {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .child-actions {
    display: flex;
    gap: 0.25rem;
  }

  .tooltip-icon {
    font-size: 0.85rem;
    cursor: help;
    color: #6b7280;
    margin-left: 0.25rem;
  }

  .field-hint {
    color: #6b7280;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }

  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .child-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .child-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
