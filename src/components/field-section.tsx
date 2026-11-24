import Link from "next/link";
import { ArrowRight, FileText, Settings2, Users } from "lucide-react";
import {
  Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard, StatusBadge,
} from "@/components/ui";
import type { FieldDef } from "@/config/fields";
import { formatDateID, formatIDR } from "@/lib/format";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

interface FieldApplicationRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  mandate: string | null;
  is_enabled: boolean;
  unit_name: string | null;
}
interface ReportSummary {
  workplan_count: number;
  submitted_workplans: number;
  approved_workplans: number;
  program_count: number;
  active_programs: number;
  completed_programs: number;
  activity_count: number;
  completed_activities: number;
  open_tasks: number;
  overdue_tasks: number;
  indicator_count: number;
  measurable_indicators: number;
  achieved_indicators: number;
}
interface ProgramReportRow {
  id: string;
  reference_no: string;
  title: string;
  status: "draft" | "planned" | "active" | "completed" | "paused" | "cancelled";
  period_start: string | null;
  period_end: string | null;
  indicator_count: number;
  measurable_indicators: number;
  achieved_indicators: number;
}
interface BudgetRequestRow {
  id: string;
  reference_no: string;
  title: string;
  status: ProgramReportRow["status"];
  budget_request: string;
  period_start: string | null;
  period_end: string | null;
}
interface MemberRegisterRow {
  id: string;
  member_number: string | null;
  display_name: string;
  village: string | null;
  position_title: string | null;
  valid_from: string | null;
  status: "pending" | "active";
}
const PROGRAM_STATUS_LABEL: Record<ProgramReportRow["status"], string> = {
  draft: "Draf", planned: "Direncanakan", active: "Berjalan",
  completed: "Selesai", paused: "Ditunda", cancelled: "Dibatalkan",
};
function statusTone(status: ProgramReportRow["status"]): "neutral" | "info" | "warning" | "success" | "danger" {
  if (status === "active") return "success";
  if (status === "completed") return "info";
  if (status === "paused") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}
function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name : "UnknownError";
}
function periodLabel(start: string | null, end: string | null): string {
  if (!start && !end) return "Periode belum dicatat";
  if (start && end) return formatDateID(start, "short") + " – " + formatDateID(end, "short");
  return start ? "Mulai " + formatDateID(start, "short") : "Sampai " + formatDateID(end!, "short");
}
function attainedLabel(row: ProgramReportRow): string {
  if (!row.measurable_indicators) return "Belum ada target dan capaian terukur";
  return row.achieved_indicators + " dari " + row.measurable_indicators + " indikator mencapai target";
}

export async function FieldSectionView({ field, section }: { field: FieldDef; section: string }) {
  const identity = await requireIdentity("field:" + field.slug + ":read");
  const canReadSecretariat = can(identity, "secretariat:read");
  const sql = getV9Sql();

  let application: FieldApplicationRow | null = null;
  let applicationUnavailable = false;
  try {
    const result = await sql`
      SELECT application.field_key, application.name, application.short_name,
        application.route, application.mandate, application.is_enabled,
        unit.name AS unit_name
      FROM v9.field_applications AS application
      LEFT JOIN v9.organization_units AS unit
        ON unit.id = application.unit_id
        AND unit.organization_id = application.organization_id
      WHERE application.organization_id = ${identity.organizationId}
        AND application.field_key = ${field.slug}
      LIMIT 1
    `;
    application = rowsFromResult<FieldApplicationRow>(result)[0] ?? null;
  } catch (reason) {
    applicationUnavailable = true;
    console.warn("[field-section] Application metadata unavailable", safeErrorType(reason));
  }

  let reportSummary: ReportSummary | null = null;
  let reportPrograms: ProgramReportRow[] = [];
  let reportUnavailable = false;
  if (section === "laporan" && !applicationUnavailable) {
    try {
      const [summaryResult, programsResult] = await Promise.all([
        sql`
          SELECT
            (SELECT count(*)::int FROM v9.field_workplans
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}) AS workplan_count,
            (SELECT count(*)::int FROM v9.field_workplans
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status = 'submitted') AS submitted_workplans,
            (SELECT count(*)::int FROM v9.field_workplans
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status IN ('approved','active','completed')) AS approved_workplans,
            (SELECT count(*)::int FROM v9.field_programs
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}) AS program_count,
            (SELECT count(*)::int FROM v9.field_programs
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status = 'active') AS active_programs,
            (SELECT count(*)::int FROM v9.field_programs
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status = 'completed') AS completed_programs,
            (SELECT count(*)::int FROM v9.field_activities
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status <> 'cancelled') AS activity_count,
            (SELECT count(*)::int FROM v9.field_activities
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status = 'completed') AS completed_activities,
            (SELECT count(*)::int FROM v9.field_tasks
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status NOT IN ('selesai','dibatalkan')) AS open_tasks,
            (SELECT count(*)::int FROM v9.field_tasks
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND status NOT IN ('selesai','dibatalkan')
                AND due_date < (now() AT TIME ZONE 'Asia/Jakarta')::date) AS overdue_tasks,
            (SELECT count(*)::int FROM v9.field_program_indicators
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}) AS indicator_count,
            (SELECT count(*)::int FROM v9.field_program_indicators
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND target_value IS NOT NULL AND actual_value IS NOT NULL) AS measurable_indicators,
            (SELECT count(*)::int FROM v9.field_program_indicators
              WHERE organization_id = ${identity.organizationId} AND field_key = ${field.slug}
                AND target_value IS NOT NULL AND actual_value IS NOT NULL
                AND actual_value >= target_value) AS achieved_indicators
        `,
        sql`
          SELECT
            program.id::text AS id,
            program.reference_no,
            program.title,
            program.status,
            program.period_start::text AS period_start,
            program.period_end::text AS period_end,
            count(indicator.id)::int AS indicator_count,
            count(indicator.id) FILTER (
              WHERE indicator.target_value IS NOT NULL AND indicator.actual_value IS NOT NULL
            )::int AS measurable_indicators,
            count(indicator.id) FILTER (
              WHERE indicator.target_value IS NOT NULL AND indicator.actual_value IS NOT NULL
                AND indicator.actual_value >= indicator.target_value
            )::int AS achieved_indicators
          FROM v9.field_programs AS program
          LEFT JOIN v9.field_program_indicators AS indicator
            ON indicator.program_id = program.id
            AND indicator.organization_id = program.organization_id
            AND indicator.field_key = program.field_key
          WHERE program.organization_id = ${identity.organizationId}
            AND program.field_key = ${field.slug}
          GROUP BY program.id, program.reference_no, program.title, program.status,
            program.period_start, program.period_end, program.created_at
          ORDER BY program.created_at DESC
          LIMIT 100
        `,
      ]);
      reportSummary = rowsFromResult<ReportSummary>(summaryResult)[0] ?? null;
      reportPrograms = rowsFromResult<ProgramReportRow>(programsResult);
    } catch (reason) {
      reportUnavailable = true;
      console.warn("[field-section] Report data unavailable", safeErrorType(reason));
    }
  }

  let budgetRequests: BudgetRequestRow[] = [];
  let budgetUnavailable = false;
  if (section === "anggaran" && !applicationUnavailable) {
    try {
      const result = await sql`
        SELECT id::text AS id, reference_no, title, status,
          budget_request::text AS budget_request,
          period_start::text AS period_start, period_end::text AS period_end
        FROM v9.field_programs
        WHERE organization_id = ${identity.organizationId}
          AND field_key = ${field.slug}
          AND budget_request IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 100
      `;
      budgetRequests = rowsFromResult<BudgetRequestRow>(result);
    } catch (reason) {
      budgetUnavailable = true;
      console.warn("[field-section] Budget request data unavailable", safeErrorType(reason));
    }
  }

  let memberRows: MemberRegisterRow[] = [];
  let memberRegisterUnavailable = false;
  if (section === "data" && field.slug === "organisasi" && !applicationUnavailable) {
    try {
      const result = await sql `
        SELECT
          membership.id::text AS id,
          membership.member_number,
          COALESCE(NULLIF(person.preferred_name, ''), person.full_name) AS display_name,
          person.village,
          membership.position_title,
          membership.valid_from::text AS valid_from,
          membership.status
        FROM v9.memberships AS membership
        INNER JOIN v9.people AS person
          ON person.id = membership.person_id
          AND person.status = 'active'
        WHERE membership.organization_id = ${identity.organizationId}
          AND membership.status IN ('pending','active')
        ORDER BY
          CASE membership.status WHEN 'pending' THEN 1 ELSE 2 END,
          person.full_name,
          membership.created_at DESC
        LIMIT 500
      `;
      memberRows = rowsFromResult<MemberRegisterRow>(result);
    } catch (reason) {
      memberRegisterUnavailable = true;
      console.warn("[field-section] Member register unavailable", safeErrorType(reason));
    }
  }

  const titles: Record<string, string> = {
    "profil-mandat": "Profil & Mandat",
    data: "Buku Induk Anggota",
    formulir: "Formulir & Pendataan",
    dokumen: "Dokumen & Bukti",
    anggaran: "Anggaran & Realisasi",
    laporan: "Laporan & Evaluasi",
    pengaturan: "Pengaturan Bidang",
  };
  const dataDestinations = field.slug === "organisasi"
    ? (can(identity, "field:organisasi:review")
      ? [{ label: "Tinjau pengajuan keanggotaan", href: "/app/bidang/organisasi/pengajuan" }]
      : [])
    : field.slug === "pertanian"
      ? [{ label: "Data lahan dan produksi", href: "/app/bidang/pertanian/data" }]
      : field.slug === "pelatihan"
        ? [{ label: "Data pelatihan dan peserta", href: "/app/bidang/pelatihan/data" }]
        : [
            { label: "Katalog produk", href: "/app/bidang/usaha/katalog" },
            { label: "Pelanggan dan pesanan", href: "/app/bidang/usaha/pesanan" },
            { label: "Gudang dan persediaan", href: "/app/bidang/usaha/persediaan" },
          ];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={application?.name ?? field.name}
        title={titles[section] ?? section}
        description={
          section === "profil-mandat"
            ? "Identitas aplikasi dan mandat yang tersimpan pada registri organisasi."
            : section === "data"
              ? "Daftar keanggotaan aktif dan pengajuan yang menunggu verifikasi dari basis data organisasi."
              : section === "formulir"
              ? "Akses pendataan melalui modul operasional yang sudah terhubung ke penyimpanan organisasi."
              : section === "dokumen"
                ? "Dokumen organisasi dikelola pada arsip Sekretariat; relasi dokumen ke masing-masing bidang belum tersedia."
                : section === "anggaran"
                  ? "Daftar nilai usulan program dari modul bidang. Nilai ini bukan plafon anggaran yang telah disetujui."
                  : section === "laporan"
                    ? "Ringkasan capaian dari rencana kerja, program, indikator, kegiatan, dan tugas yang tersimpan."
                    : "Informasi status aplikasi bidang. Pengaturan struktural dan akses dikelola melalui proses organisasi."
        }
      />

      {applicationUnavailable ? (
        <Notice tone="danger" title="Registri bidang belum dapat dimuat">
          Sumber data aplikasi bidang sedang tidak tersedia. Informasi registri tidak diganti dengan nilai konfigurasi atau contoh.
        </Notice>
      ) : !application ? (
        <Notice tone="warning" title="Aplikasi bidang belum terdaftar pada organisasi ini">
          Tidak ditemukan baris registri untuk bidang {field.shortName}. Hubungi administrator organisasi sebelum menggunakan modul ini.
        </Notice>
      ) : !application.is_enabled ? (
        <Notice tone="warning" title="Aplikasi bidang sedang dinonaktifkan">
          Registri organisasi menunjukkan aplikasi ini belum diaktifkan. Fitur input dan perubahan data tidak dapat digunakan sampai pengurus mengaktifkannya.
        </Notice>
      ) : null}

      {section === "profil-mandat" && application ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <Card>
            <CardHeader title="Identitas registri aplikasi" action={<Badge tone={application.is_enabled ? "success" : "warning"}>{application.is_enabled ? "Aktif di registri" : "Nonaktif"}</Badge>} />
            <dl className="divide-y divide-line">
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Nama bidang</dt><dd className="text-[12.5px] font-semibold text-ink">{application.name}</dd></div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Kode bidang</dt><dd className="font-mono text-[11.5px] text-ink2">{application.field_key}</dd></div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Nama singkat</dt><dd className="text-[12.5px] text-ink2">{application.short_name}</dd></div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Unit organisasi</dt><dd className="text-[12.5px] text-ink2">{application.unit_name ?? "Belum dihubungkan ke unit organisasi"}</dd></div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Rute aplikasi</dt><dd className="font-mono text-[11px] text-ink2">{application.route}</dd></div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Mandat</dt><dd className="text-[12px] leading-relaxed text-ink2">{application.mandate ?? "Mandat belum dicatat pada registri."}</dd></div>
            </dl>
          </Card>
          <div className="space-y-3">
            <Notice tone="info" title="Batas data legal">
              Nomor dan tanggal SK, masa berlaku penugasan, serta nama koordinator definitif belum menjadi kolom pada registri aplikasi. Sistem tidak menampilkan nilai konfigurasi sebagai keputusan resmi.
            </Notice>
            <Card className="p-4">
              <h2 className="text-[12.5px] font-semibold text-ink">Siklus kerja bidang</h2>
              <ol className="mt-3 space-y-2 text-[11.5px] text-muted">
                <li>1. Susun rencana kerja</li>
                <li>2. Buat program dan indikator</li>
                <li>3. Jalankan kegiatan dan tugas</li>
                <li>4. Catat hasil dan evaluasi</li>
                <li>5. Laporkan kepada pengurus</li>
              </ol>
            </Card>
          </div>
        </div>
      ) : null}

      {section === "data" && field.slug === "organisasi" ? (
        <>
          {memberRegisterUnavailable ? (
            <Notice tone="danger" title="Buku induk anggota belum dapat dimuat">
              Data keanggotaan tidak tersedia dari database. Daftar tidak diganti dengan data contoh.
            </Notice>
          ) : (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <StatCard label="Anggota aktif" value={memberRows.filter((row) => row.status === "active").length} note="Status aktif pada catatan keanggotaan" tone="success" icon={<Users size={16} />} />
                <StatCard label="Menunggu verifikasi" value={memberRows.filter((row) => row.status === "pending").length} note="Belum dihitung sebagai anggota aktif" tone="warning" icon={<Users size={16} />} />
              </div>
              <Card>
                <CardHeader title="Buku induk anggota" subtitle={memberRows.length + " catatan aktif/menunggu · maksimal 500"} />
                {memberRows.length ? (
                  <div className="sb-scroll">
                    <table className="sb-table min-w-[760px]">
                      <thead><tr><th>Nomor anggota</th><th>Nama</th><th>Desa</th><th>Jabatan / peran</th><th>Berlaku sejak</th><th>Status</th></tr></thead>
                      <tbody>
                        {memberRows.map((member) => (
                          <tr key={member.id}>
                            <td className="font-mono text-[10.5px] text-muted2">{member.member_number ?? "Belum ditetapkan"}</td>
                            <td className="font-medium text-ink">{member.display_name}</td>
                            <td className="text-muted">{member.village ?? "Belum dicatat"}</td>
                            <td className="text-muted">{member.position_title ?? "Belum dicatat"}</td>
                            <td className="whitespace-nowrap text-muted">{member.valid_from ? formatDateID(member.valid_from, "short") : "Belum ditetapkan"}</td>
                            <td><Badge tone={member.status === "active" ? "success" : "warning"}>{member.status === "active" ? "Aktif" : "Menunggu verifikasi"}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4">
                    <EmptyState title="Belum ada catatan keanggotaan aktif" body="Anggota akan tampil setelah pengurus memproses pendaftaran dan mencatat status keanggotaannya di sistem." />
                  </div>
                )}
              </Card>
              <div className="mt-4">
                <Notice tone="info" title="Perlindungan data anggota">
                  Daftar ini hanya menampilkan identitas minimum untuk administrasi keanggotaan. Nomor telepon, alamat lengkap, dan data pribadi lain tidak ditampilkan di halaman ini.
                </Notice>
              </div>
            </>
          )}
        </>
      ) : null}

      {section === "formulir" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <Card>
            <CardHeader title="Pendataan operasional tersedia" subtitle="Formulir disimpan melalui modul domain" />
            {dataDestinations.length ? (
              <div className="divide-y divide-line">
                {dataDestinations.map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                    {item.label}<ArrowRight size={13} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8"><EmptyState title="Akses pendataan terbatas" body="Akun ini tidak memiliki hak peninjauan pengajuan keanggotaan. Hubungi pengurus bidang yang berwenang." /></div>
            )}
          </Card>
          <Notice tone="warning" title="Form Builder dinamis belum diaktifkan">
            Registri formulir, versi formulir, aturan validasi, dan ekspor jawaban belum terhubung ke penyimpanan organisasi. Halaman ini hanya menautkan formulir yang tersedia di modul operasional.
          </Notice>
        </div>
      ) : null}

      {section === "dokumen" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Arsip dokumen organisasi" action={<FileText size={16} className="text-muted2" />} />
            <div className="px-4 py-6">
              <EmptyState title="Relasi dokumen bidang belum tersedia" body="Arsip Sekretariat menyimpan dokumen organisasi, tetapi tabel dokumen belum memiliki kunci bidang yang terstruktur. Daftar dokumen tidak disalin atau disaring berdasarkan teks pemilik." />
            </div>
            {canReadSecretariat ? (
              <div className="border-t border-line px-4 py-3">
                <Link href="/app/sekretariat/dokumen" className="flex items-center justify-between text-[11.5px] font-semibold text-primary-700">Buka arsip Sekretariat <ArrowRight size={13} /></Link>
              </div>
            ) : null}
          </Card>
          <Notice tone="info" title="Pemisahan akses">
            Dokumen terbatas hanya boleh dibagikan melalui relasi izin yang eksplisit. Sampai relasi bidang dan hak akses dokumen tersedia, modul tidak menampilkan daftar dokumen global kepada pengguna bidang.
          </Notice>
        </div>
      ) : null}

      {section === "anggaran" ? (
        <>
          {budgetUnavailable ? (
            <Notice tone="danger" title="Data usulan belum dapat dimuat">Sumber program bidang tidak tersedia. Nilai usulan disembunyikan sampai koneksi pulih.</Notice>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Program dengan nilai usulan" value={budgetRequests.length} note="Program dengan budget_request" tone="info" />
                <StatCard label="Total nilai usulan tercatat" value={formatIDR(budgetRequests.reduce((sum, row) => sum + Number(row.budget_request), 0))} note="Bukan anggaran disetujui atau saldo dana" tone="warning" />
                <StatCard label="Anggaran disahkan" value="Belum tersedia" note="Belum ada modul persetujuan alokasi" tone="neutral" />
              </div>
              <Card className="mt-4">
                <CardHeader title="Nilai usulan pada program" subtitle="Nilai permintaan yang dicatat saat program dibuat" />
                {budgetRequests.length ? (
                  <div className="sb-scroll">
                    <table className="sb-table min-w-[760px]">
                      <thead><tr><th>Referensi</th><th>Program</th><th>Periode</th><th>Status program</th><th className="num">Nilai usulan</th></tr></thead>
                      <tbody>
                        {budgetRequests.map((row) => (
                          <tr key={row.id}>
                            <td className="font-mono text-[10px] text-muted2">{row.reference_no}</td>
                            <td className="font-medium text-ink">{row.title}</td>
                            <td className="text-muted">{periodLabel(row.period_start, row.period_end)}</td>
                            <td><StatusBadge status={PROGRAM_STATUS_LABEL[row.status]} /></td>
                            <td className="num whitespace-nowrap font-semibold tabular-nums">{formatIDR(Number(row.budget_request))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4"><EmptyState title="Belum ada nilai usulan program" body="Program tanpa nilai usulan tidak ditafsirkan sebagai anggaran nol atau dana yang telah disetujui." /></div>
                )}
              </Card>
            </>
          )}
          <div className="mt-4">
            <Notice tone="warning" title="Belum merupakan anggaran organisasi">
              Skema alokasi yang disahkan, sumber dana, komitmen belanja, bukti realisasi, dan pemetaan transaksi ke program belum tersedia. Total usulan tidak boleh dipakai sebagai plafon atau sisa anggaran.
            </Notice>
          </div>
        </>
      ) : null}

      {section === "laporan" ? (
        <>
          {reportUnavailable ? (
            <Notice tone="danger" title="Data laporan belum dapat dimuat">Sumber program dan kegiatan bidang tidak tersedia. Ringkasan tidak diganti dengan data contoh.</Notice>
          ) : reportSummary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Rencana kerja" value={reportSummary.workplan_count} note={reportSummary.submitted_workplans + " menunggu · " + reportSummary.approved_workplans + " disetujui/berjalan"} tone="info" />
                <StatCard label="Program" value={reportSummary.program_count} note={reportSummary.active_programs + " berjalan · " + reportSummary.completed_programs + " selesai"} tone="success" />
                <StatCard label="Kegiatan" value={reportSummary.activity_count} note={reportSummary.completed_activities + " telah selesai"} tone="accent" />
                <StatCard label="Tugas terbuka" value={reportSummary.open_tasks} note={reportSummary.overdue_tasks + " melewati tenggat"} tone={reportSummary.overdue_tasks ? "warning" : "neutral"} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <StatCard label="Indikator tercatat" value={reportSummary.indicator_count} note={reportSummary.measurable_indicators + " memiliki target dan capaian"} tone="info" />
                <StatCard label="Indikator mencapai target" value={reportSummary.achieved_indicators} note="Dari indikator yang memiliki target dan capaian" tone="success" />
              </div>
              <Card className="mt-4">
                <CardHeader title="Capaian program" subtitle="Rekap indikator dari catatan program yang tersimpan" />
                {reportPrograms.length ? (
                  <div className="sb-scroll">
                    <table className="sb-table min-w-[760px]">
                      <thead><tr><th>Referensi</th><th>Program</th><th>Periode</th><th>Status</th><th>Indikator</th></tr></thead>
                      <tbody>
                        {reportPrograms.map((row) => (
                          <tr key={row.id}>
                            <td className="font-mono text-[10px] text-muted2">{row.reference_no}</td>
                            <td className="font-medium text-ink">{row.title}</td>
                            <td className="text-muted">{periodLabel(row.period_start, row.period_end)}</td>
                            <td><Badge tone={statusTone(row.status)}>{PROGRAM_STATUS_LABEL[row.status]}</Badge></td>
                            <td className="text-muted">{attainedLabel(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4"><EmptyState title="Belum ada program yang tercatat" body="Laporan akan terbentuk dari rencana, program, indikator, kegiatan, dan tugas yang dimasukkan melalui modul bidang." /></div>
                )}
              </Card>
              <div className="mt-4">
                <Notice tone="info" title="Batas laporan">Ringkasan ini adalah laporan operasional bidang. Nilai keuangan, anggaran disetujui, dan realisasi dana tidak dihitung karena dimensi anggaran/program belum terhubung ke buku besar.</Notice>
              </div>
            </>
          ) : (
            <Notice tone="warning" title="Ringkasan laporan belum tersedia">Registri aplikasi berhasil dibaca, tetapi ringkasan belum dapat dihitung.</Notice>
          )}
        </>
      ) : null}

      {section === "pengaturan" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Status registri aplikasi" action={<Settings2 size={16} className="text-muted2" />} />
            {application ? (
              <dl className="divide-y divide-line">
                <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="text-[11.5px] text-muted">Aplikasi</dt><dd className="text-[12px] font-semibold text-ink">{application.short_name}</dd></div>
                <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="text-[11.5px] text-muted">Status registri</dt><dd><Badge tone={application.is_enabled ? "success" : "warning"}>{application.is_enabled ? "Aktif" : "Nonaktif"}</Badge></dd></div>
                <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="text-[11.5px] text-muted">Unit organisasi</dt><dd className="text-right text-[11.5px] text-ink2">{application.unit_name ?? "Belum ditautkan"}</dd></div>
              </dl>
            ) : (
              <div className="p-4"><EmptyState title="Registri tidak tersedia" body="Informasi pengaturan belum dapat dibaca." /></div>
            )}
          </Card>
          <Notice tone="warning" title="Pengaturan belum dapat diubah dari modul bidang">
            Perubahan nama resmi, mandat, unit, koordinator, role, serta status aktif aplikasi harus melalui proses dan kewenangan organisasi. Belum tersedia panel konfigurasi mandiri yang menyimpan perubahan bidang secara aman.
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
