import { build } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const output = await build({
  stdin: {
    contents:
      "export * from './src/lib/management-insights'; export {default as Dashboard} from './src/app/_components/management-dashboard';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  jsx: "automatic",
  alias: { cn: resolve("src/lib/cn.ts") },
});
const module = { exports: {} };
vm.runInNewContext(output.outputFiles[0].text, {
  module,
  exports: module.exports,
  require,
  console,
  process,
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
});
const {
  buildManagementInsights,
  filterAgenda,
  jakartaDate,
  validDate,
  Dashboard,
} = module.exports;
const principal = (role) => ({
  accountId: "test-account",
  userId: "test-owner",
  email: "fixture@example.test",
  fullName: "Synthetic user",
  displayName: "Synthetic user",
  role,
  memberId: "member-1",
  position: "",
  programIds: ["1"],
});
const row = (id, kind, data) => ({
  id,
  kind,
  data,
  created: "2026-10-01",
  updated: "2026-10-01",
});
const rows = [
  row("task-old", "tindaklanjut", {
    name: "Relative period only",
    period: "30–90 hari",
    programId: "1",
    status: "Belum dimulai",
  }),
  row("task-late", "tindaklanjut", {
    name: "Late real task",
    dueDate: "2026-11-02",
    priority: "Tinggi",
    status: "Berjalan",
    programId: "1",
    pic: "Synthetic PIC",
  }),
  row("task-today", "tindaklanjut", {
    name: "Today task",
    dueDate: "2026-11-03",
    status: "Belum dimulai",
    programId: "1",
  }),
  row("task-paused", "tindaklanjut", {
    name: "Paused task",
    dueDate: "2026-11-01",
    status: "Ditunda",
    programId: "1",
  }),
  row("task-done", "tindaklanjut", {
    name: "Done task",
    dueDate: "2026-11-01",
    status: "Selesai",
    programId: "1",
  }),
  row("task-other", "tindaklanjut", {
    name: "HIDDEN OTHER PROGRAM",
    dueDate: "2026-11-01",
    status: "Berjalan",
    programId: "2",
  }),
  row("member-1", "anggota", {
    name: "Shared fixture name",
    dusun: "Fixture",
    phone: "0800",
    status: "Aktif",
    verification: "Perlu verifikasi",
    consent: "PRIVATE-CONSENT",
  }),
  row("member-2", "anggota", {
    name: " Shared   fixture name ",
    dusun: "Fixture",
    status: "Aktif",
    verification: "Terverifikasi",
    consent: "Terdokumentasi",
  }),
  row("event", "kegiatan", {
    name: "Future activity",
    date: "2026-11-05",
    status: "Direncanakan",
    location: "Fixture",
    programId: "1",
  }),
  row("event-old", "kegiatan", {
    name: "Past unfinished activity",
    date: "2026-11-01",
    status: "Direncanakan",
    location: "Fixture",
    programId: "1",
  }),
  row("event-delayed", "kegiatan", {
    name: "Postponed",
    date: "2026-11-05",
    status: "Ditunda",
    programId: "1",
  }),
  row("event-invalid", "kegiatan", {
    name: "Invalid legacy date",
    date: "2026-02-30",
    status: "Direncanakan",
    programId: "1",
  }),
  row("cash-in", "kas", {
    name: "PRIVATE-FINANCE",
    amount: 100,
    type: "Pemasukan",
    attachmentId: "missing-file",
  }),
  row("cash-out", "kas", {
    name: "PRIVATE-EXPENSE",
    amount: 25,
    type: "Pengeluaran",
    attachmentId: "deleted-file",
  }),
  row("cash-invalid", "kas", {
    name: "Malformed amount",
    amount: "NaN",
    type: "Pemasukan",
  }),
];
const files = [
  { id: "deleted-file", name: "Fixture", deleted_at: "2026-11-01" },
];
const now = new Date("2026-11-02T18:00:00Z");
assert.equal(jakartaDate(now), "2026-11-03", "Local midnight uses Jakarta");
assert.equal(validDate("2026-02-30"), false);
assert.equal(validDate("2028-02-29"), true);
const admin = buildManagementInsights(rows, files, principal("ketua"), now);
assert.equal(
  admin.balance,
  null,
  "Do not publish a partial balance when a transaction is invalid",
);
assert.equal(admin.cashInvalid, 1);
assert.equal(
  buildManagementInsights(
    rows.filter((row) => row.id !== "cash-invalid"),
    files,
    principal("admin"),
    now,
  ).balance,
  75,
);
assert.equal(
  admin.overdue.length,
  2,
  "Paused, complete and undated tasks are not overdue",
);
assert.equal(admin.dueToday.length, 1);
assert(
  admin.issues.some((issue) => issue.id === "task-old-date"),
  "Relative periods need explicit date",
);
assert(admin.issues.some((issue) => issue.id.endsWith("duplicate-name")));
assert(
  admin.issues.some((issue) => issue.id === "cash-out-attachmentId"),
  "Deleted files are not available",
);
assert(
  !admin.agenda.some((item) =>
    ["event-delayed", "event-invalid", "task-done"].includes(item.row.id),
  ),
);
assert.equal(filterAgenda(admin.agenda, admin.today, 1).length, 1);
const coordinator = buildManagementInsights(
  rows,
  files,
  principal("koordinator"),
  now,
);
assert(!JSON.stringify(coordinator).includes("HIDDEN OTHER PROGRAM"));
assert(!JSON.stringify(coordinator).includes("PRIVATE-FINANCE"));
assert.equal(coordinator.balance, null);
const member = buildManagementInsights(rows, files, principal("anggota"), now);
assert.equal(member.members, 1);
assert.equal(member.tasks.length, 0);
assert.equal(member.issues.length, 0);
assert(!JSON.stringify(member).includes("PRIVATE-"));
assert.equal(
  buildManagementInsights([], [], principal("admin"), now).attentionRecords,
  0,
  "Empty data is not invented",
);
for (const role of [
  "admin",
  "ketua",
  "sekretaris",
  "bendahara",
  "koordinator",
  "anggota",
]) {
  const html = renderToStaticMarkup(
    React.createElement(Dashboard, {
      rows,
      files,
      user: principal(role),
      loading: false,
      error: "",
      onSaved: async () => {},
    }),
  );
  assert(html.includes("RINGKASAN OPERASIONAL"));
  assert(html.includes('aria-label="Bagian ringkasan operasional"'));
  assert(html.includes('aria-label="Cari catatan dalam ringkasan operasional"'));
  if (role === "anggota") {
    assert(!html.includes("Papan tugas"));
    assert(!html.includes("Kualitas data"));
    assert(!html.includes("Saldo kas"));
  }
  if (["ketua", "anggota", "bendahara"].includes(role))
    assert(!html.includes("Tambah tugas"), role + " cannot create tasks");
}
const emptyLoading = renderToStaticMarkup(
  React.createElement(Dashboard, {
    rows,
    files,
    user: principal("admin"),
    loading: true,
    error: "",
    onSaved: async () => {},
  }),
);
assert(!emptyLoading.includes("Late real task"));
const failedLoading = renderToStaticMarkup(
  React.createElement(Dashboard, {
    rows,
    files,
    user: principal("admin"),
    loading: false,
    error: "Offline",
    onSaved: async () => {},
  }),
);
assert(!failedLoading.includes("PRIVATE-FINANCE"));
console.log(
  "PASS management insights: Jakarta dates, actual deadlines, paused/completed tasks, duplicate reminders, missing/deleted attachments, scoped finance and records, six-role dashboard rendering, loading/error privacy.",
);

const requestBuild = await build({
  entryPoints: ["src/lib/request-json.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
});
const requestModule = { exports: {} };
let calls = 0;
const requestContext = {
  module: requestModule,
  exports: requestModule.exports,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) =>
      options.signal.addEventListener("abort", () => reject(Error("aborted")), {
        once: true,
      }),
    );
  },
};
vm.runInNewContext(requestBuild.outputFiles[0].text, requestContext);
await assert.rejects(
  requestModule.exports.requestJSON("/api/test", {}, 5),
  /terlalu lama/,
);
await assert.rejects(
  requestModule.exports.requestJSON("/api/test", { method: "POST" }, 5),
  /belum dapat dipastikan/,
);
assert.equal(calls, 2, "No automatic retries for uncertain writes");
const controller = new AbortController();
const canceled = requestModule.exports.requestJSON(
  "/api/test",
  { signal: controller.signal },
  1000,
);
controller.abort();
await assert.rejects(canceled, /aborted/);
requestContext.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ ok: true }),
});
assert.equal(
  (await requestModule.exports.requestJSON("/api/test")).data.ok,
  true,
);
requestContext.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => {
    throw SyntaxError("invalid");
  },
});
assert.equal((await requestModule.exports.requestJSON("/api/test")).data, null);
requestContext.fetch = async (_url, options) => ({
  ok: true,
  status: 200,
  json: () =>
    new Promise((_resolve, reject) =>
      options.signal.addEventListener(
        "abort",
        () => reject(Error("body aborted")),
        { once: true },
      ),
    ),
});
await assert.rejects(
  requestModule.exports.requestJSON("/api/test", {}, 5),
  /terlalu lama/,
  "Deadline also covers response body",
);
console.log(
  "PASS request deadlines: stalled headers/body, write uncertainty, cancellation, invalid JSON, successful retry and no automatic duplicate writes.",
);
