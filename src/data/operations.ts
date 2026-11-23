/** Field-domain operational data: agriculture, training, business, programs, tasks. */

import type {
  LandPlot, Harvest, Training, AttendanceRow, Program, Activity, Task, Product, Partner, Order,
  InventoryItem,
} from "./types";

export const PROGRAMS: Program[] = [
  {
    code: "PRG-ORG-01",
    name: "Penguatan Organisasi & Kaderisasi",
    bidang: "organisasi",
    objective: "Memetakan minat anggota, menumbuhkan kader, dan menjaga komunikasi organisasi tetap hidup.",
    period: "Januari–Desember 2026",
    status: "berjalan",
    progress: 78,
    budget: 9_000_000,
    spent: 6_940_000,
    indicators: [
      { label: "Anggota aktif terpetakan minat", target: "120", actual: "128" },
      { label: "Kader baru terlatih", target: "12", actual: "9" },
      { label: "Pertemuan kelompok minat", target: "8", actual: "6" },
    ],
    published: true,
  },
  {
    code: "PRG-TANI-01",
    name: "Pendampingan Budidaya Kopi & Pangan",
    bidang: "pertanian",
    objective: "Meningkatkan mutu dan hasil kopi arabika serta pangan anggota melalui pendampingan lapangan.",
    period: "Februari–Desember 2026",
    status: "berjalan",
    progress: 64,
    budget: 25_500_000,
    spent: 16_850_000,
    indicators: [
      { label: "Petak didampingi", target: "42", actual: "38" },
      { label: "Produktivitas kopi (kg/ha)", target: "950", actual: "860" },
      { label: "Panen grade A (%)", target: "55%", actual: "50%" },
    ],
    published: true,
  },
  {
    code: "PRG-DAYA-01",
    name: "Sekolah Tani Perempuan",
    bidang: "pelatihan",
    objective: "Merencanakan dan mengukur peningkatan keterampilan anggota dalam budidaya, pascapanen, dan usaha.",
    period: "Maret–Desember 2026",
    status: "berjalan",
    progress: 71,
    budget: 33_000_000,
    spent: 23_400_000,
    indicators: [
      { label: "Pelatihan terlaksana", target: "20", actual: "18" },
      { label: "Peserta unik", target: "100", actual: "112" },
      { label: "Kenaikan skor post-test", target: "+25", actual: "+31" },
    ],
    published: true,
  },
  {
    code: "PRG-USAHA-01",
    name: "Penguatan Usaha Produk Anggota",
    bidang: "usaha",
    objective: "Menata katalog, HPP, kemasan, dan kanal penjualan produk anggota.",
    period: "Januari–Desember 2026",
    status: "berjalan",
    progress: 69,
    budget: 40_800_000,
    spent: 28_120_000,
    indicators: [
      { label: "Produk terpublikasi", target: "12", actual: "9" },
      { label: "Omzet bulanan (Rp jt)", target: "15", actual: "12,4" },
      { label: "Mitra aktif", target: "6", actual: "5" },
    ],
    published: true,
  },
  {
    code: "PRG-TANI-02",
    name: "Konservasi Lahan & Sumber Air",
    bidang: "pertanian",
    objective: "Menjaga kualitas lahan melalui terasering, pupuk organik, dan pengelolaan sumber air.",
    period: "Juli 2026–Juni 2027",
    status: "perencanaan",
    progress: 12,
    budget: 12_000_000,
    spent: 0,
    indicators: [
      { label: "Petak terasering", target: "15", actual: "0" },
      { label: "Titik sumber air terpetakan", target: "6", actual: "2" },
    ],
    published: false,
  },
];

export const ACTIVITIES: Activity[] = [
  { id: "K-201", name: "Praktik pascapanen & fermentasi kopi", programCode: "PRG-DAYA-01", bidang: "pelatihan", date: "2026-11-25", time: "09.00–14.00", location: "Balai pertemuan & petak demplot", participants: 32, status: "terjadwal", openToPublic: false, person: "Rukmini" },
  { id: "K-202", name: "Rapat koordinasi bidang", programCode: "PRG-ORG-01", bidang: "organisasi", date: "2026-11-25", time: "15.30–17.00", location: "Balai pertemuan", participants: 11, status: "terjadwal", openToPublic: false, person: "Sekretaris" },
  { id: "K-203", name: "Kunjungan lapangan pendampingan (12 petak)", programCode: "PRG-TANI-01", bidang: "pertanian", date: "2026-11-26", time: "07.30–12.00", location: "Dusun Ngadimulyo & Kedu", participants: 8, status: "terjadwal", openToPublic: false, person: "Warsiti" },
  { id: "K-204", name: "Sekolah Tani — kemasan & harga jual", programCode: "PRG-DAYA-01", bidang: "pelatihan", date: "2026-12-06", time: "09.00–13.00", location: "Balai pertemuan", participants: 28, status: "terjadwal", openToPublic: true, person: "Rukmini" },
  { id: "K-205", name: "Panen raya kopi anggota", programCode: "PRG-TANI-01", bidang: "pertanian", date: "2026-12-13", time: "06.30–11.00", location: "Petak kelompok Dusun Krajan", participants: 45, status: "terjadwal", openToPublic: true, person: "Warsiti" },
  { id: "K-206", name: "Bazar produk anggota", programCode: "PRG-USAHA-01", bidang: "usaha", date: "2026-12-20", time: "08.00–15.00", location: "Alun-alun Kedu", participants: 24, status: "terjadwal", openToPublic: true, person: "Dwi Lestari" },
  { id: "K-207", name: "Pelatihan pengolahan pascapanen", programCode: "PRG-DAYA-01", bidang: "pelatihan", date: "2026-11-10", time: "09.00–14.00", location: "Balai pertemuan", participants: 30, status: "selesai", openToPublic: false, person: "Rukmini" },
  { id: "K-208", name: "Pemeriksaan stok & opname gudang", programCode: "PRG-USAHA-01", bidang: "usaha", date: "2026-11-14", time: "13.00–16.00", location: "Gudang bersama", participants: 5, status: "selesai", openToPublic: false, person: "Dwi Lestari" },
  { id: "K-209", name: "Survei kebutuhan anggota", programCode: "PRG-ORG-01", bidang: "organisasi", date: "2026-11-08", time: "Seharian", location: "Daring & kunjungan rumah", participants: 96, status: "selesai", openToPublic: false, person: "Bidang Organisasi" },
];

export const TASKS: Task[] = [
  { id: "T-301", title: "Lengkapi berita acara praktik pascapanen", bidang: "pelatihan", assignee: "Rukmini", due: "2026-11-24", priority: "tinggi", status: "proses", programCode: "PRG-DAYA-01" },
  { id: "T-302", title: "Rekap presensi pelatihan 10 November", bidang: "pelatihan", assignee: "Rukmini", due: "2026-11-23", priority: "sedang", status: "belum", programCode: "PRG-DAYA-01" },
  { id: "T-303", title: "Perbarui data panen 9 petak", bidang: "pertanian", assignee: "Warsiti", due: "2026-11-23", priority: "tinggi", status: "proses", programCode: "PRG-TANI-01" },
  { id: "T-304", title: "Jadwalkan kunjungan lapangan Desember", bidang: "pertanian", assignee: "Warsiti", due: "2026-11-27", priority: "sedang", status: "belum", programCode: "PRG-TANI-01" },
  { id: "T-305", title: "Finalisasi draft usulan kemasan baru", bidang: "usaha", assignee: "Dwi Lestari", due: "2026-11-24", priority: "tinggi", status: "proses", programCode: "PRG-USAHA-01" },
  { id: "T-306", title: "Unggah foto produk terpublikasi", bidang: "usaha", assignee: "Dwi Lestari", due: "2026-11-20", priority: "rendah", status: "terlambat", programCode: "PRG-USAHA-01" },
  { id: "T-307", title: "Tindak lanjuti 9 usulan anggota", bidang: "organisasi", assignee: "Bidang Organisasi", due: "2026-11-28", priority: "sedang", status: "belum", programCode: "PRG-ORG-01" },
  { id: "T-308", title: "Rekonsiliasi mutasi bank November", bidang: "keuangan", assignee: "Titik Handayani", due: "2026-11-30", priority: "tinggi", status: "proses" },
  { id: "T-309", title: "Kumpulkan bukti pembayaran pelatihan", bidang: "keuangan", assignee: "Titik Handayani", due: "2026-11-24", priority: "sedang", status: "belum" },
  { id: "T-310", title: "Arsipkan surat keluar 021/KWT-SB/XI/2026", bidang: "sekretariat", assignee: "Endang Puspitasari", due: "2026-11-22", priority: "rendah", status: "selesai" },
  { id: "T-311", title: "Siapkan bahan rapat 25 November", bidang: "sekretariat", assignee: "Endang Puspitasari", due: "2026-11-24", priority: "tinggi", status: "proses" },
  { id: "T-312", title: "Verifikasi pendaftaran calon anggota", bidang: "organisasi", assignee: "Bidang Organisasi", due: "2026-11-26", priority: "sedang", status: "belum", programCode: "PRG-ORG-01" },
];

// ---------------------------------------------------------------- Agriculture
export const LANDS: LandPlot[] = [
  { id: "L-01", owner: "Warsiti", areaHa: 0.42, commodity: "Kopi Arabika", village: "Ngadimulyo", status: "produktif", plantedAt: "2019-11-10", lastVisit: "2026-11-19", notes: "Terasering selesai; naungan lamtoro." },
  { id: "L-02", owner: "Parmi", areaHa: 0.35, commodity: "Kopi Arabika", village: "Ngadimulyo", status: "produktif", plantedAt: "2020-01-22", lastVisit: "2026-11-19", notes: "Pangkas ringan November." },
  { id: "L-03", owner: "Suprapti", areaHa: 0.28, commodity: "Madu (lebah trigona)", village: "Kedu", status: "produktif", plantedAt: "2021-04-04", lastVisit: "2026-11-16", notes: "12 stup aktif." },
  { id: "L-04", owner: "Ngatinem", areaHa: 0.51, commodity: "Beras Merah", village: "Ngadimulyo", status: "produktif", plantedAt: "2026-05-14", lastVisit: "2026-11-12", notes: "Pengairan dari saluran desa." },
  { id: "L-05", owner: "Suyati", areaHa: 0.32, commodity: "Gula Aren", village: "Kedu", status: "produktif", plantedAt: "2018-02-09", lastVisit: "2026-11-11", notes: "28 pohon produktif." },
  { id: "L-06", owner: "Kasiyem", areaHa: 0.30, commodity: "Kopi Arabika", village: "Ngadimulyo", status: "istirahat", plantedAt: "2017-12-01", lastVisit: "2026-09-28", notes: "Rehabilitasi pascapanen; pemilik nonaktif." },
  { id: "L-07", owner: "Sri Wulandari", areaHa: 0.24, commodity: "Teh Herbal", village: "Ngadimulyo", status: "produktif", plantedAt: "2022-03-15", lastVisit: "2026-11-18", notes: "Demplot teh herbal kelompok." },
  { id: "L-08", owner: "Siti Aminah", areaHa: 0.38, commodity: "Kopi Arabika", village: "Kedu", status: "persiapan", plantedAt: "—", lastVisit: "2026-11-10", notes: "Calon lahan anggota baru; menunggu verifikasi." },
];

export const HARVESTS: Harvest[] = [
  { id: "H-401", date: "2026-11-19", plotId: "L-01", commodity: "Kopi Arabika", weightKg: 420, grade: "A", pricePerKg: 42_000, field: "pertanian", note: "Fermentasi 36 jam" },
  { id: "H-402", date: "2026-11-19", plotId: "L-02", commodity: "Kopi Arabika", weightKg: 380, grade: "A", pricePerKg: 42_000, field: "pertanian" },
  { id: "H-403", date: "2026-11-16", plotId: "L-03", commodity: "Madu Trigona", weightKg: 18, grade: "A", pricePerKg: 145_000, field: "pertanian", note: "Panen 12 stup" },
  { id: "H-404", date: "2026-11-14", plotId: "L-04", commodity: "Beras Merah", weightKg: 620, grade: "B", pricePerKg: 14_000, field: "pertanian" },
  { id: "H-405", date: "2026-11-11", plotId: "L-05", commodity: "Gula Aren", weightKg: 96, grade: "B", pricePerKg: 28_000, field: "pertanian" },
  { id: "H-406", date: "2026-11-08", plotId: "L-01", commodity: "Kopi Arabika", weightKg: 310, grade: "B", pricePerKg: 36_000, field: "pertanian" },
  { id: "H-407", date: "2026-11-18", plotId: "L-07", commodity: "Teh Herbal", weightKg: 74, grade: "A", pricePerKg: 32_000, field: "pertanian" },
];

// ---------------------------------------------------------------- Training
export const TRAININGS: Training[] = [
  { id: "PLT-2026-07", title: "Pengolahan Pascapanen Kopi", category: "Pascapanen", date: "2026-11-10", trainer: "Ir. Bambang S. (BPP Kedu)", location: "Balai pertemuan", seats: 32, registered: 30, status: "selesai", materials: ["Fermentasi & pencucian", "Pengeringan", "Sortasi mutu"], preScore: 52, postScore: 81 },
  { id: "PLT-2026-08", title: "Pembukuan Sederhana untuk Usaha Anggota", category: "Usaha", date: "2026-11-05", trainer: "Titik Handayani (internal)", location: "Balai pertemuan", seats: 28, registered: 26, status: "selesai", materials: ["Pencatatan pemasukan", "HPP sederhana", "Harga jual"], preScore: 45, postScore: 77 },
  { id: "PLT-2026-09", title: "Praktik Pascapanen & Fermentasi", category: "Pascapanen", date: "2026-11-25", trainer: "Ir. Bambang S. (BPP Kedu)", location: "Balai & demplot", seats: 32, registered: 32, status: "dibuka", materials: ["Fermentasi lanjutan"] },
  { id: "PLT-2026-10", title: "Kemasan & Harga Jual Produk", category: "Usaha", date: "2026-12-06", trainer: "Dina Ayu (UMKM Temanggung)", location: "Balai pertemuan", seats: 30, registered: 21, status: "dibuka", materials: ["Desain label", "Perhitungan HPP", "Harga pasaran"] },
  { id: "PLT-2026-11", title: "Literasi Digital Anggota", category: "Digital", date: "2026-12-13", trainer: "Relawan komunitas", location: "Balai pertemuan", seats: 24, registered: 9, status: "dibuka", materials: ["WhatsApp Business", "Foto produk"] },
  { id: "PLT-2026-12", title: "Kepemimpinan & Kaderisasi Perempuan Tani", category: "Kepemimpinan", date: "2026-12-20", trainer: "Fasilitator desa", location: "Balai pertemuan", seats: 20, registered: 6, status: "rencana", materials: ["Peran kader", "Praktik fasilitasi"] },
];

export const ATTENDANCE: AttendanceRow[] = [
  { trainingId: "PLT-2026-07", memberName: "Warsiti", present: true },
  { trainingId: "PLT-2026-07", memberName: "Parmi", present: true },
  { trainingId: "PLT-2026-07", memberName: "Suprapti", present: true },
  { trainingId: "PLT-2026-07", memberName: "Ngatinem", present: true },
  { trainingId: "PLT-2026-07", memberName: "Suyati", present: true },
  { trainingId: "PLT-2026-07", memberName: "Kasiyem", present: false, note: "Tidak hadir tanpa kabar" },
  { trainingId: "PLT-2026-08", memberName: "Suyati", present: true },
  { trainingId: "PLT-2026-08", memberName: "Dwi Lestari", present: true },
  { trainingId: "PLT-2026-08", memberName: "Parmi", present: true },
  { trainingId: "PLT-2026-08", memberName: "Suprapti", present: false, note: "Izin" },
];

// ---------------------------------------------------------------- Usaha
export const PRODUCTS: Product[] = [
  { id: "P-01", slug: "kopi-arabika-srikandi", name: "Kopi Arabika Srikandi", category: "Kopi", unit: "250 gram", price: 45_000, stock: 84, producer: "Kelompok Kopi Ngadimulyo", story: "Ditanam di ketinggian 900 mdpl, difermentasi 36 jam, disangrai sedang.", published: true, image: "/images/prod-kopi.jpg", hpp: 29_500 },
  { id: "P-02", slug: "madu-trigona-murni", name: "Madu Trigona Murni", category: "Madu", unit: "250 ml", price: 85_000, stock: 32, producer: "Suprapti", story: "Madu tanpa pemanasan dari lebah trigona, panen terbatas tiap bulan.", published: true, image: "/images/prod-madu.jpg", hpp: 52_000 },
  { id: "P-03", slug: "gula-aren-cetak", name: "Gula Aren Cetak", category: "Olahan Pangan", unit: "500 gram", price: 25_000, stock: 120, producer: "Suyati", story: "Nira aren segar dari 28 pohon tua, dimasak kayu tanpa bahan tambahan.", published: true, image: "/images/prod-gula-aren.jpg", hpp: 15_500 },
  { id: "P-04", slug: "beras-merah-organik", name: "Beras Merah Organik", category: "Beras", unit: "2 kg", price: 38_000, stock: 60, producer: "Ngatinem", story: "Beras merah tanpa pestisida sintetis dari petak sawah desa.", published: true, image: "/images/prod-beras.jpg", hpp: 24_000 },
  { id: "P-05", slug: "teh-herbal-kampung", name: "Teh Herbal Kampung", category: "Olahan Pangan", unit: "20 kantong", price: 18_000, stock: 46, producer: "Sri Wulandari", story: "Campuran sereh, jahe, dan daun kelor dari demplot kelompok.", published: true, image: "/images/prod-teh.jpg", hpp: 10_800 },
  { id: "P-06", slug: "keripik-pisang-tani", name: "Keripik Pisang Tani", category: "Olahan Pangan", unit: "150 gram", price: 15_000, stock: 96, producer: "Kelompok Usaha Bersama", story: "Pisang kepok pilihan dari kebun anggota, digoreng minyak kelapa.", published: true, image: "/images/prod-keripik.jpg", hpp: 9_200 },
  { id: "P-07", slug: "kopi-robusta-bubuk", name: "Kopi Robusta Bubuk", category: "Kopi", unit: "250 gram", price: 35_000, stock: 0, producer: "Kelompok Kopi Ngadimulyo", story: "Robusta dari petak bawah, cocok untuk seduhan tubruk.", published: false, image: "/images/prod-kopi.jpg", hpp: 23_000 },
  { id: "P-08", slug: "madu-trigona-500", name: "Madu Trigona 500 ml", category: "Madu", unit: "500 ml", price: 160_000, stock: 0, producer: "Suprapti", story: "Kemasan besar untuk keluarga dan kafe.", published: false, image: "/images/prod-madu.jpg", hpp: 98_000 },
  { id: "P-09", slug: "pupuk-organik-padat", name: "Pupuk Organik Padat", category: "Sarana", unit: "5 kg", price: 30_000, stock: 24, producer: "Kelompok Ternak & Kebun", story: "Kompos kohe & sekam, dipakai sendiri dan dijual ke anggota.", published: false, image: "/images/prod-pupuk.jpg", hpp: 17_500 },
];

export const PARTNERS: Partner[] = [
  { id: "MT-01", name: "Balai Penyuluhan Pertanian Kecamatan Kedu", type: "pemerintah", contact: "Penyuluh lapangan — BPP Kedu", status: "aktif", since: "2019-03-01", milestone: "Pendampingan teknis & narasumber pelatihan" },
  { id: "MT-02", name: "Pemerintah Desa Ngadimulyo", type: "pemerintah", contact: "Kaur Kesra", status: "aktif", since: "2018-01-15", milestone: "Bantuan sarana produksi tahap 1 & 2" },
  { id: "MT-03", name: "Yayasan Perempuan Tumbuh (demo)", type: "ngo", contact: "Program officer — pemberdayaan", status: "aktif", since: "2026-02-20", milestone: "Hibah pemberdayaan perempuan 2026" },
  { id: "MT-04", name: "Koperasi Mitra Sejahtera", type: "koperasi", contact: "Manajer pembelian", status: "aktif", since: "2025-08-09", milestone: "Kontrak pembelian kopi & madu" },
  { id: "MT-05", name: "UMKM Temanggung Bersama", type: "usaha", contact: "Owner — Dina Ayu", status: "aktif", since: "2026-04-12", milestone: "Pelatihan kemasan & pemasaran" },
  { id: "MT-06", name: "Kafe Kopi Lereng", type: "usaha", contact: "Barista & pembelian", status: "penjajakan", since: "2026-11-02", milestone: "Uji coba pasokan bulanan" },
  { id: "MT-07", name: "Politeknik Pertanian (demo)", type: "akademik", contact: "Program pengabdian masyarakat", status: "penjajakan", since: "2026-10-18", milestone: "Kolaborasi riset mutu kopi" },
];

export const ORDERS: Order[] = [
  { id: "ORD-1121", customer: "Kafe Kopi Lereng", date: "2026-11-21", items: [{ productId: "P-01", qty: 24, price: 45_000 }, { productId: "P-02", qty: 6, price: 85_000 }], status: "baru", channel: "whatsapp" },
  { id: "ORD-1120", customer: "Warung Bu Tejo", date: "2026-11-20", items: [{ productId: "P-03", qty: 20, price: 25_000 }], status: "diproses", channel: "whatsapp" },
  { id: "ORD-1119", customer: "Koperasi Mitra Sejahtera", date: "2026-11-19", items: [{ productId: "P-01", qty: 40, price: 42_000 }, { productId: "P-04", qty: 20, price: 38_000 }], status: "lunas", channel: "mitra", journalId: "JRN-0015" },
  { id: "ORD-1118", customer: "Pengunjung bazar — Ani", date: "2026-11-17", items: [{ productId: "P-05", qty: 3, price: 18_000 }, { productId: "P-06", qty: 2, price: 15_000 }], status: "lunas", channel: "pos", journalId: "JRN-0013" },
  { id: "ORD-1117", customer: "Ibu Ratna (Temanggung)", date: "2026-11-15", items: [{ productId: "P-02", qty: 2, price: 85_000 }], status: "dikirim", channel: "whatsapp" },
  { id: "ORD-1116", customer: "Toko Oleh-oleh Khas", date: "2026-11-12", items: [{ productId: "P-06", qty: 30, price: 13_500 }], status: "batal", channel: "whatsapp" },
];

/**
 * Barang & persediaan gudang (aplikasi Usaha). Angkanya konsisten dengan
 * katalog: setiap produk terbit punya satu baris gudang dengan harga jual sama.
 */
export const INVENTORY: InventoryItem[] = [
  { id: "BRG-001", name: "Kopi Arabika Srikandi 250 g", category: "Kopi", unit: "bungkus", stock: 84, minStock: 20, costPrice: 29_500, sellPrice: 45_000, location: "Rak A-1", supplier: "Kelompok Kopi Ngadimulyo", updatedAt: "2026-11-21" },
  { id: "BRG-002", name: "Madu Trigona Murni 250 ml", category: "Madu", unit: "botol", stock: 32, minStock: 12, costPrice: 52_000, sellPrice: 85_000, location: "Rak B-2", supplier: "Suprapti", updatedAt: "2026-11-20" },
  { id: "BRG-003", name: "Gula Aren Cetak 500 g", category: "Olahan Pangan", unit: "keping", stock: 120, minStock: 40, costPrice: 15_500, sellPrice: 25_000, location: "Rak C-1", supplier: "Suyati", updatedAt: "2026-11-19" },
  { id: "BRG-004", name: "Beras Merah Organik 2 kg", category: "Beras", unit: "pak", stock: 60, minStock: 25, costPrice: 24_000, sellPrice: 38_000, location: "Rak D-1", supplier: "Ngatinem", updatedAt: "2026-11-18" },
  { id: "BRG-005", name: "Teh Herbal Kampung 20 kantong", category: "Olahan Pangan", unit: "kotak", stock: 46, minStock: 20, costPrice: 10_800, sellPrice: 18_000, location: "Rak C-3", supplier: "Sri Wulandari", updatedAt: "2026-11-17" },
  { id: "BRG-006", name: "Keripik Pisang Tani 150 g", category: "Olahan Pangan", unit: "bungkus", stock: 96, minStock: 30, costPrice: 9_200, sellPrice: 15_000, location: "Rak E-2", supplier: "Kelompok Usaha Bersama", updatedAt: "2026-11-16" },
  { id: "BRG-007", name: "Kemasan kraft 500 g (kosong)", category: "Kemasan", unit: "lembar", stock: 240, minStock: 100, costPrice: 1_200, sellPrice: 0, location: "Gudang belakang", supplier: "Toko Kemasan Temanggung", updatedAt: "2026-11-15" },
  { id: "BRG-008", name: "Label stiker merek (rol)", category: "Kemasan", unit: "rol", stock: 8, minStock: 10, costPrice: 35_000, sellPrice: 0, location: "Gudang belakang", supplier: "Percetakan Kedu", updatedAt: "2026-11-14" },
];
