/**
 * Katalog enam aplikasi yang dipetakan ke empat dashboard produksi.
 * Empat dashboard produksi tetap menjadi registry otoritatif; katalog ini hanya menyajikan pintasan aplikasi.
 * Katalog ini tidak memberikan izin akses; visibilitas pintasan mengikuti fitur pada dashboard yang diizinkan policy server.
 */
export type PlatformApplicationId =
  | "platform-core"
  | "organization"
  | "agriculture"
  | "business"
  | "bi-analytics"
  | "public-partnership";

export type PlatformApplication = {
  id: PlatformApplicationId;
  name: string;
  eyebrow: string;
  description: string;
  route: string;
  dashboardId: "ecosystem" | "publication" | "finance" | "system";
  featureId: string;
  status: "foundation" | "partial" | "preview";
  legacyWorkspaces: readonly string[];
  supportingDomains: readonly string[];
};

export const platformApplications: readonly PlatformApplication[] = [
  {
    id: "platform-core",
    name: "Platform Core",
    eyebrow: "IDENTITY · SECURITY · GOVERNANCE",
    description: "Identitas tunggal, autentikasi, otorisasi, pengaturan platform, audit, dan pusat kendali aplikasi.",
    route: "/dashboard/pengaturan",
    dashboardId: "system",
    featureId: "pengaturan",
    status: "foundation",
    legacyWorkspaces: [],
    supportingDomains: ["System Administration", "Collaboration & Communication"],
  },
  {
    id: "organization",
    name: "Organization Management",
    eyebrow: "ORGANIZATION · PEOPLE · GOVERNANCE",
    description: "Keanggotaan, struktur organisasi, kepengurusan, presensi, musyawarah, administrasi, dan layanan anggota.",
    route: "/dashboard/portal",
    dashboardId: "ecosystem",
    featureId: "portal",
    status: "partial",
    legacyWorkspaces: ["hrm"],
    supportingDomains: ["Member profiles", "Organization units", "Attendance", "Documents"],
  },
  {
    id: "agriculture",
    name: "Agriculture Management",
    eyebrow: "FARMING · PRODUCTION · TRACEABILITY",
    description: "Data petani dan lahan, komoditas, siklus tanam, panen, lot produksi, serta ketertelusuran hasil pertanian.",
    route: "/dashboard/pertanian",
    dashboardId: "ecosystem",
    featureId: "pertanian",
    status: "partial",
    legacyWorkspaces: ["projects"],
    supportingDomains: ["Inventory & Procurement", "Agriculture records", "Supply lots"],
  },
  {
    id: "business",
    name: "Business & Enterprise",
    eyebrow: "FINANCE · COMMERCE · PARTNERSHIPS",
    description: "Keuangan, buku besar, aset, persediaan, usaha, penjualan, transaksi, dan pengelolaan kemitraan usaha.",
    route: "/dashboard/usaha",
    dashboardId: "finance",
    featureId: "usaha",
    status: "partial",
    legacyWorkspaces: ["accounting", "pos"],
    supportingDomains: ["Inventory & Procurement", "Commerce", "Accounting"],
  },
  {
    id: "bi-analytics",
    name: "BI & Analytics",
    eyebrow: "PERFORMANCE · INSIGHT · EVIDENCE",
    description: "KPI, analisis tren, kualitas data, kinerja program, dan pelaporan berbasis data sesuai kewenangan.",
    route: "/dashboard/laporan",
    dashboardId: "finance",
    featureId: "laporan",
    status: "preview",
    legacyWorkspaces: ["analytics"],
    supportingDomains: ["Monitoring, Evaluation & Learning", "Data quality"],
  },
  {
    id: "public-partnership",
    name: "Public & Partnership",
    eyebrow: "PUBLIC WEBSITE · TRANSPARENCY · PARTNERS",
    description: "Website publik, informasi organisasi, publikasi, galeri, transparansi program, dan akses pemerintah serta mitra.",
    route: "/dashboard/publikasi",
    dashboardId: "publication",
    featureId: "publikasi",
    status: "partial",
    legacyWorkspaces: ["crm"],
    supportingDomains: ["Public Website CMS", "External access", "Publication workflow"],
  },
];

export const platformApplicationIds = platformApplications.map((application) => application.id);

export function getPlatformApplicationById(id: string) {
  return platformApplications.find((application) => application.id === id);
}
