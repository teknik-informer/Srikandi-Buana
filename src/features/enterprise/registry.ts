import { dashboardGroups, type NavItem } from "../../lib/navigation-config";
import { canReadSectionForRole, type Role } from "../identity/access-policy";

export type EnterprisePillarId =
  | "ecosystem"
  | "management"
  | "administration"
  | "commerce"
  | "public-support";

export type EnterprisePillar = {
  id: EnterprisePillarId;
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
 * Five experience pillars over shared business domains.
 *
 * This registry groups existing routes; it does not claim that every workflow
 * behind a route is production-complete. Server handlers remain responsible
 * for authentication, record ownership, and row-level authorization.
 */
export const enterprisePillars: readonly EnterprisePillar[] = [
  {
    id: "ecosystem",
    label: "Ekosistem",
    description: "Kolaborasi lintas unit, layanan anggota, pengajuan, dan alur notifikasi.",
    features: features(["portal", "pengajuan", "enterprise", "notifikasi"]),
  },
  {
    id: "management",
    label: "Manajemen",
    description: "Perencanaan program, pengendalian kegiatan, keuangan, dan kinerja.",
    features: features([
      "program", "tindaklanjut", "kegiatan", "kehadiran", "kas", "laporan",
      "usaha", "aset", "lotkopi", "kemitraan", "akuntansi",
    ]),
  },
  {
    id: "administration",
    label: "Administrasi",
    description: "Keanggotaan, tata kelola, dokumen, pengguna, dan konfigurasi.",
    features: features([
      "anggota", "pengurus", "musyawarah", "persetujuan", "sumber",
      "kelembagaan", "register", "transkripsi", "dokumen", "akun",
      "akun-saya", "pengaturan",
    ]),
  },
  {
    id: "commerce",
    label: "E-Commerce",
    description: "Katalog, persediaan, pemesanan, dan transaksi perdagangan.",
    features: features(["penjualan"]),
  },
  {
    id: "public-support",
    label: "Layanan Publik & Informasi",
    description: "Konten publik, galeri, komunikasi, dan panduan layanan.",
    features: features(["publikasi", "galeri", "pesan", "panduan"]),
  },
];

export const dashboardSectionIds = enterprisePillars.flatMap((pillar) =>
  pillar.features.map((feature) => feature.id),
);

export function getEnterprisePillar(sectionId: string): EnterprisePillar | undefined {
  return enterprisePillars.find((pillar) =>
    pillar.features.some((feature) => feature.id === sectionId),
  );
}

export function getEnterpriseFeature(sectionId: string): NavItem | undefined {
  return getEnterprisePillar(sectionId)?.features.find((feature) => feature.id === sectionId);
}

/** Navigation projection only. API and record guards remain the security boundary. */
export function getVisibleEnterprisePillars(role: Role) {
  return enterprisePillars
    .map((pillar) => ({
      ...pillar,
      features: pillar.features.filter((feature) =>
        canReadSectionForRole(role, feature.id),
      ),
    }))
    .filter((pillar) => pillar.features.length > 0);
}
