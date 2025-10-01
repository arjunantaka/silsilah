<script>
  import { orangList, unionList, hubunganList } from '../stores/keluarga.js';

  export let selectedParentIds = [];
  export let currentPersonId = null;
  export let disabled = false;

  $: availableParents = $orangList.filter(p => 
    p.id !== currentPersonId
  );

  $: parentsByUnion = groupParentsByUnion();

  function groupParentsByUnion() {
    const groups = [];
    const usedParents = new Set();

    $unionList.forEach(union => {
      const hasParent1 = union.person1_id && selectedParentIds.includes(union.person1_id);
      const hasParent2 = union.person2_id && selectedParentIds.includes(union.person2_id);
      
      if (hasParent1 || hasParent2) {
        const parent1 = $orangList.find(p => p.id === union.person1_id);
        const parent2 = $orangList.find(p => p.id === union.person2_id);
        
        groups.push({
          unionId: union.id,
          parent1: hasParent1 ? parent1 : null,
          parent2: hasParent2 ? parent2 : null
        });
        
        if (hasParent1) usedParents.add(union.person1_id);
        if (hasParent2) usedParents.add(union.person2_id);
      }
    });

    selectedParentIds.forEach(parentId => {
      if (!usedParents.has(parentId)) {
        const parent = $orangList.find(p => p.id === parentId);
        if (parent) {
          groups.push({
            unionId: null,
            parent1: parent,
            parent2: null
          });
        }
      }
    });

    return groups;
  }

  function handleSelectParent(event) {
    const parentId = parseInt(event.target.value);
    if (!parentId) return;
    
    if (!selectedParentIds.includes(parentId)) {
      selectedParentIds = [...selectedParentIds, parentId];
    }
    
    event.target.value = '';
  }

  function removeParent(parentId) {
    selectedParentIds = selectedParentIds.filter(id => id !== parentId);
  }
</script>

<div class="parent-selector">
  <label>Orang Tua</label>
  
  {#if parentsByUnion.length > 0}
    <div class="selected-parents">
      {#each parentsByUnion as group}
        <div class="parent-group">
          {#if group.parent1}
            <div class="parent-item">
              <span>{group.parent1.nama_lengkap}</span>
              {#if !disabled}
                <button 
                  type="button" 
                  class="remove-btn"
                  on:click={() => removeParent(group.parent1.id)}
                >×</button>
              {/if}
            </div>
          {/if}
          
          {#if group.parent2}
            <div class="parent-item">
              <span>{group.parent2.nama_lengkap}</span>
              {#if !disabled}
                <button 
                  type="button" 
                  class="remove-btn"
                  on:click={() => removeParent(group.parent2.id)}
                >×</button>
              {/if}
            </div>
          {/if}
          
          {#if group.unionId}
            <span class="union-badge">Pernikahan</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if !disabled}
    <select on:change={handleSelectParent} disabled={disabled}>
      <option value="">Pilih orang tua...</option>
      {#each availableParents as person}
        <option value={person.id}>
          {person.nama_lengkap} {person.lineage_code ? `(${person.lineage_code})` : ''}
        </option>
      {/each}
    </select>
  {/if}

  <p class="hint">Bisa memilih 1 atau 2 orang tua. Jika sudah ada pernikahan akan otomatis terdeteksi.</p>
</div>

<style>
  .parent-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 500;
    color: #333;
    font-size: 0.95rem;
  }

  .selected-parents {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .parent-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
  }

  .parent-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    background: #e3f2fd;
    border-radius: 4px;
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

  .union-badge {
    font-size: 0.85rem;
    color: #666;
    font-style: italic;
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
    margin: 0;
  }
</style>
