import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const overview = read("src/app/_components/enterprise-dashboard-overview.tsx");
const progressChart = read("src/app/_components/workspace-progress-chart.tsx");
const experience = read("src/lib/workspace-experience.ts");
const help = read("src/app/_components/help-center.tsx");
const shell = read("src/app/_components/workspace-shell.tsx");
const monitoring = read("src/app/_components/enterprise-monitoring.tsx");
const reports = read("src/app/_components/enterprise-reports.tsx");
const workflow = read(".github/workflows/quality.yml");
const pkg = JSON.parse(read("package.json"));

test("all seven workspaces receive data-led briefings", () => {
  for (const id of ["ecosystem", "management", "administration", "finance", "commerce", "publication", "system"]) {
    assert.match(experience, new RegExp('case "' + id + '"'));
  }
  assert.match(overview, /buildDashboardBriefing\(dashboard\.id, snapshot, availableFeatureIds\)/);
  assert.match(overview, /getVisibleEnterpriseDashboards\(user\.role\)/);
  assert.match(experience, /ARAH TINDAKAN BERDASARKAN DATA/);
  assert.match(overview, /Ruang ini membantu Anda memahami kondisi/);
});

test("briefing recommendations are derived from real scoped metrics", () => {
  assert.match(experience, /work\?\.overdueTasks/);
  assert.match(experience, /snapshot\.membership\?\.needsVerification/);
  assert.match(experience, /snapshot\.administration\?\.needsReview/);
  assert.match(experience, /finance\?\.invalidTransactions/);
  assert.match(experience, /business\?\.lotsOnHold/);
  assert.match(experience, /publication\?\.permissionNeedsReview/);
  assert.match(experience, /snapshot\.qualityFindings/);
  assert.doesNotMatch(experience, /Math\.random|faker|mockData|dummyData/i);
});

test("guided actions are kept inside the role-visible dashboard modules", () => {
  assert.match(experience, /new Set\(availableFeatureIds\)/);
  assert.match(experience, /allowed\.has\(destination\)/);
  assert.match(experience, /availableFeatureIds\[0\]/);
});

test("workspace overview distinguishes attention, steady and limited access states", () => {
  assert.match(overview, /briefingAppearance/);
  assert.match(overview, /Perlu tindak lanjut/);
  assert.match(overview, /Ritme terjaga/);
  assert.match(overview, /Sesuai hak akses/);
  assert.match(overview, /Tidak ada perubahan data yang dilakukan/);
  assert.match(overview, /featureIcons/);
  assert.match(overview, /Aktivitas yang baru tercatat/);
  assert.match(overview, /recentRecords/);
  assert.match(overview, /Perbarui data/);
  assert.match(overview, /onClick=\{\(\) => void load\(\)\}/);
});

test("dashboard progress chart derives six-month trends from role-scoped source records", () => {
  assert.match(overview, /<WorkspaceProgressChart/);
  assert.match(progressChart, /rows\.filter\(\(row\) => featureIds\.has\(row\.kind\)\)/);
  assert.match(progressChart, /validTimestamp\(row\.created\)/);
  assert.match(progressChart, /validTimestamp\(row\.updated\)/);
  assert.match(progressChart, /Array\.from\(\{ length: 6 \}/);
  assert.match(progressChart, /Catatan baru/);
  assert.match(progressChart, /Catatan diperbarui/);
  assert.match(progressChart, /workspace-equalizer-fill/);
  assert.match(progressChart, /Belum ada aktivitas dalam enam bulan terakhir/);
  assert.doesNotMatch(progressChart, /Math\.random|faker|mockData|dummyData/i);
  assert.match(progressChart, /bukan persentase keberhasilan program/);
  assert.match(overview, /programEvaluations=\{dashboard\.id === "management" \? snapshot\.programEvaluations : undefined\}/);
  assert.match(progressChart, /Perkembangan program kerja/);
  assert.match(progressChart, /program\.reportCount/);
  assert.match(progressChart, /program\.openTasks\.length/);
  assert.match(progressChart, /program\.blocked/);
});

test("help centre searches template names, descriptions, categories and field names", () => {
  assert.match(help, /useMemo, useState/);
  assert.match(help, /templateQuery/);
  assert.match(help, /template\.fields\.map\(\(field\) => field\.label \+ " " \+ field\.key\)/);
  assert.match(help, /Panduan belum ditemukan/);
  assert.match(help, /Hapus pencarian/);
});

test("help remains reachable from every authenticated workspace page", () => {
  assert.match(shell, /href="\/dashboard\/panduan"/);
  assert.match(shell, /aria-label="Buka Pusat Bantuan"/);
});

test("Monitoring highlights its first actionable finding without claiming an automatic decision", () => {
  assert.match(monitoring, /Langkah berikutnya/);
  assert.match(monitoring, /visibleIssues\[0\]/);
  assert.match(monitoring, /Periksa sumber/);
  assert.match(monitoring, /bukan keputusan/);
});

test("Reports teaches users how to select, review and share source-backed reports", () => {
  assert.match(reports, /Cara menggunakan pusat laporan/);
  assert.match(reports, /Pilih bidang/);
  assert.match(reports, /Tentukan periode/);
  assert.match(reports, /Tinjau sebelum dibagikan/);
});

test("Next.js ESLint runs as a separate CI quality gate", () => {
  assert.match(pkg.scripts.lint, /^eslint src\/app\/_components\/enterprise-dashboard-overview\.tsx/);
  assert.match(pkg.scripts.lint, /src\/app\/_components\/enterprise-monitoring\.tsx/);
  assert.match(pkg.scripts.lint, /src\/app\/_components\/enterprise-reports\.tsx/);
  assert.match(pkg.scripts.lint, /src\/app\/_components\/workspace-progress-chart\.tsx/);
  assert.match(pkg.scripts.lint, /src\/lib\/workspace-experience\.ts$/);
  assert.match(workflow, /name: ESLint changed v14 workspace experience files/);
  assert.match(workflow, /run: npm run lint/);
});
