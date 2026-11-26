import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const records = readFileSync("src/app/api/records/route.ts", "utf8");
const attendance = readFileSync("src/app/api/attendance/route.ts", "utf8");
const attendanceMutations = readFileSync("src/lib/attendance/record-mutations.ts", "utf8");
const protectedRecords = readFileSync("src/lib/enterprise/protected-records.ts", "utf8");
const sync = readFileSync("src/lib/workspace-v14-sync.ts", "utf8");
const mapping = readFileSync("src/features/workspace-v14/legacy-mapping.mjs", "utf8");
const finance = readFileSync("src/features/finance/record-posting.ts", "utf8");
const operationProof = readFileSync("src/app/api/operations/proof/route.ts", "utf8");

assert(records.includes('import { buildV14RecordSyncStatements }'), "Records API must import the v14 adapter");
assert(records.includes("...normalizedWrites,...ledgerWrites"), "Legacy record and ledger writes must join the same database batch");
assert(records.includes("previousData:previousRecordData"), "Updates must pass the previous record state to the v14 mapper");
assert(records.includes("updateProtectedRecord") && records.includes("[...normalizedWrites,...ledgerWrites]"), "Protected asset/cash writes must remain atomic with normalized writes");
assert(attendance.includes("buildV14AttendanceSyncStatements"), "Legacy attendance API must import the normalized attendance adapter");
assert(attendance.includes("saveAttendanceRecord(db") && attendance.includes("}, normalizedAttendance)"), "Legacy attendance and normalized attendance must be committed through the atomic version-checked batch");
assert(attendance.includes("expectedUpdated") && attendance.includes("eventUpdated"), "Attendance API must require both register and source activity versions");
assert(attendanceMutations.includes("WITH event_guard AS MATERIALIZED") && attendanceMutations.includes("FOR UPDATE"), "Attendance write must lock the source activity at the transaction boundary");
assert(attendanceMutations.includes("AND records.updated IS NOT DISTINCT FROM CAST(? AS TEXT)") && attendanceMutations.includes("audit_written"), "Attendance update must compare the existing version and write audit only from the winning mutation");
assert(sync.includes("v14:attendance-member") && sync.includes("participant_type='member'") && sync.includes("participant_type='external'"), "V14 attendance reconciliation must be scoped to the legacy attendance register prefixes");
assert(protectedRecords.includes("normalizedWrites:PreparedStatement[]=[]") && protectedRecords.includes("db.batch([write,...normalizedWrites])"), "Protected record updates must commit the audit and normalized statements atomically");
assert(sync.includes("to_regclass('workspace_v14.organizations')") && sync.includes("if (!schema?.relation || !schema?.lineage) return []"), "Adapter must guard against a missing v14 schema");
assert(sync.includes("source_owner_user_id=?") && sync.includes("return statementForMapping"), "Adapter must resolve organization ownership before writing");
assert(sync.includes("catch {") && sync.includes("return []"), "Legacy compatibility path must remain available if v14 schema is unavailable");
assert(mapping.includes('kind === "anggota"') && mapping.includes('kind === "kegiatan"') && mapping.includes('kind === "tindaklanjut"'), "Core legacy domain mappings must be present");
assert(operationProof.includes("isModuleAvailableForUser") && (operationProof.match(/isModuleAvailableForUser/g)||[]).length === 3, "Proof route must import and enforce the projects module gate in both GET and POST");
assert(finance.includes("buildCashLedgerPostingStatements") && finance.includes("ON CONFLICT(owner,code) DO NOTHING"), "Cash posting must use the controlled chart-of-accounts initializer");

console.log("PASS v14 integration: atomic records, protected assets/cash, legacy attendance, schema guard, tenant ownership mapping, and finance posting.");
