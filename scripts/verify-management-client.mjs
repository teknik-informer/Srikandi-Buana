import { build } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url), React = require("react");
const output = await build({ entryPoints: ["src/app/_components/management-dashboard.tsx"], bundle: true, write: false, format: "cjs", platform: "node", packages: "external", jsx: "automatic", alias: { cn: resolve("src/lib/cn.ts") } });
function harness(user) {
  const slots = [], requests = []; let cursor = 0, saved = 0;
  const mockReact = { ...React, useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; }, useEffect() {} };
  const module = { exports: {} };
  const props = { rows: [{ id: "task-1", kind: "tindaklanjut", created: "2026-10-01", updated: "2026-11-03T00:00:00Z", data: { name: "Synthetic task", programId: "1", status: "Berjalan", dueDate: "2026-12-01" } }], files: [], user, loading: false, error: "", onSaved: async () => { saved++; } };
  vm.runInNewContext(output.outputFiles[0].text, { module, exports: module.exports, console, process, URL, AbortController, setTimeout, clearTimeout,
    FormData: class { constructor(form) { return new Map(Object.entries(form.values)); } },
    document: { querySelector: () => null }, window: { confirm: () => true },
    require: name => name === "react" ? mockReact : name === "sonner" ? { toast: { success() {}, error() {} } } : require(name),
    fetch: (url, options) => new Promise(resolve => { requests.push({ url, options, resolve }); }) });
  return { requests, props, render() { cursor = 0; return module.exports.default(props); }, saved: () => saved };
}
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree && typeof tree === "object" ? [tree, ...[].concat(tree.props?.children || []).flatMap(nodes)] : []; }
function text(node) { if (typeof node === "string") return node; if (Array.isArray(node)) return node.map(text).join(""); return node?.props ? text(node.props.children) : ""; }
const find = (tree, predicate) => nodes(tree).find(predicate);
const user = role => ({ accountId: "fixture", userId: "fixture-owner", email: "fixture@example.test", fullName: "Synthetic user", displayName: "Synthetic user", role, memberId: "fixture-member", position: "", programIds: ["1"] });
const h = harness(user("koordinator"));
let tree = h.render();
find(tree, node => typeof node.props?.onClick === "function" && text(node) === "Tambah tugas").props.onClick();
tree = h.render();
const program = find(tree, node => node.props?.name === "programId");
assert.equal(text(program).includes("2 ·"), false, "Coordinator cannot select unassigned program");
const form = { dataset: { unsaved: "true" }, values: { name: "Synthetic new task", dueDate: "2026-12-04", priority: "Tinggi", programId: "1", status: "Belum dimulai" } };
const submit = find(tree, node => node.type === "form").props.onSubmit;
const pending = submit({ preventDefault() {}, currentTarget: form });
await Promise.resolve();
assert.equal(h.requests.length, 1);
assert.equal(JSON.parse(h.requests[0].options.body).data.dueDate, "2026-12-04");
tree = h.render();
assert.equal(find(tree, node => node.type === "fieldset").props.disabled, true, "Pending save locks the form fields");
await submit({ preventDefault() {}, currentTarget: form });
assert.equal(h.requests.length, 1, "Duplicate submission is blocked");
h.requests[0].resolve({ ok: false, status: 409, json: async () => ({ error: "Catatan berubah" }) });
await pending;
tree = h.render();
assert(find(tree, node => node.type === "form"), "Failure keeps editor mounted");
assert.equal(form.dataset.unsaved, "true");
assert.equal(h.saved(), 0);
const retry = find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {}, currentTarget: form });
h.requests[1].resolve({ ok: true, status: 200, json: async () => ({ ok: true, id: "created-fixture" }) });
await retry;
assert.equal(h.saved(), 1);
assert.equal(form.dataset.unsaved, undefined);
assert(!find(h.render(), node => node.type === "form"), "Successful save closes editor");
const statusControl = find(h.render(), node => node.props?.["aria-label"] === "Status tugas Synthetic task");
statusControl.props.onChange({ target: { value: "Selesai" } });
const statusBody = JSON.parse(h.requests[2].options.body);
assert.equal(statusBody.expectedUpdated, "2026-11-03T00:00:00Z");
assert.equal(statusBody.data.programId, "1");
assert.equal(statusBody.data.status, "Selesai");
assert.equal(h.props.rows[0].data.status, "Berjalan", "No false optimistic completion");
h.requests[2].resolve({ ok: false, status: 409, json: async () => ({ error: "Catatan berubah" }) });
await new Promise(resolve => setImmediate(resolve));
assert(text(h.render()).includes("Perubahan belum selesai"));
for (const role of ["anggota", "ketua", "bendahara"]) {
  const readOnly = harness(user(role));
  assert(!find(readOnly.render(), node => typeof node.props?.onClick === "function" && text(node) === "Tambah tugas"), role + " has no create control");
}
const unassigned = harness({ ...user("koordinator"), programIds: [] });
assert(!find(unassigned.render(), node => typeof node.props?.onClick === "function" && text(node) === "Tambah tugas"));
console.log("PASS management client flows: coordinator scope, actual due-date submission, pending field lock, duplicate prevention, failure preserves editor/dirty state, success reloads/closes, status conflicts retain original data, read-only and unassigned roles.");
