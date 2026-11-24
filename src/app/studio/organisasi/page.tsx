import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Network, ShieldCheck, Users } from "lucide-react";
import {
  Avatar, Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Organization Studio" };

interface OrganizationRow {
  legal_name: string;
  short_name: string;
  status: string;
  legal_status: string;
  address: string | null;
}
interface UnitRow {
  id: string;
  unit_key: string;
  name: string;
  unit_type: "executive" | "secretariat" | "finance" | "field" | "support";
  mandate: string | null;
  is_active: boolean;
  is_enabled: boolean | null;
  route: string | null;
  sort_order: number;
}
interface MemberRow {
  membership_id: string;
  full_name: string;
  preferred_name: string | null;
  member_number: string | null;
  position_title: string | null;
  valid_from: string | null;
  valid_until: string | null;
  unit_name: string | null;
  unit_type: string | null;
}
interface AssignmentRow {
  id: string;
  field_key: string;
  field_name: string;
  person_name: string;
  member_number: string | null;
  role_label: string;
  scope_label: string | null;
  appointment_reference: string | null;
  appointed_on: string | null;
  valid_from: string;
  valid_until: string | null;
  status: "proposed" | "active";
  approved_at: string | null;
}

const UNIT_LABEL: Record<UnitRow["unit_type"], string> = {
  executive: "Pengurus harian",
  secretariat: "Sekretariat",
  finance: "Keuangan",
  field: "Bidang",
  support: "Pendukung",
};

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function jakartaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function appointmentStatus(item: AssignmentRow, today: string): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  if (item.status === "proposed") return { label: "Usulan menunggu pengesahan", tone: "warning" };
  if (item.valid_from > today) return { label: "Belum berlaku", tone: "neutral" };
  if (item.valid_until && item.valid_until < today) return { label: "Masa tugas berakhir", tone: "neutral" };
  return { label: "Disahkan · berlaku", tone: "success" };
}

export default async function OrganisasiStudio() {
  const identity = await requireIdentity("organization:read");
  let organization: OrganizationRow | null = null;
  let units: UnitRow[] = [];
  let members: MemberRow[] = [];
  let assignments: AssignmentRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [organizationResult, unitResult, memberResult, assignmentResult] = await Promise.all([
      sql`
        SELECT legal_name, short_name, status, legal_status, address
        FROM v9.organizations
        WHERE id = ${identity.organizationId}
        LIMIT 1
      `,
      sql`
        SELECT
          unit.id::text AS id,
          unit.unit_key,
          unit.name,
          unit.unit_type,
          COALESCE(application.mandate, unit.mandate) AS mandate,
          unit.is_active,
          application.is_enabled,
          application.route,
          unit.sort_order
        FROM v9.organization_units AS unit
        LEFT JOIN v9.field_applications AS application
          ON application.unit_id = unit.id
          AND application.organization_id = unit.organization_id
        WHERE unit.organization_id = ${identity.organizationId}
        ORDER BY unit.sort_order, unit.name
        LIMIT 100
      `,
      sql`
        SELECT
          membership.id::text AS membership_id,
          person.full_name,
          person.preferred_name,
          membership.member_number,
          membership.position_title,
          membership.valid_from::text AS valid_from,
          membership.valid_until::text AS valid_until,
          unit.name AS unit_name,
          unit.unit_type
        FROM v9.memberships AS membership
        INNER JOIN v9.people AS person
          ON person.id = membership.person_id
          AND person.status = 'active'
        LEFT JOIN v9.organization_units AS unit
          ON unit.id = membership.unit_id
          AND unit.organization_id = membership.organization_id
        WHERE membership.organization_id = ${identity.organizationId}
          AND membership.status = 'active'
          AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
          AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
        ORDER BY
          CASE WHEN membership.position_title IS NULL THEN 1 ELSE 0 END,
          membership.position_title,
          person.full_name
        LIMIT 500
      `,
      sql`
        SELECT
          assignment.id::text AS id,
          assignment.field_key,
          application.short_name AS field_name,
          person.full_name AS person_name,
          membership.member_number,
          assignment.role_label,
          assignment.scope_label,
          assignment.appointment_reference,
          assignment.appointed_on::text AS appointed_on,
          assignment.valid_from::text AS valid_from,
          assignment.valid_until::text AS valid_until,
          assignment.status,
          assignment.approved_at::text AS approved_at
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
        INNER JOIN v9.field_applications AS application
          ON application.organization_id = assignment.organization_id
          AND application.field_key = assignment.field_key
        WHERE assignment.organization_id = ${identity.organizationId}
          AND assignment.status IN ('proposed','active')
        ORDER BY
          CASE assignment.status WHEN 'active' THEN 1 ELSE 2 END,
          assignment.field_key,
          assignment.valid_from DESC,
          person.full_name
        LIMIT 500
      `,
    ]);

    organization = rowsFromResult<OrganizationRow>(organizationResult)[0] ?? null;
    units = rowsFromResult<UnitRow>(unitResult);
    members = rowsFromResult<MemberRow>(memberResult);
    assignments = rowsFromResult<AssignmentRow>(assignmentResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[organization-studio] Registry unavailable", safeErrorType(reason));
  }

  const activeUnits = units.filter((unit) => unit.is_active);
  const fieldUnits = units.filter((unit) => unit.unit_type === "field");
  const enabledFieldApps = fieldUnits.filter((unit) => unit.is_enabled === true);
  const today = jakartaToday();
  const activeAppointments = assignments.filter((item) =>
    item.status === "active" &&
    item.valid_from <= today &&
    (!item.valid_until || item.valid_until >= today)
  );
  const proposedAppointments = assignments.filter((item) => item.status === "proposed");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Organization Studio"
        title="Registry unit & struktur organisasi"
        description="Sumber data organisasi, unit resmi, keanggotaan aktif, dan penugasan bidang yang telah dicatat. Halaman ini bersifat baca-saja; keputusan pengangkatan tetap mengikuti dokumen organisasi."
        actions={<Badge tone="neutral">Registry live</Badge>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="danger" title="Registry organisasi belum dapat dimuat">
            Unit, anggota, dan penugasan disembunyikan sampai database pulih. Susunan contoh tidak digunakan sebagai pengganti.
          </Notice>
        </div>
      ) : null}

      {!unavailable && !organization ? (
        <div className="mb-4">
          <Notice tone="warning" title="Organisasi belum ditemukan">
            Akun ini tidak memiliki organisasi aktif pada registry.
          </Notice>
        </div>
      ) : null}

      {organization ? (
        <>
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Organisasi terhubung</div>
                <h2 className="mt-1 text-[15px] font-semibold text-ink">{organization.legal_name}</h2>
                <p className="mt-1 text-[11px] text-muted">{organization.address ?? "Alamat belum tercatat"}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={organization.status === "active" ? "success" : "warning"}>{organization.status}</Badge>
                <Badge tone="neutral">{organization.legal_status}</Badge>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Unit aktif" value={activeUnits.length} note={units.length + " unit pada registry"} tone="info" icon={<Building2 size={17} />} />
            <StatCard label="Aplikasi bidang aktif" value={enabledFieldApps.length} note={fieldUnits.length + " unit bertipe bidang" } tone="success" icon={<Network size={17} />} />
            <StatCard label="Keanggotaan aktif" value={members.length} note="Valid pada tanggal hari ini" tone="neutral" icon={<Users size={17} />} />
            <StatCard label="Penugasan disahkan" value={activeAppointments.length} note={proposedAppointments.length + " usulan belum disahkan"} tone="warning" icon={<ShieldCheck size={17} />} />
          </div>

          <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1fr_1.2fr]">
            <Card>
              <CardHeader title="Unit organisasi" subtitle={units.length + " unit tersimpan pada registry"} />
              {units.length ? (
                <ul className="divide-y divide-line">
                  {units.map((unit) => (
                    <li key={unit.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-paper text-muted2">
                        {unit.unit_type === "field" ? <Network size={16} /> : <Building2 size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-ink">{unit.name}</span>
                          <Badge tone="neutral">{UNIT_LABEL[unit.unit_type]}</Badge>
                          <Badge tone={unit.is_active ? "success" : "warning"}>{unit.is_active ? "Unit aktif" : "Unit nonaktif"}</Badge>
                          {unit.unit_type === "field" ? (
                            <Badge tone={unit.is_enabled ? "success" : "warning"}>{unit.is_enabled ? "Aplikasi aktif" : "Aplikasi nonaktif"}</Badge>
                          ) : null}
                        </div>
                        {unit.mandate ? (
                          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{unit.mandate}</p>
                        ) : (
                          <p className="mt-1 text-[10.5px] text-muted2">Mandat unit belum dicatat.</p>
                        )}
                        <div className="mt-1 font-mono text-[9.5px] text-muted2">{unit.unit_key}</div>
                      </div>
                      {unit.route ? (
                        <Link href={unit.route} className="mt-1 shrink-0 text-[10.5px] font-semibold text-primary-700">Buka <ArrowRight size={11} className="inline" /></Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4"><EmptyState title="Belum ada unit tercatat" body="Unit akan tampil setelah dicatat pada registry organisasi." /></div>
              )}
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader title="Penugasan tim bidang" subtitle="Status berasal dari alur penugasan resmi, bukan posisi login" />
                {assignments.length ? (
                  <div className="divide-y divide-line">
                    {assignments.map((item) => (
                      <article key={item.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-ink">{item.person_name}</div>
                            <div className="mt-0.5 text-[10.5px] text-muted">{item.field_name} · {item.role_label}</div>
                          </div>
                          <Badge tone={appointmentStatus(item, today).tone}>{appointmentStatus(item, today).label}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted2">
                          <span>{item.appointment_reference ?? "Nomor keputusan belum dicatat"}</span>
                          <span>{formatDateID(item.valid_from, "short")}{item.valid_until ? " – " + formatDateID(item.valid_until, "short") : " – tanpa tanggal akhir"}</span>
                          {item.scope_label ? <span>{item.scope_label}</span> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="p-4"><EmptyState title="Belum ada penugasan bidang" body="Usulan atau penugasan yang disahkan akan muncul setelah dicatat pada modul Manajemen Tim." /></div>
                )}
              </Card>

              <Card>
                <CardHeader title="Status keanggotaan personel" subtitle={members.length + " anggota dengan masa berlaku saat ini"} />
                {members.length ? (
                  <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
                    {members.map((person) => (
                      <div key={person.membership_id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar name={person.preferred_name ?? person.full_name} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold text-ink">{person.preferred_name ?? person.full_name}</div>
                          <div className="text-[10px] text-muted">{person.position_title ?? person.unit_name ?? "Anggota"}</div>
                        </div>
                        <span className="font-mono text-[9.5px] text-muted2">{person.member_number ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4"><EmptyState title="Belum ada keanggotaan aktif" body="Buku Induk akan tampil setelah data keanggotaan tercatat dan berlaku." /></div>
                )}
              </Card>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Notice tone="warning" title="Status organisasi berbeda dari status aplikasi">
              Unit organisasi yang aktif adalah bagian dari registry kelembagaan. Mengaktifkan atau menonaktifkan aplikasi bidang tidak mengesahkan, membubarkan, atau mengubah status unit secara hukum.
            </Notice>
            <Notice tone="info" title="Batas kewenangan Studio">
              Halaman ini tidak mengedit unit, jabatan, periode, atau penugasan. Pengangkatan dan perubahan susunan membutuhkan keputusan resmi, persetujuan berwenang, pencatatan audit, serta pengujian alur sebelum tombol perubahan diaktifkan.
            </Notice>
          </div>
        </>
      ) : null}
    </div>
  );
}
