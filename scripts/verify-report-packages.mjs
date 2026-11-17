import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync('migrations/009_report_packages.sql','utf8');
const scopeMigration=readFileSync('migrations/010_report_package_source_scope.sql','utf8');
const workflow=readFileSync('docs/report-package-workflow.md','utf8');
const api=readFileSync('src/app/api/report-packages/route.ts','utf8');
const exportApi=readFileSync('src/app/api/report-packages/export/route.ts','utf8');
const ui=readFileSync('src/app/_components/report-package-manager.tsx','utf8');
const policy=readFileSync('src/features/identity/access-policy.ts','utf8');
for(const table of ['report_packages','report_package_events']){
 assert.match(migration,new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\b'),'Report package table must exist: '+table);
}
for(const token of [
 "CHECK(group_id IN ('operasional','keanggotaan','administrasi','keuangan','usaha','publikasi'))",
 "CHECK(status IN ('draft','verified','approved','rejected','superseded'))",
 "source_manifest JSONB NOT NULL",
 "snapshot JSONB NOT NULL",
 "snapshot_hash CHAR(64) NOT NULL",
 "CREATE UNIQUE INDEX IF NOT EXISTS report_packages_owner_group_period_version_unique",
 "COALESCE(period_start, '-infinity'::date)",
 "COALESCE(period_end, 'infinity'::date)",
 "CREATE TRIGGER srikandi_report_package_snapshot_immutable",
 "CREATE TRIGGER srikandi_report_package_events_immutable",
 "BEFORE UPDATE OR DELETE ON report_packages",
 "BEFORE UPDATE OR DELETE ON report_package_events",
]){
 assert.ok(migration.includes(token),'Missing database invariant: '+token);
}
assert.ok(!migration.includes('UNIQUE(owner,group_id,period_start,period_end,package_version)'));
assert.ok(migration.includes('NEW.source_manifest IS DISTINCT FROM OLD.source_manifest'));
assert.ok(migration.includes('NEW.snapshot IS DISTINCT FROM OLD.snapshot'));
assert.ok(migration.includes('NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash'));
assert.match(scopeMigration,/ADD COLUMN IF NOT EXISTS source_scope JSONB/);
assert.match(scopeMigration,/CREATE TABLE IF NOT EXISTS report_package_counters/);
assert.match(scopeMigration,/PRIMARY KEY\(owner,group_id,period_start_key,period_end_key\)/);
assert.match(scopeMigration,/NEW.source_scope IS DISTINCT FROM OLD.source_scope/);
assert.match(scopeMigration,/source_scope_shape/);
assert.match(scopeMigration,/jsonb_typeof\(source_scope->'kinds'\) = 'array'/);
assert.match(scopeMigration,/source_scope \? 'mode'/);
assert.match(scopeMigration,/source_scope \? 'programIds'/);
assert.match(workflow,/server membandingkan ID, jenis, waktu pembaruan/);
assert.match(workflow,/Administrator Sistem memiliki akses lintas domain/);
assert.match(workflow,/Migrasi .*telah diverifikasi pada cabang Neon QA/i, 'Workflow documentation must reflect verified QA migration state.');
assert.match(workflow,/UAT API terautentikasi .*masih diperlukan|integrasi HTTP terautentikasi .*belum dibuktikan/i, 'Documentation must not claim authenticated UAT is complete.');
assert.match(workflow,/Tidak ada perubahan atau migrasi Production/i, 'Documentation must explicitly preserve Production safety.');
for(const token of [
  "export async function GET()",
  "export async function POST(req: Request)",
  "export async function PATCH(req: Request)",
  "user.role === \"admin\"",
  "canReadRecord(c.user!,row)",
  "sourceHash",
  "md5(r.data::jsonb::text)",
  "created_by<>?",
  "status='superseded'",
  "consentRecorded",
  "sourceManifest",
  "snapshotHash",
]) assert.ok(api.includes(token),'Missing report package API guardrail: '+token);
assert.match(api,/Paket belum dapat disahkan: status berubah atau ada sumber yang berubah/);
assert.match(api,/if \(user\.role === "sekretaris"\) return \["operasional","keanggotaan","administrasi","publikasi"\]\.includes\(group\)/,
  "Secretariat package reads must stay within its own domains");
assert.match(api,/if \(user\.role === "bendahara"\) return \["keuangan","usaha"\]\.includes\(group\)/,
  "Treasury package reads must stay within finance and business domains");
assert.match(api,/if \(user\.role === "admin"\) return true/,
  "System administrator must retain cross-domain package read, create and verification authority");
assert.match(api,/String\(pkg\.created_by\) === c\.user!\.accountId/,"Administrator Sistem must not approve a package it created.");
assert.match(api,/\["admin","ketua"\]\.includes\(c\.user!\.role\)/,
  "System administrator may approve or reject another user's package with an audit event");
assert.match(api,/function chairSafeSnapshot\(value: unknown\)/,
  "Chair report views must use a dedicated privacy projection");
assert.match(api,/metadataKeys = \["date","status","type","category","programId","period","code"\]/,
  "Chair report views must omit private source fields");
assert.match(api,/c\.user!\.role === "ketua"\s*\? \{\.\.\.row,snapshot:chairSafeSnapshot\(row\.snapshot\)\}/,
  "Chair GET responses must sanitize stored snapshots");
assert.match(api,/user\.role === "koordinator" && group === "operasional" && createdBy === user\.accountId/,
  "Coordinator package reads must remain limited to own operational packages");
for(const token of [
  "export default function ReportPackageManager",
  "Buat draf paket",
  "Verifikasi domain",
  "Setujui paket",
  "Tolak paket",
  "Unduh Excel (CSV)",
  "Cetak / Simpan PDF",
]) assert.ok(ui.includes(token),'Missing report package UI workflow: '+token);
assert.ok(policy.includes('if (id === "laporan") return ["ketua", "sekretaris", "bendahara", "koordinator"].includes(role);'));

assert.ok(api.includes('source_scope IS NOT NULL'),'Approval must reject legacy packages without a captured scope.');
assert.ok(api.includes('c.db!.batch(['),'Version allocation and package creation must use one serializable transaction.');
assert.ok(api.includes('ON CONFLICT(owner,group_id,period_start_key,period_end_key) DO UPDATE SET last_version=report_package_counters.last_version+1'),'Concurrent version allocation must use an atomic counter upsert.');
assert.ok(api.includes('jsonb_array_elements_text(report_packages.source_scope'),'Coordinator approval must retain the captured program scope.');
assert.ok(api.includes('items.item->>\'id\'=r.id'),'Approval must detect newly eligible source records.');
assert.ok(api.includes('const sourceScope'),'Package creation must persist its source visibility scope.');
assert.ok(api.includes('kinds:groupKinds[group].filter(kind=>canReadKindForRole(c.user!.role,kind))'),'Scope must contain only source kinds readable by the creator.');
assert.ok(api.includes('programIds.length === 0'),'Coordinator without assigned programs must not create a package.');
assert.ok(api.includes('programIds:[...new Set(c.user!.programIds.map(String))].sort()'),'Coordinator scope must be captured deterministically.');
console.log('PASS: report-package schema invariants, null-safe version uniqueness, append-only history, snapshot immutability, and workflow guardrails (static contract check; not a PostgreSQL migration execution).');

for(const token of [
  'export async function GET(request: Request)',
  'pkg.status !== "approved"',
  'user.role === "anggota" || !env.DB',
  'Content-Type":"text/csv; charset=utf-8"',
  'format === "csv"',
  'Disetujui oleh',
  'SHA-256',
  'window.print()',
  'user.role === "ketua" && snapshot',
  'memberIds',
  'Content-Security-Policy',
]) assert.ok(exportApi.includes(token),'Missing approved-package export guardrail: '+token);
