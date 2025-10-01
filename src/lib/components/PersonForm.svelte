<script>
  import {
    currentFamily,
    filteredPersons,
    orangList,
    hubunganList,
    unionList,
    searchQuery,
    genderFilter,
    selectedPerson,
    selectedPersonId,
    lineagePreference,
    keluargaStore,
    computeDescendantBuckets
  } from '../stores/keluarga.js';
  import { get } from 'svelte/store';

  const genderOptions = [
    { value: 'semua', label: 'Semua' },
    { value: 'L', label: 'Laki-laki' },
    { value: 'P', label: 'Perempuan' },
    { value: 'unknown', label: 'Tidak diketahui' }
  ];

  let showForm = false;
  let formMode = 'create';
  let formData = createEmptyForm();
  let errorMessage = '';

  function createEmptyForm() {
    return {
      nama_lengkap: '',
      nama_alias: '',
      gender: 'unknown',
      tempat_lahir: '',
      tanggal_lahir: '',
      alamat: '',
      pekerjaan_sekolah: '',
      catatan: '',
      foto_path: '',
      status_hidup: 'hidup',
      tanggal_wafat: ''
    };
  }

  function openCreateForm() {
    formMode = 'create';
    formData = createEmptyForm();
    showForm = true;
    errorMessage = '';
  }

  function openEditForm(person) {
    formMode = 'edit';
    formData = {
      nama_lengkap: person.nama_lengkap,
      nama_alias: person.nama_alias || '',
      gender: person.gender || 'unknown',
      tempat_lahir: person.tempat_lahir || '',
      tanggal_lahir: person.tanggal_lahir || '',
      alamat: person.alamat || '',
      pekerjaan_sekolah: person.pekerjaan_sekolah || '',
      catatan: person.catatan || '',
      foto_path: person.foto_path || '',
      status_hidup: person.status_hidup || 'hidup',
      tanggal_wafat: person.tanggal_wafat || ''
    };
    showForm = true;
    errorMessage = '';
  }

  function closeForm() {
    showForm = false;
  }

  function handleSubmit() {
    try {
      if (!formData.nama_lengkap.trim()) {
        errorMessage = 'Nama lengkap wajib diisi';
        return;
      }

      if (formMode === 'create') {
        keluargaStore.createPerson(formData);
      } else if (formMode === 'edit') {
        const personId = get(selectedPersonId);
        keluargaStore.updatePerson(personId, formData);
      }
      showForm = false;
    } catch (error) {
      console.error('Gagal menyimpan data:', error);
      errorMessage = error.message || 'Terjadi kesalahan';
    }
  }

  function handleDelete(personId) {
    if (confirm('Hapus data anggota ini? Seluruh relasi terkait juga akan dihapus.')) {
      keluargaStore.deletePerson(personId);
    }
  }

  function handleSetRoot(personId) {
    keluargaStore.setRoot(personId);
  }

  function handleRebuild() {
    try {
      keluargaStore.rebuildLineage();
      alert('Kode silsilah berhasil diperbarui.');
    } catch (error) {
      alert(error.message || 'Gagal melakukan rebuild.');
    }
  }

  function handlePreferenceChange(event) {
    keluargaStore.setLineagePreference(event.target.value);
  }

  $: personMap = new Map($orangList.map((p) => [p.id, p]));

  $: detail = (() => {
    if (!$selectedPerson) return null;

    const person = $selectedPerson;

    const parents = $hubunganList
      .filter((relation) => relation.child_id === person.id)
      .map((relation) => ({
        relation,
        person: personMap.get(relation.parent_id)
      }))
      .filter((entry) => entry.person);

    const childRelations = $hubunganList
      .filter((relation) => relation.parent_id === person.id)
      .map((relation) => ({
        relation,
        child: personMap.get(relation.child_id)
      }))
      .filter((entry) => entry.child)
      .sort((a, b) => a.relation.birth_order - b.relation.birth_order);

    const unionMap = new Map($unionList.map((u) => [u.id, u]));
    const groupedMap = new Map();
    const solo = [];

    childRelations.forEach((entry) => {
      const unionId = entry.relation.union_id;
      if (!unionId) {
        solo.push(entry);
        return;
      }
      if (!groupedMap.has(unionId)) {
        groupedMap.set(unionId, {
          union: unionMap.get(unionId),
          children: []
        });
      }
      groupedMap.get(unionId).children.push(entry);
    });

    const descendants = computeDescendantBuckets(person.id);

    return {
      person,
      parents,
      groupedChildren: Array.from(groupedMap.values()),
      singleChildren: solo,
      descendants
    };
  })();

  function formatDate(dateString) {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID');
    } catch (error) {
      return dateString;
    }
  }

  const descendantLabels = [
    { key: 'anak', label: 'Anak' },
    { key: 'cucu', label: 'Cucu' },
    { key: 'buyut', label: 'Buyut' },
    { key: 'canggah', label: 'Canggah' },
    { key: 'wareng', label: 'Wareng' },
    { key: 'udhek', label: 'Udhek' },
    { key: 'lainnya', label: 'Gen 7+' }
  ];
</script>

{#if !$currentFamily}
  <div class="empty-state">
    <h2>Pilih Keluarga Terlebih Dahulu</h2>
    <p>Gunakan tab "Keluarga" untuk membuat atau memilih keluarga.</p>
  </div>
{:else}
  <div class="person-layout">
    <aside class="list-panel">
      <div class="list-header">
        <h2>Anggota</h2>
        <button class="btn-primary" on:click={openCreateForm}>+ Anggota</button>
      </div>
      <div class="filters">
        <input
          type="search"
          placeholder="Cari nama atau kode..."
          bind:value={$searchQuery}
        />
        <select bind:value={$genderFilter}>
          {#each genderOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      <ul class="person-list">
        {#each $filteredPersons as person}
          <li class:selected={$selectedPerson && $selectedPerson.id === person.id}>
            <button
              type="button"
              class="person-button"
              on:click={() => selectedPersonId.set(person.id)}
            >
              <span class="person-name">{person.nama_lengkap}</span>
              <span class="person-meta">
                <span>{person.lineage_code || '–'}</span>
                <span>{person.gender === 'L' ? 'L' : person.gender === 'P' ? 'P' : '?'}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <section class="detail-panel">
      {#if detail}
        <header class="detail-header">
          <div>
            <h2>{detail.person.nama_lengkap}</h2>
            {#if detail.person.nama_alias}
              <p class="alias">"{detail.person.nama_alias}"</p>
            {/if}
            <div class="tag-row">
              <span class="tag">Kode: {detail.person.lineage_code || 'Belum dihitung'}</span>
              <span class="tag">Status: {detail.person.status_hidup === 'wafat' ? 'Almarhum/ah' : 'Hidup'}</span>
            </div>
            {#if detail.person.foto_path}
              <p class="small">Foto: {detail.person.foto_path}</p>
            {/if}
          </div>
          <div class="detail-actions">
            <button class="btn-secondary" on:click={() => openEditForm(detail.person)}>Edit Data</button>
            <button class="btn-secondary" on:click={() => handleSetRoot(detail.person.id)}>Set Root</button>
            <button class="btn-danger" on:click={() => handleDelete(detail.person.id)}>Hapus</button>
          </div>
        </header>

        <section class="info-grid">
          <div>
            <span class="label">Tempat lahir</span>
            <span class="value">{detail.person.tempat_lahir || '-'}</span>
          </div>
          <div>
            <span class="label">Tanggal lahir</span>
            <span class="value">{formatDate(detail.person.tanggal_lahir)}</span>
          </div>
          <div>
            <span class="label">Tanggal wafat</span>
            <span class="value">{detail.person.status_hidup === 'wafat' ? formatDate(detail.person.tanggal_wafat) : '-'}</span>
          </div>
          <div>
            <span class="label">Alamat</span>
            <span class="value">{detail.person.alamat || '-'}</span>
          </div>
          <div>
            <span class="label">Pekerjaan / Sekolah</span>
            <span class="value">{detail.person.pekerjaan_sekolah || '-'}</span>
          </div>
          <div>
            <span class="label">Catatan</span>
            <span class="value">{detail.person.catatan || '-'}</span>
          </div>
        </section>

        <section class="relations">
          <div class="relation-block">
            <h3>Orang Tua</h3>
            {#if detail.parents.length === 0}
              <p class="empty">Belum ada data orang tua.</p>
            {:else}
              <ul>
                {#each detail.parents as parent}
                  <li>
                    <strong>{parent.person.nama_lengkap}</strong>
                    <span class="meta">(Relasi: {parent.relation.jenis})</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <div class="relation-block">
            <h3>Pasangan & Anak</h3>
            {#if detail.groupedChildren.length === 0 && detail.singleChildren.length === 0}
              <p class="empty">Belum ada pasangan atau anak yang terdaftar.</p>
            {/if}

            {#each detail.groupedChildren as group}
              <div class="union-group">
                <div class="union-header">
                  <strong>Pasangan:</strong>
                  <span>
                    {#if group.union}
                      {#if group.union.partner1_id === detail.person.id}
                        {personMap.get(group.union.partner2_id)?.nama_lengkap || '—'}
                      {:else}
                        {personMap.get(group.union.partner1_id)?.nama_lengkap || '—'}
                      {/if}
                    {:else}
                      Pasangan tidak ditemukan
                    {/if}
                  </span>
                </div>
                <ul>
                  {#each group.children as childEntry}
                    <li>
                      <span class="order">#{childEntry.relation.birth_order}</span>
                      <span>{childEntry.child.nama_lengkap}</span>
                      <span class="meta">Kode: {childEntry.child.lineage_code || '-'}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}

            {#if detail.singleChildren.length > 0}
              <div class="union-group">
                <div class="union-header">
                  <strong>Anak tanpa data pasangan</strong>
                </div>
                <ul>
                  {#each detail.singleChildren as childEntry}
                    <li>
                      <span class="order">#{childEntry.relation.birth_order}</span>
                      <span>{childEntry.child.nama_lengkap}</span>
                      <span class="meta">Kode: {childEntry.child.lineage_code || '-'}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </section>

        <section class="descendants">
          <h3>Ringkasan Keturunan</h3>
          <div class="badge-row">
            {#each descendantLabels as item}
              <div class="badge">
                <span class="badge-count">{detail.descendants[item.key].length}</span>
                <span class="badge-label">{item.label}</span>
              </div>
            {/each}
          </div>
          <details>
            <summary>Lihat daftar keturunan berjenjang</summary>
            {#each descendantLabels as item}
              {#if detail.descendants[item.key].length > 0}
                <div class="descendant-block">
                  <h4>{item.label}</h4>
                  <ul>
                    {#each detail.descendants[item.key] as person}
                      <li>{person.nama_lengkap} <span class="meta">({person.lineage_code})</span></li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/each}
          </details>
        </section>

        <section class="lineage-tools">
          <h3>Pengaturan Silsilah</h3>
          <div class="tool-row">
            <div>
              <label for="lineage-preference">Preferensi jalur kode:</label>
              <select id="lineage-preference" bind:value={$lineagePreference} on:change={handlePreferenceChange}>
                <option value="matrilineal">Matrilineal (ibu lebih dulu)</option>
                <option value="patrilineal">Patrilineal (ayah lebih dulu)</option>
              </select>
            </div>
            <button class="btn-primary" on:click={handleRebuild}>Rebuild Kode</button>
          </div>
        </section>
      {:else}
        <div class="empty-detail">
          <p>Pilih seorang anggota dari daftar untuk melihat detail.</p>
        </div>
      {/if}
    </section>
  </div>
{/if}

{#if showForm}
  <div
    class="modal-overlay"
    role="presentation"
    tabindex="-1"
    on:click={(event) => {
      if (event.target === event.currentTarget) closeForm();
    }}
    on:keydown={(event) => event.key === 'Escape' && closeForm()}
  >
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>{formMode === 'create' ? 'Tambah Anggota' : 'Edit Anggota'}</h3>
        <button class="btn-close" on:click={closeForm}>×</button>
      </div>
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-grid">
          <div class="form-group">
            <label for="nama_lengkap">Nama Lengkap *</label>
            <input id="nama_lengkap" type="text" bind:value={formData.nama_lengkap} required />
          </div>
          <div class="form-group">
            <label for="nama_alias">Nama Panggilan/Alias</label>
            <input id="nama_alias" type="text" bind:value={formData.nama_alias} />
          </div>
          <div class="form-group">
            <label for="gender">Jenis Kelamin</label>
            <select id="gender" bind:value={formData.gender}>
              <option value="unknown">Tidak diketahui</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" bind:value={formData.status_hidup}>
              <option value="hidup">Hidup</option>
              <option value="wafat">Wafat</option>
            </select>
          </div>
          <div class="form-group">
            <label for="tempat_lahir">Tempat Lahir</label>
            <input id="tempat_lahir" type="text" bind:value={formData.tempat_lahir} />
          </div>
          <div class="form-group">
            <label for="tanggal_lahir">Tanggal Lahir</label>
            <input id="tanggal_lahir" type="date" bind:value={formData.tanggal_lahir} />
          </div>
          {#if formData.status_hidup === 'wafat'}
            <div class="form-group">
              <label for="tanggal_wafat">Tanggal Wafat</label>
              <input id="tanggal_wafat" type="date" bind:value={formData.tanggal_wafat} />
            </div>
          {/if}
          <div class="form-group">
            <label for="alamat">Alamat</label>
            <textarea id="alamat" rows="2" bind:value={formData.alamat}></textarea>
          </div>
          <div class="form-group">
            <label for="pekerjaan">Pekerjaan / Sekolah</label>
            <input id="pekerjaan" type="text" bind:value={formData.pekerjaan_sekolah} />
          </div>
          <div class="form-group full-width">
            <label for="foto">Foto (path lokal)</label>
            <input id="foto" type="text" bind:value={formData.foto_path} placeholder="Contoh: C:\\foto\\suyati.jpg" />
          </div>
          <div class="form-group full-width">
            <label for="catatan">Catatan</label>
            <textarea id="catatan" rows="3" bind:value={formData.catatan}></textarea>
          </div>
        </div>
        {#if errorMessage}
          <p class="error">{errorMessage}</p>
        {/if}
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={closeForm}>Batal</button>
          <button type="submit" class="btn-primary">Simpan</button>
        </div>
      </form>
    </div>
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

  .person-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
  }

  .list-panel {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    max-height: calc(100vh - 220px);
    position: sticky;
    top: 120px;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filters input,
  .filters select {
    padding: 0.6rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
  }

  .person-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
  }

  .person-list li {
    list-style: none;
  }

  .person-button {
    width: 100%;
    background: #f7f8ff;
    border: none;
    border-radius: 8px;
    padding: 0.65rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font: inherit;
  }

  .person-list li.selected .person-button {
    background: #667eea;
    color: #fff;
  }

  .person-name {
    font-weight: 600;
  }

  .person-meta {
    font-size: 0.8rem;
    opacity: 0.8;
    display: flex;
    gap: 0.5rem;
  }

  .person-list li.selected .person-meta span {
    color: inherit;
  }

  .detail-panel {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .detail-header h2 {
    margin: 0;
  }

  .alias {
    margin: 0.25rem 0;
    color: #6b7280;
    font-style: italic;
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .tag {
    background: #f3f4f6;
    color: #111827;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.85rem;
  }

  .detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .label {
    display: block;
    font-size: 0.8rem;
    color: #6b7280;
  }

  .value {
    font-weight: 600;
    color: #1f2937;
  }

  .relations {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .relation-block {
    background: #f9fafb;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .relation-block ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .union-group {
    background: white;
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }

  .union-header {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    margin-bottom: 0.5rem;
  }

  .union-group li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .order {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e0e7ff;
    color: #312e81;
    font-weight: 600;
  }

  .meta {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .empty {
    color: #6b7280;
    font-style: italic;
  }

  .descendants {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .badge {
    background: #eef2ff;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    text-align: center;
    min-width: 90px;
  }

  .badge-count {
    display: block;
    font-size: 1.4rem;
    font-weight: 700;
    color: #4338ca;
  }

  .badge-label {
    font-size: 0.85rem;
    color: #3730a3;
  }

  details {
    background: #f9fafb;
    border-radius: 12px;
    padding: 1rem;
  }

  summary {
    cursor: pointer;
    font-weight: 600;
  }

  .descendant-block {
    margin-top: 0.75rem;
  }

  .descendant-block ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .lineage-tools {
    background: #f9fafb;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .tool-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  select {
    padding: 0.6rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1rem;
    cursor: pointer;
    font-weight: 600;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #111827;
  }

  .btn-danger {
    background: #f87171;
    color: white;
  }

  .empty-detail {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 1.5rem;
    padding-top: 2rem;
    z-index: 20;
    overflow-y: auto;
  }

  .modal {
    background: white;
    border-radius: 12px;
    width: min(640px, 100%);
    max-height: none;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .btn-close {
    border: none;
    background: transparent;
    font-size: 1.6rem;
    cursor: pointer;
  }

  form {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-group.full-width {
    grid-column: span 2;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    padding: 0.65rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .error {
    color: #b91c1c;
    font-weight: 600;
  }

  @media (max-width: 960px) {
    .person-layout {
      grid-template-columns: 1fr;
    }

    .list-panel {
      position: static;
      max-height: none;
    }
  }

  @media (max-width: 640px) {
    .detail-actions {
      flex-direction: column;
    }

    .tool-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full-width {
      grid-column: span 1;
    }
  }
</style>
