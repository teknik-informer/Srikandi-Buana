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
const operations = read("src/lib/enterprise/operations.ts");
const operationsApi = read("src/app/api/operations/route.ts");
const agricultureApi = read("src/app/api/agriculture/route.ts");
const attendanceApi = read("src/app/api/attendance/route.ts");
const ledgerApi = read("src/app/api/ecosystem/ledger/route.ts");
const ordersApi = read("src/app/api/ecosystem/orders/route.ts");
const productsApi = read("src/app/api/ecosystem/products/route.ts");
const stockApi = read("src/app/api/ecosystem/stock-history/route.ts");
const adminAuth = read("src/app/admin-auth.ts");
const messagesApi = read("src/app/api/messages/route.ts");

assert.match(auth, /process\.env\.ADMIN_EMAIL/);
assert.match(auth, /user\.owner_role!=='admin'/);
assert.match(auth, /user\.id!==user\.workspace_owner/);
assert.match(auth, /String\(user\.email\)\.toLowerCase\(\)!==process\.env\.ADMIN_EMAIL\.trim\(\)\.toLowerCase\(\)/,
  "Only the primary ADMIN_EMAIL account may hold the root Administrator Sistem identity.");

assert.match(auth, /architectFullAccess:user\.role === "admin"/, "The verified root administrator must retain full access in Production as well as Preview.");
assert.doesNotMatch(auth, /isArchitectQaPreview|VERCEL_ENV/, "Root administrator authority must not depend on a Preview-only environment flag.");

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

assert.match(policy, /\["admin", "sekretaris"\]\.includes\(user\.role\)/, "System administrator may review task outcomes.");
assert.match(policy, /\["admin", "ketua"\]\.includes\(user\.role\)/, "System administrator may publish reviewed content.");
assert.match(operations, /canReview = \(user: Principal\) => user\.role === "admin" \|\| user\.role === "ketua"/);
assert.match(operations, /canInspectOperations = \(user: Principal\) => user\.role === "admin" \|\| user\.role === "ketua"/);
assert.match(operations, /return user\.role === "admin" \|\|/);
assert.doesNotMatch(operations, /if \(user\.role === "admin"\) return false;/);
assert.doesNotMatch(operationsApi, /user\.role===\x27admin\x27\)return json\(\{error:\x27Administrator Sistem tidak/);
assert.match(operationsApi, /!\[\x27admin\x27,\x27ketua\x27\]\.includes\(user\.role\)/);
assert.match(agricultureApi, /user\.role === "admin" \|\| \["ketua", "sekretaris", "bendahara"\]/);
assert.match(agricultureApi, /user\.role !== "sekretaris" && user\.role !== "admin"/);
assert.match(attendanceApi, /user\.role!=='sekretaris'&&user\.role!=='admin'/);
assert.match(ledgerApi, /canRead=\(role:string\)=>\['admin','ketua','sekretaris','bendahara'\]/);
assert.match(ledgerApi, /canWrite=\(role:string\)=>role==='admin'\|\|role==='bendahara'/);
assert.match(ordersApi, /canReadAll=\['admin','ketua','bendahara'\]/);
assert.match(ordersApi, /c\.user\.role!=='bendahara'&&c\.user\.role!=='admin'/);
assert.match(productsApi, /\['admin','ketua','bendahara'\]\.includes\(user\.role\)/);
assert.match(productsApi, /c\.user\.role!=='bendahara'&&c\.user\.role!=='admin'/);
assert.match(stockApi, /\['admin','ketua','bendahara'\]\.includes\(c\.user\.role\)/);
assert.match(adminAuth, /return u&&\['admin','ketua','sekretaris'\]\.includes\(u\.role\)\?u:null/);
assert.match(messagesApi, /getMessageManagerUser/);
assert.match(fileAccess, /if\(isArchitectFullAccess\(user\)\)/);
assert.match(fileApi, /file\.uploader_id!==user\.accountId&&!isArchitectFullAccess\(user\)/,
  "Only the authenticated root administrator may manage another uploader's file.");
assert.match(fileApi, /WHERE id=\? AND owner=\?/,
  "File operations must remain constrained to the authenticated workspace owner.");

console.log("PASS: root Administrator Sistem identity, Production-independent application authorization, CRUD policy, six-app navigation, and workspace-scoped file safeguards.");
