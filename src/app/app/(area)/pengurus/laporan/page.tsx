import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Handshake,
  Leaf,
  Sprout,
  Users,
  Wallet,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
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
import { can, requireIdentity } from "@/lib/session";
import { formatDateID, formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan Organisasi" };

interface ReportSummary {
  active_members: number;
  pending_member_interests: number;
  active_plots: number;
  active_plot_area: string;
  total_programs: number;
  active_programs: number;
  completed_programs: number;
  activities_period: number;
  open_tasks: number;
  overdue_tasks: number;
  active_partners: number;
  training_sessions: number;
  completed_training_sessions: number;
  training_attendance: number;
  harvest_records: number;
  harvest_weight_kg: string;
}

interface HarvestRow {
  commodity: string;
  harvest_records: number;
  total_weight_kg: string;
  latest_harvest_date: string | null;
}

interface FieldProgramRow {
  field_key: string;
  program_count: number;
  active_count: number;
  completed_count: number;
  planned_count: number;
}

interface FinanceSummary {
  active_accounts: number;
  posted_journals: number;
  revenue_total: string;
  expense_total: string;
  cash_balance: string;
  bank_balance: string;
}

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function jakartaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function weight(value: string | number): string {
  const n = Number(value);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0) + " kg";
}

export default async function PengurusLaporanPage({
  searchParams,
}: {
  searchParams?: Promise<{ start?: string; end?: string }>;
}) {
  const identity = await requireIdentity("organization:read");
  const canReadFinance = can(identity, "finance:read");
  const params = await searchParams;
  const today = jakartaToday();
  const startParam = params?.start;
  const endParam = params?.end;
  const start = validDate(startParam) ? startParam : today.slice(0, 4) + "-01-01";
  const end = validDate(endParam) ? endParam : today;
  const validRange = start <= end;

  let summary: ReportSummary | null = null;
  let harvests: HarvestRow[] = [];
  let fieldPrograms: FieldProgramRow[] = [];
  let finance: FinanceSummary | null = null;
  let unavailable = false;

  if (validRange) {
    try {
      const sql = getV9Sql();
      const [summaryResult, harvestResult, fieldResult] = await Promise.all([
        sql`
          SELECT
            (
              SELECT count(*)::int
              FROM v9.memberships AS membership
              INNER JOIN v9.people AS person
                ON person.id = membership.person_id
                AND person.status = 'active'
              WHERE membership.organization_id = ${identity.organizationId}
                AND membership.status = 'active'
                AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
                AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
            ) AS active_members,
            (
              SELECT count(*)::int
              FROM v9.membership_interests AS interest
              WHERE interest.organization_id = ${identity.organizationId}
                AND interest.status IN ('submitted', 'under_review')
            ) AS pending_member_interests,
            (
              SELECT count(*)::int
              FROM v9.agriculture_plots AS plot
              WHERE plot.organization_id = ${identity.organizationId}
                AND plot.status = 'active'
            ) AS active_plots,
            (
              SELECT COALESCE(sum(plot.area_ha), 0)::text
              FROM v9.agriculture_plots AS plot
              WHERE plot.organization_id = ${identity.organizationId}
                AND plot.status = 'active'
            ) AS active_plot_area,
            (
              SELECT count(*)::int
              FROM v9.field_programs AS program
              WHERE program.organization_id = ${identity.organizationId}
            ) AS total_programs,
            (
              SELECT count(*)::int
              FROM v9.field_programs AS program
              WHERE program.organization_id = ${identity.organizationId}
                AND program.status = 'active'
            ) AS active_programs,
            (
              SELECT count(*)::int
              FROM v9.field_programs AS program
              WHERE program.organization_id = ${identity.organizationId}
                AND program.status = 'completed'
            ) AS completed_programs,
            (
              SELECT count(*)::int
              FROM v9.field_activities AS activity
              WHERE activity.organization_id = ${identity.organizationId}
                AND activity.activity_date BETWEEN ${start}::date AND ${end}::date
                AND activity.status <> 'cancelled'
            ) AS activities_period,
            (
              SELECT count(*)::int
              FROM v9.field_tasks AS task
              WHERE task.organization_id = ${identity.organizationId}
                AND task.status IN ('belum', 'proses')
            ) AS open_tasks,
            (
              SELECT count(*)::int
              FROM v9.field_tasks AS task
              WHERE task.organization_id = ${identity.organizationId}
                AND task.status IN ('belum', 'proses')
                AND task.due_date < (now() AT TIME ZONE 'Asia/Jakarta')::date
            ) AS overdue_tasks,
            (
              SELECT count(*)::int
              FROM v9.business_partners AS partner
              WHERE partner.organization_id = ${identity.organizationId}
                AND partner.status = 'active'
            ) AS active_partners,
            (
              SELECT count(*)::int
              FROM v9.training_sessions AS session
              WHERE session.organization_id = ${identity.organizationId}
                AND session.session_date BETWEEN ${start}::date AND ${end}::date
                AND session.status <> 'cancelled'
            ) AS training_sessions,
            (
              SELECT count(*)::int
              FROM v9.training_sessions AS session
              WHERE session.organization_id = ${identity.organizationId}
                AND session.session_date BETWEEN ${start}::date AND ${end}::date
                AND session.status = 'completed'
            ) AS completed_training_sessions,
            (
              SELECT count(*)::int
              FROM v9.training_enrollments AS enrollment
              INNER JOIN v9.training_sessions AS session
                ON session.id = enrollment.session_id
                AND session.organization_id = enrollment.organization_id
              WHERE enrollment.organization_id = ${identity.organizationId}
                AND session.session_date BETWEEN ${start}::date AND ${end}::date
                AND enrollment.attendance_status = 'hadir'
            ) AS training_attendance,
            (
              SELECT count(*)::int
              FROM v9.agriculture_harvests AS harvest
              WHERE harvest.organization_id = ${identity.organizationId}
                AND harvest.harvest_date BETWEEN ${start}::date AND ${end}::date
            ) AS harvest_records,
            (
              SELECT COALESCE(sum(harvest.weight_kg), 0)::text
              FROM v9.agriculture_harvests AS harvest
              WHERE harvest.organization_id = ${identity.organizationId}
                AND harvest.harvest_date BETWEEN ${start}::date AND ${end}::date
            ) AS harvest_weight_kg
        `,
        sql`
          SELECT
            harvest.commodity,
            count(*)::int AS harvest_records,
            COALESCE(sum(harvest.weight_kg), 0)::text AS total_weight_kg,
            max(harvest.harvest_date)::text AS latest_harvest_date
          FROM v9.agriculture_harvests AS harvest
          WHERE harvest.organization_id = ${identity.organizationId}
            AND harvest.harvest_date BETWEEN ${start}::date AND ${end}::date
          GROUP BY harvest.commodity
          ORDER BY sum(harvest.weight_kg) DESC, harvest.commodity
          LIMIT 30
        `,
        sql`
          SELECT
            field_key,
            count(*)::int AS program_count,
            count(*) FILTER (WHERE status = 'active')::int AS active_count,
            count(*) FILTER (WHERE status = 'completed')::int AS completed_count,
            count(*) FILTER (WHERE status = 'planned')::int AS planned_count
          FROM v9.field_programs
          WHERE organization_id = ${identity.organizationId}
          GROUP BY field_key
          ORDER BY field_key
        `,
      ]);

      summary = rowsFromResult<ReportSummary>(summaryResult)[0] ?? null;
      harvests = rowsFromResult<HarvestRow>(harvestResult);
      fieldPrograms = rowsFromResult<FieldProgramRow>(fieldResult);

      if (canReadFinance) {
        const financeResult = await sql`
          SELECT
            count(DISTINCT account.id)::int AS active_accounts,
            count(DISTINCT journal.id)::int AS posted_journals,
            COALESCE(sum(line.credit - line.debit) FILTER (
              WHERE account.account_type = 'pendapatan'
                AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
            ), 0)::text AS revenue_total,
            COALESCE(sum(line.debit - line.credit) FILTER (
              WHERE account.account_type = 'beban'
                AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
            ), 0)::text AS expense_total,
            COALESCE(sum(line.debit - line.credit) FILTER (
              WHERE account.account_code = '1-1000'
                AND journal.journal_date <= ${end}::date
            ), 0)::text AS cash_balance,
            COALESCE(sum(line.debit - line.credit) FILTER (
              WHERE account.account_code = '1-1100'
                AND journal.journal_date <= ${end}::date
            ), 0)::text AS bank_balance
          FROM v9.finance_accounts AS account
          LEFT JOIN v9.finance_journal_lines AS line
            ON line.account_id = account.id
            AND line.organization_id = account.organization_id
          LEFT JOIN v9.finance_journals AS journal
            ON journal.id = line.journal_id
            AND journal.organization_id = line.organization_id
            AND journal.status = 'posted'
            AND journal.journal_date <= ${end}::date
          WHERE account.organization_id = ${identity.organizationId}
            AND account.status = 'active'
        `;
        finance = rowsFromResult<FinanceSummary>(financeResult)[0] ?? null;
      }
    } catch (reason) {
      unavailable = true;
      console.warn("[pengurus-reports] Source unavailable", safeErrorType(reason));
    }
  }

  const hasFinanceAccounts = Boolean(finance && finance.active_accounts > 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Laporan organisasi"
        description="Ringkasan kegiatan, anggota, program, pertanian, kemitraan, pelatihan, dan keuangan dari catatan yang tersimpan."
        actions={<Badge tone="info">Sumber data organisasi</Badge>}
      />

      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label htmlFor="report-start" className="mb-1 block text-[10.5px] font-semibold text-muted">Tanggal awal</label>
            <input id="report-start" name="start" type="date" defaultValue={start} className="sb-input" />
          </div>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="report-end" className="mb-1 block text-[10.5px] font-semibold text-muted">Tanggal akhir</label>
            <input id="report-end" name="end" type="date" defaultValue={end} className="sb-input" />
          </div>
          <button type="submit" className="sb-btn sb-btn-primary !h-10">Terapkan periode</button>
          <Link href="/app/pengurus/laporan" className="sb-btn sb-btn-outline !h-10">Tahun berjalan</Link>
        </form>
        <div className="mt-2 text-[10.5px] text-muted2">
          Periode {formatDateID(start, "short")} sampai {formatDateID(end, "short")} · Waktu Asia/Jakarta
        </div>
      </Card>

      {!validRange ? (
        <div className="mb-4">
          <Notice tone="warning" title="Rentang tanggal tidak valid">
            Tanggal awal tidak boleh melewati tanggal akhir. Silakan pilih ulang periode.
          </Notice>
        </div>
      ) : null}

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Sumber laporan belum dapat dimuat">
            Satu atau lebih sumber data organisasi sedang tidak tersedia. Laporan tidak mengganti data
            yang gagal dimuat dengan angka contoh.
          </Notice>
        </div>
      ) : null}

      {validRange && !unavailable && summary ? (
        <>
          <div className="mb-4">
            <Notice tone="info" title="Cakupan laporan">
              Anggota, lahan, program, mitra, dan tugas menunjukkan posisi saat ini. Kegiatan, pelatihan,
              kehadiran pelatihan, dan panen mengikuti rentang tanggal di atas. Nilai usulan program bukan
              anggaran yang disahkan dan tidak dihitung sebagai realisasi.
            </Notice>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Anggota aktif" value={summary.active_members} note={summary.pending_member_interests + " pendaftaran menunggu"} tone="info" icon={<Users size={17} />} />
            <StatCard label="Lahan aktif" value={summary.active_plots} note={Number(summary.active_plot_area).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " Ha terdata"} tone="success" icon={<Sprout size={17} />} />
            <StatCard label="Program" value={summary.total_programs} note={summary.active_programs + " berjalan · " + summary.completed_programs + " selesai"} tone="info" icon={<ClipboardList size={17} />} />
            <StatCard label="Kegiatan" value={summary.activities_period} note="Kegiatan non-batal pada periode" tone="neutral" icon={<CalendarDays size={17} />} />
            <StatCard label="Panen tercatat" value={weight(summary.harvest_weight_kg)} note={summary.harvest_records + " catatan panen"} tone="success" icon={<Leaf size={17} />} />
            <StatCard label="Pelatihan" value={summary.training_sessions} note={summary.completed_training_sessions + " sesi selesai"} tone="info" icon={<GraduationCap size={17} />} />
            <StatCard label="Kehadiran pelatihan" value={summary.training_attendance} note="Status hadir tercatat" tone="success" icon={<Users size={17} />} />
            <StatCard label="Tugas terbuka" value={summary.open_tasks} note={summary.overdue_tasks + " melewati tenggat"} tone={summary.overdue_tasks ? "warning" : "neutral"} icon={<AlertTriangle size={17} />} />
            <StatCard label="Mitra aktif" value={summary.active_partners} note="Hubungan kemitraan berstatus aktif" tone="info" icon={<Handshake size={17} />} />
          </div>

          <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Produksi panen per komoditas" subtitle="Total berat hasil panen yang tersimpan dalam periode" action={<Badge tone="success">Catatan lapangan</Badge>} />
              {harvests.length ? (
                <div className="sb-scroll">
                  <table className="sb-table min-w-[560px]">
                    <thead><tr><th>Komoditas</th><th className="num">Catatan</th><th className="num">Berat</th><th>Panen terakhir</th></tr></thead>
                    <tbody>
                      {harvests.map((row) => (
                        <tr key={row.commodity}>
                          <td className="font-medium text-ink">{row.commodity}</td>
                          <td className="num tabular-nums text-muted">{row.harvest_records}</td>
                          <td className="num font-semibold tabular-nums text-ink">{weight(row.total_weight_kg)}</td>
                          <td className="text-muted">{row.latest_harvest_date ? formatDateID(row.latest_harvest_date, "short") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4"><EmptyState title="Belum ada panen pada periode ini" body="Hasil panen akan tercatat setelah dimasukkan melalui modul Pertanian." /></div>
              )}
            </Card>

            <Card>
              <CardHeader title="Program per bidang" subtitle="Status program yang terdaftar pada sistem" />
              {fieldPrograms.length ? (
                <div className="divide-y divide-line">
                  {fieldPrograms.map((row) => {
                    const field = FIELDS.find((item) => item.slug === row.field_key);
                    return (
                      <div key={row.field_key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-ink">{field?.shortName ?? row.field_key}</div>
                          <div className="mt-0.5 text-[10.5px] text-muted2">{row.program_count} program · {row.active_count} berjalan · {row.completed_count} selesai · {row.planned_count} direncanakan</div>
                        </div>
                        {field ? <Link href={field.appHref} className="text-[10.5px] font-semibold text-primary-700">Buka bidang <ArrowRight size={11} className="inline" /></Link> : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4"><EmptyState title="Belum ada program bidang" body="Program yang tersimpan akan ditampilkan berdasarkan bidang pemilik." /></div>
              )}
            </Card>
          </div>

          {canReadFinance ? (
            <Card className="mt-4">
              <CardHeader title="Ringkasan keuangan" subtitle="Jurnal terposting dalam periode dan saldo kas/bank sampai tanggal akhir" action={<Badge tone="warning">Bahan kerja internal</Badge>} />
              {hasFinanceAccounts && finance ? (
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Pendapatan" value={formatIDR(Number(finance.revenue_total))} note="Periode laporan" tone="success" icon={<Wallet size={16} />} />
                  <StatCard label="Beban" value={formatIDR(Number(finance.expense_total))} note="Periode laporan" tone="danger" />
                  <StatCard label="Kas" value={formatIDR(Number(finance.cash_balance))} note="Sampai tanggal akhir" tone="info" />
                  <StatCard label="Bank" value={formatIDR(Number(finance.bank_balance))} note="Sampai tanggal akhir" tone="info" />
                </div>
              ) : (
                <div className="px-4 pb-4">
                  <Notice tone="warning" title="Bagan akun belum tersedia">
                    Tidak ada akun keuangan aktif pada organisasi ini. Ringkasan keuangan tidak menampilkan
                    angka nol seolah-olah saldo sudah diverifikasi.
                  </Notice>
                </div>
              )}
              <div className="border-t border-line px-4 py-3">
                <Link href="/app/keuangan/laporan" className="text-[11px] font-semibold text-primary-700">Buka laporan buku besar <ArrowRight size={12} className="inline" /></Link>
              </div>
            </Card>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Notice tone="info" title="Sumber laporan">
              Angka dihasilkan dari keanggotaan aktif, program, tugas, kegiatan, lahan, panen, pelatihan,
              kemitraan, dan—bila diizinkan—jurnal organisasi. Tidak ada angka program atau keuangan yang
              diperkirakan dari data kosong.
            </Notice>
            <Notice tone="warning" title="Bukan LPJ final">
              Halaman ini adalah ringkasan operasional. LPJ, laporan hibah, pelaporan lembaga mitra,
              serta laporan keuangan yang telah disahkan memerlukan verifikasi dan persetujuan tersendiri.
            </Notice>
          </div>
        </>
      ) : null}
    </div>
  );
}
