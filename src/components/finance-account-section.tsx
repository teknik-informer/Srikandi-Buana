import { BookOpen, CircleCheck, FilePlus2 } from "lucide-react";
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
type AccountType = "aset" | "kewajiban" | "ekuitas" | "pendapatan" | "beban";
type AccountNormalBalance = "debit" | "credit";
import {
  createFinanceAccount,
  loadFinanceAccountTemplate,
  updateDraftFinanceAccount,
  updateFinanceAccountStatus,
} from "@/app/actions/finance";

interface FinanceAccountRow {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: AccountNormalBalance;
  group_label: string;
  status: "draft" | "active" | "archived";
  is_postable: boolean;
  note: string | null;
  journal_line_count: number;
  has_cash_register: boolean;
}

const typeLabel: Record<AccountType, string> = {
  aset: "Aset",
  kewajiban: "Kewajiban",
  ekuitas: "Ekuitas",
  pendapatan: "Pendapatan",
  beban: "Beban",
};

const statusLabel: Record<FinanceAccountRow["status"], string> = {
  draft: "Draf usulan",
  active: "Aktif",
  archived: "Arsip",
};

const statusTone: Record<FinanceAccountRow["status"], "warning" | "success" | "neutral"> = {
  draft: "warning",
  active: "success",
  archived: "neutral",
};

const resultMessages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "template-loaded": { tone: "success", text: "Rancangan COA awal berhasil dimuat sebagai akun draf. Belum ada akun yang diaktifkan." },
  "accounts-already-exist": { tone: "warning", text: "Organisasi sudah memiliki akun. Template awal tidak ditambahkan agar tidak menduplikasi bagan akun." },
  "account-created": { tone: "success", text: "Akun baru disimpan sebagai draf untuk ditinjau." },
  "account-updated": { tone: "success", text: "Akun draf berhasil diperbarui." },
  "account-status-updated": { tone: "success", text: "Status akun berhasil diperbarui." },
  "account-not-draft": { tone: "warning", text: "Akun tidak lagi berstatus draf sehingga tidak dapat diedit dengan formulir ini." },
  "duplicate-account-code": { tone: "warning", text: "Kode akun sudah digunakan dalam organisasi." },
  "account-status-blocked": { tone: "warning", text: "Status akun tidak dapat diubah. Akun yang sudah memiliki jurnal terposting tidak dapat diarsipkan." },
  invalid: { tone: "warning", text: "Periksa kembali kode, nama, tipe, saldo normal, dan kelompok akun." },
  error: { tone: "danger", text: "Perubahan akun gagal disimpan. Periksa koneksi atau log aplikasi." },
};

export async function FinanceAccountSection({ result }: { result?: string }) {
  const identity = await requireIdentity("finance:read");
  const canWrite = can(identity, "finance:accounts:write");
  const canApprove = can(identity, "finance:accounts:approve");
  const sql = getV9Sql();

  const [summaryResult, accountResult] = await Promise.all([
    sql`
      SELECT
        count(*)::int AS account_count,
        count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
        count(*) FILTER (WHERE status = 'active')::int AS active_count,
        count(*) FILTER (WHERE status = 'archived')::int AS archived_count
      FROM v9.finance_accounts
      WHERE organization_id = ${identity.organizationId}
    `,
    sql`
      SELECT
        account.id::text AS id,
        account.account_code,
        account.account_name,
        account.account_type,
        account.normal_balance,
        account.group_label,
        account.status,
        account.is_postable,
        account.note,
        (SELECT count(*)::int
          FROM v9.finance_journal_lines line
          WHERE line.account_id = account.id
            AND line.organization_id = account.organization_id
        ) AS journal_line_count,
        EXISTS (
          SELECT 1
          FROM v9.finance_cash_accounts cash_account
          WHERE cash_account.organization_id = account.organization_id
            AND cash_account.ledger_account_id = account.id
        ) AS has_cash_register
      FROM v9.finance_accounts AS account
      WHERE account.organization_id = ${identity.organizationId}
      ORDER BY account.account_code
      LIMIT 500
    `,
  ]);

  const summary = rowsFromResult<{
    account_count: number;
    draft_count: number;
    active_count: number;
    archived_count: number;
  }>(summaryResult)[0] ?? { account_count: 0, draft_count: 0, active_count: 0, archived_count: 0 };
  const accounts = rowsFromResult<FinanceAccountRow>(accountResult);
  const notice = result ? resultMessages[result] : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Bagan akun"
        description="Daftar akun organisasi untuk pencatatan berpasangan. Rancangan awal harus ditinjau dan diaktifkan sebelum digunakan dalam jurnal."
      />

      {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan bagan akun">{notice.text}</Notice></div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Akun terdaftar" value={summary.account_count} note="Seluruh akun organisasi" tone="info" />
        <StatCard label="Draf usulan" value={summary.draft_count} note="Belum dapat dipakai jurnal" tone="warning" />
        <StatCard label="Akun aktif" value={summary.active_count} note="Dapat dipilih dalam jurnal" tone="success" />
        <StatCard label="Arsip" value={summary.archived_count} note="Tidak tersedia untuk pencatatan" tone="neutral" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Card>
          <CardHeader
            title="Daftar akun organisasi"
            subtitle={`${accounts.length} akun · sumber saldo adalah jurnal berstatus terposting`}
            action={<Badge tone="neutral">COA</Badge>}
          />
          {accounts.length ? (
            <div className="divide-y divide-line">
              {accounts.map((account) => (
                <article key={account.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10.5px] font-semibold text-ink2">{account.account_code}</span>
                        <Badge tone={statusTone[account.status]}>{statusLabel[account.status]}</Badge>
                        <Badge tone="neutral">{typeLabel[account.account_type]}</Badge>
                      </div>
                      <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{account.account_name}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                        <span>{account.group_label}</span>
                        <span>Saldo normal: {account.normal_balance === "debit" ? "Debit" : "Kredit"}</span>
                        <span>{account.is_postable ? "Akun pencatatan" : "Akun kelompok"}</span>
                        <span>{account.journal_line_count} baris jurnal terkait</span>
                      </div>
                      {account.note ? <p className="mt-1 text-[10.5px] text-muted2">{account.note}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canWrite && account.status === "draft" ? (
                        <details className="relative">
                          <summary className="sb-btn sb-btn-outline !h-8 cursor-pointer !px-3 text-[10px]">Edit draf</summary>
                          <div className="absolute right-0 z-20 mt-2 w-[min(88vw,340px)] rounded-xl border border-line bg-white p-3 shadow-lg">
                            <form action={updateDraftFinanceAccount} className="grid gap-2.5">
                              <input type="hidden" name="account_id" value={account.id} />
                              <label className="grid gap-1 text-[10.5px] font-semibold text-ink2">
                                Nama akun
                                <input name="account_name" required maxLength={180} defaultValue={account.account_name} className="sb-input" />
                              </label>
                              <label className="grid gap-1 text-[10.5px] font-semibold text-ink2">
                                Tipe akun
                                <select name="account_type" defaultValue={account.account_type} className="sb-input">
                                  <option value="aset">Aset</option><option value="kewajiban">Kewajiban</option><option value="ekuitas">Ekuitas</option><option value="pendapatan">Pendapatan</option><option value="beban">Beban</option>
                                </select>
                              </label>
                              <label className="grid gap-1 text-[10.5px] font-semibold text-ink2">
                                Saldo normal
                                <select name="normal_balance" defaultValue={account.normal_balance} className="sb-input"><option value="debit">Debit</option><option value="credit">Kredit</option></select>
                              </label>
                              <label className="grid gap-1 text-[10.5px] font-semibold text-ink2">
                                Kelompok
                                <input name="group_label" required maxLength={120} defaultValue={account.group_label} className="sb-input" />
                              </label>
                              <label className="grid gap-1 text-[10.5px] font-semibold text-ink2">
                                Catatan
                                <textarea name="note" rows={2} maxLength={2000} defaultValue={account.note ?? ""} className="sb-input !h-auto resize-y py-2" />
                              </label>
                              <button type="submit" className="sb-btn sb-btn-primary !h-9 text-[10.5px]">Simpan perubahan</button>
                            </form>
                          </div>
                        </details>
                      ) : null}
                      {canApprove && account.status === "draft" ? (
                        <form action={updateFinanceAccountStatus}>
                          <input type="hidden" name="account_id" value={account.id} />
                          <input type="hidden" name="status" value="active" />
                          <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10px]"><CircleCheck size={12} /> Aktifkan</button>
                        </form>
                      ) : null}
                      {canApprove && account.status === "active" && account.journal_line_count === 0 && !account.has_cash_register ? (
                        <form action={updateFinanceAccountStatus}>
                          <input type="hidden" name="account_id" value={account.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Arsipkan</button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10">
              <EmptyState title="Bagan akun belum tersedia" body="Muat template COA sebagai draf atau buat akun sesuai kebutuhan yang telah ditinjau pengurus." />
            </div>
          )}
          {canWrite && summary.account_count === 0 ? (
            <div className="border-t border-line p-4">
              <form action={loadFinanceAccountTemplate}>
                <button type="submit" className="sb-btn sb-btn-primary !h-9 text-[11px]"><BookOpen size={14} /> Muat rancangan COA awal</button>
              </form>
              <p className="mt-2 text-[10.5px] text-muted2">Akun template akan berstatus draf. Nama bank dan struktur final wajib ditinjau sebelum aktivasi.</p>
            </div>
          ) : null}
        </Card>

        {canWrite ? (
          <Card>
            <CardHeader title="Tambah akun baru" subtitle="Akun baru selalu berstatus draf sampai disetujui." />
            <form action={createFinanceAccount} className="grid gap-3 p-4">
              <div><label htmlFor="finance-account-code" className="mb-1 block text-[11px] font-semibold text-ink2">Kode akun</label><input id="finance-account-code" name="account_code" required maxLength={32} pattern="[0-9]+-[0-9]{3,6}" className="sb-input" placeholder="Contoh: 1-1600" /></div>
              <div><label htmlFor="finance-account-name" className="mb-1 block text-[11px] font-semibold text-ink2">Nama akun</label><input id="finance-account-name" name="account_name" required minLength={2} maxLength={180} className="sb-input" /></div>
              <div><label htmlFor="finance-account-type" className="mb-1 block text-[11px] font-semibold text-ink2">Tipe akun</label><select id="finance-account-type" name="account_type" className="sb-input"><option value="aset">Aset</option><option value="kewajiban">Kewajiban</option><option value="ekuitas">Ekuitas</option><option value="pendapatan">Pendapatan</option><option value="beban">Beban</option></select></div>
              <div><label htmlFor="finance-account-normal" className="mb-1 block text-[11px] font-semibold text-ink2">Saldo normal</label><select id="finance-account-normal" name="normal_balance" className="sb-input"><option value="debit">Debit</option><option value="credit">Kredit</option></select></div>
              <div><label htmlFor="finance-account-group" className="mb-1 block text-[11px] font-semibold text-ink2">Kelompok akun</label><input id="finance-account-group" name="group_label" required maxLength={120} className="sb-input" placeholder="Contoh: Kas & setara kas" /></div>
              <div><label htmlFor="finance-account-note" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan</label><textarea id="finance-account-note" name="note" rows={2} maxLength={2000} className="sb-input !h-auto resize-y py-2" /></div>
              <div className="flex justify-end"><button type="submit" className="sb-btn sb-btn-primary"><FilePlus2 size={14} /> Simpan akun draf</button></div>
            </form>
          </Card>
        ) : null}
      </div>

      <div className="mt-5">
        <Notice tone="warning" title="Status rancangan akuntansi">
          Struktur akun awal adalah usulan teknis, bukan keputusan kebijakan organisasi. Aktivasi akun
          memerlukan peninjauan pengurus. Jangan mengaktifkan akun bank, pajak, dana terbatas, atau
          iuran sebelum nama, dasar, dan perlakuannya disetujui.
        </Notice>
      </div>
    </div>
  );
}
