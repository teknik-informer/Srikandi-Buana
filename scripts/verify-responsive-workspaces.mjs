import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const css = read("src/app/globals.css");
const button = read("src/components/ui/button.tsx");
const input = read("src/components/ui/input.tsx");
const badge = read("src/components/ui/badge.tsx");
const recordTable = read("src/app/_components/record-table.tsx");
const workspaceUi = read("src/app/_components/workspace-ui.tsx");

assert.match(css, /Workspace responsive contract: shared safeguards for every operational module/);
assert.match(css, /body:has\(\.workspace-shell\)[\s\S]*?:focus-visible\s*\{[^}]*var\(--primary\)[^}]*border-color:\s*var\(--primary\)[^}]*box-shadow:\s*none\s*!important/s, "Workspace and portaled dialog focus must use the brand primary without a decorative glow");
assert.match(css, /\.workspace-page \[data-slot="badge"\][\s\S]*?white-space:\s*normal[\s\S]*?overflow-wrap:\s*anywhere/, "Status badges must wrap within their available width");
assert.match(css, /\.workspace-page \[class\*="overflow-x-auto"\][\s\S]*?overscroll-behavior-x:\s*contain/, "Wide data regions must scroll locally rather than widen the viewport");
assert.match(css, /\.workspace-page \[data-slot="table-cell"\]\s*\{[^}]*white-space:\s*normal/s, "Table cells must be able to wrap long values");
assert.match(css, /\.workspace-page \[data-slot="button"\]:not\(\[data-size\^="icon"\]\)\s*\{[^}]*flex-shrink:\s*1/s, "Text buttons must be allowed to shrink inside responsive action groups");
assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.workspace-shell \[data-slot="button"\]:not\(\[data-size\^="icon"\]\)\s*\{[^}]*height:\s*auto/s, "Mobile text buttons must grow vertically instead of clipping wrapped labels");
assert.match(css, /\.workspace-page \[data-slot="button"\]\[data-size\^="icon"\][\s\S]*?white-space:\s*nowrap/, "Icon-only controls must retain compact fixed geometry");
assert.match(button, /focus-visible:ring/);
assert.match(input, /min-w-0/);
assert.match(badge, /overflow-hidden/);
assert.match(recordTable, /records-table-region/);
assert.match(recordTable, /aria-describedby=\{hint\}/);
assert.match(workspaceUi, /active:\s*"border-primary\/20 bg-primary\/10 text-primary"/, "Active status indicators must use the shared brand tone rather than hard-coded blue");

function collect(directory) {
  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    const path = join(directory, entry);
    const info = statSync(path);
    if (info.isDirectory()) return collect(path);
    return /\.(tsx|ts)$/.test(entry) ? [path] : [];
  });
}
const sourceFiles = [
  ...collect(new URL("../src/app/_components", import.meta.url).pathname)
    .filter((path) => !path.includes("/public/")),
  ...collect(new URL("../src/components/ui", import.meta.url).pathname),
];
const blueFocusPattern = /(?:focus(?:-visible)?|focus-within):(ring|outline|border)-(blue|sky|indigo|cyan)-\d+/g;
const blueFocus = sourceFiles.flatMap((path) => {
  const source = readFileSync(path, "utf8");
  return [...source.matchAll(blueFocusPattern)].map((match) => path + ": " + match[0]);
});
assert.deepEqual(blueFocus, [], "Workspace source must not introduce hard-coded blue focus frames");

console.log("PASS responsive workspace contracts: mobile button sizing, wrapped indicators, local table scrolling, compact icon actions, brand-colored focus, and no hard-coded blue focus utilities.");
console.log("NOTE: source-contract regression only; real viewport and interaction checks remain part of Preview QA.");
