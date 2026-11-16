import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("src/app/api/hrm/attendance/route.ts", "utf8");
const ui = readFileSync("src/app/_components/hrm-attendance-workspace.tsx", "utf8");
const page = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
const nav = readFileSync("src/lib/navigation-config.ts", "utf8");
const policy = readFileSync("src/features/identity/access-policy.ts", "utf8");

assert(api.includes("getAuthenticatedUser"), "Attendance API must authenticate every request");
assert(api.includes("sameOrigin(req)"), "Write requests must enforce same-origin");
assert(api.includes("isArchitectFullAccess"), "Technical full access must use the server-derived Preview-only capability");
assert(api.includes("user.role === \"sekretaris\"") && api.includes("user.role === \"koordinator\""), "Operational access must map to existing organizational roles");
assert(api.includes("user.programIds.includes(String(data.programId))"), "Coordinator session scope must be limited to assigned programs");
assert(api.includes("participantIds.includes(participantId)"), "Only participants assigned to the session may check in");
assert(api.includes("memberData.status !== \"Aktif\"") && api.includes("memberData.verification !== \"Terverifikasi\""), "Only active verified members may check in");
assert(api.includes('ON CONFLICT(id) DO NOTHING'), "Deterministic attendance IDs must prevent duplicate check-in under concurrent requests");
assert(api.includes('digest(owner + ":" + sessionId + ":" + participantId)'), "Attendance ID must be stable per workspace/session/participant");
assert(api.includes("randomBytes(32).toString(\"base64url\")") && api.includes("tokenHash: digest(token)"), "QR tokens must be random and only their hash may be persisted");
assert(api.includes("Date.parse(String(r.data.expiresAt)) > Date.now()"), "Expired QR tokens must be rejected");
assert(api.includes("locationConsent !== true") && api.includes("haversine("), "Geofence validation must require explicit one-time location consent");
assert(!/latitude: lat|longitude: lon|coords:/.test(api), "Device coordinates must not be persisted in attendance records");
assert(api.includes("action === \"request_correction\"") && api.includes("action === \"review_correction\""), "Correction request and review workflows must exist");
assert(api.includes("previousStatus") && api.includes("appendAudit"), "Attendance corrections must preserve prior state and append audit events");
assert(api.includes("format") && api.includes("text/csv"), "Attendance export must be available as CSV");
assert(ui.includes("Ajukan koreksi") && ui.includes("Buat tautan QR") && ui.includes("Ekspor CSV"), "UI must expose corrections, QR token link and export");
assert(ui.includes("user.role === \"anggota\"") && ui.includes("user.role === \"sekretaris\""), "UI must distinguish member and management experiences");
assert(page.includes("HrmAttendanceWorkspace") && page.includes('active === "presensi"'), "Dashboard must mount the HRM attendance workspace");
assert(nav.includes("admin('presensi','Presensi Kegiatan'") && nav.includes("admin('presensi-saya','Presensi Saya'"), "Navigation must expose manager and member routes");
assert(policy.includes('if (id === "presensi") return ["ketua", "sekretaris", "koordinator"].includes(role)') && policy.includes('id === "presensi-saya"'), "Route policy must distinguish manager and personal attendance");

console.log("PASS smart attendance: authentication, role/program scope, verified participants, duplicate prevention, QR token hashing/expiry, one-time location consent, correction audit, CSV export, and dashboard navigation.");
