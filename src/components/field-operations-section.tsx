import Link from "next/link";
import { CalendarDays, FilePlus2, MapPin, Plus } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import type { FieldDef } from "@/config/fields";
import {
  addFieldProgramIndicator,
  updateFieldWorkplan,
  changeFieldWorkplanStatus,
  rejectFieldWorkplan,
  updateFieldProgramIndicatorActual,
  updateFieldProgram,
  changeFieldProgramStatus,
  createFieldActivity,
  createFieldProgram,
  createFieldTask,
  createFieldWorkplan,
  submitFieldWorkplan,
  updateFieldActivityStatus,
  updateFieldTaskStatus,
} from "@/app/actions/field-operations";

interface ResultNotice {
  tone: "success" | "warning" | "danger";
  text: string;
}

interface WorkplanRow {
  id: string;
  reference_no: string;
  title: string;
  objective: string | null;
  period_start: string;
  period_end: string;
  status: "draft" | "submitted" | "rejected" | "approved" | "active" | "completed" | "cancelled";
  review_note: string | null;
  program_count: number;
}

interface ProgramRow {
  id: string;
  reference_no: string;
  workplan_id: string | null;
  workplan_title: string | null;
  title: string;
  objective: string | null;
  period_start: string | null;
  period_end: string | null;
  budget_request: string | null;
  status: "draft" | "planned" | "active" | "completed" | "paused" | "cancelled";
  indicator_count: number;
}

interface IndicatorRow {
  id: string;
  program_id: string;
  indicator_label: string;
  target_value: string | null;
  actual_value: string | null;
  unit_label: string | null;
  note: string | null;
}

interface ActivityRow {
  id: string;
  reference_no: string;
  program_id: string | null;
  program_title: string | null;
  title: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  responsible_label: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  open_to_public: boolean;
}

interface TaskRow {
  id: string;
  reference_no: string;
  program_id: string | null;
  program_title: string | null;
  activity_id: string | null;
  activity_title: string | null;
  title: string;
  description: string | null;
  assignee_label: string | null;
  due_date: string | null;
  priority: "tinggi" | "sedang" | "rendah";
  status: "belum" | "proses" | "selesai" | "dibatalkan";
}

const workplanStatus: Record<WorkplanRow["status"], string> = {
  draft: "Draf",
  submitted: "Menunggu persetujuan",
  rejected: "Perlu perbaikan",
  approved: "Disetujui",
  active: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const programStatus: Record<ProgramRow["status"], string> = {
  draft: "Draf",
  planned: "Direncanakan",
  active: "Berjalan",
  completed: "Selesai",
  paused: "Ditangguhkan",
  cancelled: "Dibatalkan",
};

const activityStatus: Record<ActivityRow["status"], string> = {
  scheduled: "Terjadwal",
  in_progress: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const taskStatus: Record<TaskRow["status"], string> = {
  belum: "Belum mulai",
  proses: "Dikerjakan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

function dateLabel(value: string | null): string {
  if (!value) return "Belum ditetapkan";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function timeRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const clean = (value: string | null) => value?.slice(0, 5) ?? "";
  return [clean(start), clean(end)].filter(Boolean).join("–");
}

function resultNotice(result?: string): ResultNotice | null {
  if (!result) return null;
  const messages: Record<string, ResultNotice> = {
    "workplan-created": { tone: "success", text: "Rencana kerja berhasil disimpan sebagai draf." },
    "workplan-submitted": { tone: "success", text: "Rencana kerja diajukan untuk proses persetujuan organisasi." },
    "workplan-rejected": { tone: "warning", text: "Rencana kerja memerlukan perbaikan. Baca catatan Pengurus lalu revisi dan ajukan kembali." },
    "workplan-updated": { tone: "success", text: "Rincian rencana kerja berhasil diperbarui." },
    "workplan-status-updated": { tone: "success", text: "Tahap rencana kerja berhasil diperbarui." },
    "program-created": { tone: "success", text: "Program berhasil diregistrasikan." },
    "program-updated": { tone: "success", text: "Rincian program berhasil diperbarui dan dicatat pada audit." },
    "program-status-updated": { tone: "success", text: "Status program berhasil diperbarui." },
    "indicator-created": { tone: "success", text: "Indikator program berhasil ditambahkan. Capaian aktual tetap kosong sampai ada hasil yang dicatat." },
    "indicator-updated": { tone: "success", text: "Capaian aktual indikator berhasil diperbarui dan dicatat pada audit." },
    "activity-created": { tone: "success", text: "Kegiatan berhasil dijadwalkan." },
    "activity-updated": { tone: "success", text: "Status kegiatan berhasil diperbarui." },
    "task-created": { tone: "success", text: "Tugas berhasil ditambahkan ke papan bidang." },
    "task-updated": { tone: "success", text: "Status tugas berhasil diperbarui." },
    invalid: { tone: "danger", text: "Isian tidak valid. Periksa kembali formulir." },
    stale: { tone: "warning", text: "Catatan sudah berubah atau tidak ditemukan. Muat ulang halaman." },
    unavailable: { tone: "warning", text: "Bidang atau catatan terkait tidak tersedia pada lingkup organisasi ini." },
    error: { tone: "danger", text: "Data belum dapat disimpan. Periksa koneksi dan coba kembali." },
  };
  return messages[result] ?? null;
}

function FieldResult({ result }: { result?: string }) {
  const notice = resultNotice(result);
  if (!notice) return null;
  return (
    <div className="mb-4">
      <Notice tone={notice.tone} title="Pembaruan Aplikasi Bidang">
        {notice.text}
      </Notice>
    </div>
  );
}

export async function FieldOperationsSection({
  field,
  section,
  result,
}: {
  field: FieldDef;
  section: "rencana" | "kegiatan" | "tugas";
  result?: string;
}) {
  const identity = await requireIdentity(`field:${field.slug}:read`);
  const canWriteWorkplans = can(identity, `field:${field.slug}:workplan:write`);
  const canWritePrograms = can(identity, `field:${field.slug}:program:write`);
  const canWriteActivities = can(identity, `field:${field.slug}:activity:write`);
  const canWriteTasks = can(identity, `field:${field.slug}:task:write`);
  const sql = getV9Sql();

  if (section === "rencana") {
    const [workplanResult, programResult, indicatorResult] = await Promise.all([
      sql`
        SELECT
          workplan.id::text AS id,
          workplan.reference_no,
          workplan.title,
          workplan.objective,
          workplan.period_start::text AS period_start,
          workplan.period_end::text AS period_end,
          workplan.status,
          workplan.review_note,
          (
            SELECT count(*)::int
            FROM v9.field_programs AS program
            WHERE program.workplan_id = workplan.id
              AND program.organization_id = workplan.organization_id
          ) AS program_count
        FROM v9.field_workplans AS workplan
        WHERE workplan.organization_id = ${identity.organizationId}
          AND workplan.field_key = ${field.slug}
        ORDER BY workplan.period_start DESC, workplan.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT
          program.id::text AS id,
          program.reference_no,
          program.workplan_id::text AS workplan_id,
          workplan.title AS workplan_title,
          program.title,
          program.objective,
          program.period_start::text AS period_start,
          program.period_end::text AS period_end,
          program.budget_request::text AS budget_request,
          program.status,
          (
            SELECT count(*)::int
            FROM v9.field_program_indicators AS indicator
            WHERE indicator.program_id = program.id
          ) AS indicator_count
        FROM v9.field_programs AS program
        LEFT JOIN v9.field_workplans AS workplan
          ON workplan.id = program.workplan_id
          AND workplan.organization_id = program.organization_id
          AND workplan.field_key = program.field_key
        WHERE program.organization_id = ${identity.organizationId}
          AND program.field_key = ${field.slug}
        ORDER BY program.created_at DESC
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
          indicator.note
        FROM v9.field_program_indicators AS indicator
        WHERE indicator.organization_id = ${identity.organizationId}
          AND indicator.field_key = ${field.slug}
        ORDER BY indicator.program_id, indicator.sort_order, indicator.created_at
        LIMIT 500
      `,
    ]);
    const workplans = rowsFromResult<WorkplanRow>(workplanResult);
    const programs = rowsFromResult<ProgramRow>(programResult);
    const indicators = rowsFromResult<IndicatorRow>(indicatorResult);
    const activeWorkplans = workplans.filter((plan) =>
      ["submitted", "approved", "active"].includes(plan.status),
    );

    return (
      <div className="pb-10">
        <PageHeader
          eyebrow={field.name}
          title="Rencana Kerja"
          description="Rencana periode, program, target, dan indikator. Anggaran realisasi tidak dihitung di sini; pencatatan keuangan tetap berada pada Aplikasi Keuangan."
        />
        <FieldResult result={result} />

        {canWriteWorkplans ? (
          <Card>
            <CardHeader title="Buat rencana kerja" subtitle="Simpan sebagai draf, lalu ajukan untuk ditinjau pengurus." />
            <form action={createFieldWorkplan} className="grid gap-3 p-4 sm:grid-cols-2">
              <input type="hidden" name="field_key" value={field.slug} />
              <div className="sm:col-span-2">
                <label htmlFor="workplan-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama rencana kerja</label>
                <input id="workplan-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder={`Rencana Kerja ${field.shortName}`} />
              </div>
              <div>
                <label htmlFor="workplan-start" className="mb-1 block text-[11.5px] font-semibold text-ink2">Mulai periode</label>
                <input id="workplan-start" type="date" name="period_start" required className="sb-input" />
              </div>
              <div>
                <label htmlFor="workplan-end" className="mb-1 block text-[11.5px] font-semibold text-ink2">Akhir periode</label>
                <input id="workplan-end" type="date" name="period_end" required className="sb-input" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="workplan-objective" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tujuan dan ruang lingkup</label>
                <textarea id="workplan-objective" name="objective" rows={3} maxLength={5000} className="sb-input !h-auto resize-y py-2.5" placeholder="Uraikan tujuan, sasaran dan ruang lingkup rencana kerja." />
              </div>
              <div className="flex justify-end sm:col-span-2">
                <button type="submit" className="sb-btn sb-btn-primary"><FilePlus2 size={14} /> Simpan draf rencana</button>
              </div>
            </form>
          </Card>
        ) : null}

        <div className="mt-5">
          <Card>
            <CardHeader title="Daftar rencana kerja" subtitle={`${workplans.length} rencana pada bidang ini`} />
            {workplans.length ? (
              <div className="divide-y divide-line">
                {workplans.map((plan) => (
                  <article key={plan.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[9.5px] text-muted2">{plan.reference_no}</div>
                        <h3 className="mt-1 text-[13px] font-semibold text-ink">{plan.title}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                          <span>{dateLabel(plan.period_start)} – {dateLabel(plan.period_end)}</span>
                          <span>{plan.program_count} program terkait</span>
                        </div>
                      </div>
                      <Badge tone={plan.status === "approved" || plan.status === "active" ? "success" : plan.status === "submitted" ? "info" : plan.status === "cancelled" ? "neutral" : "warning"}>
                        {workplanStatus[plan.status]}
                      </Badge>
                    </div>
                    {plan.objective ? <p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted">{plan.objective}</p> : null}
                    {plan.status === "rejected" && plan.review_note ? <Notice tone="warning" title="Catatan perbaikan dari Pengurus">{plan.review_note}</Notice> : null}
                    {canWriteWorkplans && (plan.status === "draft" || plan.status === "rejected") ? (
                      <>
                        <form action={updateFieldWorkplan} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                          <input type="hidden" name="field_key" value={field.slug} />
                          <input type="hidden" name="workplan_id" value={plan.id} />
                          <div className="sm:col-span-2">
                            <label htmlFor={`workplan-title-${plan.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Nama rencana kerja</label>
                            <input id={`workplan-title-${plan.id}`} name="title" required minLength={3} maxLength={300} defaultValue={plan.title} className="sb-input !h-9 text-[11px]" />
                          </div>
                          <div>
                            <label htmlFor={`workplan-start-${plan.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Mulai periode</label>
                            <input id={`workplan-start-${plan.id}`} name="period_start" type="date" required defaultValue={plan.period_start} className="sb-input !h-9 text-[11px]" />
                          </div>
                          <div>
                            <label htmlFor={`workplan-end-${plan.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Akhir periode</label>
                            <input id={`workplan-end-${plan.id}`} name="period_end" type="date" required defaultValue={plan.period_end} className="sb-input !h-9 text-[11px]" />
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor={`workplan-objective-${plan.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Tujuan dan ruang lingkup</label>
                            <textarea id={`workplan-objective-${plan.id}`} name="objective" rows={2} maxLength={5000} defaultValue={plan.objective ?? ""} className="sb-input !h-auto resize-y py-2 text-[11px]" />
                          </div>
                          <div className="flex justify-end sm:col-span-2">
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">Simpan perubahan</button>
                          </div>
                        </form>
                        <form action={submitFieldWorkplan} className="mt-2 flex justify-end">
                          <input type="hidden" name="field_key" value={field.slug} />
                          <input type="hidden" name="workplan_id" value={plan.id} />
                          <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">{plan.status === "rejected" ? "Kirim ulang untuk ditinjau" : "Ajukan untuk persetujuan"}</button>
                        </form>
                      </>
                    ) : null}
                    {canWriteWorkplans && plan.status === "approved" ? (
                      <form action={changeFieldWorkplanStatus} className="mt-3 border-t border-line pt-3">
                        <input type="hidden" name="field_key" value={field.slug} />
                        <input type="hidden" name="workplan_id" value={plan.id} />
                        <input type="hidden" name="next_status" value="active" />
                        <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">Mulai pelaksanaan</button>
                      </form>
                    ) : null}
                    {canWriteWorkplans && plan.status === "active" ? (
                      <form action={changeFieldWorkplanStatus} className="mt-3 border-t border-line pt-3">
                        <input type="hidden" name="field_key" value={field.slug} />
                        <input type="hidden" name="workplan_id" value={plan.id} />
                        <input type="hidden" name="next_status" value="completed" />
                        <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">Tandai rencana selesai</button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10">
                <EmptyState title="Belum ada rencana kerja" body="Rencana yang dibuat bidang akan tercatat di sini. Tidak ada target contoh yang otomatis dimasukkan." />
              </div>
            )}
          </Card>
        </div>

        {canWritePrograms ? (
          <Card className="mt-5">
            <CardHeader title="Tambah program" subtitle="Program merupakan bagian dari rencana kerja atau program mandiri bidang." />
            <form action={createFieldProgram} className="grid gap-3 p-4 sm:grid-cols-2">
              <input type="hidden" name="field_key" value={field.slug} />
              <div className="sm:col-span-2">
                <label htmlFor="program-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama program</label>
                <input id="program-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder="Nama program" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="program-workplan" className="mb-1 block text-[11.5px] font-semibold text-ink2">Rencana kerja terkait (opsional)</label>
                <select id="program-workplan" name="workplan_id" defaultValue="" className="sb-input">
                  <option value="">Program mandiri / belum ditautkan</option>
                  {activeWorkplans.map((plan) => <option key={plan.id} value={plan.id}>{plan.reference_no} · {plan.title}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="program-start" className="mb-1 block text-[11.5px] font-semibold text-ink2">Mulai program (opsional)</label>
                <input id="program-start" name="period_start" type="date" className="sb-input" />
              </div>
              <div>
                <label htmlFor="program-end" className="mb-1 block text-[11.5px] font-semibold text-ink2">Akhir program (opsional)</label>
                <input id="program-end" name="period_end" type="date" className="sb-input" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="program-objective" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tujuan dan hasil yang diharapkan</label>
                <textarea id="program-objective" name="objective" rows={3} maxLength={5000} className="sb-input !h-auto resize-y py-2.5" />
              </div>
              <div>
                <label htmlFor="program-budget" className="mb-1 block text-[11.5px] font-semibold text-ink2">Usulan kebutuhan biaya (Rp, opsional)</label>
                <input id="program-budget" name="budget_request" type="number" min="0" max="1000000000000" step="1000" className="sb-input" placeholder="Belum ditetapkan" />
              </div>
              <div className="flex items-end justify-end">
                <button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Simpan program</button>
              </div>
            </form>
          </Card>
        ) : null}

        <div className="mt-5">
          <Card>
            <CardHeader title="Program bidang" subtitle={`${programs.length} program tercatat`} />
            {programs.length ? (
              <div className="divide-y divide-line">
                {programs.map((program) => {
                  const items = indicators.filter((indicator) => indicator.program_id === program.id);
                  return (
                    <article key={program.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[9.5px] text-muted2">{program.reference_no}</div>
                          <h3 className="mt-1 text-[13px] font-semibold text-ink">{program.title}</h3>
                          {program.workplan_title ? <div className="mt-0.5 text-[10.5px] text-muted">Rencana: {program.workplan_title}</div> : null}
                        </div>
                        <Badge tone={program.status === "active" ? "success" : program.status === "cancelled" ? "neutral" : "warning"}>{programStatus[program.status]}</Badge>
                      </div>
                      {program.objective ? <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{program.objective}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted2">
                        {program.period_start || program.period_end ? <span>{dateLabel(program.period_start)} – {dateLabel(program.period_end)}</span> : null}
                        <span>{items.length} indikator</span>
                        <span>{program.budget_request === null ? "Usulan biaya belum dicatat" : `Usulan biaya ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(program.budget_request))}`}</span>
                      </div>
                      {canWritePrograms && (program.status === "draft" || program.status === "planned") ? (
                        <form action={updateFieldProgram} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                          <input type="hidden" name="field_key" value={field.slug} />
                          <input type="hidden" name="program_id" value={program.id} />
                          <div className="sm:col-span-2">
                            <label htmlFor={`program-title-${program.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Nama program</label>
                            <input id={`program-title-${program.id}`} name="title" required minLength={3} maxLength={300} defaultValue={program.title} className="sb-input !h-9 text-[11px]" />
                          </div>
                          <div>
                            <label htmlFor={`program-start-${program.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Mulai</label>
                            <input id={`program-start-${program.id}`} name="period_start" type="date" defaultValue={program.period_start ?? ""} className="sb-input !h-9 text-[11px]" />
                          </div>
                          <div>
                            <label htmlFor={`program-end-${program.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Selesai</label>
                            <input id={`program-end-${program.id}`} name="period_end" type="date" defaultValue={program.period_end ?? ""} className="sb-input !h-9 text-[11px]" />
                          </div>
                          <div>
                            <label htmlFor={`program-budget-${program.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Usulan biaya (Rp)</label>
                            <input id={`program-budget-${program.id}`} name="budget_request" type="number" min="0" max="1000000000000" step="1000" defaultValue={program.budget_request ?? ""} className="sb-input !h-9 text-[11px]" />
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor={`program-objective-${program.id}`} className="mb-1 block text-[10.5px] font-semibold text-ink2">Tujuan dan hasil yang diharapkan</label>
                            <textarea id={`program-objective-${program.id}`} name="objective" rows={2} maxLength={5000} defaultValue={program.objective ?? ""} className="sb-input !h-auto resize-y py-2 text-[11px]" />
                          </div>
                          <div className="flex justify-end sm:col-span-2">
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">Simpan perubahan</button>
                          </div>
                        </form>
                      ) : null}
                      {canWritePrograms && program.status !== "completed" && program.status !== "cancelled" ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                          {(program.status === "draft"
                            ? [{ next: "planned", label: "Jadikan terencana" }, { next: "cancelled", label: "Batalkan" }]
                            : program.status === "planned"
                              ? [{ next: "active", label: "Mulai program" }, { next: "paused", label: "Tunda" }, { next: "cancelled", label: "Batalkan" }]
                              : program.status === "active"
                                ? [{ next: "paused", label: "Tunda" }, { next: "completed", label: "Selesaikan program" }, { next: "cancelled", label: "Batalkan" }]
                                : [{ next: "active", label: "Lanjutkan program" }, { next: "cancelled", label: "Batalkan" }]
                          ).map((action) => (
                            <form action={changeFieldProgramStatus} key={action.next}>
                              <input type="hidden" name="field_key" value={field.slug} />
                              <input type="hidden" name="program_id" value={program.id} />
                              <input type="hidden" name="next_status" value={action.next} />
                              <button
                                type="submit"
                                className={action.next === "cancelled"
                                  ? "sb-btn sb-btn-ghost !h-8 !px-3 text-[10.5px]"
                                  : action.next === "completed"
                                    ? "sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]"
                                    : "sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]"}
                              >
                                {action.label}
                              </button>
                            </form>
                          ))}
                        </div>
                      ) : null}
                      {items.length ? (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[360px] text-left text-[10.5px]">
                            <thead className="text-muted"><tr><th className="py-1 pr-2">Indikator</th><th className="py-1 pr-2">Target</th><th className="py-1">Capaian aktual</th></tr></thead>
                            <tbody className="divide-y divide-line">
                              {items.map((indicator) => (
                                <tr key={indicator.id}>
                                  <td className="py-1.5 pr-2 text-ink2">{indicator.indicator_label}</td>
                                  <td className="py-1.5 pr-2 text-muted">{indicator.target_value ?? "Belum ditetapkan"} {indicator.unit_label ?? ""}</td>
                                  <td className="py-1.5 text-ink2">
                                    {canWritePrograms && program.status !== "cancelled" ? (
                                      <form action={updateFieldProgramIndicatorActual} className="flex min-w-[150px] items-center gap-1.5">
                                        <input type="hidden" name="field_key" value={field.slug} />
                                        <input type="hidden" name="indicator_id" value={indicator.id} />
                                        <input
                                          name="actual_value"
                                          type="number"
                                          min="0"
                                          step="0.0001"
                                          defaultValue={indicator.actual_value ?? ""}
                                          className="sb-input !h-8 min-w-0 w-[92px] text-[10.5px]"
                                          placeholder="Belum dicatat"
                                          aria-label={`Capaian aktual ${indicator.indicator_label}`}
                                        />
                                        <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Simpan</button>
                                      </form>
                                    ) : (
                                      <span>{indicator.actual_value ?? "Belum dicatat"} {indicator.unit_label ?? ""}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="mt-2 text-[10.5px] text-muted2">Belum ada indikator yang dicatat.</p>}
                      {canWritePrograms && program.status !== "cancelled" ? (
                        <form action={addFieldProgramIndicator} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[minmax(0,1.4fr)_120px_100px_auto]">
                          <input type="hidden" name="field_key" value={field.slug} />
                          <input type="hidden" name="program_id" value={program.id} />
                          <input name="indicator_label" required minLength={2} maxLength={240} className="sb-input !h-9 text-[11px]" placeholder="Nama indikator" />
                          <input name="target_value" type="number" min="0" step="0.0001" className="sb-input !h-9 text-[11px]" placeholder="Target" />
                          <input name="unit_label" maxLength={60} className="sb-input !h-9 text-[11px]" placeholder="Satuan" />
                          <button type="submit" className="sb-btn sb-btn-outline !h-9 !px-3 text-[10.5px]">Tambah</button>
                        </form>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-9 text-center text-[11.5px] text-muted">Belum ada program pada bidang ini.</div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (section === "kegiatan") {
    const [programResult, activityResult] = await Promise.all([
      sql`
        SELECT id::text AS id, reference_no, title
        FROM v9.field_programs
        WHERE organization_id = ${identity.organizationId}
          AND field_key = ${field.slug}
          AND status <> 'cancelled'
        ORDER BY created_at DESC
        LIMIT 200
      `,
      sql`
        SELECT
          activity.id::text AS id,
          activity.reference_no,
          activity.program_id::text AS program_id,
          program.title AS program_title,
          activity.title,
          activity.activity_date::text AS activity_date,
          to_char(activity.start_time, 'HH24:MI') AS start_time,
          to_char(activity.end_time, 'HH24:MI') AS end_time,
          activity.location,
          activity.description,
          activity.responsible_label,
          activity.status,
          activity.open_to_public
        FROM v9.field_activities AS activity
        LEFT JOIN v9.field_programs AS program
          ON program.id = activity.program_id
          AND program.organization_id = activity.organization_id
          AND program.field_key = activity.field_key
        WHERE activity.organization_id = ${identity.organizationId}
          AND activity.field_key = ${field.slug}
        ORDER BY activity.activity_date DESC, activity.created_at DESC
        LIMIT 200
      `,
    ]);
    const programs = rowsFromResult<{ id: string; reference_no: string; title: string }>(programResult);
    const activities = rowsFromResult<ActivityRow>(activityResult);

    return (
      <div className="pb-10">
        <PageHeader
          eyebrow={field.name}
          title="Program & Kegiatan"
          description="Jadwal kegiatan, lokasi, penanggung jawab, serta status pelaksanaan yang dicatat oleh bidang."
        />
        <FieldResult result={result} />

        {canWriteActivities ? (
          <Card>
            <CardHeader title="Jadwalkan kegiatan" subtitle="Kegiatan dapat ditautkan ke program pada bidang ini." />
            <form action={createFieldActivity} className="grid gap-3 p-4 sm:grid-cols-2">
              <input type="hidden" name="field_key" value={field.slug} />
              <div className="sm:col-span-2">
                <label htmlFor="activity-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama kegiatan</label>
                <input id="activity-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder="Nama kegiatan" />
              </div>
              <div>
                <label htmlFor="activity-program" className="mb-1 block text-[11.5px] font-semibold text-ink2">Program terkait (opsional)</label>
                <select id="activity-program" name="program_id" defaultValue="" className="sb-input">
                  <option value="">Tidak ditautkan</option>
                  {programs.map((program) => <option key={program.id} value={program.id}>{program.reference_no} · {program.title}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="activity-date" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal</label>
                <input id="activity-date" name="activity_date" type="date" required className="sb-input" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="activity-start" className="mb-1 block text-[11.5px] font-semibold text-ink2">Mulai</label>
                  <input id="activity-start" name="start_time" type="time" className="sb-input" />
                </div>
                <div>
                  <label htmlFor="activity-end" className="mb-1 block text-[11.5px] font-semibold text-ink2">Selesai</label>
                  <input id="activity-end" name="end_time" type="time" className="sb-input" />
                </div>
              </div>
              <div>
                <label htmlFor="activity-location" className="mb-1 block text-[11.5px] font-semibold text-ink2">Lokasi</label>
                <input id="activity-location" name="location" maxLength={300} className="sb-input" placeholder="Lokasi kegiatan" />
              </div>
              <div>
                <label htmlFor="activity-responsible" className="mb-1 block text-[11.5px] font-semibold text-ink2">Penanggung jawab</label>
                <input id="activity-responsible" name="responsible_label" maxLength={160} className="sb-input" placeholder="Nama / jabatan" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="activity-description" className="mb-1 block text-[11.5px] font-semibold text-ink2">Keterangan (opsional)</label>
                <textarea id="activity-description" name="description" rows={2} maxLength={5000} className="sb-input !h-auto resize-y py-2.5" />
              </div>
              <label className="flex items-center gap-2 text-[11.5px] text-ink2 sm:col-span-2">
                <input type="checkbox" name="open_to_public" className="h-4 w-4 accent-[var(--sb-primary-700)]" />
                Kegiatan dapat dihadiri publik
              </label>
              <div className="flex justify-end sm:col-span-2">
                <button type="submit" className="sb-btn sb-btn-primary"><CalendarDays size={14} /> Simpan kegiatan</button>
              </div>
            </form>
          </Card>
        ) : null}

        <div className="mt-5">
          <Card>
            <CardHeader title="Daftar kegiatan" subtitle={`${activities.length} kegiatan tercatat`} />
            {activities.length ? (
              <div className="divide-y divide-line">
                {activities.map((activity) => (
                  <article key={activity.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[9.5px] text-muted2">{activity.reference_no}</div>
                        <h3 className="mt-1 text-[13px] font-semibold text-ink">{activity.title}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                          <span>{dateLabel(activity.activity_date)}{timeRange(activity.start_time, activity.end_time) ? ` · ${timeRange(activity.start_time, activity.end_time)}` : ""}</span>
                          {activity.location ? <span><MapPin size={10} className="mr-1 inline" />{activity.location}</span> : null}
                          {activity.responsible_label ? <span>PIC {activity.responsible_label}</span> : null}
                        </div>
                        {activity.program_title ? <div className="mt-1 text-[10.5px] text-muted2">Program: {activity.program_title}</div> : null}
                      </div>
                      <Badge tone={activity.status === "completed" ? "success" : activity.status === "scheduled" ? "info" : "neutral"}>{activityStatus[activity.status]}</Badge>
                    </div>
                    {activity.description ? <p className="mt-2 text-[11px] text-muted">{activity.description}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      {activity.open_to_public ? <Badge tone="info">Publik</Badge> : null}
                      {canWriteActivities && activity.status === "scheduled" ? (
                        <>
                          <form action={updateFieldActivityStatus}>
                            <input type="hidden" name="field_key" value={field.slug} />
                            <input type="hidden" name="activity_id" value={activity.id} />
                            <input type="hidden" name="next_status" value="in_progress" />
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">Mulai kegiatan</button>
                          </form>
                          <form action={updateFieldActivityStatus}>
                            <input type="hidden" name="field_key" value={field.slug} />
                            <input type="hidden" name="activity_id" value={activity.id} />
                            <input type="hidden" name="next_status" value="cancelled" />
                            <button type="submit" className="sb-btn sb-btn-ghost !h-8 !px-3 text-[10.5px]">Batalkan</button>
                          </form>
                        </>
                      ) : null}
                      {canWriteActivities && activity.status === "in_progress" ? (
                        <form action={updateFieldActivityStatus}>
                          <input type="hidden" name="field_key" value={field.slug} />
                          <input type="hidden" name="activity_id" value={activity.id} />
                          <input type="hidden" name="next_status" value="completed" />
                          <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">Tandai selesai</button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10">
                <EmptyState title="Belum ada kegiatan" body="Kegiatan yang dijadwalkan oleh bidang akan muncul di sini." />
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const [programResult, activityResult, taskResult] = await Promise.all([
    sql`
      SELECT id::text AS id, reference_no, title
      FROM v9.field_programs
      WHERE organization_id = ${identity.organizationId}
        AND field_key = ${field.slug}
        AND status <> 'cancelled'
      ORDER BY created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT id::text AS id, reference_no, title
      FROM v9.field_activities
      WHERE organization_id = ${identity.organizationId}
        AND field_key = ${field.slug}
        AND status <> 'cancelled'
      ORDER BY activity_date DESC, created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT
        task.id::text AS id,
        task.reference_no,
        task.program_id::text AS program_id,
        program.title AS program_title,
        task.activity_id::text AS activity_id,
        activity.title AS activity_title,
        task.title,
        task.description,
        task.assignee_label,
        task.due_date::text AS due_date,
        task.priority,
        task.status
      FROM v9.field_tasks AS task
      LEFT JOIN v9.field_programs AS program
        ON program.id = task.program_id
        AND program.organization_id = task.organization_id
        AND program.field_key = task.field_key
      LEFT JOIN v9.field_activities AS activity
        ON activity.id = task.activity_id
        AND activity.organization_id = task.organization_id
        AND activity.field_key = task.field_key
      WHERE task.organization_id = ${identity.organizationId}
        AND task.field_key = ${field.slug}
      ORDER BY
        CASE task.status WHEN 'belum' THEN 1 WHEN 'proses' THEN 2 WHEN 'selesai' THEN 3 ELSE 4 END,
        task.due_date NULLS LAST,
        task.created_at DESC
      LIMIT 300
    `,
  ]);
  const programs = rowsFromResult<{ id: string; reference_no: string; title: string }>(programResult);
  const activities = rowsFromResult<{ id: string; reference_no: string; title: string }>(activityResult);
  const tasks = rowsFromResult<TaskRow>(taskResult);
  const openTasks = tasks.filter((task) => task.status === "belum" || task.status === "proses").length;
  const overdueTasks = tasks.filter((task) => task.status !== "selesai" && task.status !== "dibatalkan" && task.due_date && task.due_date < new Date().toISOString().slice(0, 10)).length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title="Tugas & Kolaborasi"
        description="Papan tugas bidang dengan penanggung jawab, tenggat, prioritas, dan status yang tersimpan bersama."
      />
      <FieldResult result={result} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[11px] border border-line bg-white p-3">
          <div className="text-[10.5px] text-muted">Tugas terbuka</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-ink">{openTasks}</div>
        </div>
        <div className="rounded-[11px] border border-line bg-white p-3">
          <div className="text-[10.5px] text-muted">Terlambat</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-ink">{overdueTasks}</div>
        </div>
        <div className="rounded-[11px] border border-line bg-white p-3">
          <div className="text-[10.5px] text-muted">Selesai</div>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-ink">{tasks.filter((task) => task.status === "selesai").length}</div>
        </div>
      </div>

      {canWriteTasks ? (
        <Card>
          <CardHeader title="Tambah tugas bidang" subtitle="Tugas dapat dihubungkan dengan program atau kegiatan." />
          <form action={createFieldTask} className="grid gap-3 p-4 sm:grid-cols-2">
            <input type="hidden" name="field_key" value={field.slug} />
            <div className="sm:col-span-2">
              <label htmlFor="field-task-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama tugas</label>
              <input id="field-task-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder="Tugas yang harus diselesaikan" />
            </div>
            <div>
              <label htmlFor="field-task-program" className="mb-1 block text-[11.5px] font-semibold text-ink2">Program terkait (opsional)</label>
              <select id="field-task-program" name="program_id" defaultValue="" className="sb-input">
                <option value="">Tidak ditautkan</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.reference_no} · {program.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="field-task-activity" className="mb-1 block text-[11.5px] font-semibold text-ink2">Kegiatan terkait (opsional)</label>
              <select id="field-task-activity" name="activity_id" defaultValue="" className="sb-input">
                <option value="">Tidak ditautkan</option>
                {activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.reference_no} · {activity.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="field-task-assignee" className="mb-1 block text-[11.5px] font-semibold text-ink2">Penanggung jawab</label>
              <input id="field-task-assignee" name="assignee_label" maxLength={160} className="sb-input" placeholder="Nama / jabatan" />
            </div>
            <div>
              <label htmlFor="field-task-due" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tenggat (opsional)</label>
              <input id="field-task-due" name="due_date" type="date" className="sb-input" />
            </div>
            <div>
              <label htmlFor="field-task-priority" className="mb-1 block text-[11.5px] font-semibold text-ink2">Prioritas</label>
              <select id="field-task-priority" name="priority" defaultValue="sedang" className="sb-input">
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>
            </div>
            <div>
              <label htmlFor="field-task-description" className="mb-1 block text-[11.5px] font-semibold text-ink2">Keterangan</label>
              <input id="field-task-description" name="description" maxLength={5000} className="sb-input" placeholder="Keterangan singkat" />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Tambah tugas</button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(["belum", "proses", "selesai"] as const).map((status) => {
          const group = tasks.filter((task) => task.status === status);
          return (
            <Card key={status}>
              <CardHeader
                title={status === "belum" ? "Belum mulai" : status === "proses" ? "Dikerjakan" : "Selesai"}
                subtitle={`${group.length} tugas`}
              />
              {group.length ? (
                <div className="divide-y divide-line">
                  {group.map((task) => (
                    <article key={task.id} className="p-3.5">
                      <div className="font-mono text-[9px] text-muted2">{task.reference_no}</div>
                      <h3 className="mt-1 text-[12px] font-semibold text-ink">{task.title}</h3>
                      {task.description ? <p className="mt-1 text-[10.5px] text-muted">{task.description}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted2">
                        <Badge tone={task.priority === "tinggi" ? "warning" : "neutral"}>{task.priority}</Badge>
                        {task.assignee_label ? <span>PIC {task.assignee_label}</span> : null}
                        {task.due_date ? <span>Tenggat {dateLabel(task.due_date)}</span> : null}
                      </div>
                      {task.program_title ? <div className="mt-1 text-[10px] text-muted2">Program: {task.program_title}</div> : null}
                      {task.activity_title ? <div className="mt-1 text-[10px] text-muted2">Kegiatan: {task.activity_title}</div> : null}
                      {canWriteTasks && task.status !== "selesai" ? (
                        <form action={updateFieldTaskStatus} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                          <input type="hidden" name="field_key" value={field.slug} />
                          <input type="hidden" name="task_id" value={task.id} />
                          <select name="next_status" defaultValue={task.status === "belum" ? "proses" : "selesai"} className="sb-input !h-8 flex-1 text-[10.5px]">
                            {task.status === "belum" ? <option value="proses">Mulai dikerjakan</option> : null}
                            {task.status === "proses" ? <option value="belum">Kembalikan ke daftar</option> : null}
                            <option value="selesai">Tandai selesai</option>
                            <option value="dibatalkan">Batalkan tugas</option>
                          </select>
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[10px]">Perbarui</button>
                        </form>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-[11px] text-muted">Belum ada tugas pada kolom ini.</div>
              )}
            </Card>
          );
        })}
        {tasks.some((task) => task.status === "dibatalkan") ? (
          <Card>
            <CardHeader title="Dibatalkan" subtitle={`${tasks.filter((task) => task.status === "dibatalkan").length} tugas`} />
            <div className="divide-y divide-line">
              {tasks.filter((task) => task.status === "dibatalkan").map((task) => (
                <div key={task.id} className="p-3 text-[11.5px] text-muted">{task.reference_no} · {task.title}</div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
