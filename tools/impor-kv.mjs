// Impor data lama dari KV ke D1: baca snapshot backup (hasil investigasi
// 2026-11-06) dan tulis SQL INSERT untuk migrations/ dan `wrangler d1 execute`.
// Jalankan: node tools/impor-kv.mjs <folder-backup> <berkas-sql-tujuan>
// Hanya kunci keluarga (bukan __backup__/uji-*) yang diimpor.
import fs from 'node:fs'
import path from 'node:path'

const [sumber, tujuan] = process.argv.slice(2)
if (!sumber || !tujuan) {
  console.error('Pakai: node tools/impor-kv.mjs <folder-backup> <berkas-sql-tujuan>')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(path.join(sumber, 'manifest.json'), 'utf8'))
const sekarang = new Date().toISOString()
const barisSql = [
  '-- Dihasilkan tools/impor-kv.mjs dari snapshot KV produksi.',
  `-- Sumber: ${sumber} (manifest.json), dibuat ${sekaranku()}`,
  '-- Keluarga lama tanpa metadata revisi diimpor dengan revisi = 0.',
  '',
]

function sekaranku() {
  return new Date().toISOString()
}

function teksSql(t) {
  return "'" + String(t).replace(/'/g, "''") + "'"
}

/** @param {string} kode @param {any} doc @param {number} revisi @param {string} diubah */
function sqlKeluarga(kode, doc, revisi, diubah) {
  const out = [
    `INSERT INTO keluarga (kode, nama, revisi, diubah, jumlah) VALUES (${teksSql(kode)}, ${teksSql(doc.nama_keluarga)}, ${revisi}, ${teksSql(diubah)}, ${doc.anggota.length}) ON CONFLICT(kode) DO UPDATE SET nama=excluded.nama, revisi=excluded.revisi, diubah=excluded.diubah, jumlah=excluded.jumlah;`,
  ]
  for (const a of doc.anggota) {
    if (!a?.id) continue
    out.push(
      `INSERT INTO anggota (kode, id, rec, rev) VALUES (${teksSql(kode)}, ${teksSql(String(a.id))}, ${teksSql(JSON.stringify(a))}, ${revisi}) ON CONFLICT(kode, id) DO UPDATE SET rec=excluded.rec, rev=excluded.rev;`,
    )
  }
  return out
}

let jumlahKeluarga = 0
let jumlahBaris = 0
for (const k of manifest.prod ?? []) {
  if (k.name.startsWith('__backup__:') || k.name.startsWith('uji-')) continue
  const doc = JSON.parse(fs.readFileSync(path.join(sumber, k.file), 'utf8'))
  if (typeof doc.nama_keluarga !== 'string' || !Array.isArray(doc.anggota)) {
    console.error('Lewati (bukan dokumen):', k.name)
    continue
  }
  const revisi = Number.isInteger(k.metadata?.revisi) && k.metadata.revisi >= 0 ? k.metadata.revisi : 0
  const diubah = typeof k.metadata?.diubah === 'string' ? k.metadata.diubah : sekarang
  barisSql.push(...sqlKeluarga(k.name, doc, revisi, diubah))
  jumlahKeluarga++
  jumlahBaris += doc.anggota.length
  console.log(`${k.name}: ${doc.anggota.length} anggota, revisi ${revisi}`)
}

fs.writeFileSync(tujuan, barisSql.join('\n') + '\n')
console.log(`\nTertulis: ${tujuan} (${jumlahKeluarga} keluarga, ${jumlahBaris} baris anggota)`)
