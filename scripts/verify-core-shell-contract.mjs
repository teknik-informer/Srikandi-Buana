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
const sessionSource = read("src/lib/session.ts");
const studioLayout = read("src/app/studio/layout.tsx");
const studioLandingAccessCheck = read("src/app/studio/page.tsx");

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
const searchApi = read("src/app/api/search/route.ts");
const operationalSearch = read("src/lib/operational-search.ts");
assert.ok(
  searchDialog.includes("canAccessAppHref(identity, hit.href)") &&
  searchDialog.includes("canAccessApp(identity, app.key)") &&
  searchDialog.includes("/api/search?q=") &&
  searchDialog.includes("AbortController"),
  "The topbar search must combine debounced server results with navigation and filter destinations by identity permissions.",
);
assert.ok(
  searchApi.includes("getIdentity()") &&
  searchApi.includes("searchOperationalRecords") &&
  searchApi.includes("Cache-Control") &&
  searchApi.includes("private, no-store"),
  "The operational search API must authenticate requests, use the shared search service, and prevent shared caching of private results.",
);
assert.ok(
  operationalSearch.includes("identity.organizationId") &&
  operationalSearch.includes("can(identity") &&
  [
    "v9.memberships",
    "v9.field_programs",
    "v9.business_products",
    "v9.agriculture_plots",
    "v9.secretariat_documents",
    "v9.finance_journals",
  ].every((table) => operationalSearch.includes(table)) &&
  !operationalSearch.includes("localStorage"),
  "Operational search must query V9 records with organization scope and server-side permission checks, never seeded browser state.",
);
assert.ok(
  operationalSearch.includes("status = 'final'") &&
  operationalSearch.includes("visibility = 'publik'") &&
  operationalSearch.includes('can(identity, "finance:read")'),
  "Operational search must limit external documents to final public records and gate finance rows.",
);
assert.ok(
  searchPage.includes("searchOperationalRecords") &&
  searchPage.includes("recordsUnavailable") &&
  !searchPage.includes("Pencarian rekaman belum diaktifkan"),
  "The full search page must show permission-scoped operational records and a separate unavailable state, not the retired records-disabled notice.",
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
const quickCreatePanel = read("src/app/app/(launcher)/cepat/buat-panel.tsx");
assert.ok(
  quickLinks.includes("<BuatCepatPanel") &&
  quickLinks.includes("can(identity") &&
  quickLinks.includes("field_key") &&
  quickLinks.includes("is_enabled = true"),
  "Quick create options must be derived on the server from enabled organization fields and current identity permissions.",
);
assert.ok(
  !quickCreatePanel.includes("useStore(") &&
  !quickCreatePanel.includes("localStorage") &&
  [
    "submitJoinInterest",
    "createAgriculturePlot",
    "createFieldActivity",
    "registerSecretariatLetter",
    "createFieldProgram",
    "createFieldTask",
  ].every((action) => quickCreatePanel.includes(action)),
  "Quick create forms must use the existing V9 server actions and must not write to the browser demo store.",
);
assert.ok(
  quickCreatePanel.includes("pengajuan minat bergabung") &&
  quickCreatePanel.includes("bukan membuat anggota aktif") &&
  quickCreatePanel.includes('<form action={createFieldActivity}>') &&
  quickCreatePanel.includes('<form action={registerSecretariatLetter}>') &&
  quickCreatePanel.includes('<form action={createFieldProgram}>') &&
  quickCreatePanel.includes('<form action={createFieldTask}>'),
  "Quick create must preserve the membership-interest review boundary and submit agenda, letter, program and task forms through their authoritative server actions.",
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
  externalPortal.includes("Dataset eksternal masih terkunci") &&
  externalPortal.includes("Registri grant berbagi data") &&
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

const memberCommunityResubmissionMigration = read("db/migrations/0032_member_community_author_resubmission.sql");
const topicResubmissionStart = memberCommunityResubmissionMigration.indexOf("CREATE OR REPLACE FUNCTION v9.protect_member_community_topic()");
const replyResubmissionStart = memberCommunityResubmissionMigration.indexOf("CREATE OR REPLACE FUNCTION v9.protect_member_community_reply()");
assert.ok(
  topicResubmissionStart >= 0 &&
  replyResubmissionStart > topicResubmissionStart &&
  memberCommunityResubmissionMigration.includes("OLD.status = 'rejected'") &&
  memberCommunityResubmissionMigration.includes("NEW.status = 'pending'") &&
  memberCommunityActions.includes("member_community_topic.resubmitted") &&
  memberCommunityActions.includes("member_community_reply.resubmitted") &&
  memberCommunityPage.includes("Perbaiki & ajukan ulang") &&
  memberCommunityPage.includes("Kirim ulang untuk moderasi"),
  "Rejected member topics and replies must be editable by their authors and re-enter moderation as pending, never published automatically.",
);

process.stdout.write("Community author resubmission contract: PASS\\n");

const businessOrderActions = read("src/app/actions/business-orders.ts");
const posPaymentPage = read("src/app/app/(area)/pos/page.tsx");
const posPaymentForm = read("src/components/business-order-payment-form.tsx");
const financeReceiptPage = read("src/app/app/(area)/keuangan/penerimaan/page.tsx");
const financePaymentActions = read("src/app/actions/finance.ts");
const paymentReceiptMigration = read("db/migrations/0031_business_order_payment_receipts.sql");
const paymentIdempotencyMigration = read("db/migrations/0032_business_order_payment_idempotency.sql");
const paymentConcurrencyMigration = read("db/migrations/0033_business_order_payment_concurrency_guard.sql");

assert.ok(
  businessOrderActions.includes("export async function recordBusinessOrderPayment") &&
  businessOrderActions.includes("order_row.order_channel = 'pos'") &&
  businessOrderActions.includes("order_row.status = 'fulfilled'") &&
  businessOrderActions.includes("cash_account.status = 'active'") &&
  businessOrderActions.includes("cash_account.currency_code = 'IDR'") &&
  businessOrderActions.includes("paid.paid_total + ${amount} <= order_row.total_amount") &&
  businessOrderActions.includes("'business_order_payment.recorded'") &&
  businessOrderActions.includes("idempotency_key"),
  "POS receipts must be limited to fulfilled cashier orders, active IDR cash registers, order balances and an auditable idempotent insert.",
);

assert.ok(
  posPaymentPage.includes("BusinessOrderPaymentForm") &&
  posPaymentPage.includes("payment_summary.paid_total") &&
  posPaymentPage.includes("recentPayments") &&
  posPaymentPage.includes("linked_journal_reference") &&
  posPaymentPage.includes("Saldo buku besar belum berubah"),
  "The cashier workspace must display recorded receipts, paid totals and outstanding balances without misrepresenting them as posted ledger cash.",
);

assert.ok(
  posPaymentForm.includes("recordBusinessOrderPayment") &&
  posPaymentForm.includes("name=\"idempotency_key\"") &&
  posPaymentForm.includes("name=\"cash_account_id\"") &&
  posPaymentForm.includes("name=\"amount\""),
  "The POS payment form must submit an idempotent cash-register receipt with an amount.",
);

assert.ok(
  financePaymentActions.includes("export async function linkBusinessOrderPaymentJournal") &&
  financePaymentActions.includes('can(identity, "finance:journal:write")') &&
  financePaymentActions.includes("journal.source_type = 'sale'") &&
  financePaymentActions.includes("journal.source_reference = before_row.reference_no") &&
  financePaymentActions.includes("journal.status = 'posted'") &&
  financeReceiptPage.includes("Kuitansi POS belum dibukukan") &&
  financeReceiptPage.includes("journal.total_debit = payment.amount") &&
  financeReceiptPage.includes("line.account_id = cash_account.ledger_account_id"),
  "Only finance journal writers may link a receipt to an exactly matching posted sale journal, and the receipt queue must filter to matching cash-bank journal lines.",
);

assert.ok(
  paymentReceiptMigration.includes("Payment can only be recorded for a fulfilled order.") &&
  paymentReceiptMigration.includes("Total received payment cannot exceed the order total.") &&
  paymentReceiptMigration.includes("Payment must use an active IDR cash, bank or e-wallet register.") &&
  paymentReceiptMigration.includes("Link only a posted sale journal") &&
  paymentReceiptMigration.includes("CREATE TRIGGER business_order_payments_guard") &&
  paymentIdempotencyMigration.includes("business_order_payments_org_idempotency_key") &&
  paymentConcurrencyMigration.includes("pg_advisory_xact_lock") &&
  paymentConcurrencyMigration.includes("business-order-payment:"),
  "Database guards must enforce fulfilled-order receipts, non-overpayment, active IDR registers, exact posted sale linkage, duplicate prevention and per-order concurrency serialization.",
);

process.stdout.write("Business POS payment receipt contract: PASS\\n");

const posReceiptPage = read("src/app/app/(area)/pos/penerimaan/[paymentId]/page.tsx");
const printPageButton = read("src/components/print-page-button.tsx");
assert.ok(
  posReceiptPage.includes("requireIdentity()") &&
  posReceiptPage.includes("payment.organization_id = ${identity.organizationId}") &&
  posReceiptPage.includes("payment.received_by = ${identity.userId}") &&
  posReceiptPage.includes("Kuitansi ini merupakan bukti penerimaan internal") &&
  posReceiptPage.includes("linked_journal_reference") &&
  printPageButton.includes("window.print()") &&
  printPageButton.includes("no-print") &&
  posPaymentPage.includes("/app/pos/penerimaan/${payment.id}") &&
  financeReceiptPage.includes("/app/pos/penerimaan/${payment.id}"),
  "Payment receipts must be organization-scoped, private to the receiving cashier unless authorized, printable, linked from the POS and visible from Finance.",
);

process.stdout.write("Printable POS payment receipt contract: PASS\\n");


const publicShellSource = read("src/components/public-shell.tsx");
const publicLayoutSource = read("src/app/(public)/layout.tsx");
const siteSettingsSchema = read("src/lib/site-settings-schema.ts");
const publicSiteSettingsService = read("src/lib/public-site-settings.ts");
const publicSiteSettingsAction = read("src/app/actions/public-site-settings.ts");
const publicPoliciesAction = read("src/app/actions/public-policies.ts");
const publicSiteSettingsEditor = read("src/components/studio/public-site-settings-editor.tsx");
const websiteStudio = read("src/app/studio/website/page.tsx");
const publicHome = read("src/app/(public)/page.tsx");
const publicHomeHero = read("src/components/public-home-hero.tsx");
const publicHelp = read("src/app/(public)/bantuan/page.tsx");
const publicProductPage = read("src/app/(public)/produk/page.tsx");
const publicProductDetail = read("src/app/(public)/produk/[slug]/page.tsx");
const publicOrderInfo = read("src/app/(public)/produk/pemesanan/page.tsx");

assert.ok(
  publicLayoutSource.includes("getPublicSiteSettings()") &&
  publicLayoutSource.includes("<PublicHeader settings={settings} />") &&
  publicLayoutSource.includes("<PublicFooter settings={settings} policiesEnabled={policies.enabled} />"),
  "Public layout must read one server-side organization site configuration and pass it to header and footer.",
);
assert.ok(
  publicShellSource.includes("settings.navigation.groups") &&
  publicShellSource.includes("settings.footer.groups") &&
  publicShellSource.includes("settings.features.productCatalogue") &&
  publicShellSource.includes("settings.identity.creditName") &&
  !/DEMO_BANNER|Masuk demo|Lingkungan demo|Data contoh berlabel|useSiteSettings|localStorage|FOOTER_MENU/.test(publicShellSource),
  "Public navigation and footer must use organization settings, suppress disabled product links, and contain no legacy demo/browser-local content.",
);
assert.ok(
  !publicShellSource.includes("group.enabled && group.columns.length > 0 && isSitePathEnabled(group.feature.href, settings)") &&
  publicShellSource.includes('isSitePathEnabled(group.feature.href, settings) ? "grid grid-cols-[270px_1fr]" : "grid grid-cols-1"'),
  "A disabled mega-menu feature panel must not hide other menu links in the same enabled group.",
);
assert.ok(
  publicShellSource.includes("<details") &&
  publicShellSource.includes("md:hidden") &&
  publicShellSource.includes("settings.footer.showCopyright"),
  "Mobile footer navigation must use compact collapsible groups and a configurable copyright line.",
);
assert.ok(
  siteSettingsSchema.includes("productCatalogue: false") &&
  siteSettingsSchema.includes("creditLine: \"\"") &&
  siteSettingsSchema.includes("footer-profil") &&
  siteSettingsSchema.includes("function isSitePathEnabled"),
  "Site settings must default public products off, suppress old credit copy, and provide feature-aware navigation defaults.",
);
assert.ok(
  publicSiteSettingsService.includes("v9.system_settings") &&
  publicSiteSettingsService.includes("visibility = 'public'") &&
  publicSiteSettingsService.includes("setting_key IN ('public_site', 'public_profile_content')") &&
  publicSiteSettingsService.includes('row.setting_key === "public_site"') &&
  publicSiteSettingsService.includes('row.setting_key === "public_profile_content"'),
  "Public website settings must be read from the organization-scoped public system-settings record.",
);
const secretaryPermissionBlock = sessionSource.match(/case "secretary":[\s\S]*?(?=case "treasurer":)/)?.[0] ?? "";
const treasurerPermissionBlock = sessionSource.match(/case "treasurer":[\s\S]*?(?=case "field_coordinator":)/)?.[0] ?? "";
assert.ok(
  secretaryPermissionBlock.includes('"cms:publish"') &&
  !treasurerPermissionBlock.includes('"cms:publish"') &&
  publicSiteSettingsAction.includes('requireIdentity("cms:publish")') &&
  publicPoliciesAction.includes('requireIdentity("cms:publish")') &&
  publicSiteSettingsAction.includes("INSERT INTO v9.system_settings") &&
  publicSiteSettingsAction.includes("INSERT INTO v9.audit_events") &&
  publicSiteSettingsAction.includes("public_site.settings.updated"),
  "Website configuration CRUD must require the dedicated CMS publish permission and record before/after changes in the audit log.",
);
assert.ok(
  studioLayout.includes("SECRETARY_STUDIO_NAV") &&
  studioLayout.includes('identity.roleKey === "secretary"') &&
  studioLandingAccessCheck.includes('requireRoles(["platform_admin", "organization_admin"])'),
  "Secretaries may enter the Website Studio only; the general Studio home remains restricted to administrators.",
);
assert.ok(
  publicSiteSettingsEditor.includes("savePublicSiteSettings") &&
  publicSiteSettingsEditor.includes("addGroup") &&
  publicSiteSettingsEditor.includes("deleteGroup") &&
  publicSiteSettingsEditor.includes("addMenuLink") &&
  publicSiteSettingsEditor.includes("deleteMenuLink") &&
  publicSiteSettingsEditor.includes("addFooterGroup") &&
  publicSiteSettingsEditor.includes("deleteFooterGroup") &&
  publicSiteSettingsEditor.includes("addSocial") &&
  publicSiteSettingsEditor.includes("deleteSocial"),
  "Website Studio must expose create, edit and delete controls for navigation, footer and social links.",
);
assert.ok(
  websiteStudio.includes("PublicSiteSettingsEditor") &&
  websiteStudio.includes("getPublicSiteSettings"),
  "Website Studio must load and render the shared settings editor.",
);
assert.ok(
  publicHome.includes("getPublicSiteSettings()") &&
  publicHome.includes("<PublicHomeHero settings={settings} />") &&
  publicHomeHero.includes("hero.description") &&
  publicHome.includes("settings.home.products && settings.features.productCatalogue"),
  "The public home page must render the configurable Hero component and respect product/home section switches.",
);
assert.ok(
  publicHelp.includes("getPublicSiteSettings()") &&
  publicHelp.includes("isSitePathEnabled") &&
  !/lingkungan demonstrasi|akun demo|data sampel|localStorage|BLUEPRINT_VERSION/i.test(publicHelp),
  "The public help page must show the feature-aware site map without obsolete demo, sample-data or browser-migration statements.",
);
assert.ok(
  publicProductPage.includes("if (!siteSettings.features.productCatalogue) notFound()") &&
  publicProductDetail.includes("if (!siteSettings.features.productCatalogue) notFound()") &&
  publicOrderInfo.includes("if (!settings.features.productCatalogue) notFound()"),
  "Turning off public product pages must also close direct listing, detail and order-information routes.",
);
for (const [path, feature] of [
  ["src/app/(public)/program/page.tsx", "programs"],
  ["src/app/(public)/pelatihan/page.tsx", "training"],
  ["src/app/(public)/kegiatan/page.tsx", "activities"],
  ["src/app/(public)/kemitraan/page.tsx", "partnerships"],
  ["src/app/(public)/dokumen/page.tsx", "documents"],
  ["src/app/(public)/gabung/page.tsx", "membershipInterest"],
  ["src/app/(public)/galeri/page.tsx", "gallery"],
  ["src/app/(public)/kabar/page.tsx", "news"],
  ["src/app/(public)/faq/page.tsx", "faq"],
]) {
  const page = read(path);
  assert.ok(
    page.includes("getPublicSiteSettings()") && page.includes("siteSettings.features." + feature),
    path + " must enforce its public feature switch on the server.",
  );
}
const internalProducts = read("src/components/field-business-catalog-section.tsx");
assert.ok(
  internalProducts.includes("v9.business_products") &&
  internalProducts.includes("product-created") &&
  internalProducts.includes("Pembaruan produk") &&
  !internalProducts.includes("productCatalogue"),
  "Disabling the public catalogue must not disable the internal product register and its CRUD lifecycle.",
);
process.stdout.write("Public website settings, feature gates and footer contract: PASS\\n");

const publicContactPage = read("src/app/(public)/kontak/page.tsx");
const externalPortalPage = read("src/app/portal/page.tsx");
const siteNavigationConfig = read("src/config/navigation.ts");
const applicationConfig = read("src/config/apps.ts");
const fieldConfig = read("src/config/fields.ts");
const studioDataPage = read("src/app/studio/data/page.tsx");
const businessSection = read("src/components/field-business-section.tsx");
const businessOrders = read("src/components/field-business-orders-section.tsx");

assert.ok(
  publicContactPage.includes("getPublicSiteSettings()") &&
  publicContactPage.includes("siteSettings.contact.email") &&
  publicContactPage.includes("siteSettings.contact.whatsapp") &&
  !publicContactPage.includes("+62 812-0000-0000"),
  "The public contact page must use configured channels and must not publish blueprint placeholder phone numbers.",
);
assert.ok(
  externalPortalPage.includes("siteSettings.features.externalPortal") &&
  externalPortalPage.includes("requireRoles"),
  "The external portal feature switch must complement, not replace, its server-side role requirement.",
);
assert.ok(
  !/Katalog produk anggota|label: "Katalog"|Katalog, stok/i.test(siteNavigationConfig) &&
  !/Katalog, stok/i.test(applicationConfig) &&
  !/katalog, stok|"Katalog"/i.test(fieldConfig) &&
  !/Katalog & Persediaan/i.test(studioDataPage) &&
  !/katalog/i.test(businessSection) &&
  !/katalog/i.test(businessOrders),
  "Public menus, dashboards and internal business labels must use Produk / Persediaan language rather than legacy Katalog labels.",
);
process.stdout.write("Public contact, portal and product terminology contract: PASS\\n");

const memberNavigationShell = read("src/components/member-shell.tsx");
const memberAreaLayout = read("src/app/app/(area)/anggota/layout.tsx");
const posLayout = read("src/app/app/(area)/pos/layout.tsx");
const posPage = read("src/app/app/(area)/pos/page.tsx");
const businessOrderComposer = read("src/components/business-order-composer.tsx");
const studioHome = read("src/app/studio/page.tsx");
const studioApplications = read("src/app/studio/aplikasi/page.tsx");
const fieldNavigation = read("src/config/field-nav.ts");
const fieldTemplates = read("src/components/studio/field-templates.tsx");
assert.ok(
  memberAreaLayout.includes("getPublicSiteSettings()") &&
  memberAreaLayout.includes("showPublicProducts={settings.features.productCatalogue}") &&
  memberAreaLayout.includes("showPublicActivities={settings.features.activities}") &&
  memberNavigationShell.includes("showPublicProducts") &&
  memberNavigationShell.includes('label: "Produk"') &&
  !memberNavigationShell.includes("Katalog produk"),
  "Member navigation must hide disabled public product/activity links and use neutral product wording.",
);
assert.ok(
  posLayout.includes("Produk & Pesanan") &&
  posPage.includes("Produk Usaha") &&
  posPage.includes("daftar produk") &&
  !/Katalog/i.test(posLayout + posPage) &&
  businessOrderComposer.includes("daftar produk aktif") &&
  !/Katalog/i.test(businessOrderComposer),
  "The cashier/POS surface must use product wording and keep its data-source status explicit.",
);
assert.ok(
  studioHome.includes('status: "Daftar modul"') &&
  studioHome.includes('status: "Daftar dashboard"') &&
  studioApplications.includes("Daftar rute aplikasi inti") &&
  !/Katalog route|daftar demo/i.test(studioApplications) &&
  fieldNavigation.includes('label: "Produk"') &&
  fieldTemplates.includes('modules: ["Produk", "Kasir", "Riwayat", "Sinkronisasi"]'),
  "Studio, field navigation and POS templates must not show legacy catalog labels.",
);
assert.ok(
  siteSettingsSchema.includes('logoUrl: "/brand/wordmark-alpha.png"'),
  "Website settings must use the normal transparent wordmark as the default for the light header.",
);
process.stdout.write("Member, POS and dashboard terminology contract: PASS\\n");
