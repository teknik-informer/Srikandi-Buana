import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync('migrations/009_report_packages.sql','utf8');
const workflow=readFileSync('docs/report-package-workflow.md','utf8');
for(const table of ['report_packages','report_package_events']){
 assert.match(migration,new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\b'),'Report package table must exist: '+table);
}
for(const token of [
 "CHECK(group_id IN ('operasional','keanggotaan','administrasi','keuangan','usaha','publikasi'))",
 "CHECK(status IN ('draft','verified','approved','rejected','superseded'))",
 "source_manifest JSONB NOT NULL",
 "snapshot JSONB NOT NULL",
 "snapshot_hash CHAR(64) NOT NULL",
 "UNIQUE(owner,group_id,period_start,period_end,package_version)",
 "CREATE TRIGGER srikandi_report_package_snapshot_immutable",
 "CREATE TRIGGER srikandi_report_package_events_immutable",
 "BEFORE UPDATE OR DELETE ON report_packages",
 "BEFORE UPDATE OR DELETE ON report_package_events",
]){
 assert.ok(migration.includes(token),'Missing database invariant: '+token);
}
assert.match(migration,/NEW\.source_manifest IS DISTINCT FROM OLD\.source_manifest/);
assert.match(migration,/NEW\.snapshot IS DISTINCT FROM OLD\.snapshot/);
assert.match(migration,/NEW\.snapshot_hash IS DISTINCT FROM OLD\.snapshot_hash/);
assert.match(workflow,/server wajib membaca ulang setiap sumber/);
assert.match(workflow,/Administrator Sistem tidak membaca/);
assert.match(workflow,/belum selesai|belum dibangun|belum diterapkan/i);
console.log('PASS: report-package schema invariants, append-only history, snapshot immutability, and workflow guardrails (static contract check; not a PostgreSQL migration execution).');
