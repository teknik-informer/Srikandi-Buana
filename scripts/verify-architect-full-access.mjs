import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const policy = read("src/features/identity/access-policy.ts");
const auth = read("src/lib/auth.ts");
const navigation = read("src/app/_components/dashboard-navigation.tsx");
const shell = read("src/app/_components/workspace-shell.tsx");
const hub = read("src/app/_components/application-hub.tsx");
const registry = read("src/features/platform/application-registry.ts");
const fileAccess = read("src/lib/file-access.ts");
const fileApi = read("src/app/api/files/route.ts");

assert.match(auth, /process\.env\.ADMIN_EMAIL/);
assert.match(auth, /user\.owner_role!=='admin'/);
assert.match(auth, /user\.id!==user\.workspace_owner/);
assert.match(auth, /String\(user\.email\)\.toLowerCase\(\)!==process\.env\.ADMIN_EMAIL\.trim\(\)\.toLowerCase\(\)/,
  "Only the primary ADMIN_EMAIL account may hold the root Administrator Sistem identity.");

assert.match(policy, /export function isArchitectFullAccess\(user: Pick<Principal, "role">\): boolean \{\s*return user\.role === "admin";/);
assert.match(policy, /if \(user\.role === "admin"\) return true;/,
  "System administrator must bypass module availability restrictions.");
assert.match(policy, /export function canReadKindForRole\(role: Role, kind: string\): boolean \{\s*if \(role === "admin"\) return true;/);
assert.match(policy, /export function canReadSectionForRole\(role: Role, id: string\): boolean \{\s*if \(role === "admin"\) return true;/);

for (const fn of ["canReadKind", "canWriteKind", "canReadRecord", "canWriteRecord"]) {
  const start = policy.indexOf("export function " + fn + "(");
  assert.notEqual(start, -1, fn + " must exist");
  assert.ok(policy.slice(start, start + 700).includes("isArchitectFullAccess(user)"),
    fn + " must enforce System Administrator full access.");
}

assert.match(shell, /architectFullAccess=\{isArchitectFullAccess\(user\)\}/);
assert.match(navigation, /getVisibleEnterpriseDashboardsForUser\(user, architectFullAccess, user\.role === "admin"\)/);
assert.match(navigation, /getVisibleEnterpriseUtilities\(user\.role, architectFullAccess\)/);
assert.match(hub, /platformApplications/);
assert.match(registry, /platform-core[\s\S]*organization[\s\S]*agriculture[\s\S]*business[\s\S]*bi-analytics[\s\S]*public-partnership/);

for (const id of ["platform-core", "organization", "agriculture", "business", "bi-analytics", "public-partnership"]) {
  assert.ok(navigation.includes('application.id === "' + id + '"') ||
    navigation.includes('application.id === "' + id.replace("bi-analytics", "bi-analytics") + '"'),
    "Sidebar must explicitly map application " + id);
}

assert.match(fileAccess, /if\(isArchitectFullAccess\(user\)\)/);
assert.match(fileApi, /file\.uploader_id!==user\.accountId&&!isArchitectFullAccess\(user\)/,
  "Only the authenticated root administrator may manage another uploader's file.");
assert.match(fileApi, /WHERE id=\? AND owner=\?/,
  "File operations must remain constrained to the authenticated workspace owner.");

console.log("PASS: root Administrator Sistem identity, Production-independent application authorization, CRUD policy, six-app navigation, and workspace-scoped file safeguards.");
