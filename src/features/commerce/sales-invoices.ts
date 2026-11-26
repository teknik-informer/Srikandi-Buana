import type { NeonDatabase, PreparedStatement } from "@/lib/runtime";

export type SalesInvoiceIssueInput = {
  owner: string;
  actorId: string;
  orderId: string;
  issueDate: string;
  dueDate: string;
  receivableAccountId: string;
  revenueAccountId: string;
  now: string;
};

/**
 * Issues one sales invoice only from a completed order.
 * The sequence increment, receivable/revenue journal, invoice, and audit are
 * one PostgreSQL statement. The order row is locked so concurrent issuers
 * cannot create two invoices for the same order.
 */
export function buildSalesInvoiceIssueStatement(
  db: NeonDatabase,
  input: SalesInvoiceIssueInput,
): PreparedStatement {
  const invoiceId = crypto.randomUUID();
  const ledgerEntryId = crypto.randomUUID();
  const debitLineId = crypto.randomUUID();
  const creditLineId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const period = input.issueDate.slice(0, 7).replace("-", "");

  const sql = `
    WITH order_guard AS MATERIALIZED (
      SELECT
        o.id AS order_id,
        o.owner,
        o.buyer_id,
        buyer.full_name AS customer_name,
        o.product_name,
        o.quantity,
        o.unit_price,
        o.total
      FROM commerce_orders AS o
      JOIN users AS buyer
        ON buyer.id = o.buyer_id
       AND buyer.workspace_owner = o.owner
      WHERE o.id = ?
        AND o.owner = ?
        AND o.status = 'completed'
      FOR UPDATE OF o
    ),
    sequence_row AS (
      INSERT INTO commerce_sales_invoice_sequences(owner, period, last_number)
      SELECT order_guard.owner, ?, 1
      FROM order_guard
      ON CONFLICT (owner, period) DO UPDATE
      SET last_number = commerce_sales_invoice_sequences.last_number + 1
      RETURNING owner, period, last_number
    ),
    invoice_data AS MATERIALIZED (
      SELECT
        order_guard.*,
        sequence_row.period,
        'SB-' || sequence_row.period || '-' ||
          LPAD(sequence_row.last_number::text, 6, '0') AS invoice_number
      FROM order_guard
      JOIN sequence_row ON sequence_row.owner = order_guard.owner
    ),
    entry AS (
      INSERT INTO ledger_entries(
        id, owner, actor_id, posted_date, memo, reference, created
      )
      SELECT
        ?, invoice_data.owner, ?, ?::date,
        'Faktur penjualan ' || invoice_data.invoice_number,
        'INV-' || invoice_data.invoice_number,
        ?::timestamptz
      FROM invoice_data
      RETURNING id, owner
    ),
    issued AS (
      INSERT INTO commerce_sales_invoices(
        id, owner, order_id, invoice_number, customer_user_id, customer_name,
        issue_date, due_date, total_amount, paid_total, status,
        ledger_entry_id, actor_id, created, updated
      )
      SELECT
        ?, invoice_data.owner, invoice_data.order_id, invoice_data.invoice_number,
        invoice_data.buyer_id, invoice_data.customer_name,
        ?::date, NULLIF(?, '')::date, invoice_data.total, 0, 'issued',
        entry.id, ?, ?::timestamptz, ?::timestamptz
      FROM invoice_data
      JOIN entry ON entry.owner = invoice_data.owner
      RETURNING
        id, owner, order_id, invoice_number, customer_user_id, customer_name,
        issue_date, due_date, total_amount, paid_total, status, ledger_entry_id
    ),
    debit_line AS (
      INSERT INTO ledger_lines(id, owner, entry_id, account_id, debit, credit)
      SELECT ?, issued.owner, issued.ledger_entry_id, ?, issued.total_amount, 0
      FROM issued
      RETURNING id
    ),
    credit_line AS (
      INSERT INTO ledger_lines(id, owner, entry_id, account_id, debit, credit)
      SELECT ?, issued.owner, issued.ledger_entry_id, ?, 0, issued.total_amount
      FROM issued
      RETURNING id
    ),
    audit_written AS (
      INSERT INTO audit(id, owner, action, title, created)
      SELECT
        ?, issued.owner, 'Faktur penjualan diterbitkan',
        issued.invoice_number || ' · ' || issued.customer_name,
        ?::timestamptz
      FROM issued
      CROSS JOIN debit_line
      CROSS JOIN credit_line
      RETURNING id
    )
    SELECT
      issued.id,
      issued.order_id,
      issued.invoice_number,
      issued.customer_name,
      issued.issue_date,
      issued.due_date,
      issued.total_amount,
      issued.paid_total,
      issued.status,
      issued.ledger_entry_id
    FROM issued
    CROSS JOIN debit_line
    CROSS JOIN credit_line
    CROSS JOIN audit_written
  `;

  return db.prepare(sql).bind(
    input.orderId,
    input.owner,
    period,
    ledgerEntryId,
    input.actorId,
    input.issueDate,
    input.now,
    invoiceId,
    input.issueDate,
    input.dueDate,
    input.actorId,
    input.now,
    input.now,
    debitLineId,
    input.receivableAccountId,
    creditLineId,
    input.revenueAccountId,
    auditId,
    input.now,
  );
}
