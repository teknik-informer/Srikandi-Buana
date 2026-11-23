import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, Notice, Progress } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pelatihan",
  description: "Jadwal pelatihan dan kelas keterampilan yang secara resmi dibuka oleh KWT Srikandi Buana.",
};

interface PublicTrainingSession {
  id: string;
  reference_no: string;
  title: string;
  topic: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  trainer_label: string | null;
  max_participants: number | null;
  registered_count: number;
  present_count: number;
  description: string | null;
}

function timeLabel(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  return [start, end].filter(Boolean).join("–");
}

export default async function PelatihanPage() {
  const sql = getV9Sql();
  const [openResult, completedResult] = await Promise.all([
    sql`
      SELECT
        session.id::text AS id,
        session.reference_no,
        session.title,
        session.topic,
        session.session_date::text AS session_date,
        to_char(session.start_time, 'HH24:MI') AS start_time,
        to_char(session.end_time, 'HH24:MI') AS end_time,
        session.location,
        session.trainer_label,
        session.max_participants,
        (
          SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.organization_id = session.organization_id
            AND enrollment.registration_status IN ('registered','confirmed')
        ) AS registered_count,
        (
          SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.organization_id = session.organization_id
            AND enrollment.attendance_status = 'hadir'
        ) AS present_count,
        session.description
      FROM v9.training_sessions AS session
      INNER JOIN v9.organizations AS organization
        ON organization.id = session.organization_id
      WHERE organization.slug = 'srikandi-buana'
        AND organization.status = 'active'
        AND session.field_key = 'pelatihan'
        AND session.status = 'registration_open'
        AND session.session_date >= current_date
      ORDER BY session.session_date, session.start_time NULLS FIRST
      LIMIT 50
    `,
    sql`
      SELECT
        session.id::text AS id,
        session.reference_no,
        session.title,
        session.topic,
        session.session_date::text AS session_date,
        to_char(session.start_time, 'HH24:MI') AS start_time,
        to_char(session.end_time, 'HH24:MI') AS end_time,
        session.location,
        session.trainer_label,
        session.max_participants,
        (
          SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.organization_id = session.organization_id
            AND enrollment.registration_status IN ('registered','confirmed')
        ) AS registered_count,
        (
          SELECT count(*)::int
          FROM v9.training_enrollments AS enrollment
          WHERE enrollment.session_id = session.id
            AND enrollment.organization_id = session.organization_id
            AND enrollment.attendance_status = 'hadir'
        ) AS present_count,
        session.description
      FROM v9.training_sessions AS session
      INNER JOIN v9.organizations AS organization
        ON organization.id = session.organization_id
      WHERE organization.slug = 'srikandi-buana'
        AND organization.status = 'active'
        AND session.field_key = 'pelatihan'
        AND session.status = 'completed'
      ORDER BY session.session_date DESC
      LIMIT 20
    `,
  ]);

  const openSessions = rowsFromResult<PublicTrainingSession>(openResult);
  const completedSessions = rowsFromResult<PublicTrainingSession>(completedResult);

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Pemberdayaan &amp; Pelatihan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">
        Kelas yang dibuka untuk anggota.
      </h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Jadwal yang tercantum di halaman ini berasal dari sesi Pelatihan yang resmi dibuka oleh
        pengelola bidang. Informasi peserta dan jadwal diperbarui dari register operasional.
      </p>

      <div className="mt-8">
        <Card>
          <CardHeader
            title="Pendaftaran dibuka"
            subtitle={`${openSessions.length} sesi menerima pendaftaran`}
            action={<Badge tone="success">Terbuka</Badge>}
          />
          {openSessions.length ? (
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {openSessions.map((session) => {
                const percent = session.max_participants
                  ? Math.min(100, Math.round((session.registered_count / session.max_participants) * 100))
                  : null;
                const remaining = session.max_participants === null
                  ? null
                  : Math.max(0, session.max_participants - session.registered_count);
                return (
                  <article key={session.id} className="flex flex-col rounded-[12px] border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="success">Pendaftaran dibuka</Badge>
                      <span className="font-mono text-[9.5px] text-muted2">{session.reference_no}</span>
                    </div>
                    <h2 className="mt-3 font-display text-[19px] font-semibold leading-snug text-ink">
                      {session.title}
                    </h2>
                    {session.topic ? <p className="mt-1 text-[11.5px] text-muted">{session.topic}</p> : null}
                    <div className="mt-3 space-y-1.5 text-[11px] text-muted">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={13} />
                        {formatDateID(session.session_date)}
                        {timeLabel(session.start_time, session.end_time) ? <span>· {timeLabel(session.start_time, session.end_time)} WIB</span> : null}
                      </div>
                      {session.location ? <div className="flex items-center gap-2"><MapPin size={13} />{session.location}</div> : null}
                      {session.trainer_label ? <div className="flex items-center gap-2"><UsersRound size={13} />Narasumber: {session.trainer_label}</div> : null}
                    </div>
                    {session.description ? <p className="mt-3 text-[11.5px] leading-relaxed text-ink2">{session.description}</p> : null}
                    <div className="mt-auto pt-4">
                      <div className="mb-1 flex justify-between text-[10.5px] text-muted">
                        <span>Peserta terdaftar</span>
                        <span className="font-semibold text-ink2">
                          {session.registered_count}{session.max_participants ? ` / ${session.max_participants}` : ""}
                        </span>
                      </div>
                      {percent !== null ? <Progress value={percent} /> : null}
                      <div className="mt-1 text-[10px] text-muted2">
                        {remaining === null ? "Kapasitas belum dibatasi" : remaining > 0 ? `Sisa kapasitas ${remaining} peserta` : "Kapasitas terpenuhi · pendaftaran dapat masuk daftar tunggu"}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-line pt-3">
                      <Link href="/kontak?tujuan=pelatihan" className="text-[11.5px] font-semibold text-primary-700 hover:underline">
                        Hubungi Sekretariat untuk pendaftaran
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10">
              <EmptyState
                title="Belum ada pendaftaran yang dibuka"
                body="Sesi akan muncul di sini setelah pengelola bidang membuka pendaftaran melalui aplikasi."
              />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader
            title="Pelatihan yang telah terlaksana"
            subtitle={`${completedSessions.length} sesi selesai · data kehadiran tercatat`}
            action={<Badge tone="neutral">Riwayat</Badge>}
          />
          {completedSessions.length ? (
            <div className="divide-y divide-line">
              {completedSessions.map((session) => (
                <article key={session.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[9px] text-muted2">{session.reference_no}</div>
                    <h2 className="mt-1 text-[12.5px] font-semibold text-ink">{session.title}</h2>
                    <div className="mt-1 text-[10.5px] text-muted">
                      {formatDateID(session.session_date)}
                      {session.location ? ` · ${session.location}` : ""}
                      {session.trainer_label ? ` · ${session.trainer_label}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10.5px] text-muted">
                    <UsersRound size={12} />
                    {session.present_count} hadir
                  </div>
                  <Badge tone="success">Selesai</Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-9">
              <EmptyState title="Belum ada riwayat pelatihan" body="Sesi yang sudah ditandai selesai akan tercantum di sini." />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Informasi pendaftaran">
          Pendaftaran pada halaman publik saat ini dilayani melalui Sekretariat. Petugas akan
          mencatat peserta ke register setelah memeriksa kapasitas dan kelengkapan data. Angka
          peserta yang ditampilkan bersumber dari daftar pendaftaran, bukan estimasi.
        </Notice>
      </div>
    </div>
  );
}
