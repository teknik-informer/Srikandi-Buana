import {build} from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out=await build({entryPoints:['src/lib/seo.ts'],bundle:true,platform:'node',format:'cjs',write:false}),m={exports:{}};vm.runInNewContext(out.outputFiles[0].text,{module:m,exports:m.exports,URL,process:{env:{APP_URL:'https://srikandibuana.vercel.app'}}});const {publicPages,pageMetadata,structuredJson}=m.exports;
for(const [path,p] of Object.entries(publicPages)){assert(existsSync('src/app/(public)'+(path==='/'?'':path)+'/page.tsx'));const meta=pageMetadata(path);assert(meta.title&&meta.description);assert.equal(meta.alternates.canonical,'https://srikandibuana.vercel.app'+path);assert.equal(meta.openGraph.url,meta.alternates.canonical);assert.equal(meta.openGraph.title,meta.title);assert.equal(meta.twitter.title,meta.title);assert(meta.robots.index);assert(meta.openGraph.images.length)}
assert.equal(new Set(Object.keys(publicPages).map(p=>pageMetadata(p).title)).size,Object.keys(publicPages).length);
assert(!structuredJson({'headline':'</script><script>alert(1)</script>'}).includes('<'));
assert.equal(pageMetadata('/cari','Search','Description',{noindex:true}).robots.index,false);
const root=readFileSync('src/app/layout.tsx','utf8');assert(root.includes('apple-touch-icon'));assert(root.includes('favicon.ico?v=10.5'));assert(root.includes('lang="id"'));
for(const file of ['src/app/_components/public/navigation.tsx','src/app/_components/dashboard-navigation.tsx','src/app/masuk/page.tsx','src/app/aktivasi/page.tsx','src/app/aktivasi-admin/page.tsx','src/app/(public)/layout.tsx'])assert(readFileSync(file,'utf8').includes('<BrandLogo'),file+' uses supplied identity');
const logo=readFileSync('public/brand/wordmark.png');assert(logo.length>1000);
for(const resource of ['src/app/(public)/program/[id]/page.tsx','src/app/(public)/kabar/[id]/page.tsx']){const s=readFileSync(resource,'utf8');assert(s.includes('pageMetadata('));assert(s.includes('<PageSchema'))}
assert(readFileSync('src/app/(public)/kabar/[id]/page.tsx','utf8').includes('"@type":"Article"'));
assert(readFileSync('next.config.ts','utf8').includes('X-Robots-Tag'));
console.log(`PASS SEO: ${Object.keys(publicPages).length} unique public metadata/canonicals, social cards, dynamic detail metadata, structured-data escaping, private noindex, supplied logo and branding surfaces.`);
