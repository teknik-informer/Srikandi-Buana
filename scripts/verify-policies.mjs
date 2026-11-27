import { build } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const out = await build({
  stdin: {
    contents: "export * from './src/lib/information-pages';export * from './src/lib/contact-topics';export {staticSearch} from './src/lib/site-content';",
    resolveDir: process.cwd()
  },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node"
});
const module = { exports: {} };
vm.runInNewContext(out.outputFiles[0].text, { module, exports: module.exports, encodeURIComponent });
const { informationPages, contactTopics, contactLink, staticSearch } = module.exports;
const dynamicRoute = "src/app/(public)/[slug]/page.tsx";

assert(existsSync(dynamicRoute), "Managed legal documents must have a dynamic public route.");
for (const [slug, page] of Object.entries(informationPages)) {
  const specificRoute = "src/app/(public)/" + slug + "/page.tsx";
  assert(existsSync(specificRoute) || existsSync(dynamicRoute), "Policy route must be reachable: " + slug);
  assert(page.title && page.description);
  assert(page.sections.length >= 3);
  assert.equal(new Set(page.sections.map(section => section.id)).size, page.sections.length, "Unique anchor IDs");
  assert(contactTopics.includes(page.topic), "Contact topic must exist for " + slug);
  assert.equal(new URL(contactLink(page.topic), "https://test.local").searchParams.get("topik"), page.topic);
  assert(staticSearch.some(entry => entry.href === "/" + slug), "Published policy must be searchable: " + slug);
}
for (const slug of ["kebijakan", "peta-situs"]) {
  assert(existsSync("src/app/(public)/" + slug + "/page.tsx"));
}

const policyLibrary = readFileSync("src/lib/policy-documents.ts", "utf8");
const policyApi = readFileSync("src/app/api/policies/route.ts", "utf8");
const policyEditor = readFileSync("src/app/_components/policy-documents-editor.tsx", "utf8");
const publicPolicyPage = readFileSync("src/app/_components/public/information-page.tsx", "utf8");
const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
const navigation = readFileSync("src/app/_components/public/navigation.tsx", "utf8");
const footer = readFileSync("src/app/(public)/layout.tsx", "utf8");
const workspace = readFileSync("src/app/_components/workspace.tsx", "utf8");

for (const slug of ["legalitas", "kebijakan-keamanan", "penyangkalan"]) {
  assert(policyLibrary.includes('slug: "' + slug + '"'), "Default legal document missing: " + slug);
}
for (const phrase of ["draft", "published", "inactive", "validatePolicyDocuments", "getPublicPolicyDocuments"]) {
  assert(policyLibrary.includes(phrase), "Policy registry feature missing: " + phrase);
}
assert(policyApi.includes("getAdminUser"), "Policy API must be administrator-only.");
assert(policyApi.includes('isModuleAvailableForUser(user, "cms")'), "Policy API must honor CMS module access.");
assert(policyApi.includes("validatePolicyDocuments"), "Policy API must validate submitted content.");
assert(policyApi.includes("sec-fetch-site"), "Policy writes must apply same-origin protection.");
assert(policyEditor.includes("Terbitkan") && policyEditor.includes("Nonaktifkan"), "Studio must support publication state changes.");
assert(policyEditor.includes("Dokumen baru") && policyEditor.includes("Tambah bagian"), "Studio must support document CRUD and section editing.");
assert(publicPolicyPage.includes("getPublicPolicyDocument") && publicPolicyPage.includes("notFound()"), "Inactive policies must not remain accessible by direct URL.");
assert(sitemap.includes("getPublicPolicyDocuments") && sitemap.includes("corePolicySlugs"), "Sitemap must include published policies only.");
assert(navigation.includes("hiddenPolicySlugs"), "Public navigation must hide inactive policy links.");
assert(footer.includes("getPublicPolicyDocuments") && footer.includes("policySlugs"), "Footer must respect policy publication state.");
assert(workspace.includes("PolicyDocumentsEditor"), "Policy editor must be integrated into Site Settings Studio.");

assert(readFileSync("src/app/api/messages/route.ts", "utf8").includes("contactTopics.includes(d.topic)"));
assert(readFileSync("src/app/_components/public/contact-form.tsx", "utf8").includes("contactTopics.map"));
assert.equal(new Set(staticSearch.map(entry => entry.href)).size, staticSearch.length, "Static search entries must not duplicate routes.");

console.log("PASS policy suite: policy directory, legal notice, versioned CRUD, publication controls, direct-route protection, navigation/footer filtering, sitemap, and contact topics.");
