import { dashboardGroups, type NavItem } from "../../lib/navigation-config";
import { canReadSectionForRole, type Role } from "../identity/access-policy";

export type EnterpriseDashboardId =
  | "organization"
  | "agriculture"
  | "business"
  | "bi-analytics"
  | "public-partnership"
  | "platform-core";

export type EnterpriseDashboard = {
  id: EnterpriseDashboardId;
  href: string;
  label: string;
  description: string;
  features: readonly NavItem[];
};

const legacyFeatures = new Map(
  dashboardGroups.flatMap((group) => group.items).map((item) => [item.id, item]),
);

function features(ids: readonly string[]): readonly NavItem[] {
  return ids.map((id) => {
    const item = legacyFeatures.get(id);
    if (!item) throw new Error(`Enterprise feature "${id}" has no legacy route definition.`);
    return item;
  });
}

/**
 * Canonical six-application architecture.
 * Existing feature routes remain unchanged; this registry only groups them into
 * the six application workspaces and preserves role-based visibility.
 */
export const enterpriseDashboards: readonly EnterpriseDashboard[] = [
  {
    id: "platform-core",
    href: "/dashboard/platform-core",
    label: "Platform Core",
    description: "Administrasi platform, surat, arsip, akun, hak akses, notifikasi, dan konfigurasi.",
    features: features(["notifikasi", "surat", "kelembagaan", "dokumen", "akun", "akun-saya", "pengaturan", "panduan"]),
  },
  {
    id: "organization",
    href: "/dashboard/organization",
    label: "Organization Management",
    description: "Identitas kelompok, keanggotaan, tata kelola, program, dan aktivitas organisasi.",
    features: features(["portal", "anggota", "pengurus", "musyawarah", "persetujuan", "program", "kegiatan", "kehadiran", "pengajuan", "enterprise"]),
  },
  {
    id: "agriculture",
    href: "/dashboard/pertanian",
    label: "Agriculture Management",
    description: "Data lahan, komoditas, siklus budidaya, produksi, panen, dan tindak lanjut pertanian.",
    features: features(["pertanian", "laporan_program", "tindaklanjut", "lotkopi"]),
  },
  {
    id: "business",
    href: "/dashboard/business",
    label: "Business & Enterprise",
    description: "Kegiatan usaha, katalog, pesanan, transaksi, pembukuan, kas, dan aset produktif.",
    features: features(["usaha", "penjualan", "kas", "akuntansi", "aset", "laporan"]),
  },
  {
    id: "bi-analytics",
    href: "/dashboard/bi-analytics",
    label: "BI & Analytics",
    description: "Indikator kinerja, laporan lintas bidang, pemeriksaan kualitas data, dan monitoring.",
    features: features(["transkripsi", "register", "sumber"]),
  },
  {
    id: "public-partnership",
    href: "/dashboard/public-partnership",
    label: "Public & Partnership",
    description: "Publikasi, komunikasi, kemitraan, akses pemerintah, dan kolaborasi eksternal.",
    features: features(["publikasi", "galeri", "pesan", "kemitraan", "akses-eksternal"]),
  },
];

export const enterpriseUtilities: readonly NavItem[] = [
  { id: "monitoring", label: "Status Sistem", description: "Status layanan dan kelengkapan data.", href: "/dashboard/monitoring" },
];

export const dashboardRouteIds = enterpriseDashboards
  .filter((dashboard) => dashboard.id !== "agriculture")
  .map((dashboard) => dashboard.id);

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
export function getVisibleEnterpriseDashboards(role: Role) {
  return enterpriseDashboards.map((dashboard) => ({
    ...dashboard,
    features: dashboard.features.filter((feature) => canReadSectionForRole(role, feature.id)),
  })).filter((dashboard) => dashboard.features.length > 0);
}
export function getVisibleEnterpriseUtilities(role: Role) {
  return enterpriseUtilities.filter((item) => canReadSectionForRole(role, item.id));
}
export type EnterprisePillarId = EnterpriseDashboardId;
export type EnterprisePillar = EnterpriseDashboard;
export const enterprisePillars = enterpriseDashboards;
export const getEnterprisePillar = getEnterpriseDashboard;
export const getVisibleEnterprisePillars = getVisibleEnterpriseDashboards;
