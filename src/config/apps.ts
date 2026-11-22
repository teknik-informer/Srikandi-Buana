/**
 * APPLICATION REGISTRY — Blueprint §9 portfolio + §14.4 route boundaries.
 * The app launcher, the shell and the Studio all read this registry.
 */

export type AppKey =
  | "launcher"
  | "pengurus"
  | "sekretariat"
  | "keuangan"
  | "organisasi"
  | "pertanian"
  | "pelatihan"
  | "usaha"
  | "anggota"
  | "pos"
  | "studio"
  | "portal";

export interface AppDef {
  key: AppKey;
  name: string;
  short: string;
  href: string;
  audience: string;
  description: string;
  icon: string;
  group: "inti" | "bidang" | "pendukung";
  badge?: string;
  requiresRole?: string[];
}

export const APPS: AppDef[] = [
  {
    key: "launcher",
    name: "Beranda Aplikasi",
    short: "Beranda",
    href: "/app",
    audience: "Semua pengguna internal",
    description: "Titik masuk: pilih aplikasi, lihat tugas, agenda, dan keputusan yang menunggu.",
    icon: "home",
    group: "inti",
  },
  {
    key: "pengurus",
    name: "Aplikasi Pengurus Harian",
    short: "Pengurus",
    href: "/app/pengurus",
    audience: "Pengurus harian & pengawas",
    description: "Pandangan lintas bidang, persetujuan, dan keputusan organisasi.",
    icon: "compass",
    group: "inti",
  },
  {
    key: "sekretariat",
    name: "Aplikasi Sekretariat",
    short: "Sekretariat",
    href: "/app/sekretariat",
    audience: "Sekretaris & staf administrasi",
    description: "Surat, notulen, dokumen, agenda, dan arsip organisasi.",
    icon: "archive",
    group: "inti",
  },
  {
    key: "keuangan",
    name: "Aplikasi Keuangan & Akuntansi",
    short: "Keuangan",
    href: "/app/keuangan",
    audience: "Bendahara & pemeriksa",
    description: "Keuangan native: COA, jurnal double-entry, kas/bank, laporan.",
    icon: "wallet",
    group: "inti",
    badge: "Native",
  },
  {
    key: "organisasi",
    name: "Aplikasi Organisasi & Keanggotaan",
    short: "Organisasi",
    href: "/app/bidang/organisasi",
    audience: "Bidang Organisasi & Keanggotaan",
    description: "Partisipasi, kaderisasi, pemetaan minat, dan kebutuhan anggota.",
    icon: "users",
    group: "bidang",
    badge: "Bidang",
  },
  {
    key: "pertanian",
    name: "Aplikasi Pertanian & Produksi",
    short: "Pertanian",
    href: "/app/bidang/pertanian",
    audience: "Bidang Pertanian & Produksi",
    description: "Lahan, komoditas, budidaya, panen, dan catatan lapangan.",
    icon: "sprout",
    group: "bidang",
    badge: "Bidang",
  },
  {
    key: "pelatihan",
    name: "Aplikasi Pemberdayaan & Pelatihan",
    short: "Pelatihan",
    href: "/app/bidang/pelatihan",
    audience: "Bidang Pemberdayaan & Pelatihan",
    description: "Rencana pelatihan, peserta, kehadiran, asesmen, evaluasi.",
    icon: "graduation",
    group: "bidang",
    badge: "Bidang",
  },
  {
    key: "usaha",
    name: "Aplikasi Usaha & Kemitraan",
    short: "Usaha",
    href: "/app/bidang/usaha",
    audience: "Bidang Usaha & Kemitraan",
    description: "Katalog, stok, pesanan, mitra, dan kerja sama usaha.",
    icon: "store",
    group: "bidang",
    badge: "Bidang",
  },
  {
    key: "anggota",
    name: "Portal Anggota",
    short: "Portal Anggota",
    href: "/app/anggota",
    audience: "Seluruh anggota",
    description: "Keanggotaan, agenda, tugas, kontribusi, dan komunitas.",
    icon: "home",
    group: "pendukung",
  },
  {
    key: "pos",
    name: "Aplikasi Penjualan (POS)",
    short: "POS",
    href: "/app/pos",
    audience: "Kasir & petugas lapangan",
    description: "Kasir touch-first yang terhubung ke Usaha dan Keuangan.",
    icon: "scan",
    group: "pendukung",
  },
  {
    key: "studio",
    name: "Studio Pengelola",
    short: "Studio",
    href: "/studio",
    audience: "Pengelola platform",
    description: "Website, aplikasi, formulir, dashboard, alur, dan rilis.",
    icon: "sliders",
    group: "pendukung",
  },
  {
    key: "portal",
    name: "Portal Eksternal",
    short: "Portal Eksternal",
    href: "/portal",
    audience: "Pemerintah, NGO, mitra",
    description: "Akses terbatas pada data dan laporan yang dibagikan.",
    icon: "globe",
    group: "pendukung",
  },
];

export const APP_BY_KEY = Object.fromEntries(APPS.map((a) => [a.key, a])) as Record<AppKey, AppDef>;

/** Sidebar standard for bidang apps — Blueprint §8.4 "Standar navigasi aplikasi bidang" */
export const FIELD_NAV_GROUPS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "perencanaan", label: "Perencanaan" },
  { key: "program", label: "Program & Kegiatan" },
  { key: "tugas", label: "Tugas & Tim" },
  { key: "data", label: "Data Operasional" },
  { key: "formulir", label: "Formulir" },
  { key: "dokumen", label: "Dokumen" },
  { key: "anggaran", label: "Anggaran" },
  { key: "laporan", label: "Laporan" },
  { key: "pengaturan", label: "Pengaturan" },
] as const;

export const CORE_NAV: Record<"pengurus" | "sekretariat" | "keuangan" | "anggota", { label: string; href: string; icon?: string }[]> = {
  pengurus: [
    { label: "Ringkasan Organisasi", href: "/app/pengurus" },
    { label: "Persetujuan", href: "/app/pengurus/persetujuan" },
    { label: "Lintas Bidang", href: "/app/pengurus/bidang" },
    { label: "Rapat & Keputusan", href: "/app/pengurus/rapat" },
    { label: "Kinerja & Indikator", href: "/app/pengurus/indikator" },
  ],
  sekretariat: [
    { label: "Ringkasan", href: "/app/sekretariat" },
    { label: "Surat Masuk-Keluar", href: "/app/sekretariat/surat" },
    { label: "Notulen & Putusan", href: "/app/sekretariat/notulen" },
    { label: "Agenda Organisasi", href: "/app/sekretariat/agenda" },
    { label: "Dokumen & Arsip", href: "/app/sekretariat/dokumen" },
  ],
  keuangan: [
    { label: "Ringkasan Keuangan", href: "/app/keuangan" },
    { label: "Kas & Bank", href: "/app/keuangan/kas-bank" },
    { label: "Penerimaan", href: "/app/keuangan/penerimaan" },
    { label: "Pembayaran", href: "/app/keuangan/pembayaran" },
    { label: "Buku Besar", href: "/app/keuangan/buku-besar" },
    { label: "Neraca Saldo", href: "/app/keuangan/neraca-saldo" },
    { label: "Anggaran", href: "/app/keuangan/anggaran" },
    { label: "Laporan", href: "/app/keuangan/laporan" },
    { label: "Bagan Akun (COA)", href: "/app/keuangan/bagan-akun" },
  ],
  anggota: [
    { label: "Beranda Anggota", href: "/app/anggota" },
    { label: "Profil Saya", href: "/app/anggota/profil" },
    { label: "Agenda & Kehadiran", href: "/app/anggota/agenda" },
    { label: "Penugasan", href: "/app/anggota/tugas" },
    { label: "Komunitas", href: "/app/anggota/komunitas" },
    { label: "Kontribusi", href: "/app/anggota/kontribusi" },
  ],
};
