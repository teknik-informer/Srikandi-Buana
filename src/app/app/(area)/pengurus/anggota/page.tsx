import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, CircleAlert, Clock3, Phone } from "lucide-react";
import { Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { can, requireIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { updateMembershipStatus } from "@/app/actions/membership-management";

export const metadata: Metadata = { title: "Anggota & Keanggotaan" };

interface MembershipCounts {
  active_count: number;
  pending_count: number;
  inactive_count: number;
  left_count: number;
}

interface MembershipRow {
  id: string;
  person_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  village: string | null;
  member_number: string | null;
  status: "pending" | "active" | "inactive" | "left" | "archived";
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

const statusText: Record<MembershipRow["status"], string> = {
  pending: "Menunggu verifikasi",
  active: "Aktif",
  inactive: "Nonaktif",
  left: "Keluar",
  archived: "Diarsipkan",
};

const statusStyle: Record<MembershipRow["status"], string> = {
  pending: "bg-[#fff4df] text-[#80540a]",
  active: "bg-[#eaf3e6] text-[#38571a]",
  inactive: "bg-paper text-muted",
  left: "bg-paper text-muted",
  archived: "bg-paper text-muted2",
};

function dateLabel(value: string | null): string {
  if (!value) return "Belum ditetapkan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default async function KeanggotaanPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity("organization:read");
  const canManage = can(identity, "membership:activate");
  const sql = getV9Sql();

  const [countResult, memberResult] = await Promise.all([
    sql`
      SELECT
        count(*) FILTER (WHERE status = 'active')::int AS active_count,
        count(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        count(*) FILTER (WHERE status = 'inactive')::int AS inactive_count,
        count(*) FILTER (WHERE status = 'left')::int AS left_count
      FROM v9.memberships
      WHERE organization_id = ${identity.organizationId}
    `,
    sql`
      SELECT
        membership.id::text AS id,
        membership.person_id::text AS person_id,
        person.full_name,
        person.phone,
        person.address,
        person.village,
        membership.member_number,
        membership.status,
        membership.valid_from,
        membership.valid_until,
        membership.created_at
      FROM v9.memberships AS membership
      INNER JOIN v9.people AS person ON person.id = membership.person_id
      WHERE membership.organization_id = ${identity.organizationId}
      ORDER BY
        CASE membership.status
          WHEN 'pending' THEN 1
          WHEN 'active' THEN 2
          WHEN 'inactive' THEN 3
          WHEN 'left' THEN 4
          ELSE 5
        END,
        membership.created_at DESC
      LIMIT 200
    `,
  ]);

  const counts = rowsFromResult<MembershipCounts>(countResult)[0] ?? {
    active_count: 0,
    pending_count: 0,
    inactive_count: 0,
    left_count: 0,
  };
  const members = rowsFromResult<MembershipRow>(memberResult);
  const query = await searchParams;

  const messages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    active: { tone: "success", text: "Status keanggotaan berhasil diaktifkan. Nomor anggota tetap kosong bila belum ditetapkan organisasi." },
    inactive: { tone: "warning", text: "Status keanggotaan telah diubah menjadi nonaktif." },
    left: { tone: "warning", text: "Status keanggotaan telah dicatat sebagai keluar." },
    stale: { tone: "warning", text: "Data sudah berubah atau tidak ditemukan. Muat ulang halaman." },
    duplicate: { tone: "danger", text: "Nomor anggota sudah digunakan. Periksa kembali nomor yang dimasukkan." },
    invalid: { tone: "danger", text: "Data perubahan tidak valid. Periksa nomor anggota dan catatan." },
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Anggota & keanggotaan"
        description="Daftar ini membaca catatan keanggotaan dari database organisasi. Pengajuan yang disetujui masuk sebagai calon anggota dengan status menunggu verifikasi."
        actions={
          can(identity, "field:organisasi:review") ? (
            <Link href="/app/bidang/organisasi/pengajuan" className="sb-btn sb-btn-outline">
              Antrean pengajuan
            </Link>
          ) : undefined
        }
      />

      {query?.result && messages[query.result] ? (
        <div className="mb-4">
          <Notice tone={messages[query.result].tone} title="Pembaruan keanggotaan">
            {messages[query.result].text}
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anggota aktif" value={counts.active_count} note="Catatan berstatus aktif" tone="success" />
        <StatCard label="Menunggu verifikasi" value={counts.pending_count} note="Perlu pemeriksaan pengurus" tone="warning" />
        <StatCard label="Nonaktif" value={counts.inactive_count} note="Tidak sedang aktif" tone="neutral" />
        <StatCard label="Keluar" value={counts.left_count} note="Keanggotaan telah berakhir" tone="neutral" />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Buku keanggotaan"
            subtitle={`${members.length} catatan terbaru · maksimal 200 catatan ditampilkan`}
          />
          {members.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CheckCircle2 size={28} className="mx-auto text-muted2" />
              <h2 className="mt-3 text-[14px] font-semibold text-ink">Belum ada catatan keanggotaan</h2>
              <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-muted">
                Pengajuan dari website akan muncul di antrean Bidang Organisasi. Setelah disetujui,
                calon anggota tercatat di sini untuk verifikasi dan aktivasi.
              </p>
              <Link href="/app/bidang/organisasi/pengajuan" className="sb-btn sb-btn-primary mt-4">
                Buka antrean pengajuan
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="sb-table min-w-[960px]">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Kontak & alamat</th>
                      <th>Nomor anggota</th>
                      <th>Status</th>
                      <th>Berlaku</th>
                      {canManage ? <th>Pengelolaan</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="align-top">
                        <td>
                          <div className="font-semibold text-ink">{member.full_name}</div>
                          <div className="mt-1 font-mono text-[10px] text-muted2">{member.id.slice(0, 8)}</div>
                        </td>
                        <td>
                          {member.phone ? (
                            <div className="flex items-center gap-1.5 text-[11.5px] text-ink2">
                              <Phone size={11} /> {member.phone}
                            </div>
                          ) : <span className="text-muted2">Telepon belum tercatat</span>}
                          <div className="mt-1 max-w-[230px] text-[11px] text-muted">
                            {member.address ?? member.village ?? "Alamat belum tercatat"}
                          </div>
                        </td>
                        <td className="font-mono text-[11px] text-ink2">
                          {member.member_number ?? <span className="font-sans text-muted2">Belum ditetapkan</span>}
                        </td>
                        <td>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${statusStyle[member.status]}`}>
                            {statusText[member.status]}
                          </span>
                        </td>
                        <td className="text-[11px] text-muted">
                          <div className="flex items-center gap-1.5"><CalendarDays size={11} />{dateLabel(member.valid_from)}</div>
                          {member.valid_until ? <div className="mt-1">Sampai {dateLabel(member.valid_until)}</div> : null}
                        </td>
                        {canManage ? (
                          <td>
                            {member.status === "archived" || member.status === "left" ? (
                              <span className="text-[10.5px] text-muted2">Tidak ada tindakan</span>
                            ) : (
                              <form action={updateMembershipStatus} className="min-w-[185px] space-y-2">
                                <input type="hidden" name="id" value={member.id} />
                                <select
                                  name="decision"
                                  defaultValue={member.status === "active" ? "inactive" : "active"}
                                  className="sb-input !h-8 text-[11px]"
                                  aria-label={`Status untuk ${member.full_name}`}
                                >
                                  <option value="active">Aktifkan</option>
                                  <option value="inactive">Nonaktifkan</option>
                                  <option value="left">Catat keluar</option>
                                </select>
                                <input
                                  name="member_number"
                                  defaultValue={member.member_number ?? ""}
                                  maxLength={40}
                                  className="sb-input !h-8 text-[10.5px]"
                                  placeholder="Nomor anggota (opsional)"
                                />
                                <input
                                  name="note"
                                  maxLength={1000}
                                  className="sb-input !h-8 text-[10.5px]"
                                  placeholder="Catatan audit (opsional)"
                                />
                                <button type="submit" className="sb-btn sb-btn-primary !h-8 !w-full !px-2 text-[10.5px]">
                                  Simpan perubahan
                                </button>
                              </form>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {members.map((member) => (
                  <article key={member.id} className="rounded-[10px] border border-line bg-white p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink">{member.full_name}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted2">{member.id.slice(0, 8)}</div>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle[member.status]}`}>
                        {statusText[member.status]}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[11.5px] text-muted">
                      {member.phone ? <div className="flex items-center gap-1.5"><Phone size={11} />{member.phone}</div> : null}
                      <div>{member.address ?? member.village ?? "Alamat belum tercatat"}</div>
                      <div>Nomor anggota: <span className="font-mono text-ink2">{member.member_number ?? "Belum ditetapkan"}</span></div>
                      <div className="flex items-center gap-1.5"><CalendarDays size={11} />{dateLabel(member.valid_from)}</div>
                    </div>
                    {canManage && member.status !== "archived" && member.status !== "left" ? (
                      <form action={updateMembershipStatus} className="mt-3 space-y-2 border-t border-line pt-3">
                        <input type="hidden" name="id" value={member.id} />
                        <select
                          name="decision"
                          defaultValue={member.status === "active" ? "inactive" : "active"}
                          className="sb-input !h-10 text-[12px]"
                          aria-label={`Status untuk ${member.full_name}`}
                        >
                          <option value="active">Aktifkan</option>
                          <option value="inactive">Nonaktifkan</option>
                          <option value="left">Catat keluar</option>
                        </select>
                        <input
                          name="member_number"
                          defaultValue={member.member_number ?? ""}
                          maxLength={40}
                          className="sb-input !h-10 text-[11.5px]"
                          placeholder="Nomor anggota (opsional)"
                        />
                        <input
                          name="note"
                          maxLength={1000}
                          className="sb-input !h-10 text-[11.5px]"
                          placeholder="Catatan audit (opsional)"
                        />
                        <button type="submit" className="sb-btn sb-btn-primary !h-10 !w-full text-[12px]">
                          Simpan perubahan
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-line bg-paper px-4 py-3 text-[11.5px] leading-relaxed text-muted">
        <CircleAlert size={14} className="mt-0.5 shrink-0" />
        Nomor anggota tidak dibuat otomatis. Gunakan format yang sudah disahkan organisasi; setiap
        perubahan status dicatat dalam audit. Pengaktifan keanggotaan tidak otomatis membuat akun login.
      </div>
    </div>
  );
}
