import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, Phone } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  Notice,
  PageHeader,
  StatCard,
  Tabs,
} from "@/components/ui";
import { can, requireIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { updateMembershipStatus } from "@/app/actions/membership-management";

export const metadata: Metadata = { title: "Buku Induk Anggota" };

interface Counts {
  active_count: number;
  pending_count: number;
  inactive_count: number;
  left_count: number;
}

interface MemberRow {
  id: string;
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

const tabToStatus: Record<string, MemberRow["status"]> = {
  aktif: "active",
  menunggu: "pending",
  nonaktif: "inactive",
  keluar: "left",
};

const statusLabel: Record<MemberRow["status"], string> = {
  pending: "Menunggu verifikasi",
  active: "Aktif",
  inactive: "Nonaktif",
  left: "Keluar",
  archived: "Diarsipkan",
};

const statusTone: Record<MemberRow["status"], "success" | "warning" | "neutral"> = {
  pending: "warning",
  active: "success",
  inactive: "neutral",
  left: "neutral",
  archived: "neutral",
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

export default async function BukuIndukPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; result?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const { status, result } = await searchParams;
  const activeTab = status && status in tabToStatus ? status : "aktif";
  const selectedStatus = tabToStatus[activeTab];
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
        AND membership.status = ${selectedStatus}
      ORDER BY membership.created_at DESC
      LIMIT 200
    `,
  ]);

  const counts = rowsFromResult<Counts>(countResult)[0] ?? {
    active_count: 0,
    pending_count: 0,
    inactive_count: 0,
    left_count: 0,
  };
  const list = rowsFromResult<MemberRow>(memberResult);

  const resultMessages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    active: { tone: "success", text: "Keanggotaan berhasil diaktifkan. Nomor anggota tetap mengikuti penetapan organisasi." },
    inactive: { tone: "warning", text: "Status keanggotaan diubah menjadi nonaktif." },
    left: { tone: "warning", text: "Keanggotaan dicatat telah berakhir." },
    stale: { tone: "warning", text: "Data sudah berubah atau tidak ditemukan. Muat ulang daftar." },
    invalid: { tone: "danger", text: "Perubahan tidak valid. Periksa nomor anggota dan catatan." },
    duplicate: { tone: "danger", text: "Nomor anggota sudah digunakan oleh catatan lain." },
    error: { tone: "danger", text: "Perubahan belum dapat disimpan. Periksa koneksi dan coba kembali." },
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Buku induk anggota"
        description="Sumber data resmi keanggotaan. Sekretariat mengelola status dan nomor induk; aplikasi lain membaca catatan sesuai kewenangannya."
        actions={
          can(identity, "field:organisasi:review") ? (
            <Link href="/app/bidang/organisasi/pengajuan" className="sb-btn sb-btn-outline">
              Antrean pengajuan
            </Link>
          ) : undefined
        }
      />

      {result && resultMessages[result] ? (
        <div className="mb-4">
          <Notice tone={resultMessages[result].tone} title="Pembaruan buku induk">
            {resultMessages[result].text}
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anggota aktif" value={counts.active_count} note="Catatan resmi berstatus aktif" tone="success" />
        <StatCard label="Menunggu verifikasi" value={counts.pending_count} note="Perlu pemeriksaan Sekretariat" tone="warning" />
        <StatCard label="Nonaktif" value={counts.inactive_count} note="Riwayat tetap tersimpan" tone="neutral" />
        <StatCard label="Keluar" value={counts.left_count} note="Keanggotaan berakhir" tone="neutral" />
      </div>

      <div className="mt-4">
        <Tabs
          active={activeTab}
          tabs={[
            { key: "aktif", label: `Aktif (${counts.active_count})`, href: "/app/sekretariat/anggota?status=aktif" },
            { key: "menunggu", label: `Menunggu (${counts.pending_count})`, href: "/app/sekretariat/anggota?status=menunggu" },
            { key: "nonaktif", label: `Nonaktif (${counts.inactive_count})`, href: "/app/sekretariat/anggota?status=nonaktif" },
            { key: "keluar", label: `Keluar (${counts.left_count})`, href: "/app/sekretariat/anggota?status=keluar" },
          ]}
        />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader
            title={
              selectedStatus === "active" ? "Anggota aktif" :
              selectedStatus === "pending" ? "Menunggu verifikasi" :
              selectedStatus === "inactive" ? "Anggota nonaktif" : "Keanggotaan berakhir"
            }
            subtitle={`${list.length} catatan ditampilkan · maksimal 200 catatan per status`}
            action={<Badge tone="neutral">Database organisasi</Badge>}
          />
          {list.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="sb-table min-w-[1000px]">
                  <thead>
                    <tr>
                      <th>No. induk</th><th>Nama</th><th>Kontak & alamat</th>
                      <th>Bergabung</th><th>Status</th>{canManage ? <th>Pengelolaan</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((member) => (
                      <tr key={member.id} className="align-top">
                        <td className="whitespace-nowrap font-mono text-[11px] text-muted">
                          {member.member_number ?? <span className="font-sans text-muted2">Belum ditetapkan</span>}
                        </td>
                        <td className="font-semibold text-ink">{member.full_name}</td>
                        <td>
                          {member.phone ? (
                            <div className="flex items-center gap-1.5 text-[11.5px] text-ink2"><Phone size={11} />{member.phone}</div>
                          ) : <span className="text-muted2">Telepon belum tercatat</span>}
                          <div className="mt-1 max-w-[240px] text-[11px] text-muted">
                            {member.address ?? member.village ?? "Alamat belum tercatat"}
                          </div>
                        </td>
                        <td className="text-[11px] text-muted">
                          <div className="flex items-center gap-1.5"><CalendarDays size={11} />{dateLabel(member.valid_from)}</div>
                          {member.valid_until ? <div className="mt-1">Sampai {dateLabel(member.valid_until)}</div> : null}
                        </td>
                        <td>
                          <Badge tone={statusTone[member.status]}>{statusLabel[member.status]}</Badge>
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
                {list.map((member) => (
                  <article key={member.id} className="rounded-[10px] border border-line bg-white p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink">{member.full_name}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted2">{member.id.slice(0, 8)}</div>
                      </div>
                      <Badge tone={statusTone[member.status]}>{statusLabel[member.status]}</Badge>
                    </div>
                    <div className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[11.5px] text-muted">
                      {member.phone ? <div className="flex items-center gap-1.5"><Phone size={11} />{member.phone}</div> : null}
                      <div>{member.address ?? member.village ?? "Alamat belum tercatat"}</div>
                      <div>Nomor induk: <span className="font-mono text-ink2">{member.member_number ?? "Belum ditetapkan"}</span></div>
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
                        <input name="member_number" defaultValue={member.member_number ?? ""} maxLength={40} className="sb-input !h-10 text-[11.5px]" placeholder="Nomor anggota (opsional)" />
                        <input name="note" maxLength={1000} className="sb-input !h-10 text-[11.5px]" placeholder="Catatan audit (opsional)" />
                        <button type="submit" className="sb-btn sb-btn-primary !h-10 !w-full text-[12px]">Simpan perubahan</button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="px-4 py-10 text-center text-[12.5px] text-muted">
              Tidak ada anggota pada status ini.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Pengelolaan data dan privasi">
          Buku induk adalah sumber data keanggotaan. Status, nomor induk, dan riwayat perubahan dikelola
          oleh petugas berwenang serta dicatat pada audit. Pengaktifan anggota tidak otomatis membuat akun login.
        </Notice>
      </div>
    </div>
  );
}
