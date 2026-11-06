import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {splitSQLStatements} from '../src/lib/sql-script.mjs';
import {csvCell,csvRows} from '../src/lib/ecosystem/csv.mjs';
const read=p=>readFileSync(p,'utf8');
test('Dashboard ekosistem memiliki routing nyata untuk semua peran terverifikasi',()=>{
 const page=read('src/app/dashboard/[[...section]]/page.tsx');
 for(const name of ['notifikasi','penjualan','akuntansi'])assert(page.includes('"'+name+'"'));
 for(const name of ['NotificationCenter','CommerceWorkspace','AccountingWorkspace'])assert(page.includes('<'+name));
 assert(page.includes('<WorkspaceShell user={admin}'));
});
test('Storefront publik terdaftar sebagai SEO dan menampilkan produk terbitan saja',()=>{
 assert(existsSync('src/app/(public)/produk/page.tsx'));
 const product=read('src/app/(public)/produk/page.tsx');
 assert(product.includes('p.published=TRUE'));assert(product.includes("u.role='admin'"));assert(product.includes('pembayaran online'));
 assert(read('src/lib/seo.ts').includes("'/produk':{title:"));
 assert(read('src/app/_components/public/navigation.tsx').includes('href="/produk"'));
});
test('Bukti pengajuan pesanan dibatasi pada anggota pemesan atau administrator',()=>{
 const receipt=read('src/app/dashboard/pesanan/[id]/page.tsx');
 assert(receipt.includes('getAuthenticatedUser()'));assert(receipt.includes('o.buyer_id=? OR'));assert(receipt.includes('o.owner=?'));
 assert(receipt.includes('Bukan faktur pajak'));assert(receipt.includes('Pembayaran belum diverifikasi'));
});
test('Jurnal koreksi menukar debit/kredit tanpa menghapus posting historis',()=>{
 const ledger=read('src/app/api/ecosystem/ledger/route.ts');
 assert(ledger.includes("b.action==='reverse'"));assert(ledger.includes('Number(l.credit),Number(l.debit)'));
 assert(ledger.includes('ledger_reversals'));assert(!ledger.includes('DELETE FROM ledger_entries'));
 const sql=read('migrations/006_order_receipts_and_journal_corrections.sql');
 assert(sql.includes('original_entry_id TEXT NOT NULL UNIQUE'));assert(sql.includes('reversal_entry_id TEXT NOT NULL UNIQUE'));
});
test('Riwayat stok terikat pada organisasi dan administrator',()=>{const route=read('src/app/api/ecosystem/stock-history/route.ts');assert(route.includes("c.user.role!=='admin'"));assert(route.includes('m.owner=?'));assert(route.includes('p.owner=m.owner'));const ui=read('src/app/_components/ecosystem-workspace.tsx');assert(ui.includes('Riwayat Perubahan Stok'))});
test('Ekspor CSV aman dari rumus berbahaya dan menghasilkan UTF-8 BOM',()=>{
 assert.equal(csvCell('=HYPERLINK("x","y")'),`"'=HYPERLINK(""x"",""y"")"`);
 assert.equal(csvCell('  -2'),`"'  -2"`);assert.equal(csvCell('Produk "A"'),'"Produk ""A"""');
 assert(csvRows([['produk','harga'],['a',1200]]).startsWith('\uFEFF'));
 const ledger=read('src/app/api/ecosystem/ledger/route.ts');assert(ledger.includes('a.owner=e.owner'));assert(ledger.includes('e.owner=?'));
});
test('Parser migrasi tidak memecah PL/pgSQL pada tanda titik koma internal',()=>{
 const sql=read('migrations/006_order_receipts_and_journal_corrections.sql');
 const items=splitSQLStatements(sql);
 assert.equal(items.length,7);assert(items.some(x=>x.includes('CREATE OR REPLACE FUNCTION')&&x.includes('END IF;')&&x.includes('END;')));
 assert.equal(splitSQLStatements("SELECT ';' AS x; SELECT $$a;b$$ AS y;").length,2);
 assert.throws(()=>splitSQLStatements('SELECT $$unfinished;'),/tidak lengkap/);
});

test('Penyuntingan produk memakai versi terakhir untuk menghindari lost update',()=>{
 const api=read('src/app/api/ecosystem/products/route.ts');
 const orders=read('src/app/api/ecosystem/orders/route.ts');
 const ui=read('src/app/_components/ecosystem-workspace.tsx');
 assert(api.includes('WHERE id=? AND owner=? AND updated=? FOR UPDATE'));
 assert(api.includes('RETURNING p.id,p.owner,p.updated,p.stock'));
 assert(api.includes('b.expectedUpdated'));
 assert(orders.includes('stock=stock-?,updated=?'));
 assert(ui.includes('Sunting produk'));
 assert(ui.includes("editing?'PATCH':'POST'"));
 assert(ui.includes('expectedUpdated:editing.updated'));
});
test('Undangan pembeli dan katalog publik tidak mengandung pembayaran semu',()=>{
 const api=read('src/app/api/ecosystem/orders/route.ts');
 const route=read('src/app/(public)/produk/page.tsx');
 assert(!api.includes("'paid'"));
 assert(route.includes('Belum tersedia pembayaran online'));
 assert(route.includes('u.enabled=TRUE'));
});
