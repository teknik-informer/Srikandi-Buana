import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { balancedLines } from "../src/features/finance/validation.mjs";

const read = (path) => readFileSync(path, "utf8");

test("cash-book entries require an explicit counter-account from the shared chart", () => {
  const fields = read("src/lib/srikandi.ts");
  const workspace = read("src/app/_components/workspace.tsx");
  const route = read("src/app/api/records/route.ts");
  assert.match(fields, /key:"counterAccountId",label:"Akun lawan transaksi",type:"ledger-account",required:true/);
  assert.match(workspace, /f\.type === "ledger-account"/);
  assert.match(workspace, /Pilih akun lawan transaksi/);
  assert.match(route, /SELECT id,code,name,category FROM ledger_accounts WHERE id=\? AND owner=\? AND active=TRUE/);
  assert.match(route, /data\.counterAccountName=String\(counter\.name/);
});

test("cash transactions post balanced journals using the selected account and separated fund cash", () => {
  const posting = read("src/features/finance/record-posting.ts");
  assert.match(posting, /Organisasi: \{ cash: "110001" \}/);
  assert.match(posting, /Program: \{ cash: "110002" \}/);
  assert.match(posting, /Usaha: \{ cash: "110003" \}/);
  assert.match(posting, /data\.counterAccountId/);
  assert.match(posting, /allowedCounterCategories = type === "Pemasukan"/);
  assert.match(posting, /\["asset", "liability", "equity", "revenue"\]/);
  assert.match(posting, /\["asset", "liability", "equity", "expense"\]/);
  assert.match(posting, /accountId: String\(counter\.id\)/);
  assert.match(posting, /accountId: cash\.id/);
  assert.match(posting, /const reference = "KAS-" \+ sourceId/);
});

test("cash-book posting is idempotent and does not rewrite an already posted journal", () => {
  const posting = read("src/features/finance/record-posting.ts");
  const records = read("src/app/api/records/route.ts");
  assert.match(posting, /if \(existing\)/);
  assert.match(posting, /if \(String\(existing\.posted_date\) === postedDate && String\(existing\.memo\) === memo && sameLines\)/);
  assert.match(posting, /Transaksi ini sudah dibukukan/);
  assert.match(records, /buildCashLedgerPostingStatements/);
  assert.match(records, /\.\.\.ledgerWrites/);
  assert.match(records, /Transaksi Buku Kas sudah dibukukan ke Buku Besar dan tidak dapat dihapus/);
});

test("cash-book source and ledger journals are written in one database transaction", () => {
  const records = read("src/app/api/records/route.ts");
  const protectedRecords = read("src/lib/enterprise/protected-records.ts");
  assert.match(records, /legacyWrite,[\s\S]*\.\.\.normalizedWrites,[\s\S]*\.\.\.ledgerWrites/);
  assert.match(protectedRecords, /db\.batch\(\[write,\.\.\.normalizedWrites\]\)/);
});

test("default chart initialization is an explicit authorized write, not a GET side effect", () => {
  const api = read("src/app/api/ecosystem/ledger/route.ts");
  const ui = read("src/app/_components/ecosystem-workspace.tsx");
  const workspace = read("src/app/_components/workspace.tsx");
  assert.match(api, /if\(b\.action==='initialize'\)/);
  assert.match(api, /await ensureDefaultLedgerAccounts/);
  assert.doesNotMatch(api.slice(api.indexOf("export async function GET"), api.indexOf("export async function POST")), /ensureDefaultLedgerAccounts/);
  assert.match(ui, /api\('ledger',\{action:'initialize'\}\)/);
  assert.match(workspace, /body: JSON\.stringify\(\{ action: "initialize" \}\)/);
});

test("cash records and CSV exports use the readable counter-account label rather than the database id", () => {
  const table = read("src/app/_components/record-table.tsx");
  const workspace = read("src/app/_components/workspace.tsx");
  assert.match(table, /field\.key === "counterAccountId"/);
  assert.match(table, /row\.data\.counterAccountName/);
  assert.match(workspace, /counterAccountId:"counterAccountName"/);
});

test("journal history returns its debit and credit account lines for review", () => {
  const api = read("src/app/api/ecosystem/ledger/route.ts");
  const ui = read("src/app/_components/ecosystem-workspace.tsx");
  assert.match(api, /json_agg\(json_build_object\('accountId',l\.account_id,'code',a\.code,'name',a\.name,'debit',l\.debit,'credit',l\.credit\)/);
  assert.match(api, /WHERE l\.entry_id=e\.id AND l\.owner=e\.owner/);
  assert.match(ui, /function journalLines\(entry:Entry\):EntryLine\[\]/);
  assert.match(ui, /Debit "\+money\(Number\(line\.debit\)\)/);
  assert.match(ui, /Kredit "\+money\(Number\(line\.credit\)\)/);
});

test("general journals support multiple unique accounts and enforce equal debit and credit totals", () => {
  const workspace = read("src/app/_components/ecosystem-workspace.tsx");
  const api = read("src/app/api/ecosystem/ledger/route.ts");
  assert.match(workspace, /lines:\[\{id:'opening-debit'/);
  assert.match(workspace, /function addJournalLine\(\)/);
  assert.match(workspace, /function removeJournalLine\(id:string\)/);
  assert.match(workspace, /new Set\(journal\.lines\.map\(line=>line\.accountId\)\)\.size===journal\.lines\.length/);
  assert.match(workspace, /lines:journal\.lines\.map\(\(\{id,\.\.\.line\}\)=>line\)/);
  assert.match(api, /!balancedLines\(b\.lines\)/);

  const a="11111111-1111-4111-8111-111111111111";
  const b="22222222-2222-4222-8222-222222222222";
  const c="33333333-3333-4333-8333-333333333333";
  assert.equal(balancedLines([
    {accountId:a,debit:100,credit:0},
    {accountId:b,debit:50,credit:0},
    {accountId:c,debit:0,credit:150},
  ]),true);
  assert.equal(balancedLines([
    {accountId:a,debit:100,credit:0},
    {accountId:b,debit:0,credit:90},
  ]),false);
});

test("financial statements use the normal balance of each account category", async () => {
  const { calculateFinanceStatements } = await import("../src/features/finance/statements.mjs");
  const result = calculateFinanceStatements([
    {id:"cash",code:"110001",name:"Kas",category:"asset",debit:1000,credit:100},
    {id:"savings",code:"210001",name:"Simpanan anggota",category:"liability",debit:0,credit:300},
    {id:"capital",code:"310001",name:"Modal",category:"equity",debit:0,credit:400},
    {id:"income",code:"410001",name:"Pendapatan",category:"revenue",debit:0,credit:500},
    {id:"expense",code:"510001",name:"Beban",category:"expense",debit:200,credit:0},
  ]);
  assert.equal(result.hasJournalActivity,true);
  assert.equal(result.totals.asset,900);
  assert.equal(result.totals.liability,300);
  assert.equal(result.totals.equity,400);
  assert.equal(result.totals.revenue,500);
  assert.equal(result.totals.expense,200);
  assert.equal(result.surplus,300);
  assert.equal(result.equityIncludingSurplus,700);
  assert.equal(result.difference,-100);
  assert.equal(result.isBalanced,false);
});

test("financial statements do not claim an empty ledger is balanced or finalized", async () => {
  const { calculateFinanceStatements } = await import("../src/features/finance/statements.mjs");
  const result = calculateFinanceStatements([
    {id:"cash",code:"110001",name:"Kas",category:"asset",debit:0,credit:0},
    {id:"capital",code:"310001",name:"Modal",category:"equity",debit:0,credit:0},
  ]);
  assert.equal(result.hasJournalActivity,false);
  assert.equal(result.difference,0);
  assert.equal(result.isBalanced,false);
});

test("a properly entered opening balance produces a balanced financial position", async () => {
  const { calculateFinanceStatements } = await import("../src/features/finance/statements.mjs");
  const result = calculateFinanceStatements([
    {id:"cash",code:"110001",name:"Kas",category:"asset",debit:2500000,credit:0},
    {id:"equipment",code:"140001",name:"Peralatan",category:"asset",debit:1500000,credit:0},
    {id:"savings",code:"210001",name:"Simpanan anggota",category:"liability",debit:0,credit:1000000},
    {id:"capital",code:"310001",name:"Modal awal kelompok",category:"equity",debit:0,credit:3000000},
  ]);
  assert.equal(result.hasJournalActivity,true);
  assert.equal(result.totals.asset,4000000);
  assert.equal(result.totals.liability,1000000);
  assert.equal(result.totals.equity,3000000);
  assert.equal(result.surplus,0);
  assert.equal(result.difference,0);
  assert.equal(result.isBalanced,true);
});

test("general journals reject duplicate account lines at the server validation boundary", () => {
  const account = "11111111-1111-4111-8111-111111111111";
  assert.equal(balancedLines([
    {accountId:account,debit:100,credit:0},
    {accountId:account,debit:0,credit:100},
  ]),false);
});

test("sales invoices can only be issued for completed orders and post receivable against sales revenue", () => {
  const route = read("src/app/api/ecosystem/invoices/route.ts");
  const accounts = read("src/features/finance/record-posting.ts");
  const commerce = read("src/app/_components/ecosystem-workspace.tsx");
  assert.match(route, /c\.user\.role !== "admin"/);
  assert.match(route, /String\(order\.status\) !== "completed"/);
  assert.match(route, /byCode\.get\("120002"\)/);
  assert.match(route, /byCode\.get\("410003"\)/);
  assert.ok(read("migrations/012_sales_invoices_and_receipts.sql").includes("UNIQUE (owner, order_id)"));
  assert.match(route, /Faktur hanya dapat diterbitkan setelah pesanan berstatus Selesai/);
  assert.match(route, /commerce_sales_invoice_sequences/);
  assert.match(route, /INSERT INTO commerce_sales_invoices/);
  assert.match(route, /Faktur penjualan diterbitkan/);
  assert.match(commerce, /function issueInvoice\(order:Order\)/);
  assert.match(commerce, /o\.status==='completed'&&admin/);
  assert.match(commerce, /Faktur Penjualan & Piutang/);
});

test("sales invoices and receipts are immutable, append-only, and protected against overpayment", () => {
  const migration = read("migrations/012_sales_invoices_and_receipts.sql");
  assert.ok(migration.includes("UNIQUE (owner, order_id)"));
  assert.match(migration, /BEFORE UPDATE OR DELETE ON commerce_sales_invoices/);
  assert.match(migration, /Sales invoices are immutable/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OR DELETE ON commerce_sales_invoice_receipts/);
  assert.match(migration, /Sales invoice receipts are append-only/);
  assert.match(migration, /paid_total \+ NEW\.amount <= total_amount/);
  assert.match(migration, /Receipt exceeds the outstanding invoice balance/);
});

test("cash receipts settle an explicitly selected invoice through the same cash posting batch", () => {
  const fields = read("src/lib/srikandi.ts");
  const workspace = read("src/app/_components/workspace.tsx");
  const table = read("src/app/_components/record-table.tsx");
  const records = read("src/app/api/records/route.ts");
  const posting = read("src/features/finance/record-posting.ts");
  assert.match(fields, /key:"relatedInvoiceId",label:"Faktur yang dibayar \(opsional\)",type:"sales-invoice"/);
  assert.match(workspace, /fetch\("\/api\/ecosystem\/invoices\?open=1"/);
  assert.match(workspace, /f\.type === "sales-invoice"/);
  assert.match(workspace, /invoice\.invoice_number/);
  assert.match(table, /field\.key === "relatedInvoiceId"/);
  assert.match(table, /row\.data\.relatedInvoiceNumber/);
  assert.match(records, /commerce_sales_invoice_receipts/);
  assert.match(records, /Pembayaran faktur harus berupa Pemasukan pos Usaha/);
  assert.match(records, /data\.relatedInvoiceNumber=String\(invoice\.invoice_number/);
  assert.match(posting, /counter\.code\) === "120002" && !relatedInvoiceId/);
  assert.match(posting, /INSERT INTO commerce_sales_invoice_receipts/);
  assert.match(posting, /receiptStatement\(entryId\)/);
  assert.match(posting, /Nominal penerimaan melebihi sisa piutang/);
});

test("trade receivables control account is part of the organization's starter chart", () => {
  const posting = read("src/features/finance/record-posting.ts");
  assert.match(posting, /code: "120002", name: "Piutang Dagang", category: "asset"/);
});

test("member financial policies follow draft, submission, evidence-backed approval and rejection lifecycle", () => {
  const api = read("src/app/api/ecosystem/member-finance/policies/route.ts");
  const ui = read("src/app/_components/member-finance-policies.tsx");
  const workspace = read("src/app/_components/ecosystem-workspace.tsx");
  const migration = read("migrations/010_member_impact_finance.sql");
  assert.match(api, /const financeRoles = \["admin", "ketua", "bendahara"\]/);
  assert.match(api, /policy_status='draft'/);
  assert.match(api, /policy_status='submitted'/);
  assert.match(api, /body\.action === "approve"/);
  assert.match(api, /body\.action === "reject"/);
  assert.match(api, /document_status IN \('source_verified','approved'\)/);
  assert.match(api, /verification_status='verified'/);
  assert.match(api, /approved_by/);
  assert.match(api, /effective_from/);
  assert.match(api, /WITH changed AS/);
  assert.match(migration, /Approved member financial policies are immutable/);
  assert.match(ui, /Buat draf kebijakan baru/);
  assert.match(ui, /Ajukan persetujuan/);
  assert.match(ui, /Sahkan kebijakan/);
  assert.match(ui, /Tolak \/ minta versi revisi/);
  assert.match(workspace, /<MemberFinancePolicies role=\{role\} \/>/);
});

test("member policy drafts do not assign unapproved loan, savings, compensation or allowance terms", () => {
  const api = read("src/app/api/ecosystem/member-finance/policies/route.ts");
  const ui = read("src/app/_components/member-finance-policies.tsx");
  assert.match(api, /policy_status='draft'/);
  assert.match(api, /terms,created_at,updated_at/);
  assert.match(ui, /Bunga, biaya pinjaman, plafon, jangka waktu, denda, nominal gaji dan tunjangan harus diisi berdasarkan keputusan kelompok/);
  assert.match(ui, /Draf tidak mengubah saldo dan tidak membuat kewajiban keuangan/);
  assert.doesNotMatch(api, /INSERT INTO workspace_v14\.member_loans/);
  assert.doesNotMatch(api, /INSERT INTO workspace_v14\.member_savings_accounts/);
  assert.doesNotMatch(api, /INSERT INTO workspace_v14\.member_payments/);
});
