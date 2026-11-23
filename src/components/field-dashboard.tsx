import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardList, UsersRound } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import type { FieldDef } from "@/config/fields";

interface FieldStats {
  member_count: number;
  workplan_count: number;
  program_count: number;
  scheduled_activity_count: number;
  open_task_count: number;
  overdue_task_count: number;
  completed_task_count: number;
}

interface RecentProgram {
  id: string;
  reference_no: string;
  title: string;
  status: "draft" | "planned" | "active" | "completed" | "paused" | "cancelled";
  workplan_title: string | null;
  created_at: string;
}

interface UpcomingActivity {
  id: string;
  reference_no: string;
  title: string;
  activity_date: string;
  start_time: string | null;
  location: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

interface RecentTask {
  id: string;
  reference_no: string;
  title: string;
  assignee_label: string | null;
  due_date: string | null;
  priority: "tinggi" | "sedang" | "rendah";
  status: "belum" | "proses" | "selesai" | "dibatalkan";
}

const programStatus: Record<RecentProgram["status"], string> = {
  draft: "Draf",
  planned: "Direncanakan",
  active: "Berjalan",
  completed: "Selesai",
  paused: "Ditangguhkan",
  cancelled: "Dibatalkan",
};

const taskStatus: Record<RecentTask["status"], string> = {
  belum: "Belum mulai",
  proses: "Dikerjakan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

function dateLabel(value: string | null): string {
  if (!value) return "Belum ditetapkan";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function programTone(status: RecentProgram["status"]): "success" | "info" | "warning" | "neutral" {
  if (status === "active" || status === "completed") return "success";
  if (status === "planned") return "info";
  if (status === "draft" || status === "paused") return "warning";
  return "neutral";
}

export async function FieldDashboard({ field }: { field: FieldDef }) {
  const identity = await requireIdentity(`field:${field.slug}:read`);
  const sql = getV9Sql();

  const [statsResult, programsResult, activitiesResult, tasksResult] = await Promise.all([
    sql`
      SELECT
        (
          SELECT count(*)::int
          FROM v9.memberships AS membership
          INNER JOIN v9.field_applications AS application
            ON application.unit_id = membership.unit_id
            AND application.organization_id = membership.organization_id
          WHERE membership.organization_id = ${identity.organizationId}
            AND application.field_key = ${field.slug}
            AND application.is_enabled = true
            AND membership.status = 'active'
        ) AS member_count,
        (
          SELECT count(*)::int
          FROM v9.field_workplans AS workplan
          WHERE workplan.organization_id = ${identity.organizationId}
            AND workplan.field_key = ${field.slug}
            AND workplan.status <> 'cancelled'
        ) AS workplan_count,
        (
          SELECT count(*)::int
          FROM v9.field_programs AS program
          WHERE program.organization_id = ${identity.organizationId}
            AND program.field_key = ${field.slug}
            AND program.status <> 'cancelled'
        ) AS program_count,
        (
          SELECT count(*)::int
          FROM v9.field_activities AS activity
          WHERE activity.organization_id = ${identity.organizationId}
            AND activity.field_key = ${field.slug}
            AND activity.status = 'scheduled'
            AND activity.activity_date >= current_date
        ) AS scheduled_activity_count,
        (
          SELECT count(*)::int
          FROM v9.field_tasks AS task
          WHERE task.organization_id = ${identity.organizationId}
            AND task.field_key = ${field.slug}
            AND task.status IN ('belum','proses')
        ) AS open_task_count,
        (
          SELECT count(*)::int
          FROM v9.field_tasks AS task
          WHERE task.organization_id = ${identity.organizationId}
            AND task.field_key = ${field.slug}
            AND task.status IN ('belum','proses')
            AND task.due_date < current_date
        ) AS overdue_task_count,
        (
          SELECT count(*)::int
          FROM v9.field_tasks AS task
          WHERE task.organization_id = ${identity.organizationId}
            AND task.field_key = ${field.slug}
            AND task.status = 'selesai'
        ) AS completed_task_count
    `,
    sql`
      SELECT
        program.id::text AS id,
        program.reference_no,
        program.title,
        program.status,
        workplan.title AS workplan_title,
        program.created_at::text AS created_at
      FROM v9.field_programs AS program
      LEFT JOIN v9.field_workplans AS workplan
        ON workplan.id = program.workplan_id
        AND workplan.organization_id = program.organization_id
        AND workplan.field_key = program.field_key
      WHERE program.organization_id = ${identity.organizationId}
        AND program.field_key = ${field.slug}
        AND program.status <> 'cancelled'
      ORDER BY program.created_at DESC
      LIMIT 5
    `,
    sql`
      SELECT
        activity.id::text AS id,
        activity.reference_no,
        activity.title,
        activity.activity_date::text AS activity_date,
        to_char(activity.start_time, 'HH24:MI') AS start_time,
        activity.location,
        activity.status
      FROM v9.field_activities AS activity
      WHERE activity.organization_id = ${identity.organizationId}
        AND activity.field_key = ${field.slug}
        AND activity.status IN ('scheduled','in_progress')
        AND activity.activity_date >= current_date
      ORDER BY activity.activity_date, activity.start_time NULLS FIRST
      LIMIT 5
    `,
    sql`
      SELECT
        task.id::text AS id,
        task.reference_no,
        task.title,
        task.assignee_label,
        task.due_date::text AS due_date,
        task.priority,
        task.status
      FROM v9.field_tasks AS task
      WHERE task.organization_id = ${identity.organizationId}
        AND task.field_key = ${field.slug}
        AND task.status IN ('belum','proses')
      ORDER BY task.due_date NULLS LAST, task.created_at DESC
      LIMIT 5
    `,
  ]);

  const stats = rowsFromResult<FieldStats>(statsResult)[0] ?? {
    member_count: 0,
    workplan_count: 0,
    program_count: 0,
    scheduled_activity_count: 0,
    open_task_count: 0,
    overdue_task_count: 0,
    completed_task_count: 0,
  };
  const programs = rowsFromResult<RecentProgram>(programsResult);
  const activities = rowsFromResult<UpcomingActivity>(activitiesResult);
  const tasks = rowsFromResult<RecentTask>(tasksResult);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title={field.shortName}
        description={field.mandate}
        actions={
          <>
            <Link href={`${field.appHref}/rencana`} className="sb-btn sb-btn-outline">Rencana kerja</Link>
            <Link href={`${field.appHref}/kegiatan`} className="sb-btn sb-btn-primary">Kegiatan</Link>
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Dasar keputusan</div>
            <div className="mt-1 text-[12px] font-medium text-ink2">{field.decision.number}</div>
            <div className="mt-0.5 text-[10.5px] text-muted">{field.decision.date}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Koordinator</div>
            <div className="mt-1 text-[12px] font-medium text-ink2">{field.coordinator}</div>
            <div className="mt-0.5 text-[10.5px] text-muted">{field.coordinatorNote}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Status aplikasi</div>
            <div className="mt-1"><Badge tone={field.appStatus === "aktif" ? "success" : "warning"}>{field.appStatus === "aktif" ? "Aktif" : field.appStatus}</Badge></div>
            <div className="mt-0.5 text-[10.5px] text-muted">Aplikasi bidang · {field.fieldId}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anggota aktif bidang" value={stats.member_count} note="Keanggotaan terhubung ke unit resmi" tone="success" />
        <StatCard label="Rencana kerja" value={stats.workplan_count} note="Tidak termasuk yang dibatalkan" tone="info" />
        <StatCard label="Program" value={stats.program_count} note="Program yang tercatat" tone="accent" />
        <StatCard label="Kegiatan terjadwal" value={stats.scheduled_activity_count} note="Agenda mendatang" tone="info" />
        <StatCard label="Tugas terbuka" value={stats.open_task_count} note={`${stats.overdue_task_count} melewati tenggat`} tone="warning" />
        <StatCard label="Tugas selesai" value={stats.completed_task_count} note="Akumulasi pada bidang ini" tone="success" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Program bidang"
              subtitle={`${programs.length} program terbaru · data V9`}
              action={<Link href={`${field.appHref}/rencana`} className="text-[11px] font-semibold text-primary-700">Kelola program</Link>}
            />
            {programs.length ? (
              <div className="divide-y divide-line">
                {programs.map((program) => (
                  <article key={program.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[9.5px] text-muted2">{program.reference_no}</div>
                        <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{program.title}</h3>
                        {program.workplan_title ? <div className="mt-0.5 text-[10.5px] text-muted">Rencana: {program.workplan_title}</div> : null}
                      </div>
                      <Badge tone={programTone(program.status)}>{programStatus[program.status]}</Badge>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-5 py-9">
                <EmptyState title="Belum ada program" body="Program akan tampil setelah bidang meregistrasikan program kerja." />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Agenda mendatang"
              subtitle="Kegiatan yang belum dibatalkan dan belum lewat tanggal"
              action={<Link href={`${field.appHref}/kegiatan`} className="text-[11px] font-semibold text-primary-700">Kelola kegiatan</Link>}
            />
            {activities.length ? (
              <div className="divide-y divide-line">
                {activities.map((activity) => (
                  <article key={activity.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9px] text-muted2">{activity.reference_no}</div>
                      <h3 className="mt-1 text-[12px] font-semibold text-ink">{activity.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                        <span>{dateLabel(activity.activity_date)}</span>
                        {activity.start_time ? <span>{activity.start_time} WIB</span> : null}
                        {activity.location ? <span>{activity.location}</span> : null}
                      </div>
                    </div>
                    <Badge tone={activity.status === "in_progress" ? "success" : "info"}>
                      {activity.status === "in_progress" ? "Berjalan" : "Terjadwal"}
                    </Badge>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8">
                <EmptyState title="Belum ada agenda mendatang" body="Agenda kegiatan akan ditampilkan setelah dicatat oleh bidang." />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Tugas prioritas"
              subtitle={`${tasks.length} tugas terbuka terbaru`}
              action={<Link href={`${field.appHref}/tugas`} className="text-[11px] font-semibold text-primary-700">Papan tugas</Link>}
            />
            {tasks.length ? (
              <div className="divide-y divide-line">
                {tasks.map((task) => (
                  <article key={task.id} className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${task.priority === "tinggi" ? "bg-[var(--sb-warning)]" : task.priority === "sedang" ? "bg-primary-500" : "bg-muted2"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[9px] text-muted2">{task.reference_no}</div>
                        <div className="mt-1 text-[12px] font-medium text-ink">{task.title}</div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                          {task.assignee_label ? <span>PIC {task.assignee_label}</span> : <span>Belum ada PIC</span>}
                          <span>{dateLabel(task.due_date)}</span>
                        </div>
                      </div>
                      <Badge tone={task.status === "proses" ? "info" : "warning"}>{taskStatus[task.status]}</Badge>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8">
                <EmptyState title="Belum ada tugas terbuka" body="Tugas baru akan tampil setelah dicatat di papan tugas bidang." />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Modul aplikasi" subtitle="Ruang kerja sesuai mandat bidang" />
            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
              {field.modules.map((module) => (
                <div key={module} className="flex items-center gap-2 rounded-[8px] border border-line bg-paper/50 px-3 py-2 text-[11px] text-ink2">
                  <CheckCircle2 size={13} className="shrink-0 text-primary-700" />
                  {module}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Sumber angka dashboard">
          Seluruh jumlah di halaman ini dihitung dari data V9 pada organisasi dan bidang yang sedang
          dibuka. Angka nol berarti belum ada catatan operasional yang tersimpan; tidak ada data contoh
          yang ditampilkan sebagai capaian.
        </Notice>
      </div>
    </div>
  );
}
