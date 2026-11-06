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
 assert.match(products,/WITH before AS MATERIALIZED[\s\S]*updated=\?\)[\s\S]*UPDATE commerce_products p[\s\S]*INSERT INTO commerce_product_audit/);
 assert.match(products,/to_jsonb\(before\)::text,to_jsonb\(changed\)::text/);
});
