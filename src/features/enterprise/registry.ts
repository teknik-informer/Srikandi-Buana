import { dashboardGroups, type NavItem } from "../../lib/navigation-config";
import { canReadSectionForRole, isModuleAvailableForUser, isSectionModuleAvailableForUser, type Principal, type Role } from "../identity/access-policy";

export type EnterpriseDashboardId = "hrm" | "accounting" | "crm" | "projects" | "pos" | "analytics";
export type EnterpriseDashboard = {
  id: EnterpriseDashboardId;
  href: string;
  label: string;
  description: string;
  features: readonly NavItem[];
  /** True only when a System Administrator is viewing the registered module catalog without operational data access. */
  catalogOnly?: boolean;
  /** The account may open the module shell, but no business feature permission is inherited. */
  accessOnly?: boolean;
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
 * Six integrated application workspaces. Existing operational routes remain the
 * source of truth while each application gets its own landing/dashboard route.
 */
export const enterpriseDashboards: readonly EnterpriseDashboard[] = [
  {
    id: "hrm",
    href: "/dashboard/hrm",
    label: "HRM · SDM & Keanggotaan",
    description: "Keanggotaan, struktur, presensi, profil, dan administrasi sumber daya manusia.",
    features: features(["anggota", "pengurus", "musyawarah", "persetujuan", "presensi", "presensi-saya", "portal", "akun-saya", "akun", "pengaturan"]),
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
    features: features(["kemitraan", "pesan", "akses-eksternal", "publikasi", "galeri", "notifikasi"]),
  },
  {
    id: "projects",
    href: "/dashboard/projects",
    label: "Project Management · Program",
    description: "Program kerja, kegiatan, penugasan, tindak lanjut, pertanian, dan dokumen proyek.",
    features: features(["program", "pertanian", "laporan_program", "tindaklanjut", "kegiatan", "usaha", "alsintan", "kehadiran", "surat-resmi", "surat", "sumber", "kelembagaan", "register", "transkripsi", "survei", "dokumen", "pengajuan", "enterprise", "panduan"]),
  },
  {
    id: "pos",
    href: "/dashboard/pos",
    label: "POS · Penjualan",
    description: "Katalog produk, pemesanan, penerimaan komoditas, dan pengelolaan transaksi.",
    features: features(["penjualan", "lotkopi"]),
  },
  {
    id: "analytics",
    href: "/dashboard/analytics",
    label: "BI & Analitik",
    description: "Indikator kinerja, tren kegiatan, distribusi data, dan kualitas informasi berdasarkan kewenangan pengguna.",
    features: [{ id: "analytics", label: "Dashboard BI & Analitik", description: "Analisis ringkasan, tren, dan kualitas data organisasi sesuai lingkup akses.", href: "/dashboard/analytics" }],
  },
];

export const enterpriseUtilities: readonly NavItem[] = [
  { id: "monitoring", label: "Status Sistem", description: "Status layanan dan kelengkapan data.", href: "/dashboard/monitoring" },
  { id: "module-center", label: "Pusat Modul", description: "Registri aplikasi, kesiapan domain, kepemilikan data dan matriks akses.", href: "/dashboard/module-center" },
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

/**
 * Normal navigation stays permission-filtered. When includeCatalog is explicitly
 * enabled for a System Administrator, registered modules with no operational
 * permissions are returned as catalogOnly metadata; this never grants record access.
 */
export function getVisibleEnterpriseDashboards(role: Role, fullAccess = false, includeCatalog = false) {
  if (fullAccess) {
    return enterpriseDashboards.map((dashboard) => ({
      ...dashboard,
      features: dashboard.features.filter((feature) => feature.id !== "kehadiran"),
      catalogOnly: false,
    }));
  }
  return enterpriseDashboards
    .map((dashboard) => {
      const visibleFeatures = dashboard.features.filter((feature) => feature.id !== "kehadiran" && canReadSectionForRole(role, feature.id));
      return {
        ...dashboard,
        features: visibleFeatures,
        catalogOnly: includeCatalog && role === "admin",
      };
    })
    .filter((dashboard) => dashboard.features.length > 0 || (includeCatalog && role === "admin"));
}

/**
 * Resolve the launch catalog for an authenticated principal.
 * Explicit module grants affect the application shell only; feature links continue
 * to be derived from the immutable role policy and record/API authorization.
 */
export function getVisibleEnterpriseDashboardsForUser(
  user: Principal,
  fullAccess = false,
  includeCatalog = false,
) {
  return enterpriseDashboards
    .map((dashboard) => {
      const moduleAvailable = isModuleAvailableForUser(user, dashboard.id);
      const features = dashboard.features.filter((feature) =>
        feature.id !== "kehadiran"
        && moduleAvailable
        && isSectionModuleAvailableForUser(user, feature.id)
        && (fullAccess || canReadSectionForRole(user.role, feature.id)),
      );
      const catalogOnly = includeCatalog && user.role === "admin" && !fullAccess;
      const accessOnly = !catalogOnly
        && features.length === 0
        && moduleAvailable
        && user.moduleAccess?.allowedModules.includes(dashboard.id) === true;
      return { ...dashboard, features, catalogOnly, accessOnly };
    })
    .filter((dashboard) =>
      dashboard.features.length > 0 || dashboard.accessOnly || dashboard.catalogOnly,
    );
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
