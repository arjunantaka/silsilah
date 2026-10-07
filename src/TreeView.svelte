<script>
  import { data } from './store.js'
  import CoupleNode from './CoupleNode.svelte'

  $: anggota = $data.anggota
  $: indeks = new Map(anggota.map((a, i) => [a.id, i]))

  // Akar = anggota tanpa ayah dan tanpa ibu, KECUALI yang sudah pasti tergambar
  // di tempat lain: pasangannya punya orang tua (tampil di subtree orang tuanya)
  // atau pasangannya adalah akar tanpa-orang-tua yang muncul lebih dulu di array.
  // Tujuan: setiap orang digambar tepat satu kali. Urutan = urutan array.
  $: akar = anggota.filter((a) => {
    if (a.ayah !== null || a.ibu !== null) return false
    const posA = indeks.get(a.id) ?? 0
    return !(a.pasangan || []).some((pid) => {
      const p = anggota[indeks.get(pid) ?? -1]
      if (!p) return false
      const pPunyaOrtu = p.ayah !== null || p.ibu !== null
      return pPunyaOrtu || (indeks.get(pid) ?? 0) < posA
    })
  })
</script>

<div class="pohon-wrap">
  <div class="pohon">
    {#each akar as a (a.id)}
      <CoupleNode anchorId={a.id} />
    {/each}
  </div>
</div>
