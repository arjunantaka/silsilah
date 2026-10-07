<script>
  import { data, ui, tambahAkar, tambahAnak, tambahPasangan, perbarui, ortuAnakDari } from './store.js'

  /**
   * @import { FormUI } from './store.js'
   */

  let nama = ''
  let gender = /** @type {'L'|'P'|''} */ ('')
  let lahir = ''
  let wafat = ''
  let catatan = ''
  /** @type {string} */
  let pilihan = '' // id pasangan terpilih, '' = (tanpa pasangan)
  /** @type {{ ayah: string|null, ibu: string|null } | null} */
  let ortu = null
  /** @type {FormUI|null} */
  let formTerakhir = null

  $: form = $ui.form
  $: byId = new Map($data.anggota.map((a) => [a.id, a]))

  // Reset isi form setiap kali ui.form diganti dengan form baru.
  $: if (form !== formTerakhir) {
    formTerakhir = form
    if (form) {
      const target = form.targetId ? byId.get(form.targetId) : null
      nama = form.mode === 'edit' ? target?.nama || '' : ''
      gender = form.mode === 'edit' ? target?.gender || '' : ''
      lahir = form.mode === 'edit' ? target?.lahir || '' : ''
      wafat = form.mode === 'edit' ? target?.wafat || '' : ''
      catatan = form.mode === 'edit' ? target?.catatan || '' : ''
      pilihan = form.mode === 'anak' && form.kandidat?.length ? form.kandidat[0] : ''
      ortu = form.mode === 'anak' ? (form.ortu ?? null) : null
    }
  }

  $: namaAyah = ortu?.ayah ? byId.get(ortu.ayah)?.nama || '?' : null
  $: namaIbu = ortu?.ibu ? byId.get(ortu.ibu)?.nama || '?' : null

  const JUDUL = { akar: 'Tambah Orang Pertama', anak: 'Tambah Anak', pasangan: 'Tambah Pasangan', edit: 'Edit Anggota' }

  function ubahPilihan() {
    if (!form) return
    ortu = ortuAnakDari(form.targetId, pilihan || null)
  }

  function batal() {
    ui.update((u) => ({ ...u, form: null }))
  }

  function simpan() {
    if (!form) return
    const fields = {
      nama: nama.trim(),
      gender,
      lahir: lahir.trim(),
      wafat: wafat.trim(),
      catatan: catatan.trim(),
    }
    if (form.mode === 'akar') tambahAkar(fields)
    else if (form.mode === 'anak' && ortu) tambahAnak(ortu.ayah, ortu.ibu, fields)
    else if (form.mode === 'pasangan' && form.targetId) tambahPasangan(form.targetId, fields)
    else if (form.mode === 'edit' && form.targetId) perbarui(form.targetId, fields)
    // Tutup form saja; sheet yang sedang terbuka tetap tampil dengan data terbaru
    // (edit → kader ter-update; tambah anak/pasangan → bisa langsung menambah lagi).
    ui.update((u) => ({ ...u, form: null }))
  }
</script>

{#if form}
  <div class="lapis form-di-atas" role="presentation" on:click={batal}>
    <section class="panel-bawah form-di-atas" aria-label={JUDUL[form.mode]} on:click|stopPropagation>
      <header class="panel-kepala">
        <h2>{JUDUL[form.mode]}</h2>
        <button class="tutup" on:click={batal} aria-label="Batal">✕</button>
      </header>

      <form on:submit|preventDefault={simpan}>
        <div class="medan">
          <label for="f-nama">Nama</label>
          <input id="f-nama" type="text" required bind:value={nama} />
        </div>

        <div class="medan">
          <span class="label-medan">Gender</span>
          <div class="radio-baris" role="radiogroup" aria-label="Gender">
            <label class:aktif={gender === 'L'}>
              <input type="radio" bind:group={gender} value="L" /> Laki-laki
            </label>
            <label class:aktif={gender === 'P'}>
              <input type="radio" bind:group={gender} value="P" /> Perempuan
            </label>
            <label class:aktif={gender === ''}>
              <input type="radio" bind:group={gender} value="" /> (kosong)
            </label>
          </div>
        </div>

        <div class="medan">
          <label for="f-lahir">Lahir</label>
          <input id="f-lahir" type="text" placeholder="mis. 12 Juli 1970 atau ±1970" bind:value={lahir} />
        </div>

        <div class="medan">
          <label for="f-wafat">Wafat</label>
          <input id="f-wafat" type="text" placeholder="kosongkan jika masih hidup" bind:value={wafat} />
        </div>

        <div class="medan">
          <label for="f-catatan">Catatan</label>
          <textarea id="f-catatan" bind:value={catatan}></textarea>
        </div>

        {#if form.mode === 'anak' && ortu}
          <p class="info-pembaca">
            Orang tua: {namaAyah || '(tidak diketahui)'} &amp; {namaIbu || '(tidak diketahui)'}
          </p>
          {#if form.kandidat && form.kandidat.length > 0}
            <div class="medan">
              <label for="f-pasangan">Anak dari pasangan:</label>
              <select id="f-pasangan" bind:value={pilihan} on:change={ubahPilihan}>
                {#each form.kandidat as kid (kid)}
                  <option value={kid}>{byId.get(kid)?.nama || '?'}</option>
                {/each}
                <option value="">(tanpa pasangan)</option>
              </select>
            </div>
          {/if}
        {/if}

        <div class="tombol-form">
          <button class="hijau" type="submit">Simpan</button>
          <button type="button" on:click={batal}>Batal</button>
        </div>
      </form>
    </section>
  </div>
{/if}
