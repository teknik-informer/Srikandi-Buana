import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
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
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Piutang & Utang" };

interface BalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  group_label: string;
  normal_balance: "debit" | "credit";
  debit_total: string;
  credit_total: string;
  balance: string;
  journal_count: number;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function PiutangUtangPage() {
  const identity = await requireIdentity("finance:read");
  let accounts: BalanceRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        account.account_code,
        account.account_name,
        account.account_type,
        account.group_label,
        account.normal_balance,
        COALESCE(ledger.debit_total, 0)::text AS debit_total,
        COALESCE(ledger.credit_total, 0)::text AS credit_total,
        CASE
          WHEN account.normal_balance = 'credit'
            THEN COALESCE(ledger.credit_total - ledger.debit_total, 0)
          ELSE COALESCE(ledger.debit_total - ledger.credit_total, 0)
        END::text AS balance,
        COALESCE(ledger.journal_count, 0)::int AS journal_count
      FROM v9.finance_accounts AS account
      LEFT JOIN (
        SELECT
          line.account_id,
          line.organization_id,
          sum(line.debit)::numeric(18,2) AS debit_total,
          sum(line.credit)::numeric(18,2) AS credit_total,
          count(DISTINCT journal.id)::int AS journal_count
        FROM v9.finance_journal_lines AS line
        INNER JOIN v9.finance_journals AS journal
          ON journal.id = line.journal_id
          AND journal.organization_id = line.organization_id
          AND journal.status = 'posted'
        WHERE line.organization_id = ${identity.organizationId}
        GROUP BY line.account_id, line.organization_id
      ) AS ledger
        ON ledger.account_id = account.id
        AND ledger.organization_id = account.organization_id
      WHERE account.organization_id = ${identity.organizationId}
        AND account.status = 'active'
        AND account.is_postable = true
        AND (
          account.account_type = 'kewajiban'
          OR (
            account.account_type = 'aset'
            AND (
              account.group_label ILIKE '%piutang%'
              OR account.account_name ILIKE '%piutang%'
              OR account.group_label ILIKE '%tagihan%'
            )
          )
        )
        AND NOT (
          account.account_type = 'kewajiban'
          AND (
            account.group_label ILIKE '%pajak%'
            OR account.account_name ILIKE '%pajak%'
          )
        )
      ORDER BY
        CASE WHEN account.account_type = 'aset' THEN 0 ELSE 1 END,
        account.group_label,
        account.account_code
    `;
    accounts = rowsFromResult<BalanceRow>(result);
  } catch (reason) {
    unavailable = true;
    console.warn("[finance-receivables-payables] Source unavailable", safeErrorType(reason));
  }

  const receivableAccounts = accounts.filter((account) =>
    account.account_type === "aset" &&
    /piutang|tagihan/i.test(`${account.group_label} ${account.account_name}`),
  );
  const payableAccounts = accounts.filter((account) =>
    account.account_type === "kewajiban" &&
    !/pajak/i.test(`${account.group_label} ${account.account_name}`),
  );
  const receivableTotal = receivableAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.balance)), 0);
  const payableTotal = payableAccounts.reduce((sum, account) => sum + Math.max(0, Number(account.balance)), 0);
  const receivableJournals = receivableAccounts.reduce((sum, account) => sum + account.journal_count, 0);
  const payableJournals = payableAccounts.reduce((sum, account) => sum + account.journal_count, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan · Posisi pihak ketiga"
        title="Piutang & utang"
        description="Posisi akun piutang dan kewajiban berdasarkan saldo normal dari jurnal terposting. Bukan daftar invoice atau penagihan individual."
        actions={<Link href="/app/keuangan/neraca-saldo" className="sb-btn sb-btn-outline">Neraca saldo</Link>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Posisi piutang & utang belum dapat dimuat">
            Koneksi ke buku besar sedang tidak tersedia. Angka disembunyikan sampai koneksi pulih agar
            gangguan layanan tidak terbaca sebagai saldo nol.
          </Notice>
        </div>
      ) : null}

      {!unavailable && accounts.length === 0 ? (
        <div className="mb-4">
          <Notice tone="warning" title="Akun piutang dan kewajiban belum tersedia">
            Bagan akun organisasi belum memiliki akun aktif 1-1200, 2-1000, atau 2-1100. Tidak ada nilai
            piutang/utang yang dapat ditampilkan sampai pemetaan akun resmi tersedia.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Saldo piutang"
          value={unavailable || !receivableAccounts.length ? "—" : formatIDR(receivableTotal)}
          note={receivableAccounts.length ? receivableJournals + " jurnal terposting" : "Kategori akun Piutang belum tersedia"}
          tone="info"
          icon={<ArrowDownLeft size={17} />}
        />
        <StatCard
          label="Saldo kewajiban"
          value={unavailable || !payableAccounts.length ? "—" : formatIDR(payableTotal)}
          note={payableAccounts.length ? payableJournals + " jurnal terposting" : "Akun kewajiban belum tersedia"}
          tone="warning"
          icon={<ArrowUpRight size={17} />}
        />
        <StatCard
          label="Posisi bersih akun"
          value={unavailable || !accounts.length ? "—" : formatIDR(receivableTotal - payableTotal)}
          note="Piutang dikurangi kewajiban"
          tone="success"
          icon={<Scale size={17} />}
        />
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Akun piutang"
            subtitle="Saldo normal debit · jurnal berstatus posted"
            action={<Badge tone="info">Piutang</Badge>}
          />
          {receivableAccounts.length ? (
            <div className="sb-scroll">
              <table className="sb-table min-w-[560px]">
                <thead><tr><th>Kode akun</th><th>Nama akun</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Saldo normal</th></tr></thead>
                <tbody>
                  {receivableAccounts.map((account) => (
                    <tr key={account.account_code}>
                      <td className="font-mono text-[10.5px] text-muted">{account.account_code}</td>
                      <td className="text-ink2">{account.account_name}</td>
                      <td className="num tabular-nums text-muted">{formatIDR(Number(account.debit_total))}</td>
                      <td className="num tabular-nums text-muted">{formatIDR(Number(account.credit_total))}</td>
                      <td className="num font-semibold tabular-nums text-ink">{formatIDR(Number(account.balance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState title="Akun piutang belum tersedia" body="Aktifkan akun aset dengan kelompok atau nama bertanda Piutang/Tagihan pada Bagan Akun." />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Akun kewajiban"
            subtitle="Saldo normal kredit · jurnal berstatus posted"
            action={<Badge tone="warning">Kewajiban</Badge>}
          />
          {payableAccounts.length ? (
            <div className="sb-scroll">
              <table className="sb-table min-w-[560px]">
                <thead><tr><th>Kode akun</th><th>Nama akun</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Saldo normal</th></tr></thead>
                <tbody>
                  {payableAccounts.map((account) => (
                    <tr key={account.account_code}>
                      <td className="font-mono text-[10.5px] text-muted">{account.account_code}</td>
                      <td className="text-ink2">{account.account_name}</td>
                      <td className="num tabular-nums text-muted">{formatIDR(Number(account.debit_total))}</td>
                      <td className="num tabular-nums text-muted">{formatIDR(Number(account.credit_total))}</td>
                      <td className="num font-semibold tabular-nums text-ink">{formatIDR(Number(account.balance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState title="Akun kewajiban belum tersedia" body="Akun kewajiban yang disahkan dan aktif akan muncul di sini setelah tersedia pada bagan akun." />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Notice tone="info" title="Belum ada sub-ledger pihak ketiga">
          Skema saat ini belum mencatat invoice, identitas pemasok/pelanggan per tagihan, tanggal jatuh tempo,
          penerimaan cicilan, ataupun umur piutang dan utang. Karena itu halaman ini hanya menunjukkan posisi
          akun buku besar, bukan daftar tagihan yang dapat ditagih atau dibayar.
        </Notice>
        <Notice tone="warning" title="Batas akun pajak">
          Akun pajak tidak dimasukkan ke ringkasan ini. Kewajiban pajak hanya boleh ditampilkan setelah status
          perpajakan dan pemetaan akun ditetapkan secara resmi oleh organisasi.
        </Notice>
      </div>
    </div>
  );
}
