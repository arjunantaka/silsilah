<script>
  import { currentFamily, orangList, hubunganList, unionList } from '../stores/keluarga.js';
  import {
    normalizePerson,
    deriveParents,
    deriveSpouses,
    formatBirthInfo,
    formatDate
  } from '../utils/dataUtils.js';

  let tableData = [];
  let showExportOptions = false;

  // Reactive statement untuk membangun data tabel
  $: buildTableData();

  function buildTableData() {
    if (!$currentFamily || !$orangList.length) {
      tableData = [];
      return;
    }

    const normalizedPersons = $orangList.map(normalizePerson);
    const relations = $hubunganList;
    const unions = $unionList || [];

    tableData = normalizedPersons.map(person => {
      const parents = deriveParents(person.id, relations, normalizedPersons);
      const spouses = deriveSpouses(person.id, unions, normalizedPersons);

      // Format orang tua
      const parentInfo = [];
      if (parents.fathers.length > 0) {
        parentInfo.push(`Ayah: ${parents.fathers.map(f => f.nama_lengkap).join(', ')}`);
      }
      if (parents.mothers.length > 0) {
        parentInfo.push(`Ibu: ${parents.mothers.map(m => m.nama_lengkap).join(', ')}`);
      }

      // Format pasangan
      const spouseInfo = spouses.map(spouse => {
        const status = spouse.union_status === 'cerai' ? ' (cerai)' : '';
        const years = spouse.union_start ? 
          `(${formatDate(spouse.union_start, 'yyyy')}${spouse.union_end ? '-' + formatDate(spouse.union_end, 'yyyy') : '-'})` : '';
        return `${spouse.nama_lengkap}${status} ${years}`.trim();
      });

      return {
        kode: person.lineage_code || '-',
        nama: person.nama_lengkap,
        ttl: formatBirthInfo(person),
        alamat: person.alamat || '-',
        pekerjaan: person.pekerjaan_sekolah || '-',
        pasangan: spouseInfo.length > 0 ? spouseInfo.join('; ') : '-',
        orangtua: parentInfo.length > 0 ? parentInfo.join(' / ') : '-',
        status: person.status_hidup === 'hidup' ? '🟢 Hidup' : '🔴 Wafat',
        catatan: person.catatan || '-'
      };
    });

    // Sort by lineage code
    tableData.sort((a, b) => {
      if (a.kode === '-' && b.kode === '-') return 0;
      if (a.kode === '-') return 1;
      if (b.kode === '-') return -1;
      
      // Extract letter and number for proper sorting (A1, A2, ..., A10, B1, etc.)
      const parseCode = (code) => {
        const match = code.match(/^([ABC])(\d+)$/);
        return match ? [match[1], parseInt(match[2])] : [code, 0];
      };
      
      const [aLetter, aNum] = parseCode(a.kode);
      const [bLetter, bNum] = parseCode(b.kode);
      
      if (aLetter !== bLetter) return aLetter.localeCompare(bLetter);
      return aNum - bNum;
    });
  }

  function exportToCSV() {
    const headers = ['Kode', 'Nama', 'Tempat & Tanggal Lahir', 'Alamat', 'Pekerjaan', 'Suami/Istri', 'Orang Tua', 'Status', 'Catatan'];
    const csvContent = [
      headers.join(','),
      ...tableData.map(row => [
        row.kode,
        `"${row.nama}"`,
        `"${row.ttl}"`,
        `"${row.alamat}"`,
        `"${row.pekerjaan}"`,
        `"${row.pasangan}"`,
        `"${row.orangtua}"`,
        `"${row.status}"`,
        `"${row.catatan}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tabel-keluarga-${$currentFamily.nama.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showExportOptions = false;
  }

  function printTable() {
    const printWindow = window.open('', '_blank');
    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tabel Keluarga - ${$currentFamily.nama}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2563eb; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
          th { background-color: #f3f4f6; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .status-hidup { color: #059669; }
          .status-wafat { color: #dc2626; }
          @media print {
            body { margin: 0; }
            table { font-size: 10px; }
            th, td { padding: 4px; }
          }
        </style>
      </head>
      <body>
        <h1>Tabel Anggota Keluarga - ${$currentFamily.nama}</h1>
        <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID')}</p>
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Tempat & Tanggal Lahir</th>
              <th>Alamat</th>
              <th>Pekerjaan</th>
              <th>Suami/Istri</th>
              <th>Orang Tua</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableData.map(row => `
              <tr>
                <td>${row.kode}</td>
                <td><strong>${row.nama}</strong></td>
                <td>${row.ttl}</td>
                <td>${row.alamat}</td>
                <td>${row.pekerjaan}</td>
                <td>${row.pasangan}</td>
                <td>${row.orangtua}</td>
                <td class="status-${row.status.includes('Hidup') ? 'hidup' : 'wafat'}">${row.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    showExportOptions = false;
  }
</script>

{#if !$currentFamily}
  <div class="empty-state">
    <h2>Pilih Keluarga Terlebih Dahulu</h2>
    <p>Gunakan tab "Keluarga" untuk membuat atau memilih keluarga.</p>
  </div>
{:else if !$orangList.length}
  <div class="empty-state">
    <h2>Belum Ada Anggota</h2>
    <p>Tambahkan anggota keluarga untuk menampilkan tabel.</p>
  </div>
{:else}
  <div class="table-container">
    <div class="table-header">
      <h2>Tabel Anggota Keluarga</h2>
      <div class="table-actions">
        <button 
          class="export-btn"
          on:click={() => showExportOptions = !showExportOptions}
        >
          📊 Ekspor
        </button>
        {#if showExportOptions}
          <div class="export-menu">
            <button on:click={exportToCSV}>💾 Unduh CSV</button>
            <button on:click={printTable}>🖨️ Cetak</button>
          </div>
        {/if}
      </div>
    </div>

    <div class="table-wrapper">
      <table class="family-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Tempat & Tanggal Lahir</th>
            <th>Alamat</th>
            <th>Pekerjaan</th>
            <th>Suami/Istri</th>
            <th>Orang Tua</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each tableData as row}
            <tr>
              <td class="kode-cell">{row.kode}</td>
              <td class="nama-cell"><strong>{row.nama}</strong></td>
              <td class="ttl-cell">{row.ttl}</td>
              <td class="alamat-cell">{row.alamat}</td>
              <td class="pekerjaan-cell">{row.pekerjaan}</td>
              <td class="pasangan-cell">{row.pasangan}</td>
              <td class="orangtua-cell">{row.orangtua}</td>
              <td class="status-cell">
                <span class="status-badge {row.status.includes('Hidup') ? 'status-hidup' : 'status-wafat'}">
                  {row.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <p class="table-info">
        Total: <strong>{tableData.length}</strong> anggota keluarga
      </p>
    </div>
  </div>
{/if}

<style>
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
  }

  .empty-state h2 {
    color: #374151;
    margin-bottom: 8px;
  }

  .table-container {
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e5e7eb;
  }

  .table-header h2 {
    color: #1f2937;
    margin: 0;
    font-size: 1.5rem;
  }

  .table-actions {
    position: relative;
  }

  .export-btn {
    background: #2563eb;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .export-btn:hover {
    background: #1d4ed8;
  }

  .export-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 150px;
    margin-top: 4px;
  }

  .export-menu button {
    display: block;
    width: 100%;
    padding: 10px 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
    color: #374151;
  }

  .export-menu button:hover {
    background: #f3f4f6;
  }

  .export-menu button:first-child {
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
  }

  .export-menu button:last-child {
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
  }

  .table-wrapper {
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .family-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    background: white;
  }

  .family-table th {
    background: #f9fafb;
    color: #374151;
    font-weight: 600;
    padding: 12px 8px;
    text-align: left;
    border-bottom: 2px solid #e5e7eb;
    white-space: nowrap;
  }

  .family-table td {
    padding: 10px 8px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }

  .family-table tbody tr:hover {
    background: #f8fafc;
  }

  .kode-cell {
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #7c3aed;
    text-align: center;
    width: 60px;
  }

  .nama-cell {
    min-width: 180px;
    color: #1f2937;
  }

  .ttl-cell {
    min-width: 160px;
    color: #4b5563;
  }

  .alamat-cell {
    min-width: 120px;
    color: #6b7280;
  }

  .pekerjaan-cell {
    min-width: 140px;
    color: #4b5563;
  }

  .pasangan-cell {
    min-width: 180px;
    color: #7c2d12;
  }

  .orangtua-cell {
    min-width: 160px;
    color: #059669;
  }

  .status-cell {
    text-align: center;
    width: 80px;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  .status-hidup {
    background: #d1fae5;
    color: #065f46;
  }

  .status-wafat {
    background: #fee2e2;
    color: #991b1b;
  }

  .table-footer {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #e5e7eb;
  }

  .table-info {
    color: #6b7280;
    font-size: 14px;
    margin: 0;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .table-container {
      padding: 15px;
    }

    .table-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }

    .family-table {
      font-size: 12px;
    }

    .family-table th,
    .family-table td {
      padding: 8px 6px;
    }
  }
</style>