import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync('migrations/007_database_integrity_and_audit.sql','utf8');

test('Jurnal seimbang ditegakkan database saat commit',()=>{
 assert.match(migration,/CREATE CONSTRAINT TRIGGER srikandi_ledger_entry_balance[\s\S]*DEFERRABLE INITIALLY DEFERRED/);
 assert.match(migration,/CREATE CONSTRAINT TRIGGER srikandi_ledger_lines_balance[\s\S]*DEFERRABLE INITIALLY DEFERRED/);
 assert.match(migration,/line_count < 2 OR debit_total <= 0 OR debit_total <> credit_total/);
});

test('Jurnal dan jejak audit tidak dapat diubah atau dihapus',()=>{
 for(const trigger of [
  'srikandi_ledger_entries_immutable',
  'srikandi_ledger_lines_immutable',
  'srikandi_ledger_reversals_immutable',
  'srikandi_stock_history_immutable',
  'srikandi_order_events_immutable',
  'srikandi_product_audit_immutable'
 ]) assert.ok(migration.includes(trigger),`missing ${trigger}`);
 assert.ok(migration.includes('BEFORE UPDATE OR DELETE'));
});

test('Riwayat status pesanan dan audit produk memiliki relasi workspace-scoped',()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS commerce_order_events/);
 assert.match(migration,/FOREIGN KEY\(order_id,owner\) REFERENCES commerce_orders\(id,owner\)/);
 assert.match(migration,/CREATE TABLE IF NOT EXISTS commerce_product_audit/);
 assert.match(migration,/FOREIGN KEY\(product_id,owner\) REFERENCES commerce_products\(id,owner\)/);
});
