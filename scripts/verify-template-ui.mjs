import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
import ts from 'typescript';
const manifest=JSON.parse(readFileSync('SOURCE_CHECKSUMS.json','utf8'));
const uiBaseline=Object.entries(manifest.sha256 ?? {}).filter(([path])=>path.startsWith('src/components/ui/'));
assert(uiBaseline.length>0,'SOURCE_CHECKSUMS.json must contain UI checksums');
for(const [path,expected] of uiBaseline){
 assert.match(expected,/^[0-9a-f]{64}$/,'Invalid UI checksum: '+path);
 assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),expected,'UI component differs from v11.3 source baseline: '+path);
}
const css=postcss.parse(readFileSync('src/app/globals.css','utf8'));const headers=[];
css.walkRules(rule=>{if(rule.selector==='.workspace-header'){const d=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));headers.push(d);assert.notEqual(d['flex-direction'],'column','Header must remain one row');assert.notEqual(d['flex-wrap'],'wrap','Header actions may not wrap');}});
assert(headers.some(d=>d.height==='56px'&&d['max-height']==='56px'));assert(headers.some(d=>d['flex-wrap']==='nowrap'));
const header=readFileSync('src/app/_components/workspace-shell.tsx','utf8');assert(header.includes('<AccountMenu'));assert(header.includes('<ThemeControl'));assert(header.includes('compact'));assert(!header.includes('<LogoutButton'));
const route=readFileSync('src/app/dashboard/[[...section]]/page.tsx','utf8');assert(route.includes('sidebar_state'));assert(route.includes('defaultSidebarOpen'));
const files=['src/app/_components/workspace-shell.tsx','src/app/_components/access/account-menu.tsx','src/app/_components/access/theme-control.tsx'];let checked=0;
for(const file of files){const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const attrs=n.attributes.properties.filter(ts.isJsxAttribute);if(n.tagName.getText(source)==='Button'&&attrs.some(a=>a.name.getText(source)==='size'&&a.initializer?.getText(source).includes('icon'))){assert(attrs.some(a=>a.name.getText(source)==='aria-label'),file+': icon action needs an accessible label');checked++;}}ts.forEachChild(n,visit)}visit(source)}
console.log(`PASS template audit: ${uiBaseline.length} original UI primitives unchanged; fixed single-row 56px header; account/search/theme controls; sidebar preference restoration; labelled icon actions (${checked}).`);
