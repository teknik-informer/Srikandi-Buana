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
  appStatus: FieldAppStatus;
  appHref: string;
  icon: "users" | "sprout" | "graduation" | "store";
  accent: string;
  modules: string[];
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
    appStatus: "disiapkan",
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
    appStatus: "disiapkan",
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
    appStatus: "disiapkan",
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
  },
  {
    fieldId: "FLD-USAHA",
    code: "USAHA",
    slug: "usaha",
    name: "Bidang Usaha & Kemitraan",
    shortName: "Usaha & Kemitraan",
    mandate:
      "Mengembangkan kegiatan ekonomi dan mengelola hubungan usaha/mitra: pemetaan produk, produsen, HPP, harga, daftar produk, stok, pesanan, pelanggan, penjualan, promosi, peluang pasar, database mitra, komunikasi, proposal, perjanjian, dan milestone kerja sama.",
    decision: {
      kind: "Struktur kerja organisasi (dasar keputusan resmi)",
      number: "Belum tercatat",
      date: "Belum tercatat",
      note: "Nomor & tanggal SK pengesahan belum tercatat pada dokumen yang tersedia.",
    },
    period: { start: "Belum tercatat", end: "Belum tercatat" },
    coordinator: "Belum tercatat",
    coordinatorNote: "Koordinator definitif menunggu keputusan organisasi.",
    appStatus: "disiapkan",
    appHref: "/app/bidang/usaha",
    icon: "store",
    accent: "#a16200",
    modules: [
      "Pemetaan produk & potensi usaha",
      "Produsen",
      "HPP & harga",
      "Produk",
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
  },
];

export const FIELDS_BY_SLUG: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.slug, f]),
);
