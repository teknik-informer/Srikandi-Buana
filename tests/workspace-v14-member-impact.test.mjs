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
  assert.match(route, /\[\.\.\.normalizedWrites,\.\.\.ledgerWrites\]\);/);
});


test("asset monitoring calculations separate group ownership, member property and overdue custody", () => {
  const monitoring = read("src/lib/enterprise-monitoring.ts");
  assert.match(monitoring, /const groupAssets = assets\.filter\(\(row\) => row\.data\.assetOwnership === "Milik kelompok"\)/);
  assert.match(monitoring, /const memberOwnedAssets = assets\.filter\(\(row\) => row\.data\.assetOwnership === "Milik anggota"\)/);
  assert.match(monitoring, /const overdueAssets = borrowedAssets\.filter/);
  assert.match(monitoring, /const assetsWithoutReturnDate = borrowedAssets\.filter/);
  assert.match(monitoring, /Pengembalian aset terlambat/);
  assert.match(monitoring, /Kepemilikan aset belum diklasifikasi/);
});

test("asset movement history API is scoped by asset permission and organization", () => {
  const route = read("src/app/api/records/route.ts");
  assert.match(route, /if\(canReadKind\(u,"aset"\)\)/);
  assert.match(route, /workspace_v14\.member_asset_movement_events/);
  assert.match(route, /WHERE source_owner_user_id=\?/);
  assert.match(route, /WHERE e\.organization_id=\?/);
  assert.match(route, /LIMIT 50/);
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


test("monitoring links borrowed group assets to their member tasks and programs without mixing personal assets", () => {
  const links = read("src/app/_components/asset-program-links.tsx");
  const monitoring = read("src/app/_components/enterprise-monitoring.tsx");
  assert.match(links, /row\.data\.assetOwnership === "Milik kelompok"/);
  assert.match(links, /row\.data\.custodyStatus === "Dipinjam"/);
  assert.match(links, /assignedMemberId/);
  assert.match(links, /programId/);
  assert.match(links, /recordHref\(task\)/);
  assert.match(links, /Kepemilikan aset pribadi tidak ditampilkan sebagai aset kelompok/);
  assert.match(monitoring, /AssetProgramLinks rows=\{rows\}/);
  assert.match(monitoring, /canReadSection\(user, "aset"\)/);
});
