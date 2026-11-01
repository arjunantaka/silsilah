<script>
  import { data, ui } from './store.js'
  import CoupleNode from './CoupleNode.svelte'
  import { bandingKode, urutKode } from './urut.js'
  import { tick } from 'svelte'

  /**
   * @import { Anggota } from './store.js'
   */

  // `anggota` opsional: dipakai mode fokus trah untuk menggambar sub-pohon saja.
  /** @type {Anggota[]|null} */
  export let anggota = null

  // Invarian: setiap orang digambar tepat satu kali; pasangan mengikuti baris orang tuanya,
  // urutan akar = urutan array. Akar = tanpa ayah & ibu, kecuali sudah tergambar di tempat lain
  // (pasangannya punya orang tua, atau pasangannya akar tanpa-orang-tua yang lebih dulu di array).
  /** @param {Anggota[]} daftar @returns {Anggota[]} */
  function akarDari(daftar) {
    const indeks = new Map(daftar.map((a, i) => [a.id, i]))
    return daftar.filter((a) => {
      if (a.ayah !== null || a.ibu !== null) return false
      const posA = indeks.get(a.id) ?? 0
      return !(a.pasangan || []).some((pid) => {
        const p = daftar[indeks.get(pid) ?? -1]
        if (!p) return false
        return p.ayah !== null || p.ibu !== null || (indeks.get(pid) ?? 0) < posA
      })
    })
  }

  $: daftar = anggota ?? $data.anggota
  $: daftarUrut = urutKode(daftar)
  $: akarFokus = $ui.trahId ? daftarUrut.find((a) => a.id === $ui.trahId) : null
  $: akar = akarFokus ? [akarFokus] : akarDari(daftar).sort(bandingKode)
  $: target = $ui.trahId || akar[0]?.id || null

  // ---------- Zoom & posisi ----------
  const MIN = 0.05
  const MAKS = 1.8
  const LANGKAH = 0.15

  /** @type {HTMLDivElement} */
  let wrap
  /** @type {HTMLDivElement} */
  let pohon
  let skala = 1

  /** @param {number} n @returns {number} */
  function batas(n) {
    return Math.min(MAKS, Math.max(MIN, n))
  }

  /** @param {number} baru */
  function aturSkala(baru) {
    const lama = skala
    const nilai = batas(baru)
    if (!wrap || Math.abs(nilai - lama) < 0.001) return
    const cx = wrap.scrollLeft + wrap.clientWidth / 2
    const cy = wrap.scrollTop + wrap.clientHeight / 2
    skala = nilai
    tick().then(() => {
      if (!wrap) return
      // Zoom mengubah ukuran layout, jadi koordinat scroll ikut berskala.
      wrap.scrollLeft = cx * (nilai / lama) - wrap.clientWidth / 2
      wrap.scrollTop = cy * (nilai / lama) - wrap.clientHeight / 2
    })
  }

  /** @param {number} delta */
  function ubahSkala(delta) {
    aturSkala(skala + delta)
  }

  function pasLayar() {
    if (!wrap || !pohon) return
    const alami = pohon.getBoundingClientRect().width / skala
    aturSkala(Math.min(1, Math.max(MIN, (wrap.clientWidth - 24) / alami)))
    tick().then(() => {
      if (!wrap) return
      wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2
      wrap.scrollTop = 0
    })
  }

  /** @param {string|null} id */
  async function tengahkan(id) {
    await tick()
    if (!wrap || !pohon) return
    const kotak = (id && pohon.querySelector(`[data-id="${CSS.escape(id)}"]`)) || pohon.querySelector('.kotak')
    if (!kotak) return
    // Pusatkan satu unit (orang + pasangan), bukan hanya kotak orangnya; kalau
    // tidak, pasangan selalu terpotong di tepi kanan layar ponsel.
    const unit = kotak.closest('.unit') || kotak
    const wr = wrap.getBoundingClientRect()
    const er = unit.getBoundingClientRect()
    wrap.scrollLeft += er.left + er.width / 2 - (wr.left + wr.width / 2)
    wrap.scrollTop = 0
  }

  // Setiap kali akar/fokus berubah: kembali ke 100% dan tampilkan akarnya di tengah.
  // Tanpa ini pengguna mendarat di cabang paling kiri, sementara akar pohon ada di
  // luar layar (pohon bisa ribuan piksel lebarnya).
  /** @type {string|null} */
  let targetLama = null
  $: if (target !== targetLama) {
    targetLama = target
    skala = 1
    tick().then(() => tengahkan(target))
  }

  /** @param {WheelEvent} e */
  function roda(e) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    ubahSkala(e.deltaY < 0 ? 0.1 : -0.1)
  }

  /** @param {TouchList} t @returns {number} */
  function jarak(t) {
    const dx = t[0].clientX - t[1].clientX
    const dy = t[0].clientY - t[1].clientY
    return Math.hypot(dx, dy)
  }

  /** @type {{ jarak: number, skala: number }|null} */
  let cubit = null
  /** @param {TouchEvent} e */
  function sentuhMulai(e) {
    if (e.touches.length === 2) cubit = { jarak: jarak(e.touches), skala }
  }
  /** @param {TouchEvent} e */
  function sentuhGerak(e) {
    if (!cubit || e.touches.length !== 2) return
    e.preventDefault()
    aturSkala(cubit.skala * (jarak(e.touches) / cubit.jarak))
  }
  function sentuhSelesai() {
    cubit = null
  }
</script>

<div class="pohon-area">
  <div
    class="pohon-wrap"
    bind:this={wrap}
    on:wheel|nonpassive={roda}
    on:touchstart={sentuhMulai}
    on:touchmove|nonpassive={sentuhGerak}
    on:touchend={sentuhSelesai}
  >
    <div class="pohon" bind:this={pohon} style={`zoom:${skala}`}>
      {#each akar as a (a.id)}
        <CoupleNode anchorId={a.id} anggota={daftarUrut} />
      {/each}
    </div>
  </div>

  <div class="kontrol-zoom" role="group" aria-label="Zoom pohon">
    <button type="button" on:click={() => ubahSkala(-LANGKAH)} aria-label="Perkecil pohon">−</button>
    <button type="button" class="persen" on:click={() => aturSkala(1)} title="Kembali ke 100%">
      {Math.round(skala * 100)}%
    </button>
    <button type="button" on:click={() => ubahSkala(LANGKAH)} aria-label="Perbesar pohon">+</button>
    <button type="button" class="pas" on:click={pasLayar}>Pas layar</button>
  </div>
</div>
