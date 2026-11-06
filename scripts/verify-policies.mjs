import {build} from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const out=await build({stdin:{contents:"export * from './src/lib/information-pages';export * from './src/lib/contact-topics';export {staticSearch} from './src/lib/site-content';",resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node'}),m={exports:{}};vm.runInNewContext(out.outputFiles[0].text,{module:m,exports:m.exports,encodeURIComponent});
const {informationPages,contactTopics,contactLink,staticSearch}=m.exports;
for(const [slug,page] of Object.entries(informationPages)){assert(existsSync('src/app/(public)/'+slug+'/page.tsx'));assert(page.title&&page.description);assert(page.sections.length>=3);assert.equal(new Set(page.sections.map(s=>s.id)).size,page.sections.length,'Unique anchor IDs');assert(contactTopics.includes(page.topic));assert.equal(new URL(contactLink(page.topic),'https://test.local').searchParams.get('topik'),page.topic);assert(staticSearch.some(e=>e.href==='/'+slug));}
for(const slug of ['kebijakan','peta-situs'])assert(existsSync('src/app/(public)/'+slug+'/page.tsx'));
const footer=readFileSync('src/app/(public)/layout.tsx','utf8');for(const route of ['kebijakan','privasi','syarat-ketentuan','kebijakan-cookie','pengaduan','bantuan','pengelola','aksesibilitas','peta-situs'])assert(footer.includes('href="/'+route+'"'));
assert(readFileSync('src/app/api/messages/route.ts','utf8').includes('contactTopics.includes(d.topic)'));assert(readFileSync('src/app/_components/public/contact-form.tsx','utf8').includes('contactTopics.map'));
assert.equal(new Set(staticSearch.map(e=>e.href)).size,staticSearch.length,'Search entries must not duplicate routes');
console.log(`PASS policy directory: ${Object.keys(informationPages).length} information pages, hub, sitemap, anchors, footer, search, and ${contactTopics.length} contextual contact topics.`);
