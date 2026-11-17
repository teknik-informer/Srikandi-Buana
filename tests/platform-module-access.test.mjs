import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";
import { readFileSync } from "node:fs";

async function loadModule(entryPoint) {
  const bundle = await build({ entryPoints: [entryPoint], bundle: true, write: false, platform: "node", format: "cjs" });
  const commonjs = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: commonjs, exports: commonjs.exports, Intl, Date });
  return commonjs.exports;
}

const policy = await loadModule("src/features/identity/access-policy.ts");
const registry = await loadModule("src/features/enterprise/registry.ts");
const api = readFileSync("src/app/api/platform/modules/route.ts", "utf8");
const migration = readFileSync("migrations/020_platform_module_access.sql", "utf8");
const component = readFileSync("src/app/_components/platform-module-access-manager.tsx", "utf8");
const productApi = readFileSync("src/app/api/ecosystem/products/route.ts", "utf8");
const settingsApi = readFileSync("src/app/api/settings/route.ts", "utf8");
const reportApi = readFileSync("src/app/api/report-packages/route.ts", "utf8");
const reportExportApi = readFileSync("src/app/api/report-packages/export/route.ts", "utf8");
const exportApi = readFileSync("src/app/api/export/route.ts", "utf8");
const agricultureApi = readFileSync("src/app/api/agriculture/route.ts", "utf8");
const attendanceApi = readFileSync("src/app/api/hrm/attendance/route.ts", "utf8");

const principal = (role, moduleAccess = undefined) => ({
  accountId: "account-" + role,
  userId: "workspace-1",
  email: role + "@example.test",
  displayName: role,
  fullName: role,
  role,
  memberId: role === "anggota" ? "member-1" : null,
  position: "",
  programIds: role === "koordinator" ? ["1"] : [],
  moduleAccess,
});

test("supporting module disable hides only its assigned feature from parent workspace navigation", () => {
  const user = principal("ketua", { disabledModules: ["documents"], allowedModules: [], deniedModules: [] });
  const projects = registry.getVisibleEnterpriseDashboardsForUser(user).find((item) => item.id === "projects");
  assert.ok(projects);
  assert.ok(!projects.features.some((feature) => feature.id === "dokumen"));
  assert.ok(projects.features.some((feature) => feature.id === "program"));
  assert.equal(policy.canReadSection(user, "dokumen"), false);
  assert.equal(policy.canReadSection(user, "program"), true);
});

test("a persistent allow opens an application shell but never expands business data permissions", () => {
  const user = principal("anggota", { disabledModules: [], allowedModules: ["accounting"], deniedModules: [] });
  assert.equal(policy.canOpenModule(user, "accounting"), true);
  assert.equal(policy.canReadSection(user, "accounting"), true);
  assert.equal(policy.canReadKind(user, "kas"), false);
  assert.equal(policy.canWriteKind(user, "kas"), false);
  assert.equal(policy.canReadRecord(user, { id: "cash-1", kind: "kas", data: { amount: 100 } }), false);
});

test("workspace disable and explicit deny take precedence over a module launch allow", () => {
  const disabled = principal("ketua", { disabledModules: ["projects"], allowedModules: ["projects"], deniedModules: [] });
  const denied = principal("ketua", { disabledModules: [], allowedModules: ["projects"], deniedModules: ["projects"] });
  assert.equal(policy.canOpenModule(disabled, "projects"), false);
  assert.equal(policy.canReadKind(disabled, "program"), false);
  assert.equal(policy.canWriteKind(disabled, "kegiatan"), false);
  assert.equal(policy.canOpenModule(denied, "projects"), false);
  assert.equal(policy.canReadKind(denied, "program"), false);
});

test("role policy remains the ceiling for data actions after a module grant", () => {
  const memberGranted = principal("anggota", { disabledModules: [], allowedModules: ["projects"], deniedModules: [] });
  const coordinator = principal("koordinator", { disabledModules: [], allowedModules: ["accounting"], deniedModules: [] });
  assert.equal(policy.canOpenModule(memberGranted, "projects"), true);
  assert.equal(policy.canReadKind(memberGranted, "kegiatan"), true);
  assert.equal(policy.canReadKind(memberGranted, "program"), false);
  assert.equal(policy.canWriteKind(memberGranted, "kegiatan"), false);
  assert.equal(policy.canOpenModule(coordinator, "accounting"), true);
  assert.equal(policy.canReadKind(coordinator, "kas"), false);
  assert.equal(policy.canWriteKind(coordinator, "kas"), false);
});

test("an explicit shell-only grant appears as access-only and does not invent feature links", () => {
  const user = principal("anggota", { disabledModules: [], allowedModules: ["accounting"], deniedModules: [] });
  const visible = registry.getVisibleEnterpriseDashboardsForUser(user);
  const accounting = visible.find((item) => item.id === "accounting");
  assert.ok(accounting);
  assert.equal(accounting.accessOnly, true);
  assert.deepEqual(Array.from(accounting.features), []);
});

test("a disabled module is omitted from regular navigation, while technical admin remains catalog-only", () => {
  const user = principal("bendahara", { disabledModules: ["accounting"], allowedModules: [], deniedModules: [] });
  assert.ok(!registry.getVisibleEnterpriseDashboardsForUser(user).some((item) => item.id === "accounting"));
  const admin = registry.getVisibleEnterpriseDashboardsForUser(principal("admin"), false, true);
  assert.ok(admin.some((item) => item.id === "accounting" && item.catalogOnly === true));
});

test("Platform Module API requires system admin and carries reason, scope, expiry and audit", () => {
  assert.match(api, /user\.role !== "admin"/);
  assert.match(api, /set_module_enabled/);
  assert.match(api, /set_user_module_access/);
  assert.match(api, /cleanReason/);
  assert.match(api, /expires_at/);
  assert.match(api, /platform_module_access_audit/);
  assert.match(api, /platform_module_access_grants/);
  assert.match(api, /target\.role === "admin"/);
  assert.match(api, /sameOrigin\(request\)/);
});

test("module availability is enforced by sensitive domain APIs as well as navigation", () => {
  assert.match(productApi, /isModuleAvailableForUser\(c\.user,'pos'\)/);
  assert.match(settingsApi, /isModuleAvailableForUser\(user,'cms'\)/);
  assert.match(reportApi, /groupModulesEnabled/);
  assert.match(reportExportApi, /groupModulesEnabled/);
  assert.match(agricultureApi, /isModuleAvailableForUser\(user, "agriculture"\)/);
  assert.match(attendanceApi, /isModuleAvailableForUser\(user, "hrm"\)/);
  assert.match(exportApi, /canReadRecord\(user,record\)/);
  assert.match(exportApi, /isModuleAvailableForUser\(user,\x27crm\x27\)/);
  assert.match(exportApi, /isModuleAvailableForUser\(user,\x27projects\x27\)/);
  assert.match(exportApi, /isModuleAvailableForUser\(user,\x27cms\x27\)/);
});

test("platform access schema has a separate workspace setting, user override and append-only audit", () => {
  for (const table of ["platform_modules", "workspace_module_settings", "platform_module_access_grants", "platform_module_access_audit"]) {
    assert.match(migration, new RegExp("CREATE TABLE IF NOT EXISTS " + table));
  }
  assert.match(migration, /effect IN \('allow','deny'\)/);
  assert.match(migration, /revoked_at IS NULL/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON platform_module_access_audit/);
  assert.match(migration, /INSERT INTO platform_modules/);
});

test("admin UI explains app-launch-only grants and exposes activation, override and audit workflows", () => {
  assert.match(component, /Grant aplikasi bukan grant data/);
  assert.match(component, /set_module_enabled/);
  assert.match(component, /set_user_module_access/);
  assert.match(component, /Ikuti role organisasi/);
  assert.match(component, /Riwayat perubahan akses/);
});
