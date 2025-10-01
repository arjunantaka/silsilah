<script>
  import { onMount, afterUpdate } from 'svelte';
  import { currentFamily, orangList, hubunganList, unionList } from '../stores/keluarga.js';
  import { hierarchy, tree } from 'd3-hierarchy';
  import { select } from 'd3-selection';
  import { linkVertical } from 'd3-shape';
  import { buildHierarchy } from '../layout/buildTree.js';

  let svgElement;
  let containerElement;
  let treeData = null;
  let showUnions = true;
  let normalizeNames = true;

  $: buildTreeData();

  function buildTreeData() {
    const family = $currentFamily;
    const persons = $orangList;
    const relations = $hubunganList;
    const unions = $unionList;
    
    treeData = buildHierarchy(family, persons, relations, unions, showUnions);
  }

  function renderTree() {
    if (!svgElement || !treeData || !containerElement) return;

    const containerRect = containerElement.getBoundingClientRect();
    const width = Math.max(800, containerRect.width - 40);
    const height = Math.max(600, containerRect.height - 100);

    const svg = select(svgElement);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', 'translate(40,40)');

    const layout = tree().size([width - 120, height - 120]);
    const root = hierarchy(treeData);
    layout(root);

    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', linkVertical()
        .x((d) => d.x)
        .y((d) => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#cbd5f5')
      .attr('stroke-width', 2);

    const node = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    // Render person nodes (circles)
    node.filter(d => d.data.isPerson)
      .append('circle')
      .attr('r', (d) => d.data.isRoot ? 30 : 26)
      .attr('fill', (d) => {
        if (d.data.status === 'wafat') return '#9ca3af';
        if (d.data.gender === 'L') return '#60a5fa';
        if (d.data.gender === 'P') return '#f472b6';
        return '#a855f7';
      })
      .attr('stroke', (d) => d.data.isRoot ? '#fbbf24' : '#1f2937')
      .attr('stroke-width', (d) => d.data.isRoot ? 4 : 2);

    // Render union nodes (rectangles)
    node.filter(d => d.data.isUnion)
      .append('rect')
      .attr('width', 120)
      .attr('height', 40)
      .attr('x', -60)
      .attr('y', -20)
      .attr('fill', '#f3f4f6')
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 2)
      .attr('rx', 6);

    // Person names (clean, without lineage codes if normalized)
    node.filter(d => d.data.isPerson)
      .append('text')
      .attr('dy', -36)
      .attr('text-anchor', 'middle')
      .text((d) => normalizeNames ? d.data.name : d.data.original_name)
      .attr('class', (d) => d.data.isRoot ? 'node-name root-name' : 'node-name');

    // Union labels
    node.filter(d => d.data.isUnion)
      .append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .text((d) => d.data.name)
      .attr('class', 'union-name');

    // Lineage codes for persons only
    node.filter(d => d.data.isPerson)
      .append('text')
      .attr('dy', -18)
      .attr('text-anchor', 'middle')
      .text((d) => d.data.lineage_code || '')
      .attr('class', 'node-code');

    // Life span for persons (birth-death years)
    node.filter(d => d.data.isPerson && (d.data.birth_year || d.data.death_year))
      .append('text')
      .attr('dy', 42)
      .attr('text-anchor', 'middle')
      .text((d) => {
        const birth = d.data.birth_year || '';
        const death = d.data.death_year || '';
        if (birth && death) return `${birth}–${death}`;
        if (birth) return `${birth}–`;
        return '';
      })
      .attr('class', 'node-lifespan');
  }

  onMount(() => {
    renderTree();
  });

  afterUpdate(() => {
    renderTree();
  });
</script>

{#if !$currentFamily}
  <div class="empty-state">
    <h2>Pilih Keluarga Terlebih Dahulu</h2>
    <p>Gunakan tab "Keluarga" untuk membuat atau memilih keluarga.</p>
  </div>
{:else if !$orangList.length}
  <div class="empty-state">
    <h2>Belum Ada Anggota</h2>
    <p>Tambahkan anggota keluarga untuk menampilkan pohon.</p>
  </div>
{:else if !treeData}
  <div class="empty-state">
    <h2>Pohon Tidak Dapat Dibentuk</h2>
    <p>Pastikan root sudah ditetapkan dan hubungan anak tersambung.</p>
  </div>
{:else}
  <div class="tree-container" bind:this={containerElement}>
    <div class="tree-header">
      <div class="legend">
        <span><span class="legend-circle male"></span> Laki-laki</span>
        <span><span class="legend-circle female"></span> Perempuan</span>
        <span><span class="legend-circle deceased"></span> Wafat</span>
        <span><span class="legend-circle root"></span> Root/Leluhur</span>
        {#if showUnions}
          <span><span class="legend-union"></span> Pasangan</span>
        {/if}
      </div>
      
      <div class="tree-controls">
        <label class="control-item">
          <input type="checkbox" bind:checked={showUnions} on:change={buildTreeData} />
          Tampilkan Pasangan
        </label>
        <label class="control-item">
          <input type="checkbox" bind:checked={normalizeNames} />
          Nama Bersih
        </label>
      </div>
    </div>
    <svg bind:this={svgElement}></svg>
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

  .tree-container {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  }

  .tree-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .legend {
    display: flex;
    gap: 1.5rem;
    color: #374151;
    flex-wrap: wrap;
  }

  .tree-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .control-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #374151;
    cursor: pointer;
  }

  .control-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .legend-circle {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.4rem;
  }

  .legend-circle.male {
    background: #60a5fa;
  }

  .legend-circle.female {
    background: #f472b6;
  }

  .legend-circle.deceased {
    background: #9ca3af;
  }

  .legend-circle.root {
    background: #fbbf24;
    border: 2px solid #f59e0b;
  }

  .legend-union {
    width: 16px;
    height: 12px;
    background: #f3f4f6;
    border: 2px solid #6b7280;
    border-radius: 3px;
    display: inline-block;
    margin-right: 0.4rem;
  }

  .tree-container {
    height: 70vh;
    min-height: 600px;
  }

  svg {
    width: 100%;
    height: 100%;
  }

  :global(.node-name) {
    font-size: 0.85rem;
    font-weight: 600;
    fill: #111827;
  }

  :global(.root-name) {
    font-size: 0.95rem;
    font-weight: 700;
    fill: #92400e;
  }

  :global(.node-code) {
    font-size: 0.75rem;
    fill: #4b5563;
  }

  :global(.union-name) {
    font-size: 0.75rem;
    font-weight: 600;
    fill: #374151;
  }

  :global(.node-lifespan) {
    font-size: 0.65rem;
    fill: #6b7280;
    font-style: italic;
  }
</style>
