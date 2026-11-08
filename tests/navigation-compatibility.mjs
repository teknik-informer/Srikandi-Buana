import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const get = (file) => fs.readFileSync(path.join(root, file), "utf8");
const original = get("tests/fixtures/navigation-v11.1.txt");
const current = get("src/lib/navigation-config.ts");
const registry = get("src/features/enterprise/registry.ts");
const routePage = get("src/app/dashboard/[[...section]]/page.tsx");

function legacyRoutes(contents) {
  return [...contents.matchAll(/admin\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],/g)].map((match) => match[1]);
}

function activeRouteIds() {
  const ids = new Set(legacyRoutes(current));
  for (const match of registry.matchAll(/features\(\[([\s\S]*?)\]\)/g)) {
    for (const id of match[1].matchAll(/"([^"]+)"/g)) ids.add(id[1]);
  }
  for (const id of registry.matchAll(/id: "(monitoring|laporan)"/g)) ids.add(id[1]);
  ids.add("panduan");
  return [...ids];
}

test("Seluruh ID rute lama tetap dapat dijangkau setelah pengelompokan v14", () => {
  const available = new Set(activeRouteIds());
  for (const id of legacyRoutes(original)) assert.ok(available.has(id), "rute lama hilang: " + id);
  assert.ok(routePage.includes('redirect("/dashboard/panduan#template")'));
  assert.equal(new Set(legacyRoutes(current)).size, legacyRoutes(current).length);
});

test("Workspace v14 menggunakan tujuh domain kerja yang berbeda", () => {
  const expected = ["ecosystem", "management", "administration", "finance", "commerce", "publication", "system"];
  const actual = [...registry.matchAll(/id: "(ecosystem|management|administration|finance|commerce|publication|system)"/g)]
    .map((match) => match[1])
    .filter((id, index, values) => values.indexOf(id) === index);
  assert.deepEqual(actual, expected);
});

test("Rute sidebar dibentuk dari ID yang sama", () => {
  assert.ok(current.includes("href:'/dashboard/'+id"));
});

test("Menu publik tidak berubah ketika standardisasi istilah dashboard", () => {
  assert.equal(
    current.slice(current.indexOf("export const publicMenus")),
    original.slice(original.indexOf("export const publicMenus")),
  );
});
