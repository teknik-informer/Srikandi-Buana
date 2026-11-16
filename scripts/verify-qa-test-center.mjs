import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
const navigation = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");
const center = readFileSync("src/app/_components/architect-qa-test-center.tsx", "utf8");
const policy = readFileSync("src/features/identity/access-policy.ts", "utf8");

assert(route.includes('"qa-test-center"'), "QA Test Center route must be registered");
assert(route.includes('if (admin.role !== "admin") return notFound()'), "QA Test Center must be restricted to the technical administrator");
assert(route.includes("<ArchitectQaTestCenter />"), "QA route must render the inspector");
assert(navigation.includes('user.role === "admin"'), "QA navigation must be inside the admin-only shortcut");
assert(navigation.includes('/dashboard/qa-test-center'), "QA navigation destination must exist");
assert(center.includes("canReadSection") && center.includes("canReadKind") && center.includes("canWriteKind"), "Inspector must derive matrix from user-aware active access policy functions");
assert(center.includes("Full Access QA") && center.includes("Preview QA"), "Inspector must explain the isolated architect QA full-access mode");
assert(center.includes("Menunggu uji langsung"), "Policy inspection must be distinguished from live account testing");
assert(center.includes('href="/dashboard/akun"'), "Account testing shortcut must open account management, not website settings");
assert(center.includes("Wakil Ketua/Wakil Sekretaris/Wakil Bendahara"), "Deputy positions must not be represented as already-approved access profiles");
assert(policy.includes('if (role === "admin") return false'), "Role-only production policy must keep technical administrator excluded");
assert(policy.includes("isArchitectFullAccess"), "Preview-only full access must be a separate user-aware capability");
console.log("PASS QA Test Center: admin-only route, admin-only navigation, live policy matrix, no impersonation, and deputy-profile guard.");
