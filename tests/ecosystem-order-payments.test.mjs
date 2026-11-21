import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration=readFileSync('migrations/009_order_payment_ledger.sql','utf8');
const orders=readFileSync('src/app/api/ecosystem/orders/route.ts','utf8');
const workspace=readFileSync('src/app/_components/ecosystem-workspace.tsx','utf8');
const workspace=readFileSync('src/app/_components/ecosystem-workspace.tsx','utf8');

test('Order payments are tenant-scoped, immutable records linked to orders and balanced ledger entries',()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS commerce_order_payments/);
 assert.match(migration,/FOREIGN KEY\(order_id,owner\) REFERENCES commerce_orders\(id,owner\)/);
 assert.match(migration,/FOREIGN KEY\(ledger_entry_id,owner\) REFERENCES ledger_entries\(id,owner\)/);
 assert.match(migration,/UNIQUE\(owner,client_request_id\)/);
 assert.match(migration,/CREATE OR REPLACE FUNCTION srikandi_post_order_payment/);
 assert.match(migration,/INSERT INTO ledger_entries/);
 assert.match(migration,/INSERT INTO ledger_lines[\s\S]*p_cash_account_id,p_amount,0/);
 assert.match(migration,/INSERT INTO ledger_lines[\s\S]*p_revenue_account_id,0,p_amount/);
});

test('Payment posting locks the order and validates Bendahara, account categories, and remaining balance',()=>{
 assert.match(migration,/commerce_orders WHERE id=p_order_id AND owner=p_owner FOR UPDATE/);
 assert.match(migration,/role='bendahara' AND enabled=TRUE/);
 assert.match(migration,/v_cash.category<>'asset'/);
 assert.match(migration,/v_revenue.category<>'revenue'/);
 assert.match(migration,/v_paid\+p_amount>v_order.total/);
 assert.match(migration,/v_existing.order_id<>p_order_id OR v_existing.amount<>p_amount/);
});

test('Paid orders cannot be cancelled until a refund workflow is implemented',()=>{
 assert.match(migration,/CREATE OR REPLACE FUNCTION srikandi_prevent_paid_order_cancellation/);
 assert.match(migration,/BEFORE UPDATE OF status ON commerce_orders/);
 assert.match(orders,/Number\(o.paid_total\|\|0\)===0/);
});

test('Order completion requires fully posted payments and the API exposes payment history',()=>{
 assert.match(orders,/payment_status/);
 assert.match(orders,/commerce_order_payments/);
 assert.match(orders,/\?<'completed'[\s\S]*SUM\(p.amount\)[\s\S]*>=o.total/);
 assert.match(orders,/EXISTS \(SELECT 1 FROM before\)/);
});

test('Bendahara payment form requires cash and revenue accounts and displays payment status',()=>{
 assert.match(workspace,/Catat pembayaran/);
 assert.match(workspace,/paymentAccounts\.filter\(a=>a\.category==='asset'\)/);
 assert.match(workspace,/paymentAccounts\.filter\(a=>a\.category==='revenue'\)/);
 assert.match(workspace,/Lunas/);
 assert.match(workspace,/Pembatalan ditahan karena sudah ada pembayaran/);
});
