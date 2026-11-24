import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, ClipboardList, MapPin, Users } from "lucide-react";
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
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Rapat Pengurus" };

interface MeetingRow {
  id: string;
  reference_no: string;
  title: string;
  meeting_type: "pengurus" | "bidang" | "anggota";
  meeting_date: string;
  time_label: string | null;
  location: string | null;
  meeting_status: "scheduled" | "completed" | "cancelled";
  minutes_status: "draft" | "final" | null;
  minutes_revision: number | null;
  attendance_count: number;
  attendance_total: number;
}

interface SummaryRow {
  total_count: number;
  scheduled_count: number;
  completed_count: number;
  final_minutes_count: number;
  attendance_count: number;
}

const meetingLabels: Record<MeetingRow["meeting_type"], string> = {
  pengurus: "Rapat pengurus",
  bidang: "Rapat bidang",
  anggota: "Rapat anggota",
};

const statusLabels: Record<MeetingRow["meeting_status"], string> = {
  scheduled: "Terjadwal",
  completed: "Terlaksana",
  cancelled: "Dibatalkan",
};

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function RapatPengurusPage() {
  const identity = await requireIdentity("secretariat:read");
  let summary: SummaryRow | null = null;
  let meetings: MeetingRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [summaryResult, meetingsResult] = await Promise.all([
      sql`
        SELECT
          count(*)::int AS total_count,
          count(*) FILTER (WHERE meeting.status = 'scheduled')::int AS scheduled_count,
          count(*) FILTER (WHERE meeting.status = 'completed')::int AS completed_count,
          count(*) FILTER (WHERE latest_minutes.status = 'final')::int AS final_minutes_count,
          COALESCE(sum(attendance.hadir_count), 0)::int AS attendance_count
        FROM v9.secretariat_meetings AS meeting
        LEFT JOIN LATERAL (
          SELECT minutes.status
          FROM v9.secretariat_minutes AS minutes
          WHERE minutes.meeting_id = meeting.id
          ORDER BY minutes.revision_no DESC
          LIMIT 1
        ) AS latest_minutes ON true
        LEFT JOIN LATERAL (
          SELECT count(*) FILTER (WHERE attendee.attendance_status = 'hadir')::int AS hadir_count
          FROM v9.secretariat_meeting_attendance AS attendee
          WHERE attendee.meeting_id = meeting.id
        ) AS attendance ON true
        WHERE meeting.organization_id = ${identity.organizationId}
          AND meeting.status <> 'cancelled'
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
          meeting.status AS meeting_status,
          latest_minutes.status AS minutes_status,
          latest_minutes.revision_no AS minutes_revision,
          COALESCE(attendance.hadir_count, 0)::int AS attendance_count,
          COALESCE(attendance.total_count, 0)::int AS attendance_total
        FROM v9.secretariat_meetings AS meeting
        LEFT JOIN LATERAL (
          SELECT minutes.status, minutes.revision_no
          FROM v9.secretariat_minutes AS minutes
          WHERE minutes.meeting_id = meeting.id
          ORDER BY minutes.revision_no DESC
          LIMIT 1
        ) AS latest_minutes ON true
        LEFT JOIN LATERAL (
          SELECT
            count(*) FILTER (WHERE attendee.attendance_status = 'hadir')::int AS hadir_count,
            count(*)::int AS total_count
          FROM v9.secretariat_meeting_attendance AS attendee
          WHERE attendee.meeting_id = meeting.id
        ) AS attendance ON true
        WHERE meeting.organization_id = ${identity.organizationId}
          AND meeting.status <> 'cancelled'
        ORDER BY
          CASE WHEN meeting.status = 'scheduled' THEN 0 ELSE 1 END,
          meeting.meeting_date DESC,
          meeting.created_at DESC
        LIMIT 200
      `,
    ]);
    summary = rowsFromResult<SummaryRow>(summaryResult)[0] ?? null;
    meetings = rowsFromResult<MeetingRow>(meetingsResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-meetings] Source unavailable", safeErrorType(reason));
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Rapat & musyawarah"
        description="Jadwal rapat, dokumentasi notulen, dan presensi yang tersimpan pada register Sekretariat."
        actions={<Link href="/app/sekretariat/rapat" className="sb-btn sb-btn-outline">Kelola rapat <ArrowRight size={13} /></Link>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Register rapat belum dapat dimuat">
            Koneksi ke agenda dan dokumentasi Sekretariat sedang tidak tersedia. Rapat contoh tidak ditampilkan.
          </Notice>
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Rapat tercatat" value={summary.total_count} note="Tidak termasuk rapat batal" tone="info" icon={<CalendarDays size={17} />} />
            <StatCard label="Terjadwal" value={summary.scheduled_count} note="Menunggu pelaksanaan" tone="warning" />
            <StatCard label="Terlaksana" value={summary.completed_count} note={summary.final_minutes_count + " notulen final"} tone="success" icon={<ClipboardList size={17} />} />
            <StatCard label="Kehadiran tercatat" value={summary.attendance_count} note="Jumlah status hadir pada daftar presensi" tone="neutral" icon={<Users size={17} />} />
          </div>

          <div className="mt-4">
            <Notice tone="info" title="Notulen dan keputusan">
              Halaman ini menampilkan status revisi notulen terakhir serta daftar presensi. Rincian keputusan,
              tindak lanjut, dan pengesahan hanya dapat dianggap resmi setelah dicatat dan difinalkan pada modul
              Notulen & Putusan.
            </Notice>
          </div>

          <Card className="mt-5">
            <CardHeader
              title="Register rapat"
              subtitle={meetings.length + " rapat terbaru yang tersimpan"}
              action={<Badge tone="neutral">Sumber Sekretariat</Badge>}
            />
            {meetings.length ? (
              <div className="divide-y divide-line">
                {meetings.map((meeting) => (
                  <article key={meeting.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted2">{meeting.reference_no}</span>
                        <Badge tone={meeting.meeting_status === "completed" ? "success" : "info"}>
                          {statusLabels[meeting.meeting_status]}
                        </Badge>
                        <Badge tone="neutral">{meetingLabels[meeting.meeting_type]}</Badge>
                      </div>
                      <h2 className="mt-1.5 text-[13px] font-semibold text-ink">{meeting.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted2">
                        <span><CalendarDays size={11} className="mr-1 inline" />{formatDateID(meeting.meeting_date, "short")}</span>
                        {meeting.time_label ? <span>{meeting.time_label}</span> : null}
                        {meeting.location ? <span><MapPin size={11} className="mr-1 inline" />{meeting.location}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={meeting.minutes_status === "final" ? "success" : meeting.minutes_status === "draft" ? "warning" : "neutral"}>
                        {meeting.minutes_status === "final"
                          ? "Notulen final · v" + meeting.minutes_revision
                          : meeting.minutes_status === "draft"
                            ? "Notulen draf"
                            : "Belum ada notulen"}
                      </Badge>
                      <span className="text-[10px] text-muted2">
                        {meeting.attendance_count}/{meeting.attendance_total} hadir
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  title="Belum ada rapat tercatat"
                  body="Jadwal dan hasil rapat akan tampil setelah disimpan pada register Sekretariat."
                />
              </div>
            )}
          </Card>

          <div className="mt-4">
            <Link href="/app/sekretariat/notulen" className="sb-btn sb-btn-outline !h-9">
              Buka Notulen & Putusan <ArrowRight size={13} />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
