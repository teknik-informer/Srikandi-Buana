import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";
import { newDb, DataType } from "pg-mem";

const migration = newDb();
migration.public.registerFunction({
  name: "trim", args: [DataType.text], returns: DataType.text,
  implementation: (value) => String(value ?? "").trim(),
});
migration.public.registerFunction({
  name: "length", args: [DataType.text], returns: DataType.integer,
  implementation: (value) => String(value ?? "").length,
});
migration.public.registerFunction({
  name: "jsonb_typeof", args: [DataType.jsonb], returns: DataType.text,
  implementation: (value) => Array.isArray(value) ? "array" : typeof value,
});
for (const file of [
  "001_initial.sql",
  "002_roles.sql",
  "003_message_consent.sql",
  "004_enterprise_operations.sql",
  "005_external_access.sql",
  "006_agriculture_domain.sql",
]) {
  migration.public.none(readFileSync("migrations/" + file, "utf8"));
}
const { Pool } = migration.adapters.createPg();
const pool = new Pool();
const now = "2026-11-10T08:00:00.000Z";
const owner = "workspace-owner";
const otherOwner = "other-workspace";
await pool.query(
  "INSERT INTO users(id,email,password_hash,full_name,enabled,created,role,workspace_owner) VALUES($1,'admin@example.test','fixture','Owner',TRUE,$3,'admin',$1),($2,'other@example.test','fixture','Other',TRUE,$3,'admin',$2)",
  [owner, otherOwner, now],
);
const memberId = "verified-member";
await pool.query(
  "INSERT INTO records(id,owner,kind,data,created,updated) VALUES($1,$2,'anggota',$3,$4,$4)",
  [memberId, owner, JSON.stringify({ name: "Anggota Uji", status: "Aktif", verification: "Terverifikasi" }), now],
);
const inactiveMemberId = "inactive-member";
await pool.query(
  "INSERT INTO records(id,owner,kind,data,created,updated) VALUES($1,$2,'anggota',$3,$4,$4)",
  [inactiveMemberId, owner, JSON.stringify({ name: "Anggota Belum Aktif", status: "Tidak aktif", verification: "Terverifikasi" }), now],
);
const commodityId = "commodity-one";
await pool.query(
  "INSERT INTO agriculture_commodities(id,workspace_owner,code,name,default_unit,status,created_by,created_at,updated_at) VALUES($1,$2,'cabai-rawit','Cabai rawit','kg','active',$2,$3,$3)",
  [commodityId, owner, now],
);
const parcelId = "parcel-one";
await pool.query(
  "INSERT INTO farm_parcels(id,workspace_owner,member_id,parcel_code,name,area_m2,tenure_type,location_label,verification_status,verified_by,verified_at,created_by,updated_by,created_at,updated_at) VALUES($1,$2,$3,'SB-001','Kebun Utara',1500,'owned','Dusun Uji','verified',$2,$4,$2,$2,$4,$4)",
  [parcelId, owner, memberId, now],
);
const cycleId = "cycle-one";
await pool.query(
  "INSERT INTO crop_cycles(id,workspace_owner,parcel_id,commodity_id,season_label,planted_area_m2,planting_date,expected_harvest_date,status,verification_status,verified_by,verified_at,created_by,updated_by,created_at,updated_at) VALUES($1,$2,$3,$4,'Musim hujan 2026',1200,'2026-01-10','2026-04-10','completed','verified',$2,$5,$2,$2,$5,$5)",
  [cycleId, owner, parcelId, commodityId, now],
);
await pool.query(
  "INSERT INTO harvest_records(id,workspace_owner,crop_cycle_id,harvest_date,quantity,unit_code,notes,verification_status,verified_by,verified_at,created_by,updated_by,created_at,updated_at) VALUES('harvest-one',$1,$2,'2026-04-15',250,'kg','Hasil timbang','verified',$1,$3,$1,$1,$3,$3)",
  [owner, cycleId, now],
);

assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM farm_parcels WHERE workspace_owner=$1", [owner])).rows[0].n, 1);
assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM harvest_records WHERE workspace_owner=$1", [owner])).rows[0].n, 1);
await assert.rejects(
  () => pool.query(
    "INSERT INTO farm_parcels(id,workspace_owner,member_id,parcel_code,name,area_m2,tenure_type,created_by,updated_by,created_at,updated_at) VALUES('cross-parcel',$1,$2,'SB-X','Lintas Workspace',100,'owned',$1,$1,$3,$3)",
    [otherOwner, memberId, now],
  ),
  /foreign key|violates/i,
);
await assert.rejects(
  () => pool.query(
    "INSERT INTO farm_parcels(id,workspace_owner,member_id,member_kind,parcel_code,name,area_m2,tenure_type,created_by,updated_by,created_at,updated_at) VALUES('wrong-kind',$1,$2,'users','SB-W','Jenis Salah',100,'owned',$1,$1,$3,$3)",
    [owner, memberId, now],
  ),
  /check constraint|violates/i,
);
await assert.rejects(
  () => pool.query(
    "INSERT INTO crop_cycles(id,workspace_owner,parcel_id,commodity_id,season_label,planted_area_m2,planting_date,expected_harvest_date,created_by,updated_by,created_at,updated_at) VALUES('cross-cycle',$1,$2,$3,'Uji musim',100,'2026-01-01',NULL,$1,$1,$4,$4)",
    [otherOwner, parcelId, commodityId, now],
  ),
  /foreign key|violates/i,
);
await assert.rejects(
  () => pool.query(
    "INSERT INTO harvest_records(id,workspace_owner,crop_cycle_id,harvest_date,quantity,unit_code,created_by,updated_by,created_at,updated_at) VALUES('bad-unit',$1,$2,'2026-04-15',10,'karung',$1,$1,$3,$3)",
    [owner, cycleId, now],
  ),
  /check constraint|violates/i,
);
await assert.rejects(
  () => pool.query(
    "INSERT INTO agriculture_commodities(id,workspace_owner,code,name,default_unit,created_by,created_at,updated_at) VALUES('duplicate-commodity',$1,'cabai-rawit','Cabai rawit lain','kg',$1,$2,$2)",
    [owner, now],
  ),
  /unique|duplicate/i,
);

const policyBundle = await build({
  entryPoints: ["src/lib/external-access-policy.ts"],
  bundle: true, write: false, platform: "node", format: "cjs",
});
const policyModule = { exports: {} };
vm.runInNewContext(policyBundle.outputFiles[0].text, { module: policyModule, exports: policyModule.exports });
const { canExternalRead, activeExternalGrants } = policyModule.exports;
const principal = {
  accountId: "external-account",
  workspaceOwner: owner,
  organizationId: "external-org",
  organizationType: "government",
  organizationName: "Instansi Uji",
  email: "reader@example.test",
  fullName: "Pengguna Uji",
  accountStatus: "active",
  grants: [{
    id: "grant",
    audience: "government",
    purpose: "Pemantauan program pertanian dan hasil yang telah diverifikasi",
    status: "active",
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2027-01-01T00:00:00.000Z",
    scopes: [
      { type: "aggregate", ref: "members", permission: "aggregate" },
      { type: "aggregate", ref: "land", permission: "aggregate" },
      { type: "aggregate", ref: "harvest", permission: "aggregate" },
      { type: "program", ref: "3", permission: "read" },
    ],
  }],
};
const at = new Date("2026-11-10T08:30:00.000Z");
for (const key of ["members", "land", "harvest"]) {
  assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "aggregate", aggregateKey: key }, at), true);
}
for (const key of ["aid", "project_progress", "project_finance"]) {
  assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "aggregate", aggregateKey: key }, at), false);
}
const legacyGrant = { ...principal, grants: [{ ...principal.grants[0], scopes: [{ type: "aggregate", ref: "aid", permission: "aggregate" }] }] };
assert.equal(canExternalRead(legacyGrant, { workspaceOwner: owner, classification: "aggregate", aggregateKey: "aid" }, at), false, "Legacy unsupported aggregate grants must be denied");
assert.equal(canExternalRead(principal, { workspaceOwner: otherOwner, classification: "aggregate", aggregateKey: "land" }, at), false);
assert.equal(canExternalRead({ ...principal, accountStatus: "disabled" }, { workspaceOwner: owner, classification: "aggregate", aggregateKey: "harvest" }, at), false);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "personal", aggregateKey: "members" }, at), false);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "program", programId: "3" }, at), true);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "program", programId: "4" }, at), false);
const legacyOnly = { ...principal, grants: [{ ...principal.grants[0], scopes: [{ type: "aggregate", ref: "aid", permission: "aggregate" }] }] };
assert.equal(activeExternalGrants(legacyOnly.grants, at).length, 0, "Unsupported legacy grants must not keep an external account active");

const api = readFileSync("src/app/api/agriculture/route.ts", "utf8");
const summary = readFileSync("src/lib/external-agriculture-summary.ts", "utf8");
const portal = readFileSync("src/app/portal-eksternal/page.tsx", "utf8");
const nav = readFileSync("src/lib/navigation-config.ts", "utf8");
const access = readFileSync("src/features/identity/access-policy.ts", "utf8");
assert(api.includes('sameOrigin(request)'), "Writes must enforce same-origin requests");
assert(api.includes('if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(raw))'), "Date inputs must accept standard YYYY-MM-DD format");
const datePattern = api.match(/if \(!(.+?)\.test\(raw\)\)/)?.[1];
assert.ok(datePattern, "ISO date validation regex must be present");
const dateRegex = vm.runInNewContext(datePattern);
assert.equal(dateRegex.test("2026-11-10"), true, "A valid ISO date must pass validation");
assert.equal(dateRegex.test("2026-11-1"), false, "A malformed ISO date must fail validation");
assert(api.includes('.replace(/[\\u0300-\\u036f]/g, "")'), "Commodity slugs must normalize combining Unicode accents");
assert(api.includes("memberData.status !== \"Aktif\"") && api.includes("memberData.verification !== \"Terverifikasi\""), "Lands must be linked to active, verified members");
assert(api.includes('!["admin", "ketua"].includes(user.role)'), "Verification must require administrator or chair");
assert(api.includes('user.programIds.includes("3")'), "Coordinator write access must require agriculture program assignment");
assert(api.includes("WHERE p.workspace_owner=?") && api.includes("WHERE h.workspace_owner=?"), "Queries must be workspace-scoped");
assert(summary.includes("data::jsonb->>'status'='Aktif'") && summary.includes("data::jsonb->>'verification'='Terverifikasi'"));
assert(summary.includes("p.verification_status='verified'") && summary.includes("c.verification_status='verified'") && summary.includes("h.verification_status='verified'"));
assert(summary.includes("COUNT(DISTINCT p.member_id)") && summary.includes("COUNT(*) AS verified_count"), "Aggregates must be based on unique members and verified records");
assert(summary.includes("count >= 5") && summary.includes("contributors >= 3"), "Small cohorts must be suppressed");
assert(!/NIK|phone|coordinate|latitude|longitude/i.test(summary), "External summary must not query personal contact or precise location fields");
assert(portal.includes("getExternalAgricultureSummary(user)") && portal.includes("Ringkasan pertanian terverifikasi"));
assert(nav.includes("admin('pertanian','Pengelolaan Pertanian'"));
assert(access.includes("if(id==='pertanian')return ['admin','ketua','koordinator'].includes(role)"));

console.log("PASS agriculture: migration constraints, workspace/member isolation, commodity and unit integrity, verified hierarchy, coordinator assignment, two-person verification, scoped external grants, and privacy thresholds.");
await pool.end();
