import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Network, ShieldCheck, Users } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { FIELDS } from "@/config/fields";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Struktur & Kepengurusan" };

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
  is_enabled: boolean | null;
  route: string | null;
  display_order: number;
}

interface PersonRow {
  membership_id: string;
  person_id: string;
  full_name: string;
  preferred_name: string | null;
  member_number: string | null;
  position_title: string | null;
  valid_from: string | null;
  valid_until: string | null;
  unit_id: string | null;
  unit_name: string | null;
  unit_key: string | null;
  unit_type: string | null;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

const unitTypeLabel: Record<UnitRow["unit_type"], string> = {
  executive: "Pengurus harian",
  secretariat: "Sekretariat",
  finance: "Keuangan",
  field: "Bidang",
  support: "Pendukung",
};

function positionGroup(title: string | null): "inti" | "lain" {
  const normalized = (title ?? "").trim().toLocaleLowerCase("id-ID");
  return /^(ketua|wakil ketua|sekretaris|wakil sekretaris|bendahara|wakil bendahara)(\s|$)/.test(normalized)
    ? "inti"
    : "lain";
}

export default async function StrukturPage() {
  const identity = await requireIdentity("organization:read");
  let organization: OrganizationRow | null = null;
  let units: UnitRow[] = [];
  let people: PersonRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [organizationResult, unitResult, peopleResult] = await Promise.all([
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
          unit.sort_order AS display_order,
          application.is_enabled,
          application.route,
          COALESCE(application.mandate, unit.mandate) AS mandate
        FROM v9.organization_units AS unit
        LEFT JOIN v9.field_applications AS application
          ON application.unit_id = unit.id
          AND application.organization_id = unit.organization_id
        WHERE unit.organization_id = ${identity.organizationId}
          AND unit.is_active = true
        ORDER BY unit.sort_order, unit.name
      `,
      sql`
        SELECT
          membership.id::text AS membership_id,
          person.id::text AS person_id,
          person.full_name,
          person.preferred_name,
          membership.member_number,
          membership.position_title,
          membership.valid_from::text AS valid_from,
          membership.valid_until::text AS valid_until,
          membership.unit_id::text AS unit_id,
          unit.name AS unit_name,
          unit.unit_key,
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
    ]);

    organization = rowsFromResult<OrganizationRow>(organizationResult)[0] ?? null;
    units = rowsFromResult<UnitRow>(unitResult);
    people = rowsFromResult<PersonRow>(peopleResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-structure] Source unavailable", safeErrorType(reason));
  }

  const corePeople = people.filter((person) => positionGroup(person.position_title) === "inti" && person.position_title);
  const fieldPeople = people.filter((person) => person.unit_type === "field" && !corePeople.includes(person));
  const otherPeople = people.filter((person) => !corePeople.includes(person) && !fieldPeople.includes(person));
  const fieldUnits = units.filter((unit) => unit.unit_type === "field");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Struktur & kepengurusan"
        description="Unit organisasi yang tersimpan dan personel aktif yang terhubung pada Buku Induk. Jabatan dan mandat hanya ditampilkan jika telah dicatat."
        actions={<Link href="/app/sekretariat/sk" className="sb-btn sb-btn-outline">Dokumen keputusan</Link>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Struktur organisasi belum dapat dimuat">
            Sumber unit dan keanggotaan sedang tidak tersedia. Susunan personel demo tidak ditampilkan.
          </Notice>
        </div>
      ) : null}

      {organization ? (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Organisasi</div>
              <h2 className="mt-1 text-[15px] font-semibold text-ink">{organization.legal_name}</h2>
              <p className="mt-1 text-[11px] text-muted">{organization.address ?? "Alamat belum dilengkapi"}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={organization.status === "active" ? "success" : "warning"}>{organization.status}</Badge>
              <Badge tone="neutral">{organization.legal_status}</Badge>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unit organisasi aktif" value={units.length} note="Unit dalam registry organisasi" tone="info" icon={<Building2 size={17} />} />
        <StatCard label="Bidang resmi" value={fieldUnits.length} note="Unit bertipe bidang" tone="info" icon={<Network size={17} />} />
        <StatCard label="Personel inti tercatat" value={corePeople.length} note="Jabatan inti tertulis pada Buku Induk" tone="success" icon={<ShieldCheck size={17} />} />
        <StatCard label="Anggota aktif" value={people.length} note="Keanggotaan yang berlaku hari ini" tone="neutral" icon={<Users size={17} />} />
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader title="Unit organisasi" subtitle="Sumber: registry organisasi" />
          {units.length ? (
            <ul className="divide-y divide-line">
              {units.map((unit) => {
                const field = FIELDS.find((item) => item.slug === unit.unit_key);
                const href = unit.route ?? field?.appHref;
                return (
                  <li key={unit.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-paper text-muted2">
                      {unit.unit_type === "field" ? <Network size={16} /> : unit.unit_type === "finance" ? <ShieldCheck size={16} /> : <Building2 size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[12.5px] font-semibold text-ink">{unit.name}</h3>
                        <Badge tone="neutral">{unitTypeLabel[unit.unit_type]}</Badge>
                        {unit.unit_type === "field" ? (
                          <Badge tone={unit.is_enabled ? "success" : "warning"}>
                            {unit.is_enabled ? "Aplikasi aktif" : "Aplikasi belum aktif"}
                          </Badge>
                        ) : null}
                      </div>
                      {unit.mandate ? (
                        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{unit.mandate}</p>
                      ) : (
                        <p className="mt-1 text-[10.5px] text-muted2">Mandat khusus unit belum dicatat.</p>
                      )}
                    </div>
                    {href ? (
                      <Link href={href} className="mt-1 shrink-0 text-[10.5px] font-semibold text-primary-700">Buka <ArrowRight size={11} className="inline" /></Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4"><EmptyState title="Belum ada unit organisasi" body="Unit akan tampil setelah dicatat pada registry organisasi." /></div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Pengurus inti" subtitle="Personel aktif dengan jabatan inti yang dicatat" />
            {corePeople.length ? (
              <ul className="divide-y divide-line">
                {corePeople.map((person) => (
                  <li key={person.membership_id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar name={person.preferred_name ?? person.full_name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-ink">{person.preferred_name ?? person.full_name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1.5">
                        <Badge tone="accent">{person.position_title}</Badge>
                        {person.unit_name ? <Badge tone="neutral">{person.unit_name}</Badge> : null}
                      </div>
                      <div className="mt-1 text-[10px] text-muted2">
                        {person.member_number ? "No. anggota " + person.member_number : "Nomor anggota belum dicatat"}
                        {person.valid_from ? " · sejak " + formatDateID(person.valid_from, "short") : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState title="Jabatan inti belum tercatat" body="Ketua, Sekretaris, Bendahara, dan jabatan inti lain hanya akan tampil setelah penempatan jabatan dicatat pada Buku Induk dan sesuai dokumen keputusan." />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Pengampu bidang" subtitle="Anggota aktif yang ditautkan ke unit bidang" />
            {fieldPeople.length ? (
              <ul className="divide-y divide-line">
                {fieldPeople.map((person) => {
                  const field = FIELDS.find((item) => item.slug === person.unit_key);
                  return (
                    <li key={person.membership_id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={person.preferred_name ?? person.full_name} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-ink">{person.preferred_name ?? person.full_name}</div>
                        <div className="text-[10.5px] text-muted">{person.position_title ?? person.unit_name ?? "Pengampu bidang"}</div>
                      </div>
                      {field ? <Link href={field.appHref} className="text-[10.5px] font-semibold text-primary-700">Buka</Link> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState title="Belum ada pengampu bidang" body="Personel akan muncul ketika keanggotaan aktif dihubungkan dengan unit bidang." />
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Anggota aktif lainnya"
          subtitle={otherPeople.length + " orang dengan posisi non-inti atau unit belum ditautkan"}
          action={<Link href="/app/pengurus/anggota" className="text-[11px] font-semibold text-primary-700">Buku Induk <ArrowRight size={11} className="inline" /></Link>}
        />
        {otherPeople.length ? (
          <div className="sb-scroll">
            <table className="sb-table min-w-[640px]">
              <thead><tr><th>Nama</th><th>Nomor anggota</th><th>Posisi</th><th>Unit</th><th>Mulai berlaku</th></tr></thead>
              <tbody>
                {otherPeople.map((person) => (
                  <tr key={person.membership_id}>
                    <td className="font-medium text-ink">{person.preferred_name ?? person.full_name}</td>
                    <td className="font-mono text-[10.5px] text-muted">{person.member_number ?? "—"}</td>
                    <td className="text-ink2">{person.position_title ?? "Anggota"}</td>
                    <td className="text-muted">{person.unit_name ?? "Belum ditautkan"}</td>
                    <td className="whitespace-nowrap text-muted">{person.valid_from ? formatDateID(person.valid_from, "short") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4"><EmptyState title="Belum ada personel lain tercatat" body="Buku Induk tidak memiliki keanggotaan aktif lain untuk ditampilkan." /></div>
        )}
      </Card>

      <div className="mt-4">
        <Notice tone="warning" title="Susunan yang sah mengikuti dokumen keputusan">
          Registry unit menjelaskan pembagian kerja aplikasi. Penetapan nama pengurus, masa bakti,
          perubahan jabatan, dan kewenangan tanda tangan tetap mengikuti SK serta keputusan musyawarah
          yang telah dicatat pada Sekretariat. Sistem tidak menganggap role login sebagai bukti jabatan.
        </Notice>
      </div>
    </div>
  );
}
