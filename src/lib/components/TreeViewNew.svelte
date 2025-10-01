<script>
  import { trahStore } from '../stores/trah.js';
  import { getChildren } from '../stores/trah.js';
  import TreeNode from './TreeNode.svelte';

  export let selectedPersonId = null;

  $: persons = $trahStore.persons;
  $: rootPerson = persons.find(p => p.is_root);

  function renderTree(person, depth = 0) {
    return {
      person,
      depth,
      children: getChildren(persons, person.id).map(child => renderTree(child, depth + 1))
    };
  }

  $: tree = rootPerson ? renderTree(rootPerson) : null;

  function handleSelectPerson(personId) {
    selectedPersonId = personId;
  }
</script>

<div class="tree-view" data-testid="tree-root">
  {#if tree}
    <div class="tree-container" data-testid="tree-container">
      <TreeNode node={tree} {persons} {selectedPersonId} on:select={(e) => handleSelectPerson(e.detail)} />
    </div>
  {:else}
    <div class="empty-state" data-testid="tree-empty">
      <p>Tidak ada data untuk ditampilkan</p>
    </div>
  {/if}
</div>

<svelte:options accessors={true} />

<style>
  .tree-view {
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 8px;
    min-height: 400px;
  }

  .tree-container {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .empty-state {
    padding: 3rem;
    text-align: center;
    color: #999;
  }

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
