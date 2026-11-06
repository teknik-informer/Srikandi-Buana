import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const get = x => fs.readFileSync(path.join(root,x),'utf8');
const original=get('tests/fixtures/navigation-v11.1.txt');
const current=get('src/lib/navigation-config.ts');
function routes(contents){return [...contents.matchAll(/admin\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],/g)].map(x=>x[1])}
function groups(contents){return [...contents.matchAll(/\{id:'([^']+)',label:'[^']+',description:'[^']+',items:\[/g)].map(x=>x[1])}
test('Seluruh ID rute navigasi v11 tetap stabil',()=>{assert.deepEqual(routes(current).filter(id=>routes(original).includes(id)),routes(original));assert.equal(new Set(routes(current)).size,routes(current).length)});
test('Seluruh grup navigasi v11 tetap tersedia',()=>assert.deepEqual(groups(current).filter(id=>groups(original).includes(id)),groups(original)));
test('Rute sidebar dibentuk dari ID yang sama',()=>assert.ok(current.includes("href:'/dashboard/'+id")));
test('Menu publik tidak berubah ketika standardisasi istilah dashboard',()=>assert.equal(current.slice(current.indexOf('export const publicMenus')),original.slice(original.indexOf('export const publicMenus'))));
