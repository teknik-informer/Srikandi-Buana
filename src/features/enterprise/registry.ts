import { dashboardGroups, type NavItem } from "../../lib/navigation-config";
import { canReadSectionForRole, type Role } from "../identity/access-policy";

export type EnterpriseDashboardId =
  | "ecosystem"
  | "management"
  | "administration"
  | "finance"
  | "commerce"
  | "publication"
  | "system";

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
  const resolved = ids.map((id) => {
    const item = legacyFeatures.get(id);
    if (!item) throw new Error(`Enterprise feature "${id}" has no legacy route definition.`);
    return item;
  });
  return resolved;
}

/**
 * Seven role-aware dashboards over the existing shared business domains.
 * This registry only reorganizes navigation. Existing route IDs and URLs stay
 * stable, while API handlers remain the security boundary for records and data.
 */
export const enterpriseDashboards: readonly EnterpriseDashboard[] = [
  {
    id: "ecosystem",
    href: "/dashboard/ecosystem",
    label: "Ekosistem",
    description: "Pintu masuk layanan lintas unit, portal anggota, dan pemberitahuan akun.",
    features: features(["portal", "notifikasi"]),
  },
  {
    id: "management",
    href: "/dashboard/management",
    label: "Manajemen",
    description: "Perencanaan program, penugasan, agenda, rapat, dan persetujuan operasional.",
    features: features([
      "program", "laporan_program", "tindaklanjut", "kegiatan", "kehadiran", "musyawarah",
      "pengajuan", "enterprise",
    ]),
  },
  {
    id: "administration",
    href: "/dashboard/administration",
    label: "Administrasi",
    description: "Data keanggotaan, tata kelola, persetujuan data, register, dan arsip resmi.",
    features: features([
      "anggota", "pengurus", "persetujuan", "register", "surat",
      "sumber", "kelembagaan", "transkripsi", "dokumen",
    ]),
  },
  {
    id: "finance",
    href: "/dashboard/finance",
    label: "Keuangan",
    description: "Buku kas, akuntansi, serta pengelolaan aset organisasi.",
    features: features(["kas", "akuntansi", "aset"]),
  },
  {
    id: "commerce",
    href: "/dashboard/commerce",
    label: "E-Commerce",
    description: "Katalog, pemesanan, penerimaan kopi, usaha, dan kemitraan.",
    features: features(["penjualan", "lotkopi", "usaha", "kemitraan"]),
  },
  {
    id: "publication",
    href: "/dashboard/publication",
    label: "Publikasi",
    description: "Pengelolaan konten publik, galeri dokumentasi, dan pesan masuk.",
    features: features(["publikasi", "galeri", "pesan"]),
  },
  {
    id: "system",
    href: "/dashboard/system",
    label: "Sistem",
    description: "Akun pengguna, hak akses, profil pribadi, konfigurasi, dan bantuan.",
    features: features(["akun", "akun-saya", "pengaturan", "panduan"]),
  },
];

/**
 * Frequently used workspace destinations that sit beside the seven work areas.
 * These are shortcuts, not additional dashboards.
 */
export const enterpriseUtilities: readonly NavItem[] = [
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Pantau kesiapan API/database, operasional, kualitas data, dan aktivitas lintas bagian sesuai hak akses.",
    href: "/dashboard/monitoring",
  },
  {
    id: "laporan",
    label: "Laporan",
    description: "Lihat laporan operasional, keanggotaan, administrasi, usaha, publikasi, dan keuangan sesuai hak akses.",
    href: "/dashboard/laporan",
  },
  {
    id: "pengembangan",
    label: "Template & Pengembangan",
    description: "Lihat template operasional yang disiapkan dan peta modul yang akan dikembangkan.",
    href: "/dashboard/pengembangan",
  },
];

export const dashboardRouteIds = enterpriseDashboards.map((dashboard) => dashboard.id);

export const dashboardSectionIds = [
  ...enterpriseDashboards.flatMap((dashboard) =>
    dashboard.features.map((feature) => feature.id),
  ),
  ...enterpriseUtilities.map((feature) => feature.id),
];

export function getEnterpriseDashboardById(id: string): EnterpriseDashboard | undefined {
  return enterpriseDashboards.find((dashboard) => dashboard.id === id);
}

export function getEnterpriseDashboard(sectionId: string): EnterpriseDashboard | undefined {
  return enterpriseDashboards.find((dashboard) =>
    dashboard.features.some((feature) => feature.id === sectionId),
  );
}

export function getEnterpriseFeature(sectionId: string): NavItem | undefined {
  return getEnterpriseDashboard(sectionId)?.features.find((feature) => feature.id === sectionId)
    ?? enterpriseUtilities.find((feature) => feature.id === sectionId);
}

/** Navigation projection only. API and record guards remain the security boundary. */
export function getVisibleEnterpriseDashboards(role: Role) {
  return enterpriseDashboards
    .map((dashboard) => ({
      ...dashboard,
      features: dashboard.features.filter((feature) =>
        canReadSectionForRole(role, feature.id),
      ),
    }))
    .filter((dashboard) => dashboard.features.length > 0);
}

/** Frequently used destinations filtered by the same role policy as routes. */
export function getVisibleEnterpriseUtilities(role: Role) {
  return enterpriseUtilities.filter((item) =>
    canReadSectionForRole(role, item.id),
  );
}

/**
 * Backward-compatible aliases for components or integrations that still use
 * the previous "pillar" terminology. New code should use dashboard names.
 */
export type EnterprisePillarId = EnterpriseDashboardId;
export type EnterprisePillar = EnterpriseDashboard;
export const enterprisePillars = enterpriseDashboards;
export const getEnterprisePillar = getEnterpriseDashboard;
export const getVisibleEnterprisePillars = getVisibleEnterpriseDashboards;
