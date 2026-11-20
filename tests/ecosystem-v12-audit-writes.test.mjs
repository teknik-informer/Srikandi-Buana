import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const orders=readFileSync('src/app/api/ecosystem/orders/route.ts','utf8');
const products=readFileSync('src/app/api/ecosystem/products/route.ts','utf8');

test('Order creation reserves stock, creates order, and records submitted event atomically',()=>{
 assert.match(orders,/WITH reserved AS[\s\S]*INSERT INTO commerce_orders[\s\S]*INSERT INTO commerce_order_events[\s\S]*RETURNING order_id/);
 assert.match(orders,/SELECT inserted\.id,inserted\.total FROM inserted JOIN logged/);
});

test('Order cancellation restores stock and records the prior status in the same statement',()=>{
 assert.match(orders,/WITH before AS MATERIALIZED[\s\S]*status IN \('submitted','confirmed'\)[\s\S]*UPDATE commerce_products p SET stock=p\.stock\+changed\.quantity[\s\S]*INSERT INTO commerce_order_events/);
 assert.match(orders,/before\.status,'cancelled'/);
});

test('Order confirmation and completion append status events atomically',()=>{
 assert.match(orders,/INSERT INTO commerce_order_events\(owner,order_id,actor_id,from_status,to_status\)[\s\S]*FROM changed CROSS JOIN before/);
});

test('Product creation writes an immutable audit snapshot in the same batch',()=>{
 assert.match(products,/INSERT INTO commerce_product_audit\(owner,product_id,actor_id,action,before_state,after_state\)/);
 assert.match(products,/c\.db\.batch\(\[[\s\S]*commerce_product_audit[\s\S]*INSERT INTO audit/);
});

test('Product updates use optimistic concurrency and append before/after snapshots atomically',()=>{
 assert.match(products,/WITH before AS MATERIALIZED[\s\S]*WHERE id=\? AND owner=\? AND updated=\?[\s\S]*UPDATE commerce_products p SET[\s\S]*FROM before b WHERE p\.id=b\.id AND p\.owner=b\.owner AND p\.updated=b\.updated[\s\S]*INSERT INTO commerce_product_audit/);
 assert.match(products,/to_jsonb\(before\)::text,to_jsonb\(changed\)::text/);
});

test('FIFO orders allocate exact source lots and cancellation restores the same allocations',()=>{
 const migration=readFileSync('migrations/008_fifo_stock_provenance.sql','utf8');
 assert.match(migration,/CREATE TABLE IF NOT EXISTS commerce_inventory_lots/);
 assert.match(migration,/CREATE TABLE IF NOT EXISTS commerce_order_lot_allocations/);
 assert.match(migration,/ORDER BY received_at,id FOR UPDATE/);
 assert.match(migration,/srikandi_create_order_with_fifo/);
 assert.match(migration,/srikandi_cancel_order_restore_fifo/);
 assert.match(migration,/FOREIGN KEY\(lot_id,owner\)/);
 assert.match(orders,/srikandi_create_order_with_fifo/);
 assert.match(orders,/srikandi_cancel_order_restore_fifo/);
 assert.match(orders,/jsonb_agg\(jsonb_build_object\('source_type'/);
});
test('Generic accepted receipts and new products create matching inventory lots',()=>{
 assert.match(records,/INSERT INTO commerce_inventory_lots\(owner,product_id,source_type,receipt_record_id/);
 assert.match(products,/INSERT INTO commerce_inventory_lots\(owner,product_id,source_type,initial_quantity/);
 assert.match(products,/Perubahan jumlah stok harus melalui transaksi penerimaan/);
});
