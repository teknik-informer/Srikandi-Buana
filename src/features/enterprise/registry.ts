import { dashboardGroups, type NavItem } from "../../lib/navigation-config";
import { canReadSectionForRole, type Role } from "../identity/access-policy";

export type EnterpriseDashboardId = "hrm" | "accounting" | "crm" | "projects" | "pos";
export type EnterpriseDashboard = {
  id: EnterpriseDashboardId;
  href: string;
  label: string;
  description: string;
  features: readonly NavItem[];
};

const legacyFeatures = new Map(dashboardGroups.flatMap((group) => group.items).map((item) => [item.id, item]));

function features(ids: readonly string[]): readonly NavItem[] {
  return ids.map((id) => {
    const item = legacyFeatures.get(id);
    if (!item) throw new Error(`Enterprise feature "${id}" has no legacy route definition.`);
    return item;
  });
}

/**
 * Five integrated application workspaces. Existing operational routes remain the
 * source of truth while each application gets its own landing/dashboard route.
 */
export const enterpriseDashboards: readonly EnterpriseDashboard[] = [
  {
    id: "hrm",
    href: "/dashboard/hrm",
    label: "HRM · SDM & Keanggotaan",
    description: "Keanggotaan, struktur, presensi, profil, dan administrasi sumber daya manusia.",
    features: features(["anggota", "pengurus", "musyawarah", "persetujuan", "presensi", "presensi-saya", "portal", "akun-saya"]),
  },
  {
    id: "accounting",
    href: "/dashboard/accounting",
    label: "Accounting · Keuangan",
    description: "Buku kas, akun perkiraan, jurnal, aset, dan pelaporan keuangan.",
    features: features(["kas", "laporan", "akuntansi", "aset"]),
  },
  {
    id: "crm",
    href: "/dashboard/crm",
    label: "CRM · Relasi & Kemitraan",
    description: "Hubungan anggota, mitra, komunikasi, publikasi, dan layanan eksternal.",
    features: features(["kemitraan", "pesan", "akses-eksternal", "publikasi", "galeri"]),
  },
  {
    id: "projects",
    href: "/dashboard/projects",
    label: "Project Management · Program",
    description: "Program kerja, kegiatan, penugasan, tindak lanjut, pertanian, dan dokumen proyek.",
    features: features(["program", "pertanian", "laporan_program", "tindaklanjut", "kegiatan", "usaha", "alsintan", "kehadiran", "surat-resmi", "surat", "sumber", "kelembagaan", "register", "transkripsi", "survei", "dokumen", "pengajuan", "enterprise"]),
  },
  {
    id: "pos",
    href: "/dashboard/pos",
    label: "POS · Penjualan",
    description: "Katalog produk, pemesanan, penerimaan komoditas, dan pengelolaan transaksi.",
    features: features(["penjualan", "lotkopi"]),
  },
];

export const enterpriseUtilities: readonly NavItem[] = [
  { id: "notifikasi", label: "Notifikasi", description: "Pemberitahuan dan status tindak lanjut akun.", href: "/dashboard/notifikasi" },
  { id: "monitoring", label: "Status Sistem", description: "Status layanan dan kelengkapan data.", href: "/dashboard/monitoring" },
  { id: "akun", label: "Pengguna & Hak Akses", description: "Pengelolaan pengguna dan kewenangan akun.", href: "/dashboard/akun" },
  { id: "pengaturan", label: "Pengaturan Website", description: "Identitas dan konfigurasi situs.", href: "/dashboard/pengaturan" },
  { id: "panduan", label: "Pusat Bantuan", description: "Panduan penggunaan aplikasi.", href: "/dashboard/panduan" },
];

export const dashboardRouteIds = enterpriseDashboards.map((dashboard) => dashboard.id);
export const dashboardSectionIds = [
  ...enterpriseDashboards.flatMap((dashboard) => dashboard.features.map((feature) => feature.id)),
  ...enterpriseUtilities.map((feature) => feature.id),
];

export function getEnterpriseDashboardById(id: string): EnterpriseDashboard | undefined {
  return enterpriseDashboards.find((dashboard) => dashboard.id === id);
}
export function getEnterpriseDashboard(sectionId: string): EnterpriseDashboard | undefined {
  return enterpriseDashboards.find((dashboard) => dashboard.features.some((feature) => feature.id === sectionId));
}
export function getEnterpriseFeature(sectionId: string): NavItem | undefined {
  return getEnterpriseDashboard(sectionId)?.features.find((feature) => feature.id === sectionId)
    ?? enterpriseUtilities.find((feature) => feature.id === sectionId);
}
export function getVisibleEnterpriseDashboards(role: Role, fullAccess = false) {
  if (fullAccess) return enterpriseDashboards.map((dashboard) => ({ ...dashboard, features: dashboard.features.filter((feature) => feature.id !== "kehadiran") }));
  return enterpriseDashboards.map((dashboard) => ({
    ...dashboard,
    features: dashboard.features.filter((feature) => feature.id !== "kehadiran" && canReadSectionForRole(role, feature.id)),
  })).filter((dashboard) => dashboard.features.length > 0);
}
export function getVisibleEnterpriseUtilities(role: Role, fullAccess = false) {
  if (fullAccess) return enterpriseUtilities;
  return enterpriseUtilities.filter((item) => canReadSectionForRole(role, item.id));
}
export type EnterprisePillarId = EnterpriseDashboardId;
export type EnterprisePillar = EnterpriseDashboard;
export const enterprisePillars = enterpriseDashboards;
export const getEnterprisePillar = getEnterpriseDashboard;
export const getVisibleEnterprisePillars = getVisibleEnterpriseDashboards;
