<script>
  import { data } from './store.js'
  import CoupleNode from './CoupleNode.svelte'

  $: anggota = $data.anggota
  $: indeks = new Map(anggota.map((a, i) => [a.id, i]))

  // Akar = anggota tanpa ayah dan tanpa ibu, KECUALI pasangan dari kandidat akar
  // lain yang muncul lebih dulu di array (agar pasangan tidak digambar dua kali —
  // dia sudah tampil dalam baris pernikahan akar tadi). Urutan = urutan array.
  $: akar = anggota.filter((a) => {
    if (a.ayah !== null || a.ibu !== null) return false
    const posA = indeks.get(a.id) ?? 0
    return !(a.pasangan || []).some((pid) => {
      const p = anggota[indeks.get(pid) ?? -1]
      if (!p || p.ayah !== null || p.ibu !== null) return false
      return (indeks.get(pid) ?? 0) < posA
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
