<script>
  import { data, ui, hapus, pisahkanPasangan, ortuAnakDari } from './store.js'
  import { unduhKeturunanCSV } from './export.js'

  function tutup() {
    ui.update((u) => ({ ...u, sheetId: null }))
  }
  // Escape menutup kader; bila form juga terbuka, form yang ditutup duluan.
  /** @param {KeyboardEvent} e */
  function tekan(e) {
    if (e.key === 'Escape' && org && !$ui.form) tutup()
  }
  /** @param {string} id */
  function buka(id) {
    ui.update((u) => ({ ...u, sheetId: id }))
  }

  $: byId = new Map($data.anggota.map((a) => [a.id, a]))
  $: org = $ui.sheetId ? byId.get($ui.sheetId) : null
  $: pasanganEksis = org ? (org.pasangan || []).filter((id) => byId.has(id)) : []
  $: ayah = org?.ayah ? byId.get(org.ayah) : null
  $: ibu = org?.ibu ? byId.get(org.ibu) : null
  $: anak = org ? $data.anggota.filter((c) => c.ayah === org.id || c.ibu === org.id) : []
  $: idAnak = new Set(anak.map((a) => a.id))
  $: cucu = org ? $data.anggota.filter((c) => idAnak.has(c.ayah ?? '') || idAnak.has(c.ibu ?? '')) : []

  function tambahAnakKlik() {
    if (!org) return
    const ortu = ortuAnakDari(org.id, pasanganEksis[0] || null)
    ui.update((u) => ({
      ...u,
      form: { mode: 'anak', targetId: org.id, ortu, kandidat: pasanganEksis },
    }))
  }
  function tambahPasanganKlik() {
    if (!org) return
    ui.update((u) => ({ ...u, form: { mode: 'pasangan', targetId: org.id } }))
  }
  function hubungOrtuKlik() {
    if (!org) return
    ui.update((u) => ({ ...u, form: { mode: 'ortu', targetId: org.id } }))
  }
  function hubungPasanganKlik() {
    if (!org) return
    ui.update((u) => ({ ...u, form: { mode: 'pasang', targetId: org.id } }))
  }
  function editKlik() {
    if (!org) return
    ui.update((u) => ({ ...u, form: { mode: 'edit', targetId: org.id } }))
  }
  function keturunanKlik() {
    if (org) unduhKeturunanCSV(org.id)
  }
  function hapusKlik() {
    if (!org) return
    if (confirm(`Hapus ${org.nama}? Anak dan pasangan tidak ikut terhapus.`)) {
      hapus(org.id)
      tutup()
    }
  }
</script>

<svelte:window on:keydown={tekan} />

{#if org}
  <div class="lapis" role="presentation" on:click={tutup}>
    <section class="panel-bawah" aria-label={`Data ${org.nama}`} on:click|stopPropagation>
      <header class="panel-kepala">
        <h2>{org.nama}{#if org.kode}{' '}<span class="kode">{org.kode}</span>{/if}</h2>
        <button class="tutup" on:click={tutup} aria-label="Tutup">✕</button>
      </header>

      {#if org.tempat_lahir || org.lahir}
        <p class="baris-info">Lahir: {[org.tempat_lahir, org.lahir].filter(Boolean).join(', ')}</p>
      {/if}
      {#if org.wafat}<p class="baris-info">Wafat: {org.wafat}</p>{/if}
      {#if org.alamat}<p class="baris-info">Alamat: {org.alamat}</p>{/if}
      {#if org.pekerjaan}<p class="baris-info">Pekerjaan: {org.pekerjaan}</p>{/if}
      {#if org.catatan}<p class="baris-info redup">📝 {org.catatan}</p>{/if}
      {#if ayah || ibu}
        <p class="baris-info">Orang tua: {ayah ? ayah.nama : '?'} &amp; {ibu ? ibu.nama : '?'}</p>
      {/if}

      {#if pasanganEksis.length > 0}
        <div class="grup">
          <span class="label">Pasangan:</span>
          {#each pasanganEksis as pid (pid)}
            <span class="chip">
              <button class="chip-nama" on:click={() => buka(pid)}>{byId.get(pid)?.nama}</button>
              <button
                class="chip-x"
                on:click={() => pisahkanPasangan(org.id, pid)}
                aria-label={`Pisahkan pasangan dengan ${byId.get(pid)?.nama ?? ''}`}
              >✕</button>
            </span>
          {/each}
        </div>
      {/if}

      {#if anak.length > 0}
        <div class="grup">
          <span class="label">Anak ({anak.length}):</span>
          {#each anak as c (c.id)}
            <button class="chip-tunggal" on:click={() => buka(c.id)}>{c.nama}</button>
          {/each}
        </div>
      {/if}

      {#if cucu.length > 0}
        <div class="grup">
          <span class="label">Cucu ({cucu.length}):</span>
          {#each cucu as c (c.id)}
            <button class="chip-tunggal" on:click={() => buka(c.id)}>{c.nama}</button>
          {/each}
        </div>
      {/if}

      <div class="aksi">
        <button class="lebar" on:click={tambahAnakKlik}>➕ Tambah Anak</button>
        <button on:click={tambahPasanganKlik}>💑 Tambah Pasangan</button>
        <button on:click={hubungOrtuKlik}>🔗 Jadikan Anak…</button>
        <button on:click={hubungPasanganKlik}>💑 Pasangkan dengan…</button>
        <button on:click={keturunanKlik}>📊 Tabel Keturunan</button>
        <button on:click={editKlik}>✏️ Edit</button>
        <button class="bahaya lebar" on:click={hapusKlik}>🗑️ Hapus</button>
      </div>
    </section>
  </div>
{/if}
