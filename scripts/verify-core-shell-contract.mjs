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
  joinAction.includes("const ratePhone = phoneRateKey(telepon);") &&
  joinAction.includes('if (digits.startsWith("62")) return digits;') &&
  joinAction.includes('if (digits.startsWith("0")) return "62" + digits.slice(1);') &&
  joinAction.includes("phone_digits.digits"),
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


assert.ok(
  joinAction.includes("const rateName = nama.toLowerCase();") &&
  joinAction.includes("lower(btrim(existing.applicant_name)) = ${rateName}") &&
  joinAction.includes("|| ':' || ${rateName}, 0"),
  "Duplicate throttling must scope by both applicant name and canonical phone so shared family numbers do not block different applicants.",
);
const privacyPage = read("src/app/(public)/privasi/page.tsx");
assert.ok(
  privacyPage.includes("kombinasi nama serta nomor WhatsApp yang sama dalam 15 menit"),
  "The public privacy notice must disclose the duplicate-submission prevention behavior.",
);

process.stdout.write("Core workspace shell contract: PASS\n");

const financeActions = read("src/app/actions/finance.ts");
const cashBankPage = read("src/app/app/(area)/keuangan/kas-bank/page.tsx");
const financeDashboard = read("src/components/finance-dashboard-section.tsx");
assert.ok(
  financeActions.includes("export async function createFinanceCashAccount") &&
  financeActions.includes("export async function updateFinanceCashAccountStatus") &&
  financeActions.includes('can(identity, "finance:accounts:write")') &&
  financeActions.includes('can(identity, "finance:accounts:approve")') &&
  financeActions.includes("finance_cash_accounts") &&
  financeActions.includes("finance_cash_account.created") &&
  financeActions.includes('currency !== "IDR"'),
  "Finance cash/bank mappings must be organization-scoped, audited, IDR-only, and permission-gated for creation and activation.",
);
assert.ok(
  cashBankPage.includes("createFinanceCashAccount") &&
  cashBankPage.includes("updateFinanceCashAccountStatus") &&
  cashBankPage.includes("v9.finance_cash_accounts") &&
  cashBankPage.includes("journal.status = 'posted'") &&
  cashBankPage.includes("account_number_last4") &&
  cashBankPage.includes("Rekonsiliasi bank belum tersedia"),
  "Cash/bank UI must read the register, derive balances only from posted journals, mask account numbers, and clearly distinguish register from reconciliation.",
);
assert.ok(
  financeDashboard.includes("register Kas/Bank sudah tersedia") &&
  !financeDashboard.includes("Kas/bank, rekonsiliasi"),
  "The finance dashboard must describe the register as implemented without claiming bank reconciliation is available.",
);

process.stdout.write("Finance cash and bank register contract: PASS\n");

const receiptPage = read("src/app/app/(area)/keuangan/penerimaan/page.tsx");
const paymentPage = read("src/app/app/(area)/keuangan/pembayaran/page.tsx");
assert.ok(
  [receiptPage, paymentPage].every((page) =>
    page.includes("v9.finance_cash_accounts") &&
    page.includes("cash_account.ledger_account_id = account.id") &&
    page.includes("cash_account.status IN ('active', 'inactive')") &&
    !page.includes("account.account_code IN ('1-1000', '1-1100')")
  ),
  "Cash receipt and payment reports must use the same active cash/bank register as the Kas & Bank workspace, not hard-coded chart-of-account codes.",
);

const receiptSourceExcludesTransfers =
  receiptPage.includes("counterpart_line.credit > 0") &&
  receiptPage.includes("counterpart_register.ledger_account_id = counterpart_line.account_id");
const paymentSourceExcludesTransfers =
  paymentPage.includes("counterpart_line.debit > 0") &&
  paymentPage.includes("counterpart_register.ledger_account_id = counterpart_line.account_id");
assert.ok(
  receiptSourceExcludesTransfers && paymentSourceExcludesTransfers,
  "Internal cash-to-cash and bank-to-bank transfers must not be double-counted as external receipts or payments.",
);

process.stdout.write("Finance receipt and payment register integration: PASS\\n");

const journalComposer = read("src/components/finance-journal-section.tsx");
const financeWriteActions = read("src/app/actions/finance.ts");
assert.ok(
  journalComposer.includes("cash_account.status <> 'active'") &&
  financeWriteActions.includes("cash_account.status <> 'active'") &&
  (financeWriteActions.split("cash_account.status <> 'active'").length - 1) >= 5 &&
  financeWriteActions.includes("FROM v9.finance_cash_accounts AS cash_account") &&
  financeWriteActions.includes("journal.source_type = 'reversal'") &&
  !financeWriteActions.includes("${inactiveCheck}"),
  "Journal composer and server actions must not allow new journal lines against a draft or inactive cash/bank mapping.",
);
assert.ok(
  [receiptPage, paymentPage].every((page) =>
    page.includes("cash_account.status IN ('active', 'inactive')")
  ),
  "Receipt and payment reports must retain historical postings from inactive registers while excluding draft mappings.",
);

process.stdout.write("Finance register lifecycle integration: PASS\\n");

const cashRegisterJournalGuard = read("db/migrations/0023_finance_cash_bank_journal_guard.sql");
assert.ok(
  cashRegisterJournalGuard.includes("NEW.source_type <> 'reversal'") &&
  cashRegisterJournalGuard.includes("NEW.status IN ('submitted','approved','posted')") &&
  cashRegisterJournalGuard.includes("cash_account.status <> 'active'") &&
  cashRegisterJournalGuard.includes("CREATE TRIGGER finance_journals_guard"),
  "The database must prevent journal workflow transitions while a mapped cash/bank register is inactive, while preserving reversal journals for corrections.",
);

process.stdout.write("Finance cash register database guard contract: PASS\\n");

const financeAccountSection = read("src/components/finance-account-section.tsx");
assert.ok(
  financeWriteActions.includes("NOT EXISTS (") &&
  financeWriteActions.includes("FROM v9.finance_journal_lines AS line") &&
  financeWriteActions.includes("FROM v9.finance_cash_accounts AS cash_account") &&
  financeAccountSection.includes("has_cash_register: boolean") &&
  financeAccountSection.includes("!account.has_cash_register") &&
  financeAccountSection.includes("register kas/bank harus dipertahankan"),
  "A ledger account with journal history or a cash/bank register mapping must not be archived from either the server action or account UI.",
);

process.stdout.write("Finance account archive protection: PASS\\n");

const accountRegisterGuard = read("db/migrations/0024_finance_account_cash_register_archive_guard.sql");
assert.ok(
  accountRegisterGuard.includes("CREATE OR REPLACE FUNCTION v9.protect_finance_account()") &&
  accountRegisterGuard.includes("FROM v9.finance_cash_accounts cash_account") &&
  accountRegisterGuard.includes("ledger_account_id = OLD.id") &&
  !accountRegisterGuard.includes("cash_account.status = 'active'"),
  "The database account guard must preserve every mapped cash/bank ledger account, including inactive mappings.",
);

process.stdout.write("Finance mapped account archive guard: PASS\\n");

const financeBudgetActions = read("src/app/actions/finance.ts");
const financeBudgetPage = read("src/app/app/(area)/keuangan/anggaran/page.tsx");
const financeBudgetComposer = read("src/components/finance-budget-composer.tsx");
const financeJournalComposer = read("src/components/finance-journal-composer.tsx");
const financeJournalSection = read("src/components/finance-journal-section.tsx");
const financeBudgetMigration = read("db/migrations/0025_finance_budget_planning_and_journal_link.sql");

assert.ok(
  [
    "createFinanceBudget",
    "updateDraftFinanceBudget",
    "submitFinanceBudget",
    "reviewFinanceBudget",
    "reopenRejectedFinanceBudget",
    "closeFinanceBudget",
  ].every((name) => financeBudgetActions.includes(`export async function ${name}`)) &&
  financeBudgetActions.includes('can(identity, "finance:budget:write")') &&
  financeBudgetActions.includes('can(identity, "finance:budget:approve")') &&
  financeBudgetActions.includes("finance_budget.created") &&
  financeBudgetActions.includes("finance_budget.closed"),
  "Budget lifecycle actions must be permission-gated and auditable.",
);

assert.ok(
  financeBudgetPage.includes("journal.status = 'posted'") &&
  financeBudgetPage.includes("journal.budget_id = budget.id") &&
  financeBudgetPage.includes("Realisasi diambil hanya dari jurnal yang sudah berstatus terposting") &&
  financeBudgetPage.includes("pending_journal_count"),
  "Budget actuals must derive only from posted journals explicitly linked to the budget, and closure must show pending linked journals.",
);

assert.ok(
  financeBudgetComposer.includes('name="lines_json"') &&
  financeBudgetComposer.includes("Rincian rencana belanja") &&
  financeBudgetComposer.includes("accounts.length") &&
  financeJournalComposer.includes('name="budget_id"') &&
  financeJournalSection.includes("budget.budget_code AS budget_code") &&
  financeJournalSection.includes("budget_id: journal.budget_id"),
  "Budget and journal composers must submit budget linkage and expose linked budget references.",
);

const financeBudgetCloseMigration = read("db/migrations/0026_finance_budget_pending_journal_close_guard.sql");
assert.ok(
  financeBudgetMigration.includes("budget.status = 'approved'") &&
  financeBudgetMigration.includes("budget_line.account_id = line.account_id") &&
  financeBudgetMigration.includes("NEW.budget_id IS DISTINCT FROM OLD.budget_id") &&
  financeBudgetCloseMigration.includes("A budget with unposted linked journals cannot be closed.") &&
  financeBudgetCloseMigration.includes("journal.status <> 'posted'"),
  "Budget linkage and pending-journal closure guards must be enforced by the correct ordered migrations.",
);

process.stdout.write("Finance budget planning and journal integration: PASS\n");

const financeContributionActions = read("src/app/actions/finance.ts");
const financeContributionPage = read("src/app/app/(area)/keuangan/iuran/page.tsx");
const memberContributionPage = read("src/app/app/(area)/anggota/kontribusi/page.tsx");
const financeContributionMigration = read("db/migrations/0027_finance_member_contribution_allocations.sql");
const financeContributionUpdateMigration = read("db/migrations/0028_finance_contribution_allocation_update_guard.sql");

assert.ok(
  financeContributionActions.includes("createFinanceContributionAllocation") &&
  financeContributionActions.includes("updateFinanceContributionAllocation") &&
  financeContributionActions.includes("finance_contribution_allocation.created") &&
  financeContributionActions.includes("finance_contribution_allocation.corrected") &&
  financeContributionActions.includes("before_state") &&
  financeContributionActions.includes("correction_note"),
  "Contribution allocation actions must be permission-gated and audit both creation and corrections.",
);

assert.ok(
  financeContributionPage.includes("journal.source_type = 'contribution'") &&
  financeContributionPage.includes("journal.status = 'posted'") &&
  financeContributionPage.includes("createFinanceContributionAllocation") &&
  financeContributionPage.includes("updateFinanceContributionAllocation") &&
  financeContributionPage.includes("allocation_total") &&
  memberContributionPage.includes("allocation.membership_id = membership.id") &&
  memberContributionPage.includes("account.id = ${identity.userId}") &&
  memberContributionPage.includes("journal.status = 'posted'"),
  "Contribution workspace must allocate only posted journals and member portal must scope entries to the signed-in person's memberships.",
);

assert.ok(
  financeContributionMigration.includes("Only an already-posted contribution journal can be allocated to a member.") &&
  financeContributionMigration.includes("membership.valid_from") &&
  financeContributionMigration.includes("membership.valid_until") &&
  financeContributionMigration.includes("Contribution allocations are retained for audit") &&
  financeContributionMigration.includes("UNIQUE (organization_id, journal_id, membership_id)") &&
  financeContributionUpdateMigration.includes("allocation.id IS DISTINCT FROM CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL::uuid END"),
  "Contribution sub-ledger database guards must validate posted source journals, membership validity, audit retention, uniqueness and safe corrections.",
);

process.stdout.write("Finance member contribution sub-ledger: PASS\\n");

const financeReceivablesPage = read("src/app/app/(area)/keuangan/piutang-utang/page.tsx");
assert.ok(
  financeReceivablesPage.includes("account.account_type = 'kewajiban'") &&
  financeReceivablesPage.includes("account.group_label ILIKE '%piutang%'") &&
  financeReceivablesPage.includes("account.account_name ILIKE '%piutang%'") &&
  financeReceivablesPage.includes("account.group_label ILIKE '%tagihan%'") &&
  financeReceivablesPage.includes("account.is_postable = true") &&
  !financeReceivablesPage.includes("account.account_code IN ('1-1200', '2-1000', '2-1100')"),
  "Receivables and payables must follow the organization's active postable chart categories, not fixed account codes.",
);

process.stdout.write("Finance receivable and payable category contract: PASS\\n");

const memberCommunityActions = read("src/app/actions/member-community.ts");
const memberCommunityPage = read("src/app/app/(area)/anggota/komunitas/page.tsx");
const memberCommunityPermissions = read("src/lib/session.ts");
const memberCommunityMigration = read("db/migrations/0029_member_community_moderated_forum.sql");
const memberCommunitySeparationMigration = read("db/migrations/0030_member_community_moderation_separation.sql");

assert.ok(
  [
    "createMemberCommunityTopic",
    "createMemberCommunityReply",
    "reportMemberCommunityContent",
    "updateOwnCommunityTopic",
    "withdrawOwnCommunityTopic",
    "updateOwnCommunityReply",
    "withdrawOwnCommunityReply",
    "moderateMemberCommunityTopic",
    "moderateMemberCommunityReply",
    "resolveMemberCommunityReport",
  ].every((name) => memberCommunityActions.includes(`export async function ${name}`)) &&
  memberCommunityActions.includes('can(identity, "member:community:moderate")') &&
  memberCommunityActions.includes('requireIdentity("member:self")') &&
  memberCommunityActions.includes("pg_advisory_xact_lock"),
  "Community member actions must enforce active-member access, role-based moderation and per-author rate controls.",
);

assert.ok(
  memberCommunityPage.includes("Antrean moderasi") &&
  memberCommunityPage.includes("Laporkan konten") &&
  memberCommunityPage.includes("Kirim untuk moderasi") &&
  memberCommunityPage.includes("createMemberCommunityReply") &&
  memberCommunityPage.includes("author_user_id !== identity.userId") &&
  memberCommunityPage.includes("updateOwnCommunityTopic") &&
  memberCommunityPermissions.includes('"member:community:moderate"'),
  "The community workspace must provide moderated posting, replies, reporting, own-draft controls and a designated secretary moderator permission.",
);

assert.ok(
  memberCommunityMigration.includes("status IN ('pending','published','rejected','hidden','withdrawn')") &&
  memberCommunityMigration.includes("Only a currently active member may create a community topic.") &&
  memberCommunityMigration.includes("Only an active member may reply to a published community topic.") &&
  memberCommunityMigration.includes("Community reports are retained for moderation and audit") &&
  memberCommunityMigration.includes("CREATE TRIGGER member_community_topics_guard") &&
  memberCommunityMigration.includes("CREATE TRIGGER member_community_reports_guard"),
  "The community database migration must retain records and enforce active membership, publication and report constraints.",
);

assert.ok(
  memberCommunitySeparationMigration.includes("NEW.moderated_by IS DISTINCT FROM OLD.author_user_id") &&
  (memberCommunitySeparationMigration.split("target_author IS NOT DISTINCT FROM NEW.reporter_user_id").length - 1) === 2 &&
  memberCommunitySeparationMigration.includes("NEW.reviewed_by = OLD.reporter_user_id"),
  "Community moderators cannot approve their own content, members cannot self-report, and reporters cannot review their own reports.",
);

process.stdout.write("Moderated member community contract: PASS\\n");

const memberCommunityReplySelfReportGuard = read("db/migrations/0031_member_community_reply_self_report_guard.sql");
const replyReportGuardStart = memberCommunityReplySelfReportGuard.indexOf("ELSE\n      SELECT reply.membership_id");
const replyReportGuardEnd = memberCommunityReplySelfReportGuard.indexOf("END IF;", replyReportGuardStart);
assert.ok(
  replyReportGuardStart >= 0 &&
  replyReportGuardEnd > replyReportGuardStart &&
  memberCommunityReplySelfReportGuard.slice(replyReportGuardStart, replyReportGuardEnd).includes("target_author IS NOT DISTINCT FROM NEW.reporter_user_id") &&
  (memberCommunityReplySelfReportGuard.split("target_author IS NOT DISTINCT FROM NEW.reporter_user_id").length - 1) === 2,
  "Both topic and reply reports must prevent self-reporting by user identity, even if the same person has multiple memberships.",
);

process.stdout.write("Community reply self-report protection: PASS\\n");
