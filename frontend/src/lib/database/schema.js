/**
 * Database Schema untuk Silsilah Keluarga
 * Simple SQLite schema untuk penggunaan lokal
 */

export const DATABASE_SCHEMA = `
-- Family Groups
CREATE TABLE IF NOT EXISTS keluarga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_keluarga TEXT NOT NULL,
    kepala_keluarga TEXT DEFAULT '',
    deskripsi TEXT DEFAULT '',
    prefix TEXT DEFAULT '',
    root_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (root_id) REFERENCES orang (id)
);

-- Persons
CREATE TABLE IF NOT EXISTS orang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keluarga_id INTEGER NOT NULL,
    nama_lengkap TEXT NOT NULL,
    nama_panggilan TEXT DEFAULT '',
    jenis_kelamin TEXT DEFAULT '', -- L/P
    tempat_lahir TEXT DEFAULT '',
    tanggal_lahir TEXT DEFAULT '', -- YYYY-MM-DD format
    status_hidup TEXT DEFAULT 'hidup', -- hidup/wafat
    tanggal_wafat TEXT DEFAULT '', -- YYYY-MM-DD format
    alamat TEXT DEFAULT '',
    pekerjaan TEXT DEFAULT '',
    pendidikan TEXT DEFAULT '',
    telepon TEXT DEFAULT '',
    email TEXT DEFAULT '',
    catatan TEXT DEFAULT '',
    lineage_path TEXT DEFAULT '', -- ".1.2." format
    lineage_code TEXT DEFAULT '', -- "A1P2" format  
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keluarga_id) REFERENCES keluarga (id)
);

-- Unions/Pernikahan
CREATE TABLE IF NOT EXISTS pernikahan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keluarga_id INTEGER NOT NULL,
    suami_id INTEGER NOT NULL,
    istri_id INTEGER NOT NULL,
    tanggal_nikah TEXT DEFAULT '',
    tanggal_cerai TEXT DEFAULT '',
    tempat_nikah TEXT DEFAULT '',
    status TEXT DEFAULT 'menikah', -- menikah/cerai/duda/janda
    catatan TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keluarga_id) REFERENCES keluarga (id),
    FOREIGN KEY (suami_id) REFERENCES orang (id),
    FOREIGN KEY (istri_id) REFERENCES orang (id)
);

-- Parent-Child Relations
CREATE TABLE IF NOT EXISTS hubungan_keluarga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orang_tua_id INTEGER NOT NULL,
    anak_id INTEGER NOT NULL,
    pernikahan_id INTEGER,
    urutan_lahir INTEGER NOT NULL,
    jenis TEXT DEFAULT 'kandung', -- kandung/angkat/tiri
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orang_tua_id) REFERENCES orang (id),
    FOREIGN KEY (anak_id) REFERENCES orang (id),
    FOREIGN KEY (pernikahan_id) REFERENCES pernikahan (id)
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_orang_keluarga ON orang (keluarga_id);
CREATE INDEX IF NOT EXISTS idx_orang_lineage ON orang (lineage_code);
CREATE INDEX IF NOT EXISTS idx_hubungan_orangtua ON hubungan_keluarga (orang_tua_id);
CREATE INDEX IF NOT EXISTS idx_hubungan_anak ON hubungan_keluarga (anak_id);
`;

export const SAMPLE_DATA = `
-- Sample Family Group
INSERT OR REPLACE INTO keluarga (id, nama_keluarga, kepala_keluarga, deskripsi, prefix) VALUES 
(1, 'Keluarga Besar Hartono', 'Hartono Wirjosoedirjo', 'Keluarga besar dari Yogyakarta dengan tiga generasi', 'HT');

-- Sample People
INSERT OR REPLACE INTO orang (id, keluarga_id, nama_lengkap, nama_panggilan, jenis_kelamin, tempat_lahir, tanggal_lahir) VALUES
(1, 1, 'Hartono Wirjosoedirjo', 'Pak Hartono', 'L', 'Yogyakarta', '1945-08-17'),
(2, 1, 'Siti Hartinah', 'Bu Siti', 'P', 'Solo', '1947-03-10'),
(3, 1, 'Bambang Hartono', 'Mas Bambang', 'L', 'Yogyakarta', '1970-05-15'),
(4, 1, 'Sari Hartini', 'Mbak Sari', 'P', 'Yogyakarta', '1972-09-20');

-- Sample Marriage
INSERT OR REPLACE INTO pernikahan (id, keluarga_id, suami_id, istri_id, tanggal_nikah, tempat_nikah) VALUES
(1, 1, 1, 2, '1968-06-12', 'Yogyakarta');

-- Sample Relations
INSERT OR REPLACE INTO hubungan_keluarga (orang_tua_id, anak_id, pernikahan_id, urutan_lahir) VALUES
(1, 3, 1, 1),
(1, 4, 1, 2);

-- Set root
UPDATE keluarga SET root_id = 1 WHERE id = 1;
`;