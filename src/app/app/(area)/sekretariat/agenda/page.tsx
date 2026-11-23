import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatDateFull, relativeID } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda Organisasi" };

interface AgendaRow {
  id: string;
  reference_no: string;
  title: string;
  meeting_type: "pengurus" | "bidang" | "anggota";
  meeting_date: string;
  time_label: string | null;
  location: string | null;
  unit_name: string | null;
  attendance_count: number;
  open_to_public: boolean;
}

const meetingTypeLabel: Record<AgendaRow["meeting_type"], string> = {
  pengurus: "Rapat pengurus",
  bidang: "Rapat bidang",
  anggota: "Rapat anggota",
};

export default async function AgendaPage() {
  const identity = await requireIdentity("secretariat:read");
  const sql = getV9Sql();
  const result = await sql`
    SELECT
      meeting.id::text AS id,
      meeting.reference_no,
      meeting.title,
      meeting.meeting_type,
      meeting.meeting_date::text AS meeting_date,
      meeting.time_label,
      meeting.location,
      unit.name AS unit_name,
      meeting.open_to_public,
      COALESCE(attendance.count, 0)::int AS attendance_count
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
    WHERE meeting.organization_id = ${identity.organizationId}
      AND meeting.status = 'scheduled'
      AND meeting.meeting_date >= current_date
    ORDER BY meeting.meeting_date, meeting.created_at
    LIMIT 200
  `;
  const meetings = rowsFromResult<AgendaRow>(result);
  const totalPublic = meetings.filter((meeting) => meeting.open_to_public).length;
  const nextDate = meetings[0]?.meeting_date;

  const byDate = new Map<string, AgendaRow[]>();
  for (const meeting of meetings) {
    byDate.set(meeting.meeting_date, [...(byDate.get(meeting.meeting_date) ?? []), meeting]);
  }
  const dates = [...byDate.keys()];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Agenda organisasi"
        description="Kalender kegiatan dan rapat yang telah dijadwalkan. Agenda bersumber dari catatan operasional organisasi, bukan data contoh."
        actions={<Link href="/app/sekretariat/rapat" className="sb-btn sb-btn-outline">Kelola rapat</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Agenda mendatang" value={meetings.length} note="Rapat terjadwal" tone="info" />
        <StatCard label="Agenda publik" value={totalPublic} note="Diizinkan untuk umum" tone="accent" />
        <StatCard label="Kehadiran tercatat" value={meetings.reduce((total, meeting) => total + meeting.attendance_count, 0)} note="Jumlah hadir pada agenda" tone="success" />
      </div>

      {nextDate ? (
        <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-line bg-paper px-4 py-3 text-[11.5px] text-muted">
          <CalendarDays size={14} />
          Agenda berikutnya: <strong className="font-semibold text-ink">{formatDateFull(nextDate)}</strong>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {dates.length ? dates.map((date) => {
          const dailyMeetings = byDate.get(date) ?? [];
          return (
            <Card key={date}>
              <CardHeader
                title={formatDateFull(date)}
                subtitle={`${dailyMeetings.length} agenda · ${relativeID(date)}`}
              />
              <div className="divide-y divide-line">
                {dailyMeetings.map((meeting) => (
                  <article key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9.5px] text-muted2">{meeting.reference_no}</div>
                      <h2 className="mt-1 text-[12.5px] font-semibold text-ink">{meeting.title}</h2>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                        {meeting.time_label ? <span>{meeting.time_label}</span> : null}
                        {meeting.location ? <span className="inline-flex items-center gap-1"><MapPin size={10} />{meeting.location}</span> : null}
                        <span className="inline-flex items-center gap-1"><UsersRound size={10} />{meeting.attendance_count} hadir tercatat</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{meetingTypeLabel[meeting.meeting_type]}</Badge>
                      {meeting.unit_name ? <Badge tone="neutral">{meeting.unit_name}</Badge> : null}
                      {meeting.open_to_public ? <Badge tone="info">Publik</Badge> : null}
                      <Link href={`/app/sekretariat/rapat`} className="ml-1 text-[10.5px] font-semibold text-primary-700">Detail</Link>
                    </div>
                  </article>
                ))}
              </div>
            </Card>
          );
        }) : (
          <Card>
            <div className="px-5 py-12">
              <EmptyState
                title="Belum ada agenda mendatang"
                body="Agenda yang dibuat Sekretariat akan tampil di sini setelah tersimpan."
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
