<script>
  import { data, ui } from './store.js'
  import CoupleNode from './CoupleNode.svelte'

  /**
   * @import { Anggota } from './store.js'
   */

  /** @type {string} */
  export let anchorId
  /** @type {string|null} */
  export let pasanganId = null
  /** @type {string[]} */
  export let jalur = []

  $: anggota = $data.anggota
  $: byId = new Map(anggota.map((a) => [a.id, a]))
  $: anchor = byId.get(anchorId)

  // Pengaman siklus (file impor bisa rusak): anchor sudah di jalur → kotak saja.
  $: siklus = jalur.includes(anchorId)

  // Pasangan anchor yang masih ada di data.
  $: pasanganEksis = anchor ? (anchor.pasangan || []).filter((id) => byId.has(id)) : []

  // Baris pernikahan: satu (anchor, pasangan) bila dipanggil dengan pasanganId,
  // kalau tidak satu baris per pasangan eksis, atau baris tunggal tanpa pasangan.
  $: baris = siklus
    ? []
    : pasanganId
      ? [{ a: anchorId, s: pasanganId }]
      : pasanganEksis.length
        ? pasanganEksis.map((s) => ({ a: anchorId, s }))
        : [{ a: anchorId, s: null }]

  // Anak dari baris (a, s): {c.ayah, c.ibu} yang non-null ⊆ {a, s}, minimal satu terisi.
  // Urutan = urutan array anggota. Dihitung per baris agar reaktif terhadap $data.
  /** @param {string} a @param {string|null} s @param {Anggota[]} semua @returns {Anggota[]} */
  function anakDari(a, s, semua) {
    const set = new Set([a, s].filter(Boolean))
    return semua.filter((c) => {
      const p = [c.ayah, c.ibu].filter(Boolean)
      return p.length > 0 && p.every((x) => set.has(x))
    })
  }

  $: anakPerBaris = new Map(baris.map((b) => [b, anakDari(b.a, b.s, anggota)]))
  $: jalurBaru = [...jalur, anchorId, pasanganId ?? ''].filter((x) => x !== '')

  /** @param {string} id */
  function buka(id) {
    ui.update((u) => ({ ...u, sheetId: id }))
  }

  /** @param {Anggota|undefined} ortu @returns {string} */
  function tanggal(ortu) {
    if (!ortu) return ''
    if (ortu.lahir && ortu.wafat) return `(${ortu.lahir} – ${ortu.wafat})`
    if (ortu.lahir) return `(l. ${ortu.lahir})`
    if (ortu.wafat) return `(† ${ortu.wafat})`
    return ''
  }
</script>

{#if anchor}
  {#if siklus}
    <div class="node">
      <div class="unit">
        <button class="kotak" on:click={() => buka(anchorId)}>
          <span class="nama">{anchor.nama}</span>
          {#if tanggal(anchor)}<span class="tanggal">{tanggal(anchor)}</span>{/if}
        </button>
      </div>
    </div>
  {:else}
    <div class="kolom">
      {#each baris as b (b.s ?? 'sendiri')}
        {@const anak = anakPerBaris.get(b) || []}
        <div class="node" class:punya-anak={anak.length > 0}>
          <div class="unit">
            <button class="kotak" on:click={() => buka(b.a)}>
              <span class="nama">{anchor.nama}</span>
              {#if tanggal(anchor)}<span class="tanggal">{tanggal(anchor)}</span>{/if}
            </button>
            {#if b.s}
              <span class="kawin" aria-hidden="true">⚭</span>
              <button class="kotak" on:click={() => buka(b.s)}>
                <span class="nama">{byId.get(b.s)?.nama}</span>
                {#if tanggal(byId.get(b.s))}<span class="tanggal">{tanggal(byId.get(b.s))}</span>{/if}
              </button>
            {/if}
          </div>
          {#if anak.length > 0}
            <ul class="anak">
              {#each anak as c (c.id)}
                <li>
                  {#if (c.pasangan || []).some((id) => byId.has(id))}
                    <div class="kolom">
                      {#each (c.pasangan || []).filter((id) => byId.has(id)) as pid (pid)}
                        <CoupleNode
                          anchorId={c.id}
                          pasanganId={pid}
                          jalur={jalurBaru}
                        />
                      {/each}
                    </div>
                  {:else}
                    <CoupleNode
                      anchorId={c.id}
                      pasanganId={null}
                      jalur={jalurBaru}
                    />
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
{/if}
