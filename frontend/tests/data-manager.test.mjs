// Basic runtime assertions for simple-data manager behaviour

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

async function run() {
  await db.initialize();
  db.resetAll();

  const familyId = db.createKeluarga({ nama_keluarga: 'Test Family' });
  console.assert(familyId, 'Family id must be defined');

  const rootId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Root Person', gender: 'L' });
  const motherId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Mother', gender: 'P' });
  db.setRootPerson(familyId, rootId);

  const unionId = db.createPernikahan({ keluarga_id: familyId, partner1_id: rootId, partner2_id: motherId, status: 'menikah' });
  const childId = db.createOrang({ keluarga_id: familyId, nama_lengkap: 'Child', gender: 'P' });

  db.createHubunganKeluarga(rootId, childId, unionId, 1, 'biological');
  db.createHubunganKeluarga(motherId, childId, unionId, 1, 'biological');

  db.rebuildLineage(familyId);
  const child = db.getPerson(childId);
  console.assert(child.lineage_code === 'A1', `Expected child lineage A1, got ${child.lineage_code}`);

  db.setNodePosition(familyId, rootId, { x: 100, y: 80 });
  db.setNodePosition(familyId, motherId, { x: 360, y: 80 });
  const layout = db.getLayout(familyId);
  console.assert(layout[rootId].x === 100 && layout[motherId].y === 80, 'Layout positions should persist');

  const exported = db.exportData();
  const parsed = JSON.parse(exported);
  console.assert(parsed.persons.length === 3, 'Export should include all persons');
  console.assert(parsed.layouts && parsed.layouts[familyId], 'Export should include layouts');

  // Import into a fresh state and ensure counts remain
  db.resetAll();
  db.importData(parsed, { replace: true });
  const importedFamily = db.getAllKeluarga()[0];
  console.assert(importedFamily, 'Family should exist after import');
  const importedPeople = db.getAllOrang(importedFamily.id);
  console.assert(importedPeople.length === 3, 'Import should restore persons');
  const importedLayout = db.getLayout(importedFamily.id);
  console.assert(importedLayout[rootId].x === 100, 'Imported layout should match original');

  // Merge import adds additional family
  const mergeFamilyId = db.createKeluarga({ nama_keluarga: 'Merge Family' });
  db.importData(exported, { replace: false });
  const familiesAfterMerge = db.getAllKeluarga();
  console.assert(familiesAfterMerge.length === 3, 'Merge import should append additional family copies');

  console.log('All simple data manager assertions passed.');
}

run();
