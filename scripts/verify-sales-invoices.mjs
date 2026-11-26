import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("src/app/api/ecosystem/invoices/route.ts", "utf8");
const issue = readFileSync("src/features/commerce/sales-invoices.ts", "utf8");
const cashPosting = readFileSync("src/features/finance/record-posting.ts", "utf8");
const cashFields = readFileSync("src/lib/srikandi.ts", "utf8");
const cashWorkspace = readFileSync("src/app/_components/workspace.tsx", "utf8");
const commerceWorkspace = readFileSync("src/app/_components/ecosystem-workspace.tsx", "utf8");
const records = readFileSync("src/app/api/records/route.ts", "utf8");
const migration = readFileSync("migrations/012_sales_invoices_and_receipts.sql", "utf8");
const integration = readFileSync("tests/record-cas-postgres-domain.integration.mjs", "utf8");

assert(route.includes('required(request, true)') && route.includes('["admin", "bendahara"].includes(context.user.role)'), "Invoice issue route must require a same-origin authenticated Admin or Treasurer");
assert(route.includes('i.owner=?') && route.includes('i.customer_user_id=?'), "Invoice listing must be tenant-scoped and restrict non-managers to their own invoices");
assert(route.includes('order.status !== "completed"'), "Only completed orders may be invoiced");
assert(route.includes('dueDate < body.issueDate'), "Invoice due date cannot precede its issue date");
assert(route.includes('buildSalesInvoiceIssueStatement') && route.includes('ensureDefaultLedgerAccounts'), "Invoice issue route must use the atomic issue statement and the controlled chart of accounts");

assert(issue.includes("WITH order_guard AS MATERIALIZED") && issue.includes("FOR UPDATE OF o"), "Invoice issue must lock the completed order at the database boundary");
assert(issue.includes("status = 'completed'") && issue.includes("o.owner = ?"), "Invoice issue SQL must enforce completed status and workspace ownership");
assert(issue.includes("ON CONFLICT (owner, period) DO UPDATE") && issue.includes("last_number = commerce_sales_invoice_sequences.last_number + 1"), "Invoice numbers must use an atomic owner-period sequence");
assert(issue.includes("INSERT INTO commerce_sales_invoices") && issue.includes("INSERT INTO ledger_entries") && issue.includes("INSERT INTO ledger_lines") && issue.includes("INSERT INTO audit"), "Invoice, balanced journal and audit must be one SQL statement");
assert(issue.includes("receivableAccountId") && issue.includes("revenueAccountId") && issue.includes("row_to_json(issued)::text"), "Invoice statement must book receivable/revenue and return its issued invoice");

assert(migration.includes("UNIQUE (owner, order_id)") && migration.includes("UNIQUE (owner, cash_record_id)"), "Database must prevent duplicate invoices per order and duplicate cash receipts");
assert(migration.includes("paid_total = paid_total + NEW.amount") && migration.includes("paid_total + NEW.amount <= total_amount"), "Database trigger must serialize paid balance and prevent overpayment");
assert(migration.includes("Sales invoice receipts are append-only."), "Invoice receipts must remain append-only");

assert(cashFields.includes('key:"relatedInvoiceId"') && cashFields.includes('type:"sales-invoice"'), "Cash book form must expose an optional linked invoice field");
assert(cashPosting.includes("relatedInvoiceId") && cashPosting.includes("INSERT INTO commerce_sales_invoice_receipts"), "Cash book posting must create the invoice receipt in the same journal batch");
assert(cashPosting.includes('String(counter.code) === "120002"') && cashPosting.includes('fund !== "Usaha"'), "Invoice receipts must be restricted to business-fund inflows against trade receivables");
assert(cashPosting.includes("relatedInvoiceNumber = String(invoice.invoice_number)"), "Cash book source record must keep the linked invoice number snapshot");
assert(cashWorkspace.includes('f.type === "sales-invoice"') && cashWorkspace.includes('fetch("/api/ecosystem/invoices"'), "Cash book UI must select an open invoice without changing the form workflow");
assert(commerceWorkspace.includes("async function issueInvoice") && commerceWorkspace.includes("o.status==='completed'") && commerceWorkspace.includes("Faktur Penjualan"), "Sales workspace must list invoices and issue only from completed orders");
assert(commerceWorkspace.includes("payment gateway dan faktur pajak tidak diaktifkan"), "Sales workspace must not imply online payment or a tax invoice");
assert(records.includes("for(const f of module.fields)") && records.includes("out[f.key]=v"), "Validated cash form fields must pass through the existing module whitelist");
assert(integration.includes("Concurrent issuance for one completed order") && integration.includes("Two receipts competing for the same outstanding balance") && integration.includes("database trigger must reject a receipt"), "PostgreSQL domain suite must cover duplicate issue, concurrent receipts and overpayment rejection");

console.log("PASS sales invoices: completed-order issue, tenant scope, owner-period numbering, balanced receivable/revenue journal, audit, cashbook linking, and append-only overpayment protection.");
