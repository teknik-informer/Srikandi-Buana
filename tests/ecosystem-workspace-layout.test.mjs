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
  assert.ok(dashboard.includes('row.kind === "musyawarah" && parseMeetingActions(row.data.followup).length > 0'));
  assert.ok(dashboard.includes('Sumber rapat: " + row.id'));
  assert.ok(dashboard.includes("meetingTaskLocks.current.has(row.id)"));
  assert.ok(dashboard.includes('canWriteKind(user, "tindaklanjut")'));
  assert.ok(dashboard.includes('kind: "tindaklanjut"'));
  assert.ok(dashboard.includes('dueDate: ""'));
  assert.ok(dashboard.includes("PIC dan tenggat ditetapkan pengurus setelah keputusan disepakati"));
  assert.ok(dashboard.includes("Buat \" + missingCount + \" draf tugas"));
  assert.ok(dashboard.includes("decisionTasks"));
});

test("upcoming agenda links to the selected event attendance record with role-limited editing", () => {
  const dashboard = read("src/app/_components/management-dashboard.tsx");
  const attendance = read("src/app/_components/attendance.tsx");
  assert.ok(dashboard.includes('const attendanceAccess = user.role === "sekretaris"'));
  assert.ok(dashboard.includes('row.kind === "kehadiran" && row.data.eventId === event.id'));
  assert.ok(dashboard.includes('"/dashboard/kehadiran?eventId=" + encodeURIComponent(event.id)'));
  assert.ok(dashboard.includes("Daftar hadir belum dibuat"));
  assert.ok(dashboard.includes("tidak otomatis dianggap hadir"));
  assert.ok(attendance.includes('get("eventId")'));
  assert.ok(attendance.includes('setEventId(requestedEventId)'));
});

test("operational reports summarize attendance without exporting member identities", () => {
  const reports = read("src/app/_components/enterprise-reports.tsx");
  assert.ok(reports.includes('group.id === "operasional"'));
  assert.ok(reports.includes('row.kind === "kehadiran"'));
  assert.ok(reports.includes("row.data.memberIds.filter((id) => typeof id === \"string\").length"));
  assert.ok(reports.includes("Anggota ditandai hadir"));
  assert.ok(reports.includes("Jumlah anggota ditandai hadir"));
  assert.ok(reports.includes("Nama anggota tidak ditampilkan dalam ringkasan kehadiran"));
});

test("members receive guided self-service without direct edits to verified membership records", () => {
  const workspace = read("src/app/_components/access/role-workspace.tsx");
  const policy = read("src/features/identity/access-policy.ts");
  assert.ok(workspace.includes('user.role === "anggota" && section === "anggota"'));
  assert.ok(workspace.includes("Layanan keanggotaan saya"));
  assert.ok(workspace.includes('href="/dashboard/akun-saya"'));
  assert.ok(workspace.includes('href="/dashboard/pengajuan"'));
  assert.ok(workspace.includes('href="/dashboard/portal"'));
  assert.ok(policy.includes("return false") || policy.includes("canWriteKind"));
  assert.ok(policy.includes("record.id === user.memberId"));
  assert.ok(policy.includes('user.role === "anggota"'));
});


test("secretariat correspondence workflow is available only to authorized roles and captures disposition and archive references", () => {
  const schema = read("src/lib/srikandi.ts");
  const policy = read("src/features/identity/access-policy.ts");
  const navigation = read("src/lib/navigation-config.ts");
  const api = read("src/app/api/records/route.ts");
  assert.ok(schema.includes('surat:{title:"Surat Masuk dan Keluar"'));
  for (const field of ["direction", "number", "receivedDate", "sender", "recipient", "disposition", "pic", "dueDate", "attachmentId"]) assert.ok(schema.includes('key:"' + field + '"'));
  assert.ok(policy.includes('"surat"'));
  assert.ok(policy.includes('"alsintan"'));
  assert.ok(policy.includes('role === "sekretaris") return secretariatWrite.includes(kind)'));
  assert.ok(navigation.includes("admin('surat','Surat Masuk dan Keluar'"));
  assert.ok(api.includes("const module=modules[kind]"));
  assert.ok(api.includes("canWriteRecord(c.user!"));
});


test("financial operation fulfillment exposes strict cash reconciliation and linked ledger reference", () => {
  const workspace = read("src/app/_components/enterprise-workspace.tsx");
  const api = read("src/app/api/operations/route.ts");
  assert.ok(workspace.includes("cash_record_id?'Transaksi Buku Kas sudah tertaut':'Belum ada transaksi Buku Kas tertaut'"));
  assert.ok(workspace.includes("Pencocokan Buku Kas"));
  assert.ok(workspace.includes("money(c.amount)"));
  assert.ok(workspace.includes("Referensi: {detail.item.cash_record_id}"));
  assert.ok(api.includes("c.data::jsonb->>'type'='Pengeluaran'"));
  assert.ok(api.includes("c.data::jsonb->>'amount'=?"));
  assert.ok(api.includes("c.data::jsonb->>'fund'=?"));
  assert.ok(api.includes("f.deleted_at IS NULL"));
  assert.ok(api.includes("cash_record_id:cashId"));
});


test("coordinator program reports are scoped, visible to leadership, and promoted to one linked task draft", () => {
  const schema = read("src/lib/srikandi.ts");
  const policy = read("src/features/identity/access-policy.ts");
  const navigation = read("src/lib/navigation-config.ts");
  const dashboard = read("src/app/_components/management-dashboard.tsx");
  const insights = read("src/lib/management-insights.ts");
  const reporting = read("src/lib/enterprise-reporting.ts");
  const memberWorkspace = read("src/app/_components/access/role-workspace.tsx");
  assert.ok(schema.includes('laporan_program:{title:"Laporan Perkembangan Program"'));
  for (const field of ["programId", "date", "target", "achievement", "progress", "evaluation", "blockers", "supportNeeded", "nextSteps", "attachmentId"]) assert.ok(schema.includes('key:"' + field + '"'));
  assert.ok(policy.includes('const coordinationWrite = ["program", "kegiatan", "tindaklanjut", "laporan_program", "usaha", "kemitraan"]'));
  assert.ok(schema.includes('survei:{title:"Instrumen Survei Lapangan"'));
  assert.ok(policy.includes('kind === "survei"'));
  assert.ok(policy.includes('record.kind === "laporan_program"'));
  assert.ok(navigation.includes("admin('laporan_program','Laporan Perkembangan Program'"));
  assert.ok(dashboard.includes('row.kind === "laporan_program"'));
  assert.ok(dashboard.includes("createTaskFromProgramReport"));
  assert.ok(dashboard.includes('target ? "Target: "'));
  assert.ok(dashboard.includes('achievement ? "Capaian: "'));
  assert.ok(dashboard.includes('evaluation ? "Evaluasi: "'));
  assert.ok(dashboard.includes('const sourceMarker = "Sumber laporan program: " + row.id'));
  assert.ok(dashboard.includes('dueDate: ""'));
  assert.ok(dashboard.includes("Buat draf tindak lanjut"));
  assert.ok(insights.includes("Program dilaporkan terkendala"));
  assert.ok(reporting.includes('"laporan_program"'));
  assert.ok(memberWorkspace.includes('field.key === "programId" && user.role === "koordinator"'));
  assert.ok(memberWorkspace.includes('user.programIds.length > 0'));
  assert.ok(memberWorkspace.includes('programs.find((program) => program.id === o)?.name'));
});


test("chair task management preserves the follow-up record deletion boundary", () => {
  const api = read("src/app/api/records/route.ts");
  const workspace = read("src/app/_components/access/role-workspace.tsx");
  const policy = read("src/features/identity/access-policy.ts");
  assert.ok(!policy.includes("isSuperAdmin"), "No role has blanket CRUD access");
  assert.ok(api.includes("Ketua dapat memperbarui status tugas, tetapi tidak menghapus riwayat tindak lanjut."));
  assert.ok(workspace.includes('user.role !== "ketua" &&'));
});


test("chair records decisions through the task workspace rather than a context-free dashboard shortcut", () => {
  const dashboard = read("src/app/_components/management-dashboard.tsx");
  const workspace = read("src/app/_components/access/role-workspace.tsx");
  const policy = read("src/features/identity/access-policy.ts");
  assert.ok(dashboard.includes('user.role !== "ketua"'));
  assert.ok(dashboard.includes("createTaskFromProgramReport"));
  assert.ok(!policy.includes("isSuperAdmin"), "Chair does not receive blanket write access");
  assert.ok(!workspace.includes('Keputusan Ketua / perkembangan'));
  assert.ok(!workspace.includes('field.key === "pic") return { ...field, label: "Pelaksana yang ditetapkan"'));
  assert.ok(!workspace.includes('field.key === "dueDate") return { ...field, label: "Tenggat hasil keputusan"'));
});


test("Chair and Secretariat receive their privileged screens through the authenticated role route", () => {
  const route = read("src/app/dashboard/[[...section]]/page.tsx");
  assert.ok(route.includes('admin.role === "ketua" && active === "akun"'));
  assert.ok(route.includes('["ketua", "sekretaris"].includes(admin.role)'));
  assert.ok(route.includes("<Inbox />"));
  assert.ok(route.includes("getGovernanceAdminUser") === false, "Page visibility is role-driven; API guards remain authoritative");
});

test("task completion evidence is submitted by implementers and verified only by leadership", () => {
  const schema = read("src/lib/srikandi.ts");
  const policy = read("src/lib/enterprise/task-verification.ts");
  const api = read("src/app/api/records/route.ts");
  const workspace = read("src/app/_components/workspace.tsx");
  const management = read("src/app/_components/management-dashboard.tsx");
  const monitoring = read("src/app/_components/enterprise-monitoring.tsx");
  const insights = read("src/lib/management-insights.ts");

  for (const field of ["programId", "completionEvidence", "attachmentId", "verification", "reviewNote"]) {
    assert.ok(schema.includes('key:"' + field + '"'));
  }
  assert.ok(api.includes('import { taskVerificationError } from "@/lib/enterprise/task-verification"'));
  assert.ok(api.includes("taskVerificationError({"));
  assert.ok(policy.includes('input.role === "sekretaris"'));
  assert.ok(policy.includes("completionEvidence"));
  assert.ok(policy.includes("previousVerification === \"Terverifikasi\""));
  assert.ok(workspace.includes('["reviewNote", "meetingReviewNote"].includes(f.key)'));
  assert.ok(workspace.includes('f.key === "verification"'));
  assert.ok(management.includes('!["reviewNote", "meetingReviewStatus", "meetingReviewMeeting", "meetingReviewDate", "meetingReviewNote"].includes(field.key) || user.role === "sekretaris"'));
  assert.ok(management.includes('field.key === "verification" && !reviewer'));
  assert.ok(monitoring.includes('title: "Hasil menunggu verifikasi"'));
  assert.ok(monitoring.includes('title: "Tugas tanpa PIC"'));
  assert.ok(monitoring.includes('title: "Program terkendala"'));
  assert.ok(insights.includes("Hasil tugas menunggu verifikasi"));
  assert.ok(insights.includes("Hasil tugas perlu perbaikan"));
});


test("leadership task decisions are retained as distinct audit events and shown to the chair", () => {
  const api = read("src/app/api/records/route.ts");
  const monitoring = read("src/app/_components/enterprise-monitoring.tsx");
  for (const action of ["Hasil diajukan untuk verifikasi", "Hasil tugas disahkan", "Perbaikan tugas diminta"]) {
    assert.ok(api.includes(action));
  }
  assert.ok(api.includes("audit:u.role===\'ketua\'?audit.results:[]"));

  assert.ok(monitoring.includes("Aktivitas tercatat"));
});


test("period-aware program evaluation and meeting agenda are connected to Reports and Monitoring", () => {
  const helper = read("src/lib/program-evaluation.ts");
  const reports = read("src/app/_components/enterprise-reports.tsx");
  const monitoring = read("src/app/_components/enterprise-monitoring.tsx");
  const snapshot = read("src/lib/enterprise-monitoring.ts");
  for (const field of ["target", "achievement", "previous", "unchangedProgress", "hasReportInPeriod"]) {
    assert.ok(helper.includes(field));
  }
  assert.ok(helper.includes("Informasi belum tersedia; jangan menyimpulkan program tidak berjalan."));
  assert.ok(helper.includes("Perbandingan teks laporan"));
  assert.ok(reports.includes("function ProgramEvaluationPanel"));
  assert.ok(reports.includes("buildProgramEvaluations(rows, user, month)"));
  assert.ok(reports.includes("Perbandingan target, capaian, dan pelaksanaan"));
  assert.ok(reports.includes('"Target periode", "Capaian / realisasi", "Evaluasi"'));
  assert.ok(reports.includes('row.kind === "laporan_program" ? row.data.achievement'));
  assert.ok(reports.includes("Tidak ada persentase kemajuan yang dihitung"));
  assert.ok(snapshot.includes("buildMeetingPriorities(programEvaluations)"));
  assert.ok(monitoring.includes("Bahan rapat dan keputusan pengurus"));
  assert.ok(monitoring.includes("snapshot.meetingPriorities.slice(0, 12)"));
  assert.ok(monitoring.includes("bukan keputusan otomatis"));
});


test("meeting decisions become individually linked tasks only after approval and keep their source history", () => {
  const schema = read("src/lib/srikandi.ts");
  const helper = read("src/lib/meeting-cycle.ts");
  const dashboard = read("src/app/_components/management-dashboard.tsx");
  const api = read("src/app/api/records/route.ts");
  const workspace = read("src/app/_components/workspace.tsx");

  for (const field of ["agendaPoints", "decisionSummary", "followup", "nextReviewDate", "reviewOfMeeting", "reviewSummary"]) {
    assert.ok(schema.includes('key:"' + field + '"'));
  }
  for (const field of ["meetingReviewStatus", "meetingReviewMeeting", "meetingReviewDate", "meetingReviewNote"]) {
    assert.ok(schema.includes('key:"' + field + '"'));
  }
  assert.ok(helper.includes("parseMeetingActions"));
  assert.ok(helper.includes("parseMeetingTaskReference"));
  assert.ok(helper.includes("decisionsPreserveExistingOrder"));
  assert.ok(dashboard.includes('["Disepakati", "Ditindaklanjuti"].includes(String(row.data.status || ""))'));
  assert.ok(dashboard.includes("meetingActionSourceMarker(row.id, index)"));
  assert.ok(dashboard.includes("Lanjutkan "));
  assert.ok(dashboard.includes("Evaluasi pelaksanaan keputusan rapat"));
  assert.ok(dashboard.includes('user.role === "sekretaris" && (reviewStatus === "Belum dievaluasi"'));
  assert.ok(api.includes("Keputusan harus tercatat Disepakati sebelum dibuat menjadi tugas."));
  assert.ok(api.includes("Keputusan rapat ini sudah memiliki tugas."));
  assert.ok(api.includes("Daftar keputusan sudah memiliki tugas terkait."));
  assert.ok(api.includes("Notulen tidak dapat dihapus karena masih menjadi sumber tugas"));
  assert.ok(api.includes("Tugas yang berasal dari keputusan rapat tidak dapat dihapus."));
  assert.ok(api.includes("Keputusan rapat dibuat menjadi tugas"));
  assert.ok(api.includes("Evaluasi keputusan rapat diperbarui"));
  assert.ok(workspace.includes('["meetingReviewMeeting", "meetingReviewDate"].includes(f.key)'));
});
