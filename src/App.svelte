<script>
  import { data, ui, gantiNamaKeluarga, hapusSemua, muatJSON } from './store.js'
  import { unduhCSV } from './export.js'
  import { ambilDariCloud, ambilDaftarKeluarga, hapusDariCloud, POLA_KODE } from './cloud.js'
  import { statusSinkron, kodeKeluarga, mulaiSinkron, simpanSekarang, lepasKode } from './sinkron.js'
  import { trahDari } from './trah.js'
  import { bandingKode } from './urut.js'
  import TreeView from './TreeView.svelte'
  import Sheet from './Sheet.svelte'
  import PersonForm from './PersonForm.svelte'
  import DaftarKeluarga from './DaftarKeluarga.svelte'
  import { onMount, onDestroy, tick } from 'svelte'
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
        .sort(bandingKode)
        .slice(0, 12)

  $: byId = new Map($data.anggota.map((a) => [a.id, a]))

  /** @param {any} a @returns {string} */
  function hubungan(a) {
    const ayah = a.ayah ? byId.get(a.ayah) : null
    const ibu = a.ibu ? byId.get(a.ibu) : null
    if (ayah || ibu) return 'Anak dari ' + [ayah?.nama, ibu?.nama].filter(Boolean).join(' & ')
    const pasangan = (a.pasangan || []).map((/** @type {string} */ id) => byId.get(id)?.nama).filter(Boolean)
    if (pasangan.length) return 'Pasangan ' + pasangan.join(', ')
    return 'Akar keluarga'
  }

  // Fokus trah: sub-pohon dari orang yang dipilih (dirinya + pasangan + turunan).
  $: trahAktif = $ui.trahId ? trahDari($data.anggota, $ui.trahId) : null
  $: anakTrah = trahAktif ? trahAktif.anggota : null
  $: namaOrtuTrah = trahAktif
    ? [trahAktif.ortu.ayah, trahAktif.ortu.ibu]
        .map((/** @type {string|null} */ id) => (id ? byId.get(id)?.nama : null))
        .filter(Boolean)
        .join(' & ')
    : ''
  $: if ($ui.trahId && !trahAktif) ui.update((u) => ({ ...u, trahId: null, fokusId: null }))

  /** @param {string} id */
  function fokusTrah(id) {
    ui.update((u) => ({
      ...u,
      trahId: id,
      fokusId: id,
      tampilDaftar: false,
      sheetId: null,
      menuBuka: false,
    }))
    cari = ''
  }

  function tampilkanSemua() {
    ui.update((u) => ({ ...u, trahId: null, fokusId: null }))
  }

  /** @param {string} id */
  function bukaHasil(id) {
    fokusTrah(id)
  }

  /** @type {HTMLDivElement} */
  let menuWrap
  let tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  function mulaiAkar() {
    if ($ui.tampilDaftar) {
      const kode = get(kodeKeluarga)
      history.replaceState({}, '', kode ? '/?kode=' + encodeURIComponent(kode) : '/')
    }
    ui.update((u) => ({ ...u, tampilDaftar: false, form: { mode: 'akar' } }))
  }
  function toggleMenu() {
    ui.update((u) => ({ ...u, menuBuka: !u.menuBuka }))
  }
  function tutupMenu() {
    ui.update((u) => ({ ...u, menuBuka: false }))
  }
  async function gantiNama() {
    const nama = prompt('Nama keluarga:', $data.nama_keluarga)
    if (nama !== null && nama.trim()) {
      const bersih = nama.trim()
      gantiNamaKeluarga(bersih)
      const kode = get(kodeKeluarga)
      // Tampilkan nama baru di daftar segera; metadata KV menyusul setelah PUT.
      if (kode) {
        daftarKeluarga = daftarKeluarga.map((f) => (f.kode === kode ? { ...f, nama: bersih } : f))
      }
      // Nama ikut dokumen cloud; tunggu PUT selesai lalu segarkan metadata daftar.
      await simpanSekarang()
      if (get(kodeKeluarga)) muatDaftar()
    }
  }
  function gantiNamaMenu() {
    gantiNama()
    tutupMenu()
  }
  // Sesuaikan skala cetak dengan lebar kertas A3 landscape. Tanpa ini pohon
  // lebar (ribuan piksel) terpotong atau mengecil terlalu kecil.
  function siapkanCetak() {
    const pohon = /** @type {HTMLElement|null} */ (document.querySelector('.pohon'))
    if (!pohon) return
    const skalaLayar = Number(getComputedStyle(pohon).zoom) || 1
    const lebarAlami = pohon.getBoundingClientRect().width / skalaLayar
    const skalaCetak = Math.min(1, 1500 / Math.max(lebarAlami, 1))
    pohon.style.setProperty('--print-zoom', String(skalaCetak))
  }
  async function cetak() {
    tutupMenu()
    if (get(data).anggota.length === 0) {
      alert('Belum ada silsilah untuk dicetak.')
      return
    }
    // Menu tetap bisa dibuka dari dashboard; kembalikan dulu ke pohon supaya
    // hasil cetak tidak kosong.
    if ($ui.tampilDaftar) {
      ui.update((u) => ({ ...u, tampilDaftar: false }))
      await tick()
    }
    siapkanCetak()
    window.print()
  }
  // Mulai silsilah baru: dokumen kerja dikosongkan dan kode dilepas, jadi keluarga
  // berikutnya mendapat kode baru. Keluarga lama tetap di database dan bisa dibuka
  // lagi dari daftar. Simpan dulu perubahan terakhir supaya tidak hilang.
  async function silsilahBaru() {
    tutupMenu()
    if (
      !confirm(
        'Mulai silsilah baru?\n\nKeluarga yang sekarang tetap tersimpan di database dan bisa dibuka lagi dari daftar.',
      )
    )
      return
    if (get(data).anggota.length > 0) {
      await simpanSekarang()
      if (
        get(statusSinkron) === 'gagal' &&
        !confirm(
          'Data terakhir belum tersimpan ke cloud. Tetap mulai silsilah baru? Perubahan yang belum tersimpan hanya ada di perangkat ini.',
        )
      )
        return
    }
    hapusSemua()
    lepasKode()
    statusCloud = ''
    history.replaceState({}, '', '/')
    ui.update((u) => ({ ...u, tampilDaftar: false, trahId: null, fokusId: null }))
    muatDaftar()
    mulaiAkar()
  }

  // ---------- Cloud (kode keluarga sebagai kunci) ----------
  /** @param {MouseEvent} e */
  function klikDiLuar(e) {
    const t = /** @type {Node|null} */ (e.target)
    if ($ui.menuBuka && menuWrap && t && !menuWrap.contains(t)) tutupMenu()
  }

  // ---------- Dashboard berbasis database ----------
  // Sumber data utama tetap cloud KV (/api/data). Saat halaman dibuka:
  // - ?kode=... di alamat  -> ambil dokumen itu dari database bila berbeda
  // - kode tersimpan di perangkat -> ambil dari database bila perangkat masih kosong
  // Data lokal tidak pernah ditimpa diam-diam (selalu dikonfirmasi), tetapi
  // dokumen yang isinya sama persis tidak perlu konfirmasi lagi.
  let statusCloud = ''
  async function muatDariDatabase() {
    const dariUrl = new URLSearchParams(location.search).get('kode')
    const kodeTersimpan = localStorage.getItem('silsilah:kode') || ''
    const kode = (dariUrl || kodeTersimpan || '').trim().toLowerCase()
    if (!POLA_KODE.test(kode)) return
    const lokal = get(data)
    const lokalKosong = lokal.anggota.length === 0
    if (!dariUrl && !lokalKosong) return
    statusCloud = 'Memuat dari database cloud: ' + kode + '…'
    try {
      const obj = await ambilDariCloud(kode)
      const sama = JSON.stringify(obj) === JSON.stringify(lokal)
      if (!lokalKosong && !sama) {
        const samaKode = kode === kodeTersimpan.trim().toLowerCase()
        const pesan = samaKode
          ? 'Data cloud berbeda dari data di perangkat ini. Muat dari cloud?\n\nBatal = pertahankan data perangkat dan simpan ke cloud.'
          : 'Timpa data di perangkat ini dengan data cloud kode ' + kode + '?'
        if (!confirm(pesan)) {
          if (samaKode) simpanSekarang()
          return
        }
      }
      if (!sama && !muatJSON(obj)) {
        statusCloud = 'Database cloud tidak berisi dokumen silsilah.'
        return
      }
      localStorage.setItem('silsilah:kode', kode)
      kodeKeluarga.set(kode)
      if (!sama) ui.update((u) => ({ ...u, trahId: null, fokusId: null }))
      statusCloud = sama
        ? 'Dokumen di cloud dan perangkat sudah sama: ' + kode + '.'
        : 'Dimuat dari database cloud: ' + kode + ' (' + obj.anggota.length + ' orang).'
      setTimeout(() => {
        if (statusCloud.startsWith('Dokumen di cloud')) statusCloud = ''
        else if (statusCloud.startsWith('Dimuat')) statusCloud = ''
      }, 8000)
    } catch (e) {
      statusCloud = 'Gagal memuat dari database cloud: ' + /** @type {Error} */ (e).message
    }
  }

  // Daftar keluarga di database (tampil di layar kosong / dashboard).
  /** @type {{ kode: string, nama: string|null, jumlah: number|null }[]} */
  let daftarKeluarga = []
  let memuatDaftar = false
  let urutMuat = 0
  /**
   * KV `list()`/metadata bisa tertinggal beberapa saat setelah PUT. Pastikan
   * keluarga yang sedang dibuka selalu muncul dengan nama lokal terbaru.
   * @param {{ kode: string, nama: string|null, jumlah: number|null }[]} list
   */
  function gabungKeluargaAktif(list) {
    const kode = get(kodeKeluarga)
    const sekarang = get(data)
    if (!kode || sekarang.anggota.length === 0) return list
    const aktif = { kode, nama: sekarang.nama_keluarga, jumlah: sekarang.anggota.length }
    const i = list.findIndex((f) => f.kode === kode)
    if (i < 0) return [aktif, ...list]
    return list.map((f, j) => (j === i ? { ...f, ...aktif } : f))
  }
  async function muatDaftar() {
    const id = ++urutMuat
    memuatDaftar = true
    try {
      const l = await ambilDaftarKeluarga()
      if (id === urutMuat) daftarKeluarga = gabungKeluargaAktif(l)
    } catch {
      // Biarkan daftar lama tampil; pengguna bisa mencoba lagi dengan membuka dashboard.
    } finally {
      if (id === urutMuat) memuatDaftar = false
    }
  }
  onMount(() => {
    window.addEventListener('beforeprint', siapkanCetak)
    const daftarUrl = new URLSearchParams(location.search).get('daftar') === '1'
    if (daftarUrl) ui.update((u) => ({ ...u, tampilDaftar: true }))
    muatDariDatabase()
    if (daftarUrl || get(data).anggota.length === 0) muatDaftar()
    return () => window.removeEventListener('beforeprint', siapkanCetak)
  })
  onDestroy(mulaiSinkron()) // autosave aktif selama komponen hidup

  function keDaftar() {
    tutupMenu()
    cari = ''
    history.replaceState({}, '', '/?daftar=1')
    ui.update((u) => ({ ...u, tampilDaftar: true, menuBuka: false }))
    muatDaftar()
  }
  function tutupDaftar() {
    const kode = get(kodeKeluarga)
    history.replaceState({}, '', kode ? '/?kode=' + encodeURIComponent(kode) : '/')
    ui.update((u) => ({ ...u, tampilDaftar: false }))
  }

  /**
   * Buka keluarga dari daftar tanpa memuat ulang halaman. Perubahan yang masih
   * tertunda didorong dulu, jadi tidak ada dokumen yang hilang hanya karena
   * berpindah keluarga.
   * @param {string} kode
   */
  async function bukaDariDaftar(kode) {
    const aktif = get(kodeKeluarga)
    if (kode === aktif && get(data).anggota.length > 0) {
      tutupDaftar()
      return
    }
    if (get(data).anggota.length > 0) {
      await simpanSekarang()
      if (get(statusSinkron) === 'gagal') {
        alert('Data keluarga yang sekarang belum tersimpan ke cloud. Sambungkan internet lalu coba lagi.')
        return
      }
      if (
        !confirm(
          'Buka keluarga ' + kode + '?\n\nDokumen yang sedang dibuka akan diganti. Data sudah tersimpan di cloud.',
        )
      )
        return
    }
    statusCloud = 'Memuat dari database cloud: ' + kode + '…'
    try {
      const obj = await ambilDariCloud(kode)
      if (!muatJSON(obj)) {
        statusCloud = 'Database cloud tidak berisi dokumen silsilah.'
        return
      }
      localStorage.setItem('silsilah:kode', kode)
      kodeKeluarga.set(kode)
      history.replaceState({}, '', '/?kode=' + encodeURIComponent(kode))
      ui.update((u) => ({
        ...u,
        tampilDaftar: false,
        trahId: null,
        fokusId: null,
        menuBuka: false,
      }))
      statusCloud = 'Dimuat dari database cloud: ' + kode + ' (' + obj.anggota.length + ' orang).'
      setTimeout(() => {
        if (statusCloud.startsWith('Dimuat')) statusCloud = ''
      }, 8000)
    } catch (e) {
      statusCloud = 'Gagal memuat dari database cloud: ' + /** @type {Error} */ (e).message
      alert(statusCloud)
    }
  }

  /**
   * Hapus satu keluarga dari database. Dokumen di cloud hilang permanen;
   * jika yang dihapus adalah keluarga yang sedang dibuka, dokumen kerja di
   * perangkat juga dibersihkan dan kode dilepas.
   * @param {{ kode: string, nama: string|null, jumlah: number|null }} f
   */
  async function hapusKeluarga(f) {
    const nama = f.nama || f.kode
    if (
      !confirm(
        `Hapus silsilah "${nama}" (kode ${f.kode})?\n\n` +
          'Data di cloud akan dihapus permanen dan tidak bisa dikembalikan.\n\n' +
          'Klik OK (Ya) untuk menghapus.',
      )
    )
      return

    try {
      // Jangan biarkan PUT yang masih berjalan menulis ulang dokumen setelah DELETE.
      if (f.kode === get(kodeKeluarga)) await simpanSekarang()
      await hapusDariCloud(f.kode)
      daftarKeluarga = daftarKeluarga.filter((x) => x.kode !== f.kode)
      if (f.kode === get(kodeKeluarga)) {
        hapusSemua()
        lepasKode()
        statusCloud = ''
        history.replaceState({}, '', '/?daftar=1')
        ui.update((u) => ({
          ...u,
          tampilDaftar: true,
          trahId: null,
          fokusId: null,
        }))
      }
      statusCloud = `Silsilah "${nama}" dihapus.`
      setTimeout(() => {
        if (statusCloud.startsWith('Silsilah')) statusCloud = ''
      }, 6000)
    } catch (e) {
      alert('Gagal menghapus silsilah: ' + /** @type {Error} */ (e).message)
    }
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
  <button class="nama-keluarga" on:click={gantiNama} title="Ganti nama keluarga">
    <span class="nama-teks">{$data.nama_keluarga}</span>
    <span class="ikon-edit" aria-hidden="true">✏️</span>
  </button>
  <div class="toolbar-aksi">
    <button class="tombol-daftar" on:click={keDaftar} title="Daftar keluarga" aria-label="Daftar keluarga">🏠</button>
    <div class="menu" bind:this={menuWrap}>
      <button class="tombol-menu" on:click={toggleMenu} aria-expanded={$ui.menuBuka}>☰ Menu</button>
      {#if $ui.menuBuka}
        <div class="menu-panel">
          <button on:click={keDaftar}>🏠 Daftar Keluarga</button>
          <button class="utama" on:click={() => { mulaiAkar(); tutupMenu() }}>👤 Tambah Orang</button>
          <button on:click={gantiNamaMenu}>✏️ Ganti Nama Keluarga</button>
          <button on:click={() => { unduhCSV(); tutupMenu() }}>📊 Unduh CSV</button>
          <button on:click={cetak}>🖨️ Cetak / PDF</button>
        </div>
      {/if}
    </div>
  </div>
</header>

{#if statusCloud}
  <p class="status-cloud" role="status">{statusCloud}</p>
{/if}

{#if !$ui.tampilDaftar && $data.anggota.length > 0 && $kodeKeluarga}
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

{#if !$ui.tampilDaftar && $data.anggota.length > 0}
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
              <span class="hasil-nama">{a.nama}{#if a.kode}<span class="hasil-kode">&nbsp;· {a.kode}</span>{/if}</span>
              <small>{hubungan(a)}</small>
            </button>
          {/each}
        </div>
      {:else}
        <p class="hasil-kosong">Tidak ada yang cocok.</p>
      {/if}
    {/if}
  </div>
{/if}

{#if !$ui.tampilDaftar && trahAktif}
  <div class="fokus-trah" role="status">
    <div class="fokus-info">
      <strong>🌳 Trah {trahAktif.nama}</strong>
      <span>{trahAktif.jumlah} orang</span>
      {#if namaOrtuTrah}<small>Anak dari {namaOrtuTrah}</small>{/if}
    </div>
    {#if trahAktif.saudara.length > 0}
      <div class="fokus-saudara">
        <span class="saudara-label">Saudara:</span>
        <div class="saudara-chips">
          {#each trahAktif.saudara.slice(0, 8) as s (s.id)}
            <button class="chip-kecil" on:click={() => fokusTrah(s.id)}>{s.nama}</button>
          {/each}
          {#if trahAktif.saudara.length > 8}
            <span class="saudara-label">+{trahAktif.saudara.length - 8}</span>
          {/if}
        </div>
      </div>
    {/if}
    <button class="fokus-kembali" on:click={tampilkanSemua}>↩️ Kembali ke Silsilah</button>
  </div>
{/if}

{#if !$ui.tampilDaftar && $data.anggota.length > 0}
  <div class="cetak-kepala">
    <h1>{$data.nama_keluarga}</h1>
    {#if trahAktif}
      <p>Trah {trahAktif.nama} · {trahAktif.jumlah} orang</p>
    {:else}
      <p>{$data.anggota.length} orang</p>
    {/if}
    <p class="cetak-tanggal">Dicetak {tanggalCetak}</p>
  </div>
{/if}

<main>
  {#if $ui.tampilDaftar}
    <div class="layar-kosong daftar-layar">
      <h2>Daftar Keluarga</h2>
      <p class="petunjuk">Pilih silsilah yang sudah tersimpan di database, atau mulai yang baru.</p>
      {#if $data.anggota.length > 0}
        <button class="besar" on:click={tutupDaftar}>↩️ Kembali ke {$data.nama_keluarga}</button>
      {/if}
      <button class="besar" on:click={silsilahBaru}>➕ Silsilah Baru</button>
      {#if memuatDaftar}
        <p class="petunjuk">Memuat daftar…</p>
      {:else if daftarKeluarga.length > 0}
        <DaftarKeluarga
          daftar={daftarKeluarga}
          aktif={$kodeKeluarga}
          buka={bukaDariDaftar}
          hapus={hapusKeluarga}
        />
      {:else}
        <p class="petunjuk">Belum ada keluarga di database.</p>
      {/if}
    </div>
  {:else if $data.anggota.length === 0}
    <div class="layar-kosong">
      <p class="petunjuk">
        Catat anggota keluarga dengan cara yang mudah. Data tersimpan otomatis di perangkat ini.
      </p>
      <button class="besar" on:click={mulaiAkar}>➕ Mulai: Orang Pertama</button>
      {#if daftarKeluarga.length > 0}
        <p class="petunjuk">atau buka silsilah yang sudah tersimpan di database:</p>
        <DaftarKeluarga
          daftar={daftarKeluarga}
          aktif={$kodeKeluarga}
          buka={bukaDariDaftar}
          hapus={hapusKeluarga}
        />
      {/if}
    </div>
  {:else}
    <TreeView anggota={anakTrah} />
  {/if}
</main>

<Sheet />
<PersonForm />
