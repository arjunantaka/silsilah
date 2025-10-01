<script>
  import { onMount } from 'svelte';
  import { trahStore } from './lib/stores/trah.js';

  import TrahManager from './lib/components/TrahManager.svelte';
  import PersonList from './lib/components/PersonList.svelte';
  import TreeViewNew from './lib/components/TreeViewNew.svelte';
  import ExportTable from './lib/components/ExportTable.svelte';

  let currentView = 'list';

  $: trahInitialized = $trahStore.initialized;

  function switchView(view) {
    currentView = view;
  }

  onMount(() => {
    trahStore.loadFromStorage();
  });
</script>

<main class="app">
  <header class="app-header">
    <h1>🌳 Sistem Trah Keluarga</h1>
    {#if trahInitialized}
      <div class="trah-info">
        <span class="trah-name">{$trahStore.trah?.nama_trah || 'Trah'}</span>
        <span class="person-count">{$trahStore.persons.length} anggota</span>
      </div>
    {/if}
  </header>

  <div class="app-content">
    <div class="trah-manager-section">
      <TrahManager />
    </div>

    {#if trahInitialized}
      <nav class="app-nav">
         <button
           class="nav-btn"
           class:active={currentView === 'list'}
           data-testid="nav-view-list"
           on:click={() => switchView('list')}
         >
          📋 Daftar Anggota
        </button>
         <button
           class="nav-btn"
           class:active={currentView === 'tree'}
           data-testid="nav-view-tree"
           on:click={() => switchView('tree')}
         >
          🌳 Pohon Silsilah
        </button>
         <button
           class="nav-btn"
           class:active={currentView === 'export'}
           data-testid="nav-view-export"
           on:click={() => switchView('export')}
         >
          📊 Export Data
        </button>
      </nav>

      <div class="view-content">
        {#if currentView === 'list'}
          <PersonList />
        {:else if currentView === 'tree'}
          <TreeViewNew />
        {:else if currentView === 'export'}
          <ExportTable />
        {/if}
      </div>
    {:else}
      <div class="welcome">
        <h2>Selamat Datang di Sistem Trah</h2>
        <p>Silakan buat Trah baru atau import data yang sudah ada di atas.</p>
      </div>
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
    padding: 1.5rem 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .app-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.8rem;
    font-weight: 600;
  }

  .trah-info {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.95rem;
  }

  .trah-name {
    font-weight: 600;
    font-size: 1.1rem;
  }

  .person-count {
    background: rgba(255,255,255,0.2);
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
  }

  .app-content {
    flex: 1;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .trah-manager-section {
    margin-bottom: 2rem;
  }

  .app-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 1rem;
  }

  .nav-btn {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    color: #374151;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .nav-btn:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  .nav-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  .view-content {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .welcome {
    text-align: center;
    padding: 3rem 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .welcome h2 {
    color: #374151;
    margin: 0 0 1rem 0;
  }

  .welcome p {
    color: #6b7280;
    font-size: 1.1rem;
  }
</style>
