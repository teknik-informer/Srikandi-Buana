import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const loginPage = read("src/app/masuk/page.tsx");
const loginForm = read("src/app/masuk/login-form.tsx");
const loginCss = read("src/app/masuk/login.css");
const loginApi = read("src/app/api/auth/login/route.ts");
const memberModel = read("src/lib/srikandi.ts");
const memberProfile = read("src/app/_components/member-profile-completion.tsx");
const memberDashboard = read("src/app/_components/member-audience-dashboard.tsx");
const navigation = read("src/app/_components/dashboard-navigation.tsx");
const hub = read("src/app/_components/application-hub.tsx");
const shell = read("src/app/_components/workspace-shell.tsx");

assert.match(loginPage, /<main className="login-shell">/);
assert.match(loginPage, /<section className="login-story"/);
assert.match(loginPage, /<section className="login-panel"/);
assert.match(loginPage, /<LoginForm\s*\/>/);
assert.match(loginPage, /\.\/login\.css/);
assert.match(loginForm, /fetch\("\/api\/auth\/login"/);
assert.match(loginForm, /name="identity"/);
assert.match(loginForm, /name="password"/);
assert.match(loginForm, /name="remember"/);
assert.match(loginCss, /\.login-shell/);
assert.match(loginCss, /\.login-panel/);
assert.match(loginCss, /@media\(max-width:700px\)/);
assert.match(loginApi, /consumeRateLimit/);
assert.match(loginApi, /verifyPassword/);
assert.match(loginApi, /createSession/);
assert.match(loginApi, /Permintaan lintas situs ditolak/);
assert.match(loginApi, /safeReturn/);

const memberDefinition = memberModel.slice(memberModel.indexOf("anggota:{"));
assert.notEqual(memberDefinition, memberModel, "Member module definition must exist");
for (const field of ["name", "dusun", "email", "phone", "status", "verification", "consent"]) {
  assert.ok(memberDefinition.includes('key:"' + field + '"'), "Member field missing: " + field);
}
assert.match(memberDefinition, /Email pribadi/);
assert.match(memberDefinition, /Nomor telepon/);
assert.match(memberDefinition, /Verifikasi data/);
assert.match(memberProfile, /fetch\("\/api\/member\/profile"/);
assert.match(memberProfile, /Email, nomor telepon, status, dan data verifikasi dikelola pengurus/);
assert.match(memberDashboard, /<MemberProfileCompletion profile=\{profile\.data\}/);

assert.match(navigation, /platformApplications/);
assert.match(navigation, /getVisibleEnterpriseDashboardsForUser/);
assert.match(navigation, /navigationMatches/);
assert.match(navigation, /DashboardMegaMenu/);
assert.match(hub, /applicationPresentation/);
assert.match(hub, /platformApplications/);
assert.match(shell, /<Navigation/);
assert.match(shell, /<DashboardMegaMenu/);
assert.match(shell, /className="workspace-header"/);
assert.match(shell, /<AccountMenu/);
assert.match(shell, /<ThemeControl/);

console.log("PASS production baseline guard: login, member identity/profile, application hub, dashboard navigation, workspace shell.");
