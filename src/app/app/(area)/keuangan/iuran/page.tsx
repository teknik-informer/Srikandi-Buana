import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, Users, Wallet } from "lucide-react";
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
import { requireIdentity } from "@/lib/session";
import { formatDateID, formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Iuran & Kontribusi" };

interface AccountRow {
  id: string;
  account_code: string;
  account_name: string;
  normal_balance: string;
  note: string | null;
  status: string;
}

interface SummaryRow {
  contribution_total: string;
  entry_count: number;
}

interface ContributionRow {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  source_type: string;
  source_reference: string | null;
  net_amount: string;
}

interface MemberCountRow {
  active_members: number;
}

const sourceLabels: Record<string, string> = {
  manual: "Jurnal umum",
  cash: "Kas",
  bank: "Bank",
  contribution: "Kontribusi",
  grant: "Hibah / program",
  purchase: "Pengadaan",
  sale: "Penjualan",
  adjustment: "Penyesuaian",
  reversal: "Jurnal pembalik",
};

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function IuranPage() {
  const identity = await requireIdentity("finance:read");
  let account: AccountRow | null = null;
  let summary: SummaryRow | null = null;
  let entries: ContributionRow[] = [];
  let activeMembers = 0;
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [accountResult, memberResult] = await Promise.all([
      sql`
        SELECT
          id::text AS id,
          account_code,
          account_name,
          normal_balance,
          note,
          status
        FROM v9.finance_accounts
        WHERE organization_id = ${identity.organizationId}
          AND account_code = '4-1200'
        LIMIT 1
      `,
      sql`
        SELECT count(*)::int AS active_members
        FROM v9.memberships AS membership
        INNER JOIN v9.people AS person
          ON person.id = membership.person_id
          AND person.status = 'active'
        WHERE membership.organization_id = ${identity.organizationId}
          AND membership.status = 'active'
          AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
          AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
      `,
    ]);

    account = rowsFromResult<AccountRow>(accountResult)[0] ?? null;
    activeMembers = rowsFromResult<MemberCountRow>(memberResult)[0]?.active_members ?? 0;

    if (account) {
      const [summaryResult, entryResult] = await Promise.all([
        sql`
          SELECT
            COALESCE(sum(line.credit - line.debit), 0)::text AS contribution_total,
            count(DISTINCT journal.id)::int AS entry_count
          FROM v9.finance_journals AS journal
          INNER JOIN v9.finance_journal_lines AS line
            ON line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
          WHERE journal.organization_id = ${identity.organizationId}
            AND account.id = ${account.id}
            AND journal.status = 'posted'
        `,
        sql`
          SELECT
            journal.id::text AS id,
            journal.reference_no,
            journal.journal_date::text AS journal_date,
            journal.description,
            journal.source_type,
            journal.source_reference,
            sum(line.credit - line.debit)::text AS net_amount
          FROM v9.finance_journals AS journal
          INNER JOIN v9.finance_journal_lines AS line
            ON line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
          WHERE journal.organization_id = ${identity.organizationId}
            AND account.id = ${account.id}
            AND journal.status = 'posted'
          GROUP BY journal.id, journal.reference_no, journal.journal_date,
            journal.description, journal.source_type, journal.source_reference
          HAVING sum(line.credit - line.debit) <> 0
          ORDER BY journal.journal_date DESC, journal.created_at DESC
          LIMIT 100
        `,
      ]);

      summary = rowsFromResult<SummaryRow>(summaryResult)[0] ?? null;
      entries = rowsFromResult<ContributionRow>(entryResult);
    }
  } catch (reason) {
    unavailable = true;
    console.warn("[finance-contributions] Source unavailable", safeErrorType(reason));
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan · Pendapatan Organisasi"
        title="Iuran & kontribusi anggota"
        description="Laporan kontribusi pada buku besar organisasi. Halaman ini tidak membuat tagihan atau menetapkan kewajiban iuran."
        actions={<Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline">Buka jurnal <ArrowRight size={13} /></Link>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Sumber kontribusi belum dapat dimuat">
            Database keuangan sedang tidak tersedia. Nilai kontribusi dan jumlah anggota disembunyikan
            sampai koneksi pulih agar gangguan tidak dianggap sebagai catatan bernilai nol.
          </Notice>
        </div>
      ) : null}

      {!unavailable && !account ? (
        <div className="mb-4">
          <Notice tone="warning" title="Akun kontribusi belum tersedia">
            Akun buku besar dengan kode 4-1200 belum ditemukan pada bagan akun organisasi. Minta pengelola
            keuangan memeriksa pemetaan akun sebelum mencatat kontribusi pada akun ini.
          </Notice>
        </div>
      ) : null}

      {account && summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Kontribusi terposting"
              value={formatIDR(Number(summary.contribution_total))}
              note={`${summary.entry_count} jurnal terposting · akun ${account.account_code}`}
              tone="success"
              icon={<Wallet size={17} />}
            />
            <StatCard
              label="Besaran iuran"
              value="Belum ditetapkan"
              note="Tidak ada tarif atau jatuh tempo yang diasumsikan"
              tone="warning"
              icon={<Info size={17} />}
            />
            <StatCard
              label="Anggota aktif"
              value={activeMembers}
              note="Keanggotaan berlaku pada hari ini"
              tone="info"
              href="/app/sekretariat/anggota"
              icon={<Users size={17} />}
            />
          </div>

          <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader
                title="Entri kontribusi"
                subtitle={`Jurnal terposting yang menyentuh akun ${account.account_code}`}
                action={<Badge tone="neutral">Baca dari buku besar</Badge>}
              />
              {entries.length ? (
                <div className="sb-scroll">
                  <table className="sb-table min-w-[720px]">
                    <thead>
                      <tr><th>Tanggal</th><th>Nomor jurnal</th><th>Keterangan</th><th>Sumber</th><th className="num">Nilai bersih</th></tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="whitespace-nowrap text-muted">{formatDateID(entry.journal_date, "short")}</td>
                          <td className="font-mono text-[10.5px] text-muted">{entry.reference_no}</td>
                          <td className="max-w-[260px] text-ink2">
                            {entry.description}
                            {entry.source_reference ? <span className="mt-0.5 block text-[9.5px] text-muted2">Ref. {entry.source_reference}</span> : null}
                          </td>
                          <td className="text-[10.5px] text-muted">{sourceLabels[entry.source_type] ?? entry.source_type}</td>
                          <td className="num whitespace-nowrap font-semibold tabular-nums text-ink">{formatIDR(Number(entry.net_amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    title="Belum ada kontribusi terposting"
                    body="Belum ditemukan jurnal terposting yang menyentuh akun Kontribusi Anggota. Draf dan jurnal yang menunggu persetujuan tidak dihitung sebagai penerimaan."
                  />
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <h2 className="font-display text-[13.5px] font-bold text-ink">Kebijakan iuran</h2>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                  Besaran iuran, periode penagihan, dan konsekuensi keterlambatan belum ditetapkan.
                  Karena itu sistem tidak membentuk tagihan, tunggakan, atau kewajiban anggota secara otomatis.
                </p>
                <ul className="mt-3 space-y-2 text-[11.5px] text-ink2">
                  <li>Besaran iuran pokok dan iuran wajib</li>
                  <li>Periode kontribusi dan tanggal jatuh tempo</li>
                  <li>Ketentuan sukarela serta pembebasan</li>
                  <li>Pencatatan penerimaan dan bukti kontribusi</li>
                </ul>
                <div className="mt-3 border-t border-line pt-2 text-[10.5px] text-muted2">
                  Penetapan harus berasal dari musyawarah atau keputusan resmi organisasi.
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="font-display text-[13.5px] font-bold text-ink">Akun buku besar</h2>
                <dl className="mt-2 space-y-2 text-[11.5px]">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted">Kode</dt>
                    <dd className="font-mono text-ink2">{account.account_code}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted">Nama akun</dt>
                    <dd className="text-right font-medium text-ink2">{account.account_name}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted">Saldo normal</dt>
                    <dd className="text-ink2">{account.normal_balance === "credit" ? "Kredit" : account.normal_balance}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted">Status</dt>
                    <dd><Badge tone={account.status === "active" ? "success" : "warning"}>{account.status}</Badge></dd>
                  </div>
                </dl>
                {account.note ? <p className="mt-2 border-t border-line pt-2 text-[10.5px] leading-relaxed text-muted2">{account.note}</p> : null}
              </Card>
            </div>
          </div>

          <div className="mt-4">
            <Notice tone="info" title="Batas data yang tersedia">
              Angka di atas adalah kontribusi organisasi per akun buku besar, bukan rincian pembayaran per anggota.
              Skema buku besar saat ini belum menyediakan sub-ledger yang menghubungkan setiap jurnal dengan
              kewajiban atau riwayat kontribusi individu.
            </Notice>
          </div>
        </>
      ) : null}
    </div>
  );
}
