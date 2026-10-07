<script>
  import { data, ui, gantiNamaKeluarga, hapusSemua, muatJSON } from './store.js'
  import { unduhJSON, unduhCSV, bukaFile } from './export.js'
  import { simpanKeCloud, ambilDariCloud, POLA_KODE } from './cloud.js'
  import TreeView from './TreeView.svelte'
  import Sheet from './Sheet.svelte'
  import PersonForm from './PersonForm.svelte'

  /** @type {HTMLInputElement} */
  let fileInput
  /** @type {HTMLDivElement} */
  let menuWrap

  function mulaiAkar() {
    ui.update((u) => ({ ...u, form: { mode: 'akar' } }))
  }
  function toggleMenu() {
    ui.update((u) => ({ ...u, menuBuka: !u.menuBuka }))
  }
  function tutupMenu() {
    ui.update((u) => ({ ...u, menuBuka: false }))
  }
  function gantiNama() {
    const nama = prompt('Nama keluarga:', $data.nama_keluarga)
    if (nama !== null && nama.trim()) gantiNamaKeluarga(nama.trim())
  }
  function klikFile() {
    fileInput.click()
  }
  /** @param {Event} e */
  function pilihFile(e) {
    const input = /** @type {HTMLInputElement} */ (e.target)
    const f = input.files && input.files[0]
    input.value = ''
    tutupMenu()
    if (f) bukaFile(f)
  }
  function cetak() {
    tutupMenu()
    window.print()
  }
  function kosongkanSemua() {
    if (confirm('Hapus SEMUA data keluarga?')) {
      hapusSemua()
      tutupMenu()
    }
  }

  // ---------- Cloud (kode keluarga sebagai kunci) ----------
  /** @returns {string|null} */
  function tanyaKode() {
    const tersimpan = localStorage.getItem('silsilah:kode') || ''
    const jawab = prompt('Kode keluarga (kunci cloud):', tersimpan)
    if (jawab === null) return null
    const kode = jawab.trim().toLowerCase()
    if (!POLA_KODE.test(kode)) {
      alert('Kode tidak valid: 4–64 huruf/angka/tanda minus.\nContoh: keluarga-budi-42')
      return null
    }
    return kode
  }
  async function simpanCloud() {
    const kode = tanyaKode()
    if (!kode) return
    tutupMenu()
    try {
      await simpanKeCloud(kode)
      localStorage.setItem('silsilah:kode', kode)
      alert('Tersimpan ke cloud dengan kode ' + kode)
    } catch (e) {
      alert('Gagal simpan ke cloud: ' + /** @type {Error} */ (e).message)
    }
  }
  async function ambilCloud() {
    const kode = tanyaKode()
    if (!kode) return
    tutupMenu()
    try {
      const obj = await ambilDariCloud(kode)
      if (confirm('Timpa data di perangkat ini dengan data cloud kode ' + kode + '?')) {
        if (muatJSON(obj)) localStorage.setItem('silsilah:kode', kode)
      }
    } catch (e) {
      alert('Gagal ambil dari cloud: ' + /** @type {Error} */ (e).message)
    }
  }
  /** @param {MouseEvent} e */
  function klikDiLuar(e) {
    const t = /** @type {Node|null} */ (e.target)
    if ($ui.menuBuka && menuWrap && t && !menuWrap.contains(t)) tutupMenu()
  }
</script>

<svelte:window on:click={klikDiLuar} />

<header class="toolbar">
  <button class="nama-keluarga" on:click={gantiNama}>{$data.nama_keluarga}</button>
  <div class="menu" bind:this={menuWrap}>
    <button class="tombol-menu" on:click={toggleMenu} aria-expanded={$ui.menuBuka}>☰ Menu</button>
    {#if $ui.menuBuka}
      <div class="menu-panel">
        <button on:click={() => { unduhJSON(); tutupMenu() }}>💾 Simpan File</button>
        <button on:click={klikFile}>📂 Buka File</button>
        <button on:click={simpanCloud}>☁️ Simpan ke Cloud</button>
        <button on:click={ambilCloud}>☁️ Ambil dari Cloud</button>
        <button on:click={() => { unduhCSV(); tutupMenu() }}>📊 Unduh CSV</button>
        <button on:click={cetak}>🖨️ Cetak / PDF</button>
        <button class="bahaya" on:click={kosongkanSemua}>🗑️ Hapus Semua</button>
      </div>
    {/if}
  </div>
</header>

<input
  type="file"
  accept=".json,application/json"
  hidden
  bind:this={fileInput}
  on:change={pilihFile}
/>

<main>
  {#if $data.anggota.length === 0}
    <div class="layar-kosong">
      <p class="petunjuk">
        Catat anggota keluarga dengan cara yang mudah. Data tersimpan otomatis di perangkat ini.
      </p>
      <button class="besar" on:click={mulaiAkar}>➕ Mulai: Orang Pertama</button>
    </div>
  {:else}
    <TreeView />
  {/if}
</main>

<Sheet />
<PersonForm />
