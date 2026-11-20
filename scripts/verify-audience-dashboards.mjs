import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const route = read("src/app/dashboard/[[...section]]/page.tsx");
const navigation = read("src/app/_components/dashboard-navigation.tsx");
const applicationRegistry = read("src/features/platform/application-registry.ts");
const management = read("src/app/_components/enterprise-dashboard-overview.tsx");
const member = read("src/app/_components/member-audience-dashboard.tsx");
const externalRoute = read("src/app/portal-eksternal/page.tsx");
const external = read("src/app/_components/external-audience-dashboard.tsx");
const charts = read("src/app/_components/audience-dashboard-charts.tsx");
const externalPolicy = read("src/lib/external-access-policy.ts");
const externalSummary = read("src/lib/external-agriculture-summary.ts");

assert.match(route, /active === "ringkasan"/, "Default internal dashboard route must branch by audience");
assert.match(route, /admin\.role === "anggota"/, "Member accounts must reach the member dashboard");
assert.match(route, /EnterpriseDashboardOverview/, "Production dashboard overview must remain registered");
assert.match(route, /ApplicationHub/, "Internal users must reach the six-application hub");
assert.match(applicationRegistry, /dashboardId/);
assert.match(applicationRegistry, /featureId/);
assert.match(applicationRegistry, /route: "\/dashboard\/pertanian"/);
assert.equal((applicationRegistry.match(/id: "(?:platform-core|organization|agriculture|business|bi-analytics|public-partnership)"/g) || []).length, 6, "Six app shortcuts must remain available");
assert.match(route, /MemberAudienceDashboard/, "Member dashboard must be registered");
assert.match(navigation, /Dashboard Anggota/, "Member navigation must carry its own dashboard name");
assert.match(navigation, /Dashboard Pengurus/, "Management navigation must carry its own dashboard name");

assert.match(management, /buildEnterpriseMonitoring/, "Application metrics must derive from scoped workspace records");
assert.match(management, /useWorkspaceData/, "Management dashboard must use live workspace data");
assert.match(management, /dashboardMetrics/, "Each application must use its own domain metrics");
assert.match(management, /snapshot.visibleRecords/, "Application overview must show only visible records");
assert.match(management, /buildEnterpriseMonitoring\(rows, files, user\)/, "All application data must be scoped to the signed-in principal");
assert.match(management, /s\.finance/, "Financial metrics must use the permission-scoped finance snapshot");
assert.match(member, /user\.memberId/, "Member dashboard must resolve only the signed-in member profile");
assert.match(member, /Belum terhubung|belum tersedia/i, "Missing member ledger data must be disclosed");
assert.match(member, /\/kabar/, "Member dashboard must link to published announcements");

assert.match(externalRoute, /getAuthenticatedExternalUser/, "External dashboard must require external authentication");
assert.match(externalRoute, /activeExternalGrants/, "External dashboard must only receive active grants");
assert.match(external, /organizationType/, "External dashboard must distinguish government and NGO audiences");
assert.match(external, /Data progres belum terhubung/, "NGO must not be shown invented project progress");
assert.match(external, /Transparansi hibah/, "NGO dashboard must surface grant-finance readiness");
assert.match(externalSummary, /contributing_members/, "External agriculture summaries must preserve contributor privacy thresholds");
assert.match(externalPolicy, /deny-by-default/, "External access must remain deny-by-default");
assert.match(externalPolicy, /personal.*financial.*internal/, "Personal, financial and internal data must remain restricted");

assert.match(charts, /ResponsiveContainer/, "Audience charts must be responsive");
assert.match(charts, /EmptyChart/, "Analytics must show an honest empty state");
assert.match(charts, /CashFlowTrendChart/, "Cash-flow chart must remain a separate series");
assert.doesNotMatch(management + member + external, /fake data|sample dataset|Math\.random\(/i, "Audience dashboards must not use fake operational metrics");

console.log("Audience dashboard architecture checks passed: management, member, government/NGO separation, role-aware data, truthful empty states and external privacy.");
