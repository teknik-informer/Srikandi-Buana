import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";
import { newDb, DataType } from "pg-mem";

const migration = newDb();
migration.public.registerFunction({
  name: "trim",
  args: [DataType.text],
  returns: DataType.text,
  implementation: (value) => String(value ?? "").trim(),
});
migration.public.registerFunction({
  name: "length",
  args: [DataType.text],
  returns: DataType.integer,
  implementation: (value) => String(value ?? "").length,
});
migration.public.registerFunction({
  name: "jsonb_typeof",
  args: [DataType.jsonb],
  returns: DataType.text,
  implementation: (value) => Array.isArray(value) ? "array" : typeof value,
});
for (const file of [
  "001_initial.sql",
  "002_roles.sql",
  "003_message_consent.sql",
  "004_enterprise_operations.sql",
  "005_external_access.sql",
]) {
  migration.public.none(readFileSync("migrations/" + file, "utf8"));
}
const { Pool } = migration.adapters.createPg();
const pool = new Pool();
const now = "2026-11-10T00:00:00.000Z";
const owner = "workspace-owner";
const otherOwner = "other-workspace";
await pool.query(
  "INSERT INTO users(id,email,password_hash,full_name,created,role,workspace_owner) VALUES($1,$2,'fixture',$3,$4,'admin',$1),($5,$6,'fixture','Other owner',$4,'admin',$5)",
  [owner, "admin@example.test", "Workspace owner", now, otherOwner, "other@example.test"],
);

const orgId = "external-org";
await pool.query(
  "INSERT INTO external_organizations(id,workspace_owner,organization_type,legal_name,verification_status,created_by,created_at,updated_at) VALUES($1,$2,'ngo','Lembaga Uji','verified',$2,$3,$3)",
  [orgId, owner, now],
);
const accountId = "external-account";
await pool.query(
  "INSERT INTO external_portal_accounts(id,workspace_owner,organization_id,email,full_name,password_hash,status,created_by,created_at,updated_at) VALUES($1,$2,$3,'mitra@example.test','Akun Mitra','scrypt-fixture','active',$2,$4,$4)",
  [accountId, owner, orgId, now],
);
const grantId = "grant-one";
await pool.query(
  "INSERT INTO external_access_grants(id,workspace_owner,account_id,organization_id,audience,purpose,status,valid_from,valid_until,approved_by,approved_at,created_at) VALUES($1,$2,$3,$4,'ngo','Pemantauan proyek pemberdayaan','active',$5,'2027-11-10T00:00:00.000Z',$2,$5,$5)",
  [grantId, owner, accountId, orgId, now],
);
const scopes = [
  ["scope-project", "project", "project-001", "read"],
  ["scope-program", "program", "program-001", "read"],
  ["scope-harvest", "aggregate", "harvest", "aggregate"],
  ["scope-region", "region", "region-kedu", "read"],
];
for (const [id, type, ref, permission] of scopes) {
  await pool.query(
    "INSERT INTO external_access_grant_scopes(id,workspace_owner,grant_id,scope_type,scope_ref,permission,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [id, owner, grantId, type, ref, permission, now],
  );
}
assert.equal((await pool.query("SELECT id FROM external_access_grants WHERE workspace_owner=$1", [owner])).rows.length, 1);
assert.equal((await pool.query("SELECT scope_ref FROM external_access_grant_scopes WHERE grant_id=$1", [grantId])).rows.length, 4);
await assert.rejects(
  () => pool.query(
    "INSERT INTO external_access_grant_scopes(id,workspace_owner,grant_id,scope_type,scope_ref,permission,created_at) VALUES('duplicate',$1,$2,'project','project-001','read',$3)",
    [owner, grantId, now],
  ),
  /unique|duplicate/i,
);
await assert.rejects(
  () => pool.query(
    "INSERT INTO external_access_grants(id,workspace_owner,account_id,organization_id,audience,purpose,status,valid_from,valid_until,approved_by,approved_at,created_at) VALUES('cross-tenant',$1,$2,$3,'ngo','Pemantauan proyek eksternal','active',$4,'2027-11-10T00:00:00.000Z',$5,$4,$4)",
    [otherOwner, accountId, orgId, now, otherOwner],
  ),
  /foreign key|violates/i,
);
await assert.rejects(
  () => pool.query(
    "INSERT INTO external_access_grant_scopes(id,workspace_owner,grant_id,scope_type,scope_ref,permission,created_at) VALUES('invalid-scope',$1,$2,'aggregate','land','read',$3)",
    [owner, grantId, now],
  ),
  /check constraint|violates/i,
);

const bundle = await build({
  entryPoints: ["src/lib/external-access-policy.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
});
const module = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports });
const { canExternalRead, activeExternalGrants } = module.exports;
const principal = {
  accountId,
  workspaceOwner: owner,
  organizationId: orgId,
  organizationType: "ngo",
  organizationName: "Lembaga Uji",
  email: "mitra@example.test",
  fullName: "Akun Mitra",
  accountStatus: "active",
  grants: [{
    id: grantId,
    audience: "ngo",
    purpose: "Pemantauan proyek pemberdayaan",
    status: "active",
    validFrom: now,
    validUntil: "2027-11-10T00:00:00.000Z",
    scopes: [
      { type: "project", ref: "project-001", permission: "read" },
      { type: "program", ref: "program-001", permission: "read" },
      { type: "aggregate", ref: "harvest", permission: "aggregate" },
      { type: "region", ref: "region-kedu", permission: "read" },
    ],
  }],
};
const today = new Date("2026-11-10T12:00:00.000Z");
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "project", projectId: "project-001" }, today), true);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "project", projectId: "project-002" }, today), false);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "program", programId: "program-001" }, today), true);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "program", programId: "program-002" }, today), false);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "aggregate", aggregateKey: "harvest" }, today), true);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "aggregate", aggregateKey: "members" }, today), false);
assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification: "aggregate", regionId: "region-kedu" }, today), true);
assert.equal(canExternalRead(principal, { workspaceOwner: otherOwner, classification: "project", projectId: "project-001" }, today), false);
for (const classification of ["personal", "financial", "internal"]) {
  assert.equal(canExternalRead(principal, { workspaceOwner: owner, classification, projectId: "project-001" }, today), false);
}
assert.equal(canExternalRead({ ...principal, accountStatus: "disabled" }, { workspaceOwner: owner, classification: "project", projectId: "project-001" }, today), false);
assert.equal(canExternalRead({ ...principal, organizationType: "government" }, { workspaceOwner: owner, classification: "project", projectId: "project-001" }, today), false);
assert.equal(canExternalRead({ ...principal, grants: [{ ...principal.grants[0], status: "revoked" }] }, { workspaceOwner: owner, classification: "project", projectId: "project-001" }, today), false);
assert.equal(canExternalRead({ ...principal, grants: [{ ...principal.grants[0], validUntil: "2026-11-10T11:59:59.000Z" }] }, { workspaceOwner: owner, classification: "project", projectId: "project-001" }, today), false);
assert.equal(canExternalRead({ ...principal, grants: [{ ...principal.grants[0], validFrom: "2026-11-11T00:00:00.000Z" }] }, { workspaceOwner: owner, classification: "project", projectId: "project-001" }, today), false);
assert.equal(canExternalRead(null, { workspaceOwner: owner, classification: "project", projectId: "project-001" }, today), false);
assert.equal(canExternalRead(null, { workspaceOwner: owner, classification: "public" }, today), true);
assert.equal(activeExternalGrants(principal.grants, today).length, 1);
assert.equal(activeExternalGrants([{ ...principal.grants[0], scopes: [] }], today).length, 0);

const adminRoute = readFileSync("src/app/api/external-access/route.ts", "utf8");
const activateRoute = readFileSync("src/app/api/auth/activate-external/route.ts", "utf8");
const auth = readFileSync("src/lib/external-auth.ts", "utf8");
const login = readFileSync("src/app/api/auth/login/route.ts", "utf8");
const logout = readFileSync("src/app/api/auth/logout/route.ts", "utf8");
assert(adminRoute.includes("getAdminUser()") && adminRoute.includes("sameOrigin(request)"));
assert(adminRoute.includes("WHERE id=? AND workspace_owner=?"), "Organization lookup must be workspace-scoped");
assert(adminRoute.includes("DELETE FROM external_portal_sessions WHERE account_id=?"), "Disabling account must revoke its sessions");
assert(adminRoute.includes("status='revoked'") && adminRoute.includes("revoked_at=?"), "Grant revocation must be recorded");
assert(activateRoute.includes("i.consumed_at IS NULL") && activateRoute.includes("i.revoked_at IS NULL"));
assert(activateRoute.includes("i.expires_at>?") && activateRoute.includes("o.verification_status='verified'"));
assert(auth.includes("a.status='active'") && auth.includes("o.verification_status='verified'"));
assert(auth.includes("owner.enabled=TRUE") && auth.includes("owner.role='admin'"));
assert(login.includes("external_access_grant_scopes") && login.includes("g.valid_until>?"));
assert(login.includes('redirect: "/portal-eksternal"'));
assert(logout.includes("DELETE FROM external_portal_sessions"));
console.log("PASS external access: migration constraints, tenant foreign keys, unique scopes, deny-by-default policy, exact project/program/region/aggregate scopes, expiry/revocation, account status, owner isolation, personal/financial denial, activation/login/session guardrails.");
await pool.end();
