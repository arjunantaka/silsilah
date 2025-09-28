<script>
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import {
    currentFamily,
    orangList,
    hubunganList,
    unionList,
    nodePositions,
    keluargaStore,
    selectedPersonId
  } from '../stores/keluarga.js';

  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 90;

  let canvasEl;
  let mode = 'select'; // select | connect
  let selectedParent = null;
  let selectedChild = null;
  let relationDialogOpen = false;
  let relationDraft = {
    unionId: '',
    birthOrder: 1,
    jenis: 'biological'
  };
  let newUnionDraft = {
    enabled: false,
    partnerId: ''
  };
  let quickPersonDialog = false;
  let quickPerson = {
    nama_lengkap: '',
    gender: 'unknown'
  };
  let infoMessage = '';
  let canvasSize = { width: 1200, height: 700 };

  $: persons = $orangList;
  $: relations = $hubunganList;
  $: unions = $unionList;
  $: positions = $nodePositions;



  $: {
    // Only recalculate canvas size when element is available
    if (canvasEl) {
      canvasSize = getCanvasSize();
    }
  }

  onMount(() => {
    // Force canvas size calculation after mount
    setTimeout(() => {
      canvasSize = getCanvasSize();
    }, 50);
  });

  function getPersonName(personId) {
    const p = get(orangList).find((person) => person.id === personId);
    return p ? p.nama_lengkap : 'Unknown';
  }

  function getUnionLabel(union) {
    const persons = get(orangList);
    const partner1 = persons.find((p) => p.id === union.partner1_id)?.nama_lengkap || '—';
    const partner2 = persons.find((p) => p.id === union.partner2_id)?.nama_lengkap || '—';
    return `${partner1} ↔ ${partner2}`;
  }

  function getCanvasSize() {
    if (!canvasEl) {
      return { width: 1200, height: 700 };
    }
    const rect = canvasEl.getBoundingClientRect();
    const size = {
      width: rect?.width || 1200,
      height: rect?.height || 700
    };

    return size;
  }

  function setMode(newMode) {
    mode = newMode;
    selectedParent = null;
    selectedChild = null;
    relationDialogOpen = false;
  }

  function startDrag(event, personId) {
    if (!canvasEl) return;
    event.stopPropagation();
    const rect = canvasEl.getBoundingClientRect();
    const startPos = positions[personId] || { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const offsetX = event.clientX - rect.left - startPos.x;
    const offsetY = event.clientY - rect.top - startPos.y;

    const moveListener = (e) => {
      const x = clamp(e.clientX - rect.left - offsetX, 0, rect.width - NODE_WIDTH);
      const y = clamp(e.clientY - rect.top - offsetY, 0, rect.height - NODE_HEIGHT);
      keluargaStore.setNodePosition(personId, { x, y });
    };

    const upListener = () => {
      window.removeEventListener('pointermove', moveListener);
      window.removeEventListener('pointerup', upListener);
    };

    window.addEventListener('pointermove', moveListener);
    window.addEventListener('pointerup', upListener);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function handleNodeClick(personId) {
    if (mode !== 'connect') return;

    if (!selectedParent) {
      selectedParent = personId;
      infoMessage = 'Pilih anak untuk relasi baru';
      return;
    }

    if (selectedParent === personId) {
      selectedParent = null;
      infoMessage = '';
      return;
    }

    selectedChild = personId;
    prepareRelationDraft();
    relationDialogOpen = true;
  }

  function prepareRelationDraft() {
    const availableUnions = unions.filter((u) => u.partner1_id === selectedParent || u.partner2_id === selectedParent);
    const defaultUnion = availableUnions[0]?.id || '';
    relationDraft = {
      unionId: defaultUnion,
      birthOrder: nextBirthOrder(selectedParent, defaultUnion),
      jenis: 'biological'
    };
    newUnionDraft = {
      enabled: false,
      partnerId: ''
    };
    infoMessage = '';
  }

  function nextBirthOrder(parentId, unionId) {
    const siblings = relations.filter((r) => r.parent_id === parentId && (unionId ? r.union_id === unionId : !r.union_id));
    const maxOrder = siblings.reduce((max, rel) => Math.max(max, Number(rel.birth_order) || 0), 0);
    return maxOrder + 1;
  }

  function confirmRelation() {
    try {
      let unionId = relationDraft.unionId || null;

      if (newUnionDraft.enabled) {
        if (!newUnionDraft.partnerId) {
          alert('Pilih pasangan untuk membuat union baru.');
          return;
        }
        unionId = keluargaStore.createUnion({
          partner1_id: selectedParent,
          partner2_id: newUnionDraft.partnerId,
          status: 'menikah'
        });
      }

      keluargaStore.createRelation({
        parentId: selectedParent,
        childId: selectedChild,
        unionId,
        birthOrder: Number(relationDraft.birthOrder) || 1,
        jenis: relationDraft.jenis
      });

      relationDialogOpen = false;
      selectedParent = null;
      selectedChild = null;
      setMode('select');
    } catch (error) {
      alert(error.message || 'Gagal membuat relasi');
    }
  }

  function cancelRelation() {
    relationDialogOpen = false;
    selectedChild = null;
    infoMessage = '';
  }

  function confirmQuickPerson() {
    if (!quickPerson.nama_lengkap.trim()) {
      alert('Nama wajib diisi');
      return;
    }
    keluargaStore.createPerson({
      nama_lengkap: quickPerson.nama_lengkap,
      gender: quickPerson.gender
    });
    quickPersonDialog = false;
    quickPerson = { nama_lengkap: '', gender: 'unknown' };
  }

  function handleSetRoot(personId) {
    keluargaStore.setRoot(personId);
    keluargaStore.rebuildLineage();
  }

  $: edges = relations
    .map((relation) => {
      const parentPos = positions[relation.parent_id];
      const childPos = positions[relation.child_id];
      if (!parentPos || !childPos) return null;
      return {
        id: relation.id,
        parent: relation.parent_id,
        child: relation.child_id,
        x1: parentPos.x + NODE_WIDTH / 2,
        y1: parentPos.y + NODE_HEIGHT,
        x2: childPos.x + NODE_WIDTH / 2,
        y2: childPos.y,
        jenis: relation.jenis
      };
    })
    .filter(Boolean);
</script>

{#if !$currentFamily}
  <div class="empty-state">
    <h2>Pilih Keluarga Terlebih Dahulu</h2>
    <p>Gunakan tab "Keluarga" untuk membuat atau memilih keluarga.</p>
  </div>
{:else}
  <div class="editor-wrapper">
    <div class="toolbar">
      <div class="left-group">
        <button class:selected={mode === 'select'} on:click={() => setMode('select')}>🖱️ Pilih</button>
        <button class:selected={mode === 'connect'} on:click={() => setMode('connect')} disabled={persons.length < 2}>🔗 Hubungkan</button>
        <button on:click={() => { quickPersonDialog = true; }}>➕ Tambah Anggota</button>
      </div>
      <div class="right-group">
        <button on:click={() => keluargaStore.autoArrange()}>📐 Auto Layout</button>
        <button on:click={() => keluargaStore.rebuildLineage()}>♻️ Rebuild Kode</button>
      </div>
    </div>
    {#if infoMessage}
      <div class="info">{infoMessage}</div>
    {/if}
    <!-- Debug info -->
    <div class="debug-info" style="background: #fff3cd; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.85rem;">
      🔍 Debug: {persons.length} persons, {Object.keys(positions).length} positions, Canvas: {canvasSize.width}×{canvasSize.height}
    </div>
    <div class="canvas" bind:this={canvasEl}>
      <svg class="edges" width={canvasSize.width} height={canvasSize.height}>
        {#each edges as edge}
          <line
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            class:adoptive={edge.jenis !== 'biological'}
          />
        {/each}
      </svg>
      {#each persons as person}
        <!-- Debug: Show all persons, with or without positions -->
        <button
          class="node"
          style={`transform: translate(${positions[person.id]?.x || 50}px, ${positions[person.id]?.y || 50}px); width: ${NODE_WIDTH}px; height: ${NODE_HEIGHT}px; ${!positions[person.id] ? 'border: 3px solid red;' : ''}`}
          class:parent-selected={mode === 'connect' && selectedParent === person.id}
          class:child-selected={mode === 'connect' && selectedChild === person.id}
          type="button"
          on:pointerdown={(event) => startDrag(event, person.id)}
          on:click={() => handleNodeClick(person.id)}
          on:keydown={(event) => {
            if (mode === 'connect' && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              handleNodeClick(person.id);
            }
          }}
        >
            <header>
              <span class="name">{person.nama_lengkap}</span>
              <span class="code">{person.lineage_code || '-'}</span>
            </header>
            <div class="meta">
              <span>{person.gender === 'L' ? 'Laki-laki' : person.gender === 'P' ? 'Perempuan' : 'Tidak diketahui'}</span>
              <span>{person.pekerjaan_sekolah || person.catatan || ''}</span>
            </div>
            <footer>
              <button type="button" on:click|stopPropagation={() => handleSetRoot(person.id)}>🌳 Root</button>
              <button type="button" on:click|stopPropagation={() => selectedPersonId.set(person.id)}>🔍 Detail</button>
            </footer>
          </button>
      {/each}
    </div>
  </div>
{/if}

{#if relationDialogOpen}
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-content">
      <h3>Hubungkan {getPersonName(selectedParent)} → {getPersonName(selectedChild)}</h3>
      <div class="form-grid">
        <label for="union-select">Union (opsional)</label>
        <select id="union-select" bind:value={relationDraft.unionId} disabled={newUnionDraft.enabled}>
          <option value="">Tanpa pasangan</option>
          {#each unions.filter((u) => u.partner1_id === selectedParent || u.partner2_id === selectedParent) as union}
            <option value={union.id}>{getUnionLabel(union)}</option>
          {/each}
        </select>

        <label for="birth-order">Urutan lahir</label>
        <input id="birth-order" type="number" min="1" bind:value={relationDraft.birthOrder} />

        <label for="jenis-relasi">Jenis relasi</label>
        <select id="jenis-relasi" bind:value={relationDraft.jenis}>
          <option value="biological">Biologis</option>
          <option value="adoptive">Adopsi</option>
          <option value="step">Tiri</option>
        </select>
      </div>

      <fieldset class="new-union">
        <legend>Buat union baru</legend>
        <label>
          <input type="checkbox" bind:checked={newUnionDraft.enabled} />
          Buat pasangan baru untuk orang tua ini
        </label>
        <div class="inline">
          <label for="partner-select">Pilih pasangan</label>
          <select id="partner-select" bind:value={newUnionDraft.partnerId} disabled={!newUnionDraft.enabled}>
            <option value="">-- pilih --</option>
            {#each persons.filter((p) => p.id !== selectedParent) as candidate}
              <option value={candidate.id}>{candidate.nama_lengkap}</option>
            {/each}
          </select>
        </div>
      </fieldset>

      <div class="modal-actions">
        <button class="btn-secondary" on:click={cancelRelation}>Batal</button>
        <button class="btn-primary" on:click={confirmRelation}>Simpan</button>
      </div>
    </div>
  </div>
{/if}

{#if quickPersonDialog}
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-content">
      <h3>Tambah Anggota Cepat</h3>
      <div class="form-grid">
        <label for="quick-name">Nama</label>
        <input id="quick-name" type="text" bind:value={quickPerson.nama_lengkap} />
        <label for="quick-gender">Gender</label>
        <select id="quick-gender" bind:value={quickPerson.gender}>
          <option value="unknown">Tidak diketahui</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" on:click={() => { quickPersonDialog = false; }}>Batal</button>
        <button class="btn-primary" on:click={confirmQuickPerson}>Simpan</button>
      </div>
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

  .editor-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    background: white;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .toolbar button {
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    background: #e5e7eb;
  }

  .toolbar button.selected {
    background: #6366f1;
    color: white;
  }

  .toolbar .right-group button {
    background: #f1f5f9;
  }

  .info {
    background: #eef2ff;
    border-left: 4px solid #6366f1;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    color: #4338ca;
  }

  .canvas {
    position: relative;
    flex: 1;
    min-height: 600px;
    background: #f8fafc;
    border-radius: 12px;
    overflow: hidden;
  }

  .edges {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .edges line {
    stroke: #a855f7;
    stroke-width: 2;
  }

  .edges line.adoptive {
    stroke-dasharray: 6 4;
    stroke: #f97316;
  }

  .node {
    position: absolute;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    user-select: none;
    cursor: grab;
    border: none;
    font: inherit;
    padding: 0;
  }

  .node header {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .node .name {
    font-weight: 600;
    color: #1f2937;
  }

  .node .code {
    font-size: 0.75rem;
    color: #6366f1;
  }

  .node .meta {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    color: #4b5563;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .node footer {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #e5e7eb;
    gap: 0.5rem;
  }

  .node footer button {
    flex: 1;
    border: none;
    background: #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    padding: 0.3rem 0.4rem;
    font-size: 0.85rem;
  }

  .node.parent-selected {
    outline: 3px solid #6366f1;
  }

  .node.child-selected {
    outline: 3px solid #f59e0b;
  }

  .modal {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    z-index: 20;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    width: min(480px, 100%);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem 1rem;
  }

  .form-grid label {
    font-size: 0.85rem;
    color: #4b5563;
  }

  .form-grid input,
  .form-grid select {
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #d1d5db;
  }

  .new-union {
    border: 1px solid #dbeafe;
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .new-union .inline {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .btn-primary {
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.2rem;
    cursor: pointer;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #111827;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.2rem;
    cursor: pointer;
  }
</style>

<svelte:window on:resize={() => { canvasSize = getCanvasSize(); }} />
