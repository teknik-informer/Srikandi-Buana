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
    description: "Layanan anggota, portal pribadi, dan notifikasi lintas bagian.",
    features: features(["portal", "notifikasi"]),
  },
  {
    id: "management",
    href: "/dashboard/management",
    label: "Manajemen",
    description: "Program, agenda, rapat, tugas, tindak lanjut, dan pelaksanaan kegiatan.",
    features: features([
      "program", "laporan_program", "tindaklanjut", "kegiatan", "kehadiran",
      "musyawarah", "pengajuan", "enterprise",
    ]),
  },
  {
    id: "administration",
    href: "/dashboard/administration",
    label: "Administrasi",
    description: "Keanggotaan, pengurus, surat, persetujuan, register, dan arsip resmi.",
    features: features([
      "anggota", "pengurus", "persetujuan", "surat", "register",
      "sumber", "kelembagaan", "transkripsi", "dokumen",
    ]),
  },
  {
    id: "finance",
    href: "/dashboard/finance",
    label: "Keuangan",
    description: "Buku kas, akuntansi, aset organisasi, dan kontrol transaksi.",
    features: features(["kas", "akuntansi", "aset"]),
  },
  {
    id: "commerce",
    href: "/dashboard/commerce",
    label: "E-Commerce & Rantai Pasok",
    description: "Produk, pemesanan, stok, penerimaan kopi, usaha, dan kemitraan.",
    features: features(["penjualan", "lotkopi", "usaha", "kemitraan"]),
  },
  {
    id: "publication",
    href: "/dashboard/publication",
    label: "Publikasi & Komunikasi",
    description: "Konten publik, dokumentasi, galeri, dan pesan masuk.",
    features: features(["publikasi", "galeri", "pesan"]),
  },
  {
    id: "system",
    href: "/dashboard/system",
    label: "Sistem",
    description: "Pengguna, hak akses, keamanan akun, profil, dan pengaturan aplikasi.",
    features: features(["akun", "akun-saya", "pengaturan"]),
  },
];

/** Utilities are cross-workspace operational views, not additional dashboards. */
export const enterpriseUtilities: readonly NavItem[] = [
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Pantau kesiapan layanan, kualitas data, tugas terlambat, dan aktivitas sesuai hak akses.",
    href: "/dashboard/monitoring",
  },
  {
    id: "laporan",
    label: "Laporan",
    description: "Laporan lintas bidang dengan angka yang berasal dari catatan aktual.",
    href: "/dashboard/laporan",
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
