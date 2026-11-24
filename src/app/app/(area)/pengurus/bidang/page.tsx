import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Network, Sprout, Users } from "lucide-react";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard } from "@/components/ui";
import { FieldMark } from "@/components/brand";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Lintas Bidang" };

interface FieldRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  mandate: string | null;
  is_enabled: boolean;
  display_order: number;
  unit_name: string | null;
}

interface ProgramRow {
  field_key: string;
  total_count: number;
  planned_count: number;
  active_count: number;
  completed_count: number;
  paused_count: number;
}

interface WorkloadRow {
  field_key: string;
  open_task_count: number;
  overdue_task_count: number;
  activity_count: number;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function LintasBidangPage() {
  const identity = await requireIdentity("organization:read");
  let fields: FieldRow[] = [];
  let programs: ProgramRow[] = [];
  let workload: WorkloadRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [fieldResult, programResult, workloadResult] = await Promise.all([
      sql`
        SELECT
          application.field_key,
          application.name,
          application.short_name,
          application.route,
          application.mandate,
          application.is_enabled,
          application.display_order,
          unit.name AS unit_name
        FROM v9.field_applications AS application
        LEFT JOIN v9.organization_units AS unit
          ON unit.id = application.unit_id
          AND unit.organization_id = application.organization_id
        WHERE application.organization_id = ${identity.organizationId}
        ORDER BY application.display_order, application.name
      `,
      sql`
        SELECT
          field_key,
          count(*)::int AS total_count,
          count(*) FILTER (WHERE status = 'planned')::int AS planned_count,
          count(*) FILTER (WHERE status = 'active')::int AS active_count,
          count(*) FILTER (WHERE status = 'completed')::int AS completed_count,
          count(*) FILTER (WHERE status = 'paused')::int AS paused_count
        FROM v9.field_programs
        WHERE organization_id = ${identity.organizationId}
        GROUP BY field_key
      `,
      sql`
        SELECT
          field_key,
          count(*) FILTER (WHERE status IN ('belum', 'proses'))::int AS open_task_count,
          count(*) FILTER (
            WHERE status IN ('belum', 'proses')
              AND due_date < (now() AT TIME ZONE 'Asia/Jakarta')::date
          )::int AS overdue_task_count,
          (
            SELECT count(*)::int
            FROM v9.field_activities AS activity
            WHERE activity.organization_id = ${identity.organizationId}
              AND activity.field_key = task_field.field_key
              AND activity.status <> 'cancelled'
          ) AS activity_count
        FROM (
          SELECT field_key, status, due_date
          FROM v9.field_tasks
          WHERE organization_id = ${identity.organizationId}
        ) AS task_field
        GROUP BY field_key
      `,
    ]);

    fields = rowsFromResult<FieldRow>(fieldResult);
    programs = rowsFromResult<ProgramRow>(programResult);
    workload = rowsFromResult<WorkloadRow>(workloadResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-fields] Source unavailable", safeErrorType(reason));
  }

  const programCount = programs.reduce((sum, row) => sum + row.total_count, 0);
  const activeProgramCount = programs.reduce((sum, row) => sum + row.active_count, 0);
  const openTaskCount = workload.reduce((sum, row) => sum + row.open_task_count, 0);
  const activityCount = workload.reduce((sum, row) => sum + row.activity_count, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Pandangan lintas bidang"
        description="Ringkasan struktur bidang, program, tugas, dan kegiatan dari register organisasi."
        actions={<Link href="/app/pengurus/program" className="sb-btn sb-btn-outline">Program & rencana kerja</Link>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Data lintas bidang belum dapat dimuat">
            Registry bidang atau data operasional sedang tidak tersedia. Nilai contoh tidak ditampilkan.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bidang terdaftar" value={fields.length} note={fields.filter((field) => field.is_enabled).length + " aplikasi aktif"} tone="info" icon={<Network size={17} />} />
        <StatCard label="Program tercatat" value={programCount} note={activeProgramCount + " berstatus berjalan"} tone="success" icon={<Sprout size={17} />} />
        <StatCard label="Tugas terbuka" value={openTaskCount} note={workload.reduce((sum, row) => sum + row.overdue_task_count, 0) + " melewati tenggat"} tone="warning" icon={<Users size={17} />} />
        <StatCard label="Kegiatan tercatat" value={activityCount} note="Seluruh bidang · tidak termasuk batal" tone="neutral" icon={<CalendarDays size={17} />} />
      </div>

      <div className="mt-4">
        <Notice tone="info" title="Anggaran dan serapan tidak dihitung di sini">
          Kolom usulan anggaran pada program belum menjadi anggaran yang disahkan. Sistem belum memiliki
          dimensi program/sumber dana pada jurnal, sehingga lintas bidang tidak menampilkan persentase
          serapan atau sisa anggaran yang tidak dapat dibuktikan.
        </Notice>
      </div>

      {fields.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {fields.map((field) => {
            const design = FIELDS.find((item) => item.slug === field.field_key);
            const program = programs.find((row) => row.field_key === field.field_key);
            const load = workload.find((row) => row.field_key === field.field_key);
            return (
              <Card key={field.field_key}>
                <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {design ? (
                      <FieldMark icon={design.icon} accent={design.accent} />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-paper text-muted2"><Network size={17} /></span>
                    )}
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-ink">{field.short_name}</div>
                      <div className="mt-0.5 text-[10px] text-muted2">{field.unit_name ?? field.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone={field.is_enabled ? "success" : "warning"}>{field.is_enabled ? "Aplikasi aktif" : "Belum diaktifkan"}</Badge>
                        <Badge tone="neutral">{field.field_key}</Badge>
                      </div>
                    </div>
                  </div>
                  <Link href={field.route} className="sb-btn sb-btn-outline !h-8 shrink-0 !px-2.5 text-[10.5px]">
                    Buka <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="px-4 py-3">
                  {field.mandate ? (
                    <p className="text-[11px] leading-relaxed text-muted">{field.mandate}</p>
                  ) : (
                    <p className="text-[11px] italic text-muted2">Mandat bidang belum dicatat.</p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-4">
                    <div><div className="text-[10px] text-muted2">Program</div><div className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{program?.total_count ?? 0}</div><div className="text-[9.5px] text-muted2">{program?.active_count ?? 0} berjalan</div></div>
                    <div><div className="text-[10px] text-muted2">Direncanakan</div><div className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{program?.planned_count ?? 0}</div><div className="text-[9.5px] text-muted2">{program?.paused_count ?? 0} ditunda</div></div>
                    <div><div className="text-[10px] text-muted2">Tugas terbuka</div><div className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{load?.open_task_count ?? 0}</div><div className="text-[9.5px] text-muted2">{load?.overdue_task_count ?? 0} terlambat</div></div>
                    <div><div className="text-[10px] text-muted2">Kegiatan</div><div className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">{load?.activity_count ?? 0}</div><div className="text-[9.5px] text-muted2">{program?.completed_count ?? 0} program selesai</div></div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : !unavailable ? (
        <Card className="mt-5 p-4"><EmptyState title="Belum ada bidang terdaftar" body="Bidang akan muncul setelah dicatat pada registry organisasi." /></Card>
      ) : null}
    </div>
  );
}
