<script>
  export let namaLengkap = "";
  export let tempatLahir = "";
  export let tanggalLahir = "";
  export let gender = "";
  export let birthOrder = "";
  export let alamat = "";
  export let pekerjaan = "";
  export let disabled = false;
</script>

<div class="person-fields">
  <div class="form-group">
    <label for="namaLengkap">Nama Lengkap *</label>
    <input 
      id="namaLengkap" 
      type="text" 
      bind:value={namaLengkap} 
      placeholder="Nama lengkap"
      {disabled}
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
        {disabled}
      >
    </div>

    <div class="form-group">
      <label for="tanggalLahir">Tanggal Lahir</label>
      <input 
        id="tanggalLahir" 
        type="date" 
        bind:value={tanggalLahir}
        {disabled}
      >
    </div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="gender">Gender</label>
      <select 
        id="gender" 
        bind:value={gender}
        {disabled}
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
        {disabled}
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
      {disabled}
    ></textarea>
  </div>

  <div class="form-group">
    <label for="pekerjaan">Pekerjaan</label>
    <input 
      id="pekerjaan" 
      type="text" 
      bind:value={pekerjaan}
      placeholder="Pekerjaan/profesi"
      {disabled}
    >
  </div>
</div>

<style>
  .person-fields {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
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

  input:disabled,
  select:disabled,
  textarea:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
  }
</style>
