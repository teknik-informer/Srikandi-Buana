import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const fields = read("src/lib/srikandi.ts");
const workspace = read("src/app/_components/workspace.tsx");
const api = read("src/app/api/records/route.ts");
const table = read("src/app/_components/record-table.tsx");

test("follow-up tasks can be assigned to an active member record", () => {
  assert.ok(fields.includes('key:"assignedMemberId",label:"Anggota pelaksana (opsional)",type:"member"'));
  assert.match(workspace, /f\.type === "member"/);
  assert.match(workspace, /members\s*\.filter\(\(member\) => member\.data\.status === "Aktif"\)/);
  assert.match(table, /row\.data\.assignedMemberName/);
  assert.match(workspace, /assignedMemberId:"assignedMemberName"/);
});

test("task assignment is validated server-side against the same group's active membership", () => {
  assert.match(api, /kind==="tindaklanjut"/);
  assert.match(api, /kind='anggota'/);
  assert.match(api, /owner=\?/);
  assert.match(api, /Penugasan hanya dapat diberikan kepada anggota dengan status Aktif/);
  assert.match(api, /data\.assignedMemberName=String\(memberData\.name\|\|""\)/);
});

test("task assignment remains optional and can be cleared", () => {
  assert.ok(fields.includes("Anggota pelaksana (opsional)"));
  assert.match(workspace, /Belum ditetapkan/);
  assert.match(api, /data\.assignedMemberId=""/);
  assert.match(api, /data\.assignedMemberName=""/);
});

test("asset register separates member ownership from group inventory", () => {
  assert.ok(fields.includes('key:"assetOwnership",label:"Kepemilikan"'));
  assert.ok(fields.includes('key:"memberOwnerId",label:"Pemilik anggota",type:"member-owner"'));
  assert.match(workspace, /f\.type === "member-owner"/);
  assert.match(api, /ownership==="Milik anggota"/);
  assert.match(api, /data\.memberOwnerName=String\(ownerData\.name\|\|""\)/);
});

test("group asset custody requires an active member and dated handover", () => {
  assert.ok(fields.includes('key:"custodianMemberId",label:"Anggota pemegang / peminjam",type:"member"'));
  assert.match(api, /custody==="Dipinjam"/);
  assert.match(api, /Aset hanya dapat diserahkan kepada anggota berstatus Aktif/);
  assert.match(api, /Tanggal serah-terima wajib diisi saat aset dipinjam/);
  assert.match(api, /expectedReturnAt<issuedAt/);
  assert.match(api, /returnedAt<issuedAt/);
});

test("asset tables and exports show member names, not internal member IDs", () => {
  assert.match(table, /row\.data\.memberOwnerName/);
  assert.match(table, /row\.data\.custodianMemberName/);
  assert.match(workspace, /memberOwnerId:"memberOwnerName"/);
  assert.match(workspace, /custodianMemberId:"custodianMemberName"/);
});

test("group asset custody sync writes a normalized inventory item and append-only movement events", () => {
  const sync = read("src/lib/workspace-v14-sync.ts");
  const route = read("src/app/api/records/route.ts");
  const migration = read("migrations/011_member_asset_movement_history.sql");
  assert.match(sync, /source\.kind === "aset" && source\.data\.assetOwnership === "Milik kelompok"/);
  assert.match(sync, /INSERT INTO workspace_v14\.inventory_items/);
  assert.match(sync, /INSERT INTO workspace_v14\.member_asset_assignments/);
  assert.match(sync, /INSERT INTO workspace_v14\.member_asset_movement_events/);
  assert.match(sync, /ON CONFLICT \(id\) DO NOTHING/);
  assert.match(sync, /source\.previousData\?\.custodyStatus/);
  assert.match(route, /previousData: previousRecordData/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON workspace_v14\.member_asset_movement_events/);
  assert.match(migration, /append-only/);
});

test("personal assets are excluded from normalized group inventory synchronization", () => {
  const sync = read("src/lib/workspace-v14-sync.ts");
  assert.match(sync, /source\.data\.assetOwnership === "Milik kelompok"/);
  assert.doesNotMatch(sync, /assetOwnership === "Milik anggota"[^\n]*INSERT INTO workspace_v14\.inventory_items/);
});

test("group assets are normalized but member-owned assets are not treated as group inventory", async () => {
  const { mapLegacyRecordToV14 } = await import("../src/features/workspace-v14/legacy-mapping.mjs");
  assert.equal(mapLegacyRecordToV14("aset", { assetOwnership: "Milik kelompok", name: "Mesin jahit" }).domain, "inventory_items");
  assert.equal(mapLegacyRecordToV14("aset", { assetOwnership: "Milik anggota", name: "Motor pribadi" }), null);
});

test("protected asset edits include normalized writes in the same database batch", () => {
  const protectedRecords = read("src/lib/enterprise/protected-records.ts");
  const route = read("src/app/api/records/route.ts");
  assert.match(protectedRecords, /db\.batch\(\[write,\.\.\.normalizedWrites\]\)/);
  assert.match(route, /previousData:oldData/);
  assert.match(route, /normalizedWrites\);/);
});


test("asset monitoring separates group property, member property, overdue and incomplete custody", async () => {
  const { buildEnterpriseMonitoring } = await import("../src/lib/enterprise-monitoring.ts");
  const user = {
    accountId: "account-1", userId: "owner-1", email: "qa@example.test",
    displayName: "QA", fullName: "QA", role: "admin", memberId: null,
    position: "Administrator", programIds: [],
  };
  const row = (id, data) => ({ id, kind: "aset", data, created: "2026-11-01T00:00:00.000Z", updated: "2026-11-01T00:00:00.000Z" });
  const rows = [
    row("group-overdue", { name: "Mesin jahit", assetOwnership: "Milik kelompok", custodyStatus: "Dipinjam", expectedReturnAt: "2026-11-08", condition: "Baik" }),
    row("group-no-date", { name: "Tenda", assetOwnership: "Milik kelompok", custodyStatus: "Dipinjam", expectedReturnAt: "", condition: "Baik" }),
    row("member-private", { name: "Motor", assetOwnership: "Milik anggota", custodyStatus: "Tidak dipinjamkan", condition: "Baik" }),
    row("legacy-unknown", { name: "Barang lama", assetOwnership: "Belum diklasifikasi", custodyStatus: "Tidak dipinjamkan" }),
    row("group-maintenance", { name: "Pompa", assetOwnership: "Milik kelompok", custodyStatus: "Perawatan", condition: "Perlu perawatan" }),
  ];
  const snapshot = buildEnterpriseMonitoring(rows, [], user, new Date("2026-11-09T12:00:00.000Z"));
  assert.equal(snapshot.business.groupAssets, 3);
  assert.equal(snapshot.business.memberOwnedAssets, 1);
  assert.equal(snapshot.business.unclassifiedAssets, 1);
  assert.equal(snapshot.business.borrowedAssets, 2);
  assert.equal(snapshot.business.overdueAssets, 1);
  assert.equal(snapshot.business.assetsWithoutReturnDate, 1);
  assert.equal(snapshot.business.maintenanceAssets, 1);
});

test("monitoring and report UI expose asset custody status and group/member ownership separately", () => {
  const monitoring = read("src/app/_components/enterprise-monitoring.tsx");
  const reports = read("src/app/_components/enterprise-reports.tsx");
  assert.match(monitoring, /Aset kelompok dipinjam/);
  assert.match(monitoring, /terlambat/);
  assert.match(monitoring, /aset pribadi dipisahkan/);
  assert.match(reports, /Rekap inventaris dan penguasaan aset/);
  assert.match(reports, /assetOwnership === "Milik kelompok"/);
  assert.match(reports, /assetOwnership === "Milik anggota"/);
  assert.match(reports, /Rencana kembali/);
  assert.match(reports, /Pemegang aset/);
});
