import { BookOpenCheck, CircleCheck, ClipboardCheck, Scale } from "lucide-react";
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
import {
  createFinanceReversalJournal,
  postFinanceJournal,
  reopenRejectedFinanceJournal,
  reviewFinanceJournal,
  submitFinanceJournal,
} from "@/app/actions/finance";
import {
  FinanceJournalComposer,
  type FinanceAccountOption,
  type FinanceJournalDraft,
} from "@/components/finance-journal-composer";

interface JournalLineRow {
  line_number: number;
  account_id: string;
  account_code: string;
  account_name: string;
  memo: string | null;
  debit: string;
  credit: string;
}

interface JournalRow {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  source_type: string;
  source_reference: string | null;
  budget_id: string | null;
  budget_code: string | null;
  budget_title: string | null;
  status: "draft" | "submitted" | "approved" | "posted" | "rejected";
  total_debit: string;
  total_credit: string;
  review_note: string | null;
  created_by: string;
  created_by_name: string;
  approved_by_name: string | null;
  posted_by_name: string | null;
  is_reversed: boolean;
  line_count: number;
  lines: JournalLineRow[];
}

interface JournalSummary {
  draft_count: number;
  submitted_count: number;
  approved_count: number;
  posted_count: number;
  rejected_count: number;
  posted_debit: string;
  posted_credit: string;
}

const statusLabel: Record<JournalRow["status"], string> = {
  draft: "Draf",
  submitted: "Menunggu pemeriksaan",
  approved: "Disetujui · siap posting",
  posted: "Terposting",
  rejected: "Perlu perbaikan",
};

const statusTone: Record<JournalRow["status"], "neutral" | "warning" | "info" | "success" | "danger"> = {
  draft: "neutral",
  submitted: "warning",
  approved: "info",
  posted: "success",
  rejected: "danger",
};

const sourceLabel: Record<string, string> = {
  manual: "Jurnal umum",
  cash: "Kas",
  bank: "Bank",
  contribution: "Kontribusi",
  grant: "Hibah / dana program",
  purchase: "Pengadaan",
  sale: "Penjualan",
  adjustment: "Penyesuaian",
  reversal: "Pembalik",
};

const resultMessages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "journal-created": { tone: "success", text: "Jurnal draf berhasil disimpan." },
  "journal-updated": { tone: "success", text: "Perubahan jurnal draf berhasil disimpan." },
  "reversal-draft-created": { tone: "success", text: "Jurnal pembalik dibuat sebagai draf. Ajukan, periksa, dan posting melalui alur yang sama." },
  "reversal-already-exists": { tone: "warning", text: "Jurnal pembalik untuk jurnal ini sudah pernah dibuat." },
  "reversal-not-eligible": { tone: "warning", text: "Jurnal tidak terposting, sudah berupa pembalik, atau tidak memenuhi syarat pembalikan." },
  "invalid-reversal": { tone: "warning", text: "Tanggal dan alasan jurnal pembalik wajib diisi dengan benar." },
  "reversal-error": { tone: "danger", text: "Jurnal pembalik belum dapat dibuat. Periksa data dan log aplikasi." },
  "journal-submitted": { tone: "success", text: "Jurnal diajukan untuk pemeriksaan. Isi jurnal tidak dapat diedit sampai ditolak atau diposting." },
  "journal-approved": { tone: "success", text: "Jurnal disetujui dan siap diposting." },
  "journal-rejected": { tone: "warning", text: "Jurnal ditolak dengan catatan pemeriksaan. Pembuat dapat membuka kembali draf untuk perbaikan." },
  "journal-posted": { tone: "success", text: "Jurnal berhasil diposting dan menjadi bagian dari buku besar." },
  "journal-reopened": { tone: "success", text: "Jurnal yang ditolak kembali menjadi draf." },
  "journal-not-balanced": { tone: "warning", text: "Total debit dan kredit belum seimbang atau akun belum aktif. Periksa kembali baris jurnal." },
  "journal-not-draft": { tone: "warning", text: "Jurnal bukan lagi draf, atau pemetaan rekening kas/bank yang dipilih belum aktif." },
  "review-not-eligible": { tone: "warning", text: "Pemeriksaan tidak dapat dilakukan. Pastikan pemeriksa berbeda dari pembuat dan semua register kas/bank yang digunakan masih aktif." },
  "journal-not-approved": { tone: "warning", text: "Jurnal belum disetujui, atau register kas/bank terkait sudah tidak aktif sehingga jurnal tidak dapat diposting." },
  "invalid-lines": { tone: "warning", text: "Tanggal, akun, atau nilai pada baris jurnal tidak valid." },
  "account-unavailable": { tone: "warning", text: "Salah satu akun tidak aktif atau tidak tersedia untuk organisasi ini." },
  "posting-blocked": { tone: "danger", text: "Posting ditolak oleh kontrol jurnal. Periksa persetujuan, keseimbangan, status akun, dan aktivasi register kas/bank." },
  error: { tone: "danger", text: "Sistem tidak dapat menyimpan jurnal. Periksa koneksi atau log aplikasi." },
};

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function rupiah(value: string | number): string {
  const amount = Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export async function FinanceJournalSection({ result }: { result?: string }) {
  const identity = await requireIdentity("finance:read");
  const canWrite = can(identity, "finance:journal:write");
  const canReview = can(identity, "finance:journal:approve");
  const canPost = can(identity, "finance:journal:post");
  const sql = getV9Sql();

  const [summaryResult, accountResult, journalResult, budgetResult] = await Promise.all([
    sql`
      SELECT
        count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
        count(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
        count(*) FILTER (WHERE status = 'approved')::int AS approved_count,
        count(*) FILTER (WHERE status = 'posted')::int AS posted_count,
        count(*) FILTER (WHERE status = 'rejected')::int AS rejected_count,
        COALESCE(sum(total_debit) FILTER (WHERE status = 'posted'),0)::text AS posted_debit,
        COALESCE(sum(total_credit) FILTER (WHERE status = 'posted'),0)::text AS posted_credit
      FROM v9.finance_journals
      WHERE organization_id = ${identity.organizationId}
    `,
    sql`
      SELECT account.id::text AS id, account.account_code, account.account_name
      FROM v9.finance_accounts AS account
      WHERE account.organization_id = ${identity.organizationId}
        AND account.status = 'active'
        AND account.is_postable = true
        AND NOT EXISTS (
          SELECT 1
          FROM v9.finance_cash_accounts AS cash_account
          WHERE cash_account.organization_id = account.organization_id
            AND cash_account.ledger_account_id = account.id
            AND cash_account.status <> 'active'
        )
      ORDER BY account.account_code
      LIMIT 500
    `,
    sql`
      SELECT budget.id::text AS id, budget.budget_code, budget.title,
        budget.period_start::text AS period_start, budget.period_end::text AS period_end,
        budget.status
      FROM v9.finance_budgets AS budget
      WHERE budget.organization_id = ${identity.organizationId}
        AND (
          budget.status = 'approved'
          OR EXISTS (
            SELECT 1
            FROM v9.finance_journals AS draft
            WHERE draft.organization_id = budget.organization_id
              AND draft.budget_id = budget.id
              AND draft.status = 'draft'
              AND draft.created_by = ${identity.userId}
          )
        )
      ORDER BY CASE budget.status WHEN 'approved' THEN 0 ELSE 1 END,
        budget.period_start DESC, budget.budget_code
      LIMIT 100
    `,
    sql`
      SELECT
        journal.id::text AS id,
        journal.reference_no,
        journal.journal_date::text AS journal_date,
        journal.description,
        journal.source_type,
        journal.source_reference,
        journal.budget_id::text AS budget_id,
        budget.budget_code AS budget_code,
        budget.title AS budget_title,
        journal.status,
        journal.total_debit::text AS total_debit,
        journal.total_credit::text AS total_credit,
        journal.review_note,
        journal.created_by::text AS created_by,
        COALESCE(created_person.full_name, created_account.email) AS created_by_name,
        COALESCE(approved_person.full_name, approved_account.email) AS approved_by_name,
        COALESCE(posted_person.full_name, posted_account.email) AS posted_by_name,
        EXISTS (
          SELECT 1 FROM v9.finance_journals AS reversal
          WHERE reversal.reversal_of_id = journal.id
            AND reversal.organization_id = journal.organization_id
        ) AS is_reversed,
        (
          SELECT count(*)::int
          FROM v9.finance_journal_lines line
          WHERE line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
        ) AS line_count,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'line_number', line.line_number,
              'account_id', line.account_id::text,
              'account_code', account.account_code,
              'account_name', account.account_name,
              'memo', line.memo,
              'debit', line.debit::text,
              'credit', line.credit::text
            ) ORDER BY line.line_number
          )
          FROM v9.finance_journal_lines line
          INNER JOIN v9.finance_accounts account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
          WHERE line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
        ), '[]'::jsonb) AS lines
      FROM v9.finance_journals AS journal
      LEFT JOIN v9.finance_budgets AS budget
        ON budget.id = journal.budget_id
        AND budget.organization_id = journal.organization_id
      LEFT JOIN v9.user_accounts created_account ON created_account.id = journal.created_by
      LEFT JOIN v9.people created_person ON created_person.id = created_account.person_id
      LEFT JOIN v9.user_accounts approved_account ON approved_account.id = journal.approved_by
      LEFT JOIN v9.people approved_person ON approved_person.id = approved_account.person_id
      LEFT JOIN v9.user_accounts posted_account ON posted_account.id = journal.posted_by
      LEFT JOIN v9.people posted_person ON posted_person.id = posted_account.person_id
      WHERE journal.organization_id = ${identity.organizationId}
      ORDER BY journal.journal_date DESC, journal.created_at DESC
      LIMIT 100
    `,
  ]);

  const summary = rowsFromResult<JournalSummary>(summaryResult)[0] ?? {
    draft_count: 0, submitted_count: 0, approved_count: 0, posted_count: 0,
    rejected_count: 0, posted_debit: "0", posted_credit: "0",
  };
  const accounts = rowsFromResult<FinanceAccountOption>(accountResult);
  const budgets = rowsFromResult<FinanceBudgetOption>(budgetResult);
  const journals = rowsFromResult<JournalRow>(journalResult);
  const notice = result ? resultMessages[result] : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Jurnal & posting"
        description="Catat transaksi dengan prinsip debit-kredit, ajukan pemeriksaan, lalu posting setelah disetujui. Jurnal terposting tidak dapat diubah."
      />
      {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan jurnal">{notice.text}</Notice></div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jurnal terposting" value={summary.posted_count} note="Masuk ke buku besar" tone="success" />
        <StatCard label="Menunggu pemeriksaan" value={summary.submitted_count} note="Perlu persetujuan berbeda dari pembuat" tone="warning" />
        <StatCard label="Siap posting" value={summary.approved_count} note="Telah disetujui" tone="info" />
        <StatCard label="Draf" value={summary.draft_count} note="Belum masuk buku besar" tone="neutral" />
      </div>

      {canWrite ? (
        <Card className="mt-5">
          <CardHeader title="Buat jurnal umum" subtitle="Draf baru tidak mengubah saldo buku besar sampai jurnal disetujui dan diposting." action={<BookOpenCheck size={16} className="text-muted" />} />
          <FinanceJournalComposer accounts={accounts} budgets={budgets} />
        </Card>
      ) : null}

      <div className="mt-5">
        <Card>
          <CardHeader title="Register jurnal" subtitle={`${journals.length} jurnal terbaru · maksimal 100`} action={<Badge tone="neutral">Buku jurnal</Badge>} />
          {journals.length ? (
            <div className="divide-y divide-line">
              {journals.map((journal) => {
                const balanced = Number(journal.total_debit) > 0 &&
                  Math.round(Number(journal.total_debit) * 100) === Math.round(Number(journal.total_credit) * 100);
                const lines = journal.lines ?? [];
                return (
                  <article key={journal.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-semibold text-muted2">{journal.reference_no}</span>
                          <Badge tone={statusTone[journal.status]}>{statusLabel[journal.status]}</Badge>
                          <Badge tone="neutral">{sourceLabel[journal.source_type] ?? journal.source_type}</Badge>
                          {journal.budget_code ? <Badge tone="info">Anggaran {journal.budget_code}</Badge> : null}
                        </div>
                        <h3 className="mt-1 text-[13px] font-semibold text-ink">{journal.description}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                          <span>{dateLabel(journal.journal_date)}</span>
                          <span>Dibuat oleh {journal.created_by_name}</span>
                          {journal.approved_by_name ? <span>Disetujui {journal.approved_by_name}</span> : null}
                          {journal.posted_by_name ? <span>Diposting {journal.posted_by_name}</span> : null}
                          {journal.source_reference ? <span>Bukti {journal.source_reference}</span> : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-right">
                        <div><div className="text-[9.5px] text-muted">Debit</div><div className="text-[11.5px] font-semibold tabular-nums text-ink">{rupiah(journal.total_debit)}</div></div>
                        <div><div className="text-[9.5px] text-muted">Kredit</div><div className="text-[11.5px] font-semibold tabular-nums text-ink">{rupiah(journal.total_credit)}</div></div>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto rounded-lg border border-line">
                      <table className="sb-table min-w-[600px]">
                        <thead><tr><th>Akun</th><th>Keterangan</th><th className="text-right">Debit</th><th className="text-right">Kredit</th></tr></thead>
                        <tbody>
                          {lines.map((line) => (
                            <tr key={line.line_number}>
                              <td><span className="font-mono text-[10px] text-muted2">{line.account_code}</span><span className="ml-2 text-[10.5px] font-medium text-ink2">{line.account_name}</span></td>
                              <td className="text-[10.5px] text-muted">{line.memo ?? "—"}</td>
                              <td className="text-right tabular-nums text-[10.5px]">{Number(line.debit) ? rupiah(line.debit) : "—"}</td>
                              <td className="text-right tabular-nums text-[10.5px]">{Number(line.credit) ? rupiah(line.credit) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {journal.review_note ? <p className="mt-2 border-l-2 border-line pl-2 text-[10.5px] text-muted">Catatan pemeriksaan: {journal.review_note}</p> : null}
                    {journal.status === "draft" && canWrite && journal.created_by === identity.userId ? (
                      <details className="mt-3 rounded-lg border border-line bg-paper">
                        <summary className="cursor-pointer px-3 py-2.5 text-[10.5px] font-semibold text-primary-800">
                          Ubah draf jurnal
                        </summary>
                        <div className="border-t border-line bg-white">
                          <FinanceJournalComposer
                            accounts={accounts}
                            budgets={budgets}
                            initialJournal={{
                              id: journal.id,
                              budget_id: journal.budget_id,
                              journal_date: journal.journal_date,
                              description: journal.description,
                              source_type: journal.source_type,
                              source_reference: journal.source_reference,
                              lines: lines.map((line) => ({
                                account_id: line.account_id,
                                debit: line.debit,
                                credit: line.credit,
                                memo: line.memo,
                              })),
                            } satisfies FinanceJournalDraft}
                          />
                        </div>
                      </details>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      {journal.status === "draft" && canWrite ? (
                        balanced ? (
                          <form action={submitFinanceJournal}>
                            <input type="hidden" name="journal_id" value={journal.id} />
                            <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10px]"><ClipboardCheck size={13} /> Ajukan pemeriksaan</button>
                          </form>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700">Belum seimbang · koreksi draf sebelum diajukan</span>
                        )
                      ) : null}
                      {journal.status === "submitted" && canReview && journal.created_by !== identity.userId ? (
                        <>
                          <form action={reviewFinanceJournal}>
                            <input type="hidden" name="journal_id" value={journal.id} />
                            <input type="hidden" name="decision" value="approved" />
                            <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10px]"><CircleCheck size={13} /> Setujui</button>
                          </form>
                          <form action={reviewFinanceJournal} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="journal_id" value={journal.id} />
                            <input type="hidden" name="decision" value="rejected" />
                            <input name="review_note" required minLength={3} maxLength={2000} className="sb-input !h-8 min-w-[180px] flex-1 text-[10px]" placeholder="Alasan penolakan" />
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Tolak</button>
                          </form>
                        </>
                      ) : null}
                      {journal.status === "approved" && canPost ? (
                        <form action={postFinanceJournal}>
                          <input type="hidden" name="journal_id" value={journal.id} />
                          <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10px]"><Scale size={13} /> Posting ke buku besar</button>
                        </form>
                      ) : null}
                      {journal.status === "posted" && journal.source_type !== "reversal" && canWrite && !journal.is_reversed ? (
                        <form action={createFinanceReversalJournal} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="journal_id" value={journal.id} />
                          <input name="journal_date" type="date" required className="sb-input !h-8 w-[145px] text-[10px]" aria-label="Tanggal jurnal pembalik" />
                          <input name="reason" required minLength={3} maxLength={400} className="sb-input !h-8 min-w-[170px] flex-1 text-[10px]" placeholder="Alasan pembalikan" />
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Buat jurnal pembalik</button>
                        </form>
                      ) : null}
                      {journal.status === "posted" && journal.is_reversed ? (
                        <Badge tone="info">Sudah memiliki jurnal pembalik</Badge>
                      ) : null}
                      {journal.status === "rejected" && canWrite && journal.created_by === identity.userId ? (
                        <form action={reopenRejectedFinanceJournal}>
                          <input type="hidden" name="journal_id" value={journal.id} />
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Buka kembali draf</button>
                        </form>
                      ) : null}
                      <span className="ml-auto text-[9.5px] text-muted2">{journal.line_count} baris · {balanced ? "Seimbang" : "Belum seimbang"}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10">
              <EmptyState title="Belum ada jurnal" body="Belum ada transaksi keuangan yang dicatat. Tidak ada saldo atau jurnal demo yang ditampilkan." />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Kontrol posting">
          Jurnal draf belum memengaruhi buku besar. Pengajuan memerlukan total debit sama dengan
          kredit. Persetujuan harus dilakukan oleh akun selain pembuat jurnal. Setelah diposting,
          jurnal dan barisnya terkunci; koreksi dilakukan melalui jurnal pembalik.
        </Notice>
      </div>
    </div>
  );
}
