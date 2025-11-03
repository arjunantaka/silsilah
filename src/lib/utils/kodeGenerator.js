// Kode Generator & Sorting Utilities for Silsilah Trah

/**
 * Calculate generasi (generation) based on parent
 */
export function calculateGenerasi(parent) {
  if (!parent) return 0;
  return parent.generasi + 1;
}

/**
 * Get generasi label in Indonesian
 */
export function getGenerasiLabel(generasi) {
  const labels = {
    0: "Root/Trah",
    1: "Anak",
    2: "Putu/Cucu",
    3: "Buyut",
    4: "Canggah",
    5: "Wareng"
  };
  return labels[generasi] || `Generasi ${generasi}`;
}

/**
 * Parse kode into hierarchical segments for sorting
 * Example: "A1P2B3" → ["A1", "P2", "B3"]
 */
function parseKodeSegments(kode) {
  if (!kode || kode.trim() === '') return [];

  const segments = [];
  const regex = /([A-Z]+)(\d+)/g;
  let match;

  while ((match = regex.exec(kode)) !== null) {
    segments.push(match[0]); // Full segment like "A1", "P2"
  }

  return segments;
}

/**
 * Compare two kode strings hierarchically
 * Returns: -1 if a < b, 1 if a > b, 0 if equal
 */
function compareKodeHierarchical(kodeA, kodeB) {
  // Empty kodes go first (root)
  if (!kodeA && !kodeB) return 0;
  if (!kodeA) return -1;
  if (!kodeB) return 1;

  const segmentsA = parseKodeSegments(kodeA);
  const segmentsB = parseKodeSegments(kodeB);

  // Compare segment by segment
  const maxLength = Math.max(segmentsA.length, segmentsB.length);

  for (let i = 0; i < maxLength; i++) {
    const segA = segmentsA[i];
    const segB = segmentsB[i];

    // If one is shorter, it comes first (parent before children)
    if (!segA) return -1;
    if (!segB) return 1;

    // Extract letter and number from segment
    const matchA = segA.match(/([A-Z]+)(\d+)/);
    const matchB = segB.match(/([A-Z]+)(\d+)/);

    if (!matchA || !matchB) {
      // Fallback to string compare
      return segA.localeCompare(segB);
    }

    const letterA = matchA[1];
    const letterB = matchB[1];
    const numA = parseInt(matchA[2], 10);
    const numB = parseInt(matchB[2], 10);

    // Compare letters first (A, P, B, C, W...)
    if (letterA !== letterB) {
      return letterA.localeCompare(letterB);
    }

    // Same letter, compare numbers
    if (numA !== numB) {
      return numA - numB;
    }

    // Continue to next segment if equal
  }

  return 0;
}

/**
 * Sort persons hierarchically by kode (tree depth-first)
 * Example order: A1, A1P1, A1P1B1, A1P2, A2, A2P1
 */
export function sortByKodeHierarchical(persons) {
  if (!persons || persons.length === 0) return [];

  return [...persons].sort((a, b) => {
    return compareKodeHierarchical(a.kode, b.kode);
  });
}

/**
 * Sort persons sequentially (generasi first, then kode)
 * Example order: A1, A2, A3, A1P1, A1P2, A2P1
 */
export function sortByKodeSequential(persons) {
  if (!persons || persons.length === 0) return [];

  return [...persons].sort((a, b) => {
    // Sort by generasi first
    if (a.generasi !== b.generasi) {
      return a.generasi - b.generasi;
    }

    // Then by kode
    return (a.kode || '').localeCompare(b.kode || '');
  });
}

/**
 * Sort persons by name alphabetically
 */
export function sortByName(persons) {
  if (!persons || persons.length === 0) return [];

  return [...persons].sort((a, b) => {
    return a.nama_lengkap.localeCompare(b.nama_lengkap);
  });
}
