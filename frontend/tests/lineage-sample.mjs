global.localStorage = {
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

if (!global.crypto) {
  const { webcrypto } = await import('crypto');
  global.crypto = webcrypto;
}

import { db } from '../src/lib/database/simple-manager.js';

await db.initialize();
db.resetAll();

const familyId = db.createKeluarga({ nama_keluarga: 'Keluarga Sampel' });

const rootId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Sadiman Sastro Dimejo', gender: 'L' });
const spouseId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Sutiyem', gender: 'P' });
const unionId = db.createPernikahan({ keluarga_id: familyId, partner1_id: rootId, partner2_id: spouseId, status: 'menikah' });

db.setRootPerson(familyId, rootId);

const childAId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Suyati', gender: 'P' });
const childBId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Sugiyanto', gender: 'L' });
const childCId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Sri Suwarti', gender: 'P' });

db.createHubunganKeluarga(rootId, childAId, unionId, 1, 'biological');
db.createHubunganKeluarga(spouseId, childAId, unionId, 1, 'biological');
db.createHubunganKeluarga(rootId, childBId, unionId, 2, 'biological');
db.createHubunganKeluarga(spouseId, childBId, unionId, 2, 'biological');
db.createHubunganKeluarga(rootId, childCId, unionId, 3, 'biological');
db.createHubunganKeluarga(spouseId, childCId, unionId, 3, 'biological');

const childSpouseId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Budi Raharjo', gender: 'L' });
const childUnionId = db.createPernikahan({ keluarga_id: familyId, partner1_id: childAId, partner2_id: childSpouseId, status: 'menikah' });
const grandChildId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Indah S. R.', gender: 'P' });
db.createHubunganKeluarga(childAId, grandChildId, childUnionId, 1, 'biological');
db.createHubunganKeluarga(childSpouseId, grandChildId, childUnionId, 1, 'biological');

const descendantUnionId = db.createPernikahan({ keluarga_id: familyId, partner1_id: childBId, partner2_id: childCId, status: 'menikah' });
const descendantChildId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Agus', gender: 'L' });
db.createHubunganKeluarga(childBId, descendantChildId, descendantUnionId, 1, 'biological');
db.createHubunganKeluarga(childCId, descendantChildId, descendantUnionId, 1, 'biological');

db.rebuildLineage(familyId);

const getAgus = () => db.getAllOrang(familyId).find((p) => p.nama_lengkap === 'Agus');

console.log('Kode setelah rebuild (matrilineal default):');
db.getAllOrang(familyId).forEach((person) => {
  console.log(person.nama_lengkap.padEnd(25), person.lineage_code);
});
console.log('Kode Agus:', getAgus()?.lineage_code);

console.log('\nGanti preferensi ke patrilineal dan rebuild...');
db.setLineagePreference(familyId, 'patrilineal');
db.rebuildLineage(familyId);
db.getAllOrang(familyId).forEach((person) => {
  console.log(person.nama_lengkap.padEnd(25), person.lineage_code);
});
console.log('Kode Agus:', getAgus()?.lineage_code);
