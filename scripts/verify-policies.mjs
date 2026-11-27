import { build } from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

async function load(source) {
  const out = await build({ stdin: { contents: source, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node' });
  const module = { exports: {} };
  vm.runInNewContext(out.outputFiles[0].text, { module, exports: module.exports, encodeURIComponent });
  return module.exports;
}

const site = await load("export * from './src/lib/information-pages';export * from './src/lib/contact-topics';export {staticSearch} from './src/lib/site-content';");
const { informationPages, contactTopics, contactLink, staticSearch } = site;
for (const [slug, page] of Object.entries(informationPages)) {
  assert(existsSync('src/app/(public)/' + slug + '/page.tsx'), 'Legacy public route exists: ' + slug);
  assert(page.title && page.description);
  assert(page.sections.length >= 3);
  assert.equal(new Set(page.sections.map(section => section.id)).size, page.sections.length, 'Unique anchor IDs');
  assert(contactTopics.includes(page.topic));
  assert.equal(new URL(contactLink(page.topic), 'https://test.local').searchParams.get('topik'), page.topic);
  assert(staticSearch.some(entry => entry.href === '/' + slug));
}
for (const slug of ['kebijakan', 'peta-situs']) assert(existsSync('src/app/(public)/' + slug + '/page.tsx'));
assert(existsSync('src/app/(public)/kebijakan/[slug]/page.tsx'), 'Dynamic managed policy route exists');

const policies = await load("export * from './src/lib/public-policies';");
const { defaultPublicPolicySettings, validatePublicPolicySettings } = policies;
assert.equal(defaultPublicPolicySettings.enabled, true);
assert.equal(defaultPublicPolicySettings.documents.length, Object.keys(informationPages).length + 1);
assert.equal(defaultPublicPolicySettings.documents.filter(document => document.status === 'published').length, Object.keys(informationPages).length);
const legal = defaultPublicPolicySettings.documents.find(document => document.slug === 'legalitas-identitas-situs');
assert(legal && legal.status === 'draft', 'Unverified legal identity must remain a draft');
assert.equal(new Set(defaultPublicPolicySettings.documents.map(document => document.slug)).size, defaultPublicPolicySettings.documents.length);
assert.deepEqual(
  Array.from(validatePublicPolicySettings(defaultPublicPolicySettings).documents.map(document => document.slug)),
  Array.from(defaultPublicPolicySettings.documents.map(document => document.slug))
);
assert.throws(() => validatePublicPolicySettings({ ...defaultPublicPolicySettings, documents: [...defaultPublicPolicySettings.documents, defaultPublicPolicySettings.documents[0]] }), /Slug dokumen tidak boleh sama/);
assert.throws(() => validatePublicPolicySettings({ ...defaultPublicPolicySettings, documents: [{ ...legal, slug: 'api' }] }), /telah digunakan/);
assert.throws(() => validatePublicPolicySettings({ ...defaultPublicPolicySettings, documents: [{ ...legal, sections: [{ id: 'x', title: 'X', paragraphs: ['Isi'] }] }] }), /ID/);

for (const slug of Object.keys(informationPages)) { const route = readFileSync('src/app/(public)/' + slug + '/page.tsx', 'utf8'); assert(route.includes('generateMetadata') && route.includes('getPublishedPolicy'), 'Metadata follows publish state: ' + slug); }
const footer = readFileSync('src/app/(public)/layout.tsx', 'utf8');
assert(footer.includes('policySettings.enabled'));
assert(footer.includes('href="/kebijakan">Pusat kebijakan & bantuan</Link>'));
assert(!footer.includes('document.status==="published"'), 'Detailed policy links stay in the hub to keep footer compact');
const studio = readFileSync('src/app/_components/workspace.tsx', 'utf8');
assert(studio.includes('PublicPoliciesEditor'));
const api = readFileSync('src/app/api/policies/route.ts', 'utf8');
assert(api.includes('getAdminUser()') && api.includes('readJsonObject') && api.includes('env.DB.batch'));
assert(api.includes('isModuleAvailableForUser(user, "cms")'));
assert.equal(api.split('isModuleAvailableForUser(user, "cms")').length - 1, 2, "GET and PUT both enforce CMS module access");
assert(api.includes("Pengaturan kebijakan belum dapat dimuat"), "Policy database read failures must return a visible service error");
assert(api.includes("Database belum dapat menyimpan perubahan. Coba kembali."), "Policy database write failures must return a service-unavailable error");
assert(api.includes(" }, 503);"), "Storage failures must return HTTP 503");
assert(api.includes("INSERT INTO audit"));
assert(!api.includes('system_settings') && !api.includes('audit_events'));
const reader = readFileSync('src/lib/public-policy-store.ts', 'utf8');
assert(reader.includes("key='public-policies'") && reader.includes("document.status === \"published\""));
const search = readFileSync('src/app/(public)/cari/page.tsx', 'utf8');
const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');
assert(search.includes('policySettings.documents.filter(document=>document.status===\'published\')'));
assert(sitemap.includes('document.status === "published"'));
assert(sitemap.includes('getPublicPolicySettings'));
assert(!sitemap.includes('...policyDocuments.map(document => publicPolicyHref(document.slug))'), "Policy documents must not be listed twice");
assert(sitemap.includes('new Map(entries.map(entry => [entry.url, entry]))'), "Sitemap URLs must be unique");
assert(readFileSync('src/app/_components/public/information-page.tsx', 'utf8').includes('getPublishedPolicy'));

const footerRoutes = ['kebijakan', 'peta-situs'];
for (const route of footerRoutes) assert(footer.includes('href="/' + route + '"') || route === 'peta-situs');
assert(readFileSync('src/app/api/messages/route.ts', 'utf8').includes('contactTopics.includes(d.topic)'));
assert(readFileSync('src/app/_components/public/contact-form.tsx', 'utf8').includes('contactTopics.map'));
assert.equal(new Set(staticSearch.map(entry => entry.href)).size, staticSearch.length, 'Search entries must not duplicate routes');
console.log('PASS policy management: 10 legacy pages, database-driven publication, draft isolation, dynamic routes, URL reservations, section validation, CMS API and audit trail, search, sitemap, and contact topics.');
