-- Satu sumber kebenaran: D1. Satu baris per anggota supaya dua user yang
-- mengedit orang berbeda tidak pernah saling menimpa.
-- `revisi` = kursor perubahan per keluarga (bukan gerbang tulisan).

CREATE TABLE IF NOT EXISTS keluarga (
  kode   TEXT PRIMARY KEY,
  nama   TEXT NOT NULL,
  revisi INTEGER NOT NULL,
  diubah TEXT NOT NULL,
  jumlah INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS anggota (
  kode TEXT NOT NULL,
  id   TEXT NOT NULL,
  rec  TEXT NOT NULL,
  rev  INTEGER NOT NULL,
  PRIMARY KEY (kode, id)
);

CREATE INDEX IF NOT EXISTS anggota_delta ON anggota (kode, rev);

CREATE TABLE IF NOT EXISTS hapus (
  kode TEXT NOT NULL,
  id   TEXT NOT NULL,
  rev  INTEGER NOT NULL,
  PRIMARY KEY (kode, id)
);

-- Dokumen keluarga yang dihapus lewat DELETE /api/data, untuk pemulihan manual.
CREATE TABLE IF NOT EXISTS arsip (
  kode   TEXT PRIMARY KEY,
  rec    TEXT NOT NULL,
  diubah TEXT NOT NULL
);
