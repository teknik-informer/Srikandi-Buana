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

const registry = await loadModule("src/features/platform/module-registry.ts");
const policy = await loadModule("src/features/identity/access-policy.ts");
const enterprise = await loadModule("src/features/enterprise/registry.ts");
const routes = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
const nav = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");
const center = readFileSync("src/app/_components/platform-module-center.tsx", "utf8");
const accessManager = readFileSync("src/app/_components/platform-module-access-manager.tsx", "utf8");

test("Platform Core registers all six application modules and explicit delivery readiness", () => {
  assert.deepEqual(
    Array.from(registry.coreApplicationModules, (module) => module.id),
    ["hrm", "accounting", "crm", "projects", "pos", "analytics"],
  );
  assert.ok(registry.coreApplicationModules.every((module) => module.owner && module.sourceFootprint && module.implemented && module.limitation));
  assert.equal(registry.coreApplicationModules.find((module) => module.id === "analytics")?.readiness, "preview");
  assert.equal(registry.coreApplicationModules.find((module) => module.id === "pos")?.readiness, "partial");
});

test("support domains disclose their implementation limits rather than presenting empty apps as complete", () => {
  for (const id of ["agriculture", "inventory", "documents", "collaboration", "mel", "cms", "system-admin"]) {
    assert.ok(registry.supportingPlatformModules.some((module) => module.id === id));
  }
  assert.equal(registry.supportingPlatformModules.find((module) => module.id === "inventory")?.readiness, "foundation");
  assert.equal(registry.supportingPlatformModules.find((module) => module.id === "collaboration")?.route, null);
});

test("module visibility grants all six applications to System Administrator while retaining scoped role access", () => {
  const matrix = registry.buildModuleAccessMatrix();
  const access = (moduleId, role) => matrix.find((row) => row.moduleId === moduleId)?.access.find((item) => item.role === role);
  assert.equal(access("analytics", "ketua")?.allowed, true);
  assert.equal(access("analytics", "koordinator")?.allowed, true);
  assert.equal(access("analytics", "anggota")?.allowed, false);
  assert.equal(access("analytics", "admin")?.allowed, true);
  assert.equal(access("analytics", "admin")?.catalogOnly, false);
  assert.equal(access("accounting", "admin")?.allowed, true);
  assert.equal(access("accounting", "admin")?.catalogOnly, false);
  assert.equal(access("accounting", "bendahara")?.allowed, true);
  assert.equal(access("projects", "koordinator")?.allowed, true);
  assert.equal(access("projects", "anggota")?.allowed, true, "Members can read the member-facing activity feature within Project Management");
});

test("System Administrator alone can view the Platform Module Center", () => {
  assert.equal(registry.canReadPlatformModuleCenter("admin"), true);
  assert.equal(registry.canReadPlatformModuleCenter("ketua"), false);
  assert.equal(registry.canReadPlatformModuleCenter("anggota"), false);
  assert.equal(policy.canReadSectionForRole("admin", "module-center"), true);
  assert.equal(policy.canReadSectionForRole("ketua", "module-center"), false);
  assert.ok(enterprise.getVisibleEnterpriseUtilities("admin").some((item) => item.id === "module-center"));
  assert.ok(!enterprise.getVisibleEnterpriseUtilities("anggota").some((item) => item.id === "module-center"));
});

test("Platform Module Center exposes persistent access controls through the guarded administrator API", () => {
  assert.match(routes, /PlatformModuleCenter/);
  assert.match(routes, /active === "module-center"/);
  assert.match(nav, /"platform-core": LockKeyhole/);
  assert.match(center, /PlatformModuleAccessManager/);
  assert.match(center, /Verifikasi fitur dan UAT sebelum mengubah status/);
  assert.match(center, /Gunakan matriks ini saat meninjau penugasan akses/);
  assert.doesNotMatch(center, /Status mengikuti cakupan implementasi saat ini/);
  assert.match(accessManager, /Periksa detail kendala/);
  assert.match(accessManager, /set_module_enabled/);
  assert.match(accessManager, /set_user_module_access/);
  assert.match(accessManager, /Ikuti role organisasi/);
  assert.match(accessManager, /Riwayat perubahan akses/);
});
