import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api=readFileSync("src/app/api/ecosystem/inventory/route.ts","utf8");
const migration=readFileSync("migrations/017_inventory_stock_ledger.sql","utf8");
const purchases=readFileSync("src/app/api/ecosystem/purchases/route.ts","utf8");
const purchaseUi=readFileSync("src/app/_components/ecosystem-workspace.tsx","utf8");
const ui=readFileSync("src/app/_components/inventory-workspace.tsx","utf8");

test("inventory is a normalized, organization-scoped quantity ledger",()=>{
 assert.match(api,/workspace_v14\.organizations WHERE source_owner_user_id=\?/);
 assert.match(api,/WHERE organization_id=\?/);
 assert.match(api,/canRead\(c\.user\.role\)/);
 assert.match(api,/canWrite\(c\.user\.role\)/);
 assert.match(api,/item_type<>'equipment'/);
 assert.match(migration,/CREATE TABLE IF NOT EXISTS workspace_v14\.inventory_locations/);
 assert.match(migration,/location_id TEXT/);
});

test("stock movement database rules validate unit, location, sign and prevent negative balances",()=>{
 assert.match(migration,/guard_stock_movement/);
 assert.match(migration,/Stock movement unit differs from inventory item unit/);
 assert.match(migration,/A stock movement requires an inventory location/);
 assert.match(migration,/current_quantity\+NEW\.quantity<0/);
 assert.match(migration,/FOR UPDATE/);
 assert.match(migration,/stock_movements_immutable|guard_stock_movement_immutable/);
});

test("opening stock and manual movements require reasons, locations and idempotency",()=>{
 assert.match(api,/opening>0&&\(!uuid\(locationId\)\|\|!openingNote\)/);
 assert.match(api,/movementType/);
 assert.match(api,/clientRequestId/);
 assert.match(api,/inventory_action/);
 assert.match(migration,/stock_opening_once/);
 assert.match(migration,/stock_movements_source_unique/);
});

test("PO stock links and receipt locations post quantity movements exactly once",()=>{
 assert.match(purchases,/inventoryMappings/);
 assert.match(purchases,/workspace_v14\.inventory_items/);
 assert.match(purchases,/unit_of_measure/);
 assert.match(purchases,/clientRequestId/);
 assert.match(purchases,/inventoryLocationId/);
 assert.match(purchases,/reused:true/);
 assert.match(migration,/commerce_purchase_order_lines_inventory_item_fk/);
 assert.match(migration,/BEFORE INSERT OR UPDATE OF inventory_item_id,unit,owner/);
 assert.match(migration,/goods_receipt_line/);
 assert.match(migration,/movement_type,quantity,unit_of_measure/);
 assert.match(migration,/receipt\.inventory_location_id/);
 assert.match(migration,/Penerimaan dari '\|\|receipt\.receipt_number/);
});

test("inventory UI exposes item master, locations, reorder warnings and stock card",()=>{
 assert.match(ui,/Inventaris & Kartu Stok/);
 assert.match(ui,/Lokasi Penyimpanan/);
 assert.match(ui,/Daftarkan Barang/);
 assert.match(ui,/Batas stok minimum/);
 assert.match(ui,/Catat Pergerakan Stok/);
 assert.match(ui,/Kartu Stok/);
 assert.match(ui,/Saldo per Lokasi/);
 assert.match(ui,/Nilai rupiah, harga pokok, dan jurnal persediaan tidak dihitung/);
});

test("purchase UI maps stock items and directs stock receipts into a location",()=>{
 assert.match(purchaseUi,/Pemetaan ke Inventaris/);
 assert.match(purchaseUi,/inventoryMappings:orderInventoryMappings/);
 assert.match(purchaseUi,/Lokasi stok masuk/);
 assert.match(purchaseUi,/clientRequestId:receiveForm\.clientRequestId/);
 assert.match(purchaseUi,/menambah kartu stok/);
});

test("inter-location transfers post paired immutable movements atomically",()=>{
 const migration=readFileSync("migrations/018_inventory_transfers_stocktakes.sql","utf8");
 assert.match(migration,/CREATE TABLE IF NOT EXISTS workspace_v14\.inventory_transfers/);
 assert.match(migration,/CREATE TABLE IF NOT EXISTS workspace_v14\.inventory_transfer_lines/);
 assert.match(migration,/apply_inventory_transfer_line/);
 assert.match(migration,/transfer_out/);
 assert.match(migration,/transfer_in/);
 assert.match(migration,/Both transfer locations must be active/);
 assert.match(api,/action==='transfer'/);
 assert.match(api,/sourceLocationId===destinationLocationId/);
 assert.match(ui,/Transfer Antar Lokasi/);
 assert.match(ui,/Riwayat Transfer/);
});

test("stocktake snapshots are maker-checker approved and stale counts require recount",()=>{
 const migration=readFileSync("migrations/018_inventory_transfers_stocktakes.sql","utf8");
 assert.match(migration,/inventory_stocktakes/);
 assert.match(migration,/inventory_stocktake_lines/);
 assert.match(migration,/Stocktake approval requires a different authorized reviewer/);
 assert.match(migration,/current_quantity IS DISTINCT FROM line\.system_quantity/);
 assert.match(migration,/NEW\.status:='recount_required'/);
 assert.match(migration,/inventory_stocktake_line/);
 assert.match(api,/action==='stocktake'/);
 assert.match(api,/action==='approve-stocktake'/);
 assert.match(api,/Pembuat stok opname tidak boleh menyetujui/);
 assert.match(ui,/Stok Opname & Pengajuan Selisih/);
 assert.match(ui,/Persetujuan Stok Opname/);
 assert.match(ui,/Perlu hitung ulang/);
});
