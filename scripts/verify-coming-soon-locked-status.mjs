import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const ui = read("../src/components/ui.tsx");
const apps = read("../src/config/apps.ts");
const shell = read("../src/components/app-shell.tsx");
const launcher = read("../src/app/app/(launcher)/page.tsx");
const studio = read("../src/app/studio/page.tsx");
const dashboard = read("../src/app/studio/dashboard/page.tsx");
const data = read("../src/app/studio/data/page.tsx");
const modules = read("../src/app/studio/modul/page.tsx");
const applications = read("../src/app/studio/aplikasi/page.tsx");
const organization = read("../src/app/studio/organisasi/page.tsx");
const workflow = read("../src/app/studio/workflow/page.tsx");
const release = read("../src/app/studio/rilis/page.tsx");
const website = read("../src/app/studio/website/page.tsx");
const theme = read("../src/app/studio/tema/page.tsx");
const portal = read("../src/app/portal/page.tsx");
const notifications = read("../src/app/app/(launcher)/notifikasi/notifikasi-client.tsx");
const fieldNav = read("../src/config/field-nav.ts");
const fieldSection = read("../src/components/field-section.tsx");

assert.match(ui, /export function ComingSoonBadge/);
assert.match(ui, /<LockKeyhole/);
assert.match(ui, /Segera Hadir/);
assert.match(ui, /fitur masih terkunci/);

assert.match(apps, /comingSoon\?: boolean/);
assert.match(apps, /key: "portal"[\s\S]*?comingSoon: true/);
assert.match(shell, /candidate\.comingSoon/);
assert.match(shell, /a\.comingSoon \?/);
assert.match(shell, /<LockKeyhole/);
assert.match(shell, /item\.comingSoon/);
assert.match(shell, /Segera Hadir/);
assert.match(launcher, /accessibleAppCount = accessibleApps\.filter\(\(app\) => !app\.comingSoon\)/);
assert.match(launcher, /app\.comingSoon \?/);
assert.match(launcher, /<ComingSoonBadge/);

for (const [name, source, marker] of [
  ["Website Studio", website, "CMS & revisi halaman"],
  ["Dashboard Studio", dashboard, "Widget Layout"],
  ["Data Studio", data, "Form Builder"],
  ["Module Studio", modules, "Toggle submodul"],
  ["Application Studio", applications, "Template & cloning"],
  ["Organization Studio", organization, "Editor tata kelola"],
  ["Workflow Studio", workflow, "Workflow Builder"],
  ["Release Studio", release, "Approval & rollback"],
  ["Theme Manager", theme, "Density per aplikasi"],
]) {
  assert.match(source, /ComingSoonBadge/, name + " must show a coming-soon marker");
  assert.ok(source.includes(marker), name + " must identify the unfinished capability");
}
assert.match(studio, /comingSoon: "CMS halaman & revisi"/);
assert.match(studio, /comingSoon: "Widget Layout"/);
assert.match(studio, /comingSoon: "Workflow Editor"/);
assert.match(studio, /status: "Theme Manager aktif"/);
assert.doesNotMatch(studio, /Editor preset dan penyimpanan tema belum aktif/);

assert.match(portal, /ComingSoonBadge/);
assert.match(portal, /Dataset eksternal masih terkunci/);
assert.match(portal, /if \(!siteSettings\.features\.externalPortal\) notFound\(\)/);
assert.match(portal, /Registri grant berbagi data/);

assert.match(notifications, /ComingSoonBadge/);
assert.match(notifications, /LockKeyhole/);
assert.match(notifications, /Notifikasi operasional belum diaktifkan/);

for (const marker of ["Form Builder", "Relasi dokumen bidang", "Anggaran formal & realisasi", "Editor pengaturan bidang"]) {
  assert.ok(fieldNav.includes(marker), "Field navigation must identify " + marker);
  assert.ok(fieldSection.includes(marker), "Field section must show " + marker);
}
assert.match(shell, /notices\.length === 0/);
assert.match(shell, /LockKeyhole size=\{8\}/);

console.log("Coming Soon / locked feature indicators: PASS");
