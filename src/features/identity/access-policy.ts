/**
 * Server-side organization access policy.
 *
 * Organizational authority and technical administration are separate:
 * - admin: full technical and operational authority across all six applications
 * - ketua: organizational oversight and explicit final decisions
 * - sekretaris / bendahara: their respective business domains
 * - koordinator: assigned program scope
 * - anggota: own profile and member-facing information
 *
 * The Administrator Sistem role is the platform super-administrator. All other roles retain their scoped organizational permissions.
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
  architectFullAccess?: boolean;
  moduleAccess?: ModuleAccessState;
};
export type AccessRecord = { id: string; kind: string; data: Record<string, unknown> };
export type ModuleAccessState = {
  /** Modules disabled for the current organization, including global planned/suspended states. */
  disabledModules: string[];
  /** Explicit application-entry grants. These do not grant access to business records or actions. */
  allowedModules: string[];
  /** Explicit application and data-scope denials. */
  deniedModules: string[];
};

const moduleBaselineSections: Record<string, readonly string[]> = {
  hrm: ["anggota", "pengurus", "musyawarah", "persetujuan", "presensi", "presensi-saya", "portal", "akun-saya", "akun"],
  accounting: ["kas", "laporan", "akuntansi", "aset"],
  crm: ["kemitraan", "pesan", "akses-eksternal", "publikasi", "galeri"],
  projects: ["program", "pertanian", "laporan_program", "tindaklanjut", "kegiatan", "kehadiran", "surat", "surat-resmi", "sumber", "kelembagaan", "register", "transkripsi", "survei", "dokumen", "pengajuan", "enterprise", "panduan"],
  pos: ["penjualan", "lotkopi"],
  analytics: ["analytics"],
};

const sectionModuleMap: Record<string, string> = {
  hrm: "hrm", anggota: "hrm", pengurus: "hrm", musyawarah: "hrm", persetujuan: "hrm",
  presensi: "hrm", "presensi-saya": "hrm", portal: "hrm", "akun-saya": "hrm",
  accounting: "accounting", kas: "accounting", laporan: "accounting", akuntansi: "accounting", aset: "accounting",
  crm: "crm", kemitraan: "crm", pesan: "crm", "akses-eksternal": "crm", publikasi: "crm", galeri: "crm",
  projects: "projects", program: "projects", pertanian: "agriculture", laporan_program: "projects",
  tindaklanjut: "projects", kegiatan: "projects", kehadiran: "hrm", surat: "projects", "surat-resmi": "projects",
  sumber: "projects", kelembagaan: "projects", register: "projects", transkripsi: "projects", survei: "projects",
  dokumen: "documents", pengajuan: "projects", enterprise: "projects", panduan: "projects", usaha: "projects", alsintan: "projects",
  pos: "pos", penjualan: "pos", lotkopi: "pos", analytics: "analytics",
};

const recordKindModuleMap: Record<string, string> = {
  anggota: "hrm", pengurus: "hrm", musyawarah: "hrm", persetujuan: "hrm",
  presensi: "hrm", kehadiran: "hrm", attendance_session: "hrm", attendance_record: "hrm",
  attendance_correction: "hrm", attendance_qr_token: "hrm", attendance_audit: "hrm",
  kas: "accounting", akuntansi: "accounting", aset: "accounting",
  kemitraan: "crm", pesan: "crm", publikasi: "crm", galeri: "crm",
  program: "projects", pertanian: "agriculture", laporan_program: "projects",
  tindaklanjut: "projects", kegiatan: "projects", usaha: "projects", alsintan: "projects",
  survei: "projects", surat: "projects", surat_resmi: "projects", register: "projects",
  kelembagaan: "projects", transkripsi: "projects", dokumen: "documents", pengajuan: "projects",
  enterprise: "projects", lotkopi: "pos", penjualan: "pos",
};

export function isModuleAvailableForUser(user: Pick<Principal, "moduleAccess" | "role">, moduleId: string): boolean {
  // The platform super-administrator must be able to enter and administer every application,
  // including modules that are disabled or explicitly denied for ordinary accounts.
  if (user.role === "admin") return true;
  const state = user.moduleAccess;
  return !state?.disabledModules.includes(moduleId) && !state?.deniedModules.includes(moduleId);
}

/**
 * A launch grant can expose an application shell. It never bypasses the
 * organizational record/action policy below.
 */
export function canOpenModule(user: Principal, moduleId: string): boolean {
  if (!isModuleAvailableForUser(user, moduleId)) return false;
  if (user.moduleAccess?.allowedModules.includes(moduleId)) return true;
  if (isArchitectFullAccess(user)) return true;
  return (moduleBaselineSections[moduleId] || []).some((section) => canReadSectionForRole(user.role, section));
}

export function isSectionModuleAvailableForUser(user: Pick<Principal, "moduleAccess" | "role">, sectionId: string): boolean {
  const moduleId = sectionModuleMap[sectionId];
  return !moduleId || isModuleAvailableForUser(user, moduleId);
}

function recordModule(kind: string): string | undefined {
  return recordKindModuleMap[kind];
}

/**
 * Backward-compatible capability check. Administrator Sistem is the super-administrator
 * in every environment (Preview and Production), not a QA-only identity flag.
 */
export function isArchitectFullAccess(user: Pick<Principal, "role">): boolean {
  return user.role === "admin";
}


const secretariatWrite = [
  "anggota", "pengurus", "musyawarah", "persetujuan", "kegiatan",
  "kehadiran", "presensi", "kelembagaan", "register", "transkripsi", "surat", "surat_resmi",
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

const privateAttendanceKinds = new Set(["attendance_session", "attendance_record", "attendance_correction", "attendance_qr_token", "attendance_audit"]);

export function canReadKindForRole(role: Role, kind: string): boolean {
  if (role === "admin") return true;
  if (privateAttendanceKinds.has(kind) || kind === "kehadiran") return false;
  if (role === "ketua") return true;
  if (role === "sekretaris") return secretariatWrite.includes(kind) || secretariatReadOnly.includes(kind);
  if (role === "bendahara") return financeWrite.includes(kind) || financeReadOnly.includes(kind);
  if (role === "koordinator") return coordinationWrite.includes(kind) || kind === "survei";
  return kind === "anggota" || kind === "kegiatan";
}

export function canReadKind(user: Principal, kind: string): boolean {
  const moduleId = recordModule(kind);
  if (moduleId && !isModuleAvailableForUser(user, moduleId)) return false;
  if (isArchitectFullAccess(user)) return true;
  return canReadKindForRole(user.role, kind);
}

export function canWriteKind(user: Principal, kind: string): boolean {
  const moduleId = recordModule(kind);
  if (moduleId && !isModuleAvailableForUser(user, moduleId)) return false;
  if (isArchitectFullAccess(user)) return true;
  if (user.role === "sekretaris") return secretariatWrite.includes(kind);
  if (user.role === "bendahara") return financeWrite.includes(kind);
  if (user.role === "koordinator") return coordinationWrite.includes(kind);
  return false;
}

export function canReadRecord(user: Principal, record: AccessRecord): boolean {
  if (!canReadKind(user, record.kind)) return false;
  if (isArchitectFullAccess(user)) return true;
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
  if (!canWriteKind(user, record.kind)) return false;
  if (isArchitectFullAccess(user)) return true;
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

/** The Secretary or System Administrator may verify task outcomes, but cannot rewrite the task itself. */
export function canReviewFollowup(user: Principal, previous: AccessRecord, next: AccessRecord): boolean {
  if (!isModuleAvailableForUser(user, "projects")) return false;
  if (!["admin", "sekretaris"].includes(user.role) || previous.kind !== "tindaklanjut" || next.kind !== "tindaklanjut" || previous.id !== next.id) return false;
  const stripReview = (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => !taskReviewFields.has(key)));
  return stableValue(stripReview(previous.data)) === stableValue(stripReview(next.data));
}

/** The Chair or System Administrator can publish an existing, unchanged draft; neither may alter its content during publication. */
export function canPublishRecord(user: Principal, previous: AccessRecord, next: AccessRecord): boolean {
  if (!isModuleAvailableForUser(user, "crm")) return false;
  if (!["admin", "ketua"].includes(user.role) || previous.id !== next.id || previous.kind !== next.kind) return false;
  if (!["publikasi", "galeri"].includes(next.kind)) return false;
  if (previous.data.status === "Terbit" || next.data.status !== "Terbit") return false;
  const stripStatus = (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => key !== "status"));
  return stableValue(stripStatus(previous.data)) === stableValue(stripStatus(next.data));
}

export function visibleRecord(user: Principal, record: AccessRecord): AccessRecord {
  if (user.role === "ketua" && record.kind === "kehadiran") {
    const memberIds = Array.isArray(record.data.memberIds) ? record.data.memberIds : [];
    const memberNames = Array.isArray(record.data.memberNames) ? record.data.memberNames : [];
    return {
      ...record,
      data: {
        ...(record.data.eventId ? { eventId: record.data.eventId } : {}),
        ...(record.data.name ? { name: record.data.name } : {}),
        count: Math.max(memberIds.length, memberNames.length),
      },
    };
  }
  if (user.role === "ketua" && record.kind === "transkripsi") {
    const keys = ["name", "date", "status"];
    return { ...record, data: Object.fromEntries(keys.filter((key) => key in record.data).map((key) => [key, record.data[key]])) };
  }
  if (user.role === "anggota") {
    const keys = record.kind === "anggota"
      ? ["name", "dusun", "phone", "role", "status", "verification"]
      : ["name", "date", "location", "status"];
    return { ...record, data: Object.fromEntries(keys.filter((key) => key in record.data).map((key) => [key, record.data[key]])) };
  }
  if (user.role === "ketua" && record.kind === "anggota") {
    const keys = ["name", "dusun", "role", "status", "verification"];
    return { ...record, data: Object.fromEntries(keys.filter((key) => key in record.data).map((key) => [key, record.data[key]])) };
  }
  if (user.role === "ketua" && record.kind === "persetujuan") {
    const keys = ["date", "status", "photo"];
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
  if (role === "admin") return true;
  if (["akun-saya", "panduan", "notifikasi", "ringkasan"].includes(id)) return true;
  if (id === "presensi-saya") return role === "anggota";
  if (id === "presensi") return ["ketua", "sekretaris", "koordinator"].includes(role);
  if (id === "analytics") return ["ketua", "sekretaris", "bendahara", "koordinator"].includes(role);
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
  if (id === "laporan") return ["ketua", "sekretaris", "bendahara", "koordinator"].includes(role);
  if (["publikasi", "galeri"].includes(id)) return ["ketua", "sekretaris"].includes(role);
  if (id === "sistem") return role === "ketua";
  return canReadKindForRole(role, id);
}

export function canReadSection(user: Principal, id: string): boolean {
  if (id === "module-center") return canReadSectionForRole(user.role, id);
  if (["hrm", "accounting", "crm", "projects", "pos", "analytics"].includes(id)) return canOpenModule(user, id);
  const moduleId = sectionModuleMap[id];
  if (moduleId && !isModuleAvailableForUser(user, moduleId)) return false;
  if (isArchitectFullAccess(user)) return true;
  return canReadSectionForRole(user.role, id);
}
