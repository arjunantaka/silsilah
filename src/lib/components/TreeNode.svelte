<script>
  import { createEventDispatcher } from 'svelte';
  
  export let node;
  export let persons;
  export let selectedPersonId;
  
  const dispatch = createEventDispatcher();
  
  let expanded = true;
  
  $: person = node.person;
  $: hasChildren = node.children.length > 0;
  $: isSelected = person.id === selectedPersonId;
  
  function toggleExpand() {
    expanded = !expanded;
  }
  
  function handleClick() {
    dispatch('select', person.id);
  }
  
  function getSpouseName() {
    if (!person.pasangan_id) return null;
    const spouse = persons.find(p => p.id === person.pasangan_id);
    return spouse ? spouse.nama_lengkap : null;
  }
</script>

<div class="tree-node" data-testid={"tree-node-" + person.id} style="margin-left: {node.depth * 2}rem">
  <div class="node-content" data-testid={"tree-node-content-" + person.id} class:selected={isSelected} on:click={handleClick} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleClick()}>
    {#if hasChildren}
      <button class="toggle-btn" data-testid={"toggle-node-" + person.id} on:click|stopPropagation={toggleExpand}>
        {expanded ? '▼' : '▶'}
      </button>
    {:else}
      <span class="toggle-spacer"></span>
    {/if}
    
    <div class="person-info">
      <span class="kode">{person.kode || 'ROOT'}</span>
      <span class="nama">{person.nama_lengkap}</span>
      {#if person.pasangan_id}
        <span class="spouse">& {getSpouseName()}</span>
      {/if}
    </div>
  </div>
  
  {#if expanded && hasChildren}
    <div class="children">
      {#each node.children as child (child.person.id)}
        <svelte:self node={child} {persons} {selectedPersonId} on:select />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tree-node {
    margin: 0.25rem 0;
  }
  
  .node-content {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .node-content:hover {
    background: #f5f5f5;
    border-color: #4CAF50;
  }
  
  .node-content.selected {
    background: #e8f5e9;
    border-color: #4CAF50;
    border-width: 2px;
  }
  
  .toggle-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.75rem;
    color: #666;
  }
  
  .toggle-spacer {
    width: 24px;
    display: inline-block;
  }
  
  .person-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }
  
  .kode {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #2196F3;
    color: white;
    border-radius: 3px;
    font-weight: 600;
    font-size: 0.85rem;
    min-width: 50px;
    text-align: center;
  }
  
  .nama {
    font-weight: 500;
    font-size: 0.95rem;
  }
  
  .spouse {
    color: #666;
    font-size: 0.9rem;
    font-style: italic;
  }
  
  .children {
    margin-left: 1rem;
    border-left: 2px solid #e0e0e0;
    padding-left: 0.5rem;
  }
</style>
