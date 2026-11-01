import { test, expect } from '@playwright/test'
import { onRequestPut, onRequestDelete } from '../functions/api/data.js'

function envDenganKV() {
  const isi = new Map<string, string>()
  return {
    isi,
    SILSILAH_KV: {
      async get(kunci: string) {
        return isi.get(kunci) ?? null
      },
      async put(kunci: string, nilai: string) {
        isi.set(kunci, nilai)
      },
      async delete(kunci: string) {
        isi.delete(kunci)
      },
    },
  }
}

test('PUT menyimpan dokumen dan DELETE menghapusnya hanya dengan konfirmasi=ya', async () => {
  const env = envDenganKV()
  const dokumen = { nama_keluarga: 'Keluarga Uji', anggota: [{ id: 'a', nama: 'Ani' }] }

  const put = await onRequestPut({
    request: new Request('http://local/api/data', {
      method: 'PUT',
      body: JSON.stringify({ kode: 'keluarga-uji-1', data: dokumen }),
    }),
    env,
  })
  expect(put.status).toBe(200)
  expect(env.isi.has('keluarga-uji-1')).toBe(true)

  const tanpaYa = await onRequestDelete({
    request: new Request('http://local/api/data?kode=keluarga-uji-1', { method: 'DELETE' }),
    env,
  })
  expect(tanpaYa.status).toBe(400)
  expect(env.isi.has('keluarga-uji-1')).toBe(true)

  const hapus = await onRequestDelete({
    request: new Request('http://local/api/data?kode=keluarga-uji-1&konfirmasi=ya', { method: 'DELETE' }),
    env,
  })
  expect(hapus.status).toBe(200)
  expect(env.isi.has('keluarga-uji-1')).toBe(false)
})
