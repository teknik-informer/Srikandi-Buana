import type { Metadata } from "next";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import {
  createFinanceContributionAllocation,
  updateFinanceContributionAllocation,
} from "@/app/actions/finance";
import { can, requireIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { formatDateID, formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Iuran & Kontribusi" };

interface SummaryRow {
  contribution_total: string;
  entry_count: number;
  allocation_total: string;
  allocation_count: number;
  active_members: number;
}

interface JournalOption {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  contribution_amount: string;
  allocated_amount: string;
  available_amount: string;
}

interface MembershipOption {
  id: string;
  member_number: string | null;
  full_name: string;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
}

interface AllocationRow {
  id: string;
  journal_id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  membership_id: string;
  member_number: string | null;
  full_name: string;
  allocation_amount: string;
  note: string | null;
  created_at: string;
}

const resultMessages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "allocation-created": { tone: "success", text: "Kontribusi berhasil dialokasikan ke riwayat anggota." },
  "allocation-corrected": { tone: "success", text: "Koreksi alokasi kontribusi berhasil disimpan dan diaudit." },
  "allocation-invalid": { tone: "warning", text: "Periksa jurnal, anggota, nominal, dan catatan yang diisi." },
  "allocation-already-exists": { tone: "warning", text: "Jurnal tersebut sudah memiliki alokasi untuk anggota yang dipilih. Gunakan koreksi pada entri yang ada." },
  "allocation-exceeds": { tone: "warning", text: "Total alokasi tidak boleh melebihi nilai pendapatan pada jurnal kontribusi terposting." },
  "allocation-blocked": { tone: "warning", text: "Alokasi tidak dapat dibuat. Pastikan jurnal sudah terposting, bertipe kontribusi, dan keanggotaan berlaku pada tanggal jurnal." },
  "allocation-correction-blocked": { tone: "warning", text: "Koreksi tidak dapat diterapkan. Periksa status jurnal, keanggotaan, dan sisa nilai yang belum dialokasikan." },
};

export default async function IuranPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity("finance:read");
  const canAllocate = can(identity, "finance:journal:write");
  const params = searchParams ? await searchParams : {};
  const notice = params.result ? resultMessages[params.result] : undefined;

  let summary: SummaryRow | null = null;
  let journals: JournalOption[] = [];
  let memberships: MembershipOption[] = [];
  let allocations: AllocationRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [summaryResult, journalResult, membershipResult, allocationResult] = await Promise.all([
      sql`
        WITH contribution_journals AS (
          SELECT
            journal.id,
            sum(line.credit - line.debit)::numeric(18,2) AS net_amount
          FROM v9.finance_journals AS journal
          INNER JOIN v9.finance_journal_lines AS line
            ON line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
            AND account.account_type = 'pendapatan'
          WHERE journal.organization_id = ${identity.organizationId}
            AND journal.source_type = 'contribution'
            AND journal.status = 'posted'
          GROUP BY journal.id
          HAVING sum(line.credit - line.debit) > 0
        ),
        allocation_summary AS (
          SELECT
            COALESCE(sum(allocation.allocation_amount), 0)::numeric(18,2) AS allocation_total,
            count(*)::int AS allocation_count
          FROM v9.finance_contribution_allocations AS allocation
          WHERE allocation.organization_id = ${identity.organizationId}
        )
        SELECT
          COALESCE((SELECT sum(contribution.net_amount) FROM contribution_journals AS contribution), 0)::text AS contribution_total,
          (SELECT count(*)::int FROM contribution_journals) AS entry_count,
          allocation_summary.allocation_total::text AS allocation_total,
          allocation_summary.allocation_count,
          (
            SELECT count(*)::int
            FROM v9.memberships AS membership
            INNER JOIN v9.people AS person
              ON person.id = membership.person_id
              AND person.status = 'active'
            WHERE membership.organization_id = ${identity.organizationId}
              AND membership.status = 'active'
              AND (membership.valid_from IS NULL OR membership.valid_from <= current_date)
              AND (membership.valid_until IS NULL OR membership.valid_until >= current_date)
          ) AS active_members
        FROM allocation_summary
      `,
      sql`
        SELECT
          journal.id::text AS id,
          journal.reference_no,
          journal.journal_date::text AS journal_date,
          journal.description,
          revenue.contribution_amount::text AS contribution_amount,
          COALESCE(allocated.allocated_amount, 0)::text AS allocated_amount,
          (revenue.contribution_amount - COALESCE(allocated.allocated_amount, 0))::text AS available_amount
        FROM v9.finance_journals AS journal
        INNER JOIN LATERAL (
          SELECT sum(line.credit - line.debit)::numeric(18,2) AS contribution_amount
          FROM v9.finance_journal_lines AS line
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
            AND account.account_type = 'pendapatan'
          WHERE line.organization_id = journal.organization_id
            AND line.journal_id = journal.id
        ) AS revenue ON revenue.contribution_amount > 0
        LEFT JOIN LATERAL (
          SELECT sum(allocation.allocation_amount)::numeric(18,2) AS allocated_amount
          FROM v9.finance_contribution_allocations AS allocation
          WHERE allocation.organization_id = journal.organization_id
            AND allocation.journal_id = journal.id
        ) AS allocated ON true
        WHERE journal.organization_id = ${identity.organizationId}
          AND journal.source_type = 'contribution'
          AND journal.status = 'posted'
          AND revenue.contribution_amount > COALESCE(allocated.allocated_amount, 0)
        ORDER BY journal.journal_date DESC, journal.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT
          membership.id::text AS id,
          membership.member_number,
          person.full_name,
          membership.status,
          membership.valid_from::text AS valid_from,
          membership.valid_until::text AS valid_until
        FROM v9.memberships AS membership
        INNER JOIN v9.people AS person
          ON person.id = membership.person_id
          AND person.status = 'active'
        WHERE membership.organization_id = ${identity.organizationId}
          AND membership.status NOT IN ('pending','archived')
        ORDER BY
          CASE membership.status WHEN 'active' THEN 0 ELSE 1 END,
          person.full_name
        LIMIT 500
      `,
      sql`
        SELECT
          allocation.id::text AS id,
          allocation.journal_id::text AS journal_id,
          journal.reference_no,
          journal.journal_date::text AS journal_date,
          journal.description,
          allocation.membership_id::text AS membership_id,
          membership.member_number,
          person.full_name,
          allocation.allocation_amount::text AS allocation_amount,
          allocation.note,
          allocation.created_at::text AS created_at
        FROM v9.finance_contribution_allocations AS allocation
        INNER JOIN v9.finance_journals AS journal
          ON journal.id = allocation.journal_id
          AND journal.organization_id = allocation.organization_id
          AND journal.status = 'posted'
        INNER JOIN v9.memberships AS membership
          ON membership.id = allocation.membership_id
          AND membership.organization_id = allocation.organization_id
        INNER JOIN v9.people AS person
          ON person.id = membership.person_id
        WHERE allocation.organization_id = ${identity.organizationId}
        ORDER BY journal.journal_date DESC, allocation.created_at DESC
        LIMIT 200
      `,
    ]);

    summary = rowsFromResult<SummaryRow>(summaryResult)[0] ?? {
      contribution_total: "0",
      entry_count: 0,
      allocation_total: "0",
      allocation_count: 0,
      active_members: 0,
    };
    journals = rowsFromResult<JournalOption>(journalResult);
    memberships = rowsFromResult<MembershipOption>(membershipResult);
    allocations = rowsFromResult<AllocationRow>(allocationResult);
  } catch (reason) {
    unavailable = true;
    const errorType = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
    console.warn("[finance-contributions] Source unavailable", errorType);
  }

  const resultLabel = notice ? notice.text : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan · Sub-ledger Kontribusi"
        title="Iuran & kontribusi anggota"
        description="Telusuri kontribusi sukarela yang sudah terposting dan alokasikan nilainya ke riwayat keanggotaan tanpa membuat tagihan atau kewajiban."
        actions={<Badge tone={unavailable ? "warning" : "success"}>{unavailable ? "Sumber data tidak tersedia" : "Terhubung ke jurnal"}</Badge>}
      />

      {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan kontribusi">{resultLabel}</Notice></div> : null}
      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Sumber kontribusi belum dapat dimuat">
            Database keuangan sedang tidak tersedia. Nilai dan riwayat disembunyikan sampai koneksi pulih.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kontribusi terposting" value={unavailable ? "—" : formatIDR(Number(summary?.contribution_total ?? 0))} note={`${summary?.entry_count ?? 0} jurnal sumber kontribusi`} tone="success" />
        <StatCard label="Sudah dialokasikan" value={unavailable ? "—" : formatIDR(Number(summary?.allocation_total ?? 0))} note={`${summary?.allocation_count ?? 0} catatan per anggota`} tone="info" />
        <StatCard label="Belum dialokasikan" value={unavailable ? "—" : formatIDR(Number(summary?.contribution_total ?? 0) - Number(summary?.allocation_total ?? 0))} note="Masih berada di buku besar organisasi" tone="warning" />
        <StatCard label="Anggota aktif" value={unavailable ? "—" : summary?.active_members ?? 0} note="Keanggotaan berlaku hari ini" tone="neutral" />
      </div>

      {canAllocate ? (
        <Card className="mt-5">
          <CardHeader title="Alokasikan kontribusi ke anggota" subtitle="Pilih jurnal kontribusi yang sudah terposting. Nilai alokasi tidak boleh melebihi sisa nilai pendapatan pada jurnal." />
          {journals.length && memberships.length ? (
            <form action={createFinanceContributionAllocation} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="sm:col-span-2">
                <label htmlFor="contribution-journal" className="mb-1 block text-[11px] font-semibold text-ink2">Jurnal kontribusi terposting</label>
                <select id="contribution-journal" name="journal_id" required defaultValue="" className="sb-input">
                  <option value="" disabled>Pilih jurnal</option>
                  {journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.reference_no} · {formatDateID(journal.journal_date, "short")} · Sisa {formatIDR(Number(journal.available_amount))}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contribution-member" className="mb-1 block text-[11px] font-semibold text-ink2">Anggota penerima alokasi</label>
                <select id="contribution-member" name="membership_id" required defaultValue="" className="sb-input">
                  <option value="" disabled>Pilih anggota</option>
                  {memberships.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.member_number ? member.member_number + " · " : ""}{member.full_name} · {member.status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="contribution-amount" className="mb-1 block text-[11px] font-semibold text-ink2">Nilai alokasi (Rp)</label>
                <input id="contribution-amount" name="allocation_amount" type="number" min="0.01" step="0.01" required className="sb-input text-right tabular-nums" placeholder="0" />
              </div>
              <div className="sm:col-span-2 xl:col-span-3">
                <label htmlFor="contribution-note" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan / bukti pendukung (opsional)</label>
                <input id="contribution-note" name="note" maxLength={1000} className="sb-input" placeholder="Nomor kuitansi atau keterangan penerimaan" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={unavailable || !journals.length || !memberships.length} className="sb-btn sb-btn-primary w-full">Simpan alokasi</button>
              </div>
            </form>
          ) : (
            <div className="p-4">
              <EmptyState title={!memberships.length ? "Belum ada anggota yang dapat dipilih" : "Tidak ada jurnal kontribusi dengan saldo alokasi"} body={!memberships.length ? "Periksa keanggotaan yang berlaku pada tanggal jurnal sebelum mengalokasikan kontribusi." : "Jurnal harus berstatus terposting dan memiliki nilai pendapatan positif yang belum seluruhnya dialokasikan."} />
            </div>
          )}
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader title="Riwayat alokasi per anggota" subtitle={`${allocations.length} catatan terbaru · maksimal 200`} action={<Badge tone="neutral">Sumber: jurnal terposting</Badge>} />
        {allocations.length ? (
          <div className="divide-y divide-line">
            {allocations.map((allocation) => (
              <article key={allocation.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-muted2">{allocation.reference_no}</span>
                    <Badge tone="success">Terverifikasi dari jurnal</Badge>
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-ink">{allocation.full_name}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">
                    {allocation.member_number ? allocation.member_number + " · " : ""}{formatDateID(allocation.journal_date, "short")} · {allocation.description}
                  </div>
                  {allocation.note ? <div className="mt-1 text-[10.5px] text-muted">Catatan: {allocation.note}</div> : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
                  <div className="text-right">
                    <div className="text-[9.5px] text-muted">Nilai kontribusi</div>
                    <div className="text-[13px] font-semibold tabular-nums text-ink">{formatIDR(Number(allocation.allocation_amount))}</div>
                  </div>
                  {canAllocate ? (
                    <details className="min-w-[240px]">
                      <summary className="sb-btn sb-btn-outline !h-8 cursor-pointer !px-3 text-[10px]">Koreksi alokasi</summary>
                      <form action={updateFinanceContributionAllocation} className="mt-2 space-y-2 rounded-lg border border-line bg-paper p-3">
                        <input type="hidden" name="allocation_id" value={allocation.id} />
                        <label className="block text-[10px] font-semibold text-muted">Anggota</label>
                        <select name="membership_id" required defaultValue={allocation.membership_id} className="sb-input !h-9 text-[10.5px]">
                          {memberships.map((member) => <option key={member.id} value={member.id}>{member.member_number ? member.member_number + " · " : ""}{member.full_name}</option>)}
                        </select>
                        <label className="block text-[10px] font-semibold text-muted">Nilai (Rp)</label>
                        <input name="allocation_amount" type="number" min="0.01" step="0.01" required defaultValue={allocation.allocation_amount} className="sb-input !h-9 text-right tabular-nums" />
                        <label className="block text-[10px] font-semibold text-muted">Alasan koreksi (wajib)</label>
                        <input name="correction_note" required minLength={3} maxLength={1000} className="sb-input !h-9" placeholder="Jelaskan alasan koreksi" />
                        <button type="submit" className="sb-btn sb-btn-primary w-full">Simpan koreksi</button>
                      </form>
                    </details>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="Belum ada alokasi kontribusi" body="Setelah jurnal kontribusi terposting, pengelola Keuangan dapat mengalokasikan nilainya ke anggota berdasarkan bukti penerimaan." />
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Notice tone="warning" title="Iuran wajib belum ditetapkan">
          Sistem tidak membuat tagihan, tunggakan, tarif, atau tanggal jatuh tempo. Kebijakan iuran hanya dapat diaktifkan setelah diputuskan melalui musyawarah atau keputusan organisasi.
        </Notice>
        <Notice tone="info" title="Pemisahan buku besar dan sub-ledger">
          Alokasi hanya memberi identitas anggota pada bagian dari jurnal kontribusi yang sudah terposting. Alokasi tidak mengubah saldo buku besar, tidak menerima uang, dan tidak menggantikan bukti pembayaran.
        </Notice>
      </div>
    </div>
  );
}
