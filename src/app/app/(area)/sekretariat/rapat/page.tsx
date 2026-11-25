import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ClipboardList, MapPin, UsersRound } from "lucide-react";
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
import {
  createSecretariatMeeting,
  updateSecretariatMeetingStatus,
} from "@/app/actions/secretariat-meetings";

export const metadata: Metadata = { title: "Rapat & Undangan" };

interface MeetingRow {
  id: string;
  reference_no: string;
  title: string;
  meeting_type: "pengurus" | "bidang" | "anggota";
  meeting_date: string;
  time_label: string | null;
  location: string | null;
  description: string | null;
  status: "scheduled" | "completed" | "cancelled";
  unit_name: string | null;
  attendance_count: number;
  minutes_status: "draft" | "final" | null;
  invitation_document_id: string | null;
}

interface MeetingSummary {
  scheduled_count: number;
  completed_count: number;
  cancelled_count: number;
  attendance_count: number;
}

const meetingTypeLabel: Record<MeetingRow["meeting_type"], string> = {
  pengurus: "Rapat pengurus",
  bidang: "Rapat bidang",
  anggota: "Rapat anggota",
};

const meetingStatusLabel: Record<MeetingRow["status"], string> = {
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

export default async function RapatSekretariatPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const canWrite = can(identity, "secretariat:meetings:write");
  const canGenerateDocuments = can(identity, "secretariat:documents:write");
  const { result } = await searchParams;
  const sql = getV9Sql();

  const [summaryResult, meetingResult] = await Promise.all([
    sql`
      SELECT
        count(*) FILTER (WHERE status = 'scheduled')::int AS scheduled_count,
        count(*) FILTER (WHERE status = 'completed')::int AS completed_count,
        count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
        COALESCE((
          SELECT count(*)::int
          FROM v9.secretariat_meeting_attendance AS attendance
          INNER JOIN v9.secretariat_meetings AS meeting
            ON meeting.id = attendance.meeting_id
          WHERE meeting.organization_id = ${identity.organizationId}
            AND attendance.attendance_status = 'hadir'
        ), 0) AS attendance_count
      FROM v9.secretariat_meetings
      WHERE organization_id = ${identity.organizationId}
    `,
    sql`
      SELECT
        meeting.id::text AS id,
        meeting.reference_no,
        meeting.title,
        meeting.meeting_type,
        meeting.meeting_date::text AS meeting_date,
        meeting.time_label,
        meeting.location,
        meeting.description,
        meeting.status,
        unit.name AS unit_name,
        COALESCE(attendance.count, 0)::int AS attendance_count,
        latest_minutes.status AS minutes_status,
        invitation_document.id::text AS invitation_document_id
      FROM v9.secretariat_meetings AS meeting
      LEFT JOIN v9.organization_units AS unit
        ON unit.id = meeting.unit_id
        AND unit.organization_id = meeting.organization_id
      LEFT JOIN LATERAL (
        SELECT count(*) AS count
        FROM v9.secretariat_meeting_attendance AS attendee
        WHERE attendee.meeting_id = meeting.id
          AND attendee.attendance_status = 'hadir'
      ) AS attendance ON true
      LEFT JOIN LATERAL (
        SELECT minutes.status
        FROM v9.secretariat_minutes AS minutes
        WHERE minutes.meeting_id = meeting.id
        ORDER BY minutes.revision_no DESC
        LIMIT 1
      ) AS latest_minutes ON true
      LEFT JOIN LATERAL (
        SELECT document.id
        FROM v9.secretariat_documents AS document
        WHERE document.organization_id = meeting.organization_id
          AND document.source_meeting_id = meeting.id
          AND document.status <> 'arsip'
        ORDER BY document.created_at DESC
        LIMIT 1
      ) AS invitation_document ON true
      WHERE meeting.organization_id = ${identity.organizationId}
      ORDER BY
        CASE meeting.status WHEN 'scheduled' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
        meeting.meeting_date DESC,
        meeting.created_at DESC
      LIMIT 200
    `,
  ]);

  const summary = rowsFromResult<MeetingSummary>(summaryResult)[0] ?? {
    scheduled_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    attendance_count: 0,
  };
  const meetings = rowsFromResult<MeetingRow>(meetingResult);

  const messages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    created: { tone: "success", text: "Agenda rapat berhasil disimpan." },
    updated: { tone: "success", text: "Status rapat berhasil diperbarui." },
    invalid: { tone: "danger", text: "Isian agenda tidak valid. Periksa kembali formulir." },
    stale: { tone: "warning", text: "Agenda sudah berubah atau tidak ditemukan." },
    unavailable: { tone: "warning", text: "Organisasi tidak tersedia untuk menyimpan agenda." },
    error: { tone: "danger", text: "Agenda belum dapat disimpan. Periksa koneksi dan coba lagi." },
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Rapat & undangan"
        description="Jadwal rapat, undangan, dan kesiapan notulen. Setiap rapat memiliki referensi internal, notulen berversi, dan daftar hadir yang terhubung."
        actions={
          <Link href="/app/sekretariat/notulen" className="sb-btn sb-btn-outline">
            Notulen & putusan
          </Link>
        }
      />

      {result && messages[result] ? (
        <div className="mb-4">
          <Notice tone={messages[result].tone} title="Pembaruan agenda">
            {messages[result].text}
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rapat terjadwal" value={summary.scheduled_count} note="Agenda yang belum dilaksanakan" tone="info" />
        <StatCard label="Rapat terlaksana" value={summary.completed_count} note="Status sudah ditutup" tone="success" />
        <StatCard label="Dibatalkan" value={summary.cancelled_count} note="Tetap tersimpan dalam riwayat" tone="neutral" />
        <StatCard label="Kehadiran tercatat" value={summary.attendance_count} note="Jumlah catatan berstatus hadir" tone="accent" />
      </div>

      {canWrite ? (
        <Card className="mt-5">
          <CardHeader title="Buat agenda rapat" subtitle="Agenda baru otomatis mendapat referensi internal dan draf notulen." />
          <form action={createSecretariatMeeting} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-3">
              <label className="mb-1 block text-[11.5px] font-semibold text-ink2" htmlFor="meeting-title">Nama rapat</label>
              <input id="meeting-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder="Mis. Rapat Koordinasi Pengurus Bulanan" />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink2" htmlFor="meeting-date">Tanggal</label>
              <input id="meeting-date" name="meeting_date" type="date" required className="sb-input" />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink2" htmlFor="meeting-type">Jenis rapat</label>
              <select id="meeting-type" name="meeting_type" required defaultValue="pengurus" className="sb-input">
                <option value="pengurus">Rapat pengurus</option>
                <option value="bidang">Rapat bidang</option>
                <option value="anggota">Rapat anggota</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink2" htmlFor="meeting-unit">Lingkup / bidang</label>
              <select id="meeting-unit" name="unit_key" defaultValue="sekretariat" className="sb-input">
                <option value="">Lintas organisasi</option>
                <option value="pengurus-harian">Pengurus Harian</option>
                <option value="sekretariat">Sekretariat</option>
                <option value="keuangan">Keuangan & Akuntansi</option>
                <option value="organisasi">Organisasi & Keanggotaan</option>
                <option value="pertanian">Pertanian & Produksi</option>
                <option value="pelatihan">Pemberdayaan & Pelatihan</option>
                <option value="usaha">Usaha & Kemitraan</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink2" htmlFor="meeting-time">Waktu</label>
              <input id="meeting-time" name="time_label" maxLength={80} className="sb-input" placeholder="09.00–12.00 WIB" />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink2" htmlFor="meeting-location">Tempat</label>
              <input id="meeting-location" name="location" maxLength={300} className="sb-input" placeholder="Lokasi rapat" />
            </div>
            <div className="sm:col-span-2 xl:col-span-1">
              <label className="mb-1 block text-[11.5px] font-semibold text-ink2" htmlFor="meeting-description">Keterangan / agenda pokok</label>
              <input id="meeting-description" name="description" maxLength={4000} className="sb-input" placeholder="Pokok pembahasan (opsional)" />
            </div>
            <label className="flex min-h-10 items-center gap-2 text-[11.5px] text-ink2">
              <input type="checkbox" name="open_to_public" className="h-4 w-4 accent-[var(--sb-primary-700)]" />
              Kegiatan dapat dihadiri publik
            </label>
            <div className="flex items-center justify-end sm:col-span-2 xl:col-span-3">
              <button type="submit" className="sb-btn sb-btn-primary min-w-[180px]">
                Simpan agenda rapat
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mt-5">
        <Card>
          <CardHeader title="Daftar rapat" subtitle={`${meetings.length} catatan · maksimal 200 rapat terbaru`} />
          {meetings.length ? (
            <div className="divide-y divide-line">
              {meetings.map((meeting) => (
                <article key={meeting.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] text-muted2">{meeting.reference_no}</div>
                      <h2 className="mt-1 text-[13.5px] font-semibold text-ink">{meeting.title}</h2>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={11} />{dateLabel(meeting.meeting_date)}</span>
                        {meeting.time_label ? <span>{meeting.time_label}</span> : null}
                        {meeting.location ? <span className="inline-flex items-center gap-1.5"><MapPin size={11} />{meeting.location}</span> : null}
                      </div>
                    </div>
                    <Badge tone={meeting.status === "completed" ? "success" : meeting.status === "scheduled" ? "info" : "neutral"}>
                      {meetingStatusLabel[meeting.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px] text-muted2">
                    <Badge tone="neutral">{meetingTypeLabel[meeting.meeting_type]}</Badge>
                    {meeting.unit_name ? <Badge tone="neutral">{meeting.unit_name}</Badge> : null}
                    <span className="inline-flex items-center gap-1"><UsersRound size={11} />{meeting.attendance_count} hadir</span>
                    <span className="inline-flex items-center gap-1"><ClipboardList size={11} />Notulen {meeting.minutes_status === "final" ? "final" : meeting.minutes_status === "draft" ? "draf" : "belum dibuat"}</span>
                  </div>

                  {meeting.description ? <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{meeting.description}</p> : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <Link href={`/app/sekretariat/notulen?meeting_id=${meeting.id}`} className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">Notulen</Link>
                    <Link href={`/app/sekretariat/presensi?meeting_id=${meeting.id}`} className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">Daftar hadir</Link>
                    {canGenerateDocuments && (meeting.status !== "cancelled" || meeting.invitation_document_id) ? (
                      <Link href={"/app/sekretariat/template/TPL-UND?source_meeting_id=" + meeting.id} className="sb-btn sb-btn-soft !h-8 !px-3 text-[10.5px]">
                        {meeting.invitation_document_id ? "Buka undangan" : "Susun undangan"}
                      </Link>
                    ) : null}
                    {canWrite && meeting.status === "scheduled" ? (
                      <>
                        <form action={updateSecretariatMeetingStatus}>
                          <input type="hidden" name="id" value={meeting.id} />
                          <input type="hidden" name="next" value="completed" />
                          <button type="submit" className="sb-btn sb-btn-soft !h-8 !px-3 text-[10.5px]">Tandai terlaksana</button>
                        </form>
                        <form action={updateSecretariatMeetingStatus}>
                          <input type="hidden" name="id" value={meeting.id} />
                          <input type="hidden" name="next" value="cancelled" />
                          <button type="submit" className="sb-btn sb-btn-ghost !h-8 !px-3 text-[10.5px]">Batalkan</button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12">
              <EmptyState title="Belum ada agenda rapat" body="Buat agenda pertama. Tidak ada data rapat contoh yang dimasukkan ke database." />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
