import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const wordmark='public/brand/source/wordmark.png',emblem='public/brand/source/emblem.png',vertical='public/brand/source/vertical.png';
await Promise.all(['public/icons','public/brand','public/social'].map(d=>mkdir(d,{recursive:true})));
// Resize and place supplied artwork without redrawing, recolouring or modifying its content.
await sharp(wordmark).resize({width:1000,withoutEnlargement:true}).webp({quality:94}).toFile('public/brand/wordmark.webp');
await sharp(wordmark).resize({width:1200,withoutEnlargement:true}).png().toFile('public/brand/wordmark.png');
await sharp(vertical).resize({width:700,withoutEnlargement:true}).webp({quality:94}).toFile('public/brand/vertical.webp');
await sharp(emblem).resize(512,512,{fit:'contain'}).png().toFile('public/brand/emblem.png');
async function icon(size,scale=.84,source=emblem){const inner=Math.round(size*scale);const art=await sharp(source).resize(inner,inner,{fit:'contain'}).png().toBuffer();return sharp({create:{width:size,height:size,channels:4,background:'#fffdf7'}}).composite([{input:art,gravity:'centre'}]).png().toBuffer()}
for(const size of [16,32,48,96,192,512])await writeFile(`public/icons/icon-${size}.png`,await icon(size,.92,size>=96?vertical:emblem));
for(const size of [152,167,180])await writeFile(size===180?'public/apple-touch-icon.png':`public/icons/apple-touch-${size}.png`,await icon(size,.94,vertical));
await writeFile('public/icons/maskable-512.png',await icon(512,.64,vertical));
const pngs=await Promise.all([16,32,48].map(s=>icon(s)));const header=Buffer.alloc(6);header.writeUInt16LE(1,2);header.writeUInt16LE(3,4);let offset=54;const entries=pngs.map((p,i)=>{const b=Buffer.alloc(16),s=[16,32,48][i];b[0]=s;b[1]=s;b.writeUInt16LE(1,4);b.writeUInt16LE(32,6);b.writeUInt32LE(p.length,8);b.writeUInt32LE(offset,12);offset+=p.length;return b});await writeFile('public/favicon.ico',Buffer.concat([header,...entries,...pngs]));
const data=(await icon(128)).toString('base64');await writeFile('public/favicon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${data}"/></svg>`);
// Safari pinned tabs use an alpha silhouette of the supplied emblem.
const black=await sharp(emblem).resize(128,128).ensureAlpha().raw().toBuffer();for(let i=0;i<black.length;i+=4){black[i]=0;black[i+1]=0;black[i+2]=0}const mask=await sharp(black,{raw:{width:128,height:128,channels:4}}).png().toBuffer();await writeFile('public/safari-pinned-tab.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${mask.toString('base64')}"/></svg>`);
const logo=await sharp(wordmark).resize(990,355,{fit:'inside'}).png().toBuffer();
const frame=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fffdf7"/><rect y="0" width="1200" height="12" fill="#b88727"/><path d="M78 480H1122" stroke="#d5bf8c"/><text x="600" y="535" text-anchor="middle" fill="#12512f" font-size="24" font-family="DejaVu Sans,sans-serif">KELOMPOK WANITA TANI</text><text x="600" y="579" text-anchor="middle" fill="#726653" font-size="19" font-family="DejaVu Sans,sans-serif">Ngadimulyo · Kedu · Temanggung</text></svg>`);
await sharp(frame).composite([{input:logo,gravity:'north',top:75,left:105}]).png().toFile('public/social/srikandi-buana-1200x630.png');
console.log('Supplied branding integrated: horizontal/vertical logo, emblem icons, Apple Touch, favicon, maskable and social card.');
