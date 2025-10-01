export function createSampleFamily() {
  const trahId = `${Date.now()}-sample`;
  
  const trah = {
    id: trahId,
    nama_trah: "Keluarga Budi Santoso",
    root_person_id: "root-1",
    deskripsi: "Silsilah keluarga Budi Santoso lengkap sampai generasi C",
    created_at: new Date().toISOString()
  };

  const persons = [];

  persons.push({
    id: "root-1",
    kode: "",
    generasi: 0,
    nama_lengkap: "Budi Santoso",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "1950-01-15",
    alamat: "Jl. Merdeka No. 100, Jakarta Pusat",
    pekerjaan: "Pengusaha",
    parent_id: null,
    parent2_id: "spouse-root",
    pasangan_id: "spouse-root",
    children_ids: ["child-a1", "child-a2", "child-a3"],
    is_root: true,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "spouse-root",
    kode: "",
    generasi: 0,
    nama_lengkap: "Siti Rahayu",
    gender: "P",
    birth_order: 1,
    tempat_lahir: "Bandung",
    tanggal_lahir: "1952-03-20",
    alamat: "Jl. Merdeka No. 100, Jakarta Pusat",
    pekerjaan: "Ibu Rumah Tangga",
    parent_id: null,
    parent2_id: null,
    pasangan_id: "root-1",
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-a1",
    kode: "A1",
    generasi: 1,
    nama_lengkap: "Andi Santoso",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "1975-05-10",
    alamat: "Jl. Sudirman No. 45, Jakarta Selatan",
    pekerjaan: "Dokter",
    parent_id: "root-1",
    parent2_id: "spouse-root",
    pasangan_id: "spouse-a1",
    children_ids: ["child-b1", "child-b2"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "spouse-a1",
    kode: "",
    generasi: 1,
    nama_lengkap: "Dewi Lestari",
    gender: "P",
    birth_order: 1,
    tempat_lahir: "Surabaya",
    tanggal_lahir: "1977-08-15",
    alamat: "Jl. Sudirman No. 45, Jakarta Selatan",
    pekerjaan: "Guru",
    parent_id: null,
    parent2_id: null,
    pasangan_id: "child-a1",
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-b1",
    kode: "A1P1",
    generasi: 2,
    nama_lengkap: "Rudi Santoso",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2000-02-14",
    alamat: "Jl. Kuningan No. 12, Jakarta Selatan",
    pekerjaan: "Software Engineer",
    parent_id: "child-a1",
    parent2_id: "spouse-a1",
    pasangan_id: "spouse-b1",
    children_ids: ["child-c1", "child-c2"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "spouse-b1",
    kode: "",
    generasi: 2,
    nama_lengkap: "Maya Putri",
    gender: "P",
    birth_order: 1,
    tempat_lahir: "Bandung",
    tanggal_lahir: "2001-06-20",
    alamat: "Jl. Kuningan No. 12, Jakarta Selatan",
    pekerjaan: "Desainer Grafis",
    parent_id: null,
    parent2_id: null,
    pasangan_id: "child-b1",
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c1",
    kode: "A1P1B1",
    generasi: 3,
    nama_lengkap: "Bima Santoso",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2023-01-10",
    alamat: "Jl. Kuningan No. 12, Jakarta Selatan",
    pekerjaan: "Pelajar",
    parent_id: "child-b1",
    parent2_id: "spouse-b1",
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c2",
    kode: "A1P1B2",
    generasi: 3,
    nama_lengkap: "Citra Santoso",
    gender: "P",
    birth_order: 2,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2024-05-22",
    alamat: "Jl. Kuningan No. 12, Jakarta Selatan",
    pekerjaan: "Balita",
    parent_id: "child-b1",
    parent2_id: "spouse-b1",
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-b2",
    kode: "A1P2",
    generasi: 2,
    nama_lengkap: "Sari Santoso",
    gender: "P",
    birth_order: 2,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2003-09-18",
    alamat: "Jl. Thamrin No. 88, Jakarta Pusat",
    pekerjaan: "Marketing Manager",
    parent_id: "child-a1",
    parent2_id: "spouse-a1",
    pasangan_id: "spouse-b2",
    children_ids: ["child-c3"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "spouse-b2",
    kode: "",
    generasi: 2,
    nama_lengkap: "Eko Prasetyo",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Yogyakarta",
    tanggal_lahir: "2002-11-05",
    alamat: "Jl. Thamrin No. 88, Jakarta Pusat",
    pekerjaan: "Arsitek",
    parent_id: null,
    parent2_id: null,
    pasangan_id: "child-b2",
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c3",
    kode: "A1P2B1",
    generasi: 3,
    nama_lengkap: "Dani Prasetyo",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2024-03-08",
    alamat: "Jl. Thamrin No. 88, Jakarta Pusat",
    pekerjaan: "Balita",
    parent_id: "child-b2",
    parent2_id: "spouse-b2",
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-a2",
    kode: "A2",
    generasi: 1,
    nama_lengkap: "Budi Santoso Jr.",
    gender: "L",
    birth_order: 2,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "1978-11-25",
    alamat: "Jl. Gatot Subroto No. 22, Jakarta Selatan",
    pekerjaan: "Pengacara",
    parent_id: "root-1",
    parent2_id: "spouse-root",
    pasangan_id: "spouse-a2",
    children_ids: ["child-b3", "child-b4", "child-b5"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "spouse-a2",
    kode: "",
    generasi: 1,
    nama_lengkap: "Lina Wijaya",
    gender: "P",
    birth_order: 1,
    tempat_lahir: "Medan",
    tanggal_lahir: "1980-04-12",
    alamat: "Jl. Gatot Subroto No. 22, Jakarta Selatan",
    pekerjaan: "Notaris",
    parent_id: null,
    parent2_id: null,
    pasangan_id: "child-a2",
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-b3",
    kode: "A2P1",
    generasi: 2,
    nama_lengkap: "Fajar Santoso",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2005-07-03",
    alamat: "Jl. Rasuna Said No. 15, Jakarta Selatan",
    pekerjaan: "Mahasiswa",
    parent_id: "child-a2",
    parent2_id: "spouse-a2",
    pasangan_id: null,
    children_ids: ["child-c4"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c4",
    kode: "A2P1B1",
    generasi: 3,
    nama_lengkap: "Gita Santoso",
    gender: "P",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2024-12-15",
    alamat: "Jl. Rasuna Said No. 15, Jakarta Selatan",
    pekerjaan: "Bayi",
    parent_id: "child-b3",
    parent2_id: null,
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-b4",
    kode: "A2P2",
    generasi: 2,
    nama_lengkap: "Hani Santoso",
    gender: "P",
    birth_order: 2,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2007-12-20",
    alamat: "Jl. HR Rasuna Said No. 30, Jakarta Selatan",
    pekerjaan: "Pelajar SMA",
    parent_id: "child-a2",
    parent2_id: "spouse-a2",
    pasangan_id: null,
    children_ids: ["child-c5", "child-c6"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c5",
    kode: "A2P2B1",
    generasi: 3,
    nama_lengkap: "Indra Santoso",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2024-08-09",
    alamat: "Jl. HR Rasuna Said No. 30, Jakarta Selatan",
    pekerjaan: "Bayi",
    parent_id: "child-b4",
    parent2_id: null,
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c6",
    kode: "A2P2B2",
    generasi: 3,
    nama_lengkap: "Joko Santoso",
    gender: "L",
    birth_order: 2,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2025-02-14",
    alamat: "Jl. HR Rasuna Said No. 30, Jakarta Selatan",
    pekerjaan: "Bayi",
    parent_id: "child-b4",
    parent2_id: null,
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-b5",
    kode: "A2P3",
    generasi: 2,
    nama_lengkap: "Kartika Santoso",
    gender: "P",
    birth_order: 3,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2010-03-28",
    alamat: "Jl. Gatot Subroto No. 22, Jakarta Selatan",
    pekerjaan: "Pelajar SMP",
    parent_id: "child-a2",
    parent2_id: "spouse-a2",
    pasangan_id: null,
    children_ids: ["child-c7"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c7",
    kode: "A2P3B1",
    generasi: 3,
    nama_lengkap: "Luki Santoso",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2025-06-11",
    alamat: "Jl. Gatot Subroto No. 22, Jakarta Selatan",
    pekerjaan: "Bayi",
    parent_id: "child-b5",
    parent2_id: null,
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-a3",
    kode: "A3",
    generasi: 1,
    nama_lengkap: "Cynthia Santoso",
    gender: "P",
    birth_order: 3,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "1982-06-30",
    alamat: "Jl. Senopati No. 67, Jakarta Selatan",
    pekerjaan: "Pengusaha Fashion",
    parent_id: "root-1",
    parent2_id: "spouse-root",
    pasangan_id: "spouse-a3",
    children_ids: ["child-b6"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "spouse-a3",
    kode: "",
    generasi: 1,
    nama_lengkap: "Michael Tan",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Singapura",
    tanggal_lahir: "1980-09-22",
    alamat: "Jl. Senopati No. 67, Jakarta Selatan",
    pekerjaan: "Investor",
    parent_id: null,
    parent2_id: null,
    pasangan_id: "child-a3",
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-b6",
    kode: "A3P1",
    generasi: 2,
    nama_lengkap: "Michelle Tan",
    gender: "P",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2008-10-05",
    alamat: "Jl. Senopati No. 67, Jakarta Selatan",
    pekerjaan: "Pelajar SMA",
    parent_id: "child-a3",
    parent2_id: "spouse-a3",
    pasangan_id: null,
    children_ids: ["child-c8", "child-c9", "child-c10"],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c8",
    kode: "A3P1B1",
    generasi: 3,
    nama_lengkap: "Nathan Tan",
    gender: "L",
    birth_order: 1,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2024-11-20",
    alamat: "Jl. Senopati No. 67, Jakarta Selatan",
    pekerjaan: "Bayi",
    parent_id: "child-b6",
    parent2_id: null,
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c9",
    kode: "A3P1B2",
    generasi: 3,
    nama_lengkap: "Olivia Tan",
    gender: "P",
    birth_order: 2,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2025-01-15",
    alamat: "Jl. Senopati No. 67, Jakarta Selatan",
    pekerjaan: "Bayi",
    parent_id: "child-b6",
    parent2_id: null,
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  persons.push({
    id: "child-c10",
    kode: "A3P1B3",
    generasi: 3,
    nama_lengkap: "Patrick Tan",
    gender: "L",
    birth_order: 3,
    tempat_lahir: "Jakarta",
    tanggal_lahir: "2025-04-03",
    alamat: "Jl. Senopati No. 67, Jakarta Selatan",
    pekerjaan: "Bayi",
    parent_id: "child-b6",
    parent2_id: null,
    pasangan_id: null,
    children_ids: [],
    is_root: false,
    root_id: trahId,
    created_at: new Date().toISOString()
  });

  return { trah, persons };
}
