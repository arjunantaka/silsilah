import { writable, derived, get } from 'svelte/store';
import {
  db,
  initDatabase,
  getAllKeluarga as dbGetAllKeluarga,
  createKeluarga as dbCreateKeluarga,
  updateKeluarga as dbUpdateKeluarga,
  deleteKeluarga as dbDeleteKeluarga,
  setRootPerson as dbSetRootPerson,
  setLineagePreference as dbSetLineagePreference,
  getAllOrang as dbGetAllOrang,
  getPerson as dbGetPerson,
  createOrang as dbCreateOrang,
  updateOrang as dbUpdateOrang,
  deleteOrang as dbDeleteOrang,
  getAllPernikahan as dbGetAllPernikahan,
  createPernikahan as dbCreatePernikahan,
  updatePernikahan as dbUpdatePernikahan,
  deletePernikahan as dbDeletePernikahan,
  getHubunganKeluarga as dbGetHubunganKeluarga,
  createHubunganKeluarga as dbCreateHubunganKeluarga,
  updateHubunganKeluarga as dbUpdateHubunganKeluarga,
  deleteHubunganKeluarga as dbDeleteHubunganKeluarga,
  rebuildLineage as dbRebuildLineage,
  exportData as dbExportData,
  importData as dbImportData,
  resetAll as dbResetAll,
  getDiagnostics as dbGetDiagnostics,
  getLayout as dbGetLayout,
  setNodePosition as dbSetNodePosition
} from '../database/simple-manager.js';

// === Stores dasar ===
export const keluargaList = writable([]);
export const currentFamilyId = writable(null);
export const orangList = writable([]);
export const unionList = writable([]);
export const hubunganList = writable([]);
export const selectedPersonId = writable(null);
export const isLoading = writable(false);
export const searchQuery = writable('');
export const genderFilter = writable('semua');
export const lineagePreference = writable('matrilineal');
export const lastRebuildAt = writable(null);
export const nodePositions = writable({});

export const currentFamily = derived(
  [keluargaList, currentFamilyId],
  ([$keluargaList, $currentFamilyId]) =>
    $keluargaList.find((family) => family.id === $currentFamilyId) || null
);

export const selectedPerson = derived(
  [selectedPersonId, orangList],
  ([$selectedPersonId, $orangList]) =>
    $orangList.find((person) => person.id === $selectedPersonId) || null
);

export const filteredPersons = derived(
  [orangList, searchQuery, genderFilter],
  ([$orangList, $searchQuery, $genderFilter]) => {
    const query = $searchQuery.trim().toLowerCase();
    return $orangList.filter((person) => {
      const genderMatch =
        $genderFilter === 'semua' || person.gender === $genderFilter;
      const queryMatch =
        !query ||
        person.nama_lengkap.toLowerCase().includes(query) ||
        (person.nama_alias || '').toLowerCase().includes(query) ||
        (person.lineage_code || '').toLowerCase().includes(query);
      return genderMatch && queryMatch;
    });
  }
);

// === Helper internal ===
function syncFamilyData(familyId) {
  if (!familyId) {
    orangList.set([]);
    unionList.set([]);
    hubunganList.set([]);
    selectedPersonId.set(null);
    nodePositions.set({});
    return;
  }

  const people = dbGetAllOrang(familyId);
  const unions = dbGetAllPernikahan(familyId);
  const relations = dbGetHubunganKeluarga(familyId);
  orangList.set(people);
  unionList.set(unions);
  hubunganList.set(relations);

  ensureNodePositions(familyId, people);

  if (people.length > 0 && !get(selectedPersonId)) {
    selectedPersonId.set(people[0].id);
  }

  const diagnostics = dbGetDiagnostics(familyId);
  lineagePreference.set(
    diagnostics.summary[0]?.lineagePreference || 'matrilineal'
  );
  lastRebuildAt.set(diagnostics.lastRebuildAt || null);
}

function ensureNodePositions(familyId, people) {
  const layout = { ...dbGetLayout(familyId) };
  const countsByDepth = {};

  const depthForPerson = (person) => {
    if (person.lineage_path && person.lineage_path.length) {
      return person.lineage_path.length;
    }
    if (person.lineage_code === 'ROOT') return 0;
    if (person.lineage_code) {
      return Math.max(1, person.lineage_code.match(/[APBCgWrUdG]/g)?.length || 1);
    }
    return 1;
  };

  people.forEach((person) => {
    if (layout[person.id]) {
      const depth = depthForPerson(person);
      const current = countsByDepth[depth] || 0;
      const rowEstimate = Math.floor((layout[person.id].y || 0) / 160) + 1;
      countsByDepth[depth] = Math.max(current, rowEstimate);
    }
  });

  people.forEach((person) => {
    if (!layout[person.id]) {
      const depth = depthForPerson(person);
      const count = countsByDepth[depth] || 0;
      const position = {
        x: depth * 220 + 40,
        y: count * 160 + 40
      };
      layout[person.id] = position;
      countsByDepth[depth] = count + 1;
      dbSetNodePosition(familyId, person.id, position);
    }
  });

  nodePositions.set(layout);
}

// === API store ===
export const keluargaStore = {
  async initialize() {
    isLoading.set(true);
    try {
      await initDatabase();
      const families = dbGetAllKeluarga();
      keluargaList.set(families);
      if (families.length > 0) {
        currentFamilyId.set(families[0].id);
        syncFamilyData(families[0].id);
      }
    } catch (error) {
      console.error('Gagal inisialisasi database:', error);
    } finally {
      isLoading.set(false);
    }
  },

  refreshFamilyList() {
    const families = dbGetAllKeluarga();
    keluargaList.set(families);
  },

  setActiveFamily(familyId) {
    currentFamilyId.set(familyId);
    syncFamilyData(familyId);
  },

  createFamily(data) {
    const id = dbCreateKeluarga(data);
    this.refreshFamilyList();
    currentFamilyId.set(id);
    syncFamilyData(id);
    return id;
  },

  updateFamily(id, data) {
    dbUpdateKeluarga(id, data);
    this.refreshFamilyList();
  },

  deleteFamily(id) {
    dbDeleteKeluarga(id);
    this.refreshFamilyList();
    const remaining = get(keluargaList);
    const nextId = remaining[0]?.id || null;
    currentFamilyId.set(nextId);
    syncFamilyData(nextId);
  },

  // === Person ===
  createPerson(data) {
    const familyId = data.keluarga_id || get(currentFamily)?.id;
    if (!familyId) throw new Error('Pilih keluarga terlebih dahulu');
    const id = dbCreateOrang({ ...data, keluarga_id: familyId });
    syncFamilyData(familyId);
    selectedPersonId.set(id);
    return id;
  },

  updatePerson(id, data) {
    dbUpdateOrang(id, data);
    const familyId = get(currentFamily)?.id;
    syncFamilyData(familyId);
  },

  deletePerson(id) {
    const familyId = get(currentFamily)?.id;
    dbDeleteOrang(id);
    syncFamilyData(familyId);
  },

  // === Union ===
  createUnion(data) {
    const familyId = data.keluarga_id || get(currentFamily)?.id;
    if (!familyId) throw new Error('Pilih keluarga terlebih dahulu');
    const id = dbCreatePernikahan({ ...data, keluarga_id: familyId });
    syncFamilyData(familyId);
    return id;
  },

  updateUnion(id, data) {
    dbUpdatePernikahan(id, data);
    syncFamilyData(get(currentFamily)?.id);
  },

  deleteUnion(id) {
    dbDeletePernikahan(id);
    syncFamilyData(get(currentFamily)?.id);
  },

  // === Relations ===
  createRelation({ parentId, childId, unionId, birthOrder, jenis }) {
    dbCreateHubunganKeluarga(parentId, childId, unionId, birthOrder, jenis);
    syncFamilyData(get(currentFamily)?.id);
  },

  updateRelation(id, data) {
    dbUpdateHubunganKeluarga(id, data);
    syncFamilyData(get(currentFamily)?.id);
  },

  deleteRelation(id) {
    dbDeleteHubunganKeluarga(id);
    syncFamilyData(get(currentFamily)?.id);
  },

  setRoot(personId) {
    const familyId = get(currentFamily)?.id;
    if (!familyId) throw new Error('Pilih keluarga dahulu');
    dbSetRootPerson(familyId, personId);
    this.refreshFamilyList();
    syncFamilyData(familyId);
  },

  setLineagePreference(preference) {
    const familyId = get(currentFamily)?.id;
    if (!familyId) return;
    dbSetLineagePreference(familyId, preference);
    syncFamilyData(familyId);
  },

  rebuildLineage() {
    const familyId = get(currentFamily)?.id;
    if (!familyId) throw new Error('Pilih keluarga terlebih dahulu');
    dbRebuildLineage(familyId);
    syncFamilyData(familyId);
  },

  autoArrange() {
    const familyId = get(currentFamily)?.id;
    if (!familyId) return;
    const people = dbGetAllOrang(familyId);
    ensureNodePositions(familyId, people);
  },

  setNodePosition(personId, position) {
    const familyId = get(currentFamily)?.id;
    if (!familyId) return;
    dbSetNodePosition(familyId, personId, position);
    nodePositions.update((current) => ({
      ...(current || {}),
      [personId]: position
    }));
  },

  exportAllData() {
    return dbExportData();
  },

  importData(jsonText, options) {
    dbImportData(jsonText, options);
    this.refreshFamilyList();
    const active = get(currentFamily)?.id;
    syncFamilyData(active);
  },

  resetAll() {
    dbResetAll();
    keluargaList.set([]);
    currentFamilyId.set(null);
    orangList.set([]);
    unionList.set([]);
    hubunganList.set([]);
    selectedPersonId.set(null);
    lastRebuildAt.set(null);
  },

  getPersonDetail(personId) {
    return dbGetPerson(personId);
  },

  getDiagnostics(familyId) {
    return dbGetDiagnostics(familyId || get(currentFamily)?.id);
  }
};

// Utility untuk keturunan (ringkasan anak/cucu/buyut)
export function computeDescendantBuckets(personId) {
  const relations = get(hubunganList);
  const persons = get(orangList);
  const buckets = {
    anak: [],
    cucu: [],
    buyut: [],
    canggah: [],
    wareng: [],
    udhek: [],
    lainnya: []
  };

  const personMap = new Map(persons.map((p) => [p.id, p]));
  const childrenByParent = new Map();
  relations.forEach((relation) => {
    if (!childrenByParent.has(relation.parent_id)) {
      childrenByParent.set(relation.parent_id, []);
    }
    childrenByParent.get(relation.parent_id).push(relation.child_id);
  });

  const queue = [{ id: personId, depth: 0 }];
  const visited = new Set();

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const children = childrenByParent.get(id) || [];
    children.forEach((childId) => {
      const child = personMap.get(childId);
      if (!child) return;
      const nextDepth = depth + 1;
      const label =
        nextDepth === 1
          ? 'anak'
          : nextDepth === 2
          ? 'cucu'
          : nextDepth === 3
          ? 'buyut'
          : nextDepth === 4
          ? 'canggah'
          : nextDepth === 5
          ? 'wareng'
          : nextDepth === 6
          ? 'udhek'
          : 'lainnya';

      buckets[label].push(child);
      queue.push({ id: childId, depth: nextDepth });
    });
  }

  return buckets;
}
