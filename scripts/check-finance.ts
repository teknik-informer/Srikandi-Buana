import { trialBalance, incomeStatement, cashPosition, programSpend } from "../src/lib/finance";
import { JOURNALS, FUNDS, BANK_STATEMENT } from "../src/data/finance";

let bad = 0;
for (const j of JOURNALS) {
  const d = j.lines.reduce((s, l) => s + l.debit, 0);
  const c = j.lines.reduce((s, l) => s + l.credit, 0);
  if (d !== c) { console.log("UNBALANCED", j.number, d, c); bad++; }
  for (const l of j.lines) {
    if (l.debit !== 0 && l.credit !== 0) console.log("BOTH SIDES", j.number, l.accountCode);
    if (l.debit < 0 || l.credit < 0) console.log("NEGATIVE LINE", j.number, l.accountCode);
  }
}
console.log("journals:", JOURNALS.length, "unbalanced:", bad);

const tb = trialBalance();
const is = incomeStatement();
const assets = tb.rows.filter((r) => r.type === "aset").reduce((s, r) => s + (r.normal === "debit" ? r.balance : -r.balance), 0);
const liab = tb.rows.filter((r) => r.type === "kewajiban").reduce((s, r) => s + r.balance, 0);
const eq = tb.rows.filter((r) => r.type === "ekuitas").reduce((s, r) => s + r.balance, 0);
console.log("balance sheet", { assets, liab, eq, surplus: is.surplus, gap: assets - liab - eq - is.surplus });
console.log("negative:", tb.rows.filter((r) => r.balance < 0).map((r) => r.code));

for (const f of FUNDS) if (f.used > f.received) console.log("FUND OVERUSE", f.code);
for (const a of cashPosition().accounts) if (a.closing < 0) console.log("NEGATIVE CASH", a.code);
for (const p of programSpend()) if (p.actual > p.planned) console.log("OVER BUDGET", p.programCode, p.planned, p.actual);
const keys = new Set<string>();
for (const j of JOURNALS) { if (keys.has(j.idempotencyKey)) console.log("DUP KEY", j.idempotencyKey); keys.add(j.idempotencyKey); }
const posted = new Set(JOURNALS.map((j) => j.id));
for (const row of BANK_STATEMENT) if (row.matchedJournalId && !posted.has(row.matchedJournalId)) console.log("BS orphan", row.id);
console.log("BS unmatched:", BANK_STATEMENT.filter((r) => r.status !== "cocok").length);
