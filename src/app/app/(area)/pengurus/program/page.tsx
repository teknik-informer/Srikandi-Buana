import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, Coins, Target } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { FIELDS } from "@/config/fields";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatDateID, formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Program & Rencana Kerja" };

interface ProgramRow {
  id: string;
  field_key: string;
  reference_no: string;
  title: string;
  objective: string | null;
  period_start: string | null;
  period_end: string | null;
  status: "draft" | "planned" | "active" | "completed" | "paused" | "cancelled";
  budget_request: string | null;
  workplan_reference: string | null;
  workplan_title: string | null;
  workplan_status: string | null;
  indicator_count: number;
  open_task_count: number;
  completed_task_count: number;
  activity_count: number;
}

interface IndicatorRow {
  id: string;
  program_id: string;
  indicator_label: string;
  target_value: string | null;
  actual_value: string | null;
  unit_label: string | null;
  note: string | null;
  sort_order: number;
}

const statusLabel: Record<ProgramRow["status"], string> = {
  draft: "Draf",
  planned: "Direncanakan",
  active: "Berjalan",
  completed: "Selesai",
  paused: "Ditunda",
  cancelled: "Dibatalkan",
};

const statusTone: Record<ProgramRow["status"], "neutral" | "info" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  planned: "info",
  active: "success",
  completed: "success",
  paused: "warning",
  cancelled: "danger",
};

const workplanLabel: Record<string, string> = {
  draft: "Draf",
  submitted: "Menunggu persetujuan",
  approved: "Disetujui",
  active: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function formatValue(value: string | null, unit: string | null): string {
  if (value === null || value === "") return "Belum dicatat";
  const n = Number(value);
  const formatted = Number.isFinite(n)
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n)
    : value;
  return unit ? formatted + " " + unit : formatted;
}

function periodLabel(start: string | null, end: string | null): string {
  if (start && end) return formatDateID(start, "short") + " – " + formatDateID(end, "short");
  if (start) return "Mulai " + formatDateID(start, "short");
  if (end) return "Sampai " + formatDateID(end, "short");
  return "Periode belum ditentukan";
}

export default async function ProgramPengurusPage() {
  const identity = await requireIdentity("organization:read");
  let programs: ProgramRow[] = [];
  let indicators: IndicatorRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [programResult, indicatorResult] = await Promise.all([
      sql`
        SELECT
          program.id::text AS id,
          program.field_key,
          program.reference_no,
          program.title,
          program.objective,
          program.period_start::text AS period_start,
          program.period_end::text AS period_end,
          program.status,
          program.budget_request::text AS budget_request,
          workplan.reference_no AS workplan_reference,
          workplan.title AS workplan_title,
          workplan.status AS workplan_status,
          count(DISTINCT indicator.id)::int AS indicator_count,
          count(DISTINCT task.id) FILTER (WHERE task.status IN ('belum', 'proses'))::int AS open_task_count,
          count(DISTINCT task.id) FILTER (WHERE task.status = 'selesai')::int AS completed_task_count,
          count(DISTINCT activity.id)::int AS activity_count
        FROM v9.field_programs AS program
        LEFT JOIN v9.field_workplans AS workplan
          ON workplan.id = program.workplan_id
          AND workplan.organization_id = program.organization_id
          AND workplan.field_key = program.field_key
        LEFT JOIN v9.field_program_indicators AS indicator
          ON indicator.program_id = program.id
          AND indicator.organization_id = program.organization_id
        LEFT JOIN v9.field_tasks AS task
          ON task.program_id = program.id
          AND task.organization_id = program.organization_id
        LEFT JOIN v9.field_activities AS activity
          ON activity.program_id = program.id
          AND activity.organization_id = program.organization_id
        WHERE program.organization_id = ${identity.organizationId}
        GROUP BY
          program.id, program.field_key, program.reference_no, program.title, program.objective,
          program.period_start, program.period_end, program.status, program.budget_request,
          program.created_at, workplan.reference_no, workplan.title, workplan.status
        ORDER BY program.period_start DESC NULLS LAST, program.created_at DESC
        LIMIT 200
      `,
      sql`
        SELECT
          indicator.id::text AS id,
          indicator.program_id::text AS program_id,
          indicator.indicator_label,
          indicator.target_value::text AS target_value,
          indicator.actual_value::text AS actual_value,
          indicator.unit_label,
          indicator.note,
          indicator.sort_order
        FROM v9.field_program_indicators AS indicator
        INNER JOIN v9.field_programs AS program
          ON program.id = indicator.program_id
          AND program.organization_id = indicator.organization_id
        WHERE indicator.organization_id = ${identity.organizationId}
        ORDER BY program.title, indicator.sort_order, indicator.created_at
        LIMIT 1000
      `,
    ]);

    programs = rowsFromResult<ProgramRow>(programResult);
    indicators = rowsFromResult<IndicatorRow>(indicatorResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-programs] Source unavailable", safeErrorType(reason));
  }

  const indicatorsByProgram = new Map<string, IndicatorRow[]>();
  for (const indicator of indicators) {
    const rows = indicatorsByProgram.get(indicator.program_id) ?? [];
    rows.push(indicator);
    indicatorsByProgram.set(indicator.program_id, rows);
  }

  const activeCount = programs.filter((program) => program.status === "active").length;
  const completedCount = programs.filter((program) => program.status === "completed").length;
  const openTasks = programs.reduce((sum, program) => sum + program.open_task_count, 0);
  const requestedBudget = programs.reduce((sum, program) => sum + Number(program.budget_request ?? 0), 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Program & rencana kerja"
        description="Pantau program yang benar-benar tercatat pada tiap bidang, termasuk rencana kerja asal, indikator, kegiatan, dan tugas."
        actions={<Badge tone="info">Data organisasi</Badge>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Data program belum dapat dimuat">
            Sumber program organisasi sedang tidak tersedia. Data contoh tidak akan ditampilkan sebagai
            pengganti catatan resmi.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Program tercatat" value={programs.length} note={activeCount + " berjalan · " + completedCount + " selesai"} tone="info" icon={<ClipboardList size={17} />} />
        <StatCard label="Tugas terbuka" value={openTasks} note="Status belum atau proses" tone="warning" icon={<CalendarDays size={17} />} />
        <StatCard label="Indikator terdaftar" value={indicators.length} note="Target dan realisasi per indikator" tone="success" icon={<Target size={17} />} />
        <StatCard label="Usulan anggaran" value={formatIDR(requestedBudget)} note="Nilai permohonan, bukan anggaran disetujui" tone="neutral" icon={<Coins size={17} />} />
      </div>

      <div className="mt-4">
        <Notice tone="info" title="Usulan anggaran bukan persetujuan atau realisasi">
          Nilai pada kolom budget request merupakan usulan yang melekat pada program. Sistem belum mempunyai
          tabel anggaran yang disahkan atau dimensi realisasi per program, sehingga tidak menghitung serapan
          dan sisa plafon dari angka tersebut.
        </Notice>
      </div>

      {programs.length ? (
        <div className="mt-5 space-y-4">
          {programs.map((program) => {
            const field = FIELDS.find((item) => item.slug === program.field_key);
            const programIndicators = indicatorsByProgram.get(program.id) ?? [];
            return (
              <Card key={program.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted2">{program.reference_no}</span>
                      <Badge tone={statusTone[program.status]}>{statusLabel[program.status]}</Badge>
                      <Badge tone="neutral">{field?.shortName ?? program.field_key}</Badge>
                    </div>
                    <h2 className="mt-1.5 text-[14px] font-semibold text-ink">{program.title}</h2>
                    {program.objective ? <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-muted">{program.objective}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted2">
                      <CalendarDays size={12} />
                      <span>{periodLabel(program.period_start, program.period_end)}</span>
                    </div>
                  </div>
                  {field ? (
                    <Link href={field.appHref} className="sb-btn sb-btn-outline !h-8 shrink-0 !px-3 text-[10.5px]">
                      Buka bidang <ArrowRight size={12} />
                    </Link>
                  ) : null}
                </div>

                <div className="grid gap-3 border-b border-line px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-[10px] text-muted2">Rencana kerja</div>
                    <div className="mt-0.5 text-[11.5px] font-semibold text-ink">{program.workplan_reference ?? "Belum dihubungkan"}</div>
                    <div className="mt-0.5 text-[10px] text-muted">{program.workplan_title ?? "Tidak ada rencana kerja asal"}</div>
                    {program.workplan_status ? <Badge tone={program.workplan_status === "approved" || program.workplan_status === "active" ? "success" : "neutral"}>{workplanLabel[program.workplan_status] ?? program.workplan_status}</Badge> : null}
                  </div>
                  <div>
                    <div className="text-[10px] text-muted2">Usulan anggaran</div>
                    <div className="mt-0.5 text-[11.5px] font-semibold tabular-nums text-ink">{program.budget_request === null ? "Belum dicatat" : formatIDR(Number(program.budget_request))}</div>
                    <div className="mt-0.5 text-[10px] text-muted">Belum berarti disahkan</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted2">Tugas</div>
                    <div className="mt-0.5 text-[11.5px] font-semibold text-ink">{program.open_task_count} terbuka · {program.completed_task_count} selesai</div>
                    <div className="mt-0.5 text-[10px] text-muted">Daftar tugas program</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted2">Aktivitas & indikator</div>
                    <div className="mt-0.5 text-[11.5px] font-semibold text-ink">{program.activity_count} kegiatan · {program.indicator_count} indikator</div>
                    <div className="mt-0.5 text-[10px] text-muted">Catatan yang terhubung pada program</div>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[11.5px] font-semibold text-ink">Indikator program</h3>
                    <span className="text-[10px] text-muted2">{programIndicators.length} indikator</span>
                  </div>
                  {programIndicators.length ? (
                    <div className="sb-scroll">
                      <table className="sb-table min-w-[540px]">
                        <thead><tr><th>Indikator</th><th className="num">Target</th><th className="num">Realisasi</th><th>Catatan</th></tr></thead>
                        <tbody>
                          {programIndicators.map((indicator) => (
                            <tr key={indicator.id}>
                              <td className="font-medium text-ink">{indicator.indicator_label}</td>
                              <td className="num tabular-nums text-muted">{formatValue(indicator.target_value, indicator.unit_label)}</td>
                              <td className="num font-semibold tabular-nums text-ink">{formatValue(indicator.actual_value, indicator.unit_label)}</td>
                              <td className="max-w-[220px] text-muted">{indicator.note ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-[8px] bg-paper px-3 py-2 text-[10.5px] text-muted2">Belum ada indikator yang diregistrasi untuk program ini.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : !unavailable ? (
        <Card className="mt-5 p-4">
          <EmptyState
            title="Belum ada program organisasi"
            body="Program akan muncul setelah Bidang menyimpan program ke basis data organisasi. Tidak ada program contoh yang ditampilkan."
          />
        </Card>
      ) : null}
    </div>
  );
}
