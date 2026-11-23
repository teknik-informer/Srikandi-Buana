import Link from "next/link";
import { Award, BookOpen, CalendarDays, CheckCircle2, GraduationCap, UsersRound } from "lucide-react";
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
import { can, requireIdentity } from "@/lib/session";
import type { FieldDef } from "@/config/fields";
import {
  createTrainingSession,
  cancelTrainingEnrollment,
  enrollTrainingParticipant,
  issueTrainingCertificate,
  recordTrainingAssessment,
  revokeTrainingCertificate,
  updateTrainingAttendance,
  updateTrainingSessionStatus,
} from "@/app/actions/training";

interface TrainingSummary {
  session_count: number;
  registration_open_count: number;
  completed_count: number;
  participant_count: number;
  present_count: number;
  post_assessment_count: number;
}

interface SessionRow {
  id: string;
  reference_no: string;
  program_id: string | null;
  program_title: string | null;
  title: string;
  topic: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  trainer_label: string | null;
  max_participants: number | null;
  description: string | null;
  status: "planned" | "registration_open" | "in_progress" | "completed" | "cancelled";
  enrollment_count: number;
  confirmed_count: number;
  waitlisted_count: number;
  present_count: number;
}

interface ProgramOption {
  id: string;
  reference_no: string;
  title: string;
}

interface MemberOption {
  id: string;
  member_number: string | null;
  full_name: string;
}

interface EnrollmentRow {
  id: string;
  membership_id: string | null;
  member_number: string | null;
  participant_name: string;
  affiliation_label: string | null;
  registration_status: "registered" | "confirmed" | "waitlisted" | "cancelled";
  attendance_status: "not_marked" | "hadir" | "izin" | "sakit" | "alpa";
  pre_score: string | null;
  post_score: string | null;
  certificate_id: string | null;
  certificate_reference: string | null;
  certificate_status: "issued" | "revoked" | null;
}

interface CertificateRow {
  id: string;
  reference_no: string;
  participant_name: string;
  session_title: string;
  issue_date: string;
  issuer_label: string;
  status: "issued" | "revoked";
  revocation_note: string | null;
}

const sessionStatus: Record<SessionRow["status"], string> = {
  planned: "Direncanakan",
  registration_open: "Pendaftaran dibuka",
  in_progress: "Sedang berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const registrationStatus: Record<EnrollmentRow["registration_status"], string> = {
  registered: "Terdaftar",
  confirmed: "Dikonfirmasi",
  waitlisted: "Daftar tunggu",
  cancelled: "Dibatalkan",
};

const attendanceStatus: Record<EnrollmentRow["attendance_status"], string> = {
  not_marked: "Belum dicatat",
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Tanpa keterangan",
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

function resultNotice(result?: string) {
  if (!result) return null;
  const messages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    "session-created": { tone: "success", text: "Sesi pelatihan berhasil dibuat." },
    "session-updated": { tone: "success", text: "Status sesi berhasil diperbarui." },
    "participant-enrolled": { tone: "success", text: "Peserta berhasil didaftarkan. Periksa status pendaftaran atau daftar tunggu." },
    "participant-cancelled": { tone: "success", text: "Pendaftaran dibatalkan. Satu peserta daftar tunggu teratas dipromosikan otomatis bila slot tersedia." },
    "enrollment-cancel-blocked": { tone: "warning", text: "Pendaftaran tidak dapat dibatalkan pada status sesi atau presensi saat ini." },
    "attendance-updated": { tone: "success", text: "Presensi peserta berhasil diperbarui." },
    "assessment-saved": { tone: "success", text: "Nilai asesmen berhasil disimpan." },
    "certificate-issued": { tone: "success", text: "Register sertifikat internal berhasil diterbitkan." },
    "certificate-revoked": { tone: "success", text: "Register sertifikat berhasil dicabut dan alasannya tercatat." },
    "certificate-exists": { tone: "warning", text: "Peserta tersebut sudah memiliki register sertifikat untuk sesi ini." },
    "certificate-not-eligible": { tone: "warning", text: "Sertifikat hanya dapat dicatat untuk peserta yang hadir pada sesi yang sudah selesai." },
    "session-transition-blocked": { tone: "warning", text: "Perubahan status sesi tidak mengikuti alur yang diizinkan." },
    "session-closed-or-member-unavailable": { tone: "warning", text: "Pendaftaran sudah ditutup atau keanggotaan yang dipilih tidak aktif." },
    "duplicate-participant": { tone: "warning", text: "Peserta tersebut sudah terdaftar pada sesi ini." },
    "attendance-session-not-ready": { tone: "warning", text: "Presensi hanya dapat dicatat saat sesi berlangsung atau setelah sesi selesai." },
    "assessment-not-ready": { tone: "warning", text: "Asesmen tidak dapat disimpan. Nilai post-test memerlukan status kehadiran hadir." },
    "certificate-stale": { tone: "warning", text: "Register sertifikat sudah berubah atau tidak ditemukan." },
    "invalid": { tone: "danger", text: "Isian tidak valid. Periksa tanggal, peserta, dan nilai." },
    "program-unavailable": { tone: "warning", text: "Program terkait tidak tersedia pada bidang ini." },
    error: { tone: "danger", text: "Operasi belum dapat disimpan. Periksa koneksi dan coba kembali." },
  };
  return messages[result] ?? null;
}

export async function FieldTrainingSection({
  field,
  sessionId,
  result,
}: {
  field: FieldDef;
  sessionId?: string;
  result?: string;
}) {
  const identity = await requireIdentity("field:pelatihan:read");
  const canWrite = can(identity, "field:pelatihan:data:write");
  const canIssueCertificate = can(identity, "field:pelatihan:certificate:issue");
  const canRevokeCertificate = can(identity, "organization:team:approve");
  const sql = getV9Sql();

  const [summaryResult, sessionResult, programResult, memberResult, certificateResult] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int
          FROM v9.training_sessions AS session
          WHERE session.organization_id = ${identity.organizationId}
            AND session.field_key = 'pelatihan'
            AND session.status <> 'cancelled'
        ) AS session_count,
        (SELECT count(*)::int
          FROM v9.training_sessions AS session
          WHERE session.organization_id = ${identity.organizationId}
            AND session.field_key = 'pelatihan'
            AND session.status = 'registration_open'
        ) AS registration_open_count,
        (SELECT count(*)::int
          FROM v9.training_sessions AS session
          WHERE session.organization_id = ${identity.organizationId}
            AND session.field_key = 'pelatihan'
            AND session.status = 'completed'
        ) AS completed_count,
        (SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.organization_id = ${identity.organizationId}
            AND enrollment.field_key = 'pelatihan'
            AND enrollment.registration_status <> 'cancelled'
        ) AS participant_count,
        (SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.organization_id = ${identity.organizationId}
            AND enrollment.field_key = 'pelatihan'
            AND enrollment.attendance_status = 'hadir'
        ) AS present_count,
        (SELECT count(*)::int
          FROM v9.training_assessments AS assessment
          WHERE assessment.organization_id = ${identity.organizationId}
            AND assessment.field_key = 'pelatihan'
            AND assessment.assessment_type = 'post'
        ) AS post_assessment_count
    `,
    sql`
      SELECT
        session.id::text AS id,
        session.reference_no,
        session.program_id::text AS program_id,
        program.title AS program_title,
        session.title,
        session.topic,
        session.session_date::text AS session_date,
        to_char(session.start_time, 'HH24:MI') AS start_time,
        to_char(session.end_time, 'HH24:MI') AS end_time,
        session.location,
        session.trainer_label,
        session.max_participants,
        session.description,
        session.status,
        (SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.registration_status <> 'cancelled'
        ) AS enrollment_count,
        (SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.registration_status IN ('registered','confirmed')
        ) AS confirmed_count,
        (SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.registration_status = 'waitlisted'
        ) AS waitlisted_count,
        (SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.attendance_status = 'hadir'
        ) AS present_count
      FROM v9.training_sessions AS session
      LEFT JOIN v9.field_programs AS program
        ON program.id = session.program_id
        AND program.organization_id = session.organization_id
        AND program.field_key = session.field_key
      WHERE session.organization_id = ${identity.organizationId}
        AND session.field_key = 'pelatihan'
      ORDER BY session.session_date DESC, session.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT id::text AS id, reference_no, title
      FROM v9.field_programs
      WHERE organization_id = ${identity.organizationId}
        AND field_key = 'pelatihan'
        AND status <> 'cancelled'
      ORDER BY created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT
        membership.id::text AS id,
        membership.member_number,
        person.full_name
      FROM v9.memberships AS membership
      INNER JOIN v9.people AS person ON person.id = membership.person_id
      WHERE membership.organization_id = ${identity.organizationId}
        AND membership.status = 'active'
      ORDER BY person.full_name
      LIMIT 500
    `,
    sql`
      SELECT
        certificate.id::text AS id,
        certificate.reference_no,
        enrollment.participant_name,
        session.title AS session_title,
        certificate.issue_date::text AS issue_date,
        certificate.issuer_label,
        certificate.status,
        certificate.revocation_note
      FROM v9.training_certificates AS certificate
      INNER JOIN v9.training_enrollments AS enrollment
        ON enrollment.id = certificate.enrollment_id
        AND enrollment.organization_id = certificate.organization_id
        AND enrollment.field_key = certificate.field_key
      INNER JOIN v9.training_sessions AS session
        ON session.id = enrollment.session_id
        AND session.organization_id = enrollment.organization_id
        AND session.field_key = enrollment.field_key
      WHERE certificate.organization_id = ${identity.organizationId}
        AND certificate.field_key = 'pelatihan'
      ORDER BY certificate.issue_date DESC, certificate.created_at DESC
      LIMIT 200
    `,
  ]);

  const summary = rowsFromResult<TrainingSummary>(summaryResult)[0] ?? {
    session_count: 0,
    registration_open_count: 0,
    completed_count: 0,
    participant_count: 0,
    present_count: 0,
    post_assessment_count: 0,
  };
  const sessions = rowsFromResult<SessionRow>(sessionResult);
  const programs = rowsFromResult<ProgramOption>(programResult);
  const members = rowsFromResult<MemberOption>(memberResult);
  const certificates = rowsFromResult<CertificateRow>(certificateResult);
  const selected =
    sessions.find((session) => session.id === sessionId) ??
    sessions.find((session) => session.status === "registration_open" || session.status === "in_progress") ??
    sessions[0] ??
    null;

  let enrollments: EnrollmentRow[] = [];
  if (selected) {
    const enrollmentResult = await sql`
      SELECT
        enrollment.id::text AS id,
        enrollment.membership_id::text AS membership_id,
        membership.member_number,
        enrollment.participant_name,
        enrollment.affiliation_label,
        enrollment.registration_status,
        enrollment.attendance_status,
        pre.score::text AS pre_score,
        post.score::text AS post_score,
        certificate.id::text AS certificate_id,
        certificate.reference_no AS certificate_reference,
        certificate.status AS certificate_status
      FROM v9.training_enrollments AS enrollment
      LEFT JOIN v9.memberships AS membership
        ON membership.id = enrollment.membership_id
        AND membership.organization_id = enrollment.organization_id
      LEFT JOIN LATERAL (
        SELECT assessment.score
        FROM v9.training_assessments AS assessment
        WHERE assessment.enrollment_id = enrollment.id
          AND assessment.assessment_type = 'pre'
        LIMIT 1
      ) AS pre ON true
      LEFT JOIN LATERAL (
        SELECT assessment.score
        FROM v9.training_assessments AS assessment
        WHERE assessment.enrollment_id = enrollment.id
          AND assessment.assessment_type = 'post'
        LIMIT 1
      ) AS post ON true
      LEFT JOIN v9.training_certificates AS certificate
        ON certificate.enrollment_id = enrollment.id
      WHERE enrollment.session_id = ${selected.id}
        AND enrollment.organization_id = ${identity.organizationId}
        AND enrollment.field_key = 'pelatihan'
      ORDER BY
        CASE enrollment.registration_status
          WHEN 'registered' THEN 1
          WHEN 'confirmed' THEN 2
          WHEN 'waitlisted' THEN 3
          ELSE 4
        END,
        enrollment.participant_name
      LIMIT 500
    `;
    enrollments = rowsFromResult<EnrollmentRow>(enrollmentResult);
  }

  const message = resultNotice(result);
  const canEnroll = selected?.status === "registration_open";
  const canRecordResults = selected?.status === "in_progress" || selected?.status === "completed";
  const registrationSlots = selected?.max_participants === null || selected?.max_participants === undefined
    ? null
    : Math.max(0, selected.max_participants - selected.confirmed_count);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title="Kelas & pelatihan"
        description="Kelola sesi, peserta, presensi, asesmen, dan register sertifikat internal. Setiap hasil dicatat oleh petugas dan memiliki jejak audit."
        actions={<Link href={field.appHref} className="sb-btn sb-btn-outline">Ringkasan bidang</Link>}
      />

      {message ? (
        <div className="mb-4">
          <Notice tone={message.tone} title="Pembaruan pelatihan">{message.text}</Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sesi tercatat" value={summary.session_count} note="Tidak termasuk sesi dibatalkan" tone="info" />
        <StatCard label="Pendaftaran dibuka" value={summary.registration_open_count} note="Sesi menerima peserta" tone="success" />
        <StatCard label="Peserta terdaftar" value={summary.participant_count} note="Termasuk daftar tunggu" tone="accent" />
        <StatCard label="Kehadiran tercatat" value={summary.present_count} note="Akumulasi status hadir" tone="success" />
        <StatCard label="Sesi selesai" value={summary.completed_count} note="Pelaksanaan selesai" tone="neutral" />
        <StatCard label="Post-test tercatat" value={summary.post_assessment_count} note="Asesmen yang sudah diinput" tone="warning" />
      </div>

      {canWrite ? (
        <Card className="mt-5">
          <CardHeader title="Buat sesi pelatihan" subtitle="Sesi dapat dikaitkan dengan program bidang. Pendaftaran harus dibuka melalui perubahan status." />
          <form action={createTrainingSession} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-3">
              <label htmlFor="training-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama pelatihan / kelas</label>
              <input id="training-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder="Nama kegiatan pelatihan" />
            </div>
            <div>
              <label htmlFor="training-program" className="mb-1 block text-[11.5px] font-semibold text-ink2">Program terkait (opsional)</label>
              <select id="training-program" name="program_id" defaultValue="" className="sb-input">
                <option value="">Belum ditautkan</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.reference_no} · {program.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="training-topic" className="mb-1 block text-[11.5px] font-semibold text-ink2">Topik</label>
              <input id="training-topic" name="topic" maxLength={240} className="sb-input" placeholder="Topik / kompetensi" />
            </div>
            <div>
              <label htmlFor="training-date" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal</label>
              <input id="training-date" name="session_date" type="date" required className="sb-input" />
            </div>
            <div>
              <label htmlFor="training-start" className="mb-1 block text-[11.5px] font-semibold text-ink2">Mulai</label>
              <input id="training-start" name="start_time" type="time" className="sb-input" />
            </div>
            <div>
              <label htmlFor="training-end" className="mb-1 block text-[11.5px] font-semibold text-ink2">Selesai</label>
              <input id="training-end" name="end_time" type="time" className="sb-input" />
            </div>
            <div>
              <label htmlFor="training-location" className="mb-1 block text-[11.5px] font-semibold text-ink2">Lokasi</label>
              <input id="training-location" name="location" maxLength={300} className="sb-input" placeholder="Tempat pelaksanaan" />
            </div>
            <div>
              <label htmlFor="training-trainer" className="mb-1 block text-[11.5px] font-semibold text-ink2">Narasumber / pelatih</label>
              <input id="training-trainer" name="trainer_label" maxLength={160} className="sb-input" placeholder="Nama narasumber" />
            </div>
            <div>
              <label htmlFor="training-capacity" className="mb-1 block text-[11.5px] font-semibold text-ink2">Kapasitas peserta (opsional)</label>
              <input id="training-capacity" name="max_participants" type="number" min="1" max="50000" step="1" className="sb-input" placeholder="Tanpa batas" />
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label htmlFor="training-description" className="mb-1 block text-[11.5px] font-semibold text-ink2">Deskripsi / materi</label>
              <textarea id="training-description" name="description" rows={2} maxLength={5000} className="sb-input !h-auto resize-y py-2.5" />
            </div>
            <div className="flex justify-end sm:col-span-2 xl:col-span-3">
              <button type="submit" className="sb-btn sb-btn-primary"><CalendarDays size={14} /> Simpan sesi</button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Daftar sesi" subtitle={`${sessions.length} sesi · maksimal 200`} />
          {sessions.length ? (
            <div className="divide-y divide-line">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/app/bidang/pelatihan/data?session_id=${session.id}`}
                  className={`block px-4 py-3 hover:bg-paper ${selected?.id === session.id ? "bg-paper" : ""}`}
                >
                  <div className="font-mono text-[9.5px] text-muted2">{session.reference_no}</div>
                  <div className="mt-1 text-[12px] font-semibold text-ink">{session.title}</div>
                  <div className="mt-1 text-[10.5px] text-muted">{dateLabel(session.session_date)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={session.status === "completed" ? "success" : session.status === "registration_open" ? "info" : session.status === "cancelled" ? "neutral" : "warning"}>
                      {sessionStatus[session.status]}
                    </Badge>
                    <Badge tone="neutral">{session.enrollment_count} peserta</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-9"><EmptyState title="Belum ada sesi pelatihan" body="Buat sesi pertama untuk mulai mendaftarkan peserta." /></div>
          )}
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader
                title={selected.title}
                subtitle={`${selected.reference_no} · ${dateLabel(selected.session_date)}`}
                action={<Badge tone={selected.status === "completed" ? "success" : selected.status === "registration_open" ? "info" : selected.status === "cancelled" ? "neutral" : "warning"}>{sessionStatus[selected.status]}</Badge>}
              />
              <div className="grid gap-2 px-4 pb-3 text-[11px] text-muted sm:grid-cols-2">
                {selected.topic ? <div>Topik: {selected.topic}</div> : null}
                {selected.program_title ? <div>Program: {selected.program_title}</div> : null}
                {selected.trainer_label ? <div>Narasumber: {selected.trainer_label}</div> : null}
                {selected.location ? <div>Lokasi: {selected.location}</div> : null}
                {selected.start_time ? <div>Waktu: {selected.start_time}{selected.end_time ? `–${selected.end_time}` : ""} WIB</div> : null}
                <div>Kapasitas: {selected.max_participants ?? "Tidak dibatasi"}</div>
              </div>
              {selected.description ? <p className="px-4 pb-3 text-[11.5px] text-muted">{selected.description}</p> : null}
              <div className="grid grid-cols-3 gap-2 border-t border-line p-3">
                <div className="rounded-[8px] bg-paper px-3 py-2">
                  <div className="text-[10px] text-muted">Terdaftar</div>
                  <div className="text-[18px] font-bold tabular-nums text-ink">{selected.confirmed_count}</div>
                </div>
                <div className="rounded-[8px] bg-paper px-3 py-2">
                  <div className="text-[10px] text-muted">Daftar tunggu</div>
                  <div className="text-[18px] font-bold tabular-nums text-ink">{selected.waitlisted_count}</div>
                </div>
                <div className="rounded-[8px] bg-paper px-3 py-2">
                  <div className="text-[10px] text-muted">Hadir</div>
                  <div className="text-[18px] font-bold tabular-nums text-ink">{selected.present_count}</div>
                </div>
              </div>
              {canWrite ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                  {selected.status === "planned" ? (
                    <form action={updateTrainingSessionStatus}>
                      <input type="hidden" name="session_id" value={selected.id} />
                      <input type="hidden" name="next_status" value="registration_open" />
                      <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">Buka pendaftaran</button>
                    </form>
                  ) : null}
                  {selected.status === "registration_open" ? (
                    <form action={updateTrainingSessionStatus}>
                      <input type="hidden" name="session_id" value={selected.id} />
                      <input type="hidden" name="next_status" value="in_progress" />
                      <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">Mulai sesi</button>
                    </form>
                  ) : null}
                  {selected.status === "in_progress" ? (
                    <form action={updateTrainingSessionStatus}>
                      <input type="hidden" name="session_id" value={selected.id} />
                      <input type="hidden" name="next_status" value="completed" />
                      <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">Tandai selesai</button>
                    </form>
                  ) : null}
                  {["planned","registration_open","in_progress"].includes(selected.status) ? (
                    <form action={updateTrainingSessionStatus}>
                      <input type="hidden" name="session_id" value={selected.id} />
                      <input type="hidden" name="next_status" value="cancelled" />
                      <button type="submit" className="sb-btn sb-btn-ghost !h-8 !px-3 text-[10.5px]">Batalkan sesi</button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </Card>

            {canWrite && canEnroll ? (
              <Card>
                <CardHeader title="Daftarkan peserta" subtitle={registrationSlots === null ? "Pendaftaran terbuka tanpa batas kapasitas." : `Sisa slot terdaftar: ${registrationSlots}. Pendaftar saat penuh masuk daftar tunggu.`} />
                <form action={enrollTrainingParticipant} className="grid gap-3 p-4 sm:grid-cols-2">
                  <input type="hidden" name="session_id" value={selected.id} />
                  <div className="sm:col-span-2">
                    <label htmlFor="training-member" className="mb-1 block text-[11.5px] font-semibold text-ink2">Anggota aktif (opsional)</label>
                    <select id="training-member" name="membership_id" defaultValue="" className="sb-input">
                      <option value="">Peserta tamu / non-anggota</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name}{member.member_number ? ` · ${member.member_number}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="training-participant-name" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama peserta tamu</label>
                    <input id="training-participant-name" name="participant_name" maxLength={160} className="sb-input" placeholder="Wajib jika bukan anggota" />
                  </div>
                  <div>
                    <label htmlFor="training-affiliation" className="mb-1 block text-[11.5px] font-semibold text-ink2">Asal / instansi (opsional)</label>
                    <input id="training-affiliation" name="affiliation_label" maxLength={160} className="sb-input" placeholder="Asal peserta" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="training-enrollment-note" className="mb-1 block text-[11.5px] font-semibold text-ink2">Catatan</label>
                    <input id="training-enrollment-note" name="note" maxLength={1000} className="sb-input" />
                  </div>
                  <div className="flex justify-end sm:col-span-2">
                    <button type="submit" className="sb-btn sb-btn-primary"><UsersRound size={14} /> Daftarkan peserta</button>
                  </div>
                </form>
              </Card>
            ) : null}

            <Card>
              <CardHeader title="Peserta & presensi" subtitle={`${enrollments.length} peserta terdaftar / daftar tunggu`} />
              {enrollments.length ? (
                <div className="divide-y divide-line">
                  {enrollments.map((enrollment) => (
                    <article key={enrollment.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-ink">{enrollment.participant_name}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                            {enrollment.member_number ? <span>Nomor {enrollment.member_number}</span> : <span>Peserta eksternal</span>}
                            {enrollment.affiliation_label ? <span>{enrollment.affiliation_label}</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={enrollment.registration_status === "waitlisted" ? "warning" : enrollment.registration_status === "cancelled" ? "neutral" : "info"}>
                            {registrationStatus[enrollment.registration_status]}
                          </Badge>
                          <Badge tone={enrollment.attendance_status === "hadir" ? "success" : enrollment.attendance_status === "not_marked" ? "neutral" : "warning"}>
                            {attendanceStatus[enrollment.attendance_status]}
                          </Badge>
                        </div>
                      </div>

                      {canWrite && selected.status === "registration_open" && enrollment.registration_status !== "cancelled" && enrollment.attendance_status === "not_marked" ? (
                        <form action={cancelTrainingEnrollment} className="mt-3 flex justify-end border-t border-line pt-2">
                          <input type="hidden" name="enrollment_id" value={enrollment.id} />
                          <button type="submit" className="sb-btn sb-btn-ghost !h-8 !px-3 text-[10px]">Batalkan pendaftaran</button>
                        </form>
                      ) : null}

                      {canWrite && canRecordResults && enrollment.registration_status !== "cancelled" ? (
                        <div className="mt-3 grid gap-3 border-t border-line pt-3 lg:grid-cols-2">
                          <form action={updateTrainingAttendance} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="enrollment_id" value={enrollment.id} />
                            <select name="attendance_status" defaultValue={enrollment.attendance_status === "not_marked" ? "hadir" : enrollment.attendance_status} className="sb-input !h-8 min-w-0 flex-1 text-[10.5px]" aria-label={`Presensi ${enrollment.participant_name}`}>
                              <option value="hadir">Hadir</option>
                              <option value="izin">Izin</option>
                              <option value="sakit">Sakit</option>
                              <option value="alpa">Tanpa keterangan</option>
                            </select>
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Simpan presensi</button>
                          </form>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <form action={recordTrainingAssessment} className="flex items-center gap-1.5">
                              <input type="hidden" name="enrollment_id" value={enrollment.id} />
                              <input type="hidden" name="assessment_type" value="pre" />
                              <label className="sr-only" htmlFor={`pre-score-${enrollment.id}`}>Nilai pre-test</label>
                              <input id={`pre-score-${enrollment.id}`} name="score" type="number" min="0" max="100" step="0.01" required defaultValue={enrollment.pre_score ?? ""} className="sb-input !h-8 min-w-0 flex-1 text-[10.5px]" placeholder="Pre-test" />
                              <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Simpan</button>
                            </form>
                            <form action={recordTrainingAssessment} className="flex items-center gap-1.5">
                              <input type="hidden" name="enrollment_id" value={enrollment.id} />
                              <input type="hidden" name="assessment_type" value="post" />
                              <label className="sr-only" htmlFor={`post-score-${enrollment.id}`}>Nilai post-test</label>
                              <input id={`post-score-${enrollment.id}`} name="score" type="number" min="0" max="100" step="0.01" required defaultValue={enrollment.post_score ?? ""} className="sb-input !h-8 min-w-0 flex-1 text-[10.5px]" placeholder="Post-test" />
                              <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Simpan</button>
                            </form>
                          </div>

                          <div className="flex flex-wrap gap-3 text-[10.5px] text-muted2 lg:col-span-2">
                            <span>Pre-test: {enrollment.pre_score ?? "Belum dicatat"}</span>
                            <span>Post-test: {enrollment.post_score ?? "Belum dicatat"}</span>
                          </div>
                        </div>
                      ) : null}

                      {enrollment.certificate_reference ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5 text-[10.5px]">
                          <Award size={13} className="text-primary-700" />
                          <span className="font-mono text-muted">{enrollment.certificate_reference}</span>
                          <Badge tone={enrollment.certificate_status === "issued" ? "success" : "warning"}>
                            {enrollment.certificate_status === "issued" ? "Terbit" : "Dicabut"}
                          </Badge>
                        </div>
                      ) : canIssueCertificate && selected.status === "completed" && enrollment.attendance_status === "hadir" && enrollment.registration_status !== "cancelled" ? (
                        <form action={issueTrainingCertificate} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                          <input type="hidden" name="enrollment_id" value={enrollment.id} />
                          <div>
                            <label className="mb-1 block text-[10px] text-muted" htmlFor={`certificate-date-${enrollment.id}`}>Tanggal terbit</label>
                            <input id={`certificate-date-${enrollment.id}`} name="issue_date" type="date" required className="sb-input !h-8 text-[10px]" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] text-muted" htmlFor={`certificate-issuer-${enrollment.id}`}>Penerbit</label>
                            <input id={`certificate-issuer-${enrollment.id}`} name="issuer_label" required minLength={2} maxLength={160} className="sb-input !h-8 text-[10px]" placeholder="Nama / jabatan penerbit" />
                          </div>
                          <div className="flex items-end">
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[9.5px]">Terbitkan register</button>
                          </div>
                        </form>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-8"><EmptyState title="Belum ada peserta" body="Peserta dapat didaftarkan setelah pendaftaran sesi dibuka." /></div>
              )}
            </Card>
          </div>
        ) : (
          <Card>
            <div className="px-5 py-12">
              <EmptyState title="Belum ada sesi terpilih" body="Buat sesi pelatihan terlebih dahulu untuk mengelola peserta, presensi, dan asesmen." />
            </div>
          </Card>
        )}
      </div>

      <Card className="mt-5">
        <CardHeader title="Register sertifikat internal" subtitle={`${certificates.length} catatan terbaru`} />
        {certificates.length ? (
          <div className="divide-y divide-line">
            {certificates.map((certificate) => (
              <article key={certificate.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[9.5px] text-muted2">{certificate.reference_no}</div>
                  <div className="mt-1 text-[12px] font-semibold text-ink">{certificate.participant_name}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted">{certificate.session_title} · {dateLabel(certificate.issue_date)} · Penerbit: {certificate.issuer_label}</div>
                  {certificate.revocation_note ? <div className="mt-1 text-[10.5px] text-muted2">Alasan pencabutan: {certificate.revocation_note}</div> : null}
                </div>
                <Badge tone={certificate.status === "issued" ? "success" : "warning"}>{certificate.status === "issued" ? "Terbit" : "Dicabut"}</Badge>
                {certificate.status === "issued" && canRevokeCertificate ? (
                  <form action={revokeTrainingCertificate} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="certificate_id" value={certificate.id} />
                    <input name="revocation_note" required minLength={3} maxLength={1000} className="sb-input !h-8 w-[200px] text-[10px]" placeholder="Alasan pencabutan" />
                    <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[9.5px]">Cabut</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8"><EmptyState title="Belum ada sertifikat" body="Register internal hanya diterbitkan oleh petugas berwenang setelah sesi selesai dan peserta tercatat hadir." /></div>
        )}
      </Card>

      <div className="mt-5">
        <Notice tone="info" title="Batas penggunaan register sertifikat">
          Nomor sertifikat yang dihasilkan adalah nomor referensi internal sistem. Penerbitan catatan
          ini tidak menyatakan akreditasi, lisensi profesi, atau pengakuan dari lembaga eksternal.
          Kelulusan, syarat kehadiran tambahan, dan format sertifikat resmi harus mengikuti kebijakan
          organisasi dan ketentuan penyelenggara pelatihan.
        </Notice>
      </div>
    </div>
  );
}
