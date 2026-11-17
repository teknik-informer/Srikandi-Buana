import { canReadKind, type Principal } from "./permissions";
import { buildManagementInsights, jakartaDate, taskIsOpen } from "./management-insights";
import type { Row } from "./srikandi";
import type { WorkspaceFile } from "./workspace-types";

const analyticsDomains = [
  { id: "hrm", label: "SDM & Keanggotaan", kinds: ["anggota", "pengurus", "musyawarah", "persetujuan"] },
  { id: "projects", label: "Program & Kegiatan", kinds: ["program", "laporan_program", "tindaklanjut", "kegiatan"] },
  { id: "accounting", label: "Keuangan", kinds: ["kas", "akuntansi"] },
  { id: "crm", label: "Relasi & Kemitraan", kinds: ["kemitraan", "publikasi", "galeri", "pesan"] },
  { id: "commerce", label: "Usaha, Aset & Komoditas", kinds: ["usaha", "aset", "lotkopi", "penjualan"] },
  { id: "documents", label: "Administrasi & Dokumen", kinds: ["surat", "surat_resmi", "register", "kelembagaan", "transkripsi", "dokumen"] },
] as const;

function monthKey(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const match = /^(\d{4}-\d{2})/.exec(value.trim());
  if (match) return match[1];
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";
  const date = new Date(parsed);
  return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function recentMonthKeys(now: Date): string[] {
  const [year, month] = jakartaDate(now).split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - index), 1));
    return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
  });
}

/**
 * Produces aggregate analytics only from records that pass the current
 * server-side role, member and programme-scope policy. No source row or PII is
 * returned to the BI presentation layer.
 */
export function buildEnterpriseAnalytics(
  input: Row[],
  files: WorkspaceFile[],
  user: Principal,
  now = new Date(),
) {
  const insights = buildManagementInsights(input, files, user, now);
  const rows = insights.rows;
  const months = recentMonthKeys(now);
  const monthlyCounts = new Map(months.map((month) => [month, 0]));

  for (const row of rows) {
    const month = monthKey(row.updated || row.created);
    if (monthlyCounts.has(month)) monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1);
  }

  const domains = analyticsDomains
    .map((domain) => {
      const readableKinds = domain.kinds.filter((kind) => canReadKind(user, kind));
      return {
        id: domain.id,
        label: domain.label,
        count: rows.filter((row) => readableKinds.includes(row.kind as never)).length,
      };
    })
    .filter((domain) => analyticsDomains.some((definition) =>
      definition.id === domain.id && definition.kinds.some((kind) => canReadKind(user, kind)),
    ));

  const latestUpdate = rows
    .map((row) => row.updated || row.created)
    .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;

  const countKind = (kind: string) => rows.filter((row) => row.kind === kind).length;

  return {
    records: rows.length,
    latestUpdate,
    monthlyTrend: months.map((month) => ({
      month,
      label: monthLabel(month),
      records: monthlyCounts.get(month) || 0,
    })),
    domains,
    qualityFindings: insights.issues.length,
    warningFindings: insights.issues.filter((issue) => issue.severity === "warning").length,
    infoFindings: insights.issues.filter((issue) => issue.severity === "info").length,
    programs: canReadKind(user, "program") ? countKind("program") : null,
    openTasks: canReadKind(user, "tindaklanjut") ? insights.tasks.filter(taskIsOpen).length : null,
    members: canReadKind(user, "anggota") ? countKind("anggota") : null,
  };
}
