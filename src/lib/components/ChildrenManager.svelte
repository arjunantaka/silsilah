<script>
  import { orangList, hubunganList } from '../stores/keluarga.js';

  export let currentPersonId = null;
  export let disabled = false;

  $: existingChildren = currentPersonId ? getChildrenForPerson(currentPersonId) : [];

  function getChildrenForPerson(personId) {
    const childRelations = $hubunganList.filter(r => r.parent_id === personId);
    return childRelations.map(rel => {
      const child = $orangList.find(p => p.id === rel.child_id);
      return {
        ...child,
        relationId: rel.id,
        birthOrder: rel.birth_order
      };
    }).filter(c => c.id);
  }
</script>

<div class="children-manager">
  <label>Anak</label>

  {#if existingChildren.length > 0}
    <div class="children-list">
      {#each existingChildren as child}
        <div class="child-item">
          <div class="child-info">
            <span class="child-name">{child.nama_lengkap}</span>
            {#if child.birthOrder}
              <span class="birth-order">Anak ke-{child.birthOrder}</span>
            {/if}
            {#if child.lineage_code}
              <span class="lineage-code">({child.lineage_code})</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="no-children">
      <p>Belum ada data anak. Tambahkan melalui form "Tambah Anggota" dengan memilih orang ini sebagai orang tua.</p>
    </div>
  {/if}
</div>

<style>
  .children-manager {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 500;
    color: #333;
    font-size: 0.95rem;
  }

  .children-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .child-item {
    padding: 0.65rem;
    background: #e8f5e9;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .child-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .child-name {
    font-weight: 500;
  }

  .birth-order {
    font-size: 0.85rem;
    color: #666;
    background: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
  }

  .lineage-code {
    font-size: 0.85rem;
    color: #2196F3;
  }

  .no-children {
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
    border: 1px dashed #ddd;
    text-align: center;
  }

  .no-children p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
  }
</style>
