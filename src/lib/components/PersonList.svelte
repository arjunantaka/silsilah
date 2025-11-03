<script>
  import { trahStore } from '../stores/trah.js';
  import { getGenerasiLabel, sortByKodeHierarchical, sortByKodeSequential } from '../utils/kodeGenerator.js';
  import PersonFormUnifiedTrah from './PersonFormUnifiedTrah.svelte';

  export let onSelectPerson = null;

  let searchQuery = "";
  let filterGenerasi = -1;
  let sortMode = 'hierarchical'; // 'hierarchical' or 'sequential'
  let showForm = false;
  let selectedParentId = null;
  let editingPerson = null;
  let showSpouseModal = false;
  let spouseModalMode = 'view'; // 'view' or 'edit'
  let selectedPersonForSpouse = null;
  let spouseFormData = null;

  $: persons = $trahStore.persons;
  $: filteredPersons = persons.filter(p => {
    const matchesSearch = p.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.kode && p.kode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGenerasi = filterGenerasi === -1 || p.generasi === filterGenerasi;
    return matchesSearch && matchesGenerasi;
  });

  $: sortedPersons = (() => {
    if (sortMode === 'hierarchical') {
      return sortByKodeHierarchical(filteredPersons);
    } else {
      return sortByKodeSequential(filteredPersons);
    }
  })();

  function handleAddChild(parentId) {
    selectedParentId = parentId;
    editingPerson = null;
    showForm = true;
  }

  function handleEdit(person) {
    editingPerson = person;
    selectedParentId = null;
    showForm = true;
  }

  function handleDelete(personId) {
    const person = persons.find(p => p.id === personId);
    if (!person) return;

    if (confirm(`Yakin ingin menghapus ${person.nama_lengkap}?`)) {
      try {
        trahStore.deletePerson(personId);
      } catch (error) {
        alert(error.message);
      }
    }
  }

  function handleSetSpouse(personId) {
    const person = persons.find(p => p.id === personId);
    if (!person) return;

    selectedPersonForSpouse = person;
    spouseModalMode = 'edit';
    spouseFormData = {
      nama_lengkap: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      gender: person.gender === 'L' ? 'P' : 'L',
      alamat: '',
      pekerjaan: '',
      no_hp: ''
    };
    showSpouseModal = true;
  }

  function handleViewSpouse(personId) {
    const person = persons.find(p => p.id === personId);
    if (!person || !person.pasangan) return;

    selectedPersonForSpouse = person;
    spouseModalMode = 'view';
    showSpouseModal = true;
  }

  function handleEditSpouse(personId) {
    const person = persons.find(p => p.id === personId);
    if (!person || !person.pasangan) return;

    selectedPersonForSpouse = person;
    spouseModalMode = 'edit';
    spouseFormData = { ...person.pasangan };
    showSpouseModal = true;
  }

  function closeSpouseModal() {
    showSpouseModal = false;
    selectedPersonForSpouse = null;
    spouseFormData = null;
  }

  function saveSpouseData() {
    if (!selectedPersonForSpouse || !spouseFormData) return;

    if (!spouseFormData.nama_lengkap || !spouseFormData.nama_lengkap.trim()) {
      alert('Nama pasangan wajib diisi');
      return;
    }

    try {
      if (selectedPersonForSpouse.pasangan) {
        // Update existing spouse
        trahStore.removeSpouse(selectedPersonForSpouse.id);
      }
      trahStore.addSpouse(selectedPersonForSpouse.id, spouseFormData);
      closeSpouseModal();
    } catch (error) {
      alert(error.message || 'Gagal menyimpan data pasangan');
    }
  }

  function handleRemoveSpouse(personId) {
    if (confirm("Yakin ingin menghapus pasangan?")) {
      trahStore.removeSpouse(personId);
    }
  }

  const AddChildIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/><line x1="12" y1="13" x2="12" y2="19"/><line x1="9" y1="16" x2="15" y2="16"/></svg>`;
  
  const EditIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  
  const RemoveSpouseIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  
  const SetSpouseIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  
  const DeleteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

  const ViewIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

  const MaleIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="6"/><line x1="21" y1="3" x2="14" y2="10"/><polyline points="21 3 21 9"/><polyline points="15 3 21 3"/></svg>`;
  
  const FemaleIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><line x1="12" y1="14" x2="12" y2="23"/><line x1="8" y1="19" x2="16" y2="19"/></svg>`;

  function getGenderIcon(person) {
    if (person.gender === 'L') return MaleIcon;
    if (person.gender === 'P') return FemaleIcon;
    return '';
  }

  function formatTTL(person) {
    const parts = [];
    if (person.tempat_lahir) parts.push(person.tempat_lahir);
    if (person.tanggal_lahir) {
      const date = new Date(person.tanggal_lahir);
      parts.push(date.toLocaleDateString('id-ID'));
    }
    return parts.join(', ') || '-';
  }

  function getSpouseName(person) {
    if (!person.pasangan) return '-';
    return person.pasangan.nama_lengkap || '-';
  }

  function getParentName(person) {
    const names = [];
    
    if (person.parent_id) {
      const parent1 = persons.find(p => p.id === person.parent_id);
      if (parent1) names.push(parent1.nama_lengkap);
    }
    
    if (person.parent2_id) {
      const parent2 = persons.find(p => p.id === person.parent2_id);
      if (parent2) names.push(parent2.nama_lengkap);
    }
    
    return names.length > 0 ? names.join(' & ') : '-';
  }

  function closeForm() {
    showForm = false;
    selectedParentId = null;
    editingPerson = null;
    document.body.style.overflow = '';
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      closeForm();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && showForm) {
      closeForm();
    }
  }

  $: if (showForm) {
    document.body.style.overflow = 'hidden';
  }
  
  function handleFormSuccess(result) {
    closeForm();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="person-list-container">
{#if showForm}
  <div class="pl-modal-overlay" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeForm()} role="button" tabindex="0">
    <div class="pl-modal">
      <button class="pl-close" on:click={closeForm} aria-label="Tutup">&times;</button>
      <PersonFormUnifiedTrah
        mode={editingPerson ? 'edit' : 'create'}
        editingPerson={editingPerson}
        parentId={selectedParentId}
        onSuccess={handleFormSuccess}
        onClose={closeForm}
      />
    </div>
  </div>
{/if}

{#if showSpouseModal}
  <div class="pl-modal-overlay" on:click={closeSpouseModal} on:keydown={(e) => e.key === 'Escape' && closeSpouseModal()} role="button" tabindex="0">
    <div class="pl-modal" on:click|stopPropagation on:keydown={() => {}} role="dialog" tabindex="-1">
      <button class="pl-close" on:click={closeSpouseModal} aria-label="Tutup">&times;</button>

      <div class="spouse-modal-content">
        <h3>{spouseModalMode === 'view' ? 'Detail Pasangan' : 'Data Pasangan'}</h3>
        <p class="spouse-for">Pasangan dari: <strong>{selectedPersonForSpouse?.nama_lengkap}</strong></p>

        {#if spouseModalMode === 'view' && selectedPersonForSpouse?.pasangan}
          <div class="spouse-detail-view">
            <div class="detail-row">
              <span class="detail-label">Nama Lengkap:</span>
              <span class="detail-value">{selectedPersonForSpouse.pasangan.nama_lengkap || '-'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Jenis Kelamin:</span>
              <span class="detail-value">{selectedPersonForSpouse.pasangan.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tempat Lahir:</span>
              <span class="detail-value">{selectedPersonForSpouse.pasangan.tempat_lahir || '-'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tanggal Lahir:</span>
              <span class="detail-value">{selectedPersonForSpouse.pasangan.tanggal_lahir || '-'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">No. HP:</span>
              <span class="detail-value">{selectedPersonForSpouse.pasangan.no_hp || '-'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Alamat:</span>
              <span class="detail-value">{selectedPersonForSpouse.pasangan.alamat || '-'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Pekerjaan:</span>
              <span class="detail-value">{selectedPersonForSpouse.pasangan.pekerjaan || '-'}</span>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-primary" on:click={() => handleEditSpouse(selectedPersonForSpouse.id)}>
                Edit Data Pasangan
              </button>
              <button type="button" class="btn-secondary" on:click={closeSpouseModal}>
                Tutup
              </button>
            </div>
          </div>
        {:else if spouseModalMode === 'edit' && spouseFormData}
          <form on:submit|preventDefault={saveSpouseData} class="spouse-edit-form">
            <div class="form-group">
              <label for="spouse-nama">Nama Lengkap *</label>
              <input
                id="spouse-nama"
                type="text"
                bind:value={spouseFormData.nama_lengkap}
                placeholder="Nama lengkap pasangan"
                required
              />
            </div>

            <div class="form-group">
              <label for="spouse-gender">Jenis Kelamin</label>
              <select id="spouse-gender" bind:value={spouseFormData.gender}>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="spouse-tempat">Tempat Lahir</label>
                <input
                  id="spouse-tempat"
                  type="text"
                  bind:value={spouseFormData.tempat_lahir}
                  placeholder="Tempat lahir"
                />
              </div>

              <div class="form-group">
                <label for="spouse-tanggal">Tanggal Lahir</label>
                <input
                  id="spouse-tanggal"
                  type="date"
                  bind:value={spouseFormData.tanggal_lahir}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="spouse-no-hp">No. HP</label>
              <input
                id="spouse-no-hp"
                type="text"
                bind:value={spouseFormData.no_hp}
                placeholder="Contoh: 0812-3456-7890"
              />
            </div>

            <div class="form-group">
              <label for="spouse-alamat">Alamat</label>
              <textarea
                id="spouse-alamat"
                bind:value={spouseFormData.alamat}
                placeholder="Alamat lengkap"
                rows="2"
              />
            </div>

            <div class="form-group">
              <label for="spouse-pekerjaan">Pekerjaan</label>
              <input
                id="spouse-pekerjaan"
                type="text"
                bind:value={spouseFormData.pekerjaan}
                placeholder="Pekerjaan"
              />
            </div>

            <div class="modal-actions">
              <button type="submit" class="btn-primary">
                Simpan
              </button>
              <button type="button" class="btn-secondary" on:click={closeSpouseModal}>
                Batal
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  </div>
{/if}

  <div class="controls">
    <input 
      type="text" 
      placeholder="Cari nama atau kode..." 
      bind:value={searchQuery}
      class="search-input"
      data-testid="input-search-person"
    >
    
    <select bind:value={filterGenerasi} class="filter-select" data-testid="select-filter-generasi">
      <option value={-1}>Semua Generasi</option>
      <option value={0}>Root/Trah</option>
      <option value={1}>Anak</option>
      <option value={2}>Putu/Cucu</option>
      <option value={3}>Buyut</option>
      <option value={4}>Canggah</option>
    </select>

    <select bind:value={sortMode} class="filter-select" data-testid="select-sort-mode">
      <option value="hierarchical">Urutan Hierarkis (A1→A1P1→A2)</option>
      <option value="sequential">Urutan Sequential (A1→A2→A1P1)</option>
    </select>

    <button class="add-btn" data-testid="btn-add-person" on:click={() => { showForm = true; selectedParentId = null; editingPerson = null; }}>
      + Tambah Anggota
    </button>
  </div>

  <div class="person-table">
    <table>
      <thead>
        <tr>
          <th>Kode</th>
          <th>Nama</th>
          <th>TTL</th>
          <th>No. HP</th>
          <th>Alamat</th>
          <th>Pekerjaan</th>
          <th>Pasangan</th>
          <th>Orang Tua</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedPersons as person (person.id)}
          <tr class="generasi-{person.generasi}" class:clickable={onSelectPerson} on:click={() => onSelectPerson?.(person)} data-testid={"row-person-" + person.id}>
            <td>
              <span class="kode-badge">{person.is_root ? 'ROOT' : (person.kode || '-')}</span>
              <span class="generasi-label">{getGenerasiLabel(person.generasi)}</span>
            </td>
            <td class="nama">
              {#if getGenderIcon(person)}
                <span class="gender-icon" class:male={person.gender === 'L'} class:female={person.gender === 'P'}>
                  {@html getGenderIcon(person)}
                </span>
              {/if}
              {person.nama_lengkap}
            </td>
            <td>{formatTTL(person)}</td>
            <td>{person.no_hp || '-'}</td>
            <td class="alamat">{person.alamat || '-'}</td>
            <td>{person.pekerjaan || '-'}</td>
            <td class="spouse-cell" on:click|stopPropagation>
              {#if person.pasangan}
                <span class="spouse-name clickable" on:click={() => handleViewSpouse(person.id)} on:keydown={(e) => e.key === 'Enter' && handleViewSpouse(person.id)} role="button" tabindex="0" title="Klik untuk lihat detail">
                  {getSpouseName(person)}
                </span>
              {:else}
                <span class="no-spouse">-</span>
              {/if}
            </td>
            <td>{getParentName(person)}</td>
            <td class="actions" on:click|stopPropagation data-testid={"cell-actions-" + person.id}>
              <button type="button" class="btn-icon" data-testid={"btn-add-child-" + person.id} on:click|stopPropagation={() => handleAddChild(person.id)} title="Tambah anak" aria-label="Tambah anak">
                {@html AddChildIcon}
              </button>
              <button type="button" class="btn-icon" data-testid={"btn-edit-person-" + person.id} on:click|stopPropagation={() => handleEdit(person)} title="Edit" aria-label="Edit">
                {@html EditIcon}
              </button>
              {#if person.pasangan}
                <button type="button" class="btn-icon" data-testid={"btn-view-spouse-" + person.id} on:click|stopPropagation={() => handleViewSpouse(person.id)} title="Lihat detail pasangan" aria-label="Lihat pasangan">
                  {@html ViewIcon}
                </button>
                <button type="button" class="btn-icon" data-testid={"btn-edit-spouse-" + person.id} on:click|stopPropagation={() => handleEditSpouse(person.id)} title="Edit pasangan" aria-label="Edit pasangan">
                  {@html EditIcon}
                </button>
                <button type="button" class="btn-icon danger" data-testid={"btn-remove-spouse-" + person.id} on:click|stopPropagation={() => handleRemoveSpouse(person.id)} title="Hapus pasangan" aria-label="Hapus pasangan">
                  {@html RemoveSpouseIcon}
                </button>
              {:else}
                <button type="button" class="btn-icon" data-testid={"btn-set-spouse-" + person.id} on:click|stopPropagation={() => handleSetSpouse(person.id)} title="Tambah pasangan" aria-label="Tambah pasangan">
                  {@html SetSpouseIcon}
                </button>
              {/if}
              {#if !person.is_root}
                <button type="button" class="btn-icon danger" data-testid={"btn-delete-person-" + person.id} on:click|stopPropagation={() => handleDelete(person.id)} title="Hapus" aria-label="Hapus">
                  {@html DeleteIcon}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if filteredPersons.length === 0}
      <div class="empty-state">
        <p>Tidak ada data yang sesuai dengan pencarian</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .person-list-container {
    padding: 1rem;
  }

  .pl-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 1rem;
    z-index: 1000;
    overflow-y: auto;
  }

  .pl-modal {
    position: relative;
    background: white;
    width: min(640px, 100%);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .pl-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: transparent;
    border: none;
    font-size: 1.6rem;
    cursor: pointer;
    color: #666;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    z-index: 1;
    line-height: 1;
    transition: all 0.2s;
  }

  .pl-close:hover {
    background: #f0f0f0;
    color: #333;
  }

  .controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .filter-select {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
    min-width: 150px;
  }

  .add-btn {
    padding: 0.75rem 1.5rem;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.95rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .add-btn:hover {
    background: #45a049;
  }

  .person-table {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: #f5f5f5;
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #333;
    border-bottom: 2px solid #ddd;
    font-size: 0.9rem;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #eee;
    font-size: 0.9rem;
  }

  tr:hover {
    background: #f9f9f9;
  }

  tr.clickable {
    cursor: pointer;
  }

  .kode-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #2196F3;
    color: white;
    border-radius: 3px;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .generasi-label {
    display: inline-block;
    margin-left: 0.5rem;
    color: #666;
    font-size: 0.85rem;
  }

  .nama {
    font-weight: 500;
  }

  .alamat {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    white-space: nowrap;
    pointer-events: all;
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    min-width: 28px;
    min-height: 28px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
    margin-right: 0.25rem;
  }

  .btn-icon:hover {
    background: #f0f0f0;
    border-color: #999;
    transform: translateY(-1px);
  }

  .btn-icon:active {
    transform: translateY(0);
  }

  .btn-icon.danger {
    border-color: #ffcdd2;
  }

  .btn-icon.danger:hover {
    background: #ffebee;
    border-color: #ef5350;
  }

  .btn-icon :global(svg) {
    display: block;
    stroke: #333;
  }

  .btn-icon.danger :global(svg) {
    stroke: #d32f2f;
  }

  .gender-icon {
    display: inline-flex;
    align-items: center;
    margin-right: 0.35rem;
    vertical-align: middle;
  }

  .gender-icon.male :global(svg) {
    stroke: #2196F3;
  }

  .gender-icon.female :global(svg) {
    stroke: #E91E63;
  }

  .empty-state {
    padding: 3rem;
    text-align: center;
    color: #999;
  }

  .generasi-0 {
    background: #fff8e1;
  }

  .generasi-1 {
    background: #e8f5e9;
  }

  .generasi-2 {
    background: #e3f2fd;
  }

  .generasi-3 {
    background: #f3e5f5;
  }

  .generasi-4 {
    background: #fce4ec;
  }

  /* Spouse Modal Styles */
  .spouse-modal-content {
    padding: 1.5rem;
  }

  .spouse-modal-content h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.4rem;
    font-weight: 600;
  }

  .spouse-for {
    color: #666;
    font-size: 0.9rem;
    margin: 0 0 1.5rem 0;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .spouse-detail-view {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 6px;
  }

  .detail-row {
    display: flex;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .detail-row:last-of-type {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .detail-label {
    font-weight: 600;
    color: #374151;
    min-width: 140px;
    flex-shrink: 0;
  }

  .detail-value {
    color: #6b7280;
    flex: 1;
  }

  .spouse-edit-form .form-group {
    margin-bottom: 1rem;
  }

  .spouse-edit-form .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .spouse-edit-form label {
    display: block;
    margin-bottom: 0.4rem;
    font-weight: 500;
    color: #374151;
    font-size: 0.9rem;
  }

  .spouse-edit-form input[type="text"],
  .spouse-edit-form input[type="date"],
  .spouse-edit-form select,
  .spouse-edit-form textarea {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  .spouse-edit-form input:focus,
  .spouse-edit-form select:focus,
  .spouse-edit-form textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  .spouse-edit-form textarea {
    resize: vertical;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    margin-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .modal-actions button {
    padding: 0.6rem 1.5rem;
    border-radius: 4px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover {
    background: #5568d3;
  }

  .btn-secondary {
    background: #9ca3af;
    color: white;
  }

  .btn-secondary:hover {
    background: #6b7280;
  }

  .spouse-cell {
    cursor: default;
  }

  .spouse-name.clickable {
    color: #667eea;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
  }

  .spouse-name.clickable:hover {
    color: #5568d3;
  }

  .no-spouse {
    color: #9ca3af;
  }
</style>
