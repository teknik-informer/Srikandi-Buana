import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("src/app/api/ecosystem/ledger/route.ts", "utf8");
const ui = readFileSync("src/app/_components/ecosystem-workspace.tsx", "utf8");

test("cash transfers are restricted to distinct active organization fund accounts", () => {
  assert.match(api, /if\(b\.action==='transfer'\)/);
  assert.match(api, /fromId===toId/);
  assert.match(api, /code IN \('110001','110002','110003'\)/);
  assert.match(api, /owner=\? AND active=TRUE/);
  assert.match(api, /Transfer hanya boleh menggunakan akun Kas Organisasi/);
  assert.match(api, /SUM\(debit-credit\)/);
  assert.match(api, /Saldo pos kas sumber tidak mencukupi/);
});

test("cash transfers post a balanced double-entry journal and audit event", () => {
  assert.match(api, /INSERT INTO ledger_entries/);
  assert.match(api, /VALUES\(\?\,\?\,\?\,\?\,\?\,\?\,\?\)/);
  assert.match(api, /toId,amount,0/);
  assert.match(api, /fromId,0,amount/);
  assert.match(api, /Transfer kas\/bank diposting/);
  assert.match(api, /reference='TRF-'/);
});

test("accounting workspace exposes a real transfer form using the three configured cash funds", () => {
  assert.match(ui, /Transfer Antar Pos Kas/);
  assert.match(ui, /action:'transfer'/);
  assert.match(ui, /accounts\.filter\(a=>a\.active&&\['110001','110002','110003'\]\.includes\(a\.code\)\)/);
  assert.match(ui, /Posting transfer/);
});
