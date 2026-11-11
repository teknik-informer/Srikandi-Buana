/**
 * Organization governance access policy.
 *
 * "admin" is the protected technical/workspace owner account (developer/system
 * operator); "ketua" is the organization's final decision-maker. They are
 * deliberately separate identities so technical maintenance is not confused
 * with an organization's official approval.
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

const secretariatWrite = [
  "anggota", "pengurus", "musyawarah", "persetujuan", "kegiatan",
  "kehadiran", "kelembagaan", "register", "transkripsi", "surat",
  "alsintan", "publikasi", "galeri",
];
const secretariatReadOnly = [
  "kas", "aset", "akuntansi", "program", "pertanian",
  "laporan_program", "tindaklanjut",
];
const financeWrite = ["kas", "aset"];
const financeReadOnly = [
  ...secretariatWrite,
  ...secretariatReadOnly,
  "dokumen",
];
const coordinationWrite = ["program", "kegiatan", "tindaklanjut", "laporan_program"];

/** Role-level read permissions are shared by navigation and server guards. */
export function canReadKindForRole(role: Role, kind: string): boolean {
  if (role === "admin" || role === "ketua") return true;
  if (role === "sekretaris") return secretariatWrite.includes(kind) || secretariatReadOnly.includes(kind);
  if (role === "bendahara") return financeWrite.includes(kind) || financeReadOnly.includes(kind);
  if (role === "koordinator") return coordinationWrite.includes(kind);
  return kind === "anggota" || kind === "kegiatan";
}

export function canReadKind(user: Principal, kind: string): boolean {
  return canReadKindForRole(user.role, kind);
}

/** A write grant is deliberately narrower than a read grant. */
export function canWriteKind(user: Principal, kind: string): boolean {
  if (user.role === "admin") return true;
  if (user.role === "ketua") return kind === "tindaklanjut";
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

/**
 * Record-level write policy. Coordinators can work only within assigned
 * programs and cannot close programs/tasks or publish public content.
 * Secretariat drafts content; only the Chair or protected system admin can
 * move public content into the published state.
 */
export function canWriteRecord(user: Principal, record: AccessRecord): boolean {
  if (user.role === "admin") return true;

  if (user.role === "ketua") {
    return record.kind === "tindaklanjut" ||
      (["publikasi", "galeri"].includes(record.kind) && record.data.status === "Terbit");
  }

  if (user.role === "sekretaris") {
    if (!secretariatWrite.includes(record.kind)) return false;
    if (["publikasi", "galeri"].includes(record.kind)) return record.data.status !== "Terbit";
    return true;
  }

  if (user.role === "bendahara") {
    return financeWrite.includes(record.kind);
  }

  if (user.role === "koordinator") {
    if (!coordinationWrite.includes(record.kind) || !user.programIds.includes(String(record.data.programId))) return false;
    if (record.kind === "program") return record.data.status === "Rancangan";
    if (record.kind === "kegiatan") return ["Perlu verifikasi", "Direncanakan", "Berjalan"].includes(String(record.data.status));
    if (record.kind === "tindaklanjut") {
      return !["Selesai"].includes(String(record.data.status)) && record.data.verification !== "Terverifikasi";
    }
    if (record.kind === "laporan_program") return record.data.status !== "Selesai";
  }

  return false;
}

/**
 * Treasury has read-only visibility into administrative records. Member
 * contact, address, needs, and consent evidence are not part of that view.
 */
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

/** Route visibility only; record-level scope must still be enforced by handlers. */
export function canReadSectionForRole(role: Role, id: string): boolean {
  if (["notifikasi", "penjualan"].includes(id)) return true;
  if (id === "akuntansi") return ["admin", "ketua", "sekretaris", "bendahara"].includes(role);
  if (id === "pertanian") return ["admin", "ketua", "sekretaris", "bendahara", "koordinator"].includes(role);
  if (["ringkasan", "akun-saya", "portal", "pengajuan", "monitoring"].includes(id)) return true;
  if (role === "admin") return true;
  if (id === "enterprise") return ["ketua", "sekretaris", "bendahara"].includes(role);
  if (id === "dokumen") return ["sekretaris", "bendahara", "koordinator"].includes(role);
  if (id === "akun") return role === "ketua";
  if (["sumber", "panduan", "pesan", "pengaturan"].includes(id)) return false;
  if (id === "laporan") return ["admin", "ketua", "sekretaris", "bendahara"].includes(role);
  return canReadKindForRole(role, id);
}

export function canReadSection(user: Principal, id: string): boolean {
  return canReadSectionForRole(user.role, id);
}
