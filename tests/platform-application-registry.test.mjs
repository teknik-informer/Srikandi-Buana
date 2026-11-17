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
  const mapped = new Set(platformApplications.flatMap((app) => app.legacyWorkspaces));
  for (const id of ["hrm", "accounting", "crm", "projects", "pos", "analytics"]) {
    assert.ok(mapped.has(id), `legacy workspace ${id} must remain mapped`);
  }
});

test("administrator module center renders the canonical registry separately from legacy module readiness", () => {
  assert.match(center, /platformApplications/);
  assert.match(center, /canonical-applications-title/);
  assert.match(center, /Registri enam aplikasi utama/);
});

test("application hub renders the canonical suite and keeps access derived from existing workspace permissions", () => {
  assert.match(hub, /platformApplications/);
  assert.match(hub, /application\.id === "platform-core" \|\| application\.id === "agriculture"/);
  assert.match(hub, /public-partnership/);
  assert.match(nav, /href: publicPartnership\.route/);
  assert.match(hub, /Enam aplikasi Srikandi Buana/);
  assert.match(hub, /Belum ditugaskan/);
  assert.match(hub, /kebijakan server/);
  assert.match(navigation, /APLIKASI UTAMA/);
  assert.match(navigation, /MODUL DALAM APLIKASI/);
  assert.match(navigation, /getApplicationLaunches/);
  assert.match(navigation, /features\.some\(\(feature\) => feature\.id === "pertanian"\)/);
  assert.match(navigation, /MODUL DALAM APLIKASI/);
  assert.match(navigation, /enam aplikasi utama/);
});
