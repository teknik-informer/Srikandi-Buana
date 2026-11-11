/**
 * Server-side organization access policy.
 *
 * Organizational authority and technical administration are separate:
 * - admin: platform configuration and technical maintenance only
 * - ketua: organizational oversight and explicit final decisions
 * - sekretaris / bendahara: their respective business domains
 * - koordinator: assigned program scope
 * - anggota: own profile and member-facing information
 *
 * No role inherits broad business access merely because it is called admin.
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
  "kehadiran", "kelembagaan", "register", "transkripsi", "surat", "surat_resmi",
  "alsintan", "survei", "publikasi", "galeri",
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
const coordinationWrite = ["program", "kegiatan", "tindaklanjut", "laporan_program", "usaha", "kemitraan"];

export function canReadKindForRole(role: Role, kind: string): boolean {
  if (role === "admin") return false;
  if (role === "ketua") return true;
  if (role === "sekretaris") return secretariatWrite.includes(kind) || secretariatReadOnly.includes(kind);
  if (role === "bendahara") return financeWrite.includes(kind) || financeReadOnly.includes(kind);
  if (role === "koordinator") return coordinationWrite.includes(kind) || kind === "survei";
  return kind === "anggota" || kind === "kegiatan";
}

export function canReadKind(user: Principal, kind: string): boolean {
  return canReadKindForRole(user.role, kind);
}

export function canWriteKind(user: Principal, kind: string): boolean {
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
    return false;
  }
  if (user.role === "sekretaris") return secretariatWrite.includes(record.kind);
  if (user.role === "bendahara") return financeWrite.includes(record.kind);
  if (user.role === "koordinator") {
    if (!coordinationWrite.includes(record.kind) || !user.programIds.includes(String(record.data.programId))) return false;
    if (record.kind === "program") return record.data.status === "Rancangan";
    if (record.kind === "kegiatan") return ["Perlu verifikasi", "Direncanakan", "Berjalan"].includes(String(record.data.status));
    if (record.kind === "tindaklanjut") {
      return record.data.status !== "Selesai" && record.data.verification !== "Terverifikasi";
    }
    if (record.kind === "laporan_program") return record.data.status !== "Selesai";
    if (record.kind === "usaha") return ["5", "6"].includes(String(record.data.programId)) && ["Pemetaan", "Kajian kelayakan", "Menunggu musyawarah", "Evaluasi"].includes(String(record.data.status));
    if (record.kind === "kemitraan") return ["6", "8"].includes(String(record.data.programId)) && ["Referensi", "Rencana penjajakan", "Komunikasi awal", "Pembahasan"].includes(String(record.data.status));
  }
  return false;
}

const taskReviewFields = new Set([
  "verification", "reviewNote", "meetingReviewStatus",
  "meetingReviewMeeting", "meetingReviewDate", "meetingReviewNote",
]);

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableValue).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableValue(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

/** The Secretary may verify task outcomes, but cannot rewrite the task itself. */
export function canReviewFollowup(user: Principal, previous: AccessRecord, next: AccessRecord): boolean {
  if (user.role !== "sekretaris" || previous.kind !== "tindaklanjut" || next.kind !== "tindaklanjut" || previous.id !== next.id) return false;
  const stripReview = (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => !taskReviewFields.has(key)));
  return stableValue(stripReview(previous.data)) === stableValue(stripReview(next.data));
}

/** The Chair can publish an existing, unchanged draft; the Chair does not author its content. */
export function canPublishRecord(user: Principal, previous: AccessRecord, next: AccessRecord): boolean {
  if (user.role !== "ketua" || previous.id !== next.id || previous.kind !== next.kind) return false;
  if (!["publikasi", "galeri"].includes(next.kind)) return false;
  if (previous.data.status === "Terbit" || next.data.status !== "Terbit") return false;
  const stripStatus = (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => key !== "status"));
  return stableValue(stripStatus(previous.data)) === stableValue(stripStatus(next.data));
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
  if (id === "akun-saya" || id === "panduan" || id === "notifikasi" || id === "ringkasan") return true;
  if (role === "admin") return ["akun", "pengaturan", "sumber"].includes(id);
  if (id === "pengaturan") return false;
  if (id === "akun") return ["admin", "ketua"].includes(role);
  if (id === "akses-eksternal") return role === "ketua";
  if (id === "sumber") return ["ketua", "sekretaris"].includes(role);
  if (id === "penjualan") return true;
  if (id === "akuntansi") return ["ketua", "sekretaris", "bendahara"].includes(role);
  if (id === "pertanian") return ["ketua", "sekretaris", "bendahara", "koordinator"].includes(role);
  if (["portal", "pengajuan"].includes(id)) return true;
  if (id === "enterprise") return ["ketua", "sekretaris", "bendahara"].includes(role);
  if (id === "dokumen") return ["ketua", "sekretaris", "bendahara", "koordinator"].includes(role);
  if (id === "pesan") return ["ketua", "sekretaris"].includes(role);
  if (id === "surat-resmi") return ["ketua", "sekretaris", "bendahara"].includes(role);
  if (id === "laporan") return ["ketua", "sekretaris", "bendahara"].includes(role);
  if (["publikasi", "galeri"].includes(id)) return ["ketua", "sekretaris"].includes(role);
  if (id === "sistem") return role === "ketua";
  return canReadKindForRole(role, id);
}

export function canReadSection(user: Principal, id: string): boolean {
  return canReadSectionForRole(user.role, id);
}
