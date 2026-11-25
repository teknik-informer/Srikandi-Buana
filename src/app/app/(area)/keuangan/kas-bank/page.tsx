import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Landmark, Wallet } from "lucide-react";
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
import { formatIDR } from "@/lib/format";
import {
  createFinanceCashAccount,
  updateFinanceCashAccountStatus,
} from "@/app/actions/finance";

export const metadata: Metadata = { title: "Kas & Bank" };

interface CashBankRow {
  id: string;
  ledger_account_id: string;
  account_code: string;
  account_name: string;
  account_kind: "cash" | "bank" | "e_wallet";
  display_name: string;
  institution_name: string | null;
  account_holder_label: string | null;
  account_number_last4: string | null;
  currency_code: string;
  status: "draft" | "active" | "inactive";
  debit_total: string;
  credit_total: string;
  balance: string;
  journal_count: number;
}

interface LedgerAccountOption {
  id: string;
  account_code: string;
  account_name: string;
}

const kindLabel: Record<CashBankRow["account_kind"], string> = {
  cash: "Kas tunai",
  bank: "Rekening bank",
  e_wallet: "Dompet digital",
};

const statusLabel: Record<CashBankRow["status"], string> = {
  draft: "Menunggu aktivasi",
  active: "Aktif",
  inactive: "Nonaktif",
};

const statusTone: Record<CashBankRow["status"], "neutral" | "success" | "warning"> = {
  draft: "warning",
  active: "success",
  inactive: "neutral",
};

const resultMessages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "mapping-created": { tone: "success", text: "Pemetaan akun kas/bank berhasil dibuat sebagai draf." },
  "mapping-already-exists": { tone: "warning", text: "Akun buku besar tersebut sudah dipetakan ke register kas/bank." },
  "mapping-invalid": { tone: "warning", text: "Periksa kembali jenis rekening, akun buku besar, nama, dan empat digit terakhir." },
  "ledger-account-unavailable": { tone: "warning", text: "Akun buku besar tidak aktif, tidak sesuai jenis aset, atau tidak tersedia untuk organisasi ini." },
  "mapping-error": { tone: "danger", text: "Pemetaan rekening belum dapat disimpan. Periksa koneksi dan log aplikasi." },
  "mapping-status-updated": { tone: "success", text: "Status register kas/bank berhasil diperbarui." },
  "mapping-status-blocked": { tone: "warning", text: "Status tidak dapat diubah. Pastikan akun buku besar masih aktif dan Anda memiliki kewenangan persetujuan." },
};

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function KasBankPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity("finance:read");
  const canManage = can(identity, "finance:accounts:write");
  const canApprove = can(identity, "finance:accounts:approve");
  const params = searchParams ? await searchParams : {};
  const notice = params.result ? resultMessages[params.result] : undefined;

  let accounts: CashBankRow[] = [];
  let ledgerAccounts: LedgerAccountOption[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [registerResult, ledgerAccountResult] = await Promise.all([
      sql`
        WITH ledger AS (
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
        )
        SELECT
          cash_account.id::text AS id,
          cash_account.ledger_account_id::text AS ledger_account_id,
          account.account_code,
          account.account_name,
          cash_account.account_kind,
          cash_account.display_name,
          cash_account.institution_name,
          cash_account.account_holder_label,
          cash_account.account_number_last4::text AS account_number_last4,
          cash_account.currency_code,
          cash_account.status,
          COALESCE(ledger.debit_total, 0)::text AS debit_total,
          COALESCE(ledger.credit_total, 0)::text AS credit_total,
          COALESCE(ledger.balance, 0)::text AS balance,
          COALESCE(ledger.journal_count, 0)::int AS journal_count
        FROM v9.finance_cash_accounts AS cash_account
        INNER JOIN v9.finance_accounts AS account
          ON account.id = cash_account.ledger_account_id
          AND account.organization_id = cash_account.organization_id
        LEFT JOIN ledger
          ON ledger.account_id = account.id
          AND ledger.organization_id = account.organization_id
        WHERE cash_account.organization_id = ${identity.organizationId}
        ORDER BY
          CASE cash_account.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
          cash_account.account_kind,
          account.account_code
      `,
      sql`
        SELECT
          account.id::text AS id,
          account.account_code,
          account.account_name
        FROM v9.finance_accounts AS account
        WHERE account.organization_id = ${identity.organizationId}
          AND account.account_type = 'aset'
          AND account.normal_balance = 'debit'
          AND account.status = 'active'
          AND account.is_postable = true
          AND NOT EXISTS (
            SELECT 1
            FROM v9.finance_cash_accounts AS cash_account
            WHERE cash_account.organization_id = account.organization_id
              AND cash_account.ledger_account_id = account.id
          )
        ORDER BY account.account_code
        LIMIT 200
      `,
    ]);
    accounts = rowsFromResult<CashBankRow>(registerResult);
    ledgerAccounts = rowsFromResult<LedgerAccountOption>(ledgerAccountResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[finance-cash-bank] Source unavailable", safeErrorType(reason));
  }

  const activeAccounts = accounts.filter((account) => account.status === "active");
  const activeCash = activeAccounts.filter((account) => account.account_kind === "cash");
  const activeBank = activeAccounts.filter((account) => account.account_kind === "bank");
  const activeWallet = activeAccounts.filter((account) => account.account_kind === "e_wallet");
  const total = activeAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const movementCount = activeAccounts.reduce((sum, account) => sum + account.journal_count, 0);
  const cashTotal = activeCash.reduce((sum, account) => sum + Number(account.balance), 0);
  const bankTotal = activeBank.reduce((sum, account) => sum + Number(account.balance), 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Kas & bank"
        description="Kelola pemetaan rekening kas, bank, dan dompet digital ke akun buku besar. Saldo hanya dihitung dari jurnal yang sudah terposting."
        actions={<Badge tone="success">Terhubung ke buku besar</Badge>}
      />

      {notice ? (
        <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan register">{notice.text}</Notice></div>
      ) : null}

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Register kas & bank belum dapat dimuat">
            Koneksi ke basis data keuangan sedang tidak tersedia. Saldo dan daftar rekening disembunyikan sampai koneksi pulih.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo rekening aktif"
          value={unavailable || activeAccounts.length === 0 ? "—" : formatIDR(total)}
          note={unavailable ? "Sumber data tidak tersedia" : `${activeAccounts.length} rekening aktif · ${movementCount} jurnal terposting`}
          tone="success"
          icon={<Wallet size={17} />}
        />
        <StatCard
          label="Kas tunai"
          value={unavailable || activeCash.length === 0 ? "—" : formatIDR(cashTotal)}
          note={`${activeCash.length} register aktif`}
          tone="info"
          icon={<Wallet size={17} />}
        />
        <StatCard
          label="Bank"
          value={unavailable || activeBank.length === 0 ? "—" : formatIDR(bankTotal)}
          note={`${activeBank.length} register aktif`}
          tone="info"
          icon={<Landmark size={17} />}
        />
        <StatCard
          label="Dompet digital"
          value={unavailable || activeWallet.length === 0 ? "—" : formatIDR(activeWallet.reduce((sum, account) => sum + Number(account.balance), 0))}
          note={`${activeWallet.length} register aktif`}
          tone="neutral"
          icon={<Wallet size={17} />}
        />
      </div>

      {canManage ? (
        <Card className="mt-5">
          <CardHeader title="Daftarkan rekening kas/bank" subtitle="Pemetaan baru disimpan sebagai draf. Aktivasi membutuhkan kewenangan persetujuan." />
          <form action={createFinanceCashAccount} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label htmlFor="cash-ledger-account" className="mb-1 block text-[11px] font-semibold text-ink2">Akun buku besar</label>
              <select id="cash-ledger-account" name="ledger_account_id" required disabled={unavailable || !ledgerAccounts.length} className="sb-input">
                <option value="">Pilih akun aset aktif</option>
                {ledgerAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.account_code} · {account.account_name}</option>
                ))}
              </select>
              {!ledgerAccounts.length ? <p className="mt-1 text-[10px] text-muted2">Tidak ada akun aset aktif yang belum dipetakan. Periksa Bagan Akun terlebih dahulu.</p> : null}
            </div>
            <div>
              <label htmlFor="cash-account-kind" className="mb-1 block text-[11px] font-semibold text-ink2">Jenis register</label>
              <select id="cash-account-kind" name="account_kind" required className="sb-input">
                <option value="cash">Kas tunai</option>
                <option value="bank">Rekening bank</option>
                <option value="e_wallet">Dompet digital</option>
              </select>
            </div>
            <div>
              <label htmlFor="cash-display-name" className="mb-1 block text-[11px] font-semibold text-ink2">Nama register</label>
              <input id="cash-display-name" name="display_name" required minLength={2} maxLength={160} className="sb-input" placeholder="Mis. Kas Operasional" />
            </div>
            <div>
              <label htmlFor="cash-institution" className="mb-1 block text-[11px] font-semibold text-ink2">Bank / penyedia</label>
              <input id="cash-institution" name="institution_name" maxLength={160} className="sb-input" placeholder="Wajib untuk bank atau dompet digital" />
            </div>
            <div>
              <label htmlFor="cash-holder" className="mb-1 block text-[11px] font-semibold text-ink2">Nama pemegang rekening</label>
              <input id="cash-holder" name="account_holder_label" maxLength={160} className="sb-input" placeholder="Nama organisasi / pemegang" />
            </div>
            <div>
              <label htmlFor="cash-last4" className="mb-1 block text-[11px] font-semibold text-ink2">Empat digit terakhir</label>
              <input id="cash-last4" name="account_number_last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} className="sb-input" placeholder="Opsional · 4 digit" />
            </div>
            <div className="sm:col-span-2 xl:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="max-w-2xl text-[10.5px] leading-relaxed text-muted">
                Hanya empat digit terakhir yang disimpan. Jangan masukkan PIN, kata sandi, nomor rekening lengkap, atau kredensial perbankan. Mata uang pencatatan organisasi: IDR.
              </p>
              <button type="submit" disabled={unavailable || !ledgerAccounts.length} className="sb-btn sb-btn-primary">Simpan sebagai draf</button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title="Register kas & bank"
          subtitle={`${accounts.length} rekening terdaftar · saldo berdasarkan jurnal terposting`}
          action={<Badge tone="neutral">IDR</Badge>}
        />
        {accounts.length ? (
          <div className="sb-scroll">
            <table className="sb-table min-w-[920px]">
              <thead>
                <tr>
                  <th>Rekening</th>
                  <th>Akun buku besar</th>
                  <th>Status</th>
                  <th className="num">Debit</th>
                  <th className="num">Kredit</th>
                  <th className="num">Saldo</th>
                  <th className="text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="font-semibold text-ink2">{account.display_name}</div>
                      <div className="mt-0.5 text-[10px] text-muted">
                        {kindLabel[account.account_kind]}
                        {account.institution_name ? ` · ${account.institution_name}` : ""}
                        {account.account_number_last4 ? ` · •••• ${account.account_number_last4}` : ""}
                      </div>
                      {account.account_holder_label ? <div className="mt-0.5 text-[10px] text-muted2">{account.account_holder_label}</div> : null}
                    </td>
                    <td>
                      <div className="font-mono text-[10.5px] text-muted">{account.account_code}</div>
                      <div className="text-[11px] text-ink2">{account.account_name}</div>
                    </td>
                    <td><Badge tone={statusTone[account.status]}>{statusLabel[account.status]}</Badge></td>
                    <td className="num whitespace-nowrap tabular-nums text-muted">{formatIDR(Number(account.debit_total))}</td>
                    <td className="num whitespace-nowrap tabular-nums text-muted">{formatIDR(Number(account.credit_total))}</td>
                    <td className="num whitespace-nowrap font-semibold tabular-nums text-ink">{account.status === "active" ? formatIDR(Number(account.balance)) : "—"}</td>
                    <td>
                      {canApprove && account.status !== "active" ? (
                        <form action={updateFinanceCashAccountStatus} className="flex justify-end">
                          <input type="hidden" name="cash_account_id" value={account.id} />
                          <input type="hidden" name="status" value="active" />
                          <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-2.5 text-[10px]">Aktifkan</button>
                        </form>
                      ) : canApprove && account.status === "active" ? (
                        <form action={updateFinanceCashAccountStatus} className="flex justify-end">
                          <input type="hidden" name="cash_account_id" value={account.id} />
                          <input type="hidden" name="status" value="inactive" />
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[10px]">Nonaktifkan</button>
                        </form>
                      ) : <span className="block text-right text-[10px] text-muted2">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title={unavailable ? "Data register belum tersedia" : "Belum ada rekening yang didaftarkan"}
              body={unavailable
                ? "Daftar rekening tidak dapat dimuat. Coba kembali setelah sumber data pulih."
                : "Daftarkan akun kas, rekening bank, atau dompet digital setelah akun aset terkait aktif pada Bagan Akun."}
            />
          </div>
        )}
        <div className="border-t border-line px-4 py-3 text-[10.5px] text-muted2">
          Saldo adalah debit dikurangi kredit pada akun buku besar terkait. Register nonaktif dan jurnal yang belum terposting tidak masuk ke ringkasan saldo aktif.
        </div>
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Notice tone="info" title="Rekonsiliasi bank belum tersedia">
          Register ini menghubungkan rekening dengan akun buku besar, tetapi belum mencocokkan mutasi rekening koran. Jangan menganggap saldo telah direkonsiliasi.
        </Notice>
        <Notice tone="warning" title="Saldo pembukaan">
          Saldo awal harus dicatat sebagai jurnal pembukaan yang disahkan dan terposting. Register ini tidak membuat saldo awal otomatis.
        </Notice>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline">Buka jurnal <ArrowRight size={13} /></Link>
        <Link href="/app/keuangan/bagan-akun" className="sb-btn sb-btn-outline">Bagan akun <ArrowRight size={13} /></Link>
      </div>
    </div>
  );
}
