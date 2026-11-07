import {
  canReadKind,
  canReadRecord,
  visibleRecord,
  type Principal,
} from "./permissions";
import type { Row } from "./srikandi";

export type ReportGroupId =
  | "operasional"
  | "keanggotaan"
  | "administrasi"
  | "keuangan"
  | "usaha"
  | "publikasi";

export type ReportGroup = {
  id: ReportGroupId;
  label: string;
  description: string;
  kinds: readonly string[];
};

const reportGroups: readonly ReportGroup[] = [
  {
    id: "operasional",
    label: "Program & kegiatan",
    description: "Perkembangan program, tugas, agenda, rapat, dan kehadiran.",
    kinds: ["program", "tindaklanjut", "kegiatan", "musyawarah", "kehadiran"],
  },
  {
    id: "keanggotaan",
    label: "Keanggotaan",
    description: "Rekap status, verifikasi, dan kelengkapan persetujuan anggota.",
    kinds: ["anggota"],
  },
  {
    id: "administrasi",
    label: "Administrasi & dokumen",
    description: "Rekap dokumen, register, verifikasi sumber, dan kepatuhan.",
    kinds: ["pengurus", "persetujuan", "register", "sumber", "kelembagaan", "transkripsi", "dokumen"],
  },
  {
    id: "keuangan",
    label: "Keuangan",
    description: "Laporan buku kas berdasarkan transaksi, tanggal, dan pos dana.",
    kinds: ["kas"],
  },
  {
    id: "usaha",
    label: "Usaha & aset",
    description: "Rekap inventaris, penerimaan lot, kajian usaha, dan kemitraan.",
    kinds: ["aset", "lotkopi", "usaha", "kemitraan"],
  },
  {
    id: "publikasi",
    label: "Publikasi",
    description: "Status konten, galeri, dan kelengkapan izin publikasi.",
    kinds: ["publikasi", "galeri"],
  },
];

export function getVisibleReportGroups(user: Principal): ReportGroup[] {
  return reportGroups.filter((group) =>
    group.kinds.some((kind) => canReadKind(user, kind)),
  );
}

function reportPeriod(row: Row): string {
  const candidates =
    row.kind === "tindaklanjut"
      ? [row.data.dueDate, row.created, row.updated]
      : [row.data.date, row.created, row.updated];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const value = candidate.trim();
    if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 7);
  }
  return "";
}

export function selectReportRows(
  input: Row[],
  user: Principal,
  groupId: ReportGroupId,
  month = "",
): Row[] {
  const group = reportGroups.find((item) => item.id === groupId);
  if (!group || !getVisibleReportGroups(user).some((item) => item.id === groupId))
    return [];

  // Enforce role, member ownership and coordinator program scope again before
  // calculating or exporting any report. API-side filtering remains required.
  return input
    .filter((row) => group.kinds.includes(row.kind))
    .filter((row) => canReadRecord(user, row))
    .filter((row) => !month || reportPeriod(row) === month)
    .map((row) => visibleRecord(user, row) as Row);
}

export function summarizeReportRows(rows: Row[]) {
  const statuses = new Map<string, number>();
  for (const row of rows) {
    const status = String(row.data.status || "Belum ditetapkan");
    statuses.set(status, (statuses.get(status) || 0) + 1);
  }
  return [...statuses.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "id"))
    .map(([status, count]) => ({ status, count }));
}

export function reportDateLabel(row: Row): string {
  return reportPeriod(row) || "Tanggal tidak tercatat";
}
