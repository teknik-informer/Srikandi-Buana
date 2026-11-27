import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";

const privateFixture = {
  id: "member-private-1",
  kind: "anggota",
  created: "2026-11-01T00:00:00.000Z",
  updated: "2026-11-02T00:00:00.000Z",
  data: {
    name: "Nama Anggota Rahasia",
    phone: "081234567890",
    email: "anggota-rahasia@example.test",
    nik: "3300000000000001",
    address: "Alamat Rumah Rahasia",
    dusun: "Gintung",
    role: "anggota",
    status: "Aktif",
    verification: "Terverifikasi",
  },
};
const attendanceFixture = {
  id: "attendance-private-1",
  kind: "kehadiran",
  created: "2026-11-03T00:00:00.000Z",
  updated: "2026-11-03T00:00:00.000Z",
  data: {
    eventId: "event-1",
    name: "Nama Agenda",
    memberIds: ["member-1", "member-2"],
    memberNames: ["Nama Satu", "Nama Dua"],
    notes: "Catatan internal",
  },
};
const publicOperationalFixture = {
  id: "activity-1",
  kind: "kegiatan",
  created: "2026-11-04T00:00:00.000Z",
  updated: "2026-11-04T00:00:00.000Z",
  data: { date: "2026-11-04", status: "Selesai", type: "Penyuluhan", category: "Pertanian", programId: "program-1" },
};
const packageFixture = (overrides = {}) => ({
  id: "package-1",
  group_id: "keanggotaan",
  title: "Laporan Keanggotaan",
  period_start: "2026-11-01",
  period_end: "2026-11-30",
  package_version: 1,
  status: "approved",
  snapshot: { summary: { total: 2 }, rows: [privateFixture, attendanceFixture, publicOperationalFixture] },
  snapshot_hash: "a".repeat(64),
  created_at: "2026-11-15T10:00:00.000Z",
  created_by: "secretary-1",
  approved_at: "2026-11-15T11:00:00.000Z",
  approved_by: "chair-1",
  approver_name: "Ketua Terverifikasi",
  approval_note: "Disetujui untuk pelaporan",
  ...overrides,
});
let currentUser = null;
let currentPackage = packageFixture();
const db = {
  prepare(sql) {
    return {
      bind() { return this; },
      async first() {
        assert.match(sql, /FROM report_packages p LEFT JOIN users u/);
        return currentPackage;
      },
    };
  },
};
const bundle = await build({
  entryPoints: ["src/app/api/report-packages/export/route.ts"],
  bundle: true, write: false, platform: "node", format: "cjs",
  plugins: [{
    name: "isolated-report-export-dependencies",
    setup(context) {
      context.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({ path: "auth", namespace: "test" }));
      context.onResolve({ filter: /^@\/lib\/runtime$/ }, () => ({ path: "runtime", namespace: "test" }));
      context.onLoad({ filter: /.*/, namespace: "test" }, (args) => {
        if (args.path === "auth") return { contents: "export async function getAuthenticatedUser(){return globalThis.__testUser;}", loader: "js" };
        if (args.path === "runtime") return { contents: "export const env={DB:globalThis.__testDb};", loader: "js" };
        throw new Error("Unexpected test module: " + args.path);
      });
    },
  }],
});
async function requestAs(user, pkg, format = "csv") {
  currentUser = user;
  currentPackage = pkg;
  const module = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module, exports: module.exports, Response, Headers, Request, URL, Date,
    globalThis: { __testDb: db, get __testUser() { return currentUser; } },
  });
  const request = new Request("https://example.test/api/report-packages/export?id=package-1&format=" + format);
  return module.exports.GET(request);
}
const chair = { role: "ketua", userId: "workspace-1", accountId: "chair-1" };
for (const format of ["csv", "print"]) {
  const response = await requestAs(chair, packageFixture(), format);
  assert.equal(response.status, 200);
  const output = await response.text();
  for (const secret of [
    "Nama Anggota Rahasia", "081234567890", "anggota-rahasia@example.test",
    "3300000000000001", "Alamat Rumah Rahasia", "Nama Satu", "Nama Dua", "Catatan internal",
  ]) assert.ok(!output.includes(secret), "Chair export leaked private fixture: " + secret);
  assert.ok(output.includes("Laporan Keanggotaan"));
  assert.ok(output.includes("SHA-256"));
}
const secretary = { role: "sekretaris", userId: "workspace-1", accountId: "secretary-1" };
const secretaryResponse = await requestAs(secretary, packageFixture(), "csv");
assert.equal(secretaryResponse.status, 200);
const secretaryOutput = await secretaryResponse.text();
assert.ok(secretaryOutput.includes("Nama Anggota Rahasia"));
assert.ok(secretaryOutput.includes("081234567890"));
const formulaResponse = await requestAs(secretary, packageFixture({ title: '=HYPERLINK("https://example.test","klik")' }), "csv");
assert.equal(formulaResponse.status, 200);
const formulaOutput = await formulaResponse.text();
assert.ok(formulaOutput.includes("\"'=HYPERLINK("), "CSV text beginning with a formula must be prefixed with an apostrophe.");
const bendahara = { role: "bendahara", userId: "workspace-1", accountId: "treasurer-1" };
assert.equal((await requestAs(bendahara, packageFixture({ group_id: "operasional" }))).status, 404);
assert.equal((await requestAs(chair, packageFixture({ status: "draft" }))).status, 404);
const administratorResponse = await requestAs({ role: "admin", userId: "workspace-1", accountId: "admin-1" }, packageFixture());
assert.equal(administratorResponse.status, 200);
const administratorOutput = await administratorResponse.text();
assert.ok(administratorOutput.includes("Nama Anggota Rahasia"), "System administrator receives the full authorized workspace snapshot");
assert.ok(administratorOutput.includes("081234567890"), "System administrator can inspect authorized member contact data");

assert.equal((await requestAs(null, packageFixture())).status, 401);
console.log("PASS: approved report exports enforce authentication, status and domain guards; Chair CSV/print omit personal data while Secretariat retains authorized source access.");
