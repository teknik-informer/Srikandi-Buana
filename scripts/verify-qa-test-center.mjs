import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
const navigation = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");
const center = readFileSync("src/app/_components/architect-qa-test-center.tsx", "utf8");
const policy = readFileSync("src/features/identity/access-policy.ts", "utf8");

assert(route.includes('"qa-test-center"'), "QA Test Center route must be registered");
assert(route.includes('if (admin.role !== "admin" || !isArchitectQaPreview(process.env)) return notFound()'), "QA Test Center must be restricted to the technical administrator on approved Preview deployments");
assert(route.includes("<ArchitectQaTestCenter user={admin} />"), "QA route must render the inspector");
assert(navigation.includes('user.role === "admin" && qaPreviewEnabled'), "QA navigation must be restricted to admin users on approved Preview deployments");
assert(navigation.includes('/dashboard/qa-test-center'), "QA navigation destination must exist");
assert(center.includes("canReadSection") && center.includes("canReadKind") && center.includes("canWriteKind"), "Inspector must derive matrix from user-aware active access policy functions");
assert(center.includes("Administrator Sistem · Full Access") && center.includes("Preview maupun Production"), "Inspector must explain root administrator access across Preview and Production");
assert(center.includes("Laboratorium dan alat QA tetap dibatasi pada Preview yang diizinkan"), "QA-only tools must remain limited to approved Preview deployments");
assert(center.includes("Menunggu uji langsung"), "Policy inspection must be distinguished from live account testing");
assert(center.includes('href="/dashboard/akun"'), "Account testing shortcut must open account management, not website settings");
assert(center.includes("Wakil Ketua/Wakil Sekretaris/Wakil Bendahara"), "Deputy positions must not be represented as already-approved access profiles");
assert(route.includes('qaPreviewEnabled={isArchitectQaPreview(process.env)}'), "Preview-only QA visibility must be passed from the server");
assert(policy.includes('return user.role === "admin"'), "Administrator Sistem must retain full application authority in every deployment environment");
console.log("PASS QA Test Center: admin-only route, admin-only navigation, live policy matrix, no impersonation, and deputy-profile guard.");
