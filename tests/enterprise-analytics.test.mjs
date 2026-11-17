import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";

async function loadModule(entryPoint) {
  const bundle = await build({ entryPoints: [entryPoint], bundle: true, write: false, platform: "node", format: "cjs" });
  const commonjs = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, { module: commonjs, exports: commonjs.exports, Intl, Date });
  return commonjs.exports;
}

const analytics = await loadModule("src/lib/enterprise-analytics.ts");
const access = await loadModule("src/features/identity/access-policy.ts");
const rows = [
  { id: "member-1", kind: "anggota", data: { name: "Nama Rahasia", status: "Aktif", verification: "Terverifikasi" }, created: "2026-11-04T08:00:00.000Z", updated: "2026-11-05T08:00:00.000Z" },
  { id: "program-1", kind: "program", data: { programId: "1", name: "Program Satu", status: "Berjalan" }, created: "2026-10-04T08:00:00.000Z", updated: "2026-10-05T08:00:00.000Z" },
  { id: "task-1", kind: "tindaklanjut", data: { programId: "1", name: "Tugas Satu", status: "Berjalan", dueDate: "2026-12-01" }, created: "2026-11-06T08:00:00.000Z", updated: "2026-11-07T08:00:00.000Z" },
  { id: "task-2", kind: "tindaklanjut", data: { programId: "2", name: "Tugas Program Lain", status: "Berjalan", dueDate: "2026-12-05" }, created: "2026-11-08T08:00:00.000Z", updated: "2026-11-09T08:00:00.000Z" },
  { id: "cash-1", kind: "kas", data: { name: "Transaksi Rahasia", type: "Pemasukan", amount: 500000 }, created: "2026-09-04T08:00:00.000Z", updated: "2026-09-05T08:00:00.000Z" },
];
const files = [];
const principal = (role, programIds = []) => ({
  accountId: "account-" + role,
  userId: "workspace-1",
  email: role + "@example.test",
  displayName: role,
  fullName: role,
  role,
  memberId: null,
  position: "",
  programIds,
});

test("BI aggregates only records permitted for the current principal", () => {
  const chair = analytics.buildEnterpriseAnalytics(rows, files, principal("ketua"), new Date("2026-11-17T05:00:00.000Z"));
  assert.equal(chair.records, 5);
  assert.equal(chair.members, 1);
  assert.equal(chair.programs, 1);
  assert.equal(chair.openTasks, 2);
  assert.equal(chair.monthlyTrend.find((item) => item.month === "2026-11")?.records, 3);
  assert.ok(chair.domains.some((domain) => domain.id === "accounting" && domain.count === 1));
  assert.equal(JSON.stringify(chair).includes("Nama Rahasia"), false);
  assert.equal(JSON.stringify(chair).includes("Transaksi Rahasia"), false);
});

test("Coordinator analytics honors assigned programme scope before aggregation", () => {
  const coordinator = analytics.buildEnterpriseAnalytics(rows, files, principal("koordinator", ["1"]), new Date("2026-11-17T05:00:00.000Z"));
  assert.equal(coordinator.records, 2);
  assert.equal(coordinator.programs, 1);
  assert.equal(coordinator.openTasks, 1);
  assert.equal(coordinator.members, null);
  assert.equal(coordinator.monthlyTrend.find((item) => item.month === "2026-11")?.records, 1);
  assert.ok(!coordinator.domains.some((domain) => domain.id === "accounting"));
  assert.equal(JSON.stringify(coordinator).includes("Program Lain"), false);
});

test("System Administrator receives cross-application BI aggregates without exposing row-level identities", () => {
  const admin = analytics.buildEnterpriseAnalytics(rows, files, principal("admin"), new Date("2026-11-17T05:00:00.000Z"));
  assert.equal(admin.records, 5);
  assert.equal(admin.members, 1);
  assert.equal(admin.programs, 1);
  assert.equal(admin.openTasks, 2);
  assert.ok(admin.domains.some((domain) => domain.id === "accounting"));
  assert.equal(JSON.stringify(admin).includes("Nama Rahasia"), false);
  assert.equal(JSON.stringify(admin).includes("Transaksi Rahasia"), false);
});

test("BI route permission includes the System Administrator and authorized organizational roles", () => {
  for (const role of ["ketua", "sekretaris", "bendahara", "koordinator"]) {
    assert.equal(access.canReadSectionForRole(role, "analytics"), true);
  }
  assert.equal(access.canReadSectionForRole("admin", "analytics"), true);
  assert.equal(access.canReadSectionForRole("anggota", "analytics"), false);
});
