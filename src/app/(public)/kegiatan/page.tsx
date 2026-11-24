import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge, Card, EmptyState, Notice } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { loadPublicData } from "@/lib/public-data";
import { PublicDataUnavailable } from "@/components/public-data-unavailable";
import { formatDateFull, relativeID } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Agenda Kegiatan",
  description: "Kegiatan Srikandi Buana yang secara eksplisit dibuka untuk publik.",
};

interface PublicActivity {
  id: string;
  reference_no: string;
  title: string;
  field_name: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  status: "scheduled" | "in_progress" | "completed";
}

function timeLabel(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  return [start, end].filter(Boolean).join("–");
}

export default async function KegiatanPage({
  searchParams,
}: {
  searchParams: Promise<{ bidang?: string }>;
}) {
  const { bidang } = await searchParams;
  const selectedField = ["organisasi", "pertanian", "pelatihan", "usaha"].includes(bidang ?? "")
    ? (bidang ?? "")
    : "";

  const loaded = await loadPublicData(
    "public-activities",
    async () => {
      const sql = getV9Sql();
      const [upcomingResult, pastResult] = await Promise.all([
        sql`
          SELECT
            activity.id::text AS id,
            activity.reference_no,
            activity.title,
            application.short_name AS field_name,
            activity.activity_date::text AS activity_date,
            to_char(activity.start_time, 'HH24:MI') AS start_time,
            to_char(activity.end_time, 'HH24:MI') AS end_time,
            activity.location,
            activity.description,
            activity.status
          FROM v9.field_activities AS activity
          INNER JOIN v9.organizations AS organization
            ON organization.id = activity.organization_id
          INNER JOIN v9.field_applications AS application
            ON application.organization_id = activity.organization_id
            AND application.field_key = activity.field_key
          WHERE organization.slug = 'srikandi-buana'
            AND organization.status = 'active'
            AND activity.open_to_public = true
            AND activity.status IN ('scheduled','in_progress')
            AND activity.activity_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
            AND (${selectedField} = '' OR activity.field_key = ${selectedField})
          ORDER BY activity.activity_date, activity.start_time NULLS FIRST
          LIMIT 100
        `,
        sql`
          SELECT
            activity.id::text AS id,
            activity.reference_no,
            activity.title,
            application.short_name AS field_name,
            activity.activity_date::text AS activity_date,
            to_char(activity.start_time, 'HH24:MI') AS start_time,
            to_char(activity.end_time, 'HH24:MI') AS end_time,
            activity.location,
            activity.description,
            activity.status
          FROM v9.field_activities AS activity
          INNER JOIN v9.organizations AS organization
            ON organization.id = activity.organization_id
          INNER JOIN v9.field_applications AS application
            ON application.organization_id = activity.organization_id
            AND application.field_key = activity.field_key
          WHERE organization.slug = 'srikandi-buana'
            AND organization.status = 'active'
            AND activity.open_to_public = true
            AND activity.status = 'completed'
            AND activity.activity_date <= (now() AT TIME ZONE 'Asia/Jakarta')::date
            AND (${selectedField} = '' OR activity.field_key = ${selectedField})
          ORDER BY activity.activity_date DESC
          LIMIT 50
        `,
      ]);
      return {
        upcoming: rowsFromResult<PublicActivity>(upcomingResult),
        past: rowsFromResult<PublicActivity>(pastResult),
      };
    },
    { upcoming: [] as PublicActivity[], past: [] as PublicActivity[] },
  );

  if (loaded.unavailable) {
    return (
      <div className="sb-shell py-12">
        <div className="sb-label mb-2">Agenda</div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Kegiatan yang dibuka untuk publik.</h1>
        <PublicDataUnavailable resource="Agenda publik" retryHref="/kegiatan" />
      </div>
    );
  }

  const filterOptions = [
    ["", "Semua bidang"],
    ["organisasi", "Organisasi"],
    ["pertanian", "Pertanian"],
    ["pelatihan", "Pelatihan"],
    ["usaha", "Usaha"],
  ] as const;

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Agenda publik</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Kegiatan yang dibuka untuk publik.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Hanya kegiatan yang ditandai terbuka untuk publik oleh pengelola bidang yang ditampilkan.
        Kegiatan internal dan catatan peserta tidak dipublikasikan.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {filterOptions.map(([key, label]) => (
          <Link
            key={key || "all"}
            href={key ? `/kegiatan?bidang=${key}` : "/kegiatan"}
            className={`sb-chip ${selectedField === key ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="mt-9">
        <h2 className="font-display text-[21px] font-semibold text-ink">Yang akan datang</h2>
        <div className="mt-3 space-y-3">
          {loaded.data.upcoming.map((activity) => (
            <Card key={activity.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="flex w-[92px] shrink-0 flex-col items-center rounded-sb-sm border border-line bg-paper px-2 py-2">
                <span className="font-display text-[22px] font-bold leading-none text-primary-800">{activity.activity_date.slice(8, 10)}</span>
                <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                  {new Date(activity.activity_date + "T00:00:00Z").toLocaleDateString("id-ID", { month: "short", year: "numeric", timeZone: "UTC" })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14.5px] font-semibold text-ink">{activity.title}</h3>
                  <Badge tone="info">Terbuka untuk umum</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={12} />
                    {formatDateFull(activity.activity_date)}
                    {timeLabel(activity.start_time, activity.end_time) ? " · " + timeLabel(activity.start_time, activity.end_time) + " WIB" : ""}
                  </span>
                  {activity.location ? <span className="flex items-center gap-1.5"><MapPin size={12} />{activity.location}</span> : null}
                  <span>{activity.field_name}</span>
                </div>
                {activity.description ? <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{activity.description}</p> : null}
              </div>
              <div className="shrink-0"><Badge tone="neutral">{relativeID(activity.activity_date)}</Badge></div>
            </Card>
          ))}
          {loaded.data.upcoming.length === 0 ? (
            <Card className="px-5 py-8">
              <EmptyState title="Belum ada agenda publik terjadwal" body="Kegiatan akan muncul setelah pengelola mencatatnya dan mengaktifkan opsi terbuka untuk publik." />
            </Card>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-[21px] font-semibold text-ink">Kegiatan yang telah berlangsung</h2>
        <div className="mt-3 space-y-2">
          {loaded.data.past.map((activity) => (
            <div key={activity.id} className="flex flex-wrap items-start justify-between gap-3 rounded-sb-sm border border-line bg-white px-4 py-3">
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-ink">{activity.title}</div>
                <div className="mt-1 text-[10.5px] text-muted">{formatDateFull(activity.activity_date)} · {activity.field_name}{activity.location ? " · " + activity.location : ""}</div>
              </div>
              <Badge tone="success">Selesai</Badge>
            </div>
          ))}
          {loaded.data.past.length === 0 ? <p className="py-3 text-[12px] text-muted">Belum ada catatan kegiatan publik yang selesai.</p> : null}
        </div>
      </section>

      <div className="mt-6">
        <Notice tone="info">Kegiatan internal, daftar peserta, penanggung jawab personal, dan catatan evaluasi tetap berada di aplikasi anggota dan bidang sesuai hak akses.</Notice>
      </div>
    </div>
  );
}
