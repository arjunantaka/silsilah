<script>
  import { data, ui, gantiNamaKeluarga, hapusSemua, muatJSON } from './store.js'
  import { unduhJSON, unduhCSV, bukaFile } from './export.js'
  import { ambilDariCloud, ambilDaftarKeluarga, POLA_KODE } from './cloud.js'
  import { statusSinkron, kodeKeluarga, mulaiSinkron, simpanSekarang, lepasKode } from './sinkron.js'
  import TreeView from './TreeView.svelte'
  import Sheet from './Sheet.svelte'
  import PersonForm from './PersonForm.svelte'
  import { tick, onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'

  let cari = ''
  $: kunci = cari.trim().toLowerCase()
  $: hasilCari = !kunci
    ? []
    : $data.anggota
        .filter(
          (a) =>
            a.nama.toLowerCase().includes(kunci) || (a.kode || '').toLowerCase().includes(kunci),
        )
        .slice(0, 10)

  /** @param {string} id */
  function bukaHasil(id) {
    ui.update((u) => ({ ...u, sheetId: id, fokusId: id, menuBuka: false }))
    cari = ''
  }

  // Sorot + gulir ke kotak orang yang dipilih dari pencarian.
  $: if ($ui.fokusId) {
    const id = $ui.fokusId
    tick().then(() => {
      const el = document.querySelector(`[data-id="${id}"]`)
      if (el) el.scrollIntoView({ block: 'center', inline: 'center' })
    })
  }

  /** @type {HTMLInputElement} */
  let fileInput
  /** @type {HTMLDivElement} */
  let menuWrap
  let sedangCloud = false

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
  async function pilihFile(e) {
    const input = /** @type {HTMLInputElement} */ (e.target)
    const f = input.files && input.files[0]
    input.value = ''
    tutupMenu()
    if (f && (await bukaFile(f))) lepasKode()
  }
  function cetak() {
    tutupMenu()
    window.print()
  }
  function kosongkanSemua() {
    if (confirm('Hapus SEMUA data keluarga?')) {
      hapusSemua()
      lepasKode()
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
      alert('Kode tidak valid: 4-64 huruf/angka/tanda minus.\nContoh: keluarga-budi-42')
      return null
    }
    return kode
  }
  async function ambilCloud() {
    const kode = tanyaKode()
    if (!kode) return
    sedangCloud = true
    try {
      const obj = await ambilDariCloud(kode)
      if (confirm('Timpa data di perangkat ini dengan data cloud kode ' + kode + '?')) {
        if (muatJSON(obj)) {
          localStorage.setItem('silsilah:kode', kode)
          kodeKeluarga.set(kode)
        }
        tutupMenu()
      }
    } catch (e) {
      alert('Gagal ambil dari cloud: ' + /** @type {Error} */ (e).message)
    } finally {
      sedangCloud = false
    }
  }
  /** @param {MouseEvent} e */
  function klikDiLuar(e) {
    const t = /** @type {Node|null} */ (e.target)
    if ($ui.menuBuka && menuWrap && t && !menuWrap.contains(t)) tutupMenu()
  }

  // ---------- Dashboard berbasis database ----------
  // Sumber data utama tetap cloud KV (/api/data). Saat halaman dibuka:
  // - ?kode=... di alamat  -> selalu ambil dokumen itu dari database
  // - kode tersimpan di perangkat -> ambil dari database bila perangkat masih kosong
  // Data lokal tidak pernah ditimpa diam-diam (selalu dikonfirmasi).
  let statusCloud = ''
  async function muatDariDatabase() {
    const dariUrl = new URLSearchParams(location.search).get('kode')
    const kode = (dariUrl || localStorage.getItem('silsilah:kode') || '').trim().toLowerCase()
    if (!POLA_KODE.test(kode)) return
    const lokalKosong = get(data).anggota.length === 0
    if (!dariUrl && !lokalKosong) return
    if (dariUrl && !lokalKosong && !confirm('Timpa data di perangkat ini dengan data cloud kode ' + kode + '?')) return
    statusCloud = 'Memuat dari database cloud: ' + kode + '…'
    try {
      const obj = await ambilDariCloud(kode)
      if (!muatJSON(obj)) {
        statusCloud = 'Database cloud tidak berisi dokumen silsilah.'
        return
      }
      localStorage.setItem('silsilah:kode', kode)
      kodeKeluarga.set(kode)
      statusCloud = 'Dimuat dari database cloud: ' + kode + ' (' + obj.anggota.length + ' orang).'
      setTimeout(() => {
        if (statusCloud.startsWith('Dimuat')) statusCloud = ''
      }, 8000)
    } catch (e) {
      statusCloud = 'Gagal memuat dari database cloud: ' + /** @type {Error} */ (e).message
    }
  }
  // Daftar keluarga di database (hanya diisi saat layar kosong).
  /** @type {{ kode: string, nama: string|null, jumlah: number|null }[]} */
  let daftarKeluarga = []
  onMount(() => {
    muatDariDatabase()
    if (get(data).anggota.length === 0) {
      ambilDaftarKeluarga()
        .then((l) => (daftarKeluarga = l))
        .catch(() => {})
    }
  })
  onDestroy(mulaiSinkron()) // autosave aktif selama komponen hidup

  /** @param {string} kode */
  function bukaDariDaftar(kode) {
    location.href = '/?kode=' + encodeURIComponent(kode)
  }
  function salinTautan() {
    const url = location.origin + '/?kode=' + encodeURIComponent(get(kodeKeluarga))
    try {
      navigator.clipboard
        .writeText(url)
        .then(
          () => alert('Tautan disalin:\n' + url),
          () => prompt('Salin tautan keluarga ini:', url),
        )
    } catch {
      // Konteks tidak aman / clipboard tidak ada: tampilkan tautan untuk disalin manual.
      prompt('Salin tautan keluarga ini:', url)
    }
  }
</script>

<svelte:window on:click={klikDiLuar} />

<header class="toolbar">
  <button class="nama-keluarga" on:click={gantiNama}>{$data.nama_keluarga}</button>
  <div class="menu" bind:this={menuWrap}>
    <button class="tombol-menu" on:click={toggleMenu} aria-expanded={$ui.menuBuka}>☰ Menu</button>
    {#if $ui.menuBuka}
      <div class="menu-panel">
        <button on:click={() => { mulaiAkar(); tutupMenu() }}>👤 Tambah Orang (Lepas)</button>
        <button on:click={() => { unduhJSON(); tutupMenu() }}>💾 Simpan File</button>
        <button on:click={klikFile}>📂 Buka File</button>
        <button disabled={sedangCloud} on:click={ambilCloud}>☁️ Ambil dari Cloud</button>
        {#if sedangCloud}<p class="info-pembaca">Sedang memproses cloud…</p>{/if}
        <button on:click={() => { unduhCSV(); tutupMenu() }}>📊 Unduh CSV</button>
        <button on:click={cetak}>🖨️ Cetak / PDF</button>
        <button class="bahaya" on:click={kosongkanSemua}>🗑️ Hapus Semua</button>
      </div>
    {/if}
  </div>
</header>

{#if statusCloud}
  <p class="status-cloud" role="status">{statusCloud}</p>
{/if}

{#if $data.anggota.length > 0 && $kodeKeluarga}
  <p class="status-sinkron" role="status">
    <span>
      {#if $statusSinkron === 'menyimpan'}☁️ Menyimpan ke database…
      {:else if $statusSinkron === 'gagal'}⚠️ Gagal simpan ke cloud.
      {:else}☁️ Tersimpan otomatis ke database.{/if}
    </span>
    <code class="kode-sinkron">{$kodeKeluarga}</code>
    {#if $statusSinkron === 'gagal'}
      <button class="kecil" on:click={simpanSekarang}>Coba lagi</button>
    {/if}
    <button class="kecil" on:click={salinTautan}>🔗 Salin Tautan</button>
  </p>
{/if}

{#if $data.anggota.length > 0}
  <div class="cari-bar">
    <input
      id="cari"
      type="text"
      placeholder="🔍 Cari nama atau kode…"
      bind:value={cari}
    />
    {#if kunci}
      {#if hasilCari.length > 0}
        <div class="hasil-cari">
          {#each hasilCari as a (a.id)}
            <button on:click={() => bukaHasil(a.id)}>
              {a.nama}{#if a.kode}{' · '}{a.kode}{/if}
            </button>
          {/each}
        </div>
      {:else}
        <p class="hasil-kosong">Tidak ada yang cocok.</p>
      {/if}
    {/if}
  </div>
{/if}

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
      {#if daftarKeluarga.length > 0}
        <p class="petunjuk">atau buka silsilah yang sudah tersimpan di database:</p>
        <div class="daftar-keluarga">
          {#each daftarKeluarga as f (f.kode)}
            <button class="besar buka-keluarga" on:click={() => bukaDariDaftar(f.kode)}>
              {f.nama || f.kode}{#if f.jumlah !== null}&nbsp;· {f.jumlah} orang{/if}
              <small>{f.kode}</small>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <TreeView />
  {/if}
</main>

<Sheet />
<PersonForm />
