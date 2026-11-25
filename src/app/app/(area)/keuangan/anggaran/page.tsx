import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, LockKeyhole, Wallet } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/ui";
import {
  closeFinanceBudget,
  reopenRejectedFinanceBudget,
  reviewFinanceBudget,
  submitFinanceBudget,
} from "@/app/actions/finance";
import {
  FinanceBudgetComposer,
  type FinanceBudgetAccountOption,
  type FinanceBudgetDraft,
  type FinanceBudgetDraftLine,
} from "@/components/finance-budget-composer";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Anggaran & Dana" };

type BudgetStatus = "draft" | "submitted" | "approved" | "rejected" | "closed";

interface BudgetRow {
  id: string;
  budget_code: string;
  title: string;
  fiscal_year: number;
  period_start: string;
  period_end: string;
  funding_source: string | null;
  responsible_label: string | null;
  notes: string | null;
  status: BudgetStatus;
  review_note: string | null;
  created_by: string;
  created_by_name: string;
  approved_by_name: string | null;
  planned_total: string;
  actual_total: string;
  line_count: number;
  pending_journal_count: number;
}

interface BudgetLineRow extends FinanceBudgetDraftLine {
  id: string;
  budget_id: string;
  account_code: string;
  account_name: string;
  actual_total: string;
}

const statusLabel: Record<BudgetStatus, string> = {
  draft: "Draf",
  submitted: "Menunggu persetujuan",
  approved: "Disetujui",
  rejected: "Perlu perbaikan",
  closed: "Ditutup",
};

const statusTone: Record<BudgetStatus, "neutral" | "warning" | "success" | "danger" | "info"> = {
  draft: "neutral",
  submitted: "warning",
  approved: "success",
  rejected: "danger",
  closed: "info",
};

const resultMessages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "budget-created": { tone: "success", text: "Draf anggaran berhasil dibuat. Periksa rincian sebelum diajukan." },
  "budget-updated": { tone: "success", text: "Perubahan draf anggaran berhasil disimpan." },
  "budget-submitted": { tone: "success", text: "Anggaran diajukan untuk persetujuan." },
  "budget-approved": { tone: "success", text: "Anggaran disetujui dan dapat ditautkan ke jurnal." },
  "budget-rejected": { tone: "warning", text: "Anggaran ditolak dengan catatan pemeriksaan." },
  "budget-reopened": { tone: "success", text: "Anggaran kembali menjadi draf untuk diperbaiki." },
  "budget-closed": { tone: "success", text: "Anggaran ditutup. Riwayat dan realisasi tetap tersimpan." },
  "invalid": { tone: "warning", text: "Periksa kembali identitas, periode, dan seluruh rincian anggaran." },
  "invalid-review": { tone: "warning", text: "Keputusan pemeriksaan atau catatan penolakan tidak valid." },
  "duplicate-code": { tone: "warning", text: "Kode anggaran sudah digunakan dalam organisasi ini." },
  "lines-invalid": { tone: "warning", text: "Draf dibuat, tetapi rincian tidak dapat disimpan. Buka draf dan periksa akun beban yang dipilih." },
  "error": { tone: "danger", text: "Anggaran belum dapat disimpan. Periksa koneksi atau log aplikasi." },
  "update-error": { tone: "danger", text: "Perubahan draf tidak dapat disimpan." },
  "not-draft-or-account-unavailable": { tone: "warning", text: "Draf bukan milik Anda, sudah berubah status, atau salah satu akun beban tidak aktif." },
  "submit-error": { tone: "danger", text: "Pengajuan anggaran belum dapat diproses." },
  "submit-blocked": { tone: "warning", text: "Anggaran tidak dapat diajukan. Pastikan draf memiliki rincian lengkap." },
  "review-error": { tone: "danger", text: "Pemeriksaan belum dapat diproses." },
  "review-not-eligible": { tone: "warning", text: "Pemeriksa harus berbeda dari pembuat dan anggaran harus berstatus menunggu persetujuan." },
  "reopen-error": { tone: "danger", text: "Draf tidak dapat dibuka kembali." },
  "reopen-not-eligible": { tone: "warning", text: "Hanya pembuat anggaran yang ditolak yang dapat membukanya kembali." },
  "close-error": { tone: "danger", text: "Anggaran belum dapat ditutup." },
  "close-blocked": { tone: "warning", text: "Anggaran belum dapat ditutup karena masih ada jurnal draf, menunggu pemeriksaan, disetujui, atau ditolak yang masih tertaut." },
};

function rupiah(value: string | number): string {
  const amount = Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateRange(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return `${start} – ${end}`;
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

export default async function AnggaranPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; budget_id?: string }>;
}) {
  const identity = await requireIdentity("finance:read");
  const canWrite = can(identity, "finance:budget:write");
  const canApprove = can(identity, "finance:budget:approve");
  const params = searchParams ? await searchParams : {};
  const notice = params.result ? resultMessages[params.result] : undefined;

  let accounts: FinanceBudgetAccountOption[] = [];
  let budgets: BudgetRow[] = [];
  let budgetLines: BudgetLineRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [accountResult, budgetResult, lineResult] = await Promise.all([
      sql`
        SELECT account.id::text AS id, account.account_code, account.account_name
        FROM v9.finance_accounts AS account
        WHERE account.organization_id = ${identity.organizationId}
          AND account.account_type = 'beban'
          AND account.normal_balance = 'debit'
          AND account.status = 'active'
          AND account.is_postable = true
        ORDER BY account.account_code
        LIMIT 200
      `,
      sql`
        SELECT
          budget.id::text AS id,
          budget.budget_code,
          budget.title,
          budget.fiscal_year,
          budget.period_start::text AS period_start,
          budget.period_end::text AS period_end,
          budget.funding_source,
          budget.responsible_label,
          budget.notes,
          budget.status,
          budget.review_note,
          budget.created_by::text AS created_by,
          COALESCE(created_person.full_name, created_account.email) AS created_by_name,
          COALESCE(approved_person.full_name, approved_account.email) AS approved_by_name,
          COALESCE(planned.planned_total, 0)::text AS planned_total,
          COALESCE(actual.actual_total, 0)::text AS actual_total,
          COALESCE(planned.line_count, 0)::int AS line_count,
          COALESCE(pending.pending_journal_count, 0)::int AS pending_journal_count
        FROM v9.finance_budgets AS budget
        LEFT JOIN v9.user_accounts AS created_account ON created_account.id = budget.created_by
        LEFT JOIN v9.people AS created_person ON created_person.id = created_account.person_id
        LEFT JOIN v9.user_accounts AS approved_account ON approved_account.id = budget.approved_by
        LEFT JOIN v9.people AS approved_person ON approved_person.id = approved_account.person_id
        LEFT JOIN LATERAL (
          SELECT
            sum(line.planned_amount)::numeric(18,2) AS planned_total,
            count(*)::int AS line_count
          FROM v9.finance_budget_lines AS line
          WHERE line.organization_id = budget.organization_id
            AND line.budget_id = budget.id
        ) AS planned ON true
        LEFT JOIN LATERAL (
          SELECT sum(journal_line.debit - journal_line.credit)::numeric(18,2) AS actual_total
          FROM v9.finance_journals AS journal
          INNER JOIN v9.finance_journal_lines AS journal_line
            ON journal_line.journal_id = journal.id
            AND journal_line.organization_id = journal.organization_id
          INNER JOIN v9.finance_budget_lines AS budget_line
            ON budget_line.organization_id = journal.organization_id
            AND budget_line.budget_id = journal.budget_id
            AND budget_line.account_id = journal_line.account_id
          WHERE journal.organization_id = budget.organization_id
            AND journal.budget_id = budget.id
            AND journal.status = 'posted'
        ) AS actual ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS pending_journal_count
          FROM v9.finance_journals AS journal
          WHERE journal.organization_id = budget.organization_id
            AND journal.budget_id = budget.id
            AND journal.status <> 'posted'
        ) AS pending ON true
        WHERE budget.organization_id = ${identity.organizationId}
        ORDER BY
          CASE budget.status
            WHEN 'submitted' THEN 0
            WHEN 'approved' THEN 1
            WHEN 'draft' THEN 2
            WHEN 'rejected' THEN 3
            ELSE 4
          END,
          budget.period_start DESC,
          budget.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT
          line.id::text AS id,
          line.budget_id::text AS budget_id,
          line.account_id::text AS account_id,
          account.account_code,
          account.account_name,
          line.description,
          line.planned_amount::text AS planned_amount,
          line.note,
          COALESCE(actual.actual_total, 0)::text AS actual_total
        FROM v9.finance_budget_lines AS line
        INNER JOIN v9.finance_accounts AS account
          ON account.id = line.account_id
          AND account.organization_id = line.organization_id
        LEFT JOIN LATERAL (
          SELECT sum(journal_line.debit - journal_line.credit)::numeric(18,2) AS actual_total
          FROM v9.finance_journals AS journal
          INNER JOIN v9.finance_journal_lines AS journal_line
            ON journal_line.journal_id = journal.id
            AND journal_line.organization_id = journal.organization_id
          WHERE journal.organization_id = line.organization_id
            AND journal.budget_id = line.budget_id
            AND journal.status = 'posted'
            AND journal_line.account_id = line.account_id
        ) AS actual ON true
        WHERE line.organization_id = ${identity.organizationId}
        ORDER BY line.budget_id, line.line_number
      `,
    ]);
    accounts = rowsFromResult<FinanceBudgetAccountOption>(accountResult);
    budgets = rowsFromResult<BudgetRow>(budgetResult);
    budgetLines = rowsFromResult<BudgetLineRow>(lineResult);
  } catch (reason) {
    unavailable = true;
    const errorType = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
    console.warn("[finance-budgets] Source unavailable", errorType);
  }

  const linesByBudget = new Map<string, BudgetLineRow[]>();
  for (const line of budgetLines) {
    const existing = linesByBudget.get(line.budget_id) ?? [];
    existing.push(line);
    linesByBudget.set(line.budget_id, existing);
  }

  const requestedBudget = budgets.find((budget) => budget.id === params.budget_id);
  const approvedBudgets = budgets.filter((budget) => budget.status === "approved");
  const aggregatePlanned = approvedBudgets.reduce((sum, budget) => sum + Number(budget.planned_total), 0);
  const aggregateActual = approvedBudgets.reduce((sum, budget) => sum + Number(budget.actual_total), 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Anggaran, komitmen & dana"
        description="Susun plafon belanja per akun biaya, ajukan persetujuan, dan pantau realisasi dari jurnal yang telah terposting."
        actions={<Badge tone={unavailable ? "warning" : "success"}>{unavailable ? "Sumber data tidak tersedia" : "Terkoneksi ke jurnal"}</Badge>}
      />

      {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan anggaran">{notice.text}</Notice></div> : null}
      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Data anggaran belum dapat dimuat">
            Sumber data anggaran atau buku besar sedang tidak tersedia. Nilai rencana dan realisasi disembunyikan sampai koneksi pulih.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Anggaran disetujui</div>
          <div className="mt-2 text-[19px] font-semibold tabular-nums text-ink">{unavailable ? "—" : approvedBudgets.length}</div>
          <div className="mt-1 text-[10px] text-muted">Anggaran aktif untuk pencatatan</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total plafon disetujui</div>
          <div className="mt-2 text-[17px] font-semibold tabular-nums text-ink">{unavailable ? "—" : rupiah(aggregatePlanned)}</div>
          <div className="mt-1 text-[10px] text-muted">Bukan saldo kas</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Realisasi terposting</div>
          <div className="mt-2 text-[17px] font-semibold tabular-nums text-ink">{unavailable ? "—" : rupiah(aggregateActual)}</div>
          <div className="mt-1 text-[10px] text-muted">Jurnal tertaut ke anggaran</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Sisa plafon</div>
          <div className="mt-2 text-[17px] font-semibold tabular-nums text-ink">{unavailable ? "—" : rupiah(aggregatePlanned - aggregateActual)}</div>
          <div className="mt-1 text-[10px] text-muted">Rencana dikurangi realisasi</div>
        </Card>
      </div>

      {canWrite ? (
        <Card className="mt-5">
          <CardHeader title="Susun anggaran baru" subtitle="Simpan sebagai draf. Rincian biaya menggunakan akun beban organisasi yang telah diaktifkan." />
          <FinanceBudgetComposer accounts={accounts} />
        </Card>
      ) : null}

      <div className="mt-5 grid gap-4">
        {budgets.map((budget) => {
          const lines = linesByBudget.get(budget.id) ?? [];
          const planned = Number(budget.planned_total);
          const actual = Number(budget.actual_total);
          const remaining = planned - actual;
          const percent = planned > 0 ? (actual / planned) * 100 : 0;
          const canEditOwnDraft = canWrite && budget.status === "draft" && budget.created_by === identity.userId;
          const canReopenOwn = canWrite && budget.status === "rejected" && budget.created_by === identity.userId;
          const draft: FinanceBudgetDraft = {
            id: budget.id,
            budget_code: budget.budget_code,
            title: budget.title,
            fiscal_year: budget.fiscal_year,
            period_start: budget.period_start,
            period_end: budget.period_end,
            funding_source: budget.funding_source,
            responsible_label: budget.responsible_label,
            notes: budget.notes,
            lines: lines.map((line): FinanceBudgetDraftLine => ({
              account_id: line.account_id,
              description: line.description,
              planned_amount: line.planned_amount,
              note: line.note ?? "",
            })),
          };

          return (
            <Card key={budget.id} id={budget.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-semibold text-muted2">{budget.budget_code}</span>
                    <Badge tone={statusTone[budget.status]}>{statusLabel[budget.status]}</Badge>
                    <Badge tone="neutral">TA {budget.fiscal_year}</Badge>
                  </div>
                  <h2 className="mt-1 text-[14px] font-semibold text-ink">{budget.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                    <span>{dateRange(budget.period_start, budget.period_end)}</span>
                    {budget.funding_source ? <span>Sumber: {budget.funding_source}</span> : null}
                    {budget.responsible_label ? <span>Penanggung jawab: {budget.responsible_label}</span> : null}
                    <span>Dibuat {budget.created_by_name}</span>
                    {budget.approved_by_name ? <span>Disetujui {budget.approved_by_name}</span> : null}
                  </div>
                </div>
                {budget.status === "approved" ? (
                  <div className="min-w-[180px] text-right">
                    <div className="text-[9.5px] text-muted">Realisasi / plafon</div>
                    <div className="mt-1 text-[13px] font-semibold tabular-nums text-ink">{rupiah(actual)} / {rupiah(planned)}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} />
                    </div>
                    <div className="mt-1 text-[9.5px] text-muted">{percent.toFixed(1)}% terpakai · sisa {rupiah(remaining)}</div>
                  </div>
                ) : null}
              </div>

              {budget.review_note ? (
                <div className="border-b border-line px-4 py-3">
                  <Notice tone="warning" title="Catatan pemeriksaan">{budget.review_note}</Notice>
                </div>
              ) : null}

              {lines.length ? (
                <div className="sb-scroll">
                  <table className="sb-table min-w-[760px]">
                    <thead>
                      <tr>
                        <th>Akun beban</th>
                        <th>Uraian rencana</th>
                        <th className="num">Plafon</th>
                        <th className="num">Realisasi</th>
                        <th className="num">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const plannedLine = Number(line.planned_amount);
                        const actualLine = Number(line.actual_total);
                        return (
                          <tr key={line.id}>
                            <td>
                              <div className="font-mono text-[10px] text-muted2">{line.account_code}</div>
                              <div className="text-[11px] font-medium text-ink2">{line.account_name}</div>
                            </td>
                            <td>
                              <div className="text-[11px] text-ink2">{line.description}</div>
                              {line.note ? <div className="mt-0.5 text-[10px] text-muted2">{line.note}</div> : null}
                            </td>
                            <td className="num whitespace-nowrap text-[11px] tabular-nums">{rupiah(plannedLine)}</td>
                            <td className="num whitespace-nowrap text-[11px] tabular-nums">{rupiah(actualLine)}</td>
                            <td className={`num whitespace-nowrap text-[11px] font-semibold tabular-nums ${plannedLine - actualLine < 0 ? "text-danger" : "text-ink2"}`}>
                              {rupiah(plannedLine - actualLine)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-5"><EmptyState title="Belum ada rincian biaya" body="Tambahkan akun beban dan plafon sebelum anggaran diajukan." /></div>
              )}

              {canEditOwnDraft ? (
                <div className="border-t border-line">
                  <CardHeader title="Edit draf" subtitle="Rincian dan identitas hanya dapat diubah selama berstatus draf." />
                  <FinanceBudgetComposer accounts={accounts} initialBudget={draft} />
                  <div className="flex flex-wrap justify-end border-t border-line px-4 py-3">
                    <form action={submitFinanceBudget}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <button type="submit" disabled={!lines.length} className="sb-btn sb-btn-primary !h-8 text-[10px]">Ajukan persetujuan</button>
                    </form>
                  </div>
                </div>
              ) : null}

              {budget.status === "submitted" && canApprove ? (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
                  <form action={reviewFinanceBudget}>
                    <input type="hidden" name="budget_id" value={budget.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button type="submit" className="sb-btn sb-btn-primary !h-8 text-[10px]">Setujui anggaran</button>
                  </form>
                  <form action={reviewFinanceBudget} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="budget_id" value={budget.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <input name="review_note" required minLength={3} maxLength={2000} className="sb-input !h-8 min-w-[180px] text-[10px]" placeholder="Alasan penolakan" />
                    <button type="submit" className="sb-btn sb-btn-outline !h-8 text-[10px]">Tolak</button>
                  </form>
                </div>
              ) : null}

              {canReopenOwn ? (
                <div className="flex justify-end border-t border-line px-4 py-3">
                  <form action={reopenRejectedFinanceBudget}>
                    <input type="hidden" name="budget_id" value={budget.id} />
                    <button type="submit" className="sb-btn sb-btn-outline !h-8 text-[10px]">Buka kembali draf</button>
                  </form>
                </div>
              ) : null}

              {budget.status === "approved" && canApprove ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
                  <div className="text-[10px] text-muted">
                    {budget.pending_journal_count} jurnal belum terposting masih tertaut
                  </div>
                  <form action={closeFinanceBudget}>
                    <input type="hidden" name="budget_id" value={budget.id} />
                    <button type="submit" disabled={budget.pending_journal_count > 0} className="sb-btn sb-btn-outline !h-8 text-[10px]">Tutup anggaran</button>
                  </form>
                </div>
              ) : null}
            </Card>
          );
        })}
        {!budgets.length && !unavailable ? (
          <Card className="p-5">
            <EmptyState
              title="Belum ada anggaran yang tercatat"
              body={canWrite
                ? "Susun draf anggaran di atas. Tetapkan periode, sumber dana, penanggung jawab, akun beban, dan plafon sesuai hasil musyawarah atau keputusan organisasi."
                : "Belum ada anggaran yang disusun atau disahkan oleh pengurus yang berwenang."}
              icon={<ClipboardList size={25} />}
            />
          </Card>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader title="Kontrol realisasi" action={<LockKeyhole size={15} className="text-muted2" />} />
          <div className="space-y-2 px-4 pb-4 text-[10.5px] leading-relaxed text-muted">
            <p>Realisasi diambil hanya dari jurnal yang sudah berstatus terposting dan ditautkan secara eksplisit pada anggaran ini.</p>
            <p>Jurnal yang belum ditautkan tidak dihitung. Komitmen belanja, pesanan POS, dan permintaan pencairan belum otomatis menjadi realisasi.</p>
            <p>Untuk menjaga jejak audit, anggaran yang sudah diajukan tidak dapat mengubah periode, sumber dana, penanggung jawab, atau rincian plafonnya.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Modul keuangan terkait" action={<Wallet size={15} className="text-muted2" />} />
          <div className="divide-y divide-line">
            <Link href="/app/keuangan/jurnal" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
              Jurnal & posting <ArrowRight size={13} />
            </Link>
            <Link href="/app/keuangan/laporan" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
              Laporan keuangan <ArrowRight size={13} />
            </Link>
            <Link href="/app/keuangan/bagan-akun" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
              Bagan akun <ArrowRight size={13} />
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Notice tone="info" title="Bukan pencatatan kas">
          Anggaran menunjukkan rencana dan realisasi biaya, bukan jumlah uang di rekening. Saldo kas tetap berasal dari jurnal buku besar pada modul Kas & Bank.
        </Notice>
      </div>
    </div>
  );
}
