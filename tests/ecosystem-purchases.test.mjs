import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const api=readFileSync("src/app/api/ecosystem/purchases/route.ts","utf8");
const migration=readFileSync("migrations/015_procurement_workflow.sql","utf8");
const ui=readFileSync("src/app/_components/ecosystem-workspace.tsx","utf8");

test("procurement workflow is organization-scoped and role restricted",()=>{
 assert.match(api,/canRead\(c\.user\.role\)/);
 assert.match(api,/canWrite\(c\.user\.role\)/);
 assert.match(api,/canApprove\(c\.user\.role\)/);
 assert.match(api,/WHERE id=\? AND owner=\?/);
 assert.match(migration,/UNIQUE\(owner,request_number\)/);
 assert.match(migration,/UNIQUE\(owner,order_number\)/);
});

test("purchase requisitions require bounded item lines and approval before PO creation",()=>{
 assert.match(api,/b\.action==='request'/);
 assert.match(api,/lines\.length<1\|\|lines\.length>50/);
 assert.match(api,/req\.status!=='approved'/);
 assert.match(api,/Pengaju tidak boleh menyetujui/);
 assert.match(api,/Pembuat Purchase Order tidak boleh menyetujui/);
});

test("purchase order and receipt lifecycle prevents excess and unapproved receipts",()=>{
 assert.match(api,/pending_approval/);
 assert.match(api,/action==='approve-order'/);
 assert.match(api,/action==='receive'/);
 assert.match(api,/Number\(line\.received_quantity\)\+qty>Number\(line\.quantity\)/);
 assert.match(migration,/Purchase order is not approved for receiving/);
 assert.match(migration,/Goods receipt exceeds ordered quantity/);
 assert.match(migration,/Approved purchase order lines are immutable/);
 assert.match(migration,/Goods receipt records are append-only/);
 assert.match(migration,/to_jsonb\(NEW\)-'received_quantity'/);
});

test("goods receipt is operational evidence and does not fabricate inventory valuation",()=>{
 assert.match(api,/Penerimaan barang dicatat/);
 assert.doesNotMatch(api,/inventory_value|stock_valuation|inventory_asset/i);
 assert.match(ui,/tidak otomatis menambah nilai persediaan/);
});

test("procurement UI exposes requisition, maker-checker PO and goods receipt workflows",()=>{
 assert.match(ui,/Ajukan Kebutuhan/);
 assert.match(ui,/Buat Purchase Order/);
 assert.match(ui,/Setujui PO/);
 assert.match(ui,/Catat Penerimaan Barang/);
 assert.match(ui,/Riwayat Penerimaan/);
});
