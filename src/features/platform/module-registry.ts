import { enterpriseDashboards, type EnterpriseDashboardId } from "../enterprise/registry";
import { canReadSectionForRole, roles, type Role } from "../identity/access-policy";

export type ModuleReadiness = "partial" | "preview" | "foundation" | "planned";
export type PlatformModuleDefinition = {
  id: string;
  name: string;
  category: "application" | "support" | "platform";
  readiness: ModuleReadiness;
  route: string | null;
  owner: string;
  sourceFootprint: string;
  implemented: string;
  limitation: string;
  permissionSections: readonly string[];
};

const permissionSections: Record<EnterpriseDashboardId, readonly string[]> = {
  hrm: ["anggota", "pengurus", "musyawarah", "persetujuan", "presensi", "presensi-saya"],
  accounting: ["kas", "akuntansi", "aset", "laporan"],
  crm: ["kemitraan", "pesan", "akses-eksternal", "publikasi", "galeri"],
  projects: ["program", "laporan_program", "tindaklanjut", "kegiatan", "pertanian", "surat", "surat-resmi", "dokumen", "pengajuan", "survei", "alsintan", "kelembagaan", "register", "transkripsi"],
  pos: ["penjualan", "lotkopi"],
  analytics: ["analytics"],
};

const appReadiness: Record<EnterpriseDashboardId, Omit<PlatformModuleDefinition, "id" | "name" | "category" | "route" | "permissionSections">> = {
  hrm: {
    readiness: "partial",
    owner: "HRM / Keanggotaan",
    sourceFootprint: "public.records (anggota, pengurus, rapat, persetujuan) dan workspace_v14.member_profiles, organization_memberships, organization_units, activity_attendance",
    implemented: "Buku anggota, struktur, presensi, akun anggota dan sejumlah administrasi.",
    limitation: "Payroll dan evaluasi SDM lanjutan belum menjadi proses operasional.",
  },
  accounting: {
    readiness: "partial",
    owner: "Accounting",
    sourceFootprint: "public.records (kas), ledger_accounts, ledger_entries, ledger_lines, ledger_reversals, finance_bank_reconciliations; workspace_v14.funds dan budget_allocations",
    implemented: "Buku kas, akun perkiraan, jurnal dan sebagian kontrol pencatatan.",
    limitation: "Penutupan periode, rekonsiliasi penuh dan seluruh laporan akuntansi masih memerlukan penyelesaian serta UAT.",
  },
  crm: {
    readiness: "partial",
    owner: "CRM / Relasi Eksternal",
    sourceFootprint: "workspace_v14.partner_organizations, partner_interactions; public.external_organizations dan external-access tables",
    implemented: "Pencatatan kemitraan, organisasi eksternal, publikasi, galeri dan akses eksternal terbatas.",
    limitation: "Pipeline peluang dan riwayat komunikasi CRM terpadu belum lengkap.",
  },
  projects: {
    readiness: "partial",
    owner: "Project Management",
    sourceFootprint: "workspace_v14.programmes, programme_enrolments, activities, tasks; sebagian administrasi masih berada di public.records",
    implemented: "Program, kegiatan, tugas/tindak lanjut, rapat, dokumen dan catatan pertanian.",
    limitation: "Portofolio proyek, milestone, dependensi tugas dan integrasi anggaran lintas domain belum lengkap.",
  },
  pos: {
    readiness: "partial",
    owner: "POS / Commerce",
    sourceFootprint: "public.commerce_products, commerce_orders, commerce_order_events, commerce_sales_invoices, commerce_sales_invoice_receipts dan commerce_stock_history",
    implemented: "Katalog produk, pemesanan dan sebagian alur transaksi commerce.",
    limitation: "Pembayaran/settlement, retur dan integrasi stok serta jurnal belum seluruhnya melewati UAT end-to-end.",
  },
  analytics: {
    readiness: "preview",
    owner: "BI & Analitik",
    sourceFootprint: "Agregasi read-only dari /api/records dan sumber data yang lolos policy akses; belum ada database analytics khusus.",
    implemented: "KPI berbasis catatan terbaca, tren enam bulan, distribusi domain dan temuan kualitas data pada Preview.",
    limitation: "Belum menjadi data warehouse; belum seluruh domain/tabel memiliki definisi indikator, freshness dan proyeksi tersendiri.",
  },
};

export const coreApplicationModules: readonly PlatformModuleDefinition[] = enterpriseDashboards.map((dashboard) => ({
  id: dashboard.id,
  name: dashboard.label,
  category: "application",
  route: dashboard.href,
  permissionSections: permissionSections[dashboard.id],
  ...appReadiness[dashboard.id],
}));

export const supportingPlatformModules: readonly PlatformModuleDefinition[] = [
  {
    id: "agriculture",
    name: "Agriculture Management",
    category: "support",
    readiness: "partial",
    route: "/dashboard/pertanian",
    owner: "Agriculture",
    sourceFootprint: "public.agriculture_commodities, farm_parcels, crop_cycles, harvest_records, supply_lots; workspace_v14.farm_plots",
    implemented: "Pengelolaan lahan, komoditas, siklus tanam dan pencatatan hasil tersedia pada ruang kerja pertanian.",
    limitation: "Hubungan penerimaan panen ke persediaan serta ketertelusuran ujung-ke-ujung perlu direkonsiliasi.",
    permissionSections: ["pertanian"],
  },
  {
    id: "inventory",
    name: "Inventory & Procurement",
    category: "support",
    readiness: "foundation",
    route: null,
    owner: "Inventory & Procurement",
    sourceFootprint: "workspace_v14.inventory_items, inventory_locations, stocktakes, transfers, procurement_requests; public.stock movements dan commerce_stock_history",
    implemented: "Fondasi tabel persediaan, transfer, stocktake dan permintaan pengadaan tersedia.",
    limitation: "Satu ledger stok kanonis dan ruang kerja end-to-end belum ditetapkan; jangan menganggap tabel sebagai proses siap pakai.",
    permissionSections: ["aset", "alsintan"],
  },
  {
    id: "documents",
    name: "Document Management",
    category: "support",
    readiness: "partial",
    route: "/dashboard/dokumen",
    owner: "Documents",
    sourceFootprint: "public.files, file_objects; workspace_v14.documents dan referensi dokumen di public.records",
    implemented: "Arsip berkas, metadata dokumen, register surat dan beberapa generator dokumen telah tersedia.",
    limitation: "Versi dokumen, siklus persetujuan dan repository lintas domain belum disatukan sepenuhnya.",
    permissionSections: ["dokumen", "surat", "surat-resmi", "register"],
  },
  {
    id: "collaboration",
    name: "Collaboration & Communication",
    category: "support",
    readiness: "foundation",
    route: null,
    owner: "Platform Collaboration",
    sourceFootprint: "public.messages, ecosystem_notifications, public.audit dan jadwal kegiatan pada records",
    implemented: "Pesan pengunjung, notifikasi dan agenda kegiatan tersedia sebagai layanan terpisah.",
    limitation: "Belum ada ruang kerja tim bersama, percakapan internal lintas modul dan kalender terpadu.",
    permissionSections: ["pesan", "notifikasi", "kegiatan"],
  },
  {
    id: "mel",
    name: "Monitoring, Evaluation & Learning",
    category: "support",
    readiness: "foundation",
    route: null,
    owner: "MEL",
    sourceFootprint: "workspace_v14.impact_indicators, indicator_observations, evidence_links dan quality_observations",
    implemented: "Fondasi indikator, observasi dan referensi bukti tersedia dalam skema domain.",
    limitation: "Definisi indikator, baseline, target, verifikasi dan dashboard MEL belum lengkap untuk seluruh program.",
    permissionSections: ["laporan_program", "program"],
  },
  {
    id: "cms",
    name: "Public Website CMS",
    category: "support",
    readiness: "partial",
    route: "/dashboard/publikasi",
    owner: "Content & Publication",
    sourceFootprint: "public.settings, public.records (publikasi/galeri), public.files",
    implemented: "Pengaturan situs, publikasi dan galeri terhubung dengan website publik.",
    limitation: "CMS penuh dengan versi konten, workflow editorial dan model konten terstruktur belum dipisahkan sebagai domain.",
    permissionSections: ["publikasi", "galeri"],
  },
  {
    id: "system-admin",
    name: "System Administration",
    category: "platform",
    readiness: "foundation",
    route: "/dashboard/module-center",
    owner: "Platform Core",
    sourceFootprint: "public.users, sessions, account_invitations, access_audit, login_attempts, settings dan schema_migrations",
    implemented: "Autentikasi, sesi, role organisasi, akun struktural dan audit akses berjalan pada layanan yang ada.",
    limitation: "Registri modul dan hak akses per modul belum mempunyai tabel persisten tersendiri. Pusat Modul pada tahap ini bersifat diagnostik/read-only.",
    permissionSections: ["module-center"],
  },
];

export const platformReadinessLabels: Record<ModuleReadiness, string> = {
  partial: "Parsial",
  preview: "Preview",
  foundation: "Fondasi",
  planned: "Direncanakan",
};

const roleOrder: Role[] = ["ketua", "sekretaris", "bendahara", "koordinator", "anggota", "admin"];

export function buildModuleAccessMatrix() {
  return coreApplicationModules.map((module) => ({
    moduleId: module.id,
    moduleName: module.name,
    access: roleOrder.map((role) => ({
      role,
      roleLabel: roles[role],
      // Technical administrators see the catalog only. They never inherit business access.
      allowed: role !== "admin" && module.permissionSections.some((section) => canReadSectionForRole(role, section)),
      catalogOnly: role === "admin",
    })),
  }));
}

export function canReadPlatformModuleCenter(role: Role): boolean {
  return role === "admin" && canReadSectionForRole(role, "module-center");
}
