// Simple data manager for offline single-user usage.
// Menyimpan seluruh data aplikasi di localStorage sebagai JSON tunggal.

import sampleData from '../sample-data.mjs';

const STORAGE_KEY = 'silsilah_keluarga_v2';
const LEGACY_KEYS = {
  families: 'simple_families',
  persons: 'simple_persons',
  relations: 'simple_relations',
  marriages: 'simple_marriages'
};

const GENERATION_LABELS = ['A', 'P', 'B', 'Cg', 'Wr', 'Ud'];

const DEFAULT_SAMPLE = sampleData || null;

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

class SimpleDatabaseManager {
  constructor() {
    this.state = {
      families: [],
      persons: [],
      unions: [],
      relations: [],
      settings: {
        lineagePreference: 'matrilineal'
      },
      metadata: {
        lastRebuildAt: null
      },
      layouts: {}
    };
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    this.loadFromStorage();
    this.isInitialized = true;
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = {
          families: parsed.families || [],
          persons: parsed.persons || [],
          unions: parsed.unions || [],
          relations: parsed.relations || [],
          settings: parsed.settings || { lineagePreference: 'matrilineal' },
          metadata: parsed.metadata || { lastRebuildAt: null },
          layouts: parsed.layouts || {}
        };
        return;
      }

      // Cek data lama dan lakukan migrasi sederhana bila ada.
      const legacyFamilies = localStorage.getItem(LEGACY_KEYS.families);
      if (legacyFamilies) {
        this.migrateLegacyData();
        return;
      }

      if (DEFAULT_SAMPLE && DEFAULT_SAMPLE.families?.length) {
        this.state = {
          families: deepClone(DEFAULT_SAMPLE.families),
          persons: deepClone(DEFAULT_SAMPLE.persons || []),
          unions: deepClone(DEFAULT_SAMPLE.unions || []),
          relations: deepClone(DEFAULT_SAMPLE.relations || []),
          settings: DEFAULT_SAMPLE.settings || { lineagePreference: 'matrilineal' },
          metadata: DEFAULT_SAMPLE.metadata || { lastRebuildAt: null },
          layouts: DEFAULT_SAMPLE.layouts || {}
        };
        this.persist();
      }
    } catch (error) {
      console.error('Gagal memuat data dari storage:', error);
    }
  }

  migrateLegacyData() {
    try {
      const families = JSON.parse(localStorage.getItem(LEGACY_KEYS.families) || '[]');
      const persons = JSON.parse(localStorage.getItem(LEGACY_KEYS.persons) || '[]');
      const relations = JSON.parse(localStorage.getItem(LEGACY_KEYS.relations) || '[]');
      const marriages = JSON.parse(localStorage.getItem(LEGACY_KEYS.marriages) || '[]');

      this.state.families = families.map((f) => ({
        id: String(f.id ?? generateId()),
        nama: f.nama_keluarga || f.nama || 'Keluarga Tanpa Nama',
        root_id: f.root_id || null,
        catatan: f.deskripsi || '',
        settings: {
          lineagePreference: 'matrilineal'
        }
      }));

      this.state.persons = persons.map((p) => ({
        id: String(p.id ?? generateId()),
        keluarga_id: String(p.keluarga_id ?? ''),
        nama_lengkap: p.nama_lengkap || 'Tanpa Nama',
        nama_alias: p.nama_panggilan || '',
        gender: p.jenis_kelamin || 'unknown',
        tempat_lahir: p.tempat_lahir || '',
        tanggal_lahir: p.tanggal_lahir || '',
        tanggal_wafat: p.tanggal_wafat || '',
        alamat: p.alamat || '',
        pekerjaan_sekolah: p.pekerjaan || '',
        catatan: p.catatan || '',
        foto_path: p.foto_path || '',
        status_hidup: p.status_hidup || 'hidup',
        lineage_code: p.lineage_code || '',
        lineage_path: Array.isArray(p.lineage_path) ? p.lineage_path : []
      }));

      this.state.unions = marriages.map((m) => ({
        id: String(m.id ?? generateId()),
        keluarga_id: this.resolveFamilyId(m.suami_id || m.istri_id || ''),
        partner1_id: String(m.suami_id ?? ''),
        partner2_id: String(m.istri_id ?? ''),
        status: m.status || 'menikah',
        tanggal_mulai: m.tanggal_nikah || '',
        tanggal_akhir: m.tanggal_cerai || '',
        catatan: m.catatan || ''
      }));

      this.state.relations = relations.map((r) => ({
        id: String(r.id ?? generateId()),
        parent_id: String(r.orang_tua_id ?? ''),
        child_id: String(r.anak_id ?? ''),
        union_id: r.pernikahan_id ? String(r.pernikahan_id) : null,
        jenis: r.jenis === 'kandung' ? 'biological' : (r.jenis || 'biological'),
        birth_order: Number(r.urutan_lahir ?? 0)
      }));

      this.state.layouts = {};

      this.saveToStorage();
    } catch (error) {
      console.error('Gagal migrasi data lama:', error);
      this.state = {
        families: [],
        persons: [],
        unions: [],
        relations: [],
        settings: {
          lineagePreference: 'matrilineal'
        },
        metadata: {
          lastRebuildAt: null
        }
      };
      this.saveToStorage();
    }
  }

  resolveFamilyId(personId) {
    const person = this.state.persons.find((p) => String(p.id) === String(personId));
    return person ? person.keluarga_id : '';
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Gagal menyimpan data ke storage:', error);
    }
  }

  getSnapshot() {
    return deepClone(this.state);
  }

  // ===== Family Operations =====

  getAllKeluarga() {
    return this.state.families.map((family) => ({
      ...family,
      jumlah_anggota: this.state.persons.filter((p) => p.keluarga_id === family.id).length
    }));
  }

  createKeluarga(data) {
    const family = {
      id: generateId(),
      nama: data.nama_keluarga || data.nama || 'Keluarga Baru',
      root_id: null,
      catatan: data.deskripsi || '',
      settings: {
        lineagePreference: 'matrilineal'
      }
    };
    this.state.families.push(family);
    this.persist();
    return family.id;
  }

  updateKeluarga(id, data) {
    const index = this.state.families.findIndex((f) => f.id === id);
    if (index === -1) return;

    this.state.families[index] = {
      ...this.state.families[index],
      nama: data.nama_keluarga || data.nama || this.state.families[index].nama,
      catatan: data.deskripsi ?? this.state.families[index].catatan
    };

    if (data.lineagePreference) {
      this.state.families[index].settings = {
        ...(this.state.families[index].settings || {}),
        lineagePreference: data.lineagePreference
      };
    }

    this.persist();
  }

  deleteKeluarga(id) {
    this.state.persons = this.state.persons.filter((p) => p.keluarga_id !== id);
    this.state.unions = this.state.unions.filter((u) => u.keluarga_id !== id);
    this.state.relations = this.state.relations.filter((r) => {
      const parent = this.state.persons.find((p) => p.id === r.parent_id);
      const child = this.state.persons.find((p) => p.id === r.child_id);
      return parent?.keluarga_id !== id && child?.keluarga_id !== id;
    });
    this.state.families = this.state.families.filter((f) => f.id !== id);
    delete this.state.layouts[id];
    this.persist();
  }

  setRootPerson(familyId, personId) {
    const family = this.state.families.find((f) => f.id === familyId);
    if (!family) return;
    family.root_id = personId;
    this.persist();
  }

  setLineagePreference(familyId, preference) {
    const family = this.state.families.find((f) => f.id === familyId);
    if (!family) return;
    family.settings = family.settings || {};
    family.settings.lineagePreference = preference;
    this.persist();
  }

  // ===== Person Operations =====

  getAllOrang(keluargaId) {
    return this.state.persons
      .filter((p) => (keluargaId ? p.keluarga_id === keluargaId : true))
      .map((p) => ({ ...p }));
  }

  getPerson(personId) {
    return this.state.persons.find((p) => p.id === personId) || null;
  }

  createOrang(data) {
    if (!data.keluarga_id) {
      throw new Error('keluarga_id wajib diisi saat membuat anggota keluarga');
    }

    const person = {
      id: generateId(),
      keluarga_id: data.keluarga_id,
      nama_lengkap: data.nama_lengkap || 'Tanpa Nama',
      nama_alias: data.nama_alias || data.nama_panggilan || '',
      gender: data.jenis_kelamin || data.gender || 'unknown',
      tempat_lahir: data.tempat_lahir || '',
      tanggal_lahir: data.tanggal_lahir || '',
      tanggal_wafat: data.tanggal_wafat || '',
      alamat: data.alamat || '',
      pekerjaan_sekolah: data.pekerjaan_sekolah || data.pekerjaan || '',
      catatan: data.catatan || '',
      foto_path: data.foto_path || '',
      status_hidup: data.status_hidup || 'hidup',
      lineage_code: '',
      lineage_path: []
    };

    this.state.persons.push(person);
    this.persist();
    return person.id;
  }

  updateOrang(id, data) {
    const index = this.state.persons.findIndex((p) => p.id === id);
    if (index === -1) return;

    this.state.persons[index] = {
      ...this.state.persons[index],
      ...data,
      nama_alias: data.nama_alias ?? data.nama_panggilan ?? this.state.persons[index].nama_alias,
      pekerjaan_sekolah: data.pekerjaan_sekolah ?? data.pekerjaan ?? this.state.persons[index].pekerjaan_sekolah,
      gender: data.gender ?? data.jenis_kelamin ?? this.state.persons[index].gender
    };

    this.persist();
  }

  deleteOrang(id) {
    this.state.persons = this.state.persons.filter((p) => p.id !== id);
    this.state.relations = this.state.relations.filter((r) => r.parent_id !== id && r.child_id !== id);
    this.state.unions = this.state.unions.filter((u) => u.partner1_id !== id && u.partner2_id !== id);
    Object.keys(this.state.layouts).forEach((familyId) => {
      if (this.state.layouts[familyId]) {
        delete this.state.layouts[familyId][id];
      }
    });
    this.persist();
  }

  // ===== Union (Pasangan) Operations =====

  getAllPernikahan(keluargaId) {
    return this.state.unions
      .filter((u) => (keluargaId ? u.keluarga_id === keluargaId : true))
      .map((u) => ({ ...u }));
  }

  createPernikahan(data) {
    if (!data.keluarga_id) throw new Error('keluarga_id wajib diisi untuk pernikahan');

    const union = {
      id: generateId(),
      keluarga_id: data.keluarga_id,
      partner1_id: data.partner1_id || data.suami_id,
      partner2_id: data.partner2_id || data.istri_id,
      status: data.status || 'menikah',
      tanggal_mulai: data.tanggal_mulai || data.tanggal_nikah || '',
      tanggal_akhir: data.tanggal_akhir || data.tanggal_cerai || '',
      catatan: data.catatan || ''
    };

    this.state.unions.push(union);
    this.persist();
    return union.id;
  }

  updatePernikahan(id, data) {
    const index = this.state.unions.findIndex((u) => u.id === id);
    if (index === -1) return;

    this.state.unions[index] = {
      ...this.state.unions[index],
      ...data,
      partner1_id: data.partner1_id || data.suami_id || this.state.unions[index].partner1_id,
      partner2_id: data.partner2_id || data.istri_id || this.state.unions[index].partner2_id,
      tanggal_mulai: data.tanggal_mulai || data.tanggal_nikah || this.state.unions[index].tanggal_mulai,
      tanggal_akhir: data.tanggal_akhir || data.tanggal_cerai || this.state.unions[index].tanggal_akhir
    };

    this.persist();
  }

  deletePernikahan(id) {
    this.state.unions = this.state.unions.filter((u) => u.id !== id);
    this.state.relations = this.state.relations.map((relation) =>
      relation.union_id === id ? { ...relation, union_id: null } : relation
    );
    this.persist();
  }

  // ===== Parent-Child Relations =====

  getHubunganKeluarga(keluargaId) {
    const personIds = new Set(
      this.state.persons
        .filter((p) => !keluargaId || p.keluarga_id === keluargaId)
        .map((p) => p.id)
    );

    return this.state.relations
      .filter((r) => personIds.has(r.parent_id) && personIds.has(r.child_id))
      .map((r) => ({ ...r }));
  }

  createHubunganKeluarga(parentId, childId, unionId, birthOrder, jenis = 'biological') {
    const relation = {
      id: generateId(),
      parent_id: parentId,
      child_id: childId,
      union_id: unionId || null,
      jenis,
      birth_order: Number(birthOrder)
    };

    // Validasi maksimal dua orang tua biologis.
    const existingParents = this.state.relations.filter(
      (r) => r.child_id === childId && (r.jenis === 'biological' || jenis === 'biological')
    );
    const uniqueParents = new Set(existingParents.map((r) => r.parent_id));
    if (!uniqueParents.has(parentId) && uniqueParents.size >= 2) {
      throw new Error('Seorang anak tidak boleh memiliki lebih dari dua orang tua biologis');
    }

    // Validasi birth order unik per union.
    if (unionId) {
      const conflict = this.state.relations.find(
        (r) => r.union_id === unionId && r.birth_order === relation.birth_order && r.child_id !== childId
      );
      if (conflict) {
        throw new Error(`Urutan lahir ${birthOrder} sudah dipakai dalam pasangan ini`);
      }
    }

    this.state.relations.push(relation);
    this.persist();
    return relation.id;
  }

  updateHubunganKeluarga(id, data) {
    const index = this.state.relations.findIndex((r) => r.id === id);
    if (index === -1) return;

    const updated = {
      ...this.state.relations[index],
      ...data
    };

    if (data.birth_order !== undefined && updated.union_id) {
      const conflict = this.state.relations.find(
        (r) =>
          r.union_id === updated.union_id &&
          r.birth_order === Number(data.birth_order) &&
          r.id !== id
      );
      if (conflict) {
        throw new Error(`Urutan lahir ${data.birth_order} sudah dipakai dalam pasangan ini`);
      }
      updated.birth_order = Number(data.birth_order);
    }

    this.state.relations[index] = updated;
    this.persist();
  }

  deleteHubunganKeluarga(id) {
    this.state.relations = this.state.relations.filter((r) => r.id !== id);
    this.persist();
  }

  // ===== Lineage =====

  rebuildLineage(keluargaId) {
    const family = this.state.families.find((f) => f.id === keluargaId);
    if (!family) {
      throw new Error('Keluarga tidak ditemukan');
    }
    if (!family.root_id) {
      throw new Error('Tetapkan root terlebih dahulu sebelum rebuild');
    }

    const persons = this.state.persons.filter((p) => p.keluarga_id === keluargaId);
    const personMap = new Map(persons.map((p) => [p.id, p]));
    const relations = this.state.relations.filter((r) => personMap.has(r.parent_id) && personMap.has(r.child_id));
    const preference = family.settings?.lineagePreference || this.state.settings.lineagePreference || 'matrilineal';

    const childrenByParent = new Map();
    relations.forEach((relation) => {
      if (!childrenByParent.has(relation.parent_id)) {
        childrenByParent.set(relation.parent_id, []);
      }
      childrenByParent.get(relation.parent_id).push(relation);
    });

    for (const list of childrenByParent.values()) {
      list.sort((a, b) => {
        if (a.union_id && b.union_id && a.union_id !== b.union_id) {
          return a.union_id.localeCompare(b.union_id);
        }
        return a.birth_order - b.birth_order;
      });
    }

    const parentsByChild = new Map();
    relations.forEach((relation) => {
      if (!parentsByChild.has(relation.child_id)) {
        parentsByChild.set(relation.child_id, []);
      }
      parentsByChild.get(relation.child_id).push(relation.parent_id);
    });

    const reachableFromRoot = new Set();
    const queue = [family.root_id];
    while (queue.length > 0) {
      const parentId = queue.shift();
      if (!parentId || reachableFromRoot.has(parentId)) continue;
      reachableFromRoot.add(parentId);
      const children = childrenByParent.get(parentId) || [];
      children.forEach((relation) => {
        if (!reachableFromRoot.has(relation.child_id)) {
          queue.push(relation.child_id);
        }
      });
    }

    const determinePrimaryParent = (childId) => {
      const parents = parentsByChild.get(childId) || [];
      if (parents.length <= 1) {
        return parents[0] || null;
      }

      const detailedParents = parents
        .map((parentId) => personMap.get(parentId))
        .filter(Boolean);

      const pickPreferred = (gender) =>
        detailedParents.find((p) => p.gender === gender && reachableFromRoot.has(p.id));

      if (preference === 'matrilineal') {
        const mother = pickPreferred('P');
        if (mother) return mother.id;
      } else {
        const father = pickPreferred('L');
        if (father) return father.id;
      }
      const fallback = detailedParents.find((p) => reachableFromRoot.has(p.id));
      return fallback?.id || detailedParents[0]?.id || null;
    };

    const rootPerson = personMap.get(family.root_id);
    if (!rootPerson) {
      throw new Error('Data root tidak ditemukan di daftar anggota');
    }

    const rootId = rootPerson.id;

    const visit = (personId, path) => {
      const person = personMap.get(personId);
      if (!person) return;

      person.lineage_path = path.slice();
      person.lineage_code = this.pathToCode(path);

      const children = childrenByParent.get(personId) || [];
      children.forEach((relation) => {
        const primaryParent = determinePrimaryParent(relation.child_id);
        if (personId !== rootId && primaryParent !== personId) return;

        const nextPath = path.concat(Number(relation.birth_order));
        visit(relation.child_id, nextPath);
      });
    };

    // Reset sebelum traversal
    persons.forEach((person) => {
      person.lineage_code = '';
      person.lineage_path = [];
    });

    rootPerson.lineage_code = 'ROOT';
    rootPerson.lineage_path = [];
    visit(rootPerson.id, []);

    this.state.metadata.lastRebuildAt = new Date().toISOString();
    this.persist();
  }

  pathToCode(path) {
    if (!path || path.length === 0) {
      return 'ROOT';
    }

    return path
      .map((order, index) => {
        if (index < GENERATION_LABELS.length) {
          return `${GENERATION_LABELS[index]}${order}`;
        }
        return `G${index + 1}${order}`;
      })
      .join('');
  }

  // ===== Export & Import =====

  exportData() {
    return JSON.stringify(this.state, null, 2);
  }

  importData(jsonText, { replace = true } = {}) {
    const parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Format data tidak valid');
    }

    const cleaned = {
      families: Array.isArray(parsed.families) ? parsed.families : [],
      persons: Array.isArray(parsed.persons) ? parsed.persons : [],
      unions: Array.isArray(parsed.unions) ? parsed.unions : [],
      relations: Array.isArray(parsed.relations) ? parsed.relations : [],
      settings: parsed.settings || { lineagePreference: 'matrilineal' },
      metadata: parsed.metadata || { lastRebuildAt: null },
      layouts: parsed.layouts || {}
    };

    if (replace) {
      this.state = cleaned;
    } else {
      this.state.families.push(...cleaned.families);
      this.state.persons.push(...cleaned.persons);
      this.state.unions.push(...cleaned.unions);
      this.state.relations.push(...cleaned.relations);
      this.state.settings = cleaned.settings;
      this.state.metadata = cleaned.metadata;
      this.state.layouts = {
        ...this.state.layouts,
        ...cleaned.layouts
      };
    }

    this.persist();
  }

  resetAll() {
    this.state = {
      families: [],
      persons: [],
      unions: [],
      relations: [],
      settings: {
        lineagePreference: 'matrilineal'
      },
      metadata: {
        lastRebuildAt: null
      },
      layouts: {}
    };
    this.persist();
  }

  // ===== Diagnostics =====

  getDiagnostics(familyId) {
    const families = familyId
      ? this.state.families.filter((f) => f.id === familyId)
      : this.state.families;

    const summary = families.map((family) => {
      const persons = this.state.persons.filter((p) => p.keluarga_id === family.id);
      const unions = this.state.unions.filter((u) => u.keluarga_id === family.id);
      const relations = this.state.relations.filter((r) => persons.some((p) => p.id === r.child_id));

      const deepestPath = persons.reduce((max, person) => {
        return Math.max(max, person.lineage_path?.length || 0);
      }, 0);

      return {
        familyId: family.id,
        nama: family.nama,
        totalPerson: persons.length,
        totalUnion: unions.length,
        totalRelation: relations.length,
        rootId: family.root_id,
        deepestGeneration: deepestPath,
        lineagePreference: family.settings?.lineagePreference || 'matrilineal'
      };
    });

    return {
      summary,
      lastRebuildAt: this.state.metadata.lastRebuildAt
    };
  }

  getLayout(familyId) {
    return this.state.layouts[familyId] || {};
  }

  setNodePosition(familyId, personId, position) {
    if (!this.state.layouts[familyId]) {
      this.state.layouts[familyId] = {};
    }
    this.state.layouts[familyId][personId] = position;
    this.persist();
  }
}

export const db = new SimpleDatabaseManager();

// Re-export helper untuk kemudahan komponen
export async function initDatabase() {
  return db.initialize();
}

export function getAllKeluarga() {
  return db.getAllKeluarga();
}

export function createKeluarga(data) {
  return db.createKeluarga(data);
}

export function updateKeluarga(id, data) {
  return db.updateKeluarga(id, data);
}

export function deleteKeluarga(id) {
  return db.deleteKeluarga(id);
}

export function setRootPerson(keluargaId, personId) {
  return db.setRootPerson(keluargaId, personId);
}

export function setLineagePreference(keluargaId, preference) {
  return db.setLineagePreference(keluargaId, preference);
}

export function getAllOrang(keluargaId) {
  return db.getAllOrang(keluargaId);
}

export function getPerson(personId) {
  return db.getPerson(personId);
}

export function createOrang(data) {
  return db.createOrang(data);
}

export function updateOrang(id, data) {
  return db.updateOrang(id, data);
}

export function deleteOrang(id) {
  return db.deleteOrang(id);
}

export function getHubunganKeluarga(keluargaId) {
  return db.getHubunganKeluarga(keluargaId);
}

export function createHubunganKeluarga(parentId, childId, unionId, birthOrder, jenis) {
  return db.createHubunganKeluarga(parentId, childId, unionId, birthOrder, jenis);
}

export function updateHubunganKeluarga(id, data) {
  return db.updateHubunganKeluarga(id, data);
}

export function deleteHubunganKeluarga(id) {
  return db.deleteHubunganKeluarga(id);
}

export function getAllPernikahan(keluargaId) {
  return db.getAllPernikahan(keluargaId);
}

export function createPernikahan(data) {
  return db.createPernikahan(data);
}

export function updatePernikahan(id, data) {
  return db.updatePernikahan(id, data);
}

export function deletePernikahan(id) {
  return db.deletePernikahan(id);
}

export function rebuildLineage(keluargaId) {
  return db.rebuildLineage(keluargaId);
}

export function getLayout(keluargaId) {
  return db.getLayout(keluargaId);
}

export function setNodePosition(familyId, personId, position) {
  return db.setNodePosition(familyId, personId, position);
}

export function exportData() {
  return db.exportData();
}

export function importData(jsonText, options) {
  return db.importData(jsonText, options);
}

export function resetAll() {
  return db.resetAll();
}

export function getDiagnostics(familyId) {
  return db.getDiagnostics(familyId);
}
