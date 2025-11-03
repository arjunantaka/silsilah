<script>
  import { trahStore } from '../stores/trah.js';
  import { getPersonById, getDescendants } from '../stores/trah.js';
  import { getGenerasiLabel, sortByKodeHierarchical, sortByKodeSequential } from '../utils/kodeGenerator.js';

  let selectedPersonId = null;
  let sortMode = 'hierarchical'; // 'hierarchical' or 'sequential'
  let tableData = [];

  $: persons = $trahStore.persons;
  $: rootPersonObj = persons.find(p => p.is_root);

  $: if (rootPersonObj && !selectedPersonId) {
    selectedPersonId = rootPersonObj.id;
  }

  $: if (selectedPersonId || sortMode) {
    generateTable();
  }

  function generateTable() {
    if (!selectedPersonId) {
      tableData = [];
      return;
    }

    const selectedPerson = getPersonById(persons, selectedPersonId);
    if (!selectedPerson) {
      tableData = [];
      return;
    }

    const descendants = getDescendants(persons, selectedPersonId);
    let allPersons = [selectedPerson, ...descendants];

    // Apply sorting
    if (sortMode === 'hierarchical') {
      allPersons = sortByKodeHierarchical(allPersons);
    } else {
      allPersons = sortByKodeSequential(allPersons);
    }

    tableData = [];
    allPersons.forEach(person => {
      const parent = person.parent_id ? getPersonById(persons, person.parent_id) : null;

      // Add main person row
      tableData.push({
        kode: person.kode || "-",
        nama: person.nama_lengkap,
        ttl: `${person.tempat_lahir || "-"}, ${person.tanggal_lahir || "-"}`,
        no_hp: person.no_hp || "-",
        alamat: person.alamat || "-",
        pekerjaan: person.pekerjaan || "-",
        pasangan: person.pasangan ? person.pasangan.nama_lengkap : "-",
        orangTua: parent ? parent.nama_lengkap : "-",
        generasi: getGenerasiLabel(person.generasi),
        isSpouse: false,
        personId: person.id
      });

      // Add spouse row if exists (indented, no kode)
      if (person.pasangan) {
        tableData.push({
          kode: "",
          nama: `  ↳ ${person.pasangan.nama_lengkap} (Pasangan)`,
          ttl: `${person.pasangan.tempat_lahir || "-"}, ${person.pasangan.tanggal_lahir || "-"}`,
          no_hp: person.pasangan.no_hp || "-",
          alamat: person.pasangan.alamat || "-",
          pekerjaan: person.pasangan.pekerjaan || "-",
          pasangan: "-",
          orangTua: "-",
          generasi: "-",
          isSpouse: true,
          personId: person.id
        });
      }
    });
  }

  function exportToCSV() {
    const headers = ["Kode", "Nama", "TTL", "No. HP", "Alamat", "Pekerjaan", "Pasangan", "Orang Tua", "Generasi"];
    const rows = tableData.map(row => [
      row.kode,
      row.nama,
      row.ttl,
      row.no_hp,
      row.alamat,
      row.pekerjaan,
      row.pasangan,
      row.orangTua,
      row.generasi
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trah-${$trahStore.trah?.nama_trah || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function printTable() {
    window.print();
  }
</script>

<div class="export-table" data-testid="export-table-root">
  <div class="controls no-print" data-testid="export-controls">
    <div class="selector" data-testid="export-root-selector">
      <label>
        Pilih Anggota sebagai Root:
        <select bind:value={selectedPersonId} data-testid="select-export-root">
          {#each persons as person}
            <option value={person.id} data-testid={`export-root-option-${person.id}`}>
              {person.kode || "Root"} - {person.nama_lengkap}
            </option>
          {/each}
        </select>
      </label>

      <label style="margin-top: 0.5rem;">
        Mode Urutan:
        <select bind:value={sortMode} data-testid="select-export-sort-mode">
          <option value="hierarchical">Hierarkis (A1→A1P1→A2)</option>
          <option value="sequential">Sequential (A1→A2→A1P1)</option>
        </select>
      </label>
    </div>

    <div class="buttons" data-testid="export-buttons">
      <button on:click={exportToCSV} disabled={tableData.length === 0} data-testid="btn-export-csv">
        📥 Export CSV
      </button>
      <button on:click={printTable} disabled={tableData.length === 0} data-testid="btn-print-table">
        🖨️ Print
      </button>
    </div>
  </div>

  {#if tableData.length > 0}
    <div class="table-container" data-testid="export-table-container">
      <table data-testid="export-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>TTL</th>
            <th>No. HP</th>
            <th>Alamat</th>
            <th>Pekerjaan</th>
            <th>Pasangan</th>
            <th>Orang Tua</th>
            <th>Generasi</th>
          </tr>
        </thead>
        <tbody>
          {#each tableData as row}
            <tr class:spouse-row={row.isSpouse} data-testid={`export-row-${row.kode || 'spouse-' + row.personId}`}>
              <td>{row.kode}</td>
              <td>{row.nama}</td>
              <td>{row.ttl}</td>
              <td>{row.no_hp}</td>
              <td>{row.alamat}</td>
              <td>{row.pekerjaan}</td>
              <td>{row.pasangan}</td>
              <td>{row.orangTua}</td>
              <td>{row.generasi}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p data-testid="export-empty">Tidak ada data untuk ditampilkan.</p>
  {/if}
</div>

<style>
  .export-table {
    padding: 1rem;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .selector {
    flex: 1;
    min-width: 300px;
  }

  .selector label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 600;
  }

  .selector select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
  }

  button {
    padding: 0.6rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  button:hover:not(:disabled) {
    background: #0056b3;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border: 1px solid #ddd;
  }

  th {
    background: #f8f9fa;
    font-weight: 600;
    position: sticky;
    top: 0;
  }

  tbody tr:hover {
    background: #f8f9fa;
  }

  tbody tr.spouse-row {
    background: #f9f9f9;
  }

  tbody tr.spouse-row:hover {
    background: #f0f0f0;
  }

  @media print {
    .no-print {
      display: none !important;
    }

    .export-table {
      padding: 0;
    }

    table {
      box-shadow: none;
    }

    th {
      background: #e9ecef !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
