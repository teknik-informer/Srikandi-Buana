import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const button = readFileSync(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8");
const input = readFileSync(new URL("../src/components/ui/input.tsx", import.meta.url), "utf8");
const badge = readFileSync(new URL("../src/components/ui/badge.tsx", import.meta.url), "utf8");\nconst workspaceUi = readFileSync(new URL("../src/app/_components/workspace-ui.tsx", import.meta.url), "utf8");
const recordTable = readFileSync(new URL("../src/app/_components/record-table.tsx", import.meta.url), "utf8");

assert.match(css, /Workspace responsive contract: shared safeguards for every operational module/);
assert.match(css, /\.workspace-shell :is\(button,a,input,select,textarea,\[role="button"\],\[role="combobox"\]\):focus-visible\s*\{[^}]*var\(--primary\)[^}]*box-shadow:\s*none\s*!important/s, "Workspace keyboard focus must use the brand primary and no decorative glow");
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

console.log("PASS responsive workspace contracts: mobile button sizing, wrapped indicators, local table scrolling, constrained content, compact icon actions, and brand-colored keyboard focus.");
console.log("NOTE: this is a source-contract regression test; device viewport and interaction verification still require browser testing.");
