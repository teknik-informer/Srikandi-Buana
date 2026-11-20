import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const bundle = await build({
  entryPoints: ["src/features/platform/application-registry.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
});
const commonjs = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, { module: commonjs, exports: commonjs.exports });
const { platformApplications, platformApplicationIds } = commonjs.exports;
const center = readFileSync("src/app/_components/platform-module-center.tsx", "utf8");
const hub = readFileSync("src/app/_components/application-hub.tsx", "utf8");
const navigation = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");

test("canonical application registry contains exactly six stable top-level applications", () => {
  assert.equal(platformApplications.length, 6);
  assert.deepEqual(Array.from(platformApplicationIds), [
    "platform-core", "organization", "agriculture", "business", "bi-analytics", "public-partnership",
  ]);
  assert.equal(new Set(platformApplications.map((app) => app.id)).size, 6);
  assert.equal(new Set(platformApplications.map((app) => app.route)).size, 6);
});

test("every canonical application has a grounded route, description, status and domain mapping", () => {
  for (const app of platformApplications) {
    assert.match(app.route, /^\/dashboard\//);
    assert.ok(app.description.length > 30);
    assert.ok(["foundation", "partial", "preview"].includes(app.status));
    assert.ok(Array.isArray(app.legacyWorkspaces));
    assert.ok(app.supportingDomains.length > 0);
  }
});

test("legacy enterprise workspaces remain mapped without replacing their stable IDs", () => {
  const mapping = Object.fromEntries(platformApplications.map((app) => [app.id, Array.from(app.legacyWorkspaces)]));
  const mapped = new Set(Object.values(mapping).flat());
  for (const id of ["hrm", "accounting", "crm", "projects", "pos", "analytics"]) {
    assert.ok(mapped.has(id), `legacy workspace ${id} must remain mapped`);
  }
  assert.deepEqual(mapping.organization, ["hrm"]);
  assert.deepEqual(mapping.agriculture, ["projects"]);
  assert.deepEqual(mapping.business, ["accounting", "pos"]);
  assert.deepEqual(mapping["public-partnership"], ["crm"]);
  assert.deepEqual(mapping["bi-analytics"], ["analytics"]);
  assert.deepEqual(mapping["platform-core"], []);
});

test("administrator module center renders the canonical registry separately from legacy module readiness", () => {
  assert.match(center, /platformApplications/);
  assert.match(center, /canonical-applications-title/);
  assert.match(center, /Registri enam aplikasi utama/);
});

test("application hub renders the canonical suite and keeps access derived from existing workspace permissions", () => {
  assert.match(hub, /platformApplications/);
  assert.match(hub, /canOpenPlatformCore: boolean/);
  assert.match(hub, /application\.id === "platform-core"[\s\S]*?canOpenPlatformCore/);
  assert.match(hub, /application\.id === "agriculture"[\s\S]*?feature\.id === "pertanian"/);
  assert.match(hub, /application\.id === "public-partnership"[\s\S]*?publikasi/);
  assert.match(hub, /public-partnership/);
  assert.match(hub, /application\.route/);
  assert.match(hub, /Enam aplikasi Srikandi Buana/);
  assert.match(hub, /Belum ditugaskan/);
  assert.match(hub, /kebijakan server/);
  assert.match(navigation, /APLIKASI UTAMA/);
  assert.match(readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8"), /canOpenPlatformCore=\{admin\.role === "admin"/);
  assert.match(navigation, /MODUL DALAM APLIKASI/);
  assert.match(navigation, /getApplicationLaunches/);
  assert.doesNotMatch(navigation, /href: businessWorkspace\.href/);
  assert.match(navigation, /href: business\.route/);
  for (const routeOwner of ["core", "organization", "agriculture", "business", "analytics", "publicPartnership"]) {
    assert.match(navigation, new RegExp(`href: ${routeOwner}\\.route`), `${routeOwner} application launch must use its canonical registry route`);
  }
  assert.match(navigation, /features\.some\(\(feature\) => feature\.id === "pertanian"\)/);
  assert.match(navigation, /MODUL DALAM APLIKASI/);
  assert.match(navigation, /enam aplikasi utama/);
});

test("Gentelella is a visual layer and does not replace the canonical six-application architecture", () => {
  const registrySource = readFileSync("src/features/platform/application-registry.ts", "utf8");
  const shell = readFileSync("src/app/_components/workspace-shell.tsx", "utf8");
  const globalStyles = readFileSync("src/app/globals.css", "utf8");
  const settings = readFileSync("src/app/_components/workspace.tsx", "utf8");
  assert.doesNotMatch(registrySource, /dashboardId|featureId/);
  assert.match(registrySource, /legacyWorkspaces/);
  assert.match(hub, /presentation\.legacy/);
  assert.match(navigation, /APLIKASI UTAMA/);
  assert.match(navigation, /MODUL DALAM APLIKASI/);
  assert.match(navigation, /getVisibleEnterpriseDashboardsForUser/);
  assert.match(shell, /data-workspace-theme="gentelella"/);
  assert.doesNotMatch(shell, /ThemeControl/);
  assert.match(settings, /<GlobalSettingsControl\s*\/>/);
  assert.match(settings, /Preferensi tampilan global/);
  assert.match(shell, /variant=\{sidebarVariant\}/);
  assert.match(globalStyles, /gentelella-workspace\.css/);
});

test("application hub always launches the canonical application landing route", () => {
  const hub = readFileSync("src/app/_components/application-hub.tsx", "utf8");
  assert.match(hub, /const href = application\.route/);
  assert.doesNotMatch(hub, /dashboard\?\.href \?\? application\.route/);
});

test("canonical landing routes resolve through the existing dashboard router without replacing legacy workspace IDs", () => {
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  const enterpriseRegistry = readFileSync("src/features/enterprise/registry.ts", "utf8");
  const canonicalRoutes = new Map(platformApplications.map((app) => [app.id, app.route]));

  assert.equal(canonicalRoutes.get("platform-core"), "/dashboard/module-center");
  assert.equal(canonicalRoutes.get("organization"), "/dashboard/hrm");
  assert.equal(canonicalRoutes.get("agriculture"), "/dashboard/pertanian");
  assert.equal(canonicalRoutes.get("business"), "/dashboard/business");
  assert.equal(canonicalRoutes.get("bi-analytics"), "/dashboard/analytics");
  assert.equal(canonicalRoutes.get("public-partnership"), "/dashboard/crm");

  // Existing dashboard route remains the resolver; this guard intentionally does
  // not prescribe a new route tree or change any authorization behavior.
  assert.match(route, /getEnterpriseDashboardById\(active\)/);
  assert.match(route, /"ringkasan", "business", "qa-test-center"/);
  assert.match(route, /active === "business"/);
  assert.match(route, /operationalWorkspace\?\.href/);
  assert.match(route, /\["accounting", "pos"\]\.includes\(dashboard\.id\)/);
  assert.match(route, /active === "pertanian"/);
  assert.match(route, /active === "module-center"/);
  assert.match(route, /dashboardRouteIds/);
  assert.match(enterpriseRegistry, /id: "hrm"/);
  assert.match(enterpriseRegistry, /id: "accounting"/);
  assert.match(enterpriseRegistry, /id: "crm"/);
  assert.match(enterpriseRegistry, /id: "projects"/);
  assert.match(enterpriseRegistry, /id: "pos"/);
  assert.match(enterpriseRegistry, /id: "analytics"/);
});

test("legacy route aliases remain explicit compatibility redirects", () => {
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  for (const [legacy, target] of [
    ["kehadiran", "/dashboard/presensi"],
    ["management", "/dashboard/ecosystem"],
    ["administration", "/dashboard/system"],
    ["commerce", "/dashboard/finance"],
  ]) {
    assert.match(route, new RegExp(`${legacy}:\\s*"${target.replaceAll("/", "\\/")}"`));
  }
  assert.match(route, /legacyDashboardRedirects\[section\[0\]\]/);
});


test("application hub visibility requires access to the application's own domain features", () => {
  const hub = readFileSync("src/app/_components/application-hub.tsx", "utf8");
  assert.match(hub, /application\.id === "agriculture"[\s\S]*?feature\.id === "pertanian"/);
  assert.match(hub, /application\.id === "bi-analytics"[\s\S]*?feature\.id === "analytics"/);
  assert.match(hub, /application\.id === "public-partnership"[\s\S]*?publikasi/);
  assert.match(hub, /application\.id === "business"[\s\S]*?matched\.some/);
});
