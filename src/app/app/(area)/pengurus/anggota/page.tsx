import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, UsersRound } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Anggota & Keanggotaan" };

interface Summary {
  active_count: number;
  pending_count: number;
  inactive_count: number;
  left_count: number;
  field_count: number;
}

interface ActiveMember {
  id: string;
  full_name: string;
  member_number: string | null;
  unit_name: string | null;
  village: string | null;
  valid_from: string | null;
}

function dateLabel(value: string | null): string {
  if (!value) return "Belum ditetapkan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default async function KeanggotaanPage() {
  const identity = await requireIdentity("organization:read");
  const sql = getV9Sql();
  const [summaryResult, memberResult] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int
          FROM v9.memberships AS membership
          INNER JOIN v9.people AS person
            ON person.id = membership.person_id
            AND person.status = 'active'
          WHERE membership.organization_id = ${identity.organizationId}
            AND membership.status = 'active'
            AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
            AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
        ) AS active_count,
        (SELECT count(*)::int FROM v9.memberships WHERE organization_id = ${identity.organizationId} AND status = 'pending') AS pending_count,
        (SELECT count(*)::int FROM v9.memberships WHERE organization_id = ${identity.organizationId} AND status = 'inactive') AS inactive_count,
        (SELECT count(*)::int FROM v9.memberships WHERE organization_id = ${identity.organizationId} AND status = 'left') AS left_count,
        (SELECT count(*)::int FROM v9.field_applications WHERE organization_id = ${identity.organizationId} AND is_enabled = true) AS field_count
    `,
    sql`
      SELECT
        membership.id::text AS id,
        person.full_name,
        membership.member_number,
        unit.name AS unit_name,
        person.village,
        membership.valid_from
      FROM v9.memberships AS membership
      INNER JOIN v9.people AS person ON person.id = membership.person_id
      LEFT JOIN v9.organization_units AS unit
        ON unit.id = membership.unit_id
        AND unit.organization_id = membership.organization_id
      WHERE membership.organization_id = ${identity.organizationId}
        AND membership.status = 'active'
        AND person.status = 'active'
        AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
        AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
      ORDER BY membership.created_at DESC
      LIMIT 50
    `,
  ]);

  const summary = rowsFromResult<Summary>(summaryResult)[0] ?? {
    active_count: 0,
    pending_count: 0,
    inactive_count: 0,
    left_count: 0,
    field_count: 0,
  };
  const members = rowsFromResult<ActiveMember>(memberResult);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Anggota & keanggotaan"
        description="Ringkasan status keanggotaan organisasi. Pengurus membaca data; pencatatan induk dan aktivasi resmi dilakukan Sekretariat."
        actions={
          <Link href="/app/sekretariat/anggota" className="sb-btn sb-btn-outline">
            Buka Buku Induk
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anggota aktif" value={summary.active_count} note="Catatan resmi berstatus aktif" tone="success" />
        <StatCard label="Menunggu verifikasi" value={summary.pending_count} note="Perlu keputusan Sekretariat" tone="warning" href="/app/sekretariat/anggota?status=menunggu" />
        <StatCard label="Nonaktif" value={summary.inactive_count} note="Riwayat tetap tersimpan" tone="neutral" />
        <StatCard label="Aplikasi Bidang" value={summary.field_count} note="Terdaftar pada organisasi" tone="info" href="/app/pengurus/bidang" />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Anggota aktif terbaru"
            subtitle={`${members.length} dari ${summary.active_count} catatan aktif ditampilkan`}
            action={<Badge tone="neutral">Baca saja</Badge>}
          />
          {members.length ? (
            <div className="sb-scroll">
              <table className="sb-table min-w-[760px]">
                <thead>
                  <tr><th>Nama</th><th>Nomor anggota</th><th>Lingkup bidang</th><th>Desa</th><th>Aktif sejak</th></tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="font-semibold text-ink">{member.full_name}</td>
                      <td className="font-mono text-[11px] text-muted">{member.member_number ?? "Belum ditetapkan"}</td>
                      <td className="text-muted">{member.unit_name ?? "Belum ditetapkan"}</td>
                      <td className="text-muted">{member.village ?? "Belum tercatat"}</td>
                      <td className="whitespace-nowrap text-muted">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={11} />{dateLabel(member.valid_from)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <UsersRound size={27} className="mx-auto text-muted2" />
              <h2 className="mt-3 text-[14px] font-semibold text-ink">Belum ada anggota aktif</h2>
              <p className="mt-1 text-[12px] text-muted">Ringkasan akan terisi dari data keanggotaan yang diaktifkan Sekretariat.</p>
            </div>
          )}
          <div className="border-t border-line px-4 py-3 text-[11.5px] text-muted">
            Untuk verifikasi, penomoran, dan perubahan status, gunakan Buku Induk di Sekretariat.
          </div>
        </Card>
      </div>
    </div>
  );
}
