<script>
  import { trahStore } from '../stores/trah.js';
  import { getGenerasiLabel } from '../utils/kodeGenerator.js';
  import PersonFormUnifiedTrah from './PersonFormUnifiedTrah.svelte';

  export let onSelectPerson = null;

  let searchQuery = "";
  let filterGenerasi = -1;
  let showForm = false;
  let selectedParentId = null;
  let editingPerson = null;

  $: persons = $trahStore.persons;
  $: filteredPersons = persons.filter(p => {
    const matchesSearch = p.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.kode && p.kode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGenerasi = filterGenerasi === -1 || p.generasi === filterGenerasi;
    return matchesSearch && matchesGenerasi;
  }).sort((a, b) => {
    if (a.generasi !== b.generasi) return a.generasi - b.generasi;
			return (a.kode || '').localeCompare(b.kode || '');
  });

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

    const choice = confirm(`Tambah pasangan untuk ${person.nama_lengkap}?\n\nPilihan:\n1. Pilih dari anggota yang ada\n2. Tambah pasangan baru\n\nKlik OK untuk pilih dari yang ada, Cancel untuk tambah baru`);
    
    if (choice) {
      const potentialSpouses = persons.filter(p => 
        p.id !== personId && 
        p.generasi === person.generasi && 
        !p.pasangan_id &&
        p.id !== person.parent_id &&
        p.parent_id !== person.id
      );

      if (potentialSpouses.length === 0) {
        alert("Tidak ada calon pasangan yang tersedia di generasi yang sama");
        return;
      }

      const spouseList = potentialSpouses.map((p, i) => 
        `${i + 1}. ${p.nama_lengkap} (${p.kode || 'Root'})`
      ).join('\n');

      const selection = prompt(`Pilih pasangan untuk ${person.nama_lengkap}:\n\n${spouseList}\n\nMasukkan nomor:`);
      
      if (selection) {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < potentialSpouses.length) {
          trahStore.setSpouse(personId, potentialSpouses[index].id);
        } else {
          alert("Pilihan tidak valid");
        }
      }
    } else {
      selectedParentId = personId;
      editingPerson = { isSpouse: true };
      showForm = true;
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
    if (!person.pasangan_id) return '-';
    const spouse = persons.find(p => p.id === person.pasangan_id);
    return spouse ? spouse.nama_lengkap : '-';
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
  <div class="pl-modal-overlay" on:click={handleBackdropClick}>
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
          <th>Alamat</th>
          <th>Pekerjaan</th>
          <th>Pasangan</th>
          <th>Orang Tua</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredPersons as person (person.id)}
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
            <td class="alamat">{person.alamat || '-'}</td>
            <td>{person.pekerjaan || '-'}</td>
            <td>{getSpouseName(person)}</td>
            <td>{getParentName(person)}</td>
            <td class="actions" on:click|stopPropagation data-testid={"cell-actions-" + person.id}>
              <button type="button" class="btn-icon" data-testid={"btn-add-child-" + person.id} on:click|stopPropagation={() => handleAddChild(person.id)} title="Tambah anak" aria-label="Tambah anak">
                {@html AddChildIcon}
              </button>
              <button type="button" class="btn-icon" data-testid={"btn-edit-person-" + person.id} on:click|stopPropagation={() => handleEdit(person)} title="Edit" aria-label="Edit">
                {@html EditIcon}
              </button>
              {#if person.pasangan_id}
                <button type="button" class="btn-icon" data-testid={"btn-remove-spouse-" + person.id} on:click|stopPropagation={() => handleRemoveSpouse(person.id)} title="Hapus pasangan" aria-label="Hapus pasangan">
                  {@html RemoveSpouseIcon}
                </button>
              {:else}
                <button type="button" class="btn-icon" data-testid={"btn-set-spouse-" + person.id} on:click|stopPropagation={() => handleSetSpouse(person.id)} title="Set pasangan" aria-label="Set pasangan">
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
</style>
