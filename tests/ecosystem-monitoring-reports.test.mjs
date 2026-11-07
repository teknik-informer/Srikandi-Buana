import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";

function loadModule(entryPoint) {
  const bundle = build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
  });
  return bundle.then((result) => {
    const commonjs = { exports: {} };
    vm.runInNewContext(result.outputFiles[0].text, {
      module: commonjs,
      exports: commonjs.exports,
    });
    return commonjs.exports;
  });
}

const [reporting, monitoring] = await Promise.all([
  loadModule("src/lib/enterprise-reporting.ts"),
  loadModule("src/lib/enterprise-monitoring.ts"),
]);

const principal = (role, overrides = {}) => ({
  accountId: role + "-account",
  userId: role + "-workspace",
  email: role + "@example.test",
  displayName: role,
  fullName: role,
  role,
  memberId: role === "anggota" ? "member-1" : null,
  position: "",
  programIds: role === "koordinator" ? ["1"] : [],
  ...overrides,
});

const row = (id, kind, data = {}, created = "2026-11-07T00:00:00.000Z") => ({
  id,
  kind,
  data,
  created,
  updated: created,
});

const records = [
  row("member-1", "anggota", { name: "Anggota satu", status: "Aktif", verification: "Terverifikasi", consent: "Terdokumentasi" }),
  row("member-2", "anggota", { name: "Anggota dua", status: "Aktif", verification: "Perlu verifikasi", consent: "Belum dikonfirmasi" }),
  row("activity-1", "kegiatan", { name: "Pelatihan", date: "2026-11-09", status: "Direncanakan", location: "Aula" }),
  row("activity-2", "kegiatan", { name: "Kegiatan internal", date: "2026-11-03", status: "Perlu verifikasi", location: "Balai" }),
  row("task-1", "tindaklanjut", { name: "Selesaikan proposal", dueDate: "2026-11-05", programId: "1", status: "Berjalan", pic: "Koordinator" }),
  row("task-2", "tindaklanjut", { name: "Tugas di program lain", dueDate: "2026-11-05", programId: "2", status: "Berjalan" }),
  row("cash-1", "kas", { name: "Pembelian bibit", date: "2026-11-04", amount: 250000, type: "Pengeluaran", fund: "Program" }),
  row("asset-1", "aset", { name: "Pompa air", quantity: 1, condition: "Perlu perawatan", status: "Aktif" }),
  row("draft-1", "publikasi", { name: "Kabar kegiatan", date: "2026-11-06", status: "Draf", fileId: "image-1", publicationPermission: "Belum dikonfirmasi" }),
];

test("the report center exposes only report groups covered by the current role", () => {
  const memberGroups = reporting.getVisibleReportGroups(principal("anggota")).map((group) => group.id);
  assert.deepEqual(memberGroups, ["operasional", "keanggotaan"]);

  const coordinatorGroups = reporting.getVisibleReportGroups(principal("koordinator")).map((group) => group.id);
  assert.deepEqual(coordinatorGroups, ["operasional"]);

  const financeGroups = reporting.getVisibleReportGroups(principal("bendahara")).map((group) => group.id);
  assert.ok(financeGroups.includes("keuangan"));
  assert.ok(financeGroups.includes("usaha"));
  assert.ok(!financeGroups.includes("keanggotaan"));

  const adminGroups = reporting.getVisibleReportGroups(principal("admin")).map((group) => group.id);
  assert.deepEqual(adminGroups, [
    "operasional", "keanggotaan", "administrasi", "keuangan", "usaha", "publikasi",
  ]);
});

test("member reports contain only the member's own records and readable activities", () => {
  const user = principal("anggota");
  const membership = reporting.selectReportRows(records, user, "keanggotaan");
  assert.deepEqual(membership.map((item) => item.id), ["member-1"]);
  const operations = reporting.selectReportRows(records, user, "operasional");
  assert.deepEqual(operations.map((item) => item.id), ["activity-1"]);
  assert.ok(!operations.some((item) => item.data.name === "Kegiatan internal"));
  assert.deepEqual(reporting.selectReportRows(records, user, "keuangan"), []);
});

test("coordinator report rows are limited to assigned program IDs", () => {
  const user = principal("koordinator");
  const tasks = reporting.selectReportRows(records, user, "operasional");
  assert.deepEqual(tasks.map((item) => item.id), ["task-1"]);
});

test("period filters use the activity or due date and keep all-period reports available", () => {
  const user = principal("admin");
  const november = reporting.selectReportRows(records, user, "operasional", "2026-11");
  assert.equal(november.length, 4);
  const october = reporting.selectReportRows(records, user, "operasional", "2026-10");
  assert.equal(october.length, 0);
});

test("membership reporting aggregates status without including personal information in the summary", () => {
  const rows = reporting.selectReportRows(records, principal("admin"), "keanggotaan");
  const summary = reporting.summarizeReportRows(rows);
  assert.equal(summary.reduce((total, item) => total + item.count, 0), rows.length);
  assert.ok(summary.some((item) => item.status === "Aktif" && item.count === 2));
});

test("monitoring metrics are role-scoped and finance data is withheld from members", () => {
  const memberSnapshot = monitoring.buildEnterpriseMonitoring(
    records,
    [],
    principal("anggota"),
    new Date("2026-11-07T04:00:00.000Z"),
  );
  assert.equal(memberSnapshot.membership.total, 1);
  assert.equal(memberSnapshot.finance, null);
  assert.equal(memberSnapshot.administration, null);
  assert.equal(memberSnapshot.business, null);
  assert.equal(memberSnapshot.publication, null);
  assert.equal(memberSnapshot.visibleRecords, 2);
});

test("administrator monitoring calculates operational, finance, business and publication signals", () => {
  const adminSnapshot = monitoring.buildEnterpriseMonitoring(
    records,
    [],
    principal("admin"),
    new Date("2026-11-07T04:00:00.000Z"),
  );
  assert.equal(adminSnapshot.membership.total, 2);
  assert.equal(adminSnapshot.membership.needsVerification, 1);
  assert.equal(adminSnapshot.operational.overdueTasks, 2);
  assert.equal(adminSnapshot.finance.missingEvidence, 1);
  assert.equal(adminSnapshot.business.assetsNeedAttention, 1);
  assert.equal(adminSnapshot.publication.drafts, 1);
  assert.ok(adminSnapshot.qualityFindings >= 1);
});

test("coordinator monitoring omits non-assigned program activity", () => {
  const snapshot = monitoring.buildEnterpriseMonitoring(
    records,
    [],
    principal("koordinator"),
    new Date("2026-11-07T04:00:00.000Z"),
  );
  assert.equal(snapshot.operational.openTasks, 1);
  assert.equal(snapshot.membership, null);
  assert.equal(snapshot.finance, null);
});
