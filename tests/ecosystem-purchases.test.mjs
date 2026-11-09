import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const api=readFileSync("src/app/api/ecosystem/purchases/route.ts","utf8");
const procurement=readFileSync("migrations/015_procurement_workflow.sql","utf8");
const matching=readFileSync("migrations/016_purchase_three_way_match.sql","utf8");
const ui=readFileSync("src/app/_components/ecosystem-workspace.tsx","utf8");

test("procurement workflow is organization-scoped and role restricted",()=>{
 assert.match(api,/canRead\(c\.user\.role\)/);
 assert.match(api,/canWrite\(c\.user\.role\)/);
 assert.match(api,/canApprove\(c\.user\.role\)/);
 assert.match(api,/WHERE id=\? AND owner=\?/);
 assert.match(procurement,/UNIQUE\(owner,request_number\)/);
 assert.match(procurement,/UNIQUE\(owner,order_number\)/);
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
 assert.match(procurement,/Purchase order is not approved for receiving/);
 assert.match(procurement,/Goods receipt exceeds ordered quantity/);
 assert.match(procurement,/Approved purchase order lines are immutable/);
 assert.match(procurement,/Goods receipt records are append-only/);
 assert.match(matching,/to_jsonb\(NEW\)-'received_quantity'-'invoiced_quantity'/);
});

test("supplier bill posting requires three-way match and exact source data",()=>{
 assert.match(api,/purchaseOrderId=b\.purchaseOrderId/);
 assert.match(api,/po\.supplier_id\)!==supplierId/);
 assert.match(api,/goods_receipt_lines/);
 assert.match(api,/unitCost!==Number\(source\.ordered_unit_cost\)/);
 assert.match(api,/quantity>Number\(source\.received_quantity\)-Number\(source\.invoiced_quantity\)/);
 assert.match(api,/matchedTotal!==amount/);
 assert.match(api,/match_status,matched_at/);
 assert.match(api,/commerce_purchase_bill_lines/);
 assert.match(matching,/NEW\.unit_cost<>po_line\.unit_cost/);
 assert.match(matching,/receipt_line\.invoiced_quantity\+NEW\.quantity/);
 assert.match(matching,/po_line\.invoiced_quantity\+NEW\.quantity/);
 assert.match(matching,/DEFERRABLE INITIALLY DEFERRED/);
 assert.match(matching,/Supplier invoice lines must fully equal the supplier bill total/);
 assert.match(matching,/Posted supplier bill source and match data are immutable/);
});

test("three-way match does not create inventory valuation or tolerate unapproved price differences",()=>{
 assert.doesNotMatch(api,/inventory_value|stock_valuation|inventory_asset/i);
 assert.match(api,/Selisih harga, pajak, ongkir, diskon/);
 assert.match(ui,/tidak otomatis menambah nilai persediaan/);
});

test("procurement and bill UI expose matching status, source receipt lines and approvals",()=>{
 assert.match(ui,/Ajukan Kebutuhan/);
 assert.match(ui,/Buat Purchase Order/);
 assert.match(ui,/Setujui PO/);
 assert.match(ui,/Catat Penerimaan Barang/);
 assert.match(ui,/Cocokkan & Bukukan Faktur \(3 Arah\)/);
 assert.match(ui,/Pilih barang yang benar-benar diterima/);
 assert.match(ui,/Cocok 3 arah/);
 assert.match(ui,/Riwayat Penerimaan/);
});
