import { dashboardGroups, type NavItem } from "../../lib/navigation-config";
import { canReadSectionForRole, type Role } from "../identity/access-policy";

export type EnterpriseDashboardId = "ecosystem" | "management" | "administration" | "finance" | "commerce" | "publication" | "system";
export type EnterpriseDashboard = { id: EnterpriseDashboardId; href: string; label: string; description: string; features: readonly NavItem[] };

const legacyFeatures = new Map(dashboardGroups.flatMap((group) => group.items).map((item) => [item.id, item]));

function features(ids: readonly string[]): readonly NavItem[] {
  return ids.map((id) => {
    const item = legacyFeatures.get(id);
    if (!item) throw new Error(`Enterprise feature "${id}" has no legacy route definition.`);
    return item;
  });
}

/** Four clear work areas. Existing feature routes and API permission checks remain unchanged. */
export const enterpriseDashboards: readonly EnterpriseDashboard[] = [
  {
    id: "ecosystem",
    href: "/dashboard/ecosystem",
    label: "Beranda & Organisasi",
    description: "Ringkasan, anggota, pengurus, program, kegiatan, dan dokumen organisasi.",
    features: features(["portal", "notifikasi", "program", "laporan_program", "tindaklanjut", "kegiatan", "kehadiran", "musyawarah", "pengajuan", "enterprise", "anggota", "pengurus", "persetujuan", "surat", "register", "sumber", "kelembagaan", "transkripsi", "dokumen"]),
  },
  {
    id: "publication",
    href: "/dashboard/publication",
    label: "Publikasi",
    description: "Berita, pengumuman, dokumentasi kegiatan, galeri, dan komunikasi publik.",
    features: features(["publikasi", "galeri", "pesan"]),
  },
  {
    id: "finance",
    href: "/dashboard/finance",
    label: "Laporan",
    description: "Laporan kegiatan, keuangan, aset, usaha, dan pertanggungjawaban.",
    features: features(["kas", "akuntansi", "aset", "penjualan", "lotkopi", "usaha", "kemitraan"]),
  },
  {
    id: "system",
    href: "/dashboard/system",
    label: "Administrasi",
    description: "Akun, hak akses, profil, dan pengaturan organisasi.",
    features: features(["akun", "akun-saya", "pengaturan"]),
  },
];

export const enterpriseUtilities: readonly NavItem[] = [
  { id: "laporan", label: "Pusat Laporan", description: "Laporan organisasi dan pertanggungjawaban.", href: "/dashboard/laporan" },
  { id: "monitoring", label: "Status Sistem", description: "Status layanan dan kelengkapan data.", href: "/dashboard/monitoring" },
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
