import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("the seven workspaces have distinct domain groups", () => {
  const registry = read("src/features/enterprise/registry.ts");
  const groups = ["ecosystem", "management", "administration", "finance", "commerce", "publication", "system"];
  for (const id of groups) assert.ok(registry.includes('id: "' + id + '"'), id);
  assert.ok(!registry.includes('id: "pengembangan"'));
  assert.ok(registry.includes('id: "monitoring"'));
  assert.ok(registry.includes('id: "laporan"'));
});

test("navigation keeps Help Centre in a fixed shortcut and not in the business workspace groups", () => {
  const nav = read("src/app/_components/dashboard-navigation.tsx");
  const registry = read("src/features/enterprise/registry.ts");
  assert.ok(nav.includes('href="/dashboard/panduan"'));
  assert.ok(nav.includes("Pusat Bantuan"));
  assert.ok(!registry.includes('id: "panduan"'));
});

test("the internal Help Centre does not replace the public help page", () => {
  const publicHelp = read("src/app/(public)/bantuan/page.tsx");
  const internalPage = read("src/app/dashboard/[[...section]]/page.tsx");
  assert.ok(publicHelp.includes('InformationPage slug'));
  assert.ok(internalPage.includes('<HelpCenter role={admin.role} />'));
});
