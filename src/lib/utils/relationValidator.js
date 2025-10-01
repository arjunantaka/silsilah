export function validateNoCircularParent(childId, parentIds, hubunganList, orangList) {
  if (!childId || !Array.isArray(parentIds) || parentIds.length === 0) {
    return { valid: true };
  }

  const personMap = new Map(orangList.map(p => [p.id, p]));
  
  const childrenByParent = new Map();
  hubunganList.forEach(relation => {
    if (!childrenByParent.has(relation.parent_id)) {
      childrenByParent.set(relation.parent_id, []);
    }
    childrenByParent.get(relation.parent_id).push(relation.child_id);
  });

  function isDescendantOf(potentialDescendant, ancestorId) {
    const visited = new Set();
    const queue = [ancestorId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === potentialDescendant) {
        return true;
      }

      const children = childrenByParent.get(currentId) || [];
      queue.push(...children);
    }

    return false;
  }

  for (const parentId of parentIds) {
    if (parentId === childId) {
      return {
        valid: false,
        error: 'Seseorang tidak bisa menjadi orang tua dari dirinya sendiri'
      };
    }

    if (isDescendantOf(parentId, childId)) {
      const parentName = personMap.get(parentId)?.nama_lengkap || 'Orang tua';
      return {
        valid: false,
        error: `${parentName} adalah keturunan dari anak ini. Relasi ini akan membuat circular reference.`
      };
    }
  }

  return { valid: true };
}

export function validateNoCircularChild(parentId, childId, hubunganList, orangList) {
  if (!parentId || !childId) {
    return { valid: true };
  }

  if (parentId === childId) {
    return {
      valid: false,
      error: 'Seseorang tidak bisa menjadi anak dari dirinya sendiri'
    };
  }

  const personMap = new Map(orangList.map(p => [p.id, p]));

  const parentsByChild = new Map();
  hubunganList.forEach(relation => {
    if (!parentsByChild.has(relation.child_id)) {
      parentsByChild.set(relation.child_id, []);
    }
    parentsByChild.get(relation.child_id).push(relation.parent_id);
  });

  function isAncestorOf(potentialAncestor, descendantId) {
    const visited = new Set();
    const queue = [descendantId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === potentialAncestor) {
        return true;
      }

      const parents = parentsByChild.get(currentId) || [];
      queue.push(...parents);
    }

    return false;
  }

  if (isAncestorOf(childId, parentId)) {
    const childName = personMap.get(childId)?.nama_lengkap || 'Anak';
    return {
      valid: false,
      error: `${childName} adalah leluhur dari orang tua ini. Relasi ini akan membuat circular reference.`
    };
  }

  return { valid: true };
}
