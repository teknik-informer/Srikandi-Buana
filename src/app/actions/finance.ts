"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COA } from "@/data/coa";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

type MutationRow = { id: string; reference_no?: string };

const ACCOUNT_TYPES = ["aset","kewajiban","ekuitas","pendapatan","beban"] as const;
const NORMAL_BALANCES = ["debit","credit"] as const;
const SOURCES = ["manual","cash","bank","contribution","grant","purchase","sale","adjustment","reversal"] as const;

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function financePath(result: string, journalId?: string): string {
  const query = new URLSearchParams({ result });
  if (journalId && validUuid(journalId)) query.set("journal_id", journalId);
  return `/app/keuangan/jurnal?${query.toString()}`;
}

function accountPath(result: string): string {
  return `/app/keuangan/bagan-akun?result=${encodeURIComponent(result)}`;
}

function budgetPath(result: string, budgetId?: string): string {
  const query = new URLSearchParams({ result });
  if (budgetId && validUuid(budgetId)) query.set("budget_id", budgetId);
  return `/app/keuangan/anggaran?${query.toString()}`;
}

function cashBankPath(result: string): string {
  return `/app/keuangan/kas-bank?result=${encodeURIComponent(result)}`;
}


type FinanceBudgetLineInput = {
  line_number: number;
  account_id: string;
  description: string;
  planned_amount: number;
  note: string | null;
};

function parseFinanceBudgetLines(value: string): FinanceBudgetLineInput[] | null {
  if (value.length > 40000) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) return null;

  const seenNumbers = new Set<number>();
  const seenAccounts = new Set<string>();
  const lines: FinanceBudgetLineInput[] = [];

  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Record<string, unknown>;
    const lineNumber = Number(item.line_number);
    const accountId = String(item.account_id ?? "").trim();
    const description = normalize(String(item.description ?? ""));
    const amount = Number(item.planned_amount);
    const note = String(item.note ?? "").trim();

    if (
      !Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > 100 ||
      seenNumbers.has(lineNumber) ||
      !validUuid(accountId) || seenAccounts.has(accountId) ||
      description.length < 2 || description.length > 180 ||
      !Number.isFinite(amount) || amount <= 0 ||
      Math.round(amount * 100) !== amount * 100 || amount > 9999999999999999 ||
      note.length > 500
    ) return null;

    seenNumbers.add(lineNumber);
    seenAccounts.add(accountId);
    lines.push({
      line_number: lineNumber,
      account_id: accountId,
      description,
      planned_amount: amount,
      note: note || null,
    });
  }

  return lines.sort((a, b) => a.line_number - b.line_number);
}

function fail(area: string, reason: unknown): void {
  const errorType =
    reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
  console.warn(`[${area}] Operation failed`, errorType);
}

function refreshFinance(): void {
  revalidatePath("/app/keuangan");
  revalidatePath("/app/keuangan/jurnal");
  revalidatePath("/app/keuangan/bagan-akun");
  revalidatePath("/app/keuangan/kas-bank");
  revalidatePath("/app/keuangan/anggaran");
  revalidatePath("/app/keuangan/iuran");
  revalidatePath("/app/keuangan/penerimaan");
  revalidatePath("/app/keuangan/pembayaran");
  revalidatePath("/app/keuangan/buku-besar");
  revalidatePath("/app/keuangan/neraca-saldo");
  revalidatePath("/app/keuangan/laporan");
  revalidatePath("/app/pengurus/persetujuan");
}

export async function loadFinanceAccountTemplate(): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:accounts:write")) redirect("/app");

  const template = COA.map((account) => ({
    account_code: account.code,
    account_name: account.code === "1-1100" ? "Bank Organisasi (tentukan bank)" : account.name,
    account_type: account.type,
    normal_balance: account.normal === "debit" ? "debit" : "credit",
    group_label: account.group,
    note: account.code === "1-1100"
      ? "Nama rekening belum ditetapkan. Sesuaikan sebelum akun diaktifkan."
      : account.note ?? null,
    is_postable: true,
  }));
  let inserted: MutationRow[] = [];

  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH template AS MATERIALIZED (
        SELECT
          item.account_code,
          item.account_name,
          item.account_type,
          item.normal_balance,
          item.group_label,
          item.note,
          item.is_postable
        FROM jsonb_to_recordset(${JSON.stringify(template)}::jsonb) AS item(
          account_code text,
          account_name text,
          account_type text,
          normal_balance text,
          group_label text,
          note text,
          is_postable boolean
        )
      ),
      created AS (
        INSERT INTO v9.finance_accounts (
          organization_id, account_code, account_name, account_type,
          normal_balance, group_label, note, is_postable, status,
          created_by, updated_by
        )
        SELECT
          ${identity.organizationId},
          template.account_code,
          template.account_name,
          template.account_type,
          template.normal_balance,
          template.group_label,
          template.note,
          template.is_postable,
          'draft',
          ${identity.userId},
          ${identity.userId}
        FROM template
        WHERE NOT EXISTS (
          SELECT 1 FROM v9.finance_accounts account
          WHERE account.organization_id = ${identity.organizationId}
        )
        RETURNING id, organization_id, account_code, account_name, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'finance_coa.template_loaded',
          'finance_account',
          id::text,
          jsonb_build_object('account_code', account_code, 'account_name', account_name, 'status', status)
        FROM created
        RETURNING id
      )
      SELECT created.id::text AS id, created.account_code AS reference_no
      FROM created
      INNER JOIN audit ON true
    `;
    inserted = rowsFromResult<MutationRow>(result);
  } catch (reason) {
    fail("finance-coa-template", reason);
    redirect(accountPath("error"));
  }

  if (!inserted.length) redirect(accountPath("accounts-already-exist"));
  refreshFinance();
  redirect(accountPath("template-loaded"));
}

export async function createFinanceAccount(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:accounts:write")) redirect("/app");

  const code = normalize(String(formData.get("account_code") ?? ""));
  const name = normalize(String(formData.get("account_name") ?? ""));
  const type = String(formData.get("account_type") ?? "").trim();
  const normal = String(formData.get("normal_balance") ?? "").trim();
  const group = normalize(String(formData.get("group_label") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (
    !/^[0-9]+-[0-9]{3,6}$/.test(code) ||
    name.length < 2 || name.length > 180 ||
    !ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number]) ||
    !NORMAL_BALANCES.includes(normal as (typeof NORMAL_BALANCES)[number]) ||
    group.length < 2 || group.length > 120 ||
    note.length > 2000
  ) {
    redirect(accountPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.finance_accounts (
          organization_id, account_code, account_name, account_type,
          normal_balance, group_label, note, status, is_postable,
          created_by, updated_by
        )
        VALUES (
          ${identity.organizationId},
          ${code},
          ${name},
          ${type},
          ${normal},
          ${group},
          NULLIF(${note}, ''),
          'draft',
          true,
          ${identity.userId},
          ${identity.userId}
        )
        RETURNING id, organization_id, account_code, account_name, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_account.created',
          'finance_account', id::text,
          jsonb_build_object('account_code', account_code, 'account_name', account_name, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.account_code AS reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("finance-account-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("finance_accounts_organization_id_account_code_key")) {
      redirect(accountPath("duplicate-account-code"));
    }
    redirect(accountPath("error"));
  }

  if (!created) redirect(accountPath("error"));
  refreshFinance();
  redirect(accountPath("account-created"));
}

export async function updateDraftFinanceAccount(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:accounts:write")) redirect("/app");

  const accountId = String(formData.get("account_id") ?? "").trim();
  const name = normalize(String(formData.get("account_name") ?? ""));
  const type = String(formData.get("account_type") ?? "").trim();
  const normal = String(formData.get("normal_balance") ?? "").trim();
  const group = normalize(String(formData.get("group_label") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (
    !validUuid(accountId) ||
    name.length < 2 || name.length > 180 ||
    !ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number]) ||
    !NORMAL_BALANCES.includes(normal as (typeof NORMAL_BALANCES)[number]) ||
    group.length < 2 || group.length > 120 ||
    note.length > 2000
  ) {
    redirect(accountPath("invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_accounts
        SET
          account_name = ${name},
          account_type = ${type},
          normal_balance = ${normal},
          group_label = ${group},
          note = NULLIF(${note}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${accountId}
          AND organization_id = ${identity.organizationId}
          AND status = 'draft'
        RETURNING id, organization_id, account_code, account_name, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_account.draft_updated',
          'finance_account', id::text,
          jsonb_build_object('account_code', account_code, 'account_name', account_name, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-account-draft-update", reason);
    redirect(accountPath("error"));
  }

  if (!changed) redirect(accountPath("account-not-draft"));
  refreshFinance();
  redirect(accountPath("account-updated"));
}

export async function updateFinanceAccountStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:accounts:approve")) redirect("/app");

  const accountId = String(formData.get("account_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!validUuid(accountId) || !["active","archived"].includes(status)) {
    redirect(accountPath("invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_accounts AS account
        SET status = ${status}, updated_by = ${identity.userId}, updated_at = now()
        WHERE account.id = ${accountId}
          AND account.organization_id = ${identity.organizationId}
          AND account.status <> 'archived'
          AND (
            ${status} <> 'archived'
            OR (
              NOT EXISTS (
                SELECT 1
                FROM v9.finance_journal_lines AS line
                WHERE line.organization_id = account.organization_id
                  AND line.account_id = account.id
              )
              AND NOT EXISTS (
                SELECT 1
                FROM v9.finance_cash_accounts AS cash_account
                WHERE cash_account.organization_id = account.organization_id
                  AND cash_account.ledger_account_id = account.id
              )
            )
          )
        RETURNING account.id, account.organization_id, account.account_code, account.account_name, account.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_account.status.' || status,
          'finance_account', id::text,
          jsonb_build_object('account_code', account_code, 'account_name', account_name, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-account-status", reason);
    redirect(accountPath("account-status-blocked"));
  }

  if (!changed) redirect(accountPath("account-status-blocked"));
  refreshFinance();
  redirect(accountPath("account-status-updated"));
}


export async function createFinanceCashAccount(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:accounts:write")) redirect("/app");

  const ledgerAccountId = String(formData.get("ledger_account_id") ?? "").trim();
  const kind = String(formData.get("account_kind") ?? "").trim();
  const displayName = normalize(String(formData.get("display_name") ?? ""));
  const institutionName = normalize(String(formData.get("institution_name") ?? ""));
  const holderLabel = normalize(String(formData.get("account_holder_label") ?? ""));
  const last4 = String(formData.get("account_number_last4") ?? "").trim();
  const currency = String(formData.get("currency_code") ?? "IDR").trim().toUpperCase();

  if (
    !validUuid(ledgerAccountId) ||
    !["cash", "bank", "e_wallet"].includes(kind) ||
    displayName.length < 2 || displayName.length > 160 ||
    (kind !== "cash" && (institutionName.length < 2 || institutionName.length > 160)) ||
    holderLabel.length > 160 ||
    (last4 && !/^\d{4}$/.test(last4)) ||
    currency !== "IDR"
  ) {
    redirect(cashBankPath("mapping-invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH eligible AS MATERIALIZED (
        SELECT account.id
        FROM v9.finance_accounts AS account
        WHERE account.id = ${ledgerAccountId}
          AND account.organization_id = ${identity.organizationId}
          AND account.account_type = 'aset'
          AND account.normal_balance = 'debit'
          AND account.status = 'active'
          AND account.is_postable = true
          AND NOT EXISTS (
            SELECT 1
            FROM v9.finance_cash_accounts AS cash_account
            WHERE cash_account.organization_id = account.organization_id
              AND cash_account.ledger_account_id = account.id
              AND cash_account.status <> 'active'
          )
      ),
      inserted AS (
        INSERT INTO v9.finance_cash_accounts (
          organization_id, ledger_account_id, account_kind, display_name,
          institution_name, account_holder_label, account_number_last4,
          currency_code, status, created_by, updated_by
        )
        SELECT
          ${identity.organizationId},
          eligible.id,
          ${kind},
          ${displayName},
          CASE WHEN ${kind} = 'cash' THEN NULL ELSE ${institutionName} END,
          NULLIF(${holderLabel}, ''),
          CASE WHEN ${kind} = 'cash' THEN NULL ELSE NULLIF(${last4}, '') END,
          ${currency},
          'draft',
          ${identity.userId},
          ${identity.userId}
        FROM eligible
        RETURNING id, organization_id, ledger_account_id, account_kind,
          display_name, institution_name, account_number_last4, currency_code, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'finance_cash_account.created',
          'finance_cash_account',
          id::text,
          jsonb_build_object(
            'ledger_account_id', ledger_account_id,
            'account_kind', account_kind,
            'display_name', display_name,
            'institution_name', institution_name,
            'account_number_last4', account_number_last4,
            'currency_code', currency_code,
            'status', status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.display_name AS reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("finance-cash-account-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("finance_cash_accounts_organization_id_ledger_account_id_key")) {
      redirect(cashBankPath("mapping-already-exists"));
    }
    redirect(cashBankPath("mapping-error"));
  }

  if (!created) redirect(cashBankPath("ledger-account-unavailable"));
  refreshFinance();
  redirect(cashBankPath("mapping-created"));
}

export async function updateFinanceCashAccountStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:accounts:approve")) redirect("/app");

  const cashAccountId = String(formData.get("cash_account_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!validUuid(cashAccountId) || !["active", "inactive"].includes(status)) {
    redirect(cashBankPath("mapping-invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_cash_accounts
        SET status = ${status}, updated_by = ${identity.userId}, updated_at = now()
        WHERE id = ${cashAccountId}
          AND organization_id = ${identity.organizationId}
          AND status <> ${status}
        RETURNING id, organization_id, ledger_account_id, account_kind,
          display_name, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'finance_cash_account.status.' || status,
          'finance_cash_account',
          id::text,
          jsonb_build_object(
            'ledger_account_id', ledger_account_id,
            'account_kind', account_kind,
            'display_name', display_name,
            'status', status
          )
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-cash-account-status", reason);
    redirect(cashBankPath("mapping-status-blocked"));
  }

  if (!changed) redirect(cashBankPath("mapping-status-blocked"));
  refreshFinance();
  redirect(cashBankPath("mapping-status-updated"));
}

export async function createFinanceJournalDraft(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:write")) redirect("/app");

  const journalDate = String(formData.get("journal_date") ?? "").trim();
  const description = normalize(String(formData.get("description") ?? ""));
  const sourceType = String(formData.get("source_type") ?? "manual").trim();
  const budgetId = String(formData.get("budget_id") ?? "").trim();
  if (budgetId && !validUuid(budgetId)) redirect(financePath("invalid-budget"));
  const sourceReference = normalize(String(formData.get("source_reference") ?? ""));
  const linesText = String(formData.get("lines_json") ?? "[]");
  let lines: { line_number: number; account_id: string; debit: number; credit: number; memo?: string }[];

  try {
    const parsed: unknown = JSON.parse(linesText);
    if (!Array.isArray(parsed)) throw new Error("Journal lines must be an array");
    lines = parsed as typeof lines;
  } catch {
    redirect(financePath("invalid-lines"));
  }

  const seenLineNumbers = new Set<number>();
  if (
    !validDate(journalDate) ||
    description.length < 3 || description.length > 500 ||
    !SOURCES.includes(sourceType as (typeof SOURCES)[number]) ||
    sourceReference.length > 160 ||
    lines.length < 2 || lines.length > 100 || linesText.length > 40000 ||
    lines.some((line) => {
      if (!line || !validUuid(String(line.account_id ?? ""))) return true;
      if (!Number.isInteger(line.line_number) || line.line_number < 1 || line.line_number > 100 || seenLineNumbers.has(line.line_number)) return true;
      seenLineNumbers.add(line.line_number);
      if (line.memo && line.memo.length > 500) return true;
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) return true;
      if (Math.round(debit * 100) !== debit * 100 || Math.round(credit * 100) !== credit * 100) return true;
      if (debit > 9999999999999999 || credit > 9999999999999999) return true;
      return !((debit > 0 && credit === 0) || (credit > 0 && debit === 0));
    })
  ) {
    redirect(financePath("invalid-lines"));
  }

  const idempotencyKey = randomUUID();
  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH input AS MATERIALIZED (
        SELECT item.line_number, item.account_id, item.debit, item.credit, item.memo
        FROM jsonb_to_recordset(${linesText}::jsonb) AS item(
          line_number smallint, account_id uuid, debit numeric, credit numeric, memo text
        )
      ),
      selected_accounts AS MATERIALIZED (
        SELECT
          input.line_number,
          input.account_id,
          input.debit,
          input.credit,
          input.memo
        FROM input
        INNER JOIN v9.finance_accounts AS account
          ON account.id = input.account_id
          AND account.organization_id = ${identity.organizationId}
          AND account.status = 'active'
          AND account.is_postable = true
          AND NOT EXISTS (
            SELECT 1
            FROM v9.finance_cash_accounts AS cash_account
            WHERE cash_account.organization_id = account.organization_id
              AND cash_account.ledger_account_id = account.id
              AND cash_account.status <> 'active'
          )
          AND (
            account.account_type <> 'beban'
            OR ${budgetId} = ''
            OR EXISTS (
              SELECT 1
              FROM v9.finance_budget_lines AS budget_line
              WHERE budget_line.organization_id = account.organization_id
                AND budget_line.budget_id = NULLIF(${budgetId}, '')::uuid
                AND budget_line.account_id = account.id
            )
          )
      ),
      valid_budget AS MATERIALIZED (
        SELECT budget.id
        FROM v9.finance_budgets AS budget
        WHERE ${budgetId} <> ''
          AND budget.id = NULLIF(${budgetId}, '')::uuid
          AND budget.organization_id = ${identity.organizationId}
          AND budget.status = 'approved'
          AND ${journalDate}::date BETWEEN budget.period_start AND budget.period_end
      ),
      inserted AS (
        INSERT INTO v9.finance_journals (
          organization_id, journal_date, description, source_type,
          source_reference, budget_id, idempotency_key, status, created_by
        )
        SELECT
          ${identity.organizationId},
          ${journalDate}::date,
          ${description},
          ${sourceType},
          NULLIF(${sourceReference}, ''),
          NULLIF(${budgetId}, '')::uuid,
          ${idempotencyKey},
          'draft',
          ${identity.userId}
        WHERE (SELECT count(*) FROM selected_accounts) = (SELECT count(*) FROM input)
          AND (${budgetId} = '' OR EXISTS (SELECT 1 FROM valid_budget))
        RETURNING id, organization_id, reference_no, journal_date, description, status
      ),
      inserted_lines AS (
        INSERT INTO v9.finance_journal_lines (
          organization_id, journal_id, account_id, line_number, memo, debit, credit
        )
        SELECT
          inserted.organization_id,
          inserted.id,
          selected_accounts.account_id,
          selected_accounts.line_number,
          NULLIF(selected_accounts.memo, ''),
          selected_accounts.debit,
          selected_accounts.credit
        FROM inserted
        CROSS JOIN selected_accounts
        RETURNING journal_id, debit, credit
      ),
      totals AS (
        SELECT
          journal_id,
          sum(debit)::numeric(18,2) AS debit_total,
          sum(credit)::numeric(18,2) AS credit_total
        FROM inserted_lines
        GROUP BY journal_id
      ),
      updated AS (
        UPDATE v9.finance_journals AS journal
        SET
          total_debit = totals.debit_total,
          total_credit = totals.credit_total,
          updated_at = now()
        FROM totals
        WHERE journal.id = totals.journal_id
          AND journal.organization_id = ${identity.organizationId}
        RETURNING journal.id, journal.organization_id, journal.reference_no,
          journal.journal_date, journal.description, journal.status,
          journal.total_debit, journal.total_credit
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_journal.draft_created',
          'finance_journal', id::text,
          jsonb_build_object('reference_no', reference_no, 'journal_date', journal_date,
            'description', description, 'status', status, 'total_debit', total_debit,
            'total_credit', total_credit)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id, updated.reference_no
      FROM updated
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("finance-journal-create", reason);
    redirect(financePath("error"));
  }

  if (!created) redirect(financePath(budgetId ? "budget-or-account-unavailable" : "account-unavailable"));
  refreshFinance();
  redirect(financePath("journal-created", created.id));
}

export async function submitFinanceJournal(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:write")) redirect("/app");

  const journalId = String(formData.get("journal_id") ?? "").trim();
  if (!validUuid(journalId)) redirect(financePath("invalid", journalId));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_journals AS journal
        SET status = 'submitted',
          submitted_by = ${identity.userId},
          submitted_at = now(),
          updated_at = now()
        WHERE journal.id = ${journalId}
          AND journal.organization_id = ${identity.organizationId}
          AND journal.status = 'draft'
          AND (
            journal.source_type = 'reversal'
            OR NOT EXISTS (
              SELECT 1
              FROM v9.finance_journal_lines AS line
              INNER JOIN v9.finance_cash_accounts AS cash_account
                ON cash_account.organization_id = line.organization_id
                AND cash_account.ledger_account_id = line.account_id
              WHERE line.organization_id = journal.organization_id
                AND line.journal_id = journal.id
                AND cash_account.status <> 'active'
            )
          )
        RETURNING journal.id, journal.organization_id, journal.reference_no, journal.status,
          journal.total_debit, journal.total_credit
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_journal.submitted',
          'finance_journal', id::text,
          jsonb_build_object('reference_no', reference_no, 'status', status,
            'total_debit', total_debit, 'total_credit', total_credit)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-journal-submit", reason);
    redirect(financePath("journal-not-balanced", journalId));
  }

  if (!changed) redirect(financePath("journal-not-draft", journalId));
  refreshFinance();
  redirect(financePath("journal-submitted", journalId));
}

export async function reviewFinanceJournal(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:approve")) redirect("/app");

  const journalId = String(formData.get("journal_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = String(formData.get("review_note") ?? "").trim();
  const returnToPengurus = formData.get("return_to") === "pengurus";
  const returnPath = (result: string) =>
    returnToPengurus
      ? `/app/pengurus/persetujuan?result=${encodeURIComponent(result)}`
      : financePath(result, journalId);

  if (
    !validUuid(journalId) ||
    !["approved", "rejected"].includes(decision) ||
    (decision === "rejected" && reviewNote.length < 3) ||
    reviewNote.length > 2000
  ) {
    redirect(returnPath("invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_journals AS journal
        SET
          status = ${decision},
          approved_by = CASE WHEN ${decision} = 'approved' THEN ${identity.userId}::uuid ELSE NULL END,
          approved_at = CASE WHEN ${decision} = 'approved' THEN now() ELSE NULL END,
          rejected_by = CASE WHEN ${decision} = 'rejected' THEN ${identity.userId}::uuid ELSE NULL END,
          rejected_at = CASE WHEN ${decision} = 'rejected' THEN now() ELSE NULL END,
          review_note = CASE WHEN ${decision} = 'rejected' THEN ${reviewNote} ELSE NULL END,
          updated_at = now()
        WHERE journal.id = ${journalId}
          AND journal.organization_id = ${identity.organizationId}
          AND journal.status = 'submitted'
          AND journal.created_by <> ${identity.userId}
          AND (
            ${decision} = 'rejected'
            OR journal.source_type = 'reversal'
            OR NOT EXISTS (
            SELECT 1
            FROM v9.finance_journal_lines AS line
            INNER JOIN v9.finance_cash_accounts AS cash_account
              ON cash_account.organization_id = line.organization_id
              AND cash_account.ledger_account_id = line.account_id
            WHERE line.organization_id = journal.organization_id
              AND line.journal_id = journal.id
              AND cash_account.status <> 'active'
          )
          )
        RETURNING journal.id, journal.organization_id, journal.reference_no, journal.status, journal.created_by,
          journal.approved_by, journal.rejected_by, journal.review_note, journal.total_debit, journal.total_credit
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_journal.' || status,
          'finance_journal', id::text,
          jsonb_build_object('reference_no', reference_no, 'status', status,
            'created_by', created_by, 'approved_by', approved_by,
            'rejected_by', rejected_by, 'review_note', review_note,
            'total_debit', total_debit, 'total_credit', total_credit)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-journal-review", reason);
    redirect(returnPath("review-failed"));
  }

  if (!changed) redirect(returnPath("review-not-eligible"));
  refreshFinance();
  redirect(returnPath(decision === "approved" ? "journal-approved" : "journal-rejected"));
}

export async function postFinanceJournal(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:post")) redirect("/app");

  const journalId = String(formData.get("journal_id") ?? "").trim();
  if (!validUuid(journalId)) redirect(financePath("invalid", journalId));

  let posted = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_journals AS journal
        SET status = 'posted',
          posted_by = ${identity.userId}::uuid,
          posted_at = now(),
          updated_at = now()
        WHERE journal.id = ${journalId}
          AND journal.organization_id = ${identity.organizationId}
          AND journal.status = 'approved'
          AND (
            journal.source_type = 'reversal'
            OR NOT EXISTS (
              SELECT 1
              FROM v9.finance_journal_lines AS line
              INNER JOIN v9.finance_cash_accounts AS cash_account
                ON cash_account.organization_id = line.organization_id
                AND cash_account.ledger_account_id = line.account_id
              WHERE line.organization_id = journal.organization_id
                AND line.journal_id = journal.id
                AND cash_account.status <> 'active'
            )
          )
        RETURNING journal.id, journal.organization_id, journal.reference_no, journal.journal_date,
          journal.description, journal.status, journal.total_debit, journal.total_credit, journal.approved_by
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_journal.posted',
          'finance_journal', id::text,
          jsonb_build_object('reference_no', reference_no, 'journal_date', journal_date,
            'description', description, 'status', status, 'total_debit', total_debit,
            'total_credit', total_credit, 'approved_by', approved_by)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    posted = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-journal-post", reason);
    redirect(financePath("posting-blocked", journalId));
  }

  if (!posted) redirect(financePath("journal-not-approved", journalId));
  refreshFinance();
  redirect(financePath("journal-posted", journalId));
}

export async function reopenRejectedFinanceJournal(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:write")) redirect("/app");

  const journalId = String(formData.get("journal_id") ?? "").trim();
  if (!validUuid(journalId)) redirect(financePath("invalid", journalId));

  let reopened = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_journals
        SET status = 'draft',
          submitted_by = NULL,
          submitted_at = NULL,
          rejected_by = NULL,
          rejected_at = NULL,
          review_note = NULL,
          updated_at = now()
        WHERE id = ${journalId}
          AND organization_id = ${identity.organizationId}
          AND status = 'rejected'
          AND created_by = ${identity.userId}
        RETURNING id, organization_id, reference_no, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_journal.reopened',
          'finance_journal', id::text,
          jsonb_build_object('reference_no', reference_no, 'status', status)
        FROM updated RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    reopened = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-journal-reopen", reason);
    redirect(financePath("error", journalId));
  }

  if (!reopened) redirect(financePath("journal-not-rejected-or-not-owner", journalId));
  refreshFinance();
  redirect(financePath("journal-reopened", journalId));
}


export async function updateDraftFinanceJournal(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:write")) redirect("/app");

  const journalId = String(formData.get("journal_id") ?? "").trim();
  const journalDate = String(formData.get("journal_date") ?? "").trim();
  const description = normalize(String(formData.get("description") ?? ""));
  const sourceType = String(formData.get("source_type") ?? "manual").trim();
  const sourceReference = normalize(String(formData.get("source_reference") ?? ""));
  const budgetId = String(formData.get("budget_id") ?? "").trim();
  if (budgetId && !validUuid(budgetId)) redirect(financePath("invalid-budget", journalId));
  const linesText = String(formData.get("lines_json") ?? "[]");
  let lines: { line_number: number; account_id: string; debit: number; credit: number; memo?: string }[];

  try {
    const parsed: unknown = JSON.parse(linesText);
    if (!Array.isArray(parsed)) throw new Error("Journal lines must be an array");
    lines = parsed as typeof lines;
  } catch {
    redirect(financePath("invalid-lines", journalId));
  }

  const seenLineNumbers = new Set<number>();
  if (
    !validUuid(journalId) ||
    !validDate(journalDate) ||
    description.length < 3 || description.length > 500 ||
    !SOURCES.includes(sourceType as (typeof SOURCES)[number]) ||
    sourceReference.length > 160 ||
    lines.length < 2 || lines.length > 100 || linesText.length > 40000 ||
    lines.some((line) => {
      if (!line || !validUuid(String(line.account_id ?? ""))) return true;
      if (!Number.isInteger(line.line_number) || line.line_number < 1 || line.line_number > 100 || seenLineNumbers.has(line.line_number)) return true;
      seenLineNumbers.add(line.line_number);
      if (line.memo && line.memo.length > 500) return true;
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) return true;
      if (Math.round(debit * 100) !== debit * 100 || Math.round(credit * 100) !== credit * 100) return true;
      if (debit > 9999999999999999 || credit > 9999999999999999) return true;
      return !((debit > 0 && credit === 0) || (credit > 0 && debit === 0));
    })
  ) {
    redirect(financePath("invalid-lines", journalId));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH locked_journal AS MATERIALIZED (
        SELECT journal.id, journal.organization_id
        FROM v9.finance_journals AS journal
        WHERE journal.id = ${journalId}
          AND journal.organization_id = ${identity.organizationId}
          AND journal.created_by = ${identity.userId}
          AND journal.status = 'draft'
        FOR UPDATE
      ),
      input AS MATERIALIZED (
        SELECT item.line_number, item.account_id, item.debit, item.credit, item.memo
        FROM jsonb_to_recordset(${linesText}::jsonb) AS item(
          line_number smallint, account_id uuid, debit numeric, credit numeric, memo text
        )
      ),
      selected_accounts AS MATERIALIZED (
        SELECT
          input.line_number,
          input.account_id,
          input.debit,
          input.credit,
          input.memo
        FROM input
        INNER JOIN v9.finance_accounts AS account
          ON account.id = input.account_id
          AND account.organization_id = ${identity.organizationId}
          AND account.status = 'active'
          AND account.is_postable = true
          AND NOT EXISTS (
            SELECT 1
            FROM v9.finance_cash_accounts AS cash_account
            WHERE cash_account.organization_id = account.organization_id
              AND cash_account.ledger_account_id = account.id
              AND cash_account.status <> 'active'
          )
          AND (
            account.account_type <> 'beban'
            OR ${budgetId} = ''
            OR EXISTS (
              SELECT 1
              FROM v9.finance_budget_lines AS budget_line
              WHERE budget_line.organization_id = account.organization_id
                AND budget_line.budget_id = NULLIF(${budgetId}, '')::uuid
                AND budget_line.account_id = account.id
            )
          )
      ),
      valid_budget AS MATERIALIZED (
        SELECT budget.id
        FROM v9.finance_budgets AS budget
        WHERE ${budgetId} <> ''
          AND budget.id = NULLIF(${budgetId}, '')::uuid
          AND budget.organization_id = ${identity.organizationId}
          AND budget.status = 'approved'
          AND ${journalDate}::date BETWEEN budget.period_start AND budget.period_end
      ),
      deleted_lines AS (
        DELETE FROM v9.finance_journal_lines AS line
        USING locked_journal
        WHERE line.journal_id = locked_journal.id
          AND line.organization_id = locked_journal.organization_id
          AND (SELECT count(*) FROM selected_accounts) = (SELECT count(*) FROM input)
        RETURNING line.id
      ),
      inserted_lines AS (
        INSERT INTO v9.finance_journal_lines (
          organization_id, journal_id, account_id, line_number, memo, debit, credit
        )
        SELECT
          locked_journal.organization_id,
          locked_journal.id,
          selected_accounts.account_id,
          selected_accounts.line_number,
          NULLIF(selected_accounts.memo, ''),
          selected_accounts.debit,
          selected_accounts.credit
        FROM locked_journal
        CROSS JOIN selected_accounts
        WHERE (SELECT count(*) FROM selected_accounts) = (SELECT count(*) FROM input)
          AND (SELECT count(*) FROM deleted_lines) >= 0
        RETURNING journal_id, debit, credit
      ),
      totals AS (
        SELECT
          journal_id,
          sum(debit)::numeric(18,2) AS debit_total,
          sum(credit)::numeric(18,2) AS credit_total,
          count(*)::int AS line_count
        FROM inserted_lines
        GROUP BY journal_id
      ),
      changed AS (
        UPDATE v9.finance_journals AS journal
        SET
          journal_date = ${journalDate}::date,
          description = ${description},
          source_type = ${sourceType},
          source_reference = NULLIF(${sourceReference}, ''),
          budget_id = NULLIF(${budgetId}, '')::uuid,
          total_debit = totals.debit_total,
          total_credit = totals.credit_total,
          updated_at = now()
        FROM locked_journal
        INNER JOIN totals ON totals.journal_id = locked_journal.id
        WHERE journal.id = locked_journal.id
          AND journal.organization_id = locked_journal.organization_id
          AND journal.status = 'draft'
          AND totals.line_count = (SELECT count(*) FROM input)
          AND (${budgetId} = '' OR EXISTS (SELECT 1 FROM valid_budget))
        RETURNING journal.id, journal.organization_id, journal.reference_no,
          journal.journal_date, journal.description, journal.status,
          journal.total_debit, journal.total_credit
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'finance_journal.draft_updated',
          'finance_journal',
          id::text,
          jsonb_build_object('reference_no', reference_no, 'journal_date', journal_date,
            'description', description, 'status', status,
            'total_debit', total_debit, 'total_credit', total_credit)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-journal-draft-update", reason);
    redirect(financePath("error", journalId));
  }

  if (!updated) redirect(financePath("journal-not-draft-or-account-unavailable", journalId));
  refreshFinance();
  redirect(financePath("journal-updated", journalId));
}


export async function createFinanceReversalJournal(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:write")) redirect("/app");

  const originalJournalId = String(formData.get("journal_id") ?? "").trim();
  const reversalDate = String(formData.get("journal_date") ?? "").trim();
  const reason = normalize(String(formData.get("reason") ?? ""));

  if (
    !validUuid(originalJournalId) ||
    !validDate(reversalDate) ||
    reason.length < 3 || reason.length > 400
  ) {
    redirect(financePath("invalid-reversal", originalJournalId));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH original AS MATERIALIZED (
        SELECT
          journal.id,
          journal.organization_id,
          journal.reference_no,
          journal.description,
          journal.budget_id
        FROM v9.finance_journals AS journal
        WHERE journal.id = ${originalJournalId}
          AND journal.organization_id = ${identity.organizationId}
          AND journal.status = 'posted'
          AND journal.source_type <> 'reversal'
          AND NOT EXISTS (
            SELECT 1
            FROM v9.finance_journals AS existing_reversal
            WHERE existing_reversal.reversal_of_id = journal.id
              AND existing_reversal.organization_id = journal.organization_id
          )
        FOR UPDATE
      ),
      original_lines AS MATERIALIZED (
        SELECT
          line.account_id,
          line.line_number,
          line.memo,
          line.debit,
          line.credit
        FROM v9.finance_journal_lines AS line
        INNER JOIN original
          ON original.id = line.journal_id
          AND original.organization_id = line.organization_id
      ),
      inserted AS (
        INSERT INTO v9.finance_journals (
          organization_id, journal_date, description, source_type,
          source_reference, budget_id, idempotency_key, status, reversal_of_id, created_by
        )
        SELECT
          original.organization_id,
          ${reversalDate}::date,
          'Pembalik ' || original.reference_no || ': ' || ${reason},
          'reversal',
          original.reference_no,
          original.budget_id,
          ${randomUUID()},
          'draft',
          original.id,
          ${identity.userId}
        FROM original
        WHERE (SELECT count(*) FROM original_lines) >= 2
        RETURNING id, organization_id, reference_no, journal_date,
          description, status, reversal_of_id
      ),
      inserted_lines AS (
        INSERT INTO v9.finance_journal_lines (
          organization_id, journal_id, account_id, line_number, memo, debit, credit
        )
        SELECT
          inserted.organization_id,
          inserted.id,
          original_lines.account_id,
          original_lines.line_number,
          concat_ws(' · ', 'Pembalik', NULLIF(original_lines.memo, '')),
          original_lines.credit,
          original_lines.debit
        FROM inserted
        CROSS JOIN original_lines
        RETURNING journal_id, debit, credit
      ),
      totals AS (
        SELECT
          journal_id,
          sum(debit)::numeric(18,2) AS debit_total,
          sum(credit)::numeric(18,2) AS credit_total,
          count(*)::int AS line_count
        FROM inserted_lines
        GROUP BY journal_id
      ),
      updated AS (
        UPDATE v9.finance_journals AS journal
        SET
          total_debit = totals.debit_total,
          total_credit = totals.credit_total,
          updated_at = now()
        FROM inserted
        INNER JOIN totals ON totals.journal_id = inserted.id
        WHERE journal.id = inserted.id
          AND journal.organization_id = inserted.organization_id
          AND totals.line_count = (SELECT count(*) FROM original_lines)
        RETURNING journal.id, journal.organization_id, journal.reference_no,
          journal.journal_date, journal.description, journal.status,
          journal.total_debit, journal.total_credit, journal.reversal_of_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'finance_journal.reversal_draft_created',
          'finance_journal',
          id::text,
          jsonb_build_object('reference_no', reference_no, 'journal_date', journal_date,
            'description', description, 'status', status, 'total_debit', total_debit,
            'total_credit', total_credit, 'reversal_of_id', reversal_of_id)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id, updated.reference_no
      FROM updated
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reasonError) {
    fail("finance-journal-reversal-create", reasonError);
    const message = reasonError instanceof Error ? reasonError.message.toLowerCase() : "";
    if (message.includes("finance_journals_reversal_of_id_key")) {
      redirect(financePath("reversal-already-exists", originalJournalId));
    }
    redirect(financePath("reversal-error", originalJournalId));
  }

  if (!created) redirect(financePath("reversal-not-eligible", originalJournalId));
  refreshFinance();
  redirect(financePath("reversal-draft-created", created.id));
}


export async function createFinanceBudget(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:budget:write")) redirect("/app");

  const code = normalize(String(formData.get("budget_code") ?? ""));
  const title = normalize(String(formData.get("title") ?? ""));
  const fiscalYear = Number(formData.get("fiscal_year"));
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  const fundingSource = normalize(String(formData.get("funding_source") ?? ""));
  const responsible = normalize(String(formData.get("responsible_label") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const linesText = String(formData.get("lines_json") ?? "[]");
  const lines = parseFinanceBudgetLines(linesText);

  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(code) ||
    title.length < 3 || title.length > 180 ||
    !Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100 ||
    !validDate(periodStart) || !validDate(periodEnd) || periodStart > periodEnd ||
    fundingSource.length > 160 || responsible.length > 160 || notes.length > 2000 ||
    !lines
  ) {
    redirect(budgetPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.finance_budgets (
          organization_id, budget_code, title, fiscal_year,
          period_start, period_end, funding_source, responsible_label,
          notes, status, created_by
        )
        VALUES (
          ${identity.organizationId}, ${code}, ${title}, ${fiscalYear},
          ${periodStart}::date, ${periodEnd}::date,
          NULLIF(${fundingSource}, ''), NULLIF(${responsible}, ''),
          NULLIF(${notes}, ''), 'draft', ${identity.userId}
        )
        RETURNING id, organization_id, budget_code, title, fiscal_year,
          period_start, period_end, funding_source, responsible_label, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_budget.created',
          'finance_budget', id::text,
          jsonb_build_object(
            'budget_code', budget_code, 'title', title, 'fiscal_year', fiscal_year,
            'period_start', period_start, 'period_end', period_end,
            'funding_source', funding_source, 'responsible_label', responsible_label,
            'status', status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.budget_code AS reference_no
      FROM inserted INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
    if (!created) redirect(budgetPath("invalid"));
    const lineInsertResult = await sql`
      WITH input AS MATERIALIZED (
        SELECT item.line_number, item.account_id, item.description,
          item.planned_amount, item.note
        FROM jsonb_to_recordset(${JSON.stringify(lines)}::jsonb) AS item(
          line_number smallint, account_id uuid, description text,
          planned_amount numeric, note text
        )
      ),
      eligible AS MATERIALIZED (
        SELECT input.*
        FROM input
        INNER JOIN v9.finance_accounts AS account
          ON account.id = input.account_id
          AND account.organization_id = ${identity.organizationId}
          AND account.account_type = 'beban'
          AND account.normal_balance = 'debit'
          AND account.status = 'active'
          AND account.is_postable = true
      ),
      inserted AS (
        INSERT INTO v9.finance_budget_lines (
          organization_id, budget_id, line_number, account_id,
          description, planned_amount, note
        )
        SELECT
          ${identity.organizationId}, ${created.id}::uuid,
          eligible.line_number, eligible.account_id, eligible.description,
          eligible.planned_amount, NULLIF(eligible.note, '')
        FROM eligible
        WHERE (SELECT count(*) FROM eligible) = (SELECT count(*) FROM input)
        RETURNING id
      )
      SELECT count(*)::int AS inserted_count FROM inserted
    `;
    const insertedCount = Number(rowsFromResult<{ inserted_count: number }>(lineInsertResult)[0]?.inserted_count ?? 0);
    if (insertedCount !== lines.length) redirect(budgetPath("lines-invalid", created.id));
  } catch (reason) {
    fail("finance-budget-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("finance_budgets_organization_id_budget_code_key")) {
      redirect(budgetPath("duplicate-code"));
    }
    redirect(budgetPath(created ? "lines-invalid" : "error", created?.id));
  }

  refreshFinance();
  redirect(budgetPath("budget-created", created.id));
}

export async function updateDraftFinanceBudget(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:budget:write")) redirect("/app");

  const budgetId = String(formData.get("budget_id") ?? "").trim();
  const code = normalize(String(formData.get("budget_code") ?? ""));
  const title = normalize(String(formData.get("title") ?? ""));
  const fiscalYear = Number(formData.get("fiscal_year"));
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  const fundingSource = normalize(String(formData.get("funding_source") ?? ""));
  const responsible = normalize(String(formData.get("responsible_label") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const linesText = String(formData.get("lines_json") ?? "[]");
  const lines = parseFinanceBudgetLines(linesText);

  if (
    !validUuid(budgetId) ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(code) ||
    title.length < 3 || title.length > 180 ||
    !Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100 ||
    !validDate(periodStart) || !validDate(periodEnd) || periodStart > periodEnd ||
    fundingSource.length > 160 || responsible.length > 160 || notes.length > 2000 ||
    !lines
  ) {
    redirect(budgetPath("invalid", budgetId));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH locked_budget AS MATERIALIZED (
        SELECT budget.id, budget.organization_id
        FROM v9.finance_budgets AS budget
        WHERE budget.id = ${budgetId}
          AND budget.organization_id = ${identity.organizationId}
          AND budget.created_by = ${identity.userId}
          AND budget.status = 'draft'
        FOR UPDATE
      ),
      input AS MATERIALIZED (
        SELECT item.line_number, item.account_id, item.description,
          item.planned_amount, item.note
        FROM jsonb_to_recordset(${JSON.stringify(lines)}::jsonb) AS item(
          line_number smallint, account_id uuid, description text,
          planned_amount numeric, note text
        )
      ),
      eligible AS MATERIALIZED (
        SELECT input.*
        FROM input
        INNER JOIN v9.finance_accounts AS account
          ON account.id = input.account_id
          AND account.organization_id = ${identity.organizationId}
          AND account.account_type = 'beban'
          AND account.normal_balance = 'debit'
          AND account.status = 'active'
          AND account.is_postable = true
      ),
      deleted AS (
        DELETE FROM v9.finance_budget_lines AS line
        USING locked_budget
        WHERE line.budget_id = locked_budget.id
          AND line.organization_id = locked_budget.organization_id
          AND (SELECT count(*) FROM eligible) = (SELECT count(*) FROM input)
        RETURNING line.id
      ),
      inserted AS (
        INSERT INTO v9.finance_budget_lines (
          organization_id, budget_id, line_number, account_id,
          description, planned_amount, note
        )
        SELECT
          locked_budget.organization_id, locked_budget.id,
          eligible.line_number, eligible.account_id, eligible.description,
          eligible.planned_amount, NULLIF(eligible.note, '')
        FROM locked_budget
        CROSS JOIN eligible
        WHERE (SELECT count(*) FROM eligible) = (SELECT count(*) FROM input)
          AND (SELECT count(*) FROM deleted) >= 0
        RETURNING id
      ),
      changed AS (
        UPDATE v9.finance_budgets AS budget
        SET budget_code = ${code},
          title = ${title},
          fiscal_year = ${fiscalYear},
          period_start = ${periodStart}::date,
          period_end = ${periodEnd}::date,
          funding_source = NULLIF(${fundingSource}, ''),
          responsible_label = NULLIF(${responsible}, ''),
          notes = NULLIF(${notes}, ''),
          updated_at = now()
        FROM locked_budget
        WHERE budget.id = locked_budget.id
          AND budget.organization_id = locked_budget.organization_id
          AND (SELECT count(*) FROM inserted) = (SELECT count(*) FROM input)
        RETURNING budget.id, budget.organization_id, budget.budget_code, budget.title,
          budget.fiscal_year, budget.period_start, budget.period_end,
          budget.funding_source, budget.responsible_label, budget.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_budget.draft_updated',
          'finance_budget', id::text,
          jsonb_build_object('budget_code', budget_code, 'title', title,
            'fiscal_year', fiscal_year, 'period_start', period_start,
            'period_end', period_end, 'funding_source', funding_source,
            'responsible_label', responsible_label, 'status', status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-budget-update", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("finance_budgets_organization_id_budget_code_key")) {
      redirect(budgetPath("duplicate-code", budgetId));
    }
    redirect(budgetPath("update-error", budgetId));
  }

  if (!updated) redirect(budgetPath("not-draft-or-account-unavailable", budgetId));
  refreshFinance();
  redirect(budgetPath("budget-updated", budgetId));
}

export async function submitFinanceBudget(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:budget:write")) redirect("/app");
  const budgetId = String(formData.get("budget_id") ?? "").trim();
  if (!validUuid(budgetId)) redirect(budgetPath("invalid", budgetId));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_budgets AS budget
        SET status = 'submitted',
          submitted_by = ${identity.userId},
          submitted_at = now(),
          updated_at = now()
        WHERE budget.id = ${budgetId}
          AND budget.organization_id = ${identity.organizationId}
          AND budget.status = 'draft'
          AND budget.created_by = ${identity.userId}
          AND EXISTS (
            SELECT 1 FROM v9.finance_budget_lines AS line
            WHERE line.budget_id = budget.id
              AND line.organization_id = budget.organization_id
          )
        RETURNING budget.id, budget.organization_id, budget.budget_code,
          budget.title, budget.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_budget.submitted',
          'finance_budget', id::text,
          jsonb_build_object('budget_code', budget_code, 'title', title, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-budget-submit", reason);
    redirect(budgetPath("submit-error", budgetId));
  }
  if (!changed) redirect(budgetPath("submit-blocked", budgetId));
  refreshFinance();
  redirect(budgetPath("budget-submitted", budgetId));
}

export async function reviewFinanceBudget(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:budget:approve")) redirect("/app");
  const budgetId = String(formData.get("budget_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = String(formData.get("review_note") ?? "").trim();

  if (
    !validUuid(budgetId) ||
    !["approved", "rejected"].includes(decision) ||
    (decision === "rejected" && reviewNote.length < 3) ||
    reviewNote.length > 2000
  ) redirect(budgetPath("invalid-review", budgetId));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_budgets AS budget
        SET status = ${decision},
          approved_by = CASE WHEN ${decision} = 'approved' THEN ${identity.userId}::uuid ELSE NULL END,
          approved_at = CASE WHEN ${decision} = 'approved' THEN now() ELSE NULL END,
          rejected_by = CASE WHEN ${decision} = 'rejected' THEN ${identity.userId}::uuid ELSE NULL END,
          rejected_at = CASE WHEN ${decision} = 'rejected' THEN now() ELSE NULL END,
          review_note = CASE WHEN ${decision} = 'rejected' THEN ${reviewNote} ELSE NULL END,
          updated_at = now()
        WHERE budget.id = ${budgetId}
          AND budget.organization_id = ${identity.organizationId}
          AND budget.status = 'submitted'
          AND budget.created_by <> ${identity.userId}
        RETURNING budget.id, budget.organization_id, budget.budget_code,
          budget.title, budget.status, budget.created_by,
          budget.approved_by, budget.rejected_by, budget.review_note
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_budget.' || status,
          'finance_budget', id::text,
          jsonb_build_object('budget_code', budget_code, 'title', title,
            'status', status, 'created_by', created_by,
            'approved_by', approved_by, 'rejected_by', rejected_by,
            'review_note', review_note)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-budget-review", reason);
    redirect(budgetPath("review-error", budgetId));
  }
  if (!changed) redirect(budgetPath("review-not-eligible", budgetId));
  refreshFinance();
  redirect(budgetPath(decision === "approved" ? "budget-approved" : "budget-rejected", budgetId));
}

export async function reopenRejectedFinanceBudget(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:budget:write")) redirect("/app");
  const budgetId = String(formData.get("budget_id") ?? "").trim();
  if (!validUuid(budgetId)) redirect(budgetPath("invalid", budgetId));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_budgets AS budget
        SET status = 'draft',
          submitted_by = NULL,
          submitted_at = NULL,
          rejected_by = NULL,
          rejected_at = NULL,
          review_note = NULL,
          updated_at = now()
        WHERE budget.id = ${budgetId}
          AND budget.organization_id = ${identity.organizationId}
          AND budget.status = 'rejected'
          AND budget.created_by = ${identity.userId}
        RETURNING budget.id, budget.organization_id, budget.budget_code, budget.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_budget.reopened',
          'finance_budget', id::text,
          jsonb_build_object('budget_code', budget_code, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-budget-reopen", reason);
    redirect(budgetPath("reopen-error", budgetId));
  }
  if (!changed) redirect(budgetPath("reopen-not-eligible", budgetId));
  refreshFinance();
  redirect(budgetPath("budget-reopened", budgetId));
}

export async function closeFinanceBudget(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:budget:approve")) redirect("/app");
  const budgetId = String(formData.get("budget_id") ?? "").trim();
  if (!validUuid(budgetId)) redirect(budgetPath("invalid", budgetId));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.finance_budgets AS budget
        SET status = 'closed',
          closed_by = ${identity.userId},
          closed_at = now(),
          updated_at = now()
        WHERE budget.id = ${budgetId}
          AND budget.organization_id = ${identity.organizationId}
          AND budget.status = 'approved'
          AND NOT EXISTS (
            SELECT 1
            FROM v9.finance_journals AS journal
            WHERE journal.organization_id = budget.organization_id
              AND journal.budget_id = budget.id
              AND journal.status <> 'posted'
          )
        RETURNING budget.id, budget.organization_id, budget.budget_code, budget.title, budget.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'finance_budget.closed',
          'finance_budget', id::text,
          jsonb_build_object('budget_code', budget_code, 'title', title, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-budget-close", reason);
    redirect(budgetPath("close-error", budgetId));
  }
  if (!changed) redirect(budgetPath("close-blocked", budgetId));
  refreshFinance();
  redirect(budgetPath("budget-closed", budgetId));
}

export async function createFinanceContributionAllocation(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:write")) redirect("/app");

  const journalId = String(formData.get("journal_id") ?? "").trim();
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const amountText = String(formData.get("allocation_amount") ?? "").trim();
  const amount = Number(amountText);
  const note = normalize(String(formData.get("note") ?? ""));

  if (
    !validUuid(journalId) ||
    !validUuid(membershipId) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100 ||
    amount > 9999999999999999 ||
    note.length > 1000
  ) redirect("/app/keuangan/iuran?result=allocation-invalid");

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.finance_contribution_allocations (
          organization_id, journal_id, membership_id, allocation_amount,
          note, created_by, updated_by
        )
        VALUES (
          ${identity.organizationId}, ${journalId}, ${membershipId},
          ${amount}, NULLIF(${note}, ''), ${identity.userId}, ${identity.userId}
        )
        RETURNING id, organization_id, journal_id, membership_id,
          allocation_amount, note
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId},
          'finance_contribution_allocation.created',
          'finance_contribution_allocation', id::text,
          jsonb_build_object(
            'journal_id', journal_id,
            'membership_id', membership_id,
            'allocation_amount', allocation_amount,
            'note', note
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id FROM inserted INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("finance-contribution-allocation-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("finance_contribution_allocations_organization_id_journal_id_membership_id_key")) {
      redirect("/app/keuangan/iuran?result=allocation-already-exists");
    }
    if (message.includes("exceed the posted contribution revenue")) {
      redirect("/app/keuangan/iuran?result=allocation-exceeds");
    }
    redirect("/app/keuangan/iuran?result=allocation-blocked");
  }

  if (!created) redirect("/app/keuangan/iuran?result=allocation-blocked");
  refreshFinance();
  revalidatePath("/app/anggota/kontribusi");
  redirect("/app/keuangan/iuran?result=allocation-created");
}

export async function updateFinanceContributionAllocation(formData: FormData): Promise<void> {
  const identity = await requireIdentity("finance:read");
  if (!can(identity, "finance:journal:write")) redirect("/app");

  const allocationId = String(formData.get("allocation_id") ?? "").trim();
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const amountText = String(formData.get("allocation_amount") ?? "").trim();
  const amount = Number(amountText);
  const reason = normalize(String(formData.get("correction_note") ?? ""));

  if (
    !validUuid(allocationId) ||
    !validUuid(membershipId) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100 ||
    amount > 9999999999999999 ||
    reason.length < 3 ||
    reason.length > 1000
  ) redirect("/app/keuangan/iuran?result=allocation-invalid");

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT allocation.id, allocation.organization_id, allocation.journal_id,
          allocation.membership_id, allocation.allocation_amount, allocation.note
        FROM v9.finance_contribution_allocations AS allocation
        WHERE allocation.id = ${allocationId}
          AND allocation.organization_id = ${identity.organizationId}
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.finance_contribution_allocations AS allocation
        SET membership_id = ${membershipId},
          allocation_amount = ${amount},
          note = ${reason},
          updated_by = ${identity.userId},
          updated_at = now()
        FROM before_row
        WHERE allocation.id = before_row.id
          AND allocation.organization_id = before_row.organization_id
        RETURNING allocation.id, allocation.organization_id, allocation.journal_id,
          allocation.membership_id, allocation.allocation_amount, allocation.note
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT
          updated.organization_id,
          ${identity.userId},
          'finance_contribution_allocation.corrected',
          'finance_contribution_allocation',
          updated.id::text,
          jsonb_build_object(
            'membership_id', before_row.membership_id,
            'allocation_amount', before_row.allocation_amount,
            'note', before_row.note
          ),
          jsonb_build_object(
            'membership_id', updated.membership_id,
            'allocation_amount', updated.allocation_amount,
            'note', updated.note
          )
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("finance-contribution-allocation-update", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("exceed the posted contribution revenue")) {
      redirect("/app/keuangan/iuran?result=allocation-exceeds");
    }
    redirect("/app/keuangan/iuran?result=allocation-correction-blocked");
  }

  if (!changed) redirect("/app/keuangan/iuran?result=allocation-correction-blocked");
  refreshFinance();
  revalidatePath("/app/anggota/kontribusi");
  redirect("/app/keuangan/iuran?result=allocation-corrected");
}
