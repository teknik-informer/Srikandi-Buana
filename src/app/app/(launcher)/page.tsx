import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIdentity, can } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { APPS } from "@/config/apps";
import { canAccessApp } from "@/lib/app-access";
import { FIELDS_BY_SLUG } from "@/config/fields";
import { AppIcon, FieldMark } from "@/components/brand";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { Badge, Card, CardHeader, PageHeader, StatCard, StatusBadge, Notice } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Beranda Aplikasi" };

interface CountRow {
  count: number;
}

interface TaskRow {
  id: string;
  reference_no: string;
  title: string;
  field_key: string;
  assignee_label: string | null;
  due_date: string | null;
  priority: "tinggi" | "sedang" | "rendah";
  status: "belum" | "proses" | "selesai" | "dibatalkan";
  is_overdue: boolean;
  total_open_count: number;
  overdue_count: number;
}

interface FieldApplicationRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  mandate: string | null;
  is_enabled: boolean;
  unit_name: string | null;
}

interface AgendaRow {
  id: string;
  kind: "rapat" | "kegiatan";
  title: string;
  event_date: string;
  time_label: string | null;
  detail: string | null;
}

interface ProgramCountRow {
  active_count: number;
  total_count: number;
}

interface ApprovalSource {
  key: string;
  label: string;
  href: string;
  count: number;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function fieldHome(row: FieldApplicationRow): string {
  const configured = FIELDS_BY_SLUG[row.field_key];
  return row.route?.startsWith("/app/bidang/")
    ? row.route
    : configured?.appHref ?? "/app/bidang/" + row.field_key;
}

export default async function AppHome() {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const canReadOrganization = can(identity, "organization:read");
  const fieldScope = identity.field && can(identity, "field:" + identity.field + ":read")
    ? identity.field
    : null;
  const memberScope = can(identity, "member:self");
  const taskScope = canReadOrganization ? "organization" : fieldScope ? "field" : memberScope ? "member" : null;
  const canReadPrograms = canReadOrganization || Boolean(fieldScope);
  const agendaScope = canReadOrganization ? "organization" : fieldScope ? "field" : memberScope ? "public" : null;

  let tasks: TaskRow[] = [];
  let tasksUnavailable = false;
  if (taskScope) {
    try {
      const sql = getV9Sql();
      tasks = rowsFromResult<TaskRow>(await sql`
        WITH scoped_tasks AS (
          SELECT
            task.id::text AS id,
            task.reference_no,
            task.title,
            task.field_key,
            task.assignee_label,
            to_char(task.due_date, 'YYYY-MM-DD') AS due_date,
            task.priority,
            task.status,
            (
              COALESCE(
                task.due_date < (now() AT TIME ZONE 'Asia/Jakarta')::date
                AND task.status NOT IN ('selesai', 'dibatalkan'),
                false
              ) AS is_overdue
          FROM v9.field_tasks AS task
          WHERE task.organization_id = ${identity.organizationId}
            AND task.status NOT IN ('selesai', 'dibatalkan')
            AND (
              ${taskScope} = 'organization'
              OR (${taskScope} = 'field' AND task.field_key = ${fieldScope})
              OR (${taskScope} = 'member' AND task.assigned_to_user_id = ${identity.userId})
            )
        )
        SELECT
          scoped_tasks.*,
          (count(*) OVER ())::int AS total_open_count,
          (count(*) FILTER (WHERE is_overdue) OVER ())::int AS overdue_count
        FROM scoped_tasks
        ORDER BY is_overdue DESC, due_date ASC NULLS LAST, title ASC
        LIMIT 8
      `);
    } catch (reason) {
      tasksUnavailable = true;
      console.warn("[launcher-tasks] Source unavailable", safeErrorType(reason));
    }
  }

  let fields: FieldApplicationRow[] = [];
  let fieldsUnavailable = false;
  const canReadAnyField = canReadOrganization || Boolean(fieldScope);
  if (canReadAnyField) {
    try {
      const sql = getV9Sql();
      fields = rowsFromResult<FieldApplicationRow>(await sql`
        SELECT
          application.field_key,
          application.name,
          application.short_name,
          application.route,
          application.mandate,
          application.is_enabled,
          unit.name AS unit_name
        FROM v9.field_applications AS application
        LEFT JOIN v9.organization_units AS unit
          ON unit.id = application.unit_id
          AND unit.organization_id = application.organization_id
        WHERE application.organization_id = ${identity.organizationId}
          AND (${canReadOrganization} = true OR application.field_key = ${fieldScope})
        ORDER BY application.display_order, application.name
      `);
    } catch (reason) {
      fieldsUnavailable = true;
      console.warn("[launcher-fields] Registry unavailable", safeErrorType(reason));
    }
  }
  const accessibleFields = fields.filter((row) =>
    row.is_enabled && APPS.some((app) => app.key === row.field_key && canAccessApp(identity, app.key)),
  );

  let programs: ProgramCountRow | null = null;
  let programsUnavailable = false;
  if (canReadPrograms) {
    try {
      const sql = getV9Sql();
      programs = rowsFromResult<ProgramCountRow>(await sql`
        SELECT
          count(*) FILTER (WHERE status = 'active')::int AS active_count,
          count(*)::int AS total_count
        FROM v9.field_programs
        WHERE organization_id = ${identity.organizationId}
          AND (${fieldScope}::text IS NULL OR field_key = ${fieldScope})
      `)[0] ?? { active_count: 0, total_count: 0 };
    } catch (reason) {
      programsUnavailable = true;
      console.warn("[launcher-programs] Source unavailable", safeErrorType(reason));
    }
  }

  let agenda: AgendaRow[] = [];
  let agendaUnavailable = false;
  if (agendaScope) {
    try {
      const sql = getV9Sql();
      agenda = rowsFromResult<AgendaRow>(await sql`
        SELECT *
        FROM (
          SELECT
            meeting.id::text AS id,
            'rapat'::text AS kind,
            meeting.title,
            meeting.meeting_date::text AS event_date,
            meeting.time_label,
            meeting.location AS detail
          FROM v9.secretariat_meetings AS meeting
          WHERE meeting.organization_id = ${identity.organizationId}
            AND meeting.status = 'scheduled'
            AND meeting.meeting_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
            AND (
              ${agendaScope} = 'organization'
              OR (${agendaScope} = 'public' AND meeting.meeting_type = 'anggota' AND meeting.open_to_public = true)
            )
          UNION ALL
          SELECT
            activity.id::text AS id,
            'kegiatan'::text AS kind,
            activity.title,
            activity.activity_date::text AS event_date,
            to_char(activity.start_time, 'HH24:MI') AS time_label,
            activity.location AS detail
          FROM v9.field_activities AS activity
          WHERE activity.organization_id = ${identity.organizationId}
            AND activity.status IN ('scheduled', 'in_progress')
            AND activity.activity_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
            AND (
              ${agendaScope} = 'organization'
              OR (${agendaScope} = 'field' AND activity.field_key = ${fieldScope})
              OR (${agendaScope} = 'public' AND activity.open_to_public = true)
            )
        ) AS upcoming
        ORDER BY event_date ASC, time_label ASC NULLS LAST
        LIMIT 8
      `);
    } catch (reason) {
      agendaUnavailable = true;
      console.warn("[launcher-agenda] Source unavailable", safeErrorType(reason));
    }
  }

  const canReadFinanceApprovals = can(identity, "approval:read") || can(identity, "finance:journal:approve");
  const canReadMembershipApprovals = can(identity, "field:organisasi:review");
  const canReadWorkplanApprovals = can(identity, "approval:read") || can(identity, "organization:team:approve");
  const canReadAnyApprovals = canReadFinanceApprovals || canReadMembershipApprovals || canReadWorkplanApprovals;
  const approvalSources: ApprovalSource[] = [];
  let approvalsUnavailable = false;

  if (canReadAnyApprovals) {
    try {
      const sql = getV9Sql();
      const jobs: { key: string; label: string; href: string; query: Promise<unknown> }[] = [];
      if (canReadFinanceApprovals) {
        jobs.push({
          key: "finance",
          label: "Jurnal keuangan",
          href: "/app/keuangan/jurnal",
          query: sql`SELECT count(*)::int AS count FROM v9.finance_journals WHERE organization_id = ${identity.organizationId} AND status = 'submitted'`,
        });
      }
      if (canReadMembershipApprovals) {
        jobs.push({
          key: "membership",
          label: "Pengajuan keanggotaan",
          href: "/app/pengurus/persetujuan",
          query: sql`SELECT count(*)::int AS count FROM v9.membership_interests WHERE organization_id = ${identity.organizationId} AND status IN ('submitted', 'under_review')`,
        });
      }
      if (canReadWorkplanApprovals) {
        jobs.push({
          key: "workplans",
          label: "Rencana kerja bidang",
          href: "/app/pengurus/persetujuan",
          query: sql`SELECT count(*)::int AS count FROM v9.field_workplans WHERE organization_id = ${identity.organizationId} AND status = 'submitted'`,
        });
      }
      const results = await Promise.all(jobs.map((job) => job.query));
      for (let index = 0; index < jobs.length; index += 1) {
        const count = rowsFromResult<CountRow>(results[index])[0]?.count ?? 0;
        approvalSources.push({ key: jobs[index].key, label: jobs[index].label, href: jobs[index].href, count: Number(count) });
      }
    } catch (reason) {
      approvalsUnavailable = true;
      console.warn("[launcher-approvals] Queues unavailable", safeErrorType(reason));
    }
  }

  const accessibleApps = APPS.filter((app) =>
    app.group !== "bidang" && app.key !== "launcher" && canAccessApp(identity, app.key),
  );
  const activeTaskCount = tasks[0]?.total_open_count ?? 0;
  const overdueTaskCount = tasks[0]?.overdue_count ?? 0;
  const pendingApprovalCount = approvalSources.reduce((total, source) => total + source.count, 0);
  const taskHref = memberScope
    ? "/app/anggota/tugas"
    : fieldScope
      ? "/app/bidang/" + fieldScope + "/tugas"
      : "/app/pengurus/tugas";
  const agendaHref = memberScope
    ? "/app/anggota/agenda"
    : can(identity, "secretariat:read")
      ? "/app/sekretariat/agenda"
      : fieldScope
        ? "/app/bidang/" + fieldScope + "/program"
        : "/app/pengurus/rapat";
  const programHref = fieldScope
    ? "/app/bidang/" + fieldScope + "/program"
    : "/app/pengurus/program";

  const facts = [
    ...(taskScope && !tasksUnavailable ? [activeTaskCount + " tugas terbuka"] : []),
    ...(canReadAnyApprovals && !approvalsUnavailable ? [pendingApprovalCount + " persetujuan menunggu"] : []),
    ...(canReadPrograms && !programsUnavailable && programs ? [Number(programs.active_count) + " program aktif"] : []),
    (accessibleApps.length + accessibleFields.length) + " aplikasi dapat diakses",
  ];

  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.launcher}
        heading="h2"
        badge={
          <span className="rounded-full bg-[#e6c56a]/18 px-2.5 py-1 text-[10px] font-bold text-[#f2dda2] ring-1 ring-inset ring-[#e6c56a]/30">
            {identity.role + " · " + identity.scope}
          </span>
        }
        facts={facts}
        actions={[
          { href: "/app/cepat", label: "Buat cepat", primary: true },
          ...(canAccessApp(identity, "studio") ? [{ href: "/studio", label: "Studio Pengelola" }] : []),
        ]}
      />

      <div className="mt-5">
        <PageHeader
          eyebrow={"Selamat datang, " + identity.name.split(" ")[0]}
          title="Apa yang perlu Anda kerjakan hari ini?"
          description={"Konteks aktif: " + identity.scope + ". " + identity.note}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {taskScope ? (
          <StatCard
            label="Tugas terbuka"
            value={tasksUnavailable ? "—" : String(activeTaskCount)}
            note={tasksUnavailable ? "Sumber data belum tersedia" : String(overdueTaskCount) + " terlambat"}
            tone="warning"
            href={taskHref}
          />
        ) : null}
        {canReadAnyApprovals ? (
          <StatCard
            label="Persetujuan menunggu"
            value={approvalsUnavailable ? "—" : String(pendingApprovalCount)}
            note={approvalsUnavailable ? "Antrean belum dapat dimuat" : "Antrean sesuai hak akses"}
            tone="accent"
            href="/app/pengurus/persetujuan"
          />
        ) : null}
        {canReadPrograms ? (
          <StatCard
            label="Program berjalan"
            value={programsUnavailable ? "—" : String(programs?.active_count ?? 0)}
            note={programsUnavailable ? "Sumber data belum tersedia" : String(programs?.total_count ?? 0) + " program tercatat"}
            tone="success"
            href={programHref}
          />
        ) : null}
        {agendaScope ? (
          <StatCard
            label="Agenda mendatang"
            value={agendaUnavailable ? "—" : String(agenda.length)}
            note={agendaUnavailable ? "Sumber data belum tersedia" : "Agenda sesuai lingkup akses"}
            tone="info"
            href={agendaHref}
          />
        ) : null}
        {!taskScope && !canReadAnyApprovals && !canReadPrograms && !agendaScope ? (
          <StatCard
            label="Aplikasi tersedia"
            value={String(accessibleApps.length + accessibleFields.length)}
            note="Akses mengikuti peran dan lingkup akun"
            tone="success"
          />
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Pilih aplikasi"
              subtitle="Aplikasi ditampilkan sesuai kewenangan akun"
              action={<Link href="/app/bidang" className="text-[12px] font-semibold text-primary-700">Peta bidang →</Link>}
            />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {accessibleApps.length ? accessibleApps.map((app) => (
                <Link key={app.key} href={app.href} className="group flex items-start gap-3 rounded-sb-sm border border-line bg-white p-3 transition hover:border-primary-300 hover:bg-primary-50/40">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-100 text-primary-800">
                    <AppIcon name={app.icon} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-ink group-hover:text-primary-800">
                      {app.name}
                      {app.badge ? <Badge tone="accent">{app.badge}</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{app.description}</span>
                  </span>
                </Link>
              )) : (
                <p className="px-2 py-4 text-sm text-muted">Belum ada aplikasi lain yang diberikan kepada akun ini.</p>
              )}
            </div>
          </Card>

          {canReadAnyField ? (
            <Card>
              <CardHeader title="Aplikasi bidang" subtitle="Registry bidang dan status aktif dibaca dari organisasi" />
              {fieldsUnavailable ? (
                <div className="p-4"><Notice tone="danger" title="Registry bidang belum dapat dimuat">Status aplikasi bidang tidak ditampilkan sebagai data aktif.</Notice></div>
              ) : accessibleFields.length ? (
                <div className="grid gap-2 p-3 sm:grid-cols-2">
                  {accessibleFields.map((field) => {
                    const visual = FIELDS_BY_SLUG[field.field_key];
                    return (
                      <Link key={field.field_key} href={fieldHome(field)} className="flex items-start gap-3 rounded-sb-sm border border-line bg-white p-3 transition hover:border-primary-300">
                        <FieldMark icon={visual?.icon ?? "users"} accent={visual?.accent ?? "#5d8432"} />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-semibold text-ink">{field.short_name || field.name}</span>
                          <span className="mt-0.5 block text-[11px] text-muted">{field.unit_name ?? "Unit organisasi"}</span>
                          <span className="mt-1 inline-block"><Badge tone="success">Aktif</Badge></span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="p-4 text-sm text-muted">Belum ada aplikasi bidang aktif yang dapat diakses akun ini.</p>
              )}
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Tugas yang dapat Anda lihat" subtitle="Data tugas tersimpan pada layanan organisasi" />
            {tasksUnavailable ? (
              <div className="p-4"><Notice tone="danger" title="Data tugas belum tersedia">Daftar tugas tidak ditampilkan sebagai daftar kosong palsu.</Notice></div>
            ) : tasks.length ? (
              <ul className="divide-y divide-line">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + (task.is_overdue ? "bg-[var(--sb-danger)]" : task.priority === "tinggi" ? "bg-accent" : "bg-primary-400")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium leading-snug text-ink">{task.title}</div>
                      <div className="mt-0.5 text-[10.5px] text-muted2">
                        {(FIELDS_BY_SLUG[task.field_key]?.shortName ?? task.field_key) + " · " + (task.due_date ? formatDateID(task.due_date, "short") : "Tanpa tenggat")}
                        {task.assignee_label ? " · " + task.assignee_label : ""}
                      </div>
                    </div>
                    <StatusBadge status={task.is_overdue ? "Terlambat" : task.status === "proses" ? "Proses" : "Belum"} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-muted">Tidak ada tugas terbuka pada lingkup akun ini.</p>
            )}
            {taskScope ? <div className="border-t border-line px-4 py-2.5"><Link href={taskHref} className="text-[11.5px] font-semibold text-primary-700">Buka daftar tugas →</Link></div> : null}
          </Card>

          <Card>
            <CardHeader title="Agenda terdekat" action={agendaScope ? <Link href={agendaHref} className="text-[11.5px] font-semibold text-primary-700">Kalender</Link> : undefined} />
            {agendaUnavailable ? (
              <div className="p-4"><Notice tone="danger" title="Agenda belum dapat dimuat">Agenda tidak ditampilkan sebagai data kosong palsu.</Notice></div>
            ) : agenda.length ? (
              <ul className="divide-y divide-line">
                {agenda.map((item) => (
                  <li key={item.kind + item.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-medium text-ink">{item.title}</div>
                      <span className="shrink-0 text-[10.5px] font-semibold text-accent-700">{formatDateID(item.event_date, "short")}</span>
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-muted2">
                      {(item.kind === "rapat" ? "Rapat" : "Kegiatan") + (item.time_label ? " · " + item.time_label : "") + (item.detail ? " · " + item.detail : "")}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-muted">Belum ada agenda mendatang pada lingkup akun ini.</p>
            )}
          </Card>

          {canReadAnyApprovals ? (
            <Card>
              <CardHeader title="Persetujuan" subtitle="Antrean domain yang memang dapat Anda tinjau" />
              {approvalsUnavailable ? (
                <div className="p-4"><Notice tone="danger" title="Antrean belum dapat dimuat">Jumlah persetujuan tidak ditampilkan sebagai nol.</Notice></div>
              ) : approvalSources.length ? (
                <ul className="divide-y divide-line">
                  {approvalSources.map((source) => (
                    <li key={source.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <Link href={source.href} className="text-[12px] font-medium text-ink hover:text-primary-700">{source.label}</Link>
                      <Badge tone={source.count > 0 ? "warning" : "neutral"}>{source.count}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm text-muted">Tidak ada persetujuan yang menunggu.</p>
              )}
              <div className="border-t border-line px-4 py-2.5"><Link href="/app/pengurus/persetujuan" className="text-[11.5px] font-semibold text-primary-700">Buka kotak persetujuan →</Link></div>
            </Card>
          ) : null}

          <Notice tone="info" title="Notifikasi belum aktif">
            Pusat notifikasi bersama belum diaktifkan. Halaman ini tidak menampilkan pesan contoh atau status pengiriman yang belum terjadi.
          </Notice>
        </div>
      </div>
    </div>
  );
}
