import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const model = read("src/lib/public-policies.ts");
const action = read("src/app/actions/public-policies.ts");
const editor = read("src/components/studio/public-policies-editor.tsx");
const studio = read("src/app/studio/website/page.tsx");
const listing = read("src/app/(public)/kebijakan/page.tsx");
const detail = read("src/app/(public)/kebijakan/[slug]/page.tsx");
const layout = read("src/app/(public)/layout.tsx");
const footer = read("src/components/public-shell.tsx");

for (const slug of [
  "legalitas-identitas", "syarat-ketentuan", "privasi", "cookie",
  "keamanan-informasi", "hak-data-pribadi", "publikasi",
  "pengaduan", "penyangkalan", "aksesibilitas", "bantuan",
]) {
  assert.ok(model.includes('"'+slug+'"'), "Default policy missing: "+slug);
}
assert.ok(model.includes('status: "draft"'), "Legal identity must remain draft until registration details are verified.");
assert.ok(action.includes('requireRoles(["platform_admin", "organization_admin"])'), "Only authorized administrators may edit public policies.");
assert.ok(action.includes("'public_policies.settings.updated'") && action.includes("before_state") && action.includes("after_state"), "Policy updates must be audited with before/after state.");
assert.ok(editor.includes('name="policies_json"') && editor.includes("Simpan dokumen kebijakan"), "Studio policy CRUD must submit persistent settings.");
assert.ok(studio.includes("<PublicPoliciesEditor"), "Website Studio must expose the policy editor.");
assert.ok(listing.includes('document.status === "published"') && listing.includes("settings.enabled"), "Public listing must honor publication and global feature status.");
assert.ok(detail.includes('item.status === "published"') && detail.includes("notFound()"), "Unpublished policy detail routes must remain private.");
assert.ok(layout.includes("getPublicPolicySettings") && layout.includes("policiesEnabled={policies.enabled}"), "Public layout must pass the global policy switch to the footer.");
assert.ok(footer.includes('href="/kebijakan"') && footer.includes("policiesEnabled"), "Footer link must follow the publication switch.");
console.log("Public policy CRUD, publication, access, and audit contracts passed.");
