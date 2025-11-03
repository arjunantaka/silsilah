<script>
  import { trahStore } from '../stores/trah.js';

  export let mode = 'create';
  export let parentId = null;
  export let editingPerson = null;
  export let onClose = () => {};
  export let onSuccess = () => {};

  // Default form data with null safety
  function getDefaultFormData() {
    return {
      kode: '',
      nama_lengkap: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      gender: 'L',
      alamat: '',
      pekerjaan: '',
      no_hp: ''
    };
  }

  let formData = getDefaultFormData();

  let selectedParentIds = [];
  let editingParents = false;
  let spouseData = null;
  let addSpouse = false;
  let selectedExistingSpouseId = null;
  let spouseMode = 'none'; // 'none', 'new'
  let errorMessage = '';
  let isSubmitting = false;

  $: persons = $trahStore.persons;
  $: availableParents = persons.filter(p => {
    if (mode === 'edit' && editingPerson && p.id === editingPerson.id) return false;
    return true;
  });

  $: if (mode === 'edit' && editingPerson && editingPerson.id) {
    loadPersonData();
  }

  $: if (parentId && mode === 'create') {
    selectedParentIds = [parentId];
  }

  $: if (spouseMode === 'new') {
    if (!spouseData) {
      // Only create new default data if we don't already have spouse data (from edit mode)
      const oppositeGender = formData.gender === 'L' ? 'P' : 'L';
      spouseData = getDefaultSpouseData(oppositeGender);
    }
  } else if (spouseMode === 'none' && mode === 'create') {
    // Only reset spouse data in create mode when switching to 'none'
    spouseData = null;
  }

  function loadPersonData() {
    if (!editingPerson || !editingPerson.id) return;

    const person = persons.find(p => p.id === editingPerson.id);
    if (!person) return;

    formData = {
      kode: person.kode || '',
      nama_lengkap: person.nama_lengkap || '',
      tempat_lahir: person.tempat_lahir || '',
      tanggal_lahir: person.tanggal_lahir || '',
      gender: person.gender || 'L',
      alamat: person.alamat || '',
      pekerjaan: person.pekerjaan || '',
      no_hp: person.no_hp || ''
    };

    selectedParentIds = [];
    if (person.parent_id) selectedParentIds.push(person.parent_id);
    if (person.parent2_id) selectedParentIds.push(person.parent2_id);

    // Initialize spouse mode and data based on existing spouse
    if (person.pasangan) {
      spouseMode = 'none'; // Start with 'none' to show clean state
      spouseData = { ...person.pasangan }; // Pre-load existing spouse data
    } else {
      spouseMode = 'none';
      const oppositeGender = formData.gender === 'L' ? 'P' : 'L';
      spouseData = null;
    }

    selectedExistingSpouseId = null;
  }

  function getDefaultSpouseData(oppositeGender = 'P') {
    return {
      nama_lengkap: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      gender: oppositeGender,
      alamat: '',
      pekerjaan: '',
      no_hp: ''
    };
  }


  function resetForm() {
    formData = getDefaultFormData();
    selectedParentIds = [];
    spouseData = null;
    addSpouse = false;
    selectedExistingSpouseId = null;
    spouseMode = 'none';
    errorMessage = '';
    editingParents = false;
  }

  function handleCancel() {
    resetForm();
    onClose();
  }

  function toggleParent(parentId) {
    if (selectedParentIds.includes(parentId)) {
      selectedParentIds = selectedParentIds.filter(id => id !== parentId);
    } else {
      if (selectedParentIds.length < 2) {
        selectedParentIds = [...selectedParentIds, parentId];
      } else {
        errorMessage = 'Maksimal 2 orang tua';
        setTimeout(() => { errorMessage = ''; }, 2000);
      }
    }
  }

  function getPersonLabel(person) {
    const gen = person.generasi === 0 ? 'Root' : `Gen ${person.generasi}`;
    return `${person.nama_lengkap} (${person.kode || gen})`;
  }

  function validateForm() {
    // Validate main form data
    if (!formData.nama_lengkap || !formData.nama_lengkap.trim()) {
      return 'Nama lengkap wajib diisi';
    }

    // Validate kode uniqueness (if provided)
    if (formData.kode && formData.kode.trim()) {
      const trimmedKode = formData.kode.trim();
      const duplicateKode = persons.find(p => {
        // When editing, exclude current person from duplicate check
        if (mode === 'edit' && editingPerson && p.id === editingPerson.id) {
          return false;
        }
        return p.kode === trimmedKode;
      });

      if (duplicateKode) {
        return `Kode "${trimmedKode}" sudah digunakan oleh ${duplicateKode.nama_lengkap}`;
      }
    }

    // Validate spouse data if mode is 'new'
    if (spouseMode === 'new') {
      if (!spouseData || !spouseData.nama_lengkap || !spouseData.nama_lengkap.trim()) {
        return 'Nama pasangan wajib diisi ketika menambah pasangan baru';
      }
    }


    // Prevent circular parent relationships
    if (mode === 'edit' && editingPerson && editingParents) {
      if (selectedParentIds.includes(editingPerson.id)) {
        return 'Seseorang tidak bisa menjadi orang tua dirinya sendiri';
      }
    }

    return null;
  }

  async function handleSubmit() {
    errorMessage = '';

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      errorMessage = validationError;
      return;
    }

    isSubmitting = true;

    try {
      if (mode === 'create') {
        const parentIds = selectedParentIds.length > 0 ? selectedParentIds : [];
        const parent1Id = parentIds[0] || null;
        const parent2Id = parentIds[1] || null;

        // Sanitize form data before saving
        const sanitizedFormData = {
          kode: (formData.kode || '').trim(),
          nama_lengkap: formData.nama_lengkap.trim(),
          tempat_lahir: (formData.tempat_lahir || '').trim(),
          tanggal_lahir: formData.tanggal_lahir || '',
          gender: formData.gender || 'L',
          alamat: (formData.alamat || '').trim(),
          pekerjaan: (formData.pekerjaan || '').trim(),
          no_hp: (formData.no_hp || '').trim()
        };

        const newPerson = trahStore.addPerson(sanitizedFormData, parent1Id, parent2Id);
        const newPersonId = newPerson.id;

        // Handle spouse creation (spouse is now stored as simple object, not as trah member)
        if (spouseMode === 'new' && spouseData && spouseData.nama_lengkap.trim()) {
          const sanitizedSpouseData = {
            nama_lengkap: spouseData.nama_lengkap.trim(),
            tempat_lahir: (spouseData.tempat_lahir || '').trim(),
            tanggal_lahir: spouseData.tanggal_lahir || '',
            gender: spouseData.gender || 'P',
            alamat: (spouseData.alamat || '').trim(),
            pekerjaan: (spouseData.pekerjaan || '').trim(),
            no_hp: (spouseData.no_hp || '').trim()
          };
          trahStore.addSpouse(newPersonId, sanitizedSpouseData);
        }
        // Note: 'existing' mode removed since spouse is no longer a trah member

        resetForm();
        onSuccess(newPersonId);
      } else if (mode === 'edit' && editingPerson && editingPerson.id) {
        // Sanitize update data
        const sanitizedUpdates = {
          kode: (formData.kode || '').trim(),
          nama_lengkap: formData.nama_lengkap.trim(),
          tempat_lahir: (formData.tempat_lahir || '').trim(),
          tanggal_lahir: formData.tanggal_lahir || '',
          gender: formData.gender || 'L',
          alamat: (formData.alamat || '').trim(),
          pekerjaan: (formData.pekerjaan || '').trim(),
          no_hp: (formData.no_hp || '').trim()
        };

        trahStore.updatePerson(editingPerson.id, sanitizedUpdates);

        if (editingParents) {
          const currentParentIds = [];
          if (editingPerson.parent_id) currentParentIds.push(editingPerson.parent_id);
          if (editingPerson.parent2_id) currentParentIds.push(editingPerson.parent2_id);

          const newParentIds = selectedParentIds;

          const parentsChanged =
            currentParentIds.length !== newParentIds.length ||
            !currentParentIds.every(id => newParentIds.includes(id));

          if (parentsChanged) {
            trahStore.updateParents(editingPerson.id, newParentIds);
          }
        }

        // Handle spouse changes in edit mode
        if (spouseMode === 'new' && spouseData && spouseData.nama_lengkap && spouseData.nama_lengkap.trim()) {
          // User wants to add or update spouse
          const sanitizedSpouseData = {
            nama_lengkap: spouseData.nama_lengkap.trim(),
            tempat_lahir: (spouseData.tempat_lahir || '').trim(),
            tanggal_lahir: spouseData.tanggal_lahir || '',
            gender: spouseData.gender || 'P',
            alamat: (spouseData.alamat || '').trim(),
            pekerjaan: (spouseData.pekerjaan || '').trim(),
            no_hp: (spouseData.no_hp || '').trim()
          };

          // Remove old spouse if exists, then add new/updated one
          if (editingPerson.pasangan) {
            trahStore.removeSpouse(editingPerson.id);
          }
          trahStore.addSpouse(editingPerson.id, sanitizedSpouseData);
        } else if (spouseMode === 'none' && editingPerson.pasangan) {
          // User switched to 'none', remove existing spouse
          trahStore.removeSpouse(editingPerson.id);
        }

        onSuccess(editingPerson.id);
      }
    } catch (err) {
      errorMessage = err.message || 'Terjadi kesalahan';
      console.error('Form submission error:', err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="form-unified-trah" data-testid="person-form">
  <h3>{mode === 'create' ? 'Tambah Anggota Baru' : 'Edit Data Anggota'}</h3>

  {#if mode === 'create'}
    <p class="form-description">Isi form di bawah untuk menambahkan anggota baru ke dalam silsilah trah. Field bertanda * wajib diisi.</p>
  {:else}
    <p class="form-description">Edit informasi anggota trah. Anda juga bisa mengubah data pasangan di section relasi.</p>
  {/if}

  {#if errorMessage}
    <div class="error-message" data-testid="person-form-error">{errorMessage}</div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} data-testid="person-form-fields">
    <div class="form-section">
      <h4>Data Pribadi</h4>
      <p class="section-hint">Informasi dasar anggota trah</p>

      <div class="form-group">
        <label for="nama_lengkap">Nama Lengkap *</label>
        <input
          id="nama_lengkap" data-testid="pf-nama"
          type="text"
          bind:value={formData.nama_lengkap}
          placeholder="Nama lengkap"
          disabled={isSubmitting}
          required
        />
      </div>

      <div class="form-group">
        <label for="kode">Kode Anggota</label>
        <input
          id="kode" data-testid="pf-kode"
          type="text"
          bind:value={formData.kode}
          placeholder="Contoh: A1, A1P1, A1P1B1"
          disabled={isSubmitting}
        />
        <p class="hint-text"><strong>Kode hierarkis:</strong> A=Anak, P=Putu, B=Buyut, C=Canggah, W=Wareng. Contoh: A1P2 = anak pertama, putu kedua. Kosongkan jika ini adalah root/pendiri trah.</p>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="tempat_lahir">Tempat Lahir</label>
          <input
            id="tempat_lahir" data-testid="pf-tempat"
            type="text"
            bind:value={formData.tempat_lahir}
            placeholder="Tempat lahir"
            disabled={isSubmitting}
          />
        </div>

        <div class="form-group">
          <label for="tanggal_lahir">Tanggal Lahir</label>
          <input
            id="tanggal_lahir" data-testid="pf-tanggal"
            type="date"
            bind:value={formData.tanggal_lahir}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div class="form-group">
        <label for="gender">Jenis Kelamin</label>
        <select id="gender" data-testid="pf-gender" bind:value={formData.gender} disabled={isSubmitting}>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>

      <div class="form-group">
        <label for="alamat">Alamat</label>
        <textarea
          id="alamat" data-testid="pf-alamat"
          bind:value={formData.alamat}
          placeholder="Alamat lengkap"
          rows="2"
          disabled={isSubmitting}
        />
      </div>

      <div class="form-group">
        <label for="pekerjaan">Pekerjaan</label>
        <input
          id="pekerjaan" data-testid="pf-pekerjaan"
          type="text"
          bind:value={formData.pekerjaan}
          placeholder="Pekerjaan"
          disabled={isSubmitting}
        />
      </div>

      <div class="form-group">
        <label for="no_hp">Nomor Handphone</label>
        <input
          id="no_hp" data-testid="pf-no_hp"
          type="text"
          bind:value={formData.no_hp}
          placeholder="Contoh: 0812-3456-7890"
          disabled={isSubmitting}
        />
      </div>
    </div>

    {#if mode === 'create'}
      <div class="form-section relations">
        <h4>Relasi Keluarga (Opsional)</h4>
        <p class="hint">Anda bisa menambah atau mengubah relasi ini kapan saja setelah menyimpan anggota</p>

        <div class="form-group">
          <div class="section-label">Orang Tua (Maksimal 2)</div>
          {#if availableParents.length > 0}
            <div class="parent-selector" data-testid="parent-selector">
              {#each availableParents as person (person.id)}
                <button
                 type="button"
                 class="parent-option"
                 data-testid={"parent-option-" + person.id}
                  class:selected={selectedParentIds.includes(person.id)}
                  on:click={() => toggleParent(person.id)}
                  disabled={isSubmitting}
                >
                  {getPersonLabel(person)}
                </button>
              {/each}
            </div>
          {:else}
            <p class="info-text">Tidak ada anggota untuk dijadikan orang tua</p>
          {/if}
        </div>

        <div class="form-group">
          <div class="section-label">Pasangan (Opsional)</div>
          <p class="hint">Pasangan adalah orang dari luar trah - data disimpan sebagai keterangan saja, tidak dicatat sebagai anggota trah dan tidak memiliki kode</p>
          
          <div class="spouse-mode-selector">
            <label class="radio-option">
              <input
                type="radio"
                bind:group={spouseMode}
                value="none"
                disabled={isSubmitting}
              />
              Tidak ada pasangan
            </label>

            <label class="radio-option">
              <input
                type="radio"
                bind:group={spouseMode}
                value="new"
                disabled={isSubmitting}
              />
              Tambah pasangan baru
            </label>
          </div>
        </div>

        {#if spouseMode === 'new'}
          <div class="spouse-form" data-testid="spouse-form">
            <h5>Data Pasangan Baru</h5>
            <div class="form-group">
              <label for="spouse_nama">Nama Lengkap Pasangan *</label>
              <input
                id="spouse_nama" data-testid="spouse-nama"
                type="text"
                bind:value={spouseData.nama_lengkap}
                placeholder="Nama pasangan"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="spouse_tempat">Tempat Lahir</label>
                <input
                  id="spouse_tempat" data-testid="spouse-tempat"
                  type="text"
                  bind:value={spouseData.tempat_lahir}
                  placeholder="Tempat lahir"
                  disabled={isSubmitting}
                />
              </div>

              <div class="form-group">
                <label for="spouse_tgl">Tanggal Lahir</label>
                <input
                  id="spouse_tgl" data-testid="spouse-tanggal"
                  type="date"
                  bind:value={spouseData.tanggal_lahir}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="spouse_gender">Jenis Kelamin</label>
              <select
                id="spouse_gender"
                data-testid="spouse-gender"
                bind:value={spouseData.gender}
                disabled={isSubmitting}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div class="form-group">
              <label for="spouse_alamat">Alamat</label>
              <textarea
                id="spouse_alamat"
                bind:value={spouseData.alamat}
                placeholder="Alamat pasangan"
                rows="2"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-group">
              <label for="spouse_pekerjaan">Pekerjaan</label>
              <input
                id="spouse_pekerjaan"
                type="text"
                bind:value={spouseData.pekerjaan}
                placeholder="Pekerjaan pasangan"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-group">
              <label for="spouse_no_hp">Nomor Handphone</label>
              <input
                id="spouse_no_hp"
                data-testid="spouse-no_hp"
                type="text"
                bind:value={spouseData.no_hp}
                placeholder="Contoh: 0812-3456-7890"
                disabled={isSubmitting}
              />
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if mode === 'edit' && editingPerson && editingPerson.id}
      <div class="form-section relations">
        <h4>Relasi Keluarga</h4>
        <p class="section-hint">Informasi hubungan keluarga anggota ini</p>
        
        <div class="form-group">
          <div class="relation-header">
            <div class="section-label">Orang Tua</div>
            {#if !editingParents}
              <button type="button" class="btn-edit-small" on:click={() => editingParents = true}>
                Edit Orang Tua
              </button>
            {/if}
          </div>
          
          {#if editingParents}
            {#if availableParents.length > 0}
              <div class="parent-selector" data-testid="parent-selector-edit">
                {#each availableParents as person (person.id)}
                  <button
                    type="button"
                    class="parent-option"
                    data-testid={"parent-option-edit-" + person.id}
                    class:selected={selectedParentIds.includes(person.id)}
                    on:click={() => toggleParent(person.id)}
                    disabled={isSubmitting}
                  >
                    {getPersonLabel(person)}
                  </button>
                {/each}
              </div>
              <button type="button" class="btn-cancel-edit" on:click={() => { editingParents = false; loadPersonData(); }}>
                Batal Edit Orang Tua
              </button>
            {:else}
              <p class="info-text">Tidak ada anggota untuk dijadikan orang tua</p>
            {/if}
          {:else}
            {#if editingPerson.parent_id}
              {@const parent1 = persons.find(p => p.id === editingPerson.parent_id)}
              <div class="info-row">
                <span>{parent1 ? parent1.nama_lengkap : '-'}</span>
                {#if editingPerson.parent2_id}
                  {@const parent2 = persons.find(p => p.id === editingPerson.parent2_id)}
                  <span> & {parent2 ? parent2.nama_lengkap : '-'}</span>
                {/if}
              </div>
            {:else}
              <p class="info-text">Belum ada orang tua</p>
            {/if}
          {/if}
        </div>

        <div class="form-group">
          <div class="section-label">Pasangan (Opsional)</div>
          <p class="hint">Pasangan adalah orang dari luar trah - data disimpan sebagai keterangan saja, tidak dicatat sebagai anggota trah dan tidak memiliki kode</p>

          <div class="spouse-mode-selector">
            <label class="radio-option">
              <input
                type="radio"
                bind:group={spouseMode}
                value="none"
                disabled={isSubmitting}
              />
              Tidak ada pasangan
            </label>

            <label class="radio-option">
              <input
                type="radio"
                bind:group={spouseMode}
                value="new"
                disabled={isSubmitting}
              />
              {editingPerson.pasangan ? 'Edit pasangan' : 'Tambah pasangan baru'}
            </label>
          </div>
        </div>

        {#if spouseMode === 'new'}
          <div class="spouse-form" data-testid="spouse-form-edit">
            <h5>Data Pasangan</h5>
            <div class="form-group">
              <label for="spouse_nama_edit">Nama Lengkap Pasangan *</label>
              <input
                id="spouse_nama_edit" data-testid="spouse-nama-edit"
                type="text"
                bind:value={spouseData.nama_lengkap}
                placeholder="Nama pasangan"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="spouse_tempat_edit">Tempat Lahir</label>
                <input
                  id="spouse_tempat_edit" data-testid="spouse-tempat-edit"
                  type="text"
                  bind:value={spouseData.tempat_lahir}
                  placeholder="Tempat lahir"
                  disabled={isSubmitting}
                />
              </div>

              <div class="form-group">
                <label for="spouse_tgl_edit">Tanggal Lahir</label>
                <input
                  id="spouse_tgl_edit" data-testid="spouse-tanggal-edit"
                  type="date"
                  bind:value={spouseData.tanggal_lahir}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="spouse_gender_edit">Jenis Kelamin</label>
              <select
                id="spouse_gender_edit"
                data-testid="spouse-gender-edit"
                bind:value={spouseData.gender}
                disabled={isSubmitting}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div class="form-group">
              <label for="spouse_alamat_edit">Alamat</label>
              <textarea
                id="spouse_alamat_edit"
                bind:value={spouseData.alamat}
                placeholder="Alamat pasangan"
                rows="2"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-group">
              <label for="spouse_pekerjaan_edit">Pekerjaan</label>
              <input
                id="spouse_pekerjaan_edit"
                type="text"
                bind:value={spouseData.pekerjaan}
                placeholder="Pekerjaan pasangan"
                disabled={isSubmitting}
              />
            </div>

            <div class="form-group">
              <label for="spouse_no_hp_edit">Nomor Handphone</label>
              <input
                id="spouse_no_hp_edit"
                data-testid="spouse-no_hp-edit"
                type="text"
                bind:value={spouseData.no_hp}
                placeholder="Contoh: 0812-3456-7890"
                disabled={isSubmitting}
              />
            </div>
          </div>
        {/if}

        {#if editingPerson.children_ids && editingPerson.children_ids.length > 0}
          <div class="form-group">
            <div class="section-label">Anak</div>
            <div class="info-row">
              <span>{editingPerson.children_ids.length} orang</span>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="form-actions" data-testid="form-actions">
      <button type="button" class="btn-secondary" data-testid="btn-cancel-person" on:click={handleCancel} disabled={isSubmitting}>
        Batal
      </button>
      <button type="submit" class="btn-primary" data-testid="btn-save-person" disabled={isSubmitting}>
        {isSubmitting ? 'Menyimpan...' : mode === 'create' ? 'Simpan' : 'Update'}
      </button>
    </div>
  </form>
</div>

<style>
  .form-unified-trah {
    padding: 1.5rem;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.4rem;
    font-weight: 600;
  }

  .form-description {
    color: #666;
    font-size: 0.9rem;
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
    background: #f0f9ff;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    border-left: 3px solid #667eea;
  }

  h4 {
    margin: 0 0 0.5rem 0;
    color: #444;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .section-hint {
    color: #666;
    font-size: 0.85rem;
    margin: -0.25rem 0 1rem 0;
    font-style: italic;
  }

  h5 {
    margin: 0 0 0.75rem 0;
    color: #555;
    font-size: 1rem;
    font-weight: 600;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    border: 1px solid #fcc;
    font-size: 0.9rem;
  }

  .form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .form-section.relations {
    border-top: 2px solid #e5e7eb;
    padding-top: 1.5rem;
  }

  .form-section.info-section {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 6px;
  }

  .hint {
    color: #6b7280;
    font-size: 0.85rem;
    margin: -0.5rem 0 1rem 0;
    font-style: italic;
  }

  .hint-text {
    color: #6b7280;
    font-size: 0.8rem;
    margin: 0.3rem 0 0 0;
    font-style: italic;
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
    margin-bottom: 0.4rem;
    font-weight: 500;
    color: #374151;
    font-size: 0.9rem;
  }

  input[type="text"],
  input[type="date"],
  select,
  textarea {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  input[type="text"]:focus,
  input[type="date"]:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  textarea {
    resize: vertical;
  }

  .parent-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background: #f9fafb;
  }

  .parent-option {
    padding: 0.6rem 0.8rem;
    background: white;
    border: 2px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .parent-option:hover:not(:disabled) {
    border-color: #9ca3af;
    background: #f3f4f6;
  }

  .parent-option.selected {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .parent-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spouse-form {
    margin-top: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .info-text {
    color: #6b7280;
    font-size: 0.9rem;
    margin: 0;
  }

  .info-row {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .info-label {
    font-weight: 600;
    color: #374151;
    margin-right: 0.5rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  button {
    padding: 0.6rem 1.5rem;
    border-radius: 4px;
    font-size: 0.95rem;
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
    background: #667eea;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5568d3;
  }

  .btn-secondary {
    background: #9ca3af;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #6b7280;
  }

  input[type="checkbox"] {
    width: auto;
    margin-right: 0.5rem;
  }

  .relation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .section-label {
    font-weight: 600;
    color: #374151;
    font-size: 0.95rem;
  }

  .btn-edit-small {
    padding: 0.4rem 0.8rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-edit-small:hover {
    background: #5568d3;
  }

  .btn-cancel-edit {
    margin-top: 0.5rem;
    padding: 0.4rem 0.8rem;
    background: #9ca3af;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-cancel-edit:hover {
    background: #6b7280;
  }

  .spouse-mode-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    cursor: pointer;
  }

  .radio-option input[type="radio"] {
    margin-right: 0.5rem;
    cursor: pointer;
  }

  .spouse-selector-box {
    margin-top: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .spouse-selector-box label {
    display: block;
    margin-bottom: 0.5rem;
  }

  .spouse-selector-box select {
    width: 100%;
  }

  /* Spouse Edit Section */
  .spouse-action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-delete-small {
    padding: 0.4rem 0.8rem;
    background: #d32f2f;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-delete-small:hover {
    background: #b71c1c;
  }

  .spouse-edit-section {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    margin-top: 0.75rem;
  }

  .spouse-info-view {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 6px;
    margin-top: 0.75rem;
  }

  .spouse-edit-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn-primary-small {
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary-small:hover {
    background: #5568d3;
  }

</style>
