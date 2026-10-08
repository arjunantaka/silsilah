<script>
  import { data } from './store.js'
  import CoupleNode from './CoupleNode.svelte'

  /**
   * @import { Anggota } from './store.js'
   */

  // Invarian: setiap orang digambar tepat satu kali; pasangan mengikuti baris orang tuanya,
  // urutan akar = urutan array. Akar = tanpa ayah & ibu, kecuali sudah tergambar di tempat lain
  // (pasangannya punya orang tua, atau pasangannya akar tanpa-orang-tua yang lebih dulu di array).
  /** @param {Anggota[]} anggota @returns {Anggota[]} */
  function akarDari(anggota) {
    const indeks = new Map(anggota.map((a, i) => [a.id, i]))
    return anggota.filter((a) => {
      if (a.ayah !== null || a.ibu !== null) return false
      const posA = indeks.get(a.id) ?? 0
      return !(a.pasangan || []).some((pid) => {
        const p = anggota[indeks.get(pid) ?? -1]
        if (!p) return false
        return p.ayah !== null || p.ibu !== null || (indeks.get(pid) ?? 0) < posA
      })
    })
  }

  $: anggota = $data.anggota
  $: akar = akarDari(anggota)
</script>

<div class="pohon-wrap">
  <div class="pohon">
    {#each akar as a (a.id)}
      <CoupleNode anchorId={a.id} />
    {/each}
  </div>
</div>