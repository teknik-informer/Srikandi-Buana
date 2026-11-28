import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const db = read("../src/lib/db.ts");
const auth = read("../src/app/actions/auth.ts");
const interest = read("../src/app/actions/forms.ts");
const share = read("../src/app/api/files/share/[token]/route.ts");
const probe = read("../src/app/api/studio/diagnostics/database/route.ts");
const migration = read("../db/migrations/0044_tenant_row_level_security.sql");

assert.match(db, /target\.transaction\(\[contextQuery, query\]\)/, "Every tagged query must share a transaction with its request context.");
assert.match(db, /set_config\('v9\.session_token_hash',[\s\S]*?, true\)/, "Session context must use transaction-local set_config.");
assert.match(db, /createHash\("sha256"\)/, "The session token must be hashed in the server runtime.");
assert.match(db, /jar\.get\(SESSION_COOKIE\)/, "The request context must read the existing opaque session cookie.");
assert.doesNotMatch(db, /\b(?:SET|RESET)\s+(?:ROLE|SESSION|search_path)\b/i, "Session-level SET/RESET is not permitted.");
assert.match(db, /getV9AuthenticatedLoginSql/, "Login writes must use the post-password-verification context.");
assert.match(auth, /getV9LoginSql\(loginContext\)/, "Credential lookup must use the isolated login scope.");
assert.match(auth, /getV9AuthenticatedLoginSql\(\{ \.\.\.loginContext, userId: account\.id \}\)/, "Session creation must be bound to the password-verified account.");
assert.match(interest, /getV9PublicInterestSql\(\{ name: rateName, phone: ratePhone \}\)/, "Public membership-interest writes must use their narrow context.");
assert.match(share, /getV9PublicShareSql\(sha256Hex\(token\)\)/, "Public file delivery must be bound to a single hashed share token.");
assert.match(probe, /VERCEL_ENV !== "preview"/, "Runtime database diagnostics must be Preview-only.");
assert.match(probe, /bypasses_rls|rolbypassrls/, "Runtime probe must report RLS bypass capability.");
assert.match(probe, /owns_tenant_tables/, "Runtime probe must report table ownership.");

const expectedTables = [
  "agriculture_cycles","agriculture_harvests","agriculture_plots","agriculture_visits",
  "audit_events","bootstrap_state","business_agreements","business_customers",
  "business_inventory_movements","business_milestones","business_opportunities",
  "business_order_items","business_order_payments","business_orders","business_partners",
  "business_product_stock","business_products","business_warehouses","field_activities",
  "field_applications","field_program_indicators","field_programs","field_tasks",
  "field_team_assignments","field_workplans","file_assets","file_share_links",
  "finance_accounts","finance_budget_lines","finance_budgets","finance_cash_accounts",
  "finance_contribution_allocations","finance_journal_lines","finance_journals",
  "finance_periods","login_rate_limits","member_community_replies",
  "member_community_reports","member_community_topics","membership_interests",
  "memberships","organization_units","organizations","outbox_events","people",
  "person_interests","role_assignments","schema_migrations","secretariat_document_files",
  "secretariat_document_generations","secretariat_documents","secretariat_letters",
  "secretariat_meeting_attendance","secretariat_meeting_decisions","secretariat_meetings",
  "secretariat_minutes","sessions","system_settings","training_assessments",
  "training_certificates","training_enrollments","training_sessions","user_accounts",
];
const tableList = migration.match(/FOREACH v_table IN ARRAY ARRAY\[([\s\S]*?)\] LOOP/);
assert.ok(tableList, "Migration must declare an explicit complete table inventory.");
const declaredTables = [...tableList[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
assert.deepEqual(declaredTables, [...expectedTables].sort(), "RLS inventory must contain exactly the audited 63 V9 tables.");
assert.match(migration, /ENABLE ROW LEVEL SECURITY/i, "RLS must be enabled.");
assert.match(migration, /FORCE ROW LEVEL SECURITY/i, "FORCE RLS must be explicitly evaluated and applied.");
assert.match(migration, /CREATE POLICY/i, "RLS policy definitions must be included.");
assert.match(migration, /External viewers have no database access to operational tenant tables/, "External viewer roles must remain deny-by-default until scoped grants exist.");
assert.match(migration, /government_viewer', 'ngo_viewer', 'partner_viewer/, "Government, NGO and partner viewer roles must be denied operational tenant policies.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_organization_id\(\)/, "Public settings and public intake must resolve the tenant through an allowlisted organization ID helper.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_organization\(\)/, "Public organization identity must be returned through a fixed projection.");
assert.match(migration, /id = \(SELECT actor\.organization_id/, "Organization base-table SELECT must be limited to an authenticated current actor or verified login context.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_fields\(\)/, "Public field registry must be exposed via an allowlisted projection.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_products\(/, "Public product data must be projected through a fixed column allow-list.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_activities\(/, "Public activity data must be limited to explicitly open events.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_training_sessions\(/, "Public training data must expose aggregate counts only.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_documents\(/, "Public documents must be listed through a fixed projection.");
assert.match(migration, /CREATE OR REPLACE FUNCTION v9\.get_public_document_file\(/, "Public document download must use a fixed projection.");
assert.match(migration, /get_public_training_sessions\(boolean,integer\)/, "Public training projection execute privilege must be explicitly granted.");

assert.match(migration, /SECURITY DEFINER[\s\S]*SET search_path = pg_catalog, v9/i, "Policy helpers must pin search_path.");
assert.match(migration, /current_setting\('v9\.share_token_hash', true\)/, "Public share access must be token-scoped to the transaction-local hashed token.");
assert.match(migration, /_public_banner_asset/i, "Public banner access must be narrowly scoped.");
assert.match(migration, /_public_interest_context/i, "Public membership submissions must have a dedicated policy context.");
assert.match(migration, /login_page_content', 'public_policies/, "Public login copy and public policy documents must remain readable when explicitly public.");
assert.match(migration, /audit_events_insert_scope/, "Tenant-scoped audit inserts must remain available.");
assert.match(migration, /audit_events_read_scope/, "Audit reads must be restricted to authorized organization leadership.");
assert.match(migration, /file_share_links_public_token_read/, "Anonymous download counter updates need a matching token-scoped SELECT policy.");
assert.match(migration, /member_community_topics_published_read/, "Active members must retain read access to published community topics.");
assert.match(migration, /member_community_replies_published_read/, "Active members must retain read access to published community replies.");
assert.match(migration, /_community_membership_visible/, "Community author membership reads must be scoped to published content.");
assert.match(migration, /_community_person_visible/, "Community author names must be visible only for published content.");
assert.match(migration, /row_value\.source_field_key/, "Field-scoped secretariat document child access must retain the source field key.");
assert.match(migration, /_tenant_row_visible\(organization_id, source_field_key, NULL, created_by/, "Field-scoped secretariat document reads and writes must remain visible to their field.");


console.log("PASS tenant RLS contract: 63-table inventory, transaction-bound context, login/public scopes, preview-only probe.");
