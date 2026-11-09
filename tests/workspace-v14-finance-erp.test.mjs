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
