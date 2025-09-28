import { writeFileSync } from 'fs';

if (!globalThis.localStorage) {
  globalThis.localStorage = {
    _data: new Map(),
    getItem(key) {
      return this._data.has(key) ? this._data.get(key) : null;
    },
    setItem(key, value) {
      this._data.set(key, String(value));
    },
    removeItem(key) {
      this._data.delete(key);
    },
    clear() {
      this._data.clear();
    }
  };
}

const { webcrypto } = await import('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import { db } from '../src/lib/database/simple-manager.js';

await db.initialize();
db.resetAll();

const keluargaId = db.createKeluarga({
  nama_keluarga: 'Keluarga Sadinan Sastro Dimejo',
  deskripsi: 'Contoh lengkap pasangan, anak, cucu, buyut, serta relasi biologis dan adopsi.'
});

const sadinanId = db.createOrang({
  keluarga_id: keluargaId,
  nama_lengkap: 'Sadiman Sastro Dimejo',
  nama_alias: 'Pak Sastro',
  gender: 'L',
  tempat_lahir: 'Gunungkidul',
  tanggal_lahir: '1940-07-12',
  alamat: 'Dusun Sumberagung RT 02',
  pekerjaan_sekolah: 'Pensiunan Guru',
  catatan: 'Tokoh utama keluarga',
  status_hidup: 'hidup'
});

const sutiyemId = db.createOrang({
  keluarga_id: keluargaId,
  nama_lengkap: 'Sutiyem',
  gender: 'P',
  tempat_lahir: 'Sleman',
  tanggal_lahir: '1945-05-21',
  pekerjaan_sekolah: 'Ibu Rumah Tangga',
  catatan: 'Ahli membuat jenang',
  status_hidup: 'hidup'
});

const pasanganUtamaId = db.createPernikahan({
  keluarga_id: keluargaId,
  partner1_id: sadinanId,
  partner2_id: sutiyemId,
  status: 'menikah',
  tanggal_mulai: '1964-11-02',
  tempat_nikah: 'Sleman'
});

db.setRootPerson(keluargaId, sadinanId);

function addChild(parentIds, data, birthOrder, unionId, jenis = 'biological') {
  const childId = db.createOrang({
    keluarga_id: keluargaId,
    status_hidup: 'hidup',
    ...data
  });

  parentIds.forEach((parentId) => {
    db.createHubunganKeluarga(parentId, childId, unionId, birthOrder, jenis);
  });

  return childId;
}

const suratmiId = addChild([sadinanId, sutiyemId], {
  nama_lengkap: 'A1. Suratmi',
  nama_alias: 'Mbak Ratmi',
  gender: 'P',
  tanggal_lahir: '1965-03-18',
  pekerjaan_sekolah: 'Perawat'
}, 1, pasanganUtamaId);

const suyatiId = addChild([sadinanId, sutiyemId], {
  nama_lengkap: 'A2. Suyati',
  gender: 'P',
  tanggal_lahir: '1967-09-26',
  pekerjaan_sekolah: 'Pengajar TK'
}, 2, pasanganUtamaId);

const sriSuwartiId = addChild([sadinanId, sutiyemId], {
  nama_lengkap: 'A3. Sri Suwarti',
  gender: 'P',
  tanggal_lahir: '1969-12-07',
  pekerjaan_sekolah: 'Wiraswasta'
}, 3, pasanganUtamaId);

const sugiyantoId = addChild([sadinanId, sutiyemId], {
  nama_lengkap: 'A6. Sugiyanto',
  gender: 'L',
  tanggal_lahir: '1974-04-11',
  pekerjaan_sekolah: 'PNS',
  catatan: 'Sering bertugas luar kota'
}, 6, pasanganUtamaId);

const rusmiyatiId = addChild([sadinanId, sutiyemId], {
  nama_lengkap: 'A7. Rusmiyati',
  gender: 'P',
  tanggal_lahir: '1976-08-30',
  pekerjaan_sekolah: 'Penjahit'
}, 7, pasanganUtamaId);

const sriMulyaniId = addChild([sadinanId, sutiyemId], {
  nama_lengkap: 'A9. Sri Mulyani',
  gender: 'P',
  tanggal_lahir: '1979-02-14',
  pekerjaan_sekolah: 'Ibu Rumah Tangga'
}, 9, pasanganUtamaId);

const partnerSuyatiId = db.createOrang({
  keluarga_id: keluargaId,
  nama_lengkap: 'Bambang Eko Santoso',
  gender: 'L',
  tanggal_lahir: '1964-01-22',
  pekerjaan_sekolah: 'Pegawai Bank'
});

const unionSuyatiId = db.createPernikahan({
  keluarga_id: keluargaId,
  partner1_id: suyatiId,
  partner2_id: partnerSuyatiId,
  status: 'menikah',
  tanggal_mulai: '1990-06-10'
});

const childSuyati1 = addChild([suyatiId, partnerSuyatiId], {
  nama_lengkap: 'B1. Bambang Eko Santoro',
  gender: 'L',
  tanggal_lahir: '1991-04-21',
  pekerjaan_sekolah: 'Programer'
}, 1, unionSuyatiId);

const childSuyati2 = addChild([suyatiId, partnerSuyatiId], {
  nama_lengkap: 'B2. Joko Muristo',
  gender: 'L',
  tanggal_lahir: '1993-11-04',
  pekerjaan_sekolah: 'Pengusaha Kuliner'
}, 2, unionSuyatiId);

const childSuyati3 = addChild([suyatiId, partnerSuyatiId], {
  nama_lengkap: 'B3. Tri Hastuti RN',
  gender: 'P',
  tanggal_lahir: '1996-05-17',
  pekerjaan_sekolah: 'Perawat'
}, 3, unionSuyatiId);

const partnerTriId = db.createOrang({
  keluarga_id: keluargaId,
  nama_lengkap: 'Edi Wasisto',
  gender: 'L',
  tanggal_lahir: '1992-08-01',
  pekerjaan_sekolah: 'Arsitek'
});

const unionTriId = db.createPernikahan({
  keluarga_id: keluargaId,
  partner1_id: childSuyati3,
  partner2_id: partnerTriId,
  status: 'menikah',
  tanggal_mulai: '2018-09-22'
});

addChild([childSuyati3, partnerTriId], {
  nama_lengkap: 'C1. Berto',
  gender: 'L',
  tanggal_lahir: '2019-01-03'
}, 1, unionTriId);

addChild([childSuyati3, partnerTriId], {
  nama_lengkap: 'C2. Siti Kumala Dewi',
  gender: 'P',
  tanggal_lahir: '2021-07-15'
}, 2, unionTriId);

const partnerSugiyantoId = db.createOrang({
  keluarga_id: keluargaId,
  nama_lengkap: 'Retno Sri P.',
  gender: 'P',
  tanggal_lahir: '1975-10-30',
  pekerjaan_sekolah: 'PNS'
});

const unionSugiyantoId = db.createPernikahan({
  keluarga_id: keluargaId,
  partner1_id: sugiyantoId,
  partner2_id: partnerSugiyantoId,
  status: 'menikah',
  tanggal_mulai: '1998-03-20'
});

addChild([sugiyantoId, partnerSugiyantoId], {
  nama_lengkap: 'B1. Retno Seti',
  gender: 'P',
  tanggal_lahir: '1999-12-01'
}, 1, unionSugiyantoId);

addChild([sugiyantoId, partnerSugiyantoId], {
  nama_lengkap: 'B2. Sri Lestari',
  gender: 'P',
  tanggal_lahir: '2002-06-09'
}, 2, unionSugiyantoId);

const partnerRusmiyatiId = db.createOrang({
  keluarga_id: keluargaId,
  nama_lengkap: 'Purnomo',
  gender: 'L',
  pekerjaan_sekolah: 'Wiraswasta'
});

const unionRusmiyatiId = db.createPernikahan({
  keluarga_id: keluargaId,
  partner1_id: rusmiyatiId,
  partner2_id: partnerRusmiyatiId,
  status: 'menikah',
  tanggal_mulai: '2001-04-14'
});

addChild([rusmiyatiId, partnerRusmiyatiId], {
  nama_lengkap: 'B1. Raharjo',
  gender: 'L',
  tanggal_lahir: '2003-02-27'
}, 1, unionRusmiyatiId);

addChild([rusmiyatiId, partnerRusmiyatiId], {
  nama_lengkap: 'B2. Putri Ayu',
  gender: 'P',
  tanggal_lahir: '2005-12-09'
}, 2, unionRusmiyatiId);

const partnerSriMulyaniId = db.createOrang({
  keluarga_id: keluargaId,
  nama_lengkap: 'Agus Riyanto',
  gender: 'L',
  pekerjaan_sekolah: 'Wiraswasta'
});

const unionSriMulyaniId = db.createPernikahan({
  keluarga_id: keluargaId,
  partner1_id: sriMulyaniId,
  partner2_id: partnerSriMulyaniId,
  status: 'menikah',
  tanggal_mulai: '2007-07-07'
});

addChild([sriMulyaniId, partnerSriMulyaniId], {
  nama_lengkap: 'B1. Kenji',
  gender: 'L',
  tanggal_lahir: '2008-08-05'
}, 1, unionSriMulyaniId);

addChild([sriMulyaniId, partnerSriMulyaniId], {
  nama_lengkap: 'B2. Rani Setianingsih',
  gender: 'P',
  tanggal_lahir: '2010-10-17'
}, 2, unionSriMulyaniId);

const anakAdopsiId = addChild([sriMulyaniId, partnerSriMulyaniId], {
  nama_lengkap: 'B3. Dimas (Adopsi)',
  gender: 'L',
  tanggal_lahir: '2012-01-11',
  catatan: 'Diadopsi saat berusia 3 tahun'
}, 3, unionSriMulyaniId, 'adoptive');

const sampleJson = db.exportData();
writeFileSync(new URL('../sample-data.json', import.meta.url), sampleJson, 'utf-8');
console.log('Sample data generated at frontend/sample-data.json');
