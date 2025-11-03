import { writable, derived } from 'svelte/store';
import { calculateGenerasi, getGenerasiLabel } from '../utils/kodeGenerator.js';

function createTrahStore() {
  const { subscribe, set, update } = writable({
    trah: null,
    persons: [],
    initialized: false
  });

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return {
    subscribe,
    
    initTrah(namaTrah, rootPersonData) {
      const trahId = generateId();
      const rootPersonId = generateId();
      
      const rootPerson = {
        id: rootPersonId,
        kode: rootPersonData.kode || "",
        generasi: 0,
        nama_lengkap: rootPersonData.nama_lengkap,
        tempat_lahir: rootPersonData.tempat_lahir || "",
        tanggal_lahir: rootPersonData.tanggal_lahir || "",
        gender: rootPersonData.gender || "",
        alamat: rootPersonData.alamat || "",
        pekerjaan: rootPersonData.pekerjaan || "",
        no_hp: rootPersonData.no_hp || "",
        parent_id: null,
        parent2_id: null,
        pasangan: null,
        children_ids: [],
        birth_order: null,
        is_root: true,
        root_id: trahId,
        created_at: new Date().toISOString()
      };

      const trah = {
        id: trahId,
        nama_trah: namaTrah,
        root_person_id: rootPersonId,
        deskripsi: "",
        created_at: new Date().toISOString()
      };

      set({
        trah,
        persons: [rootPerson],
        initialized: true
      });

      saveTrahToStorage(trah, [rootPerson]);
      return { trah, rootPerson };
    },

    addPerson(personData, parentId = null, parent2Id = null) {
      let newPerson = null;
      
      update(state => {
        if (!personData.nama_lengkap || !personData.nama_lengkap.trim()) {
          throw new Error("Nama lengkap wajib diisi");
        }

        if (!parentId) {
          const existingRoot = state.persons.find(p => p.is_root === true);
          if (existingRoot) {
            throw new Error("Tidak bisa menambah root baru. Trah sudah memiliki root.");
          }
        }

        const id = generateId();
        const parent = parentId ? state.persons.find(p => p.id === parentId) : null;

        const generasi = calculateGenerasi(parent);
        // Manual kode from user input
        const kode = personData.kode?.trim() || "";

        newPerson = {
          id,
          kode,
          generasi,
          nama_lengkap: personData.nama_lengkap.trim(),
          tempat_lahir: personData.tempat_lahir?.trim() || "",
          tanggal_lahir: personData.tanggal_lahir || "",
          gender: personData.gender || "L",
          alamat: personData.alamat?.trim() || "",
          pekerjaan: personData.pekerjaan?.trim() || "",
          no_hp: personData.no_hp?.trim() || "",
          parent_id: parentId,
          parent2_id: parent2Id,
          pasangan: null,
          children_ids: [],
          birth_order: personData.birth_order || null,
          is_root: !parentId,
          root_id: state.trah.id,
          created_at: new Date().toISOString()
        };

        if (parent) {
          const updatedPersons = state.persons.map(p => 
            p.id === parentId 
              ? { ...p, children_ids: [...(p.children_ids || []), id] }
              : p
          );
          state.persons = [...updatedPersons, newPerson];
        } else {
          state.persons = [...state.persons, newPerson];
        }

        if (parent2Id) {
          state.persons = state.persons.map(p =>
            p.id === parent2Id
              ? { ...p, children_ids: [...(p.children_ids || []), id] }
              : p
          );
        }

        // No longer auto-generate codes - user inputs manually

        saveTrahToStorage(state.trah, state.persons);
        return state;
      });

      return newPerson;
    },

    updatePerson(personId, updates) {
      update(state => {
        const person = state.persons.find(p => p.id === personId);
        if (!person) {
          throw new Error("Person tidak ditemukan");
        }

        const sanitizedUpdates = {
          ...updates,
          kode: updates.kode?.trim() ?? person.kode,
          nama_lengkap: updates.nama_lengkap?.trim() || person.nama_lengkap,
          tempat_lahir: updates.tempat_lahir?.trim() ?? person.tempat_lahir,
          tanggal_lahir: updates.tanggal_lahir ?? person.tanggal_lahir,
          gender: updates.gender || person.gender,
          alamat: updates.alamat?.trim() ?? person.alamat,
          pekerjaan: updates.pekerjaan?.trim() ?? person.pekerjaan,
          no_hp: updates.no_hp?.trim() ?? person.no_hp
        };

        state.persons = state.persons.map(p =>
          p.id === personId ? { ...p, ...sanitizedUpdates } : p
        );
        // No longer auto-generate codes
        saveTrahToStorage(state.trah, state.persons);
        return state;
      });
    },

    deletePerson(personId) {
      update(state => {
        const person = state.persons.find(p => p.id === personId);
        if (!person) return state;

        if (person.is_root) {
          throw new Error("Cannot delete root person");
        }

        if (person.children_ids.length > 0) {
          throw new Error("Cannot delete person with children");
        }

        if (person.parent_id) {
          state.persons = state.persons.map(p => 
            p.id === person.parent_id 
              ? { ...p, children_ids: p.children_ids.filter(cid => cid !== personId) }
              : p
          );
        }

        state.persons = state.persons.filter(p => p.id !== personId);
        // No longer auto-generate codes
        saveTrahToStorage(state.trah, state.persons);
        return state;
      });
    },

    setSpouse(personId, spouseData) {
      update(state => {
        const person = state.persons.find(p => p.id === personId);

        if (!person) {
          throw new Error("Person tidak ditemukan");
        }

        if (person.pasangan) {
          throw new Error(`${person.nama_lengkap} sudah memiliki pasangan`);
        }

        if (!spouseData.nama_lengkap || !spouseData.nama_lengkap.trim()) {
          throw new Error("Nama pasangan wajib diisi");
        }

        const pasanganObj = {
          nama_lengkap: spouseData.nama_lengkap.trim(),
          tempat_lahir: spouseData.tempat_lahir?.trim() || "",
          tanggal_lahir: spouseData.tanggal_lahir || "",
          gender: spouseData.gender || (person.gender === 'L' ? 'P' : 'L'),
          alamat: spouseData.alamat?.trim() || "",
          pekerjaan: spouseData.pekerjaan?.trim() || "",
          no_hp: spouseData.no_hp?.trim() || ""
        };

        state.persons = state.persons.map(p => {
          if (p.id === personId) return { ...p, pasangan: pasanganObj };
          return p;
        });

        saveTrahToStorage(state.trah, state.persons);
        return state;
      });
    },

    addSpouse(personId, spouseData) {
      // This function is now an alias for setSpouse since spouse is a simple object
      return this.setSpouse(personId, spouseData);
    },

    removeSpouse(personId) {
      update(state => {
        const person = state.persons.find(p => p.id === personId);
        if (!person) {
          throw new Error("Person tidak ditemukan");
        }

        if (!person.pasangan) {
          throw new Error("Person tidak memiliki pasangan");
        }

        state.persons = state.persons.map(p => {
          if (p.id === personId) {
            return { ...p, pasangan: null };
          }
          return p;
        });

        saveTrahToStorage(state.trah, state.persons);
        return state;
      });
    },

    addPersonWithRelations(data) {
      let result = {
        person: null,
        spouse: null,
        children: []
      };

      update(state => {
        const { personData, parentIds = [], spouseData = null, childrenData = [] } = data;

        if (parentIds.length > 2) {
          throw new Error("Maksimal 2 orang tua");
        }

        const personId = generateId();
        const parent1 = parentIds[0] ? state.persons.find(p => p.id === parentIds[0]) : null;
        const parent2 = parentIds[1] ? state.persons.find(p => p.id === parentIds[1]) : null;

        const generasi = calculateGenerasi(parent1);
        const birthOrder = parent1 ? getBirthOrderFromChildren(parent1.id, state.persons) : 0;
        const kode = parent1 ? generateKode(parent1, birthOrder) : "";

        const newPerson = {
          id: personId,
          kode,
          generasi,
          nama_lengkap: personData.nama_lengkap,
          tempat_lahir: personData.tempat_lahir || "",
          tanggal_lahir: personData.tanggal_lahir || "",
          gender: personData.gender || "",
          alamat: personData.alamat || "",
          pekerjaan: personData.pekerjaan || "",
          parent_id: parentIds[0] || null,
          parent2_id: parentIds[1] || null,
          pasangan: null,
          children_ids: [],
          birth_order: personData.birth_order || null,
          is_root: !parentIds[0],
          root_id: state.trah.id,
          created_at: new Date().toISOString()
        };

        state.persons = [...state.persons, newPerson];
        result.person = newPerson;

        if (parent1) {
          state.persons = state.persons.map(p => 
            p.id === parentIds[0] 
              ? { ...p, children_ids: [...p.children_ids, personId] }
              : p
          );
        }

        if (parent2) {
          state.persons = state.persons.map(p => 
            p.id === parentIds[1] 
              ? { ...p, children_ids: [...(p.children_ids || []), personId] }
              : p
          );
        }

        if (spouseData && spouseData.nama_lengkap) {
          const pasanganObj = {
            nama_lengkap: spouseData.nama_lengkap.trim(),
            tempat_lahir: spouseData.tempat_lahir?.trim() || "",
            tanggal_lahir: spouseData.tanggal_lahir || "",
            gender: spouseData.gender || (newPerson.gender === 'L' ? 'P' : 'L'),
            alamat: spouseData.alamat?.trim() || "",
            pekerjaan: spouseData.pekerjaan?.trim() || "",
            no_hp: spouseData.no_hp?.trim() || ""
          };

          state.persons = state.persons.map(p =>
            p.id === personId ? { ...p, pasangan: pasanganObj } : p
          );

          result.spouse = pasanganObj;
        }

        if (childrenData && childrenData.length > 0) {
          childrenData.forEach(childData => {
            const childId = generateId();
            const childBirthOrder = getBirthOrderFromChildren(personId, state.persons);
            const childKode = generateKode(newPerson, childBirthOrder);

            const newChild = {
              id: childId,
              kode: childKode,
              generasi: newPerson.generasi + 1,
              nama_lengkap: childData.nama_lengkap,
              tempat_lahir: childData.tempat_lahir || "",
              tanggal_lahir: childData.tanggal_lahir || "",
              gender: childData.gender || "",
              alamat: childData.alamat || "",
              pekerjaan: childData.pekerjaan || "",
              parent_id: personId,
              parent2_id: null,
              pasangan: null,
              children_ids: [],
              birth_order: childData.birth_order || null,
              is_root: false,
              root_id: state.trah.id,
              created_at: new Date().toISOString()
            };

            state.persons = [...state.persons, newChild];
            result.children.push(newChild);

            state.persons = state.persons.map(p => {
              if (p.id === personId) {
                return { ...p, children_ids: [...p.children_ids, childId] };
              }
              if (result.spouse && p.id === result.spouse.id) {
                return { ...p, children_ids: [...p.children_ids, childId] };
              }
              return p;
            });
          });
        }

        // No longer auto-generate codes
        saveTrahToStorage(state.trah, state.persons);
        return state;
      });

      return result;
    },


    updateParents(personId, newParentIds) {
      update(state => {
        const person = state.persons.find(p => p.id === personId);
        if (!person) throw new Error("Person tidak ditemukan");

        if (person.is_root) {
          throw new Error("Tidak dapat mengubah orang tua dari root person");
        }

        if (newParentIds.length > 2) {
          throw new Error("Maksimal 2 orang tua");
        }

        const oldParent1 = person.parent_id;
        const oldParent2 = person.parent2_id;

        state.persons = state.persons.map(p => {
          if (p.id === oldParent1 || p.id === oldParent2) {
            return { ...p, children_ids: p.children_ids.filter(id => id !== personId) };
          }
          return p;
        });

        state.persons = state.persons.map(p => {
          if (p.id === personId) {
            return { 
              ...p, 
              parent_id: newParentIds[0] || null, 
              parent2_id: newParentIds[1] || null 
            };
          }
          return p;
        });

        if (newParentIds[0]) {
          state.persons = state.persons.map(p => 
            p.id === newParentIds[0] 
              ? { ...p, children_ids: [...new Set([...p.children_ids, personId])] }
              : p
          );
        }

        if (newParentIds[1]) {
          state.persons = state.persons.map(p => 
            p.id === newParentIds[1] 
              ? { ...p, children_ids: [...new Set([...(p.children_ids || []), personId])] }
              : p
          );
        }

        // No longer auto-generate codes
        saveTrahToStorage(state.trah, state.persons);
        return state;
      });
    },

    loadFromStorage() {
      const stored = localStorage.getItem('trah-data');
      if (stored) {
        const data = JSON.parse(stored);
        // No longer auto-generate codes on load
        set({
          trah: data.trah,
          persons: data.persons,
          initialized: true
        });
        get().saveToStorage();
        return true;
      }
      return false;
    },

    reset() {
      set({
        trah: null,
        persons: [],
        initialized: false
      });
      localStorage.removeItem('trah-data');
    },

    exportData() {
      let data = null;
      subscribe(state => {
        data = state;
      })();
      return JSON.stringify(data, null, 2);
    },

    importData(jsonData) {
      const data = JSON.parse(jsonData);
      // No longer auto-generate codes - preserve imported codes
      set({
        trah: data.trah,
        persons: data.persons,
        initialized: true
      });
      saveTrahToStorage(data.trah, data.persons);
    },

    validateDataIntegrity() {
      let issues = [];
      let state = null;
      
      subscribe(s => { state = s; })();
      
      if (!state || !state.persons) return { valid: true, issues: [] };
      
      const persons = state.persons;
      const personIds = new Set(persons.map(p => p.id));
      
      persons.forEach(person => {
        if (person.parent_id && !personIds.has(person.parent_id)) {
          issues.push(`${person.nama_lengkap}: parent_id tidak valid (${person.parent_id})`);
        }
        
        if (person.parent2_id && !personIds.has(person.parent2_id)) {
          issues.push(`${person.nama_lengkap}: parent2_id tidak valid (${person.parent2_id})`);
        }

        if (person.pasangan && typeof person.pasangan !== 'object') {
          issues.push(`${person.nama_lengkap}: pasangan harus berupa object atau null`);
        }

        if (person.children_ids && person.children_ids.length > 0) {
          person.children_ids.forEach(childId => {
            if (!personIds.has(childId)) {
              issues.push(`${person.nama_lengkap}: children_ids mengandung ID tidak valid (${childId})`);
            } else {
              const child = persons.find(p => p.id === childId);
              if (child && child.parent_id !== person.id && child.parent2_id !== person.id) {
                issues.push(`${person.nama_lengkap}: anak ${child.nama_lengkap} tidak memiliki parent_id yang sesuai`);
              }
            }
          });
        }
      });
      
      return {
        valid: issues.length === 0,
        issues: issues
      };
    },

    rebuildDataIntegrity() {
      update(state => {
        const persons = state.persons;
        
        persons.forEach(person => {
          if (person.children_ids) {
            person.children_ids = person.children_ids.filter(childId => 
              persons.some(p => p.id === childId)
            );
          }
          
          if (person.parent_id && !persons.some(p => p.id === person.parent_id)) {
            person.parent_id = null;
          }
          
          if (person.parent2_id && !persons.some(p => p.id === person.parent2_id)) {
            person.parent2_id = null;
          }

          // Ensure pasangan is null or object (migration from old pasangan_id format)
          if (person.pasangan_id !== undefined) {
            person.pasangan = null;
            delete person.pasangan_id;
          }
        });
        
        persons.forEach(person => {
          if (person.parent_id) {
            const parent = persons.find(p => p.id === person.parent_id);
            if (parent && !parent.children_ids.includes(person.id)) {
              parent.children_ids.push(person.id);
            }
          }
          
          if (person.parent2_id) {
            const parent2 = persons.find(p => p.id === person.parent2_id);
            if (parent2 && !parent2.children_ids.includes(person.id)) {
              parent2.children_ids.push(person.id);
            }
          }
        });

        // No longer auto-generate codes
        saveTrahToStorage(state.trah, state.persons);
        return state;
      });
    }
  };
}

function saveTrahToStorage(trah, persons) {
  localStorage.setItem('trah-data', JSON.stringify({ trah, persons }));
}

export const trahStore = createTrahStore();

export const rootPerson = derived(
  trahStore,
  $store => $store.persons.find(p => p.is_root)
);

export const personsByGenerasi = derived(
  trahStore,
  $store => {
    const grouped = {};
    $store.persons.forEach(p => {
      if (!grouped[p.generasi]) {
        grouped[p.generasi] = [];
      }
      grouped[p.generasi].push(p);
    });
    return grouped;
  }
);

export function getPersonById(persons, id) {
  return persons.find(p => p.id === id);
}

export function getChildren(persons, parentId) {
  return persons.filter(p => p.parent_id === parentId);
}

export function getDescendants(persons, personId) {
  const descendants = [];
  const queue = [personId];
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = getChildren(persons, currentId);
    descendants.push(...children);
    queue.push(...children.map(c => c.id));
  }
  
  return descendants;
}
