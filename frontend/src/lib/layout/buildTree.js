import { normalizePerson, generateUnionLabel } from '../utils/dataUtils.js';

export function buildHierarchy(family, persons, relations, unions = [], showUnions = true) {
  if (!family || persons.length === 0) {
    return null;
  }

  // Store original names before normalization
  const originalNames = new Map(persons.map(p => [p.id, p.nama_lengkap]));
  
  // Normalisasi persons untuk membersihkan nama
  const normalizedPersons = persons.map(normalizePerson);
  const personMap = new Map(normalizedPersons.map((p) => [p.id, p]));
  
  // Group children by parent and union
  const childrenByParent = new Map();
  const childrenByUnion = new Map();
  
  relations.forEach((relation) => {
    const child = personMap.get(relation.child_id);
    if (!child) return;
    
    // Group by parent
    if (!childrenByParent.has(relation.parent_id)) {
      childrenByParent.set(relation.parent_id, []);
    }
    childrenByParent.get(relation.parent_id).push({
      person: child,
      relation
    });
    
    // Group by union if exists
    if (relation.union_id && showUnions) {
      if (!childrenByUnion.has(relation.union_id)) {
        childrenByUnion.set(relation.union_id, []);
      }
      childrenByUnion.get(relation.union_id).push({
        person: child,
        relation
      });
    }
  });

  // Sort children by birth order
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.relation.birth_order - b.relation.birth_order);  
  }
  for (const list of childrenByUnion.values()) {
    list.sort((a, b) => a.relation.birth_order - b.relation.birth_order);  
  }

  const rootId = family.root_id && personMap.has(family.root_id)
    ? family.root_id
    : normalizedPersons[0].id;

  function buildNode(personId) {
    const person = personMap.get(personId);
    if (!person) return null;

    let children = [];
    
    if (showUnions) {
      // Find all unions for this person
      const personUnions = unions.filter(union => 
        union.partner1_id === personId || union.partner2_id === personId
      );
      
      // Group children by union
      const unionGroups = new Map();
      const unattachedChildren = [];
      
      (childrenByParent.get(personId) || []).forEach((entry) => {
        if (entry.relation.union_id) {
          if (!unionGroups.has(entry.relation.union_id)) {
            unionGroups.set(entry.relation.union_id, []);
          }
          unionGroups.get(entry.relation.union_id).push(entry);
        } else {
          unattachedChildren.push(entry);
        }
      });
      
      // Create union nodes
      personUnions.forEach((union) => {
        const unionChildren = unionGroups.get(union.id) || [];
        if (unionChildren.length > 0) {
          const unionNode = {
            id: `union-${union.id}`,
            type: 'union',
            name: generateUnionLabel(union, normalizedPersons),
            union_data: union,
            isUnion: true,
            children: unionChildren.map((entry) => buildNode(entry.person.id)).filter(Boolean)
          };
          children.push(unionNode);
        }
      });
      
      // Add unattached children directly
      children.push(...unattachedChildren.map((entry) => buildNode(entry.person.id)).filter(Boolean));
      
    } else {
      // Original behavior without union nodes
      children = (childrenByParent.get(personId) || [])
        .map((entry) => buildNode(entry.person.id))
        .filter(Boolean);
    }

    return {
      id: person.id,
      type: 'person',
      name: person.nama_lengkap, // normalized name
      original_name: originalNames.get(person.id) || person.nama_lengkap, // original name
      gender: person.gender,
      lineage_code: person.lineage_code,
      status: person.status_hidup,
      birth_year: person.tanggal_lahir ? new Date(person.tanggal_lahir).getFullYear() : null,
      death_year: person.tanggal_wafat ? new Date(person.tanggal_wafat).getFullYear() : null,
      isRoot: person.id === rootId,
      isPerson: true,
      children
    };
  }

  return buildNode(rootId);
}