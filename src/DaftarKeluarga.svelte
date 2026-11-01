<script>
  /**
   * @typedef {{ kode: string, nama: string|null, jumlah: number|null }} Keluarga
   */

  /** @type {Keluarga[]} */
  export let daftar = []
  /** @type {string} */
  export let aktif = ''
  /** @type {(kode: string) => void} */
  export let buka = () => {}
  /** @type {(f: Keluarga) => void} */
  export let hapus = () => {}
</script>

<div class="daftar-keluarga">
  {#each daftar as f (f.kode)}
    <div class="baris-keluarga">
      <button
        class="besar buka-keluarga"
        class:aktif={f.kode === aktif}
        on:click={() => buka(f.kode)}
      >
        {f.nama || f.kode}{#if f.jumlah !== null}&nbsp;· {f.jumlah} orang{/if}
        <small>{f.kode}{#if f.kode === aktif}&nbsp;· sedang dibuka{/if}</small>
      </button>
      <button
        class="hapus-keluarga"
        type="button"
        on:click={() => hapus(f)}
        aria-label={`Hapus silsilah ${f.nama || f.kode}`}
        title="Hapus silsilah"
      >🗑️</button>
    </div>
  {/each}
</div>
