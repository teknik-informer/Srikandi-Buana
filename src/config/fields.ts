/**
 * APPROVED FIELD REGISTRY — Blueprint V9.1 §1.3 / §8.3
 *
 * Blueprint rule: the four bidang below are treated as ratified organisational
 * units ("bidang resmi"). Technical attributes that the blueprint does not
 * record are marked "Belum tercatat" (see §28) — never invented.
 *
 * Config status is deliberately separated from organisational status (§42.1).
 */

export type FieldAppStatus = "disiapkan" | "diuji" | "aktif" | "ditangguhkan";

export interface FieldDef {
  fieldId: string;
  code: string;
  name: string;
  shortName: string;
  mandate: string;
  decision: { kind: string; number: string; date: string; note: string };
  period: { start: string; end: string };
  coordinator: string;
  coordinatorNote: string;
  teamSize: number;
  appStatus: FieldAppStatus;
  appHref: string;
  icon: "users" | "sprout" | "graduation" | "store";
  accent: string;
  modules: string[];
  kpis: { label: string; value: string; note?: string }[];
  operationalData: { entity: string; count: number; note: string }[];
  /** URL slug of the field app — matches the `bidang` key used across data modules. */
  slug: string;
}

export const FIELDS: FieldDef[] = [
  {
    fieldId: "FLD-ORG",
    code: "ORG",
    slug: "organisasi",
    name: "Bidang Organisasi & Keanggotaan",
    shortName: "Organisasi & Keanggotaan",
    mandate:
      "Mengelola partisipasi, komunikasi, penguatan organisasi, kaderisasi, kebutuhan anggota, dan koordinasi internal.",
    decision: {
      kind: "Struktur kerja organisasi (dasar keputusan resmi)",
      number: "Belum tercatat",
      date: "Belum tercatat",
      note: "Nomor & tanggal SK pengesahan belum tercatat pada dokumen yang tersedia.",
    },
    period: { start: "Belum tercatat", end: "Belum tercatat" },
    coordinator: "Belum tercatat",
    coordinatorNote: "Koordinator definitif menunggu keputusan organisasi.",
    teamSize: 7,
    appStatus: "aktif",
    appHref: "/app/bidang/organisasi",
    icon: "users",
    accent: "#5d8432",
    modules: [
      "Pemetaan minat & keterampilan",
      "Partisipasi anggota",
      "Komunikasi & pengumuman",
      "Kaderisasi",
      "Kelompok minat",
      "Usulan anggota",
      "Survei kebutuhan",
      "Koordinasi kegiatan anggota",
    ],
    kpis: [
      { label: "Anggota terdaftar", value: "128", note: "+6 sejak Jan 2026" },
      { label: "Partisipasi bulan ini", value: "76%", note: "target 70%" },
      { label: "Usulan anggota terbuka", value: "9" },
    ],
    operationalData: [
      { entity: "Peta minat & keterampilan", count: 128, note: "Tersinkron dengan master anggota" },
      { entity: "Catatan partisipasi", count: 214, note: "12 bulan terakhir" },
      { entity: "Usulan & aspirasi anggota", count: 9, note: "3 menunggu tindak lanjut" },
    ],
  },
  {
    fieldId: "FLD-TANI",
    code: "TANI",
    slug: "pertanian",
    name: "Bidang Pertanian & Produksi",
    shortName: "Pertanian & Produksi",
    mandate:
      "Mengelola kegiatan teknis pertanian dan pencatatan produksi: lahan/petak, komoditas, kalender tanam, budidaya, input, kunjungan lapangan, pertumbuhan, panen, pascapanen, kualitas, dan sarana pertanian.",
    decision: {
      kind: "Struktur kerja organisasi (dasar keputusan resmi)",
      number: "Belum tercatat",
      date: "Belum tercatat",
      note: "Nomor & tanggal SK pengesahan belum tercatat pada dokumen yang tersedia.",
    },
    period: { start: "Belum tercatat", end: "Belum tercatat" },
    coordinator: "Belum tercatat",
    coordinatorNote: "Koordinator definitif menunggu keputusan organisasi.",
    teamSize: 9,
    appStatus: "aktif",
    appHref: "/app/bidang/pertanian",
    icon: "sprout",
    accent: "#38571a",
    modules: [
      "Data lahan/petak",
      "Komoditas",
      "Kalender tanam",
      "Budidaya",
      "Input pertanian",
      "Kunjungan lapangan",
      "Catatan pertumbuhan",
      "Produksi & panen",
      "Pascapanen",
      "Kualitas",
      "Sarana pertanian",
    ],
    kpis: [
      { label: "Petak terdata", value: "42", note: "18,6 ha total" },
      { label: "Panen bulan ini", value: "2.340 kg", note: "kopi arabika 61%" },
      { label: "Kalender tanam aktif", value: "6", note: "MT Oktober–Maret" },
    ],
    operationalData: [
      { entity: "Lahan / petak", count: 42, note: "Ownership per anggota" },
      { entity: "Siklus budidaya", count: 17, note: "6 komoditas" },
      { entity: "Catatan panen", count: 96, note: "Musim 2025–2026" },
    ],
  },
  {
    fieldId: "FLD-DAYA",
    code: "DAYA",
    slug: "pelatihan",
    name: "Bidang Pemberdayaan & Pelatihan",
    shortName: "Pemberdayaan & Pelatihan",
    mandate:
      "Merencanakan dan mengukur peningkatan pengetahuan, keterampilan, dan kapasitas anggota: analisis kebutuhan, rencana pelatihan, kelas, narasumber, materi, peserta, kehadiran, asesmen, evaluasi, sertifikat, dan tindak lanjut.",
    decision: {
      kind: "Struktur kerja organisasi (dasar keputusan resmi)",
      number: "Belum tercatat",
      date: "Belum tercatat",
      note: "Nomor & tanggal SK pengesahan belum tercatat pada dokumen yang tersedia.",
    },
    period: { start: "Belum tercatat", end: "Belum tercatat" },
    coordinator: "Belum tercatat",
    coordinatorNote: "Koordinator definitif menunggu keputusan organisasi.",
    teamSize: 6,
    appStatus: "aktif",
    appHref: "/app/bidang/pelatihan",
    icon: "graduation",
    accent: "#bd7400",
    modules: [
      "Analisis kebutuhan pelatihan",
      "Rencana pelatihan",
      "Kelas & kegiatan",
      "Narasumber",
      "Kurikulum & materi",
      "Peserta",
      "Kehadiran",
      "Pre/post assessment",
      "Evaluasi",
      "Sertifikat (bila sah)",
      "Tindak lanjut",
    ],
    kpis: [
      { label: "Pelatihan tahun ini", value: "18", note: "+4 vs 2025" },
      { label: "Peserta unik", value: "112", note: "87% anggota" },
      { label: "Kehadiran rata-rata", value: "91%" },
    ],
    operationalData: [
      { entity: "Rencana pelatihan", count: 18, note: "Anggaran tahun 2026" },
      { entity: "Sesi & presensi", count: 42, note: "Termasuk praktik lapangan" },
      { entity: "Asesmen peserta", count: 330, note: "Pre & post test" },
    ],
  },
  {
    fieldId: "FLD-USAHA",
    code: "USAHA",
    slug: "usaha",
    name: "Bidang Usaha & Kemitraan",
    shortName: "Usaha & Kemitraan",
    mandate:
      "Mengembangkan kegiatan ekonomi dan mengelola hubungan usaha/mitra: pemetaan produk, produsen, HPP, harga, katalog, stok, pesanan, pelanggan, penjualan, promosi, peluang pasar, database mitra, komunikasi, proposal, perjanjian, dan milestone kerja sama.",
    decision: {
      kind: "Struktur kerja organisasi (dasar keputusan resmi)",
      number: "Belum tercatat",
      date: "Belum tercatat",
      note: "Nomor & tanggal SK pengesahan belum tercatat pada dokumen yang tersedia.",
    },
    period: { start: "Belum tercatat", end: "Belum tercatat" },
    coordinator: "Belum tercatat",
    coordinatorNote: "Koordinator definitif menunggu keputusan organisasi.",
    teamSize: 8,
    appStatus: "aktif",
    appHref: "/app/bidang/usaha",
    icon: "store",
    accent: "#a16200",
    modules: [
      "Pemetaan produk & potensi usaha",
      "Produsen",
      "HPP & harga",
      "Katalog",
      "Stok",
      "Pesanan",
      "Pelanggan",
      "Penjualan",
      "Promosi",
      "Peluang pasar",
      "Database mitra",
      "Proposal & perjanjian",
      "Milestone kerja sama",
    ],
    kpis: [
      { label: "Produk terpublikasi", value: "9", note: "dari 12 item katalog" },
      { label: "Pesanan bulan ini", value: "38", note: "Rp 12,4 jt nilai" },
      { label: "Mitra aktif", value: "5", note: "2 dalam penjajakan" },
    ],
    operationalData: [
      { entity: "Katalog produk", count: 12, note: "9 terpublikasi di website" },
      { entity: "Pesanan & penjualan", count: 38, note: "November 2026" },
      { entity: "Profil mitra", count: 7, note: "5 aktif, 2 penjajakan" },
    ],
  },
];

export const FIELDS_BY_SLUG: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.slug, f]),
);
