import Link from "next/link";
import { CalendarDays, ShieldCheck, UserCheck, UsersRound } from "lucide-react";
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
import type { FieldDef } from "@/config/fields";
import {
  approveFieldTeamAssignment,
  endFieldTeamAssignment,
  proposeFieldTeamAssignment,
} from "@/app/actions/field-team";

interface TeamAssignment {
  id: string;
  membership_id: string;
  member_number: string | null;
  full_name: string;
  membership_position: string | null;
  role_label: string;
  scope_label: string | null;
  appointment_reference: string | null;
  appointed_on: string | null;
  valid_from: string;
  valid_until: string | null;
  status: "proposed" | "active" | "ended" | "cancelled";
}

interface AvailableMember {
  membership_id: string;
  member_number: string | null;
  full_name: string;
  position_title: string | null;
}

function dateLabel(value: string | null): string {
  if (!value) return "Tidak dibatasi";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

const notices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  proposed: { tone: "success", text: "Usulan penugasan tim berhasil dicatat dan menunggu persetujuan pengurus organisasi." },
  approved: { tone: "success", text: "Penugasan tim disetujui oleh pengurus organisasi." },
  ended: { tone: "success", text: "Masa penugasan diakhiri. Riwayat tetap tersimpan." },
  invalid: { tone: "danger", text: "Isian penugasan tidak valid. Periksa anggota, peran, dan tanggal." },
  duplicate: { tone: "warning", text: "Anggota tersebut sudah memiliki usulan atau penugasan aktif pada bidang ini." },
  "member-unavailable": { tone: "warning", text: "Anggota harus berstatus aktif dan terdaftar pada unit bidang ini sebelum dapat diberi penugasan." },
  stale: { tone: "warning", text: "Penugasan sudah berubah atau tidak ditemukan." },
  error: { tone: "danger", text: "Perubahan tim belum dapat disimpan. Periksa koneksi dan coba kembali." },
};

export async function FieldTeamSection({
  field,
  result,
}: {
  field: FieldDef;
  result?: string;
}) {
  const identity = await requireIdentity(`field:${field.slug}:read`);
  const canWrite = can(identity, `field:${field.slug}:team:write`);
  const canApprove = can(identity, "organization:team:approve");
  const sql = getV9Sql();

  const [assignmentResult, memberResult] = await Promise.all([
    sql`
      SELECT
        assignment.id::text AS id,
        assignment.membership_id::text AS membership_id,
        membership.member_number,
        person.full_name,
        membership.position_title AS membership_position,
        assignment.role_label,
        assignment.scope_label,
        assignment.appointment_reference,
        assignment.appointed_on::text AS appointed_on,
        assignment.valid_from::text AS valid_from,
        assignment.valid_until::text AS valid_until,
        assignment.status
      FROM v9.field_team_assignments AS assignment
      INNER JOIN v9.memberships AS membership
        ON membership.id = assignment.membership_id
        AND membership.organization_id = assignment.organization_id
      INNER JOIN v9.people AS person
        ON person.id = membership.person_id
      WHERE assignment.organization_id = ${identity.organizationId}
        AND assignment.field_key = ${field.slug}
      ORDER BY
        CASE assignment.status WHEN 'active' THEN 1 WHEN 'proposed' THEN 2 WHEN 'ended' THEN 3 ELSE 4 END,
        assignment.valid_from DESC,
        person.full_name
      LIMIT 300
    `,
    sql`
      SELECT
        membership.id::text AS membership_id,
        membership.member_number,
        person.full_name,
        membership.position_title
      FROM v9.field_applications AS application
      INNER JOIN v9.memberships AS membership
        ON membership.organization_id = application.organization_id
        AND membership.unit_id = application.unit_id
      INNER JOIN v9.people AS person
        ON person.id = membership.person_id
      WHERE application.organization_id = ${identity.organizationId}
        AND application.field_key = ${field.slug}
        AND application.is_enabled = true
        AND membership.status = 'active'
        AND NOT EXISTS (
          SELECT 1
          FROM v9.field_team_assignments AS assignment
          WHERE assignment.organization_id = membership.organization_id
            AND assignment.field_key = application.field_key
            AND assignment.membership_id = membership.id
            AND assignment.status IN ('proposed','active')
        )
      ORDER BY person.full_name
      LIMIT 500
    `,
  ]);
  const assignments = rowsFromResult<TeamAssignment>(assignmentResult);
  const members = rowsFromResult<AvailableMember>(memberResult);

  const activeCount = assignments.filter((assignment) => assignment.status === "active").length;
  const proposedCount = assignments.filter((assignment) => assignment.status === "proposed").length;
  const formerCount = assignments.filter((assignment) => assignment.status === "ended").length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title="Manajemen Tim"
        description="Keanggotaan unit dan penugasan pelaksana adalah dua catatan berbeda. Usulan penugasan menjadi aktif setelah disetujui pengurus yang berwenang."
        actions={<Link href={field.appHref} className="sb-btn sb-btn-outline">Ringkasan bidang</Link>}
      />

      {result && notices[result] ? (
        <div className="mb-4">
          <Notice tone={notices[result].tone} title="Pembaruan tim">{notices[result].text}</Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Penugasan aktif" value={activeCount} note="Sudah disetujui" tone="success" />
        <StatCard label="Menunggu persetujuan" value={proposedCount} note="Belum menjadi penugasan aktif" tone="warning" />
        <StatCard label="Riwayat selesai" value={formerCount} note="Penugasan yang telah diakhiri" tone="neutral" />
      </div>

      {canWrite ? (
        <Card className="mt-5">
          <CardHeader
            title="Usulkan penugasan anggota"
            subtitle="Hanya anggota aktif pada unit resmi bidang ini yang dapat diusulkan."
          />
          {members.length ? (
            <form action={proposeFieldTeamAssignment} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              <input type="hidden" name="field_key" value={field.slug} />
              <div className="sm:col-span-2 xl:col-span-3">
                <label htmlFor="team-membership" className="mb-1 block text-[11.5px] font-semibold text-ink2">Anggota</label>
                <select id="team-membership" name="membership_id" required defaultValue="" className="sb-input">
                  <option value="" disabled>Pilih anggota aktif bidang</option>
                  {members.map((member) => (
                    <option key={member.membership_id} value={member.membership_id}>
                      {member.full_name}{member.member_number ? ` · ${member.member_number}` : ""}{member.position_title ? ` · ${member.position_title}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="team-role" className="mb-1 block text-[11.5px] font-semibold text-ink2">Peran dalam tim</label>
                <input id="team-role" name="role_label" required minLength={2} maxLength={160} className="sb-input" placeholder="Mis. Pelaksana pendataan" />
              </div>
              <div>
                <label htmlFor="team-scope" className="mb-1 block text-[11.5px] font-semibold text-ink2">Cakupan tugas</label>
                <input id="team-scope" name="scope_label" maxLength={300} className="sb-input" placeholder="Wilayah / program / tanggung jawab" />
              </div>
              <div>
                <label htmlFor="team-valid-from" className="mb-1 block text-[11.5px] font-semibold text-ink2">Mulai penugasan</label>
                <input id="team-valid-from" name="valid_from" type="date" required className="sb-input" />
              </div>
              <div>
                <label htmlFor="team-valid-until" className="mb-1 block text-[11.5px] font-semibold text-ink2">Akhir penugasan (opsional)</label>
                <input id="team-valid-until" name="valid_until" type="date" className="sb-input" />
              </div>
              <div>
                <label htmlFor="team-appointed-on" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal keputusan (opsional)</label>
                <input id="team-appointed-on" name="appointed_on" type="date" className="sb-input" />
              </div>
              <div>
                <label htmlFor="team-appointment-reference" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nomor keputusan (opsional)</label>
                <input id="team-appointment-reference" name="appointment_reference" maxLength={100} className="sb-input" placeholder="Nomor SK / surat tugas bila ada" />
              </div>
              <div className="flex items-end justify-end sm:col-span-2 xl:col-span-3">
                <button type="submit" className="sb-btn sb-btn-primary"><UserCheck size={14} /> Ajukan penugasan</button>
              </div>
            </form>
          ) : (
            <div className="p-4">
              <Notice tone="warning" title="Belum ada anggota aktif yang dapat diusulkan">
                Pastikan anggota telah diverifikasi, berstatus aktif, dan terhubung ke unit bidang ini di Buku Induk.
                Sistem tidak akan menambahkan orang contoh ke daftar tim.
              </Notice>
            </div>
          )}
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title="Daftar penugasan"
          subtitle={`${assignments.length} catatan penugasan · termasuk riwayat`}
          action={<Badge tone="neutral">Data V9</Badge>}
        />
        {assignments.length ? (
          <div className="divide-y divide-line">
            {assignments.map((assignment) => (
              <article key={assignment.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-ink">{assignment.full_name}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted">{assignment.role_label}</div>
                    {assignment.member_number ? <div className="mt-1 font-mono text-[9.5px] text-muted2">Nomor anggota: {assignment.member_number}</div> : null}
                  </div>
                  <Badge tone={assignment.status === "active" ? "success" : assignment.status === "proposed" ? "warning" : "neutral"}>
                    {assignment.status === "active" ? "Aktif" : assignment.status === "proposed" ? "Menunggu persetujuan" : assignment.status === "ended" ? "Berakhir" : "Dibatalkan"}
                  </Badge>
                </div>
                <div className="mt-2 grid gap-1 text-[10.5px] text-muted sm:grid-cols-2">
                  {assignment.scope_label ? <div>Cakupan: {assignment.scope_label}</div> : null}
                  <div className="inline-flex items-center gap-1"><CalendarDays size={11} />{dateLabel(assignment.valid_from)} – {dateLabel(assignment.valid_until)}</div>
                  {assignment.appointment_reference ? <div>Dasar penugasan: {assignment.appointment_reference}</div> : null}
                  {assignment.appointed_on ? <div>Tanggal keputusan: {dateLabel(assignment.appointed_on)}</div> : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {assignment.status === "proposed" && canApprove ? (
                    <form action={approveFieldTeamAssignment}>
                      <input type="hidden" name="field_key" value={field.slug} />
                      <input type="hidden" name="assignment_id" value={assignment.id} />
                      <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">
                        <ShieldCheck size={12} /> Setujui penugasan
                      </button>
                    </form>
                  ) : null}
                  {assignment.status === "active" && canWrite ? (
                    <form action={endFieldTeamAssignment}>
                      <input type="hidden" name="field_key" value={field.slug} />
                      <input type="hidden" name="assignment_id" value={assignment.id} />
                      <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">Akhiri penugasan</button>
                    </form>
                  ) : null}
                  {assignment.status === "proposed" && !canApprove ? (
                    <span className="text-[10.5px] text-muted2">Menunggu pengesahan pengurus organisasi</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10">
            <EmptyState title="Belum ada penugasan tim" body="Penugasan akan tercatat setelah anggota aktif diusulkan dan disetujui sesuai kewenangan organisasi." />
          </div>
        )}
      </Card>

      <div className="mt-5">
        <Notice tone="info" title="Penugasan bukan perubahan peran akun">
          Catatan penugasan bidang menyimpan fungsi kerja, cakupan, dan masa tugas. Catatan ini tidak
          otomatis memberikan hak akses aplikasi. Perubahan role sistem, pengangkatan resmi, dan
          penerbitan keputusan organisasi tetap mengikuti proses pengesahan yang terpisah.
        </Notice>
      </div>
    </div>
  );
}
