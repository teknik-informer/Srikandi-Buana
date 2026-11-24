import type { Metadata } from "next";
import { Landmark, Wallet } from "lucide-react";
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

export const metadata: Metadata = { title: "Kas & Bank" };

interface CashBankRow {
  account_code: string;
  account_name: string;
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

export default async function KasBankPage() {
  const identity = await requireIdentity("finance:read");
  let accounts: CashBankRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        account.account_code,
        account.account_name,
        COALESCE(ledger.debit_total, 0)::text AS debit_total,
        COALESCE(ledger.credit_total, 0)::text AS credit_total,
        COALESCE(ledger.balance, 0)::text AS balance,
        COALESCE(ledger.journal_count, 0)::int AS journal_count
      FROM v9.finance_accounts AS account
      LEFT JOIN (
        SELECT
          line.account_id,
          line.organization_id,
          sum(line.debit)::numeric(18,2) AS debit_total,
          sum(line.credit)::numeric(18,2) AS credit_total,
          sum(line.debit - line.credit)::numeric(18,2) AS balance,
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
        AND account.account_code IN ('1-1000', '1-1100')
        AND account.status = 'active'
      ORDER BY account.account_code
    `;
    accounts = rowsFromResult<CashBankRow>(result);
  } catch (reason) {
    unavailable = true;
    console.warn("[finance-cash-bank] Source unavailable", safeErrorType(reason));
  }

  const cash = accounts.find((account) => account.account_code === "1-1000");
  const bank = accounts.find((account) => account.account_code === "1-1100");
  const total = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const movementCount = accounts.reduce((sum, account) => sum + account.journal_count, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Kas & bank"
        description="Saldo akun kas dan bank dari jurnal yang sudah terposting. Halaman ini tidak menambah saldo pembukaan atau mutasi yang belum tercatat pada buku besar."
        actions={<Badge tone="success">Buku besar terposting</Badge>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Saldo kas & bank belum dapat dimuat">
            Koneksi ke buku besar sedang tidak tersedia. Nilai saldo disembunyikan sampai koneksi pulih,
            agar gangguan layanan tidak terbaca sebagai saldo nol.
          </Notice>
        </div>
      ) : null}

      {!unavailable && accounts.length === 0 ? (
        <div className="mb-4">
          <Notice tone="warning" title="Akun kas dan bank belum tersedia">
            Akun 1-1000 (Kas) dan 1-1100 (Bank) belum ditemukan atau belum aktif pada bagan akun organisasi.
            Tidak ada saldo yang dapat dihitung sampai akun yang sah tersedia.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Saldo kas & bank"
          value={unavailable || accounts.length === 0 ? "—" : formatIDR(total)}
          note={`${movementCount} jurnal terposting pada akun kas/bank`}
          tone="success"
          icon={<Wallet size={17} />}
        />
        <StatCard
          label="Kas tunai"
          value={unavailable || !cash ? "—" : formatIDR(Number(cash.balance))}
          note={cash ? cash.account_name : "Akun 1-1000 belum tersedia"}
          tone="info"
          icon={<Wallet size={17} />}
        />
        <StatCard
          label="Bank"
          value={unavailable || !bank ? "—" : formatIDR(Number(bank.balance))}
          note={bank ? bank.account_name : "Akun 1-1100 belum tersedia"}
          tone="info"
          icon={<Landmark size={17} />}
        />
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Posisi per akun"
          subtitle="Debit, kredit, dan saldo bersih dari jurnal berstatus posted"
          action={<Badge tone="neutral">Baca-saja</Badge>}
        />
        {accounts.length ? (
          <div className="sb-scroll">
            <table className="sb-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Kode akun</th>
                  <th>Nama akun</th>
                  <th className="num">Total debit</th>
                  <th className="num">Total kredit</th>
                  <th className="num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.account_code}>
                    <td className="font-mono text-[11px] text-muted">{account.account_code}</td>
                    <td className="font-medium text-ink2">{account.account_name}</td>
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
            <EmptyState
              title={unavailable ? "Data belum tersedia" : "Belum ada akun kas/bank"}
              body={unavailable
                ? "Daftar akun tidak dapat dimuat. Coba lagi setelah koneksi pulih."
                : "Ketika akun kas dan bank diaktifkan serta jurnal terposting tersedia, posisi akun akan muncul di sini."}
            />
          </div>
        )}
        <div className="border-t border-line px-4 py-3 text-[10.5px] text-muted2">
          Saldo dihitung sebagai debit dikurangi kredit untuk akun kas/bank. Jurnal draf, menunggu persetujuan,
          ditolak, dan dibatalkan tidak masuk dalam angka ini.
        </div>
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Notice tone="info" title="Mutasi bank dan rekonsiliasi">
          Saat ini belum tersedia tabel mutasi rekening atau pasangan rekening koran. Karena itu halaman ini
          hanya menampilkan buku besar dan tidak menandai transaksi sebagai cocok/tidak cocok, tidak mengklaim
          rekening telah direkonsiliasi, serta tidak menyimpan rekening bank tertentu.
        </Notice>
        <Notice tone="warning" title="Saldo pembukaan">
          Saldo pembukaan hanya akan dihitung apabila dicatat sebagai jurnal pembukaan yang sah dan terposting.
          Tidak ada angka saldo awal yang diambil dari data contoh atau disisipkan ke dalam perhitungan.
        </Notice>
      </div>
    </div>
  );
}
