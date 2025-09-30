<script>
  import { trahStore } from '../stores/trah.js';
  
  export let onClose = () => {};
  export let onSuccess = () => {};
  export let editingPerson = null;
  
  let formData = {
    nama_lengkap: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    gender: '',
    birth_order: '',
    alamat: '',
    pekerjaan: ''
  };
  
  $: if (editingPerson) {
    formData = {
      nama_lengkap: editingPerson.nama_lengkap || '',
      tempat_lahir: editingPerson.tempat_lahir || '',
      tanggal_lahir: editingPerson.tanggal_lahir || '',
      gender: editingPerson.gender || '',
      birth_order: editingPerson.birth_order || '',
      alamat: editingPerson.alamat || '',
      pekerjaan: editingPerson.pekerjaan || ''
    };
  }
  
  let spouseMode = 'none';
  let spouseData = {
    existingId: '',
    nama_lengkap: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    gender: '',
    birth_order: '',
    alamat: '',
    pekerjaan: ''
  };
  
  let parentsMode = 'none';
  let parent1Data = { existingId: '', nama_lengkap: '', tempat_lahir: '', tanggal_lahir: '', gender: '', birth_order: '', alamat: '', pekerjaan: '' };
  let parent2Data = { existingId: '', nama_lengkap: '', tempat_lahir: '', tanggal_lahir: '', gender: '', birth_order: '', alamat: '', pekerjaan: '' };
  let addParent2 = false;
  
  let childrenData = [];
  
  let errorMessage = '';
  
  $: availablePersons = $trahStore?.persons || [];
  $: filteredForSpouse = availablePersons.filter(p => !p.pasangan_id);
  $: filteredForParent = availablePersons.filter(p => p.children_ids?.length === 0 || true);
  
  function addChild() {
    childrenData = [...childrenData, {
      id: Date.now(),
      nama_lengkap: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      gender: '',
      birth_order: '',
      alamat: '',
      pekerjaan: ''
    }];
  }
  
  function removeChild(id) {
    childrenData = childrenData.filter(c => c.id !== id);
  }
  
  function handleSubmit() {
    try {
      if (!formData.nama_lengkap.trim()) {
        errorMessage = 'Nama lengkap wajib diisi';
        return;
      }
      
      if (editingPerson) {
        trahStore.updatePerson(editingPerson.id, formData);
        onSuccess({ person: { ...editingPerson, ...formData } });
        onClose();
        return;
      }
      
      const parentIds = [];
      
      if (parentsMode === 'existing') {
        if (parent1Data.existingId) parentIds.push(parent1Data.existingId);
        if (addParent2 && parent2Data.existingId) parentIds.push(parent2Data.existingId);
      } else if (parentsMode === 'new') {
        if (parent1Data.nama_lengkap.trim()) {
          const p1 = trahStore.addPerson(parent1Data);
          parentIds.push(p1.id);
        }
        if (addParent2 && parent2Data.nama_lengkap.trim()) {
          const p2 = trahStore.addPerson(parent2Data);
          parentIds.push(p2.id);
        }
      }
      
      let spousePayload = null;
      if (spouseMode === 'existing' && spouseData.existingId) {
        spousePayload = { existingId: spouseData.existingId };
      } else if (spouseMode === 'new' && spouseData.nama_lengkap.trim()) {
        spousePayload = spouseData;
      }
      
      const result = trahStore.addPersonWithRelations({
        personData: formData,
        parentIds,
        spouseData: spousePayload,
        childrenData: childrenData.filter(c => c.nama_lengkap.trim())
      });
      
      if (spouseMode === 'existing' && spouseData.existingId) {
        trahStore.setSpouse(result.person.id, spouseData.existingId);
      }
      
      onSuccess(result);
      onClose();
    } catch (error) {
      console.error('Gagal menyimpan:', error);
      errorMessage = error.message || 'Terjadi kesalahan';
    }
  }
</script>

<div class="modal-overlay" on:click={(e) => e.target === e.currentTarget && onClose()}>
  <div class="modal">
    <div class="modal-header">
      <h3>{editingPerson ? 'Edit Data Anggota' : 'Tambah Anggota Keluarga (Terintegrasi)'}</h3>
      <button class="btn-close" on:click={onClose}>×</button>
    </div>
    
    <form on:submit|preventDefault={handleSubmit}>
      <section class="section">
        <h4>Data Pribadi</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Nama Lengkap *</label>
            <input type="text" bind:value={formData.nama_lengkap} required />
          </div>
          <div class="form-group">
            <label>Tempat Lahir</label>
            <input type="text" bind:value={formData.tempat_lahir} />
          </div>
          <div class="form-group">
            <label>Tanggal Lahir</label>
            <input type="date" bind:value={formData.tanggal_lahir} />
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select bind:value={formData.gender}>
              <option value="">Pilih Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div class="form-group">
            <label>Urutan Lahir</label>
            <input type="number" min="1" bind:value={formData.birth_order} placeholder="Kosongkan untuk otomatis" />
          </div>
          <div class="form-group">
            <label>Pekerjaan/Sekolah</label>
            <input type="text" bind:value={formData.pekerjaan} />
          </div>
          <div class="form-group full-width">
            <label>Alamat</label>
            <textarea bind:value={formData.alamat} rows="2"></textarea>
          </div>
        </div>
      </section>
      
      <section class="section">
        <h4>Orang Tua</h4>
        <div class="radio-group">
          <label><input type="radio" bind:group={parentsMode} value="none" /> Tidak ada</label>
          <label><input type="radio" bind:group={parentsMode} value="existing" /> Pilih yang ada</label>
          <label><input type="radio" bind:group={parentsMode} value="new" /> Tambah baru</label>
        </div>
        
        {#if parentsMode === 'existing'}
          <div class="form-grid">
            <div class="form-group">
              <label>Orang Tua 1</label>
              <select bind:value={parent1Data.existingId}>
                <option value="">-- Pilih --</option>
                {#each filteredForParent as person}
                  <option value={person.id}>{person.nama_lengkap} ({person.kode || 'no code'})</option>
                {/each}
              </select>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" bind:checked={addParent2} />
                Tambah Orang Tua 2
              </label>
            </div>
            
            {#if addParent2}
              <div class="form-group">
                <label>Orang Tua 2</label>
                <select bind:value={parent2Data.existingId}>
                  <option value="">-- Pilih --</option>
                  {#each filteredForParent as person}
                    <option value={person.id}>{person.nama_lengkap} ({person.kode || 'no code'})</option>
                  {/each}
                </select>
              </div>
            {/if}
          </div>
        {/if}
        
        {#if parentsMode === 'new'}
          <div class="subsection">
            <h5>Orang Tua 1</h5>
            <div class="form-grid">
              <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" bind:value={parent1Data.nama_lengkap} />
              </div>
              <div class="form-group">
                <label>Tempat Lahir</label>
                <input type="text" bind:value={parent1Data.tempat_lahir} />
              </div>
               <div class="form-group">
                <label>Tanggal Lahir</label>
                <input type="date" bind:value={parent1Data.tanggal_lahir} />
              </div>
              <div class="form-group">
                <label>Gender</label>
                <select bind:value={parent1Data.gender}>
                  <option value="">Pilih Gender</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div class="form-group">
                <label>Pekerjaan</label>
                <input type="text" bind:value={parent1Data.pekerjaan} />
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" bind:checked={addParent2} />
              Tambah Orang Tua 2
            </label>
          </div>
          
          {#if addParent2}
            <div class="subsection">
              <h5>Orang Tua 2</h5>
              <div class="form-grid">
                <div class="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" bind:value={parent2Data.nama_lengkap} />
                </div>
                <div class="form-group">
                  <label>Tempat Lahir</label>
                  <input type="text" bind:value={parent2Data.tempat_lahir} />
                </div>
                <div class="form-group">
                  <label>Tanggal Lahir</label>
                  <input type="date" bind:value={parent2Data.tanggal_lahir} />
                </div>
                <div class="form-group">
                  <label>Gender</label>
                  <select bind:value={parent2Data.gender}>
                    <option value="">Pilih Gender</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Pekerjaan</label>
                  <input type="text" bind:value={parent2Data.pekerjaan} />
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </section>
      
      <section class="section">
        <h4>Pasangan</h4>
        <div class="radio-group">
          <label><input type="radio" bind:group={spouseMode} value="none" /> Tidak ada</label>
          <label><input type="radio" bind:group={spouseMode} value="existing" /> Pilih yang ada</label>
          <label><input type="radio" bind:group={spouseMode} value="new" /> Tambah baru</label>
        </div>
        
        {#if spouseMode === 'existing'}
          <div class="form-group">
            <label>Pilih Pasangan</label>
            <select bind:value={spouseData.existingId}>
              <option value="">-- Pilih --</option>
              {#each filteredForSpouse as person}
                <option value={person.id}>{person.nama_lengkap} ({person.kode || 'no code'})</option>
              {/each}
            </select>
          </div>
        {/if}
        
        {#if spouseMode === 'new'}
          <div class="form-grid">
            <div class="form-group">
              <label>Nama Lengkap</label>
              <input type="text" bind:value={spouseData.nama_lengkap} />
            </div>
            <div class="form-group">
              <label>Tempat Lahir</label>
              <input type="text" bind:value={spouseData.tempat_lahir} />
            </div>
            <div class="form-group">
              <label>Tanggal Lahir</label>
              <input type="date" bind:value={spouseData.tanggal_lahir} />
            </div>
            <div class="form-group">
              <label>Gender</label>
              <select bind:value={spouseData.gender}>
                <option value="">Pilih Gender</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div class="form-group">
              <label>Urutan Lahir</label>
              <input type="number" min="1" bind:value={spouseData.birth_order} placeholder="Kosongkan untuk otomatis" />
            </div>
            <div class="form-group">
              <label>Pekerjaan</label>
              <input type="text" bind:value={spouseData.pekerjaan} />
            </div>
          </div>
        {/if}
      </section>
      
      <section class="section">
        <div class="section-header">
          <h4>Anak</h4>
          <button type="button" class="btn-small" on:click={addChild}>+ Tambah Anak</button>
        </div>
        
        {#if childrenData.length === 0}
          <p class="empty-text">Belum ada anak yang ditambahkan</p>
        {:else}
          {#each childrenData as child, i}
            <div class="child-item">
              <div class="child-header">
                <h5>Anak #{i + 1}</h5>
                <button type="button" class="btn-remove" on:click={() => removeChild(child.id)}>Hapus</button>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" bind:value={child.nama_lengkap} />
                </div>
                <div class="form-group">
                  <label>Tempat Lahir</label>
                  <input type="text" bind:value={child.tempat_lahir} />
                </div>
                <div class="form-group">
                  <label>Tanggal Lahir</label>
                  <input type="date" bind:value={child.tanggal_lahir} />
                </div>
                <div class="form-group">
                  <label>Gender</label>
                  <select bind:value={child.gender}>
                    <option value="">Pilih Gender</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Urutan Lahir</label>
                  <input type="number" min="1" bind:value={child.birth_order} placeholder="Kosongkan untuk otomatis" />
                </div>
                <div class="form-group">
                  <label>Pekerjaan</label>
                  <input type="text" bind:value={child.pekerjaan} />
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </section>
      
      {#if errorMessage}
        <p class="error">{errorMessage}</p>
      {/if}
      
      <div class="form-actions">
        <button type="button" class="btn-secondary" on:click={onClose}>Batal</button>
        <button type="submit" class="btn-primary">Simpan Semua</button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: grid;
    place-items: center;
    z-index: 100;
    padding: 1rem;
  }
  
  .modal {
    background: white;
    border-radius: 12px;
    width: min(800px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid #e5e7eb;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #111827;
  }
  
  .btn-close {
    border: none;
    background: transparent;
    font-size: 2rem;
    cursor: pointer;
    color: #6b7280;
    line-height: 1;
  }
  
  form {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .section {
    background: #f9fafb;
    border-radius: 10px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .section h4 {
    margin: 0;
    color: #374151;
    font-size: 1.1rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .subsection {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #e5e7eb;
  }
  
  .subsection h5 {
    margin: 0 0 0.75rem 0;
    color: #6b7280;
    font-size: 0.95rem;
  }
  
  .radio-group {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  
  .radio-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
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
  
  .form-group label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #374151;
  }
  
  .form-group input[type="text"],
  .form-group input[type="date"],
  .form-group input[type="number"],
  .form-group select,
  .form-group textarea {
    padding: 0.65rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-family: inherit;
  }
  
  .child-item {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #e5e7eb;
  }
  
  .child-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .child-header h5 {
    margin: 0;
    color: #6b7280;
    font-size: 0.95rem;
  }
  
  .btn-small {
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
  }
  
  .btn-remove {
    background: #f87171;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .empty-text {
    color: #9ca3af;
    font-style: italic;
    margin: 0;
  }
  
  .error {
    color: #dc2626;
    font-weight: 600;
    margin: 0;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .btn-primary,
  .btn-secondary {
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1.5rem;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .btn-primary {
    background: #667eea;
    color: white;
  }
  
  .btn-secondary {
    background: #e5e7eb;
    color: #111827;
  }
  
  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    
    .radio-group {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
</style>
