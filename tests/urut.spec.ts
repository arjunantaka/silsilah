import { test, expect } from '@playwright/test'
import { urutKode } from '../src/urut.js'

test('kode diurutkan natural, case-insensitive, dan kosong di akhir', () => {
  const daftar = [
    { kode: 'A2P10', nama: 'Sepuluh' },
    { kode: 'a2p2', nama: 'Dua' },
    { kode: '', nama: 'Tanpa Kode' },
    { kode: 'A4p1B1', nama: 'Huruf kecil' },
    { kode: 'M2', nama: 'Mantu' },
    { kode: 'A1', nama: 'Satu' },
  ]
  expect(urutKode(daftar).map((a) => a.kode)).toEqual(['A1', 'a2p2', 'A2P10', 'A4p1B1', 'M2', ''])
})

test('kode sama diurutkan berdasarkan nama', () => {
  const daftar = [
    { kode: 'A1', nama: 'Zaki' },
    { kode: 'A1', nama: 'Ani' },
  ]
  expect(urutKode(daftar).map((a) => a.nama)).toEqual(['Ani', 'Zaki'])
})
