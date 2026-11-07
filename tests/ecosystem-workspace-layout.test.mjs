import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const shell = read("src/app/_components/workspace-shell.tsx");
const css = read("src/app/globals.css");

test("all dashboard pages render inside one shared content frame", () => {
  assert.ok(shell.includes('<div className="workspace-main">'));
  assert.ok(shell.includes('<footer className="workspace-footer">'));
  assert.ok(css.includes(".workspace-main"));
  assert.ok(css.includes("--workspace-content-max: 1600px"));
});

test("workspace pages share one responsive spacing scale", () => {
  assert.ok(css.includes("--workspace-inline-space: clamp(16px, 2.5vw, 40px)"));
  assert.ok(css.includes("--workspace-section-gap: 24px"));
  assert.ok(css.includes("max-width: var(--workspace-content-max)"));
  assert.ok(css.includes("@media (max-width: 767px)"));
});

test("every module workspace opts into the shared page layout", () => {
  const workspace = read("src/app/_components/workspace.tsx");
  const member = read("src/app/_components/access/role-workspace.tsx");
  const management = read("src/app/_components/management-dashboard.tsx");
  const commerce = read("src/app/_components/ecosystem-workspace.tsx");
  const operations = read("src/app/_components/enterprise-workspace.tsx");
  const notifications = read("src/app/_components/notification-center.tsx");
  const dashboard = read("src/app/_components/enterprise-dashboard-overview.tsx");

  assert.ok(workspace.includes('className="workspace workspace-page"'));
  assert.ok(member.includes('className="workspace workspace-role workspace-page"'));
  assert.ok(management.includes('className="management-dashboard workspace-page min-w-0"'));
  assert.equal((commerce.match(/className="workspace-page"/g) || []).length, 2);
  assert.ok(operations.includes('<div className="workspace-page">'));
  assert.ok(notifications.includes('className="workspace-page"'));
  assert.ok(dashboard.includes('<main className="workspace-page"'));
});

test("legacy workspace padding and independent max-widths are reset inside the common frame", () => {
  assert.ok(css.includes(".workspace-page {"));
  assert.ok(css.includes("max-width: none"));
  assert.ok(css.includes("margin: 0"));
  assert.ok(css.includes("padding: 0"));
  assert.ok(css.includes("margin-block-start: 0 !important"));
});

test("specialized monitoring and report pages render only their own page heading", () => {
  const adminWorkspace = read("src/app/_components/workspace.tsx");
  const roleWorkspace = read("src/app/_components/access/role-workspace.tsx");
  const monitoring = read("src/app/_components/enterprise-monitoring.tsx");
  const reports = read("src/app/_components/enterprise-reports.tsx");

  assert.ok(adminWorkspace.includes('{!["monitoring", "laporan"].includes(section) && ('));
  assert.ok(roleWorkspace.includes('{!["monitoring", "laporan"].includes(section) && ('));
  assert.ok(monitoring.includes('<WorkspacePageHeader'));
  assert.ok(reports.includes('<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Laporan</h1>'));
});

test("Pusat Kendali provides a role-scoped action queue from real operational records", () => {
  const dashboard = read("src/app/_components/management-dashboard.tsx");
  assert.ok(dashboard.includes('aria-labelledby="action-center-title"'));
  assert.ok(dashboard.includes("Pusat Tindakan"));
  assert.ok(dashboard.includes("view.overdue"));
  assert.ok(dashboard.includes("view.dueToday"));
  assert.ok(dashboard.includes("filterAgenda(view.agenda, view.today, 7)"));
  assert.ok(dashboard.includes("issues.forEach"));
  assert.ok(dashboard.includes("canWriteRecord(user, item.row)"));
  assert.ok(dashboard.includes("recordHref(item.row)"));
  assert.ok(dashboard.includes("bukan jaminan bahwa seluruh pekerjaan sudah selesai"));
});

test("meeting follow-ups can be promoted to permission-checked task drafts without inventing deadlines", () => {
  const dashboard = read("src/app/_components/management-dashboard.tsx");
  assert.ok(dashboard.includes('row.kind === "musyawarah" && String(row.data.followup || "").trim()'));
  assert.ok(dashboard.includes('Sumber rapat: " + row.id'));
  assert.ok(dashboard.includes("meetingTaskLocks.current.has(row.id)"));
  assert.ok(dashboard.includes('canWriteKind(user, "tindaklanjut")'));
  assert.ok(dashboard.includes('kind: "tindaklanjut"'));
  assert.ok(dashboard.includes('dueDate: ""'));
  assert.ok(dashboard.includes("tetapkan penanggung jawab dan tenggat melalui keputusan pengurus"));
  assert.ok(dashboard.includes("Buat draf tugas"));
  assert.ok(dashboard.includes("linkedTask"));
});

test("upcoming agenda links to the selected event attendance record with role-limited editing", () => {
  const dashboard = read("src/app/_components/management-dashboard.tsx");
  const attendance = read("src/app/_components/attendance.tsx");
  assert.ok(dashboard.includes('const attendanceAccess = user.role === "admin" || user.role === "sekretaris"'));
  assert.ok(dashboard.includes('row.kind === "kehadiran" && row.data.eventId === event.id'));
  assert.ok(dashboard.includes('"/dashboard/kehadiran?eventId=" + encodeURIComponent(event.id)'));
  assert.ok(dashboard.includes("Daftar hadir belum dibuat"));
  assert.ok(dashboard.includes("tidak otomatis dianggap hadir"));
  assert.ok(attendance.includes('get("eventId")'));
  assert.ok(attendance.includes('setEventId(requestedEventId)'));
});
