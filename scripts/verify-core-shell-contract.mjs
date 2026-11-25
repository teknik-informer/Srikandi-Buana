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

process.stdout.write("Core workspace shell contract: PASS\n");
