import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, CheckCircle2, Circle, ExternalLink, MapPin } from "lucide-react";
import { FIELDS_BY_SLUG } from "@/config/fields";
import { APPS, type AppKey } from "@/config/apps";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { getIdentity, can } from "@/lib/session";
import { canAccessApp } from "@/lib/app-access";
import { Badge, Card, Notice } from "@/components/ui";
import { AppIcon } from "@/components/brand";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";

export const metadata: Metadata = { title: "Peta Bidang" };

const HERO: Record<string, { img: string; alt: string }> = {
  organisasi: {
    img: "/images/komunitas.jpg",
    alt: "Anggota Srikandi Buana duduk bersama membahas catatan organisasi",
  },
  pertanian: {
    img: "/images/hero-kebun.jpg",
    alt: "Kegiatan pertanian anggota Srikandi Buana",
  },
  pelatihan: {
    img: "/images/galeri-pelatihan.jpg",
    alt: "Sesi pelatihan anggota Srikandi Buana",
  },
  usaha: {
    img: "/images/galeri-bazar.jpg",
    alt: "Produk anggota Srikandi Buana ditata pada bazar usaha",
  },
};

interface FieldRegistryRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  mandate: string | null;
  is_enabled: boolean;
  unit_name: string | null;
  total_programs: number;
  active_programs: number;
  current_team_count: number;
}

function validFieldRoute(route: string | null, fieldKey: string): string {
  return route?.startsWith("/app/bidang/") ? route : "/app/bidang/" + fieldKey;
}

export default async function BidangIndex() {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const organizationWide = can(identity, "organization:read");
  const fieldScope = identity.field && can(identity, "field:" + identity.field + ":read")
    ? identity.field
    : null;
  const canReadRegistry = organizationWide || Boolean(fieldScope);

  let fields: FieldRegistryRow[] = [];
  let registryUnavailable = false;

  if (canReadRegistry) {
    try {
      const sql = getV9Sql();
      fields = rowsFromResult<FieldRegistryRow>(await sql`
        SELECT
          application.field_key,
          application.name,
          application.short_name,
          application.route,
          application.mandate,
          application.is_enabled,
          unit.name AS unit_name,
          COALESCE(program_summary.total_programs, 0)::int AS total_programs,
          COALESCE(program_summary.active_programs, 0)::int AS active_programs,
          COALESCE(team_summary.current_team_count, 0)::int AS current_team_count
        FROM v9.field_applications AS application
        LEFT JOIN v9.organization_units AS unit
          ON unit.id = application.unit_id
          AND unit.organization_id = application.organization_id
        LEFT JOIN LATERAL (
          SELECT
            count(*)::int AS total_programs,
            count(*) FILTER (WHERE program.status = 'active')::int AS active_programs
          FROM v9.field_programs AS program
          WHERE program.organization_id = application.organization_id
            AND program.field_key = application.field_key
        ) AS program_summary ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS current_team_count
          FROM v9.field_team_assignments AS assignment
          INNER JOIN v9.memberships AS membership
            ON membership.id = assignment.membership_id
            AND membership.organization_id = assignment.organization_id
            AND membership.status = 'active'
            AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
            AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
          INNER JOIN v9.people AS person
            ON person.id = membership.person_id
            AND person.status = 'active'
          WHERE assignment.organization_id = application.organization_id
            AND assignment.field_key = application.field_key
            AND assignment.status = 'active'
            AND assignment.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date
            AND (assignment.valid_until IS NULL OR assignment.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
        ) AS team_summary ON true
        WHERE application.organization_id = ${identity.organizationId}
          AND (${organizationWide} = true OR application.field_key = ${fieldScope})
        ORDER BY application.display_order, application.name
      `);
    } catch (reason) {
      registryUnavailable = true;
      console.warn("[field-map] Registry unavailable", reason instanceof Error ? reason.name : "UnknownError");
    }
  }

  const accessibleFields = fields.filter((field) =>
    canAccessApp(identity, field.field_key as AppKey),
  );
  const enabledFields = accessibleFields.filter((field) => field.is_enabled);
  const configuredModuleCount = enabledFields.reduce(
    (total, field) => total + (FIELDS_BY_SLUG[field.field_key]?.modules.length ?? 0),
    0,
  );
  const runningProgramCount = enabledFields.reduce(
    (total, field) => total + Number(field.active_programs),
    0,
  );
  const activeApps = APPS.filter(
    (app) =>
      app.group !== "bidang" &&
      app.key !== "studio" &&
      app.key !== "launcher" &&
      canAccessApp(identity, app.key),
  );

  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.bidang}
        badge={
          <span className="rounded-full bg-[#e6c56a]/18 px-2.5 py-1 text-[10px] font-bold text-[#f2dda2] ring-1 ring-inset ring-[#e6c56a]/30">
            {registryUnavailable ? "Status registry tidak tersedia" : enabledFields.length + " aplikasi bidang aktif dalam lingkup akun"}
          </span>
        }
        lead="Identitas, mandat, dan status aplikasi diambil dari registry organisasi. Angka program dan tim dihitung dari catatan operasional yang tersimpan."
        facts={[
          (registryUnavailable ? "—" : String(enabledFields.length)) + " aplikasi bidang aktif",
          (registryUnavailable ? "—" : String(configuredModuleCount)) + " modul terkonfigurasi",
          (registryUnavailable ? "—" : String(runningProgramCount)) + " program aktif",
          String(activeApps.length) + " aplikasi lintas bidang",
        ]}
      />

      {registryUnavailable ? (
        <div className="mt-4">
          <Notice tone="danger" title="Registry bidang belum dapat dimuat">
            Status aplikasi, jumlah program, dan penugasan tim tidak ditampilkan sebagai angka nol. Periksa layanan data lalu muat ulang halaman.
          </Notice>
        </div>
      ) : !canReadRegistry ? (
        <div className="mt-4">
          <Notice tone="info" title="Akses registry terbatas">
            Akun ini belum memiliki lingkup baca organisasi atau bidang yang diperlukan untuk melihat peta bidang.
          </Notice>
        </div>
      ) : accessibleFields.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {accessibleFields.map((field) => {
            const visual = FIELDS_BY_SLUG[field.field_key];
            const hero = HERO[field.field_key] ?? HERO.organisasi;
            const isEnabled = field.is_enabled;
            return (
              <article
                key={field.field_key}
                className="group relative isolate flex flex-col overflow-hidden rounded-[18px] bg-[#0f2c19] shadow-[0_1px_2px_rgba(15,26,43,0.06)] ring-1 ring-black/5"
              >
                <img
                  src={hero.img}
                  alt={hero.alt}
                  className="absolute inset-0 h-full w-full object-cover object-[62%_40%]"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0 bg-[linear-gradient(160deg,rgba(8,35,20,0.95)_0%,rgba(10,40,23,0.86)_46%,rgba(12,46,26,0.52)_100%)]"
                  aria-hidden
                />
                <div className="relative flex flex-1 flex-col p-5" data-contrast-bg="#0b2b18">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-white shadow-sm"
                        style={{ backgroundColor: visual?.accent ?? "#5d8432" }}
                      >
                        <AppIcon name={visual?.icon ?? "users"} size={19} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-display text-[17px] font-bold leading-tight text-white">
                          {field.name}
                        </h2>
                        <p className="mt-0.5 text-[10.5px] text-[#a6dab2]">
                          {field.unit_name ?? visual?.code ?? field.field_key}
                        </p>
                      </div>
                    </div>
                    <span className={"inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset " + (
                      isEnabled
                        ? "bg-[#7ddc93]/18 text-[#c9f3d3] ring-[#7ddc93]/30"
                        : "bg-[#e6c56a]/18 text-[#f2dda2] ring-[#e6c56a]/30"
                    )}>
                      {isEnabled ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                      {isEnabled ? "Aktif" : "Tidak aktif"}
                    </span>
                  </div>

                  <p className="mt-3 min-h-[54px] max-w-[46ch] overflow-hidden text-[12.5px] leading-relaxed text-[#d5e8d9] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                    {field.mandate ?? "Mandat belum dicatat pada registry organisasi."}
                  </p>

                  <dl className="mt-3.5 grid grid-cols-3 gap-1.5">
                    {[
                      [String(visual?.modules.length ?? 0), "modul terkonfigurasi"],
                      [String(field.total_programs), field.active_programs ? field.active_programs + " aktif" : "program tercatat"],
                      [String(field.current_team_count), "penugasan aktif"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-[9px] bg-[#08220f]/55 px-2.5 py-1.5 ring-1 ring-inset ring-white/10">
                        <dt className="font-display text-[16px] font-extrabold leading-none text-white">{value}</dt>
                        <dd className="mt-0.5 truncate text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#a9c9b1]">{label}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-[#c9dccd]">
                      <MapPin size={11} />
                      {field.unit_name ?? "Unit belum tercatat"}
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                      {isEnabled ? (
                        <>
                          <Link
                            href={validFieldRoute(field.route, field.field_key)}
                            className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-white/25 px-3 text-[11.5px] font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
                          >
                            Ringkasan
                          </Link>
                          <Link
                            href={validFieldRoute(field.route, field.field_key)}
                            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-[#f2dda2] px-3.5 text-[11.5px] font-bold text-[#2a1f00] shadow-sm transition hover:bg-[#f7e8bb]"
                          >
                            Buka aplikasi <ArrowRight size={13} />
                          </Link>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#f2dda2]">Aplikasi dinonaktifkan</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-[14px] border border-line bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold text-ink">Belum ada aplikasi bidang pada lingkup akun ini.</p>
        </div>
      )}

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Aplikasi lintas bidang</h2>
            <p className="text-[11.5px] text-muted">Hanya tujuan yang diberikan kepada akun ini.</p>
          </div>
          <Link href="/app" className="text-[11.5px] font-semibold text-primary-700 hover:underline">Semua aplikasi →</Link>
        </div>
        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {activeApps.map((app) => (
            <li key={app.key} className="bg-white">
              <Link href={app.href} className="flex min-h-[62px] items-center gap-3 px-4 py-3 transition hover:bg-[#f7fbf7]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#eaf6ec] text-[#127e2f] ring-1 ring-inset ring-[#d5e9d8]">
                  <AppIcon name={app.icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-semibold text-ink">{app.short}</span>
                    {app.badge ? <Badge tone="accent">{app.badge}</Badge> : null}
                  </span>
                  <span className="block truncate text-[10.5px] text-muted">{app.audience}</span>
                </span>
                <ArrowUpRight size={14} className="shrink-0 text-muted2" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-[14px] border border-[#f0dcae] bg-[#fffaf0] px-4 py-3">
        <Badge tone="warning">Catatan tata kelola</Badge>
        <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[#6b5320]">
          Halaman ini menampilkan konfigurasi aplikasi bidang, catatan program, dan penugasan tim yang tersimpan. Mandat atau status kelembagaan tetap mengikuti dokumen dan keputusan organisasi yang sah.
        </p>
        <Link href="/dokumen" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#6b5320] underline-offset-2 hover:underline">
          Dasar keputusan <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}
