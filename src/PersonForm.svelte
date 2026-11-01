<script>
  import { data, ui, tambahAkar, tambahAnak, tambahPasangan, perbarui, ortuAnakDari, setOrtu, tautkanPasangan } from './store.js'

  /**
   * @import { FormUI } from './store.js'
   */

  let nama = ''
  let gender = /** @type {'L'|'P'|''} */ ('')
  let lahir = ''
  let wafat = ''
  let catatan = ''
  let kode = ''
  let tempatLahir = ''
  let alamat = ''
  let pekerjaan = ''
  /** @type {string} */
  let pilihan = '' // id pasangan terpilih, '' = (tanpa pasangan)
  /** @type {{ ayah: string|null, ibu: string|null } | null} */
  let ortu = null
  /** @type {string} */
  let pilihAyah = '' // mode 'ortu'
  /** @type {string} */
  let pilihIbu = ''
  /** @type {string} */
  let pilihPasang = '' // mode 'pasang'
  let cariPasang = ''
  let cariOrtu = '' // mode 'ortu'
  /** @type {'ayah'|'ibu'} */
  let peranOrtu = 'ayah'
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
      kode = form.mode === 'edit' ? target?.kode || '' : ''
      tempatLahir = form.mode === 'edit' ? target?.tempat_lahir || '' : ''
      alamat = form.mode === 'edit' ? target?.alamat || '' : ''
      pekerjaan = form.mode === 'edit' ? target?.pekerjaan || '' : ''
      pilihan = form.mode === 'anak' && form.kandidat?.length ? form.kandidat[0] : ''
      ortu = form.mode === 'anak' ? (form.ortu ?? null) : null
      pilihAyah = form.mode === 'ortu' ? target?.ayah || '' : ''
      pilihIbu = form.mode === 'ortu' ? target?.ibu || '' : ''
      pilihPasang = ''
      cariPasang = ''
      cariOrtu = ''
      peranOrtu = target?.ayah && !target?.ibu ? 'ibu' : 'ayah'
    }
  }

  $: namaAyah = ortu?.ayah ? byId.get(ortu.ayah)?.nama || '?' : null
  $: namaIbu = ortu?.ibu ? byId.get(ortu.ibu)?.nama || '?' : null

  // Kandidat sambung: semua orang lain, selain diri sendiri; untuk 'pasang',
  // buang yang sudah jadi pasangan target. Urut alfabetis agar dropdown besar
  // tetap mudah dipindai; pencarian menyaring berdasarkan nama/kode.
  /** @param {import('./store.js').Anggota} a @param {string} kata @returns {boolean} */
  function cocokCari(a, kata) {
    return (
      a.nama.toLowerCase().includes(kata) ||
      (a.kode || '').toLowerCase().includes(kata)
    )
  }

  $: anggotaLain = form?.targetId
    ? $data.anggota
        .filter((a) => a.id !== form.targetId)
        .sort(
          (a, b) =>
            a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }) ||
            (a.kode || '').localeCompare(b.kode || '', 'id', { numeric: true }),
        )
    : []
  $: kandidatPasang = (() => {
    const tid = form?.targetId
    if (!tid) return []
    const pasanganTarget = byId.get(tid)?.pasangan || []
    return anggotaLain.filter((a) => !pasanganTarget.includes(a.id))
  })()
  $: kataPasang = cariPasang.trim().toLowerCase()
  $: kandidatPasangTampil = !kataPasang
    ? kandidatPasang
    : kandidatPasang.filter((a) => cocokCari(a, kataPasang))

  $: kataOrtu = cariOrtu.trim().toLowerCase()
  $: kandidatOrtu = !kataOrtu
    ? anggotaLain
    : anggotaLain.filter((a) => cocokCari(a, kataOrtu))

  /** @param {'ayah'|'ibu'} peran @param {string} id */
  function pilihOrtu(peran, id) {
    if (peran === 'ayah') pilihAyah = id
    else pilihIbu = id
  }

  /** @param {'ayah'|'ibu'} peran */
  function kosongkanOrtu(peran) {
    if (peran === 'ayah') pilihAyah = ''
    else pilihIbu = ''
  }

  // Kode duplikat diizinkan (user yang mengetik), tapi diperingatkan di form.
  $: duplikat = kode.trim()
    ? $data.anggota.find((a) => a.id !== form?.targetId && (a.kode || '') === kode.trim())
    : null

  const JUDUL = { akar: 'Tambah Orang Baru', anak: 'Tambah Anak', pasangan: 'Tambah Pasangan', edit: 'Edit Anggota', ortu: 'Jadikan Anak Dari', pasang: 'Pasangkan dengan' }

  function ubahPilihan() {
    if (!form) return
    ortu = ortuAnakDari(form.targetId, pilihan || null)
  }

  function batal() {
    ui.update((u) => ({ ...u, form: null }))
  }

  /** @param {KeyboardEvent} e */
  function tekan(e) {
    if (e.key === 'Escape' && form) batal()
  }

  function simpan() {
    if (!form) return
    const fields = {
      nama: nama.trim(),
      gender,
      lahir: lahir.trim(),
      wafat: wafat.trim(),
      catatan: catatan.trim(),
      kode: kode.trim(),
      tempat_lahir: tempatLahir.trim(),
      alamat: alamat.trim(),
      pekerjaan: pekerjaan.trim(),
    }
    if (form.mode === 'akar') tambahAkar(fields)
    else if (form.mode === 'anak' && ortu) tambahAnak(ortu.ayah, ortu.ibu, fields)
    else if (form.mode === 'pasangan' && form.targetId) tambahPasangan(form.targetId, fields)
    else if (form.mode === 'edit' && form.targetId) perbarui(form.targetId, fields)
    else if (form.mode === 'ortu' && form.targetId)
      setOrtu(form.targetId, pilihAyah || null, pilihIbu || null)
    else if (form.mode === 'pasang' && form.targetId && pilihPasang)
      tautkanPasangan(form.targetId, pilihPasang)
    // Tutup form saja; sheet yang sedang terbuka tetap tampil dengan data terbaru
    // (edit → kader ter-update; tambah anak/pasangan → bisa langsung menambah lagi).
    ui.update((u) => ({ ...u, form: null }))
  }
</script>

<svelte:window on:keydown={tekan} />

{#if form}
  <div class="lapis form-di-atas" role="presentation" on:click={batal}>
    <section class="panel-bawah form-di-atas" aria-label={JUDUL[form.mode]} on:click|stopPropagation>
      <header class="panel-kepala">
        <h2>{JUDUL[form.mode]}</h2>
        <button class="tutup" on:click={batal} aria-label="Batal">✕</button>
      </header>

      <form on:submit|preventDefault={simpan}>
        {#if form.mode === 'ortu'}
          <div class="medan">
            <span class="label-medan">Pilihan orang tua</span>
            <div class="pilih-terpilih">
              <div class="pilih-ringkas">
                <span>Ayah</span>
                <strong>{pilihAyah ? byId.get(pilihAyah)?.nama || '?' : '(tidak diketahui)'}</strong>
                {#if pilihAyah}
                  <button
                    type="button"
                    class="pilih-hapus"
                    aria-label="Kosongkan ayah"
                    on:click={() => kosongkanOrtu('ayah')}
                  >✕</button>
                {/if}
              </div>
              <div class="pilih-ringkas">
                <span>Ibu</span>
                <strong>{pilihIbu ? byId.get(pilihIbu)?.nama || '?' : '(tidak diketahui)'}</strong>
                {#if pilihIbu}
                  <button
                    type="button"
                    class="pilih-hapus"
                    aria-label="Kosongkan ibu"
                    on:click={() => kosongkanOrtu('ibu')}
                  >✕</button>
                {/if}
              </div>
            </div>
          </div>

          <div class="medan">
            <label for="f-cari-ortu">Cari orang</label>
            <input
              id="f-cari-ortu"
              type="search"
              placeholder="Ketik nama atau kode…"
              autocomplete="off"
              bind:value={cariOrtu}
            />
          </div>

          <div class="medan">
            <span class="label-medan">Pilih untuk</span>
            <div class="pilih-peran" role="group" aria-label="Pilih untuk">
              <button
                type="button"
                class:aktif={peranOrtu === 'ayah'}
                aria-pressed={peranOrtu === 'ayah'}
                aria-label="Pilih untuk Ayah"
                on:click={() => (peranOrtu = 'ayah')}
              >Ayah</button>
              <button
                type="button"
                class:aktif={peranOrtu === 'ibu'}
                aria-pressed={peranOrtu === 'ibu'}
                aria-label="Pilih untuk Ibu"
                on:click={() => (peranOrtu = 'ibu')}
              >Ibu</button>
            </div>
          </div>

          {#if kandidatOrtu.length === 0}
            <p class="info-pembaca">Tidak ada nama yang cocok.</p>
          {:else}
            <p class="info-pembaca">{kandidatOrtu.length} orang, urut A–Z.</p>
            <ul class="pilih-hasil" aria-label="Hasil pencarian orang tua">
              {#each kandidatOrtu as a (a.id)}
                <li>
                  <button
                    type="button"
                    class="pilih-baris"
                    class:terpilih={pilihAyah === a.id || pilihIbu === a.id}
                    aria-pressed={peranOrtu === 'ayah' ? pilihAyah === a.id : pilihIbu === a.id}
                    aria-label={`Pilih ${a.nama}${a.kode ? ' ' + a.kode : ''} sebagai ${peranOrtu}`}
                    on:click={() => pilihOrtu(peranOrtu, a.id)}
                  >
                    <span class="pilih-nama">{a.nama}</span>
                    {#if a.kode}<span class="pilih-kode">{a.kode}</span>{/if}
                    {#if pilihAyah === a.id}<span class="pilih-tanda">Ayah ✓</span>{/if}
                    {#if pilihIbu === a.id}<span class="pilih-tanda">Ibu ✓</span>{/if}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}

          <p class="info-pembaca">
            Menyambungkan ke orang tua memindahkan {byId.get(form.targetId || '')?.nama || 'orang ini'} ke pohon orang tua tsb. Kosongkan pilihan untuk melepaskan kembali.
          </p>
        {:else if form.mode === 'pasang'}
          <div class="medan">
            <label for="f-cari-pasang">Cari orang</label>
            <input
              id="f-cari-pasang"
              type="search"
              placeholder="Ketik nama atau kode…"
              autocomplete="off"
              bind:value={cariPasang}
            />
          </div>

          <div class="medan">
            <span class="label-medan">Pasangan</span>
            <div class="pilih-terpilih">
              <div class="pilih-ringkas">
                <strong>{pilihPasang ? byId.get(pilihPasang)?.nama || '?' : '(belum dipilih)'}</strong>
                {#if pilihPasang}
                  <button
                    type="button"
                    class="pilih-hapus"
                    aria-label="Kosongkan pilihan pasangan"
                    on:click={() => (pilihPasang = '')}
                  >✕</button>
                {/if}
              </div>
            </div>
          </div>

          {#if kandidatPasangTampil.length === 0}
            <p class="info-pembaca">Tidak ada nama yang cocok.</p>
          {:else}
            <p class="info-pembaca">{kandidatPasangTampil.length} orang, urut A–Z.</p>
            <ul class="pilih-hasil" aria-label="Hasil pencarian pasangan">
              {#each kandidatPasangTampil as a (a.id)}
                <li>
                  <button
                    type="button"
                    class="pilih-baris"
                    class:terpilih={pilihPasang === a.id}
                    aria-pressed={pilihPasang === a.id}
                    aria-label={`Pilih ${a.nama}${a.kode ? ' ' + a.kode : ''} sebagai pasangan`}
                    on:click={() => (pilihPasang = a.id)}
                  >
                    <span class="pilih-nama">{a.nama}</span>
                    {#if a.kode}<span class="pilih-kode">{a.kode}</span>{/if}
                    {#if pilihPasang === a.id}<span class="pilih-tanda">✓</span>{/if}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        {:else}
        <div class="medan">
          <label for="f-nama">Nama</label>
          <input id="f-nama" type="text" required bind:value={nama} />
        </div>

        <div class="medan">
          <label for="f-kode">Kode</label>
          <input id="f-kode" type="text" placeholder="mis. A1, A1P1, A1P1B1" bind:value={kode} />
        </div>
        {#if duplikat}
          <p class="peringatan-kode">⚠ Kode ini juga dipakai oleh {duplikat.nama}. Boleh disimpan, asal tidak tertukar.</p>
        {/if}

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
          <label for="f-tempat">Tempat Lahir</label>
          <input id="f-tempat" type="text" placeholder="mis. Klaten" bind:value={tempatLahir} />
        </div>

        <div class="medan">
          <label for="f-lahir">Tanggal Lahir</label>
          <input id="f-lahir" type="text" placeholder="mis. 12 Juli 1970 atau ±1970" bind:value={lahir} />
        </div>

        <div class="medan">
          <label for="f-alamat">Alamat</label>
          <input id="f-alamat" type="text" placeholder="mis. Jl. Kenanga 12, Yogyakarta" bind:value={alamat} />
        </div>

        <div class="medan">
          <label for="f-pekerjaan">Pekerjaan / Sekolah</label>
          <input id="f-pekerjaan" type="text" placeholder="mis. Guru SD / SMA kelas 2" bind:value={pekerjaan} />
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
        {/if}

        <div class="tombol-form">
          <button class="hijau" type="submit" disabled={form.mode === 'pasang' && !pilihPasang}>Simpan</button>
          <button type="button" on:click={batal}>Batal</button>
        </div>
      </form>
    </section>
  </div>
{/if}
