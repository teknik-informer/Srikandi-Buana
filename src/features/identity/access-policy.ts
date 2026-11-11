/**
 * Server-side organization access policy.
 *
 * "admin" is the protected technical owner / Developer account and "ketua" is
 * the elected Chair. Both have Super Admin access to the workspace. Business
 * approvals that carry organizational authority remain reserved to the Chair.
 */
export const roles = {
  admin: "Administrator Sistem",
  ketua: "Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  koordinator: "Koordinator Bidang",
  anggota: "Anggota",
} as const;

export type Role = keyof typeof roles;
export type Principal = {
  accountId: string;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  fullName: string;
  role: Role;
  memberId: string | null;
  position: string;
  programIds: string[];
};
export type AccessRecord = { id: string; kind: string; data: Record<string, unknown> };

const isSuperAdmin = (role: Role) => role === "admin" || role === "ketua";
export const canFinalApprove = (role: Role) => role === "ketua";

const secretariatWrite = [
  "anggota", "pengurus", "musyawarah", "persetujuan", "kegiatan",
  "kehadiran", "kelembagaan", "register", "transkripsi", "surat",
  "alsintan", "publikasi", "galeri",
];
const secretariatReadOnly = [
  "kas", "aset", "akuntansi", "program", "pertanian",
  "laporan_program", "tindaklanjut", "dokumen", "kemitraan", "usaha",
];
const financeWrite = ["kas", "aset"];
const financeReadOnly = [
  ...secretariatWrite,
  ...secretariatReadOnly,
  "lotkopi",
];
const coordinationWrite = ["program", "kegiatan", "tindaklanjut", "laporan_program"];

export function canReadKindForRole(role: Role, kind: string): boolean {
  if (isSuperAdmin(role)) return true;
  if (role === "sekretaris") return secretariatWrite.includes(kind) || secretariatReadOnly.includes(kind);
  if (role === "bendahara") return financeWrite.includes(kind) || financeReadOnly.includes(kind);
  if (role === "koordinator") return coordinationWrite.includes(kind);
  return kind === "anggota" || kind === "kegiatan";
}

export function canReadKind(user: Principal, kind: string): boolean {
  return canReadKindForRole(user.role, kind);
}

export function canWriteKind(user: Principal, kind: string): boolean {
  if (isSuperAdmin(user.role)) return true;
  if (user.role === "sekretaris") return secretariatWrite.includes(kind);
  if (user.role === "bendahara") return financeWrite.includes(kind);
  if (user.role === "koordinator") return coordinationWrite.includes(kind);
  return false;
}

export function canReadRecord(user: Principal, record: AccessRecord): boolean {
  if (!canReadKind(user, record.kind)) return false;
  if (user.role === "anggota") {
    return record.kind === "anggota"
      ? record.id === user.memberId
      : record.kind === "kegiatan" && ["Direncanakan", "Berjalan", "Selesai"].includes(String(record.data.status));
  }
  if (user.role === "koordinator") {
    return user.programIds.includes(String(record.data.programId));
  }
  return true;
}

export function canWriteRecord(user: Principal, record: AccessRecord): boolean {
  if (["publikasi", "galeri"].includes(record.kind) && record.data.status === "Terbit") {
    return canFinalApprove(user.role);
  }
  if (isSuperAdmin(user.role)) return true;
  if (user.role === "sekretaris") {
    return secretariatWrite.includes(record.kind) &&
      !(["publikasi", "galeri"].includes(record.kind) && record.data.status === "Terbit");
  }
  if (user.role === "bendahara") return financeWrite.includes(record.kind);
  if (user.role === "koordinator") {
    if (!coordinationWrite.includes(record.kind) || !user.programIds.includes(String(record.data.programId))) return false;
    if (record.kind === "program") return record.data.status === "Rancangan";
    if (record.kind === "kegiatan") return ["Perlu verifikasi", "Direncanakan", "Berjalan"].includes(String(record.data.status));
    if (record.kind === "tindaklanjut") {
      return record.data.status !== "Selesai" && record.data.verification !== "Terverifikasi";
    }
    if (record.kind === "laporan_program") return record.data.status !== "Selesai";
  }
  return false;
}

export function visibleRecord(user: Principal, record: AccessRecord): AccessRecord {
  if (user.role === "anggota") {
    const keys = record.kind === "anggota"
      ? ["name", "dusun", "phone", "role", "status", "verification"]
      : ["name", "date", "location", "status"];
    return { ...record, data: Object.fromEntries(keys.filter((key) => key in record.data).map((key) => [key, record.data[key]])) };
  }
  if (user.role === "bendahara" && record.kind === "anggota") {
    const keys = ["name", "role", "status", "verification"];
    return { ...record, data: Object.fromEntries(keys.filter((key) => key in record.data).map((key) => [key, record.data[key]])) };
  }
  if (user.role === "bendahara" && record.kind === "persetujuan") {
    const keys = ["date", "status", "photo"];
    return { ...record, data: Object.fromEntries(keys.filter((key) => key in record.data).map((key) => [key, record.data[key]])) };
  }
  return record;
}

export function canReadSectionForRole(role: Role, id: string): boolean {
  if (isSuperAdmin(role)) return true;
  if (["notifikasi", "penjualan"].includes(id)) return true;
  if (id === "akuntansi") return ["sekretaris", "bendahara"].includes(role);
  if (id === "pertanian") return ["sekretaris", "bendahara", "koordinator"].includes(role);
  if (["ringkasan", "akun-saya", "portal", "pengajuan", "monitoring"].includes(id)) return true;
  if (id === "enterprise") return ["sekretaris", "bendahara"].includes(role);
  if (id === "dokumen") return ["sekretaris", "bendahara", "koordinator"].includes(role);
  if (["sumber", "panduan", "pesan", "pengaturan", "akun", "akses-eksternal"].includes(id)) return false;
  if (id === "laporan") return ["sekretaris", "bendahara"].includes(role);
  return canReadKindForRole(role, id);
}

export function canReadSection(user: Principal, id: string): boolean {
  return canReadSectionForRole(user.role, id);
}
