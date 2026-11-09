import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("src/app/api/ecosystem/ledger/route.ts", "utf8");
const ui = readFileSync("src/app/_components/ecosystem-workspace.tsx", "utf8");

test("cash and bank transfers are restricted to two distinct active organization asset accounts", () => {
  assert.match(api, /if\(b\.action==='transfer'\)/);
  assert.match(api, /fromId===toId/);
  assert.match(api, /category\)!=='asset'/);
  assert.match(api, /owner=\? AND active=TRUE/);
  assert.match(api, /Transfer hanya boleh menggunakan dua akun aset aktif/);
});

test("cash and bank transfers post a balanced double-entry journal and audit event", () => {
  assert.match(api, /INSERT INTO ledger_entries/);
  assert.match(api, /VALUES\(\?\,\?\,\?\,\?\,\?\,\?\,\?\)/);
  assert.match(api, /toId,amount,0/);
  assert.match(api, /fromId,0,amount/);
  assert.match(api, /Transfer kas\/bank diposting/);
  assert.match(api, /reference='TRF-'/);
});

test("accounting workspace exposes a real transfer form using active asset accounts", () => {
  assert.match(ui, /Transfer Kas & Bank/);
  assert.match(ui, /action:'transfer'/);
  assert.match(ui, /accounts\.filter\(a=>a\.active&&a\.category==='asset'\)/);
  assert.match(ui, /Posting transfer/);
});
