/**
 * Demo identity layer.
 *
 * This is a DEMO session mechanism for a self-contained showcase build — it is
 * the only permitted deviation, and it is explicitly labelled in the UI.
 * The blueprint (§16.2 / §13) requires production to keep the verified auth
 * provider and server-side authorization; swapping this module for a real
 * provider (Neon Auth / Auth.js / OIDC) must not require touching screens,
 * because every screen reads identity through this single module.
 */

import type { FieldAppStatus } from "@/config/fields";

export const SESSION_COOKIE = "sb_demo_session";

export interface DemoIdentity {
  memberId: string;
  name: string;
  role: string;
  scope: string;
  home: string;
  field?: string;
  permissions: string[];
  note: string;
}

export interface DemoAccount {
  key: string;
  email: string;
  password: string;
  label: string;
  description: string;
  identity: DemoIdentity;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "ketua",
    email: "ketua@demo.srikandibuana",
    password: "demo1234",
    label: "Ketua / Pengurus Harian",
    description: "Melihat lintas bidang, menyetujui pengajuan, membuka rapat & keputusan.",
    identity: {
      memberId: "M-001",
      name: "Sri Wulandari",
      role: "Ketua",
      scope: "Pengurus Harian",
      home: "/app/pengurus",
      permissions: ["*"],
      note: "Akses lintas bidang sesuai kewenangan pengurus.",
    },
  },
  {
    key: "bendahara",
    email: "bendahara@demo.srikandibuana",
    password: "demo1234",
    label: "Bendahara / Keuangan",
    description: "Mengelola COA, posting jurnal, kas/bank, anggaran, dan laporan native.",
    identity: {
      memberId: "M-003",
      name: "Titik Handayani",
      role: "Bendahara",
      scope: "Keuangan",
      home: "/app/keuangan",
      permissions: ["finance:*", "approval:read", "bidang:read"],
      note: "Finance Builder hanya boleh mengubah konfigurasi aman; invarian ledger dilindungi.",
    },
  },
  {
    key: "sekretaris",
    email: "sekretaris@demo.srikandibuana",
    password: "demo1234",
    label: "Sekretaris / Sekretariat",
    description: "Mengelola surat, notulen, agenda, dokumen, dan publikasi website.",
    identity: {
      memberId: "M-002",
      name: "Endang Puspitasari",
      role: "Sekretaris",
      scope: "Sekretariat",
      home: "/app/sekretariat",
      permissions: ["secretariat:*", "cms:publish", "documents:*"],
      note: "Publikasi website tetap melalui alur draft → review → publish.",
    },
  },
  {
    key: "pertanian",
    email: "pertanian@demo.srikandibuana",
    password: "demo1234",
    label: "Koordinator Bidang Pertanian",
    description: "Lahan, budidaya, panen, kunjungan lapangan, dan data produksi.",
    identity: {
      memberId: "M-004",
      name: "Warsiti",
      role: "Anggota Bidang Pertanian",
      scope: "Bidang Pertanian & Produksi",
      field: "pertanian",
      home: "/app/bidang/pertanian",
      permissions: ["field:pertanian:*", "approval:submit", "finance:request"],
      note: "Dapat mengajukan anggaran; posting jurnal tetap milik Keuangan.",
    },
  },
  {
    key: "pelatihan",
    email: "pelatihan@demo.srikandibuana",
    password: "demo1234",
    label: "Koordinator Bidang Pelatihan",
    description: "Rencana pelatihan, peserta, kehadiran, asesmen, dan evaluasi.",
    identity: {
      memberId: "M-005",
      name: "Rukmini",
      role: "Anggota Bidang Pelatihan",
      scope: "Bidang Pemberdayaan & Pelatihan",
      field: "pelatihan",
      home: "/app/bidang/pelatihan",
      permissions: ["field:pelatihan:*", "approval:submit", "finance:request"],
      note: "Pengajuan anggaran pelatihan berjalan melalui Workflow Builder.",
    },
  },
  {
    key: "usaha",
    email: "usaha@demo.srikandibuana",
    password: "demo1234",
    label: "Koordinator Bidang Usaha",
    description: "Katalog, HPP, stok, pesanan, mitra, dan kerja sama.",
    identity: {
      memberId: "M-006",
      name: "Dwi Lestari",
      role: "Anggota Bidang Usaha",
      scope: "Bidang Usaha & Kemitraan",
      field: "usaha",
      home: "/app/bidang/usaha",
      permissions: ["field:usaha:*", "catalog:publish", "approval:submit"],
      note: "Produk tayang di website hanya setelah dipublikasikan.",
    },
  },
  {
    key: "kasir",
    email: "kasir@demo.srikandibuana",
    password: "demo1234",
    label: "Kasir POS",
    description: "Transaksi kasir touch-first; dampak akuntansi lewat posting service.",
    identity: {
      memberId: "M-007",
      name: "Suyati",
      role: "Kasir POS",
      scope: "Penjualan",
      home: "/app/pos",
      permissions: ["pos:sell", "catalog:read"],
      note: "POS tidak pernah menulis jurnal langsung.",
    },
  },
  {
    key: "anggota",
    email: "anggota@demo.srikandibuana",
    password: "demo1234",
    label: "Anggota",
    description: "Profil, agenda, penugasan, komunitas, dan kontribusi.",
    identity: {
      memberId: "M-008",
      name: "Parmi",
      role: "Anggota",
      scope: "Portal Anggota",
      home: "/app/anggota",
      permissions: ["member:self"],
      note: "Hanya melihat data miliknya dan data yang dibagikan.",
    },
  },
];

export const ACCOUNT_BY_KEY = Object.fromEntries(DEMO_ACCOUNTS.map((a) => [a.key, a]));

export function can(identity: DemoIdentity, permission: string): boolean {
  if (identity.permissions.includes("*")) return true;
  return identity.permissions.some((p) => {
    if (p === permission) return true;
    if (p.endsWith(":*") && permission.startsWith(p.slice(0, -1))) return true;
    if (p.endsWith("*") && permission.startsWith(p.slice(0, -1))) return true;
    return false;
  });
}

export const FIELD_APP_STATUS_LABEL: Record<FieldAppStatus, string> = {
  disiapkan: "Disiapkan",
  diuji: "Diuji",
  aktif: "Aktif",
  ditangguhkan: "Ditangguhkan sementara",
};
