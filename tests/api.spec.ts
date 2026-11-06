// Kontrak handler /api di atas D1 palsu (node:sqlite). Menutup perilaku:
// sync (buat keluarga, naik revisi, tombstone, pasang ulang), delta sejak
// kursor, GET dokumen, kompatibilitas PUT/DELETE dengan gerbang revisi,
// daftar keluarga, dan validasi masukan.
import { test, expect } from '@playwright/test'
import { onRequestGet as dataGet, onRequestPut as dataPut, onRequestDelete as dataDelete } from '../functions/api/data.js'
import { onRequestGet as deltaGet } from '../functions/api/delta.js'
import { onRequestPost as syncPost } from '../functions/api/sync.js'
import { onRequestGet as familiesGet } from '../functions/api/families.js'
import { d1Palsu, envD1, type D1Palsu } from './d1-uji'

const ORANG = (id: string, nama: string) => ({
  id,
  nama,
  kode: '',
  gender: 'L',
  lahir: '',
  wafat: '',
  catatan: '',
  tempat_lahir: '',
  alamat: '',
  pekerjaan: '',
  ayah: null,
  ibu: null,
  pasangan: [],
  pisah: [],
})

async function balasanJson(r: Response) {
  return { status: r.status, body: await r.json() }
}

async function sync(db: D1Palsu, kode: string, nama: string, perubahan: unknown[], env?: unknown) {
  const e = env ?? envD1(db)
  return balasanJson(
    await syncPost({
      request: new Request('http://x/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kode, nama, perubahan }),
      }),
      env: e as Record<string, unknown>,
    }),
  )
}

async function delta(db: D1Palsu, kode: string, sejak: number) {
  return balasanJson(
    await deltaGet({
      request: new Request(`http://x/api/delta?kode=${kode}&sejak=${sejak}`),
      env: envD1(db) as Record<string, unknown>,
    }),
  )
}

test('sync: keluarga baru, tambah anggota, tombstone, pasang ulang', async () => {
  const db = d1Palsu()

  // Buat keluarga.
  let r = await sync(db, 'keluarga-uji-1', 'Keluarga Uji', [{ id: 'a', rec: ORANG('a', 'Ani') }])
  expect(r.status).toBe(200)
  expect(r.body.revisi).toBe(1)

  // Tambah anggota: revisi naik, delta sejak 1 hanya berisi yang baru.
  r = await sync(db, 'keluarga-uji-1', 'Keluarga Uji', [{ id: 'b', rec: ORANG('b', 'Budi') }])
  expect(r.body.revisi).toBe(2)
  let d = await delta(db, 'keluarga-uji-1', 1)
  expect(d.body.ubah).toHaveLength(1)
  expect(d.body.ubah[0].id).toBe('b')

  // Hapus anggota: tombstone masuk delta, dokumen menyusut.
  r = await sync(db, 'keluarga-uji-1', 'Keluarga Uji', [{ id: 'a', rec: null }])
  expect(r.body.revisi).toBe(3)
  d = await delta(db, 'keluarga-uji-1', 2)
  expect(d.body.ubah).toEqual([{ id: 'a', rec: null, rev: 3 }])
  const g = await balasanJson(
    await dataGet({ request: new Request('http://x/api/data?kode=keluarga-uji-1'), env: envD1(db) as Record<string, unknown> }),
  )
  expect(g.body.data.anggota).toHaveLength(1)
  expect(g.body.revisi).toBe(3)

  // Pasang ulang id yang sudah dihapus: baris hidup kembali, tombstone pergi.
  r = await sync(db, 'keluarga-uji-1', 'Keluarga Uji', [{ id: 'a', rec: ORANG('a', 'Ani') }])
  expect(r.body.revisi).toBe(4)
  d = await delta(db, 'keluarga-uji-1', 3)
  expect(d.body.ubah).toEqual([{ id: 'a', rec: expect.stringContaining('"id":"a"'), rev: 4 }])
  const sesudah = await delta(db, 'keluarga-uji-1', 0)
  expect(sesudah.body.ubah.filter((u: { id: string }) => u.id === 'a')).toHaveLength(1)
  expect(sesudah.body.ubah[0].rec).not.toBeNull()
})

test('sync: nama keluarga ikut, jumlah terjaga, keluarga tanpa anggota ditolak', async () => {
  const db = d1Palsu()
  let r = await sync(db, 'keluarga-uji-2', 'Nama Awal', [{ id: 'x', rec: ORANG('x', 'X') }])
  expect(r.status).toBe(200)
  r = await sync(db, 'keluarga-uji-2', 'Nama Baru', [])
  expect(r.status).toBe(200)

  const f = await balasanJson(
    await familiesGet({ env: envD1(db) as Record<string, unknown> }),
  )
  expect(f.body.data[0].nama).toBe('Nama Baru')
  expect(f.body.data[0].jumlah).toBe(1)

  // Keluarga baru tanpa satu pun anggota hidup: tolak.
  r = await sync(db, 'keluarga-kosong-3', 'Kosong', [{ id: 'y', rec: null }])
  expect(r.status).toBe(400)
  const g = await balasanJson(
    await dataGet({ request: new Request('http://x/api/data?kode=keluarga-kosong-3'), env: envD1(db) as Record<string, unknown> }),
  )
  expect(g.status).toBe(404)
})

test('kompatibilitas PUT: gerbang revisi, replace penuh, dan 409 tanpa korupsi', async () => {
  const db = d1Palsu()
  const env = envD1(db) as Record<string, unknown>
  const dokumen = { nama_keluarga: 'Keluarga Uji', anggota: [ORANG('a', 'Ani'), ORANG('b', 'Budi')] }

  // Baru (revisi 0) -> revisi 1.
  let r = await balasanJson(
    await dataPut({
      request: new Request('http://x/api/data', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kode: 'keluarga-put-1', data: dokumen, revisi: 0 }),
      }),
      env,
    }),
  )
  expect(r.status).toBe(200)
  expect(r.body.revisi).toBe(1)

  // Revisi basi: 409 dan data tidak berubah.
  r = await balasanJson(
    await dataPut({
      request: new Request('http://x/api/data', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kode: 'keluarga-put-1', data: { nama_keluarga: 'Hancur', anggota: [] }, revisi: 0 }),
      }),
      env,
    }),
  )
  expect(r.status).toBe(409)
  const g = await balasanJson(
    await dataGet({ request: new Request('http://x/api/data?kode=keluarga-put-1'), env }),
  )
  expect(g.body.data.anggota).toHaveLength(2)
  expect(g.body.data.nama_keluarga).toBe('Keluarga Uji')

  // Revisi benar: replace penuh jadi 1 anggota, revisi 2.
  r = await balasanJson(
    await dataPut({
      request: new Request('http://x/api/data', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kode: 'keluarga-put-1',
          data: { nama_keluarga: 'Keluarga Uji', anggota: [ORANG('a', 'Ani')] },
          revisi: 1,
        }),
      }),
      env,
    }),
  )
  expect(r.status).toBe(200)
  expect(r.body.revisi).toBe(2)
  const g2 = await balasanJson(await dataGet({ request: new Request('http://x/api/data?kode=keluarga-put-1'), env }))
  expect(g2.body.data.anggota).toHaveLength(1)

  // Tanpa revisi (klien lama): ditolak.
  r = await balasanJson(
    await dataPut({
      request: new Request('http://x/api/data', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kode: 'keluarga-put-1', data: dokumen }),
      }),
      env,
    }),
  )
  expect(r.status).toBe(409)
})

test('kompatibilitas DELETE: konfirmasi + revisi, arsip terisi, keluarga 404', async () => {
  const db = d1Palsu()
  const env = envD1(db) as Record<string, unknown>
  await sync(db, 'keluarga-del-1', 'Keluarga Del', [{ id: 'a', rec: ORANG('a', 'Ani') }])

  // Tanpa konfirmasi: 400.
  let r = await balasanJson(
    await dataDelete({ request: new Request('http://x/api/data?kode=keluarga-del-1&revisi=1'), env }),
  )
  expect(r.status).toBe(400)

  // Revisi basi: 409.
  r = await balasanJson(
    await dataDelete({ request: new Request('http://x/api/data?kode=keluarga-del-1&konfirmasi=ya&revisi=0'), env }),
  )
  expect(r.status).toBe(409)

  // Benar: 200, arsip terisi, GET 404, families kosong.
  r = await balasanJson(
    await dataDelete({ request: new Request('http://x/api/data?kode=keluarga-del-1&konfirmasi=ya&revisi=1'), env }),
  )
  expect(r.status).toBe(200)
  const arsip = await delta(db, 'keluarga-del-1', 0)
  expect(arsip.status).toBe(404)
  const baris = db.prepare('SELECT rec FROM arsip WHERE kode = ?').bind('keluarga-del-1')
  const a = await baris.first()
  expect(a).not.toBeNull()
  const f = await balasanJson(await familiesGet({ env }))
  expect(f.body.data).toHaveLength(0)
})

test('validasi masukan ditolak tanpa efek samping', async () => {
  const db = d1Palsu()
  // Kode tidak valid.
  let r = await sync(db, 'X', 'Nama', [{ id: 'a', rec: ORANG('a', 'Ani') }])
  expect(r.status).toBe(400)
  // rec bukan objek.
  r = await sync(db, 'keluarga-uji-9', 'Nama', [{ id: 'a', rec: 'teks' }])
  expect(r.status).toBe(400)
  // nama hilang.
  r = await sync(db, 'keluarga-uji-9', '', [{ id: 'a', rec: ORANG('a', 'Ani') }])
  expect(r.status).toBe(400)
  // binding hilang: 503.
  const tanpa = await syncPost({
    request: new Request('http://x/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kode: 'keluarga-uji-9', nama: 'N', perubahan: [] }),
    }),
    env: {},
  })
  expect(tanpa.status).toBe(503)
  // delta kursor tidak valid.
  const d = await deltaGet({
    request: new Request('http://x/api/delta?kode=keluarga-uji-9&sejak=abc'),
    env: envD1(db) as Record<string, unknown>,
  })
  expect(d.status).toBe(400)
})

test('urutan delta mengikuti rev dan nama keluarga ikut di balasan', async () => {
  const db = d1Palsu()
  await sync(db, 'keluarga-urut-1', 'Urut', [{ id: 'a', rec: ORANG('a', 'Ani') }])
  await sync(db, 'keluarga-urut-1', 'Urut', [{ id: 'b', rec: ORANG('b', 'Budi') }])
  await sync(db, 'keluarga-urut-1', 'Urut Baru', [{ id: 'a', rec: { ...ORANG('a', 'Ani'), nama: 'Ani II' } }])
  const d = await delta(db, 'keluarga-urut-1', 0)
  expect(d.body.nama_keluarga).toBe('Urut Baru')
  expect(d.body.revisi).toBe(3)
  expect(d.body.ubah.map((u: { id: string }) => u.id)).toEqual(['b', 'a'])
})
