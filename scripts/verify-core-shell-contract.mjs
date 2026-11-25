import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const coreShell = read("src/components/core-shell.tsx");
const appShell = read("src/components/app-shell.tsx");
const pengurusLayout = read("src/app/app/(area)/pengurus/layout.tsx");
const launcherPage = read("src/app/app/(launcher)/page.tsx");
const appAccess = read("src/lib/app-access.ts");
const appShellSource = read("src/components/app-shell.tsx");

assert.match(coreShell, /nav=\{nav\}/, "CoreShell must preserve navigation supplied by the server layout.");
assert.match(coreShell, /notices=\{\[\]\}/, "CoreShell must not display local demo notices.");
assert.doesNotMatch(
  coreShell,
  /useStore\(|state\.approvals|state\.notices|NOTICES/,
  "Workspace chrome must not override authoritative server navigation or notification data with demo state.",
);
assert.match(
  appShell,
  /Layanan notifikasi belum diaktifkan/,
  "The notification popover must explain when the real notification service is unavailable.",
);
assert.match(
  pengurusLayout,
  /badge: item\.label === "Persetujuan" && pending !== null && pending > 0/,
  "Pengurus approval badges must continue to be derived from the server-side pending count.",
);


assert.ok(
  appAccess.includes('identity.roleKey === "platform_admin" || identity.roleKey === "organization_admin"'),
  "Studio application visibility must be limited to platform and organization administrators.",
);
assert.ok(
  appShellSource.includes("const availableApps = APPS.filter((candidate) => canAccessApp(identity, candidate.key));"),
  "The application switcher must filter links using resolved identity permissions.",
);
assert.ok(launcherPage.includes("getV9Sql()"), "The launcher must read operational data from Neon.");
assert.ok(
  [
    "@/data/operations",
    "@/data/organization",
    "@/data/finance",
    "@/data/content",
    "APPROVALS",
    "TASKS",
    "ACTIVITIES",
    "PROGRAMS",
    "MEMBERS",
    "JOURNALS",
    "Notifikasi baru",
    "70%",
  ].every((marker) => !launcherPage.includes(marker)),
  "The launcher must not present static demo records or invented operational metrics.",
);


const searchIndex = read("src/lib/search.ts");
const searchPage = read("src/app/app/(launcher)/cari/page.tsx");
const searchDialog = read("src/components/search-dialog.tsx");
const memberShell = read("src/components/member-shell.tsx");
const fieldShell = read("src/components/field-shell-chrome.tsx");

assert.ok(
  !["@/data/organization", "@/data/operations", "@/data/finance", "@/data/content"].some((marker) => searchIndex.includes(marker)),
  "Global search must not index seeded operational records.",
);
assert.ok(
  !["@/data/organization", "@/data/operations", "@/data/finance", "@/data/content"].some((marker) => searchPage.includes(marker)),
  "The full search page must not render seeded operational records.",
);
assert.ok(
  searchPage.includes("SEARCH_PLACES") && searchPage.includes("canAccessAppHref"),
  "The full search page must filter destinations to permitted applications.",
);
assert.ok(
  searchDialog.includes("canAccessAppHref(identity, hit.href)") &&
  searchDialog.includes("canAccessApp(identity, app.key)"),
  "The topbar search must filter both destinations and application results by identity permissions.",
);
assert.ok(
  memberShell.includes("<SearchProvider identity={identity}>") &&
  fieldShell.includes("<SearchProvider identity={identity}>") &&
  coreShell.includes("<SearchProvider identity={identity}>"),
  "Each workspace search provider must receive the authenticated identity.",
);


const skPage = read("src/app/app/(area)/sekretariat/sk/page.tsx");
assert.ok(
  !["@/data/organization", "@/data/operations", "@/data/finance", "@/data/content"].some((marker) => skPage.includes(marker)),
  "The Secretariat SK page must not use seeded document or meeting data.",
);
assert.ok(
  skPage.includes("v9.secretariat_documents") &&
  skPage.includes("v9.field_applications") &&
  skPage.includes("v9.secretariat_meeting_decisions"),
  "The Secretariat SK page must use the organization document, field and meeting decision registers.",
);


const quickLinks = read("src/app/app/(launcher)/cepat/page.tsx");
assert.ok(
  !["@/data/organization", "@/data/operations", "@/data/finance", "@/data/content", "useStore("].some((marker) => quickLinks.includes(marker)),
  "Quick links must not create operational actions from seeded data or browser-local state.",
);
assert.ok(
  quickLinks.includes("v9.field_applications") &&
  quickLinks.includes("field_key") &&
  quickLinks.includes("is_enabled = true") &&
  quickLinks.includes("canAccessApp(identity"),
  "Field quick links must be derived from enabled organization registry rows and current permissions.",
);
assert.ok(
  quickLinks.includes("pembayaran dan settlement belum aktif") &&
  !quickLinks.includes("Pengajuan anggaran") &&
  !quickLinks.includes("Catatan panen") &&
  !quickLinks.includes("Penerimaan kas"),
  "Quick links must describe the POS draft boundary and must not advertise unfinished financial/agriculture actions as live forms.",
);


const sidebarShellSource = read("src/components/app-shell.tsx");
const appAccessSource = read("src/lib/app-access.ts");
assert.ok(
  sidebarShellSource.includes("const visibleNav = nav") &&
  sidebarShellSource.includes("canAccessAppHref(identity, item.href)") &&
  sidebarShellSource.includes("{visibleNav.map((group, gi) => ("),
  "The shared sidebar must filter navigation destinations through application permissions.",
);
assert.ok(
  sidebarShellSource.includes("visibleNav.flatMap((g) => g.items)") &&
  appAccessSource.includes('if (path.startsWith("/app/") && app === "launcher") return false;'),
  "Navigation badges must use the filtered menu and unknown internal paths must be hidden.",
);


assert.ok(
  !coreShell.includes("StoreProvider") && !coreShell.includes("@/lib/store"),
  "The active CoreShell must not mount or import the browser demo store.",
);
const toasterSource = read("src/components/act.tsx");
const toasterStart = toasterSource.indexOf("export function Toaster()");
const toasterEnd = toasterSource.indexOf("/* Demo state chip + reset", toasterStart);
const toasterBody = toasterSource.slice(toasterStart, toasterEnd);
assert.ok(toasterBody.includes("useStoreOptional()") && !toasterBody.includes("useStore()"),
  "Global toast chrome must be safe when no demo StoreProvider is mounted.");
assert.ok(
  !appShell.includes("useStoreOptional") &&
  !appShell.includes("markAllRead") &&
  !appShell.includes("Tandai dibaca"),
  "Workspace notification chrome must not expose browser-local read-state actions.",
);

assert.ok(
  !coreShell.includes("Toaster") && !coreShell.includes("StoreProvider"),
  "The active CoreShell must not mount dormant browser-store or toast demo chrome.",
);
const activeClientSources = [
  "src/app/app/(area)/anggota/dashboard-client.tsx",
  "src/app/app/(area)/anggota/profil/profil-client.tsx",
  "src/app/app/(area)/pengurus/persetujuan/persetujuan-client.tsx",
  "src/app/app/(area)/pengurus/tugas/tugas-client.tsx",
  "src/app/app/(area)/sekretariat/surat/surat-client.tsx",
  "src/app/app/(launcher)/notifikasi/notifikasi-client.tsx",
  "src/components/field-dashboard.tsx",
  "src/components/field-section.tsx",
  "src/components/field-operations-section.tsx",
  "src/components/field-team-section.tsx",
  "src/components/field-agriculture-section.tsx",
  "src/components/field-training-section.tsx",
  "src/components/field-business-section.tsx",
  "src/components/field-business-catalog-section.tsx",
  "src/components/field-business-orders-section.tsx",
];
for (const sourcePath of activeClientSources) {
  const source = read(sourcePath);
  assert.ok(
    !source.includes("useStore(") && !source.includes("localStorage"),
    sourcePath + " must not depend on browser-local operational state.",
  );
}
assert.doesNotMatch(
  read("src/app/app/(area)/pengurus/page.tsx"),
  /dashboard-client/,
  "The active Pengurus dashboard must not mount the legacy browser-store dashboard client.",
);
assert.doesNotMatch(
  read("src/app/app/(area)/sekretariat/page.tsx"),
  /dashboard-client/,
  "The active Secretariat dashboard must not mount the legacy browser-store dashboard client.",
);
assert.doesNotMatch(
  read("src/app/app/(area)/sekretariat/dokumen/page.tsx"),
  /dokumen-client/,
  "The active Secretariat document register must not mount its legacy demo client.",
);


const fieldMapPage = read("src/app/app/(launcher)/bidang/page.tsx");
assert.ok(
  fieldMapPage.includes("getV9Sql()") &&
  fieldMapPage.includes("v9.field_applications") &&
  fieldMapPage.includes("v9.field_programs") &&
  fieldMapPage.includes("v9.field_team_assignments"),
  "The field map must derive field, program and team counts from the organization registry and operational records.",
);
assert.ok(
  fieldMapPage.includes("canAccessApp(identity") &&
  fieldMapPage.includes("canReadRegistry") &&
  !fieldMapPage.includes("@/data/operations") &&
  !fieldMapPage.includes("PROGRAMS"),
  "The field map must not expose seeded programs or fields outside the signed-in scope.",
);


const externalPortal = read("src/app/portal/page.tsx");
const notificationPage = read("src/app/app/(launcher)/notifikasi/page.tsx");
const notificationClient = read("src/app/app/(launcher)/notifikasi/notifikasi-client.tsx");
assert.ok(
  externalPortal.includes("requireRoles") &&
  externalPortal.includes("await requireRoles") &&
  externalPortal.includes("Belum ada dataset berbagi yang diaktifkan") &&
  !externalPortal.includes("@/data/operations") &&
  !externalPortal.includes("@/data/organization") &&
  !externalPortal.includes("Grant data-sharing") &&
  !externalPortal.includes("PROGRAMS"),
  "External portal must not expose seeded grants, programs or documents without a real sharing registry.",
);
assert.ok(
  notificationPage.includes("can(identity") &&
  notificationPage.includes("shortcuts={shortcuts}") &&
  notificationClient.includes("shortcuts.map") &&
  !notificationClient.includes('href="/app/pengurus/persetujuan"') &&
  !notificationClient.includes('href="/app/sekretariat/surat"'),
  "Notification shortcuts must be supplied by the server after permission checks.",
);

assert.ok(
  !fieldShell.includes("Toaster") && !fieldShell.includes("@/components/act"),
  "The active field shell must not mount the dormant browser-store toast component.",
);

const publicDocuments = read("src/app/(public)/dokumen/page.tsx");
const publicActivities = read("src/app/(public)/kegiatan/page.tsx");
const publicProducts = read("src/app/(public)/produk/page.tsx");
const publicPrograms = read("src/app/(public)/program/page.tsx");
const publicNews = read("src/app/(public)/kabar/page.tsx");
assert.ok(
  publicDocuments.includes("document.status = 'final'") &&
  publicDocuments.includes("document.visibility = 'publik'"),
  "Public documents must be final and explicitly marked public.",
);
assert.ok(
  publicActivities.includes("activity.open_to_public = true"),
  "Public activity listings must require an explicit public-visibility flag.",
);
assert.ok(
  publicProducts.includes("product.status = 'active'") &&
  publicProducts.includes("product.publication_status = 'published'"),
  "The public product catalogue must exclude inactive and unpublished products.",
);
assert.ok(
  !publicPrograms.includes("@/data/operations") &&
  !publicNews.includes("@/data/content") &&
  publicPrograms.includes("Belum ada program yang ditandai untuk publikasi") &&
  publicNews.includes("Belum ada kabar yang dipublikasikan"),
  "Public programme and news pages must not display seeded sample content.",
);


const joinForm = read("src/components/join-form.tsx");
const joinAction = read("src/app/actions/forms.ts");
assert.ok(
  joinForm.includes('name="website"') &&
  joinForm.includes('tabIndex={-1}') &&
  joinForm.includes("aria-hidden=\"true\""),
  "The public join form must include a non-focusable honeypot field.",
);
assert.ok(
  joinAction.includes("pg_advisory_xact_lock") &&
  joinAction.includes("interval '15 minutes'") &&
  joinAction.includes("rate_limited") &&
  joinAction.includes("const ratePhone = telepon.replace("),
  "Public join submissions must be throttled per normalized phone number under a transaction-scoped advisory lock.",
);
assert.ok(
  joinAction.includes("'submitted'") &&
  joinAction.includes("v9.membership_interests") &&
  joinAction.includes("v9.outbox_events") &&
  !joinAction.includes("INSERT INTO v9.memberships") &&
  !joinAction.includes("INSERT INTO v9.user_accounts"),
  "The public form may submit an interest and notification event only; it must not activate membership or create login accounts.",
);

process.stdout.write("Core workspace shell contract: PASS\n");
