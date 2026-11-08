import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("the ToT template roadmap is linked as a real read-only dashboard utility", () => {
  const page = read("src/app/dashboard/[[...section]]/page.tsx");
  const nav = read("src/app/_components/dashboard-navigation.tsx");
  const registry = read("src/features/enterprise/registry.ts");
  const ui = read("src/app/_components/agency-roadmap.tsx");
  assert.ok(registry.includes('id: "pengembangan"'));
  assert.ok(page.includes('<AgencyRoadmap />'));
  assert.ok(nav.includes('item.id === "pengembangan" ? ClipboardList'));
  assert.ok(ui.includes("Status hubungan mitra saat ini"));
  assert.ok(ui.includes("Belum ada perjanjian program"));
  assert.ok(ui.includes("Kelompok belum memiliki salinan digital dokumen program mitra."));
  assert.ok(ui.includes("Segera hadir"));
  assert.ok(ui.includes("min-h-11"));
  assert.ok(ui.includes("focus-visible:outline-2"));
  assert.ok(ui.includes("Formulir digital, penyimpanan dan persetujuan belum diaktifkan."));
});

test("all current legacy roles can view the non-sensitive template roadmap", () => {
  const policy = read("src/features/identity/access-policy.ts");
  const registry = read("src/features/enterprise/registry.ts");
  assert.ok(policy.includes("'pengembangan'"));
  assert.ok(registry.includes('id: "pengembangan"'));
  assert.ok(registry.includes('href: "/dashboard/pengembangan"'));
});

test("coming-soon cards are informational, not active links or fake forms", () => {
  const ui = read("src/app/_components/agency-roadmap.tsx");
  assert.ok(ui.includes('plannedModules.map((module) => ('));
  assert.ok(ui.includes('<article key={module.id}'));
  assert.ok(!ui.includes('<Link href={module.href}'));
  assert.ok(!ui.includes('<button'));
});
