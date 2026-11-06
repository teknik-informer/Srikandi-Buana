import { build } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import postcss from "postcss";
const require = createRequire(import.meta.url),
  React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const result = await build({
  stdin: {
    contents:
      "export * from './src/app/_components/workspace-ui'; export {default as RecordTable, recordFieldText} from './src/app/_components/record-table'; export {WorkspaceDialogContent} from './src/app/_components/workspace-dialog';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  packages: "external",
  jsx: "automatic",
  alias: { cn: resolve("src/lib/cn.ts") },
});
const module = { exports: {} };
vm.runInNewContext(result.outputFiles[0].text, {
  module,
  exports: module.exports,
  require: (name) =>
    name === "react"
      ? { ...React, useId: () => "fixture-table" }
      : require(name),
  process,
  console,
});
const {
  WorkspaceSearch,
  WorkspacePageHeader,
  WorkspaceEmptyState,
  StatusBadge,
  RecordTable,
  recordFieldText,
  WorkspaceDialogContent,
} = module.exports;
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === "object"
    ? [tree, ...nodes(tree.props?.children)]
    : [];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const html = (node) => renderToStaticMarkup(node);
const heading = html(
  React.createElement(WorkspacePageHeader, {
    title: "Administrasi kelompok",
    eyebrow: "KELOMPOK",
    description: "Catatan nyata",
    actions: React.createElement("button", null, "Tambah"),
  }),
);
assert.equal((heading.match(/<h1/g) || []).length, 1);
assert(heading.includes('id="workspace-title"'));
assert(heading.includes("workspace-page-actions"));
const changed = [];
const search = WorkspaceSearch({
  value: "anggota",
  onChange: (value) => changed.push(value),
  label: "Cari anggota",
});
const input = find(
  search,
  (node) => node.props?.["aria-label"] === "Cari anggota",
);
input.props.onChange({ target: { value: "pengurus" } });
let prevented = false;
input.props.onKeyDown({
  key: "Escape",
  preventDefault() {
    prevented = true;
  },
});
find(
  search,
  (node) => node.props?.["aria-label"] === "Hapus pencarian: Cari anggota",
).props.onClick();
assert.deepEqual(changed, ["pengurus", "", ""]);
assert(prevented);
const lockedSearch = WorkspaceSearch({value:'query',onChange(){},label:'Cari pesan',disabled:true,maxLength:200,ignoreUnsaved:true});
const lockedInput = find(lockedSearch,n=>n.props?.['aria-label']==='Cari pesan');
assert.equal(lockedInput.props.disabled,true);
assert.equal(lockedInput.props.maxLength,200);
assert.equal(lockedInput.props['data-unsaved-ignore'],true);
assert.equal(find(lockedSearch,n=>n.props?.['aria-label']==='Hapus pencarian: Cari pesan').props.disabled,true);
const lockedHtml=html(React.createElement(WorkspaceSearch,{value:'query',onChange(){},label:'Cari pesan',disabled:true,maxLength:200,ignoreUnsaved:true}));
assert(lockedHtml.includes('maxLength="200"')||lockedHtml.includes('maxlength="200"'));
assert(lockedHtml.includes('data-unsaved-ignore="true"'));

for (const [value, tone] of [
  ["Selesai", "success"],
  ["Berjalan", "active"],
  ["Lewat tenggat", "warning"],
  ["Ditolak", "danger"],
  ["Draf", "neutral"],
]) {
  const rendered = html(React.createElement(StatusBadge, { value }));
  assert(rendered.includes(value));
  assert(rendered.includes('data-status-tone="' + tone + '"'));
}
assert(
  html(
    React.createElement(WorkspaceEmptyState, {
      title: "Belum ada data",
      description: "Tambahkan catatan nyata.",
    }),
  ).includes('data-slot="empty"'),
);
const row = {
  id: "fixture",
  kind: "aset",
  data: {
    name: "Synthetic item",
    quantity: 0,
    date: "2026-02-30",
    status: "Perlu perbaikan",
  },
  created: "2026-11-03",
  updated: "2026-11-03",
};
assert.equal(
  recordFieldText(row, { key: "quantity", label: "Jumlah", type: "number" }),
  "0",
);
assert.equal(
  recordFieldText(row, { key: "date", label: "Tanggal", type: "date" }),
  "Tanggal perlu diperiksa",
);
assert.equal(
  recordFieldText(
    { ...row, data: { amount: "NaN" } },
    { key: "amount", label: "Nominal", type: "number" },
  ),
  "Nominal perlu diperiksa",
);
let viewed = null,
  acted = null;
const table = RecordTable({
  label: "Inventaris",
  rows: [row],
  fields: [
    { key: "name", label: "Nama" },
    { key: "quantity", label: "Jumlah" },
  ],
  onView: (value) => {
    viewed = value;
  },
  actions: (value) =>
    React.createElement(
      "button",
      {
        onClick: () => {
          acted = value;
        },
      },
      "Sunting",
    ),
});
assert.equal(table.props.className, "space-y-2");
const region = find(table, (node) => node.props?.role === "region");
assert.equal(region.props.tabIndex, 0);
assert.equal(region.props["aria-label"], "Tabel Inventaris");
find(
  table,
  (node) =>
    node.type === "button" && node.props.className?.includes("record-title"),
).props.onClick();
assert.equal(viewed, row);
find(
  table,
  (node) => node.type === "button" && node.props.children === "Sunting",
).props.onClick();
assert.equal(acted, row);
const tableHTML = html(table);
assert(tableHTML.includes("<caption"));
assert(tableHTML.includes("Geser tabel"));
assert(tableHTML.includes("Perlu perbaikan"));
const escape = () => {};
const dialog = WorkspaceDialogContent({
  children: "Synthetic dialog",
  className: "sm:max-w-xl",
  onEscapeKeyDown: escape,
});
assert(dialog.props.className.includes("workspace-dialog"));
assert.equal(
  dialog.props.onEscapeKeyDown,
  escape,
  "Keep existing dismissal/dirty-form handlers",
);
assert.equal(dialog.props.showCloseButton, false);
assert(find(dialog, (node) => node.props?.["aria-label"] === "Tutup dialog"));
assert(
  !find(
    WorkspaceDialogContent({ showCloseButton: false }),
    (node) => node.props?.["aria-label"] === "Tutup dialog",
  ),
  "No duplicate close control in composed dialogs",
);
const css = postcss.parse(readFileSync("src/app/globals.css", "utf8"));
let regionRule = false,
  touchRule = false,
  reducedMotion = false;
css.walkRules((rule) => {
  assert.notEqual(
    rule.selector,
    ".workspace [data-slot=card]",
    "Do not replace the reference card ring",
  );
  if (
    rule.selector.includes(".records-table-region") &&
    rule.nodes.some(
      (node) => node.prop === "overflow-x" && node.value === "auto",
    )
  )
    regionRule = true;
});
css.walkAtRules("media", (rule) => {
  if (
    rule.params.includes("pointer:coarse") &&
    rule.toString().includes("input-group-button") &&
    rule.toString().includes("44px")
  )
    touchRule = true;
  if (
    rule.params.includes("prefers-reduced-motion") &&
    rule.toString().includes("progress-indicator")
  )
    reducedMotion = true;
});
assert(regionRule && touchRule && reducedMotion);
console.log(
  "PASS visual composition contracts: semantic headers, search/clear/Escape, readable status labels, source Empty, zero/date/money display, reachable scroll region, record/action callbacks, themed localized dialogs with preserved dismissal hooks, touch and reduced-motion CSS. Not a browser layout test.",
);
