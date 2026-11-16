import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(path, "utf8");
const policy = read("src/features/identity/access-policy.ts");
const registry = read("src/features/enterprise/registry.ts");
const route = read("src/app/dashboard/[[...section]]/page.tsx");
const shell = read("src/app/_components/workspace-shell.tsx");
const navigation = read("src/app/_components/dashboard-navigation.tsx");
const center = read("src/app/_components/architect-qa-test-center.tsx");
assert(policy.includes('process.env.VERCEL_ENV === "preview"'));
assert(policy.includes('process.env.VERCEL_GIT_COMMIT_REF === "feat/architect-identity-console-2026-11-15"'));
assert(policy.includes("if (isArchitectFullAccess(user)) return true;"));
assert(policy.includes('if (role === "admin") return false;'), "Production role-only policy must not grant organization access");
for (const fn of ["canReadKind", "canWriteKind", "canReadRecord", "canWriteRecord", "canReadSection"]) {
  const start = policy.indexOf("export function " + fn);
  assert.notEqual(start, -1, fn + " must exist");
  assert.ok(policy.slice(start, start + 500).includes("isArchitectFullAccess(user)"), fn + " must enforce the preview capability");
}
assert(registry.includes("getVisibleEnterpriseDashboards(role: Role, fullAccess = false)"));
assert(registry.includes("getVisibleEnterpriseUtilities(role: Role, fullAccess = false)"));
assert(route.includes("isArchitectFullAccess(admin)"));
assert(shell.includes("architectFullAccess={isArchitectFullAccess(user)}"));
assert(navigation.includes("getVisibleEnterpriseDashboards(user.role, architectFullAccess)"));
assert(navigation.includes("getVisibleEnterpriseUtilities(user.role, architectFullAccess)"));
assert(center.includes("canReadSection(principal, section)"));
assert(center.includes("Full Access QA"));
console.log("PASS Architect Full Access: Preview-branch-only CRUD policy, all dashboard navigation, QA inspector, and Production role isolation.");
