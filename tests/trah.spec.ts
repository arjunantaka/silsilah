import { test, expect } from '@playwright/test'
import { trahDari } from '../src/trah.js'

const orang = (
  id: string,
  nama: string,
  ayah: string | null = null,
  ibu: string | null = null,
  pasangan: string[] = [],
  kode = '',
) => ({
  id,
  nama,
  kode: kode,
  gender: 'L',
  lahir: '',
  wafat: '',
  catatan: '',
  tempat_lahir: '',
  alamat: '',
  pekerjaan: '',
  ayah,
  ibu,
  pasangan,
  pisah: [],
})

const anggota = [
  orang('kakek', 'Kakek', null, null, ['nenek']),
  orang('nenek', 'Nenek', null, null, ['kakek']),
  orang('suyati', 'Suyati', 'kakek', 'nenek', ['sutiyo']),
  orang('suratmi', 'Suratmi', 'kakek', 'nenek'),
  orang('sutiyo', 'Sutiyo', null, null, ['suyati']),
  orang('bambang', 'Bambang', 'sutiyo', 'suyati', ['etik']),
  orang('etik', 'Etik', null, null, ['bambang']),
  orang('dani', 'Dani', 'bambang', 'etik'),
  orang('joko', 'Joko', 'sutiyo', 'suyati'),
  orang('lain', 'Lain', null, null),
  orang('anak-lain', 'Anak Lain', 'lain', null),
]

test('trahDari mengambil orang, pasangan, dan seluruh turunan', () => {
  const trah = trahDari(anggota as never, 'suyati')
  expect(trah).not.toBeNull()
  const nama = trah!.anggota.map((a) => a.nama)
  expect(nama).toEqual(['Suyati', 'Sutiyo', 'Bambang', 'Etik', 'Joko', 'Dani'])
  expect(trah!.jumlahDarah).toBe(4)
  expect(nama).not.toContain('Suratmi')
  expect(nama).not.toContain('Lain')
})

test('orang tua di luar trah dinull-kan agar pasangan tetap tergambar', () => {
  const trah = trahDari(anggota as never, 'suyati')!
  const suyati = trah.anggota.find((a) => a.id === 'suyati')!
  const sutiyo = trah.anggota.find((a) => a.id === 'sutiyo')!
  const bambang = trah.anggota.find((a) => a.id === 'bambang')!
  expect(suyati.ayah).toBeNull()
  expect(suyati.ibu).toBeNull()
  expect(sutiyo.pasangan).toEqual(['suyati'])
  // Relasi anak di dalam trah tetap utuh.
  expect(bambang.ayah).toBe('sutiyo')
  expect(bambang.ibu).toBe('suyati')
})

test('pencarian anak menampilkan saudara sederajat sebagai konteks', () => {
  const trah = trahDari(anggota as never, 'joko')!
  expect(trah.anggota.map((a) => a.nama)).toEqual(['Joko'])
  expect(trah.saudara.map((a) => a.nama)).toEqual(['Bambang'])
})

test('id yang tidak ada mengembalikan null', () => {
  expect(trahDari(anggota as never, 'hantu')).toBeNull()
})

test('turunan diurutkan berdasarkan kode, bukan urutan input', () => {
  const data = [
    orang('root', 'Root', null, null, ['sp'], 'EK'),
    orang('sp', 'Sp', null, null, ['root'], 'EP1'),
    orang('c3', 'Anak C', 'root', 'sp', [], 'A2'),
    orang('c2', 'Anak B', 'root', 'sp', [], 'A1P1'),
    orang('c1', 'Anak A', 'root', 'sp', [], 'A1'),
  ]
  const trah = trahDari(data as never, 'root')!
  expect(trah.anggota.map((a) => a.nama)).toEqual(['Root', 'Sp', 'Anak A', 'Anak B', 'Anak C'])
})
