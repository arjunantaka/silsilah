<script>
  import { trahStore } from '../stores/trah.js';
  import { getGenerasiLabel } from '../utils/kodeGenerator.js';

  export let editingPerson = null;
  export let parentId = null;

  let namaLengkap = "";
  let tempatLahir = "";
  let tanggalLahir = "";
  let gender = "";
  let birthOrder = "";
  let alamat = "";
  let pekerjaan = "";

  $: if (editingPerson) {
    namaLengkap = editingPerson.nama_lengkap;
    tempatLahir = editingPerson.tempat_lahir;
    tanggalLahir = editingPerson.tanggal_lahir;
    gender = editingPerson.gender || "";
    birthOrder = editingPerson.birth_order || "";
    alamat = editingPerson.alamat;
    pekerjaan = editingPerson.pekerjaan;
  }

  $: parent = parentId ? $trahStore.persons.find(p => p.id === parentId) : null;
  $: generasiPreview = parent ? getGenerasiLabel(parent.generasi + 1) : null;
  $: isSpouseMode = editingPerson && editingPerson.isSpouse;

  function handleSubmit() {
    if (!namaLengkap.trim()) {
      alert("Nama lengkap harus diisi");
      return;
    }

    const personData = {
      nama_lengkap: namaLengkap,
      tempat_lahir: tempatLahir,
      tanggal_lahir: tanggalLahir,
      gender: gender,
      birth_order: birthOrder ? parseInt(birthOrder) : null,
      alamat: alamat,
      pekerjaan: pekerjaan
    };

    if (editingPerson && !isSpouseMode) {
      trahStore.updatePerson(editingPerson.id, personData);
    } else if (isSpouseMode) {
      trahStore.addSpouse(parentId, personData);
    } else {
      trahStore.addPerson(personData, parentId);
    }

    resetForm();
  }

  function resetForm() {
    namaLengkap = "";
    tempatLahir = "";
    tanggalLahir = "";
    gender = "";
    birthOrder = "";
    alamat = "";
    pekerjaan = "";
    editingPerson = null;
    parentId = null;
  }

	function handleCancel() {
		onClose();
	}
</script>

<div class="person-form">
  <h3>{isSpouseMode ? 'Tambah Pasangan Baru' : (editingPerson ? 'Edit Data' : 'Tambah Anggota Baru')}</h3>
  
  {#if parent && !editingPerson}
    <div class="parent-info">
      <strong>{isSpouseMode ? 'Pasangan untuk:' : 'Orang Tua:'}</strong> {parent.nama_lengkap} 
      {#if parent.kode}({parent.kode}){/if}
      {#if !isSpouseMode}
        <span class="generasi-badge">{generasiPreview}</span>
      {/if}
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="namaLengkap">Nama Lengkap *</label>
      <input 
        id="namaLengkap" 
        type="text" 
        bind:value={namaLengkap} 
        placeholder="Nama lengkap"
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
        >
      </div>

      <div class="form-group">
        <label for="tanggalLahir">Tanggal Lahir</label>
        <input 
          id="tanggalLahir" 
          type="date" 
          bind:value={tanggalLahir}
        >
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="gender">Gender</label>
        <select 
          id="gender" 
          bind:value={gender}
        >
          <option value="">Pilih Gender</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>

      <div class="form-group">
        <label for="birthOrder">Urutan Lahir</label>
        <input 
          id="birthOrder" 
          type="number" 
          min="1"
          bind:value={birthOrder}
          placeholder="Kosongkan untuk otomatis"
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
      ></textarea>
    </div>

    <div class="form-group">
      <label for="pekerjaan">Pekerjaan</label>
      <input 
        id="pekerjaan" 
        type="text" 
        bind:value={pekerjaan}
        placeholder="Pekerjaan/profesi"
      >
    </div>

    <div class="form-actions">
      <button type="submit" class="primary">
        {editingPerson ? 'Simpan' : 'Tambah'}
      </button>
      <button type="button" on:click={handleCancel}>Batal</button>
    </div>
  </form>
</div>

<style>
  .person-form {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }

  h3 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .parent-info {
    padding: 0.75rem;
    background: #e3f2fd;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }

  .generasi-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #2196F3;
    color: white;
    border-radius: 3px;
    font-size: 0.85rem;
    margin-left: 0.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
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
    font-size: 0.95rem;
  }

  input[type="text"],
  input[type="date"],
  input[type="number"],
  select,
  textarea {
    width: 100%;
    padding: 0.65rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
    font-family: inherit;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #4CAF50;
  }

  textarea {
    resize: vertical;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  button {
    padding: 0.65rem 1.25rem;
    border: none;
    border-radius: 4px;
    font-size: 0.95rem;
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

  button[type="button"] {
    background: #f5f5f5;
    color: #333;
  }

  button[type="button"]:hover {
    background: #e0e0e0;
  }
</style>
