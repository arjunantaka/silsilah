<script>
  import { keluargaStore, orangList, unionList, hubunganList } from '../stores/keluarga.js';
  import { validateNoCircularParent } from '../utils/relationValidator.js';
  import PersonFields from './PersonFields.svelte';
  import ParentSelector from './ParentSelector.svelte';
  import SpouseSelector from './SpouseSelector.svelte';
  import ChildrenManager from './ChildrenManager.svelte';

  export let mode = 'create';
  export let personId = null;
  export let onSuccess = () => {};
  export let onCancel = () => {};

  let formData = {
    nama_lengkap: '',
    nama_alias: '',
    gender: 'L',
    tempat_lahir: '',
    tanggal_lahir: '',
    birth_order: null,
    alamat: '',
    pekerjaan: ''
  };

  let selectedParents = [];
  let selectedSpouse = null;
  let errorMessage = '';
  let isSubmitting = false;

  $: if (mode === 'edit' && personId) {
    loadPersonData(personId);
  }

  function loadPersonData(id) {
    const person = $orangList.find(p => p.id === id);
    if (!person) return;

    formData = {
      nama_lengkap: person.nama_lengkap || '',
      nama_alias: person.nama_alias || '',
      gender: person.gender || 'L',
      tempat_lahir: person.tempat_lahir || '',
      tanggal_lahir: person.tanggal_lahir || '',
      birth_order: person.birth_order,
      alamat: person.alamat || '',
      pekerjaan: person.pekerjaan || ''
    };

    const parentRelations = $hubunganList.filter(r => r.child_id === id);
    selectedParents = parentRelations.map(r => r.parent_id);

    const unions = $unionList.filter(
      u => u.person1_id === id || u.person2_id === id
    );
    if (unions.length > 0) {
      const union = unions[0];
      selectedSpouse = union.person1_id === id ? union.person2_id : union.person1_id;
    }
  }

  async function handleSubmit() {
    errorMessage = '';
    
    if (!formData.nama_lengkap || formData.nama_lengkap.trim() === '') {
      errorMessage = 'Nama lengkap wajib diisi';
      return;
    }

    if (mode === 'create' && selectedParents.length > 0) {
      const validation = validateNoCircularParent(
        null,
        selectedParents,
        $hubunganList,
        $orangList
      );
      if (!validation.valid) {
        errorMessage = validation.error;
        return;
      }
    }

    isSubmitting = true;

    try {
      let savedPersonId;

      if (mode === 'create') {
        savedPersonId = keluargaStore.createPerson(formData);
        
        if (selectedParents.length > 0) {
          keluargaStore.linkParents(savedPersonId, selectedParents);
        }

        if (selectedSpouse) {
          keluargaStore.linkSpouse(savedPersonId, selectedSpouse);
        }
      } else if (mode === 'edit') {
        keluargaStore.updatePerson(personId, formData);
        savedPersonId = personId;
      }

      onSuccess(savedPersonId);
      resetForm();
    } catch (error) {
      console.error('Error saving person:', error);
      errorMessage = error.message || 'Terjadi kesalahan saat menyimpan data';
    } finally {
      isSubmitting = false;
    }
  }

  function resetForm() {
    formData = {
      nama_lengkap: '',
      nama_alias: '',
      gender: 'L',
      tempat_lahir: '',
      tanggal_lahir: '',
      birth_order: null,
      alamat: '',
      pekerjaan: ''
    };
    selectedParents = [];
    selectedSpouse = null;
    errorMessage = '';
  }

  function handleCancel() {
    resetForm();
    onCancel();
  }
</script>

<div class="person-form-unified">
  <h3>{mode === 'create' ? 'Tambah Anggota Baru' : 'Edit Anggota'}</h3>

  {#if errorMessage}
    <div class="error-message">{errorMessage}</div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <PersonFields bind:formData disabled={isSubmitting} />

    {#if mode === 'create'}
      <div class="relations-section">
        <h4>Relasi (Opsional)</h4>
        <p class="hint">Semua relasi bisa ditambahkan nanti melalui menu Relations</p>

        <ParentSelector
          bind:selectedParents
          excludePersonId={personId}
          disabled={isSubmitting}
        />

        <SpouseSelector
          bind:selectedSpouse
          excludePersonId={personId}
          disabled={isSubmitting}
        />
      </div>
    {/if}

    {#if mode === 'edit'}
      <div class="relations-section">
        <h4>Anak</h4>
        <ChildrenManager personId={personId} />
      </div>
    {/if}

    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={handleCancel} disabled={isSubmitting}>
        Batal
      </button>
      <button type="submit" class="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Menyimpan...' : mode === 'create' ? 'Simpan' : 'Update'}
      </button>
    </div>
  </form>
</div>

<style>
  .person-form-unified {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 800px;
    margin: 0 auto;
  }

  h3 {
    margin: 0 0 20px 0;
    color: #2c3e50;
    font-size: 20px;
  }

  h4 {
    margin: 24px 0 12px 0;
    color: #34495e;
    font-size: 16px;
    font-weight: 600;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 16px;
    border: 1px solid #fcc;
  }

  .relations-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 2px solid #ecf0f1;
  }

  .hint {
    color: #7f8c8d;
    font-size: 13px;
    margin: -8px 0 16px 0;
    font-style: italic;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #ecf0f1;
  }

  button {
    padding: 10px 24px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #3498db;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2980b9;
  }

  .btn-secondary {
    background: #95a5a6;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #7f8c8d;
  }
</style>
