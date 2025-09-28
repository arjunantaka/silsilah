<script>
  import { onMount } from 'svelte';
  import { keluargaStore, currentFamily, isLoading } from './lib/stores/keluarga.js';

  import FamilySelector from './lib/components/FamilySelector.svelte';
  import PersonManager from './lib/components/PersonForm.svelte';
  import FamilyTree from './lib/components/FamilyTree.svelte';
  import FamilyTable from './lib/components/FamilyTable.svelte';
  import RelationsManager from './lib/components/RelationsManager.svelte';
  import DiagnosticsPanel from './lib/components/DiagnosticsPanel.svelte';
  import FamilyEditor from './lib/components/FamilyEditor.svelte';

  let initialized = false;
  let currentView = 'families';
  let treeViewMode = 'tree'; // 'tree' or 'table'

  function switchView(view) {
    currentView = view;
    // Reset tree view mode when switching away from tree view
    if (view !== 'tree') {
      treeViewMode = 'tree';
    }
  }

  onMount(async () => {
    await keluargaStore.initialize();
    initialized = true;
  });
</script>

<main class="app">
  <header class="app-header">
    <h1>🌳 Silsilah Keluarga</h1>
    <nav class="app-nav">
      <button
        class="nav-btn"
        class:active={currentView === 'families'}
        on:click={() => switchView('families')}
      >
        Keluarga
      </button>
      <button
        class="nav-btn"
        class:active={currentView === 'persons'}
        on:click={() => switchView('persons')}
        disabled={!$currentFamily}
      >
        Anggota & Detail
      </button>
      <button
        class="nav-btn"
        class:active={currentView === 'relations'}
        on:click={() => switchView('relations')}
        disabled={!$currentFamily}
      >
        Hubungan Keluarga
      </button>
      <button
        class="nav-btn"
        class:active={currentView === 'tree'}
        on:click={() => switchView('tree')}
        disabled={!$currentFamily}
      >
        Data Keluarga
      </button>
      <button
        class="nav-btn"
        class:active={currentView === 'editor'}
        on:click={() => switchView('editor')}
        disabled={!$currentFamily}
      >
        Editor Interaktif
      </button>
      <button
        class="nav-btn"
        class:active={currentView === 'diagnostics'}
        on:click={() => switchView('diagnostics')}
        disabled={!$currentFamily}
      >
        Diagnostik
      </button>
    </nav>
  </header>

  <div class="app-content">
    {#if !initialized || $isLoading}
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Memuat aplikasi...</p>
      </div>
    {:else}
      {#if currentView === 'families'}
        <FamilySelector />
      {:else if currentView === 'persons'}
        <PersonManager />
      {:else if currentView === 'relations'}
        <RelationsManager />
      {:else if currentView === 'tree'}
        <div class="tree-view-container">
          <div class="tree-view-nav">
            <button
              class="tree-nav-btn"
              class:active={treeViewMode === 'tree'}
              on:click={() => treeViewMode = 'tree'}
            >
              🌳 Pohon Keluarga
            </button>
            <button
              class="tree-nav-btn"
              class:active={treeViewMode === 'table'}
              on:click={() => treeViewMode = 'table'}
            >
              📊 Tabel Data
            </button>
          </div>
          <div class="tree-view-content">
            {#if treeViewMode === 'tree'}
              <FamilyTree />
            {:else if treeViewMode === 'table'}
              <FamilyTable />
            {/if}
          </div>
        </div>
      {:else if currentView === 'editor'}
        <FamilyEditor />
      {:else if currentView === 'diagnostics'}
        <DiagnosticsPanel />
      {/if}
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f5f5f5;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .app-header h1 {
    margin: 0 0 1rem 0;
    font-size: 1.8rem;
    font-weight: 600;
  }

  .app-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .nav-btn {
    background: rgba(255,255,255,0.2);
    border: 2px solid rgba(255,255,255,0.3);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
  }

  .nav-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.3);
    border-color: rgba(255,255,255,0.5);
  }

  .nav-btn.active {
    background: white;
    color: #667eea;
    border-color: white;
  }

  .nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .app-content {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 220px;
    font-size: 1.1rem;
    color: #666;
    text-align: center;
  }

  .loading-spinner {
    width: 42px;
    height: 42px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .tree-view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .tree-view-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 1rem;
  }

  .tree-nav-btn {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    color: #374151;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .tree-nav-btn:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  .tree-nav-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .tree-view-content {
    flex: 1;
    min-height: 0;
    transition: opacity 0.3s ease;
  }
  
  .tree-view-content > :global(*) {
    animation: fadeIn 0.4s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }


</style>
