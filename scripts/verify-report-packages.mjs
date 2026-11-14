import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync('migrations/009_report_packages.sql','utf8');
const workflow=readFileSync('docs/report-package-workflow.md','utf8');
const api=readFileSync('src/app/api/report-packages/route.ts','utf8');
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
assert.match(workflow,/server wajib membaca ulang setiap sumber/);
assert.match(workflow,/Administrator Sistem tidak membaca/);
assert.match(workflow,/belum selesai|belum dibangun|belum diterapkan/i);
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
for(const token of [
  "export default function ReportPackageManager",
  "Buat draf paket",
  "Verifikasi domain",
  "Setujui paket",
  "Tolak paket",
  "generator PDF/Excel",
]) assert.ok(ui.includes(token),'Missing report package UI workflow: '+token);
assert.ok(policy.includes('if (id === "laporan") return ["ketua", "sekretaris", "bendahara", "koordinator"].includes(role);'));

console.log('PASS: report-package schema invariants, null-safe version uniqueness, append-only history, snapshot immutability, and workflow guardrails (static contract check; not a PostgreSQL migration execution).');
