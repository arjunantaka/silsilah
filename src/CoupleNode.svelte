<script>
  import { data, ui } from './store.js'
  import CoupleNode from './CoupleNode.svelte'
  import { bandingKode } from './urut.js'

  /**
   * @import { Anggota } from './store.js'
   */

  /** @type {string} */
  export let anchorId
  /** @type {string[]} */
  export let jalur = []
  // `anggota` opsional: mode fokus trah menggambar sub-pohon hasil trahDari().
  /** @type {import('./store.js').Anggota[]|null} */
  export let anggota = null

  $: daftar = anggota ?? $data.anggota
  $: byId = new Map(daftar.map((a) => [a.id, a]))
  $: anchor = byId.get(anchorId)

  // Pengaman siklus (file impor bisa rusak): anchor sudah di jalur -> kotak saja.
  $: siklus = jalur.includes(anchorId)

  /** @param {Anggota|undefined} a @returns {boolean} */
  function punyaOrtu(a) {
    return !!a && (a.ayah !== null || a.ibu !== null)
  }

  // Pemilik baris seorang anak: orang tua yang punya orang tua sendiri, yaitu
  // yang benar-benar digambar di pohon ini. Bila keduanya punya, ayah menang;
  // bila tak ada yang punya, ayah tetap menang supaya hasilnya tunggal.
  // Satu anak selalu punya tepat satu pemilik - inilah kunci anti-kotak-dobel.
  /** @param {Anggota} c @returns {string|null} */
  function pemilik(c) {
    const ayah = c.ayah ? byId.get(c.ayah) : null
    const ibu = c.ibu ? byId.get(c.ibu) : null
    if (ayah && punyaOrtu(ayah)) return ayah.id
    if (ibu && punyaOrtu(ibu)) return ibu.id
    return ayah ? ayah.id : ibu ? ibu.id : null
  }

  // Pasangan yang digambar di baris ini: hanya yang tidak punya orang tua sendiri
  // (menantu). Pasangan yang punya orang tua sudah digambar di bawah orang tuanya,
  // jadi menggambarnya lagi di sini akan membuat kotak dobel.
  /** @param {Anggota|undefined} a @param {boolean} luar @returns {Anggota[]} */
  function pasanganDari(a, luar) {
    if (!a) return []
    /** @type {Anggota[]} */
    const hasil = []
    for (const id of a.pasangan || []) {
      const p = byId.get(id)
      if (p && punyaOrtu(p) === luar) hasil.push(p)
    }
    return hasil
  }
  $: pasanganMasuk = pasanganDari(anchor, false).sort(bandingKode)
  $: pasanganLuar = pasanganDari(anchor, true).sort(bandingKode)

  // Satu baris per pasangan yang masuk; bila tidak ada pasangan, satu baris tunggal.
  // Kotak anchor digambar penuh di baris pertama; di baris berikutnya anchor muncul
  // sebagai acuan bernama + simbol ⚭, supaya pasangan ke-2 tetap terlihat tersambung
  // tanpa menggambar kotaknya dua kali.
  $: baris = siklus ? [] : pasanganMasuk.length ? pasanganMasuk.map((p) => ({ a: anchorId, s: p.id })) : [{ a: anchorId, s: null }]

  // Anak dari satu baris: pemiliknya anchor atau pasangan yang masuk, dan
  // pasangannya (orang tua satunya) menentukan baris mana. Bila orang tua satunya
  // tidak tercatat, anak ikut baris orang tua yang tercatat (kalau orang tua itu
  // pasangan), kalau tidak baris pertama. Tetap satu baris per anak.
  /** @param {{a: string, s: string|null}} b @param {{a: string, s: string|null}[]} rows @returns {Anggota[]} */
  function anakUntukBaris(b, rows) {
    const hasil = daftar.filter((c) => {
      const owner = pemilik(c)
      if (!owner) return false
      if (owner !== b.a && owner !== b.s) return false
      const lain = [c.ayah, c.ibu].filter((x) => x && x !== owner)
      const target =
        rows.find((r) => r.s && lain.includes(r.s)) ||
        rows.find((r) => r.s === owner) ||
        rows[0]
      return target === b
    })
    // Anak kandung anchor lebih dulu; anak bawaan pasangan (keluarga tiri)
    // setelahnya. Di dalam masing-masing kelompok tetap urut kode.
    return hasil.sort((x, y) => {
      const xLangsung = x.ayah === b.a || x.ibu === b.a ? 0 : 1
      const yLangsung = y.ayah === b.a || y.ibu === b.a ? 0 : 1
      return xLangsung - yLangsung || bandingKode(x, y)
    })
  }

  $: anakPerBaris = new Map(baris.map((b) => [b, anakUntukBaris(b, baris)]))
  $: jalurBaru = [...jalur, anchorId]
  $: setPisah = new Set(anchor?.pisah || [])

  /** @param {string} id */
  function buka(id) {
    ui.update((u) => ({ ...u, sheetId: id }))
  }

  /** @param {Anggota|undefined} ortu @returns {string} */
  function tanggal(ortu) {
    if (!ortu) return ''
    if (ortu.lahir && ortu.wafat) return `(${ortu.lahir} - ${ortu.wafat})`
    if (ortu.lahir) return `(l. ${ortu.lahir})`
    if (ortu.wafat) return `(† ${ortu.wafat})`
    return ''
  }
</script>

{#if anchor}
  {#if siklus}
    <div class="node">
      <div class="unit">
        <button
          class="kotak"
          class:fokus={$ui.fokusId === anchorId}
          data-id={anchorId}
          on:click={() => buka(anchorId)}
        >
          <span class="nama">{anchor.nama}</span>
          {#if anchor.kode}<span class="kode">{anchor.kode}</span>{/if}
          {#if tanggal(anchor)}<span class="tanggal">{tanggal(anchor)}</span>{/if}
        </button>
      </div>
    </div>
  {:else}
    <div class="kolom">
      {#each baris as b, i (b.s ?? 'sendiri')}
        {@const anak = anakPerBaris.get(b) || []}
        <div class="node" class:punya-anak={anak.length > 0}>
          <div class="unit">
            {#if i === 0}
              <button
                class="kotak"
                class:fokus={$ui.fokusId === b.a}
                data-id={b.a}
                on:click={() => buka(b.a)}
              >
                <span class="nama">{anchor.nama}</span>
                {#if anchor.kode}<span class="kode">{anchor.kode}</span>{/if}
                {#if tanggal(anchor)}<span class="tanggal">{tanggal(anchor)}</span>{/if}
              </button>
            {/if}
            {#if b.s}
              {#if i > 0}
                <button
                  class="rujukan"
                  on:click={() => buka(b.a)}
                  title={`${anchor.nama} digambar di baris pertama`}
                >
                  {anchor.nama}{#if anchor.kode}{' '}{anchor.kode}{/if}
                </button>
              {/if}
              <span class="kawin" class:putus={setPisah.has(b.s)} aria-hidden="true">{setPisah.has(b.s) ? '✕' : '⚭'}</span>
              <button
                class="kotak"
                class:pisah={setPisah.has(b.s)}
                class:fokus={$ui.fokusId === b.s}
                data-id={b.s}
                on:click={() => buka(b.s)}
              >
                <span class="nama">{byId.get(b.s)?.nama}</span>
                {#if byId.get(b.s)?.kode}<span class="kode">{byId.get(b.s)?.kode}</span>{/if}
                {#if tanggal(byId.get(b.s))}<span class="tanggal">{tanggal(byId.get(b.s))}</span>{/if}
              </button>
            {/if}
            {#if i === 0}
              {#each pasanganLuar as p (p.id)}
                <span class="kawin" class:putus={setPisah.has(p.id)} aria-hidden="true">{setPisah.has(p.id) ? '✕' : '⚭'}</span>
                <button
                  class="rujukan"
                  class:putus={setPisah.has(p.id)}
                  on:click={() => buka(p.id)}
                  title={`${p.nama} digambar di bawah orang tuanya sendiri`}
                >
                  {p.nama}{#if p.kode}{' '}{p.kode}{/if}{#if setPisah.has(p.id)} (pisah){/if}
                </button>
              {/each}
            {/if}
          </div>
          {#if anak.length > 0}
            <ul class="anak">
              {#each anak as c (c.id)}
                <li>
                  <CoupleNode anchorId={c.id} jalur={jalurBaru} anggota={daftar} />
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
{/if}