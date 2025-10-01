<script>
  import { orangList, unionList } from '../stores/keluarga.js';

  export let selectedSpouseId = null;
  export let currentPersonId = null;
  export let disabled = false;

  $: availableSpouses = $orangList.filter(p => 
    p.id !== currentPersonId
  );

  $: existingUnion = currentPersonId ? findExistingUnion(currentPersonId) : null;
  $: selectedSpouse = selectedSpouseId ? $orangList.find(p => p.id === selectedSpouseId) : null;

  function findExistingUnion(personId) {
    return $unionList.find(u => 
      u.person1_id === personId || u.person2_id === personId
    );
  }

  function handleSelectSpouse(event) {
    const spouseId = parseInt(event.target.value);
    selectedSpouseId = spouseId || null;
  }

  function clearSpouse() {
    selectedSpouseId = null;
  }
</script>

<div class="spouse-selector">
  <label>Pasangan</label>

  {#if existingUnion}
    <div class="existing-union">
      {#if existingUnion.person1_id === currentPersonId}
        {#if existingUnion.person2_id}
          {@const spouse = $orangList.find(p => p.id === existingUnion.person2_id)}
          {#if spouse}
            <div class="spouse-info">
              <span>{spouse.nama_lengkap}</span>
              <span class="union-date">
                {#if existingUnion.tanggal_pernikahan}
                  Menikah: {new Date(existingUnion.tanggal_pernikahan).toLocaleDateString('id-ID')}
                {/if}
              </span>
            </div>
          {/if}
        {/if}
      {:else if existingUnion.person2_id === currentPersonId}
        {#if existingUnion.person1_id}
          {@const spouse = $orangList.find(p => p.id === existingUnion.person1_id)}
          {#if spouse}
            <div class="spouse-info">
              <span>{spouse.nama_lengkap}</span>
              <span class="union-date">
                {#if existingUnion.tanggal_pernikahan}
                  Menikah: {new Date(existingUnion.tanggal_pernikahan).toLocaleDateString('id-ID')}
                {/if}
              </span>
            </div>
          {/if}
        {/if}
      {/if}
      <p class="hint">Sudah memiliki data pernikahan. Edit di menu Relasi untuk mengubah.</p>
    </div>
  {:else}
    {#if selectedSpouse}
      <div class="selected-spouse">
        <div class="spouse-item">
          <span>{selectedSpouse.nama_lengkap}</span>
          {#if !disabled}
            <button 
              type="button" 
              class="remove-btn"
              on:click={clearSpouse}
            >×</button>
          {/if}
        </div>
      </div>
    {/if}

    {#if !disabled}
      <select 
        on:change={handleSelectSpouse} 
        value={selectedSpouseId || ''}
        disabled={disabled}
      >
        <option value="">Pilih pasangan...</option>
        {#each availableSpouses as person}
          <option value={person.id}>
            {person.nama_lengkap} {person.lineage_code ? `(${person.lineage_code})` : ''}
          </option>
        {/each}
      </select>
    {/if}

    <p class="hint">Opsional. Bisa ditambahkan nanti melalui menu Relasi.</p>
  {/if}
</div>

<style>
  .spouse-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 500;
    color: #333;
    font-size: 0.95rem;
  }

  .existing-union,
  .selected-spouse {
    padding: 0.75rem;
    background: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .spouse-info,
  .spouse-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    background: #fff3e0;
    border-radius: 4px;
  }

  .spouse-item {
    background: #e8f5e9;
  }

  .union-date {
    font-size: 0.85rem;
    color: #666;
    margin-left: 0.5rem;
  }

  .remove-btn {
    background: #f44336;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-btn:hover {
    background: #d32f2f;
  }

  select {
    width: 100%;
    padding: 0.65rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
    font-family: inherit;
  }

  select:focus {
    outline: none;
    border-color: #4CAF50;
  }

  select:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .hint {
    font-size: 0.85rem;
    color: #666;
    margin: 0.5rem 0 0 0;
  }
</style>
