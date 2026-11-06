import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const f=p=>readFileSync(p,'utf8');
test('Semua API privat memeriksa sesi dan Origin untuk mutasi',()=>{
 for(const route of ['notifications','orders','ledger','products']){
  const s=f(`src/app/api/ecosystem/${route}/route.ts`);
  assert(s.includes('required(request,true)'),`${route}: missing mutation guard`);
 }
});
test('Notifikasi dan jurnal hanya mengakses data dalam organisasi',()=>{
 const n=f('src/app/api/ecosystem/notifications/route.ts');
 assert(n.includes('recipient_id=?')); assert(n.includes('c.user.accountId'));assert(n.includes('c.user.userId'));
 const l=f('src/app/api/ecosystem/ledger/route.ts'); assert(l.includes('canRead(c.user.role)')); assert(l.includes('canWrite(c.user.role)'));assert(l.includes('ids.length<2'));
});
test('Pesanan mempunyai status server dan stok tidak negatif',()=>{
 const q=f('src/app/api/ecosystem/orders/route.ts'); assert(q.includes('stock>=?'));assert(q.includes("status IN ('submitted','confirmed')")); assert(q.includes("status='cancelled'"));assert(q.includes('status=?'));assert(q.includes('client_request_id=?'));
 const m=f('migrations/005_ecosystem_foundation.sql'); assert(m.includes('stock INTEGER NOT NULL CHECK(stock>=0)')); assert(m.includes('UNIQUE(owner,buyer_id,client_request_id)'));
});

test('Mutasi pesanan dan notifikasi dibatasi laju dan dapat diaudit per akun',()=>{
 const orders=f('src/app/api/ecosystem/orders/route.ts');
 const notes=f('src/app/api/ecosystem/notifications/route.ts');
 assert(orders.includes('commerce:order-status:'));
 assert(orders.includes('stock_logged'));assert(orders.includes('INSERT INTO commerce_stock_history'));assert(orders.includes("status='cancelled'"));
 assert(notes.includes('notification:mark:'));
});
test('Neraca saldo dibentuk dari saldo akun nyata dan memiliki peringatan jika tidak seimbang',()=>{
 const ui=f('src/app/_components/ecosystem-workspace.tsx');
 assert(ui.includes('Neraca Saldo'));
 assert(ui.includes('trialTotals.debit!==trialTotals.credit'));
 assert(ui.includes('Rekap saldo debit dan kredit seluruh akun yang tercatat'));
});
