import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, CircleUserRound, FileSignature, UsersRound } from "lucide-react";
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
import { recordSecretariatAttendance } from "@/app/actions/secretariat-meetings";

export const metadata: Metadata = { title: "Daftar Hadir" };

interface MeetingOption {
  id: string;
  reference_no: string;
  title: string;
  meeting_date: string;
  status: "scheduled" | "completed" | "cancelled";
  minutes_id: string | null;
  generated_document_id: string | null;
}

interface AttendanceRow {
  id: string;
  membership_id: string | null;
  display_name: string;
  role_label: string | null;
  attendance_status: "hadir" | "izin" | "sakit" | "alpa";
  attendance_note: string | null;
  signature_recorded: boolean;
}

interface MemberOption {
  id: string;
  full_name: string;
  member_number: string | null;
  position_title: string | null;
  status: "pending" | "active";
}

interface AttendanceSummary {
  present_count: number;
  excused_count: number;
  sick_count: number;
  absent_count: number;
}

const attendanceLabel: Record<AttendanceRow["attendance_status"], string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Tanpa keterangan",
};

const attendanceTone: Record<AttendanceRow["attendance_status"], "success" | "info" | "warning" | "neutral"> = {
  hadir: "success",
  izin: "info",
  sakit: "warning",
  alpa: "neutral",
};

const meetingStatusLabel: Record<MeetingOption["status"], string> = {
  scheduled: "Terjadwal",
  completed: "Terlaksana",
  cancelled: "Dibatalkan",
};

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default async function PresensiPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting_id?: string; result?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const canGenerateDocuments = can(identity, "secretariat:documents:write");
  const { meeting_id, result } = await searchParams;
  const sql = getV9Sql();

  const [meetingResult, membersResult, aggregateResult] = await Promise.all([
    sql`
      SELECT
        meeting.id::text AS id,
        meeting.reference_no,
        meeting.title,
        meeting.meeting_date::text AS meeting_date,
        meeting.status,
        latest_minutes.id::text AS minutes_id,
        generated_document.id::text AS generated_document_id
      FROM v9.secretariat_meetings AS meeting
      LEFT JOIN LATERAL (
        SELECT minutes.id
        FROM v9.secretariat_minutes AS minutes
        WHERE minutes.meeting_id = meeting.id
        ORDER BY minutes.revision_no DESC
        LIMIT 1
      ) AS latest_minutes ON true
      LEFT JOIN LATERAL (
        SELECT document.id
        FROM v9.secretariat_documents AS document
        WHERE document.organization_id = meeting.organization_id
          AND document.source_minutes_id = latest_minutes.id
          AND document.status <> 'arsip'
        ORDER BY document.created_at DESC
        LIMIT 1
      ) AS generated_document ON true
      WHERE meeting.organization_id = ${identity.organizationId}
        AND meeting.status <> 'cancelled'
      ORDER BY meeting.meeting_date DESC, meeting.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT
        membership.id::text AS id,
        person.full_name,
        membership.member_number,
        membership.position_title,
        membership.status
      FROM v9.memberships AS membership
      INNER JOIN v9.people AS person ON person.id = membership.person_id
      WHERE membership.organization_id = ${identity.organizationId}
        AND membership.status IN ('pending', 'active')
      ORDER BY
        CASE membership.status WHEN 'active' THEN 1 ELSE 2 END,
        person.full_name
      LIMIT 500
    `,
    sql`
      SELECT
        count(*) FILTER (WHERE attendance_status = 'hadir')::int AS present_count,
        count(*) FILTER (WHERE attendance_status = 'izin')::int AS excused_count,
        count(*) FILTER (WHERE attendance_status = 'sakit')::int AS sick_count,
        count(*) FILTER (WHERE attendance_status = 'alpa')::int AS absent_count
      FROM v9.secretariat_meeting_attendance AS attendance
      INNER JOIN v9.secretariat_meetings AS meeting ON meeting.id = attendance.meeting_id
      WHERE meeting.organization_id = ${identity.organizationId}
    `,
  ]);

  const meetings = rowsFromResult<MeetingOption>(meetingResult);
  const members = rowsFromResult<MemberOption>(membersResult);
  const selected =
    meetings.find((meeting) => meeting.id === meeting_id) ??
    meetings.find((meeting) => meeting.status === "completed") ??
    meetings[0] ??
    null;
  const aggregate = rowsFromResult<AttendanceSummary>(aggregateResult)[0] ?? {
    present_count: 0,
    excused_count: 0,
    sick_count: 0,
    absent_count: 0,
  };

  let attendance: AttendanceRow[] = [];
  let selectedSummary: AttendanceSummary = {
    present_count: 0,
    excused_count: 0,
    sick_count: 0,
    absent_count: 0,
  };

  if (selected) {
    const [listResult, countResult] = await Promise.all([
      sql`
        SELECT
          id::text AS id,
          membership_id::text AS membership_id,
          display_name,
          role_label,
          attendance_status,
          attendance_note,
          signature_recorded
        FROM v9.secretariat_meeting_attendance
        WHERE meeting_id = ${selected.id}
        ORDER BY
          CASE attendance_status
            WHEN 'hadir' THEN 1
            WHEN 'izin' THEN 2
            WHEN 'sakit' THEN 3
            ELSE 4
          END,
          display_name
        LIMIT 500
      `,
      sql`
        SELECT
          count(*) FILTER (WHERE attendance_status = 'hadir')::int AS present_count,
          count(*) FILTER (WHERE attendance_status = 'izin')::int AS excused_count,
          count(*) FILTER (WHERE attendance_status = 'sakit')::int AS sick_count,
          count(*) FILTER (WHERE attendance_status = 'alpa')::int AS absent_count
        FROM v9.secretariat_meeting_attendance
        WHERE meeting_id = ${selected.id}
      `,
    ]);
    attendance = rowsFromResult<AttendanceRow>(listResult);
    selectedSummary = rowsFromResult<AttendanceSummary>(countResult)[0] ?? selectedSummary;
  }

  const notices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    saved: { tone: "success", text: "Daftar hadir berhasil disimpan atau diperbarui." },
    invalid: { tone: "danger", text: "Data kehadiran tidak valid. Periksa peserta dan status yang dipilih." },
    stale: { tone: "warning", text: "Rapat atau peserta tidak ditemukan, atau rapat sudah dibatalkan." },
    error: { tone: "danger", text: "Kehadiran belum dapat disimpan. Periksa koneksi dan coba kembali." },
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Daftar hadir rapat"
        description="Rekap kehadiran tersimpan bersama rapat dan dapat dihubungkan ke anggota pada Buku Induk atau dicatat sebagai tamu."
        actions={<Link href="/app/sekretariat/notulen" className="sb-btn sb-btn-outline">Notulen</Link>}
      />

      {result && notices[result] ? (
        <div className="mb-4">
          <Notice tone={notices[result].tone} title="Pembaruan daftar hadir">
            {notices[result].text}
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total hadir" value={aggregate.present_count} note="Seluruh rapat organisasi" tone="success" />
        <StatCard label="Izin" value={aggregate.excused_count} note="Seluruh rapat organisasi" tone="info" />
        <StatCard label="Sakit" value={aggregate.sick_count} note="Seluruh rapat organisasi" tone="warning" />
        <StatCard label="Tanpa keterangan" value={aggregate.absent_count} note="Seluruh rapat organisasi" tone="neutral" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Pilih rapat" subtitle={`${meetings.length} rapat tersedia`} />
          {meetings.length ? (
            <div className="divide-y divide-line">
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/app/sekretariat/presensi?meeting_id=${meeting.id}`}
                  className={`block px-4 py-3 hover:bg-paper ${selected?.id === meeting.id ? "bg-paper" : ""}`}
                >
                  <div className="font-mono text-[9.5px] text-muted2">{meeting.reference_no}</div>
                  <div className="mt-1 text-[12px] font-semibold text-ink">{meeting.title}</div>
                  <div className="mt-1 text-[10.5px] text-muted">{dateLabel(meeting.meeting_date)}</div>
                  <div className="mt-2">
                    <Badge tone={meeting.status === "completed" ? "success" : "info"}>{meetingStatusLabel[meeting.status]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8">
              <EmptyState title="Belum ada rapat" body="Buat agenda rapat sebelum mencatat kehadiran." />
              <div className="mt-3 text-center">
                <Link href="/app/sekretariat/rapat" className="text-[11px] font-semibold text-primary-700">Buka Rapat & Undangan</Link>
              </div>
            </div>
          )}
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader
                title={selected.title}
                subtitle={`${selected.reference_no} · ${dateLabel(selected.meeting_date)}`}
                action={<Badge tone={selected.status === "completed" ? "success" : "info"}>{meetingStatusLabel[selected.status]}</Badge>}
              />
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                <div className="rounded-[9px] bg-[#edf5e8] px-3 py-2">
                  <div className="text-[10px] text-[#4b673b]">Hadir</div>
                  <div className="text-[20px] font-bold tabular-nums text-[#38571a]">{selectedSummary.present_count}</div>
                </div>
                <div className="rounded-[9px] bg-[#eef4f8] px-3 py-2">
                  <div className="text-[10px] text-[#47657a]">Izin</div>
                  <div className="text-[20px] font-bold tabular-nums text-[#3d5a70]">{selectedSummary.excused_count}</div>
                </div>
                <div className="rounded-[9px] bg-[#fff4e2] px-3 py-2">
                  <div className="text-[10px] text-[#856020]">Sakit</div>
                  <div className="text-[20px] font-bold tabular-nums text-[#80540a]">{selectedSummary.sick_count}</div>
                </div>
                <div className="rounded-[9px] bg-paper px-3 py-2">
                  <div className="text-[10px] text-muted">Tanpa keterangan</div>
                  <div className="text-[20px] font-bold tabular-nums text-ink">{selectedSummary.absent_count}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 text-[10.5px] text-muted2">
                <span className="inline-flex items-center gap-1.5"><UsersRound size={12} />{attendance.length} orang tercatat</span>
                <Link href={`/app/sekretariat/notulen?meeting_id=${selected.id}`} className="font-semibold text-primary-700">Buka notulen</Link>
                {canGenerateDocuments && selected.minutes_id ? (
                  <Link href={"/app/sekretariat/template/TPL-NOT?source_minutes_id=" + selected.minutes_id} className="font-semibold text-primary-700">
                    {selected.generated_document_id ? "Buka naskah notulen" : "Susun notulen dari presensi"}
                  </Link>
                ) : null}
              </div>
            </Card>

            <Card>
              <CardHeader title="Tambah peserta / perbarui kehadiran" subtitle="Pilih anggota dari Buku Induk atau masukkan tamu non-anggota." />
              <form action={recordSecretariatAttendance} className="grid gap-3 p-4 sm:grid-cols-2">
                <input type="hidden" name="meeting_id" value={selected.id} />
                <div className="sm:col-span-2">
                  <label htmlFor="attendance-member" className="mb-1 block text-[11.5px] font-semibold text-ink2">Anggota terdaftar</label>
                  <select id="attendance-member" name="membership_id" className="sb-input" defaultValue="">
                    <option value="">Tamu / bukan anggota terdaftar</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}{member.member_number ? ` · ${member.member_number}` : ""}{member.status === "pending" ? " · menunggu verifikasi" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="attendance-guest" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama tamu (jika bukan anggota)</label>
                  <input id="attendance-guest" name="guest_name" maxLength={160} className="sb-input" placeholder="Nama tamu" />
                </div>
                <div>
                  <label htmlFor="attendance-role" className="mb-1 block text-[11.5px] font-semibold text-ink2">Jabatan / asal (opsional)</label>
                  <input id="attendance-role" name="guest_role" maxLength={160} className="sb-input" placeholder="Mis. PPL / Pemerintah Desa" />
                </div>
                <div>
                  <label htmlFor="attendance-status" className="mb-1 block text-[11.5px] font-semibold text-ink2">Status kehadiran</label>
                  <select id="attendance-status" name="attendance_status" className="sb-input" defaultValue="hadir">
                    <option value="hadir">Hadir</option>
                    <option value="izin">Izin</option>
                    <option value="sakit">Sakit</option>
                    <option value="alpa">Tanpa keterangan</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="attendance-note" className="mb-1 block text-[11.5px] font-semibold text-ink2">Catatan (opsional)</label>
                  <input id="attendance-note" name="attendance_note" maxLength={1000} className="sb-input" placeholder="Catatan kehadiran" />
                </div>
                <label className="flex items-center gap-2 text-[11px] text-ink2 sm:col-span-2">
                  <input type="checkbox" name="signature_recorded" className="h-4 w-4 accent-[var(--sb-primary-700)]" />
                  Tanda tangan pada daftar hadir fisik telah diperiksa
                </label>
                <div className="flex justify-end sm:col-span-2">
                  <button type="submit" className="sb-btn sb-btn-primary">Simpan kehadiran</button>
                </div>
              </form>
            </Card>

            <Card>
              <CardHeader title="Rekap peserta" subtitle={`${attendance.length} baris pada rapat ini`} />
              {attendance.length ? (
                <div className="divide-y divide-line">
                  {attendance.map((row, index) => (
                    <article key={row.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-semibold text-muted">{index + 1}</div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-ink">{row.display_name}</div>
                          {row.role_label ? <div className="mt-0.5 text-[10.5px] text-muted">{row.role_label}</div> : null}
                          {row.attendance_note ? <div className="mt-1 text-[10.5px] text-muted2">{row.attendance_note}</div> : null}
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted2">
                            <FileSignature size={10} />
                            {row.signature_recorded ? "Tanda tangan fisik diperiksa" : "Tanda tangan belum diverifikasi"}
                          </div>
                        </div>
                      </div>
                      <form action={recordSecretariatAttendance} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="meeting_id" value={selected.id} />
                        {row.membership_id ? (
                          <input type="hidden" name="membership_id" value={row.membership_id} />
                        ) : (
                          <input type="hidden" name="guest_name" value={row.display_name} />
                        )}
                        {row.role_label ? <input type="hidden" name="guest_role" value={row.role_label} /> : null}
                        {row.attendance_note ? <input type="hidden" name="attendance_note" value={row.attendance_note} /> : null}
                        <select name="attendance_status" defaultValue={row.attendance_status} className="sb-input !h-8 min-w-[142px] text-[10.5px]" aria-label={`Status kehadiran ${row.display_name}`}>
                          <option value="hadir">Hadir</option>
                          <option value="izin">Izin</option>
                          <option value="sakit">Sakit</option>
                          <option value="alpa">Tanpa keterangan</option>
                        </select>
                        <label className="flex items-center gap-1 text-[9.5px] text-muted">
                          <input type="checkbox" name="signature_recorded" defaultChecked={row.signature_recorded} className="h-3.5 w-3.5 accent-[var(--sb-primary-700)]" />
                          Tanda tangan
                        </label>
                        <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[10px]">Perbarui</button>
                      </form>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <CircleUserRound size={26} className="mx-auto text-muted2" />
                  <h3 className="mt-2 text-[13px] font-semibold text-ink">Belum ada peserta tercatat</h3>
                  <p className="mt-1 text-[11.5px] text-muted">Tambahkan anggota atau tamu melalui formulir di atas.</p>
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Keterkaitan dengan notulen">
          Rekap kehadiran merupakan catatan pendamping rapat dan dapat digunakan saat menyusun notulen.
          Tanda tangan fisik hanya dicatat status pemeriksaannya; sistem ini tidak mengklaim sebagai tanda tangan elektronik.
        </Notice>
      </div>
    </div>
  );
}
