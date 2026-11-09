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
