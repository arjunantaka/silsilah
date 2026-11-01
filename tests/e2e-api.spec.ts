import { test, expect } from '@playwright/test'
import {
  onRequestGet as dataGet,
  onRequestPut as dataPut,
  onRequestDelete as dataDelete,
} from '../functions/api/data.js'
import { onRequestGet as familiesGet } from '../functions/api/families.js'

type Metadata = { nama?: string; jumlah?: number } | null
interface KunciKV {
  name: string
  metadata?: Metadata
}
interface BalasanApi {
  ok: boolean
  data?: unknown
  pesan?: string
}
interface KVUji {
  isi: Map<string, string>
  metadata: Map<string, Metadata>
  catatan: {
    put: { kunci: string; nilai: string; metadata?: Metadata }[]
    hapus: string[]
    list: { limit?: number }[]
  }
  get(kunci: string): Promise<string | null>
  put(kunci: string, nilai: string, opsiPut?: { metadata?: Metadata }): Promise<void>
  delete(kunci: string): Promise<void>
  list(opsiList?: { limit?: number }): Promise<{ keys: KunciKV[] }>
}
interface OpsiKV {
  isi?: Map<string, string>
  metadata?: Map<string, Metadata>
  kunci?: KunciKV[]
  gagalGet?: Error
  gagalPut?: Error
  gagalDelete?: Error
  gagalList?: Error
}

// KV palsu di memori: cukup untuk seluruh kontrak handler, termasuk mode gagal.
function kvPalsu(opsi: OpsiKV = {}): KVUji {
  const isi = opsi.isi ?? new Map<string, string>()
  const metadata = opsi.metadata ?? new Map<string, Metadata>()
  const catatan = {
    put: [] as { kunci: string; nilai: string; metadata?: Metadata }[],
    hapus: [] as string[],
    list: [] as { limit?: number }[],
  }
  return {
    isi,
    metadata,
    catatan,
    async get(kunci) {
      if (opsi.gagalGet) throw opsi.gagalGet
      const nilai = isi.get(kunci)
      return nilai === undefined ? null : nilai
    },
    async put(kunci, nilai, opsiPut) {
      if (opsi.gagalPut) throw opsi.gagalPut
      isi.set(kunci, nilai)
      metadata.set(kunci, opsiPut?.metadata ?? null)
      catatan.put.push({ kunci, nilai, metadata: opsiPut?.metadata })
    },
    async delete(kunci) {
      if (opsi.gagalDelete) throw opsi.gagalDelete
      catatan.hapus.push(kunci)
      isi.delete(kunci)
      metadata.delete(kunci)
    },
    async list(opsiList) {
      if (opsi.gagalList) throw opsi.gagalList
      catatan.list.push(opsiList ?? {})
      const kunci =
        opsi.kunci ??
        [...isi.keys()].map((name) => ({ name, metadata: metadata.get(name) ?? null }))
      return { keys: kunci }
    },
  }
}

function env(kv?: KVUji) {
  return kv ? { SILSILAH_KV: kv } : ({} as Record<string, unknown>)
}

function permintaan(url: string, init: RequestInit = {}) {
  return new Request(url, init)
}

async function bacaJson(res: Response) {
  return (await res.json()) as BalasanApi
}

const DOKUMEN = {
  nama_keluarga: 'Keluarga Kontrak',
  anggota: [
    { id: 'a1', nama: 'Ani' },
    { id: 'a2', nama: 'Budi' },
  ],
}

test.describe('GET /api/data', () => {
  test('menolak tanpa binding KV dan kode yang hilang/tidak sesuai pola', async () => {
    const tanpaBinding = await dataGet({
      request: permintaan('http://local/api/data?kode=keluarga-uji'),
      env: env(),
    })
    expect(tanpaBinding.status).toBe(503)
    expect((await bacaJson(tanpaBinding)).ok).toBe(false)

    const kv = kvPalsu()
    for (const kode of [undefined, '', 'abc', 'ab', 'kode dengan spasi', 'kode_panjang!', 'A'.repeat(65)]) {
      const url = kode === undefined ? 'http://local/api/data' : `http://local/api/data?kode=${encodeURIComponent(kode)}`
      const res = await dataGet({ request: permintaan(url), env: env(kv) })
      expect(res.status, `kode=${String(kode)}`).toBe(400)
      const body = await bacaJson(res)
      expect(body.ok).toBe(false)
      expect(body.pesan).toBeTruthy()
    }
    // Kode tidak valid tidak boleh menyentuh KV sama sekali.
    expect(kv.catatan.put).toHaveLength(0)
  })

  test('menormalkan kode, 404 untuk kode tak dikenal, 500 untuk JSON rusak, 200 untuk dokumen valid', async () => {
    const isi = new Map<string, string>()
    isi.set('keluarga-uji', JSON.stringify(DOKUMEN))
    isi.set('keluarga-rusak', '{bukan json')
    const kv = kvPalsu({ isi })

    const spasial = await dataGet({
      request: permintaan('http://local/api/data?kode=%20%20KELUARGA-UJI%20%20'),
      env: env(kv),
    })
    expect(spasial.status).toBe(200)
    expect((await bacaJson(spasial)).data).toEqual(DOKUMEN)

    const takDikenal = await dataGet({
      request: permintaan('http://local/api/data?kode=keluarga-hilang'),
      env: env(kv),
    })
    expect(takDikenal.status).toBe(404)
    expect((await bacaJson(takDikenal)).ok).toBe(false)

    const rusak = await dataGet({
      request: permintaan('http://local/api/data?kode=KELUARGA-RUSAK'),
      env: env(kv),
    })
    expect(rusak.status).toBe(500)
    const bodyRusak = await bacaJson(rusak)
    expect(bodyRusak.ok).toBe(false)
    expect(bodyRusak.pesan).toBeTruthy()
  })
})

test.describe('PUT /api/data', () => {
  test('menolak binding hilang, body bukan JSON, dan kode tidak valid', async () => {
    const tanpaBinding = await dataPut({
      request: permintaan('http://local/api/data', {
        method: 'PUT',
        body: JSON.stringify({ kode: 'keluarga-uji', data: DOKUMEN }),
      }),
      env: env(),
    })
    expect(tanpaBinding.status).toBe(503)

    const kv = kvPalsu()
    const bukanJson = await dataPut({
      request: permintaan('http://local/api/data', { method: 'PUT', body: 'ini bukan json' }),
      env: env(kv),
    })
    expect(bukanJson.status).toBe(400)

    for (const kode of [undefined, '', 'abc', 'KODE_DENGAN!', 'x'.repeat(65)]) {
      const res = await dataPut({
        request: permintaan('http://local/api/data', {
          method: 'PUT',
          body: JSON.stringify({ kode, data: DOKUMEN }),
        }),
        env: env(kv),
      })
      expect(res.status, `kode=${String(kode)}`).toBe(400)
    }
    expect(kv.catatan.put).toHaveLength(0)
  })

  test('menolak dokumen yang bentuknya tidak dikenali', async () => {
    const kv = kvPalsu()
    const kandidat: unknown[] = [
      undefined,
      null,
      {},
      { nama_keluarga: 42, anggota: [] },
      { nama_keluarga: 'Tanpa Anggota' },
      { nama_keluarga: 'Anggota Bukan Array', anggota: 'a1' },
      { anggota: [] },
    ]
    for (const data of kandidat) {
      const res = await dataPut({
        request: permintaan('http://local/api/data', {
          method: 'PUT',
          body: JSON.stringify({ kode: 'keluarga-bentuk', data }),
        }),
        env: env(kv),
      })
      expect(res.status, JSON.stringify(data)).toBe(400)
      const body = await bacaJson(res)
      expect(body.ok).toBe(false)
      expect(body.pesan).toBeTruthy()
    }
    expect(kv.catatan.put).toHaveLength(0)
  })

  test('menolak dokumen di atas batas 1 MB dengan 413', async () => {
    const kv = kvPalsu()
    const besar = {
      nama_keluarga: 'Keluarga Besar',
      anggota: [{ id: 'a1', nama: 'Ani', catatan: 'x'.repeat(1_000_000) }],
    }
    expect(JSON.stringify(besar).length).toBeGreaterThan(1_000_000)

    const res = await dataPut({
      request: permintaan('http://local/api/data', {
        method: 'PUT',
        body: JSON.stringify({ kode: 'keluarga-besar', data: besar }),
      }),
      env: env(kv),
    })
    expect(res.status).toBe(413)
    expect((await bacaJson(res)).ok).toBe(false)
    expect(kv.catatan.put).toHaveLength(0)
  })

  test('menyimpan kode ternormalisasi beserta metadata nama/jumlah dan membalas kode', async () => {
    const kv = kvPalsu()
    const res = await dataPut({
      request: permintaan('http://local/api/data', {
        method: 'PUT',
        body: JSON.stringify({ kode: '  KELUARGA-KONTRAK  ', data: DOKUMEN }),
      }),
      env: env(kv),
    })
    expect(res.status).toBe(200)
    const body = await bacaJson(res)
    expect(body.ok).toBe(true)
    expect(body.data).toBe('keluarga-kontrak')

    expect(kv.catatan.put).toHaveLength(1)
    const simpan = kv.catatan.put[0]
    expect(simpan.kunci).toBe('keluarga-kontrak')
    expect(JSON.parse(simpan.nilai)).toEqual(DOKUMEN)
    expect(simpan.metadata).toEqual({ nama: 'Keluarga Kontrak', jumlah: 2 })
    expect(kv.isi.get('keluarga-kontrak')).toBe(JSON.stringify(DOKUMEN))
  })
})

test.describe('DELETE /api/data', () => {
  test('menolak binding hilang, kode tidak valid, dan konfirmasi tidak persis "ya"', async () => {
    const isi = new Map<string, string>([['keluarga-uji', JSON.stringify(DOKUMEN)]])
    const kv = kvPalsu({ isi })

    const tanpaBinding = await dataDelete({
      request: permintaan('http://local/api/data?kode=keluarga-uji&konfirmasi=ya', { method: 'DELETE' }),
      env: env(),
    })
    expect(tanpaBinding.status).toBe(503)

    const kodeBuruk = await dataDelete({
      request: permintaan('http://local/api/data?kode=x&konfirmasi=ya', { method: 'DELETE' }),
      env: env(kv),
    })
    expect(kodeBuruk.status).toBe(400)

    for (const konfirmasi of [null, '', 'tidak', 'YA', 'yaa', ' ya']) {
      const url =
        konfirmasi === null
          ? 'http://local/api/data?kode=keluarga-uji'
          : `http://local/api/data?kode=keluarga-uji&konfirmasi=${encodeURIComponent(konfirmasi)}`
      const res = await dataDelete({ request: permintaan(url, { method: 'DELETE' }), env: env(kv) })
      expect(res.status, `konfirmasi=${String(konfirmasi)}`).toBe(400)
      expect((await bacaJson(res)).pesan).toContain('onfirmasi')
    }
    expect(kv.isi.has('keluarga-uji')).toBe(true)
    expect(kv.catatan.hapus).toHaveLength(0)
  })

  test('404 untuk kode tak dikenal dan menghapus memakai kode ternormalisasi', async () => {
    const isi = new Map<string, string>([['keluarga-uji', JSON.stringify(DOKUMEN)]])
    const kv = kvPalsu({ isi })

    const takDikenal = await dataDelete({
      request: permintaan('http://local/api/data?kode=keluarga-hilang&konfirmasi=ya', { method: 'DELETE' }),
      env: env(kv),
    })
    expect(takDikenal.status).toBe(404)
    expect(kv.catatan.hapus).toHaveLength(0)

    const sukses = await dataDelete({
      request: permintaan('http://local/api/data?kode=%20KELUARGA-UJI%20&konfirmasi=ya', {
        method: 'DELETE',
      }),
      env: env(kv),
    })
    expect(sukses.status).toBe(200)
    expect((await bacaJson(sukses)).data).toBe('keluarga-uji')
    expect(kv.catatan.hapus).toEqual(['keluarga-uji'])
    expect(kv.isi.has('keluarga-uji')).toBe(false)
  })
})

test.describe('GET /api/families', () => {
  test('menolak tanpa binding, meminta limit 100, dan memberi null pada metadata yang hilang', async () => {
    const tanpaBinding = await familiesGet({ request: permintaan('http://local/api/families'), env: env() })
    expect(tanpaBinding.status).toBe(503)
    expect((await bacaJson(tanpaBinding)).ok).toBe(false)

    const kv = kvPalsu({
      kunci: [
        { name: 'keluarga-satu', metadata: { nama: 'Keluarga Satu', jumlah: 3 } },
        { name: 'keluarga-dua' },
        { name: 'keluarga-tiga', metadata: null },
      ],
    })
    const res = await familiesGet({ request: permintaan('http://local/api/families'), env: env(kv) })
    expect(res.status).toBe(200)
    expect((await bacaJson(res)).data).toEqual([
      { kode: 'keluarga-satu', nama: 'Keluarga Satu', jumlah: 3 },
      { kode: 'keluarga-dua', nama: null, jumlah: null },
      { kode: 'keluarga-tiga', nama: null, jumlah: null },
    ])
    expect(kv.catatan.list).toEqual([{ limit: 100 }])
  })

  test('mengembalikan array kosong saat belum ada keluarga', async () => {
    const kv = kvPalsu()
    const res = await familiesGet({ request: permintaan('http://local/api/families'), env: env(kv) })
    expect(res.status).toBe(200)
    const body = await bacaJson(res)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual([])
  })
})

test.describe('kegagalan penyimpanan KV', () => {
  const mati = () => new Error('KV sedang tidak tersedia')

  test('GET data meneruskan kegagalan get sebagai rejection, bukan status palsu', async () => {
    const kv = kvPalsu({ gagalGet: mati() })
    await expect(
      dataGet({ request: permintaan('http://local/api/data?kode=keluarga-uji'), env: env(kv) }),
    ).rejects.toThrow('KV sedang tidak tersedia')
  })

  test('PUT data meneruskan kegagalan put dan tidak mengklaim sukses', async () => {
    const kv = kvPalsu({ gagalPut: mati() })
    await expect(
      dataPut({
        request: permintaan('http://local/api/data', {
          method: 'PUT',
          body: JSON.stringify({ kode: 'keluarga-uji', data: DOKUMEN }),
        }),
        env: env(kv),
      }),
    ).rejects.toThrow('KV sedang tidak tersedia')
    expect(kv.isi.has('keluarga-uji')).toBe(false)
  })

  test('DELETE data meneruskan kegagalan get/delete KV', async () => {
    await expect(
      dataDelete({
        request: permintaan('http://local/api/data?kode=keluarga-uji&konfirmasi=ya', { method: 'DELETE' }),
        env: env(kvPalsu({ gagalGet: mati() })),
      }),
    ).rejects.toThrow('KV sedang tidak tersedia')

    const isi = new Map<string, string>([['keluarga-uji', JSON.stringify(DOKUMEN)]])
    await expect(
      dataDelete({
        request: permintaan('http://local/api/data?kode=keluarga-uji&konfirmasi=ya', { method: 'DELETE' }),
        env: env(kvPalsu({ isi, gagalDelete: mati() })),
      }),
    ).rejects.toThrow('KV sedang tidak tersedia')
    expect(isi.has('keluarga-uji')).toBe(true)
  })

  test('GET families meneruskan kegagalan list KV', async () => {
    await expect(
      familiesGet({ request: permintaan('http://local/api/families'), env: env(kvPalsu({ gagalList: mati() })) }),
    ).rejects.toThrow('KV sedang tidak tersedia')
  })
})

test('semua balasan API ber-content-type JSON dengan charset', async () => {
  const kv = kvPalsu({ isi: new Map([['keluarga-uji', JSON.stringify(DOKUMEN)]]) })
  const balasan = [
    await dataGet({ request: permintaan('http://local/api/data?kode=keluarga-uji'), env: env(kv) }),
    await dataGet({ request: permintaan('http://local/api/data?kode=x'), env: env(kv) }),
    await dataPut({
      request: permintaan('http://local/api/data', { method: 'PUT', body: '{}' }),
      env: env(kv),
    }),
    await dataDelete({
      request: permintaan('http://local/api/data?kode=keluarga-uji', { method: 'DELETE' }),
      env: env(kv),
    }),
    await familiesGet({ request: permintaan('http://local/api/families'), env: env(kv) }),
  ]
  for (const res of balasan) {
    const tipe = res.headers.get('content-type') ?? ''
    expect(tipe).toContain('application/json')
    expect(tipe).toContain('charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await bacaJson(res)
    expect(body).toHaveProperty('ok')
  }
})
