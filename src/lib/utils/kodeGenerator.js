export function generateKode(parent, birthOrder) {
  if (!parent) return "";
  
  const generasiLabel = ["A", "P", "B", "C"];
  const parentKode = parent.kode || "";
  const generasi = parent.generasi + 1;
  
  if (generasi > 4) {
    throw new Error("Maximum generasi (Canggah) reached");
  }
  
  const label = generasiLabel[generasi - 1];
  return `${parentKode}${label}${birthOrder}`;
}

export function calculateGenerasi(parent) {
  if (!parent) return 0;
  return parent.generasi + 1;
}

export function getGenerasiLabel(generasi) {
  const labels = {
    0: "Root/Trah",
    1: "Anak",
    2: "Putu/Cucu",
    3: "Buyut",
    4: "Canggah"
  };
  return labels[generasi] || "Unknown";
}

export function getBirthOrderFromChildren(parentId, persons) {
  const siblings = persons.filter(p => p.parent_id === parentId);
  return siblings.length + 1;
}

export function assignCodes(persons) {
  if (!persons || persons.length === 0) return persons;

  const LEVEL_CODES = ['', 'A', 'P', 'B', 'C'];
  
  const byId = new Map(persons.map(p => [p.id, p]));
  const childrenMap = new Map();
  
  for (const p of persons) {
    if (p.parent_id) {
      if (!childrenMap.has(p.parent_id)) {
        childrenMap.set(p.parent_id, []);
      }
      childrenMap.get(p.parent_id).push(p);
    }
  }
  
  const root = persons.find(p => p.is_root === true);
  if (!root) {
    console.warn('Root tidak ditemukan, tidak bisa assign kode');
    return persons;
  }
  
  root.kode = '';
  root.generasi = 0;
  
  function sortChildren(list) {
    return list.sort((a, b) => {
      const ba = a.birth_order;
      const bb = b.birth_order;
      
      const hasA = ba !== null && ba !== undefined && ba !== '';
      const hasB = bb !== null && bb !== undefined && bb !== '';
      
      if (hasA && hasB) {
        return Number(ba) - Number(bb);
      }
      
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      
      const ta = a.tanggal_lahir || '';
      const tb = b.tanggal_lahir || '';
      if (ta && tb && ta !== tb) return ta.localeCompare(tb);
      return a.nama_lengkap.localeCompare(b.nama_lengkap);
    });
  }
  
  function traverse(node, depth, parentCode) {
    const kids = childrenMap.get(node.id) || [];
    const ordered = sortChildren(kids);
    const levelLetter = LEVEL_CODES[depth] || ('L' + depth);
    
    ordered.forEach((child, idx) => {
      const seq = idx + 1;
      const codePart = levelLetter + seq;
      child.kode = (parentCode || '') + codePart;
      child.generasi = depth;
      traverse(child, depth + 1, child.kode);
    });
  }
  
  traverse(root, 1, root.kode);
  
  return persons;
}
