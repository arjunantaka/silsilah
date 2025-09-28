/**
 * Utility functions untuk membersihkan dan mengolah data keluarga
 */

/**
 * Normalisasi nama dengan memisahkan kode lineage dari nama_lengkap
 * @param {Object} person - Data person
 * @returns {Object} Person dengan nama yang sudah dinormalisasi
 */
export function normalizePerson(person) {
  const normalized = { ...person };
  
  // Pattern untuk mendeteksi kode lineage di awal nama: A1., B2., C1., dll
  const lineagePattern = /^([ABC]\d+)\.\s*/;
  const match = normalized.nama_lengkap.match(lineagePattern);
  
  if (match) {
    const extractedCode = match[1];
    // Jika belum ada lineage_code atau kosong, gunakan yang diekstrak
    if (!normalized.lineage_code || normalized.lineage_code === '') {
      normalized.lineage_code = extractedCode;
    }
    // Bersihkan nama dari kode
    normalized.nama_lengkap = normalized.nama_lengkap.replace(lineagePattern, '').trim();
  }
  
  return normalized;
}

/**
 * Normalisasi seluruh array persons
 * @param {Array} persons - Array data persons
 * @returns {Array} Array persons yang sudah dinormalisasi
 */
export function normalizePersons(persons) {
  return persons.map(normalizePerson);
}

/**
 * Mencari semua orang tua dari seseorang
 * @param {string} personId - ID person
 * @param {Array} relations - Array relasi
 * @param {Array} persons - Array persons
 * @returns {Object} { fathers: [...], mothers: [...] }
 */
export function deriveParents(personId, relations, persons) {
  const parentRelations = relations.filter(rel => rel.child_id === personId);
  const parents = parentRelations.map(rel => {
    const parent = persons.find(p => p.id === rel.parent_id);
    return parent ? { ...parent, relation_type: rel.jenis } : null;
  }).filter(Boolean);
  
  const fathers = parents.filter(p => p.gender === 'L');
  const mothers = parents.filter(p => p.gender === 'P');
  
  return { fathers, mothers };
}

/**
 * Mencari semua pasangan dari seseorang
 * @param {string} personId - ID person
 * @param {Array} unions - Array unions
 * @param {Array} persons - Array persons
 * @returns {Array} Array pasangan dengan detail union
 */
export function deriveSpouses(personId, unions, persons) {
  const spouseUnions = unions.filter(union => 
    union.partner1_id === personId || union.partner2_id === personId
  );
  
  return spouseUnions.map(union => {
    const spouseId = union.partner1_id === personId ? union.partner2_id : union.partner1_id;
    const spouse = persons.find(p => p.id === spouseId);
    
    if (!spouse) return null;
    
    return {
      ...spouse,
      union_status: union.status,
      union_start: union.tanggal_mulai,
      union_end: union.tanggal_akhir,
      union_notes: union.catatan
    };
  }).filter(Boolean);
}

/**
 * Mencari semua anak dari seseorang
 * @param {string} personId - ID person
 * @param {Array} relations - Array relasi
 * @param {Array} persons - Array persons
 * @returns {Array} Array anak dengan detail relasi
 */
export function deriveChildren(personId, relations, persons) {
  const childRelations = relations.filter(rel => rel.parent_id === personId);
  
  return childRelations.map(rel => {
    const child = persons.find(p => p.id === rel.child_id);
    if (!child) return null;
    
    return {
      ...child,
      relation_type: rel.jenis,
      birth_order: rel.birth_order,
      union_id: rel.union_id
    };
  }).filter(Boolean);
}

/**
 * Format tanggal untuk display
 * @param {string} dateStr - String tanggal (YYYY-MM-DD)
 * @param {string} format - Format output ('dd-mm-yyyy' atau 'yyyy-mm-dd')
 * @returns {string} Tanggal terformat
 */
export function formatDate(dateStr, format = 'dd-mm-yyyy') {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original jika tidak valid
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    if (format === 'dd-mm-yyyy') {
      return `${day}-${month}-${year}`;
    }
    return `${year}-${month}-${day}`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * Format tempat dan tanggal lahir untuk display
 * @param {Object} person - Data person
 * @returns {string} Format "Tempat, DD-MM-YYYY"
 */
export function formatBirthInfo(person) {
  const place = person.tempat_lahir || '';
  const date = formatDate(person.tanggal_lahir);
  
  if (place && date) {
    return `${place}, ${date}`;
  } else if (place) {
    return place;
  } else if (date) {
    return date;
  }
  return '';
}

/**
 * Format status hidup dengan tahun
 * @param {Object} person - Data person
 * @returns {string} Format "1901-1970" atau "1901-"
 */
export function formatLifeSpan(person) {
  const birth = person.tanggal_lahir ? new Date(person.tanggal_lahir).getFullYear() : '';
  const death = person.tanggal_wafat ? new Date(person.tanggal_wafat).getFullYear() : '';
  
  if (birth && death) {
    return `${birth}–${death}`;
  } else if (birth) {
    return `${birth}–`;
  }
  return '';
}

/**
 * Generate label untuk union node
 * @param {Object} union - Data union
 * @param {Array} persons - Array persons
 * @returns {string} Label union seperti "Soekarno + Fatmawati"
 */
export function generateUnionLabel(union, persons) {
  const partner1 = persons.find(p => p.id === union.partner1_id);
  const partner2 = persons.find(p => p.id === union.partner2_id);
  
  if (!partner1 || !partner2) return 'Union';
  
  // Normalisasi nama sebelum display
  const name1 = normalizePerson(partner1).nama_lengkap;
  const name2 = normalizePerson(partner2).nama_lengkap;
  
  return `${name1} + ${name2}`;
}