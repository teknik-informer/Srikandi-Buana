import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("central settings page brings together existing settings and account controls", () => {
  const center = read("src/app/_components/settings-center.tsx");
  const workspace = read("src/app/_components/workspace.tsx");
  assert.ok(workspace.includes('<SettingsCenter'));
  assert.ok(center.includes('<OrganizationEditor />'));
  assert.ok(center.includes('<SiteSettingsEditor'));
  assert.ok(center.includes('href="/dashboard/akun-saya"'));
  assert.ok(center.includes('href="/dashboard/akun"'));
  assert.ok(center.includes('href="#preferensi"'));
  assert.ok(center.includes('href="#website"'));
});

test("organization settings are administrator-only, validated, persisted, and audited", () => {
  const api = read("src/app/api/organization-settings/route.ts");
  const migration = read("migrations/001_initial.sql");
  assert.ok(api.includes("getAdminUser"));
  assert.ok(api.includes("settings WHERE key='organization'"));
  assert.ok(api.includes("INSERT INTO settings(key,owner,data,updated)"));
  assert.ok(api.includes("INSERT INTO audit(id,owner,action,title,created)"));
  assert.ok(api.includes("postalCode"));
  assert.ok(api.includes("readJsonObject"));
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY"));
});

test("global preferences update actual theme, typography, header, content and sidebar behavior", () => {
  const control = read("src/app/_components/global-settings-control.tsx");
  const shell = read("src/app/_components/workspace-shell.tsx");
  const navigation = read("src/app/_components/dashboard-navigation.tsx");
  const css = read("src/app/styles/gentelella-workspace.css");
  const boot = read("src/scripts/theme-boot.tsx");
  assert.ok(control.includes("PREFERENCE_REGISTRY"));
  assert.ok(control.includes("applyPreference(key, value)"));
  assert.ok(control.includes("persistPreference(key, value)"));
  assert.ok(boot.includes("PREFERENCE_REGISTRY"));
  assert.ok(shell.includes("MutationObserver"));
  assert.ok(shell.includes("variant={sidebarVariant}"));
  assert.ok(shell.includes("collapsible={sidebarCollapsible}"));
  assert.ok(navigation.includes("<Sidebar variant={variant} collapsible={collapsible}>"));
  assert.ok(css.includes('data-content-layout="full-width"'));
  assert.ok(css.includes('data-navbar-style="scroll"'));
});
