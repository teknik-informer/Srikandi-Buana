import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity, ArrowRight, BarChart3, CalendarDays, Check, FileText,
  Handshake, Landmark, Sprout, Users, Wallet, ClipboardCheck,
  Store, GraduationCap, ShieldCheck,
} from "lucide-react";
import { FIELDS } from "@/config/fields";
import { APP_IDENTITY } from "@/config/app-identity";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatIDR } from "@/lib/format";
import {
  ActivityChart, AppBanner, DonutCard, KpiStrip, QuickAccess,
  RecentCard, type Kpi,
} from "@/components/dash-kit";
import { Badge, Card, CardHeader, EmptyState, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Ringkasan Organisasi" };

interface DashboardSummary {
  active_members: number;
  pending_membership_interests: number;
  open_tasks: number;
  overdue_tasks: number;
  active_plots: number;
  active_plot_area_ha: string;
  active_partners: number;
  activities_this_month: number;
  pending_finance: number;
  pending_workplans: number;
  draft_journals: number;
  posted_journals: number;
}

interface FinanceSummary {
  cash_balance: string;
  bank_balance: string;
  revenue_total: string;
  expense_total: string;
  surplus: string;
  posted_count: number;
}

interface ProgramSummary {
  field_key: string;
  total_count: number;
  draft_count: number;
  planned_count: number;
  active_count: number;
  completed_count: number;
  paused_count: number;
  cancelled_count: number;
}

interface AgendaItem {
  id: string;
  kind: "rapat" | "kegiatan" | "tugas";
  title: string;
  event_date: string;
  time_label: string | null;
  detail: string | null;
  href: string;
}

interface ChartDay {
  day: string;
  activity_count: number;
  task_count: number;
  journal_count: number;
}

interface AuditItem {
  action: string;
  entity_type: string;
  actor_name: string;
  occurred_at: string;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function dateLabel(value: string): string {
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(date);
}

function dateTimeLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(date);
}

function actionLabel(value: string): string {
  return value
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export default async function PengurusDashboard() {
  const identity = await requireIdentity("organization:read");
  let summary: DashboardSummary | null = null;
  let finance: FinanceSummary | null = null;
  let programs: ProgramSummary[] = [];
  let agenda: AgendaItem[] = [];
  let chartDays: ChartDay[] = [];
  let audit: AuditItem[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [summaryResult, financeResult, programResult, agendaResult, chartResult, auditResult] =
      await Promise.all([
        sql`
          SELECT
            (SELECT count(*)::int FROM v9.memberships AS membership
              WHERE membership.organization_id = ${identity.organizationId}
                AND membership.status = 'active'
                AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
                AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
            ) AS active_members,
            (SELECT count(*)::int FROM v9.membership_interests AS interest
              WHERE interest.organization_id = ${identity.organizationId}
                AND interest.status IN ('submitted', 'under_review')
            ) AS pending_membership_interests,
            (SELECT count(*)::int FROM v9.field_tasks AS task
              WHERE task.organization_id = ${identity.organizationId}
                AND task.status NOT IN ('selesai', 'dibatalkan')
            ) AS open_tasks,
            (SELECT count(*)::int FROM v9.field_tasks AS task
              WHERE task.organization_id = ${identity.organizationId}
                AND task.status NOT IN ('selesai', 'dibatalkan')
                AND task.due_date < (now() AT TIME ZONE 'Asia/Jakarta')::date
            ) AS overdue_tasks,
            (SELECT count(*)::int FROM v9.agriculture_plots AS plot
              WHERE plot.organization_id = ${identity.organizationId} AND plot.status = 'active'
            ) AS active_plots,
            (SELECT COALESCE(sum(plot.area_ha), 0)::text FROM v9.agriculture_plots AS plot
              WHERE plot.organization_id = ${identity.organizationId} AND plot.status = 'active'
            ) AS active_plot_area_ha,
            (SELECT count(*)::int FROM v9.business_partners AS partner
              WHERE partner.organization_id = ${identity.organizationId} AND partner.status = 'active'
            ) AS active_partners,
            (SELECT count(*)::int FROM v9.field_activities AS activity
              WHERE activity.organization_id = ${identity.organizationId}
                AND activity.activity_date >= date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta')::date
                AND activity.activity_date < (date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') + interval '1 month')::date
            ) AS activities_this_month,
            (SELECT count(*)::int FROM v9.finance_journals AS journal
              WHERE journal.organization_id = ${identity.organizationId} AND journal.status = 'submitted'
            ) AS pending_finance,
            (SELECT count(*)::int FROM v9.field_workplans AS workplan
              WHERE workplan.organization_id = ${identity.organizationId} AND workplan.status = 'submitted'
            ) AS pending_workplans,
            (SELECT count(*)::int FROM v9.finance_journals AS journal
              WHERE journal.organization_id = ${identity.organizationId} AND journal.status = 'draft'
            ) AS draft_journals,
            (SELECT count(*)::int FROM v9.finance_journals AS journal
              WHERE journal.organization_id = ${identity.organizationId} AND journal.status = 'posted'
            ) AS posted_journals
        `,
        sql`
          SELECT
            COALESCE(sum(line.debit - line.credit) FILTER (WHERE account.account_code = '1-1000'), 0)::text AS cash_balance,
            COALESCE(sum(line.debit - line.credit) FILTER (WHERE account.account_code = '1-1100'), 0)::text AS bank_balance,
            COALESCE(sum(line.credit - line.debit) FILTER (WHERE account.account_type = 'pendapatan'), 0)::text AS revenue_total,
            COALESCE(sum(line.debit - line.credit) FILTER (WHERE account.account_type = 'beban'), 0)::text AS expense_total,
            (COALESCE(sum(line.credit - line.debit) FILTER (WHERE account.account_type = 'pendapatan'), 0)
              - COALESCE(sum(line.debit - line.credit) FILTER (WHERE account.account_type = 'beban'), 0))::text AS surplus,
            count(DISTINCT journal.id)::int AS posted_count
          FROM v9.finance_journals AS journal
          INNER JOIN v9.finance_journal_lines AS line
            ON line.journal_id = journal.id AND line.organization_id = journal.organization_id
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id AND account.organization_id = line.organization_id
          WHERE journal.organization_id = ${identity.organizationId} AND journal.status = 'posted'
        `,
        sql`
          SELECT
            field_key,
            count(*)::int AS total_count,
            count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
            count(*) FILTER (WHERE status = 'planned')::int AS planned_count,
            count(*) FILTER (WHERE status = 'active')::int AS active_count,
            count(*) FILTER (WHERE status = 'completed')::int AS completed_count,
            count(*) FILTER (WHERE status = 'paused')::int AS paused_count,
            count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count
          FROM v9.field_programs
          WHERE organization_id = ${identity.organizationId}
          GROUP BY field_key
        `,
        sql`
          SELECT *
          FROM (
            SELECT meeting.id::text AS id, 'rapat'::text AS kind, meeting.title,
              meeting.meeting_date::text AS event_date, meeting.time_label,
              meeting.location AS detail, '/app/sekretariat/rapat'::text AS href
            FROM v9.secretariat_meetings AS meeting
            WHERE meeting.organization_id = ${identity.organizationId}
              AND meeting.status = 'scheduled'
              AND meeting.meeting_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
            UNION ALL
            SELECT activity.id::text AS id, 'kegiatan'::text AS kind, activity.title,
              activity.activity_date::text AS event_date,
              to_char(activity.start_time, 'HH24:MI') AS time_label,
              activity.location AS detail, '/app/sekretariat/agenda'::text AS href
            FROM v9.field_activities AS activity
            WHERE activity.organization_id = ${identity.organizationId}
              AND activity.status IN ('scheduled', 'in_progress')
              AND activity.activity_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
            UNION ALL
            SELECT task.id::text AS id, 'tugas'::text AS kind, task.title,
              task.due_date::text AS event_date, 'Tenggat'::text AS time_label,
              task.assignee_label AS detail, '/app/pengurus/tugas'::text AS href
            FROM v9.field_tasks AS task
            WHERE task.organization_id = ${identity.organizationId}
              AND task.status NOT IN ('selesai', 'dibatalkan')
              AND task.due_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
              AND task.due_date <= (now() AT TIME ZONE 'Asia/Jakarta')::date + 14
          ) AS items
          ORDER BY event_date ASC, time_label ASC NULLS LAST
          LIMIT 8
        `,
        sql`
          WITH days AS (
            SELECT generate_series(
              ((now() AT TIME ZONE 'Asia/Jakarta')::date - 29)::timestamp,
              (now() AT TIME ZONE 'Asia/Jakarta')::date::timestamp,
              interval '1 day'
            )::date AS day
          )
          SELECT
            to_char(days.day, 'YYYY-MM-DD') AS day,
            (SELECT count(*)::int FROM v9.field_activities AS activity
              WHERE activity.organization_id = ${identity.organizationId} AND activity.activity_date = days.day
            ) AS activity_count,
            (SELECT count(*)::int FROM v9.field_tasks AS task
              WHERE task.organization_id = ${identity.organizationId}
                AND (task.created_at AT TIME ZONE 'Asia/Jakarta')::date = days.day
            ) AS task_count,
            (SELECT count(*)::int FROM v9.finance_journals AS journal
              WHERE journal.organization_id = ${identity.organizationId}
                AND (journal.created_at AT TIME ZONE 'Asia/Jakarta')::date = days.day
            ) AS journal_count
          FROM days
          ORDER BY days.day
        `,
        sql`
          SELECT
            event.action,
            event.entity_type,
            COALESCE(person.preferred_name, person.full_name, account.email, 'Sistem') AS actor_name,
            event.occurred_at::text AS occurred_at
          FROM v9.audit_events AS event
          LEFT JOIN v9.user_accounts AS account ON account.id = event.actor_user_id
          LEFT JOIN v9.people AS person ON person.id = account.person_id
          WHERE event.organization_id = ${identity.organizationId}
          ORDER BY event.occurred_at DESC
          LIMIT 6
        `,
      ]);

    summary = rowsFromResult<DashboardSummary>(summaryResult)[0] ?? null;
    finance = rowsFromResult<FinanceSummary>(financeResult)[0] ?? null;
    programs = rowsFromResult<ProgramSummary>(programResult);
    agenda = rowsFromResult<AgendaItem>(agendaResult);
    chartDays = rowsFromResult<ChartDay>(chartResult);
    audit = rowsFromResult<AuditItem>(auditResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-dashboard] Source unavailable", safeErrorType(reason));
  }

  const programCount = (key: keyof ProgramSummary) =>
    programs.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  const programTotal = programCount("total_count");
  const programActive = programCount("active_count");
  const programCompleted = programCount("completed_count");
  const programPlanned = programCount("planned_count");
  const programPaused = programCount("paused_count");
  const programDraft = programCount("draft_count");
  const programCancelled = programCount("cancelled_count");

  const chartDays14 = chartDays.slice(-14);
  const chartLabels = { "14d": chartDays14.map((row) => dateLabel(row.day)) };
  const chartSeries = [
    { key: "kegiatan", label: "Kegiatan", color: "#127e2f", points: chartDays14.map((row) => row.activity_count) },
    { key: "tugas", label: "Tugas dibuat", color: "#1f6fd0", points: chartDays14.map((row) => row.task_count) },
    { key: "jurnal", label: "Jurnal dibuat", color: "#e8a012", points: chartDays14.map((row) => row.journal_count) },
  ];

  const kpis: Kpi[] = summary && finance
    ? [
        {
          label: "Anggota Aktif",
          value: String(summary.active_members),
          delta: summary.pending_membership_interests ? String(summary.pending_membership_interests) + " pendaftar menunggu" : undefined,
          note: "Keanggotaan yang berlaku hari ini",
          href: "/app/pengurus/anggota",
          tone: "green",
          icon: <Users size={15} />,
          watermark: <Users size={62} strokeWidth={1.6} />,
        },
        {
          label: "Luas Lahan Terdata",
          value: Number(summary.active_plot_area_ha).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " Ha",
          note: summary.active_plots + " petak pertanian aktif",
          href: "/app/bidang/pertanian",
          tone: "blue",
          icon: <Sprout size={15} />,
          watermark: <Sprout size={62} strokeWidth={1.6} />,
        },
        {
          label: "Saldo Kas & Bank",
          value: formatIDR(Number(finance.cash_balance) + Number(finance.bank_balance)),
          note: "Jurnal terposting saja",
          href: "/app/keuangan/kas-bank",
          tone: "amber",
          icon: <Wallet size={15} />,
          watermark: <Wallet size={62} strokeWidth={1.6} />,
        },
        {
          label: "Kegiatan Bulan Ini",
          value: String(summary.activities_this_month),
          note: "Agenda kegiatan terdaftar",
          href: "/app/sekretariat/agenda",
          tone: "violet",
          icon: <CalendarDays size={15} />,
          watermark: <CalendarDays size={62} strokeWidth={1.6} />,
        },
        {
          label: "Mitra Aktif",
          value: String(summary.active_partners),
          note: "Mitra berstatus aktif",
          href: "/app/bidang/usaha/mitra",
          tone: "teal",
          icon: <Handshake size={15} />,
          watermark: <Handshake size={62} strokeWidth={1.6} />,
        },
      ]
    : [];

  const recentItems = audit.map((event) => {
    const type = event.entity_type.toLowerCase();
    const isMoney = type.includes("finance") || type.includes("journal") || type.includes("payment");
    const isSecretary = type.includes("secretariat") || type.includes("meeting") || type.includes("document");
    return {
      title: actionLabel(event.action),
      meta: actionLabel(event.entity_type) + " · " + event.actor_name + " · " + dateTimeLabel(event.occurred_at),
      pill: isMoney ? "Keuangan" : isSecretary ? "Sekretariat" : "Organisasi",
      pillClass: isMoney
        ? "bg-[#fdf6e8] text-[#7a5210] ring-[#ecd9a6]"
        : isSecretary
          ? "bg-[#eef5fd] text-[#0f3f6d] ring-[#bfd6ee]"
          : "bg-[#eef8ef] text-[#14532a] ring-[#bfe2c4]",
      icon: isMoney ? <Wallet size={13} /> : isSecretary ? <FileText size={13} /> : <Check size={13} />,
      iconClass: isMoney ? "bg-[#fdf6e8] text-[#b07c0a]" : isSecretary ? "bg-[#eef5fd] text-[#1f6fd0]" : "bg-[#eaf6ec] text-[#127e2f]",
    };
  });

  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.pengurus}
        badge={<Badge tone="info">Sumber data organisasi</Badge>}
        facts={
          summary
            ? [
                summary.active_members + " anggota aktif",
                (summary.pending_membership_interests + summary.pending_finance + summary.pending_workplans) + " item menunggu pemeriksaan",
                summary.open_tasks + " tugas terbuka",
                summary.overdue_tasks + " tugas melewati tenggat",
              ]
            : ["Ringkasan data belum tersedia"]
        }
        actions={[
          { href: "/app/pengurus/persetujuan", label: "Kotak Persetujuan", primary: true },
          { href: "/app/pengurus/tugas", label: "Kelola Tugas" },
        ]}
      />

      {unavailable ? (
        <div className="mt-4">
          <Notice tone="warning" title="Ringkasan organisasi belum dapat dimuat">
            Sumber data organisasi sedang tidak tersedia. Angka dan grafik disembunyikan sementara
            agar gangguan koneksi tidak terbaca sebagai saldo atau jumlah nol.
          </Notice>
        </div>
      ) : null}

      {summary && finance ? (
        <>
          <div className="mt-3"><KpiStrip items={kpis} /></div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.62fr)_minmax(300px,1fr)]">
            <div className="min-w-0 space-y-3">
              <ActivityChart
                title="Aktivitas Organisasi"
                subtitle="Kegiatan, tugas baru, dan jurnal yang tercatat dalam 14 hari terakhir"
                ranges={[{ key: "14d", label: "14 Hari" }]}
                labels={chartLabels}
                series={chartSeries}
                icon={<Activity size={16} />}
              />

              <RecentCard items={recentItems} href="/app/pengurus/laporan" linkLabel="Lihat jejak audit" />

              <Card>
                <CardHeader
                  title="Kinerja empat bidang"
                  subtitle="Program yang tercatat pada masing-masing bidang"
                  action={<Link href="/app/bidang" className="text-[11.5px] font-semibold text-primary-700">Semua bidang <ArrowRight size={12} className="inline" /></Link>}
                />
                <div className="grid gap-2 p-3 sm:grid-cols-2">
                  {FIELDS.map((field) => {
                    const data = programs.find((item) => item.field_key === field.slug);
                    const total = data?.total_count ?? 0;
                    const completed = data?.completed_count ?? 0;
                    const active = data?.active_count ?? 0;
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    return (
                      <Link
                        key={field.fieldId}
                        href={field.appHref}
                        className="group flex min-w-0 items-center gap-3 rounded-[12px] border border-line bg-white p-3 transition hover:border-primary-300 hover:shadow-[var(--sb-shadow)]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: field.accent }}>
                          {field.slug === "organisasi" ? <Users size={17} /> : field.slug === "pertanian" ? <Sprout size={17} /> : field.slug === "pelatihan" ? <GraduationCap size={17} /> : <Store size={17} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1">
                            <span className="truncate text-[12px] font-semibold text-ink">{field.shortName}</span>
                            <ArrowRight size={12} className="shrink-0 text-muted2 transition group-hover:translate-x-0.5 group-hover:text-primary-700" />
                          </span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#eef1ee]">
                            <span className="block h-full rounded-full" style={{ width: percent + "%", background: field.accent }} />
                          </span>
                          <span className="mt-1 block text-[10px] text-muted2">
                            {total} program · {active} aktif · {completed} selesai
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="min-w-0 space-y-3">
              <DonutCard
                title="Status Program"
                total={programTotal}
                centerLabel="Aktif / selesai"
                headline={programActive + programCompleted}
                segments={[
                  { label: "Aktif", value: programActive, color: "#2fa84f" },
                  { label: "Selesai", value: programCompleted, color: "#127e2f" },
                  { label: "Direncanakan", value: programPlanned, color: "#1f6fd0" },
                  { label: "Ditunda", value: programPaused, color: "#e8a012" },
                  { label: "Draf", value: programDraft, color: "#87949a" },
                  { label: "Dibatalkan", value: programCancelled, color: "#c65d5d" },
                ]}
                legendNote={programTotal + " program tercatat"}
              />

              <Card>
                <CardHeader title="Agenda & tenggat mendatang" action={<CalendarDays size={16} className="text-muted2" />} />
                {agenda.length ? (
                  <div className="divide-y divide-line">
                    {agenda.map((item) => (
                      <article key={item.kind + item.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge tone={item.kind === "rapat" ? "info" : item.kind === "tugas" ? "warning" : "success"}>
                            {item.kind === "rapat" ? "Rapat" : item.kind === "tugas" ? "Tenggat tugas" : "Kegiatan"}
                          </Badge>
                          <span className="text-[10px] font-semibold text-muted2">
                            {dateLabel(item.event_date)}{item.time_label ? " · " + item.time_label : ""}
                          </span>
                        </div>
                        <Link href={item.href} className="mt-1.5 block text-[12px] font-semibold text-ink hover:text-primary-700">
                          {item.title}
                        </Link>
                        {item.detail ? <p className="mt-0.5 text-[10.5px] text-muted">{item.detail}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-7">
                    <EmptyState title="Belum ada agenda mendatang" body="Rapat, kegiatan, dan tenggat tugas akan tampil setelah tersimpan." />
                  </div>
                )}
              </Card>

              <QuickAccess
                items={[
                  { label: "Persetujuan", href: "/app/pengurus/persetujuan", icon: <ClipboardCheck size={14} />, tone: "green" },
                  { label: "Anggota", href: "/app/pengurus/anggota", icon: <Users size={14} />, tone: "blue" },
                  { label: "Laporan", href: "/app/keuangan/laporan", icon: <BarChart3 size={14} />, tone: "violet" },
                  { label: "Keuangan", href: "/app/keuangan", icon: <Wallet size={14} />, tone: "orange" },
                  { label: "Kemitraan", href: "/app/bidang/usaha/mitra", icon: <Handshake size={14} />, tone: "teal" },
                  { label: "Dokumen", href: "/app/sekretariat/dokumen", icon: <FileText size={14} />, tone: "blue" },
                ]}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Card>
              <CardHeader title="Ringkasan keuangan" subtitle="Semua nilai dari jurnal terposting" action={<Link href="/app/keuangan" className="text-[11px] font-semibold text-primary-700">Buka <ArrowRight size={11} className="inline" /></Link>} />
              <dl className="divide-y divide-line text-[11.5px]">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5"><dt className="text-muted">Pendapatan</dt><dd className="font-semibold tabular-nums text-[var(--sb-success)]">{formatIDR(Number(finance.revenue_total))}</dd></div>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5"><dt className="text-muted">Beban</dt><dd className="font-semibold tabular-nums text-[var(--sb-danger)]">{formatIDR(Number(finance.expense_total))}</dd></div>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5"><dt className="text-muted">Surplus / defisit</dt><dd className="font-semibold tabular-nums text-ink">{formatIDR(Number(finance.surplus))}</dd></div>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5"><dt className="text-muted">Kas</dt><dd className="font-medium tabular-nums text-ink">{formatIDR(Number(finance.cash_balance))}</dd></div>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5"><dt className="text-muted">Bank</dt><dd className="font-medium tabular-nums text-ink">{formatIDR(Number(finance.bank_balance))}</dd></div>
              </dl>
              <p className="border-t border-line px-4 py-2.5 text-[10px] text-muted2">
                {finance.posted_count} jurnal terposting · {summary.draft_journals} draf · {summary.posted_journals} total jurnal terposting
              </p>
            </Card>

            <Card>
              <CardHeader title="Pemeriksaan & tindak lanjut" action={<Landmark size={16} className="text-muted2" />} />
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-[11.5px] text-muted">Pendaftaran anggota</span><strong className="text-[13px] tabular-nums text-ink">{summary.pending_membership_interests}</strong></div>
                <div className="flex items-center justify-between gap-2"><span className="text-[11.5px] text-muted">Jurnal menunggu pemeriksaan</span><strong className="text-[13px] tabular-nums text-ink">{summary.pending_finance}</strong></div>
                <div className="flex items-center justify-between gap-2"><span className="text-[11.5px] text-muted">Rencana kerja bidang</span><strong className="text-[13px] tabular-nums text-ink">{summary.pending_workplans}</strong></div>
                <div className="flex items-center justify-between gap-2"><span className="text-[11.5px] text-muted">Tugas melewati tenggat</span><strong className={"text-[13px] tabular-nums " + (summary.overdue_tasks ? "font-bold text-[var(--sb-danger)]" : "font-semibold text-ink")}>{summary.overdue_tasks}</strong></div>
                <div className="border-t border-line pt-2">
                  <Link href="/app/pengurus/persetujuan" className="sb-btn sb-btn-outline !h-8 w-full !px-3 text-[10.5px]">Buka Kotak Persetujuan <ArrowRight size={12} /></Link>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Kontrol organisasi" action={<ShieldCheck size={16} className="text-muted2" />} />
              <div className="space-y-2 p-4">
                <p className="text-[11.5px] leading-relaxed text-muted">
                  Dasbor ini hanya membaca ringkasan dari modul sumber. Pengesahan anggota, rencana kerja,
                  jurnal, dan perubahan data tetap dilakukan pada modul pemiliknya serta dicatat pada jejak audit.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="success">Terbatas per organisasi</Badge>
                  <Badge tone="info">Audit trail</Badge>
                  <Badge tone="neutral">Baca ringkasan</Badge>
                </div>
                <div className="border-t border-line pt-2 text-[10.5px] text-muted2">
                  Akun: {identity.name}
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
