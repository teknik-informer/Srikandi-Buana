// Isolated pg-mem database. This test never connects to a production database.
import {newDb,DataType} from 'pg-mem';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID,createHash} from 'node:crypto';
import {hashPassword} from '../src/lib/password.mjs';
const require=createRequire(import.meta.url),hash=s=>createHash('sha256').update(s).digest('hex');
let failProfileCommit=false;
const mem=newDb();mem.public.registerFunction({name:'decode',args:[DataType.text,DataType.text],returns:DataType.bytea,implementation:(value,encoding)=>Buffer.from(value,encoding)});mem.public.registerFunction({name:'jsonb_typeof',args:[DataType.jsonb],returns:DataType.text,implementation:v=>Array.isArray(v)?'array':typeof v});mem.public.none(readFileSync('migrations/001_initial.sql','utf8'));mem.public.none(readFileSync('migrations/002_roles.sql','utf8'));mem.public.none(readFileSync('migrations/003_message_consent.sql','utf8'));mem.public.none(readFileSync('migrations/004_enterprise_operations.sql','utf8'));
mem.public.none(`
CREATE TABLE ledger_accounts (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), code TEXT NOT NULL,
 name TEXT NOT NULL, category TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 created TEXT NOT NULL, UNIQUE(owner,code), UNIQUE(id,owner)
);
CREATE TABLE ledger_entries (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), actor_id TEXT NOT NULL REFERENCES users(id),
 posted_date TEXT NOT NULL, memo TEXT NOT NULL, reference TEXT NOT NULL, created TEXT NOT NULL,
 UNIQUE(id,owner), UNIQUE(owner,reference)
);
CREATE TABLE ledger_lines (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), entry_id TEXT NOT NULL,
 account_id TEXT NOT NULL, debit BIGINT NOT NULL DEFAULT 0, credit BIGINT NOT NULL DEFAULT 0,
 CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0)),
 FOREIGN KEY(entry_id,owner) REFERENCES ledger_entries(id,owner),
 FOREIGN KEY(account_id,owner) REFERENCES ledger_accounts(id,owner)
);
CREATE TABLE ledger_reversals (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), original_entry_id TEXT NOT NULL,
 reversal_entry_id TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id), created TEXT NOT NULL,
 UNIQUE(owner,original_entry_id), UNIQUE(owner,reversal_entry_id)
);
CREATE TABLE commerce_sales_invoice_receipts (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, invoice_id TEXT NOT NULL, cash_record_id TEXT NOT NULL,
 ledger_entry_id TEXT NOT NULL, amount BIGINT NOT NULL, received_date DATE NOT NULL,
 actor_id TEXT NOT NULL, created TIMESTAMPTZ NOT NULL
);
`);
const {Pool}=mem.adapters.createPg(),pool=new Pool();
const transform=await build({entryPoints:['src/lib/sql-compat.ts'],bundle:true,write:false,format:'cjs',platform:'node'});const compat={exports:{}};vm.runInNewContext(transform.outputFiles[0].text,{module:compat,exports:compat.exports});const translate=compat.exports.postgresStatement;
// pg-mem cannot execute data-modifying CTEs. Only this SQL primitive is emulated;
// the unmodified activation/reset SQL is separately exercised on the isolated Neon branch.
async function execute(text,args){if(failProfileCommit&&text.startsWith('INSERT INTO access_audit')&&args[3]==='Foto profil diperbarui'){failProfileCommit=false;throw Error('Synthetic commit failure');}if(text.startsWith('WITH claimed AS (UPDATE account_invitations')){
 const [now,id,tokenHash,email,time]=args;
 const invitation=(await pool.query('SELECT * FROM account_invitations WHERE id=$1 AND token_hash=$2 AND email=$3 AND consumed_at IS NULL AND revoked_at IS NULL AND expires>$4',[id,tokenHash,email,time])).rows[0];
 if(!invitation)return {rows:[],rowCount:0};
 const member=(await pool.query('SELECT data FROM records WHERE id=$1 AND owner=$2',[invitation.member_id,invitation.owner])).rows[0];const d=member&&JSON.parse(member.data);if(!d||d.status!=='Aktif'||d.verification!=='Terverifikasi')return {rows:[],rowCount:0};
 let rows;if(invitation.purpose==='reset'){rows=(await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2 AND workspace_owner=$3 AND role!='admin' AND enabled=TRUE RETURNING id",[args[5],invitation.target_user_id,invitation.owner])).rows;if(rows.length)await pool.query('DELETE FROM sessions WHERE user_id=$1',[rows[0].id])}else rows=(await pool.query('INSERT INTO users(id,email,password_hash,full_name,created,workspace_owner,role,member_id,position,program_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',[args[5],invitation.email,args[6],invitation.full_name,args[7],invitation.owner,invitation.role,invitation.member_id,invitation.position,invitation.program_ids])).rows;
 await pool.query('UPDATE account_invitations SET consumed_at=$1 WHERE id=$2',[now,id]);return {rows,rowCount:rows.length};
 }return pool.query(translate(text),args)}
function prepare(text,args=[]){return {text,args,bind(...values){return prepare(text,values)},async first(){return (await execute(text,args)).rows[0]||null},async all(){return {results:(await execute(text,args)).rows}},async run(){return {meta:{changes:(await execute(text,args)).rowCount}}}}}
const DB={prepare,async batch(statements){const backup=mem.backup();try{const results=[];for(const s of statements)results.push(await execute(s.text,s.args));return results}catch(e){backup.restore();throw e}}};
const storage=new Map(),BUCKET={async put(k,bytes){storage.set(k,bytes)},async get(k){if(storage.has(k))return {body:new Uint8Array(storage.get(k))};const row=(await pool.query('SELECT content FROM file_objects WHERE key=$1',[k])).rows[0];return row?{body:new Uint8Array(row.content)}:null},async delete(k){storage.delete(k)}};
const cache=new Map();const testEmail='roles-owner-'+randomUUID()+'@example.test';
function jar(){const values=new Map();return {values,options:null,get(k){return values.has(k)?{value:values.get(k)}:undefined},set(k,v,options){values.set(k,v);this.options=options},delete(k){values.delete(k)}}}
async function load(path,cookies){if(!cache.has(path)){const out=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'isolated-db',setup(b){b.onLoad({filter:/\/lib\/runtime\.ts$/},()=>({contents:'export const env=globalThis.testEnv;',loader:'ts'}))}}]});cache.set(path,out.outputFiles[0].text)}const module={exports:{}};vm.runInNewContext(cache.get(path),{module,exports:module.exports,testEnv:{DB,BUCKET},require(name){if(name==='next/headers')return {cookies:async()=>cookies};if(name==='server-only')return {};return require(name)},process:{env:{...process.env,ADMIN_EMAIL:testEmail,APP_URL:'https://test.local',NODE_ENV:'production'}},crypto,Response,Request,Headers,URL,Buffer,TextEncoder,TextDecoder,Uint8Array,File,console});return module.exports}
function req(path,method='GET',data,origin='https://test.local'){return new Request('https://test.local'+path,{method,headers:{origin,'Content-Type':'application/json','x-vercel-forwarded-for':'198.51.100.42'},...(data===undefined?{}:{body:JSON.stringify(data)})})}
const owner=randomUUID(),password='Password-uji-aman-123',now=new Date().toISOString(),ownerJar=jar();
const counterAccountId=randomUUID(),wrongCounterAccountId=randomUUID();
await prepare('INSERT INTO users(id,email,password_hash,full_name,created,workspace_owner,role) VALUES(?,?,?,?,?,?,?)').bind(owner,testEmail,await hashPassword(password),'Synthetic owner',now,owner,'admin').run();
await prepare('INSERT INTO ledger_accounts(id,owner,code,name,category,active,created) VALUES(?,?,?,?,?,?,?)').bind(counterAccountId,owner,'210099','Fixture member savings liability','liability',true,now).run();
await prepare('INSERT INTO ledger_accounts(id,owner,code,name,category,active,created) VALUES(?,?,?,?,?,?,?)').bind(wrongCounterAccountId,owner,'510099','Fixture expense account','expense',true,now).run();
const token=randomUUID();await prepare('INSERT INTO sessions(token_hash,user_id,expires,created) VALUES(?,?,?,?)').bind(hash(token),owner,new Date(Date.now()+3600000).toISOString(),now).run();ownerJar.values.set('__Host-srikandi_session',token);
const accountAdmin=await load('src/app/api/accounts/route.ts',ownerJar),recordsAdmin=await load('src/app/api/records/route.ts',ownerJar),created=[];
const deadlineData={name:'Synthetic deadline fixture',period:'Usulan rapat',dueDate:'2026-12-10',priority:'Tinggi',pic:'Synthetic assignee',status:'Belum dimulai',programId:'9'};
const deadlineResponse=await recordsAdmin.POST(req('/api/records','POST',{kind:'tindaklanjut',data:deadlineData}));assert.equal(deadlineResponse.status,200);const deadlineId=(await deadlineResponse.json()).id;
const deadlineRecord=(await (await recordsAdmin.GET(req('/api/records'))).json()).records.find(r=>r.id===deadlineId);assert.equal(deadlineRecord.data.dueDate,'2026-12-10');assert.equal(deadlineRecord.data.priority,'Tinggi');
assert.equal((await recordsAdmin.POST(req('/api/records','POST',{kind:'tindaklanjut',data:{...deadlineData,dueDate:'2026-02-30'}}))).status,400,'Impossible dates rejected');
assert.equal((await recordsAdmin.POST(req('/api/records','POST',{kind:'tindaklanjut',data:{...deadlineData,priority:'Unknown priority'}}))).status,400,'Unknown priority rejected');
assert.equal((await recordsAdmin.PUT(req('/api/records','PUT',{id:deadlineId,kind:'tindaklanjut',expectedUpdated:'1900-01-01',data:{...deadlineData,status:'Selesai'}}))).status,409,'Stale board writes rejected');
async function member(name,status='Aktif',verification='Terverifikasi'){const id=randomUUID();await prepare('INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,?,?,?,?)').bind(id,owner,'anggota',JSON.stringify({name,dusun:'Synthetic address',status,verification,phone:'081234567890',notes:'PRIVATE-CANARY',potential:'PRIVATE-POTENTIAL',role:'Anggota'}),now,now).run();return id}
async function invite(memberId,role='anggota',extra={}){const email=role+'-'+randomUUID()+'@example.test';const r=await accountAdmin.POST(req('/api/accounts','POST',{action:'invite',memberId,email,role,position:role,programIds:role==='koordinator'?['1']:[],...extra}));return {response:r,data:await r.json(),email}}
async function activate(inv,j=jar(),extra={}){const route=await load('src/app/api/auth/activate/route.ts',j);const t=new URL(inv.data.url).hash.slice('#token='.length);const response=await route.POST(req('/api/auth/activate','POST',{token:t,email:inv.email,password,confirmation:password,...extra}));return {response,j,route,t}}
assert.equal((await accountAdmin.POST(req('/api/accounts','POST',{},'https://evil.test'))).status,403);
const inactive=await member('Unverified','Perlu verifikasi','Perlu verifikasi');assert.equal((await invite(inactive)).response.status,400);
const ordinaryMember=await member('Synthetic member');assert.equal((await invite(ordinaryMember,'admin')).response.status,400);
const inv=await invite(ordinaryMember);assert.equal(inv.response.status,200);assert(!JSON.stringify((await (await accountAdmin.GET()).json())).includes(new URL(inv.data.url).hash.slice(7)),'Raw token not returned by listings');
let a=await activate(inv,jar(),{email:'wrong@example.test'});assert.equal(a.response.status,400);a=await activate(inv,jar(),{confirmation:'mismatch'});assert.equal(a.response.status,400);a=await activate(inv);assert.equal(a.response.status,200,await a.response.text());assert(a.j.options.httpOnly&&a.j.options.secure);assert.equal((await activate(inv)).response.status,400,'Single use');
const memberJar=a.j,memberAuth=await load('src/lib/auth.ts',memberJar),principal=await memberAuth.getAuthenticatedUser();assert.equal(principal.userId,owner);assert.equal(principal.role,'anggota');created.push(principal.accountId);
const privateId=randomUUID();await prepare('INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,?,?,?,?)').bind(privateId,owner,'kas',JSON.stringify({name:'CONFIDENTIAL-FINANCE',amount:100}),now,now).run();
const eventId=randomUUID();await prepare('INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,?,?,?,?)').bind(eventId,owner,'kegiatan',JSON.stringify({name:'Scheduled event',date:'2026-12-01',location:'Test',status:'Direncanakan',notes:'PRIVATE-EVENT',attachmentId:'PRIVATE-FILE',programId:'1'}),now,now).run();
const memberRecords=await load('src/app/api/records/route.ts',memberJar);const data=await (await memberRecords.GET(req('/api/records'))).json();assert.equal(data.records.filter(r=>r.kind==='anggota').length,1);assert(!JSON.stringify(data).includes('PRIVATE-'));assert(!JSON.stringify(data).includes('CONFIDENTIAL-FINANCE'));assert.equal(data.files.length,0);assert.equal(data.audit.length,0);
assert.equal((await memberRecords.POST(req('/api/records','POST',{kind:'program',data:{programId:'1',status:'Rancangan',name:'hijack'}}))).status,403);
for(const endpoint of ['accounts','export','settings','source-document','source-import','messages']){const route=await load('src/app/api/'+endpoint+'/route.ts',memberJar);if(route.GET)assert([401,403].includes((await route.GET(req('/api/'+endpoint))).status),endpoint+' restricted');if(endpoint==='source-import')assert([401,403].includes((await route.POST(req('/api/source-import','POST',{}))).status))}
for(const role of ['ketua','sekretaris','bendahara','koordinator']){const mid=await member('Synthetic '+role),inv=await invite(mid,role);assert.equal(inv.response.status,200);const a=await activate(inv);assert.equal(a.response.status,200);const auth=await load('src/lib/auth.ts',a.j),u=await auth.getAuthenticatedUser();created.push(u.accountId);const records=await load('src/app/api/records/route.ts',a.j);const rd=await (await records.GET(req('/api/records'))).json();assert.equal(rd.records.some(r=>r.id===privateId),['ketua','bendahara'].includes(role));const result=await records.POST(req('/api/records','POST',{kind:'program',data:{name:'Assigned program',programId:role==='sekretaris'?'3':'1',status:'Rancangan',notes:''}}));assert.equal(result.status,['sekretaris','koordinator'].includes(role)?200:403);
 if(role==='koordinator'){assert.equal((await records.POST(req('/api/records','POST',{kind:'program',data:{name:'Forbidden',programId:'2',status:'Rancangan'}}))).status,403);assert.equal((await records.PUT(req('/api/records','PUT',{kind:'kegiatan',id:eventId,data:{name:'Moved out of scope',date:'2026-12-01',location:'Test',programId:'2'}}))).status,403);const activity=await records.POST(req('/api/records','POST',{kind:'kegiatan',data:{name:'Within assignment',date:'2026-12-01',location:'Test',programId:'1',status:'Direncanakan'}}));assert.equal(activity.status,200,await activity.text())}
 if(role==='sekretaris'){const attend=await load('src/app/api/attendance/route.ts',a.j);assert.equal((await attend.PUT(req('/api/attendance','PUT',{eventId,memberIds:[mid],notes:'Fixture attendance'}))).status,200)}
 if(role==='bendahara'){
  const invalidCash=await records.POST(req('/api/records','POST',{kind:'kas',data:{name:'Invalid classification',date:'2026-11-02',type:'Pemasukan',amount:100,fund:'Organisasi',counterAccountId:wrongCounterAccountId,notes:'Synthetic invalid classification'}}));
  assert.equal(invalidCash.status,400,'Receipt cannot be credited to an expense account');
  const cash=await records.POST(req('/api/records','POST',{kind:'kas',data:{name:'Test receipt',date:'2026-11-02',type:'Pemasukan',amount:100,fund:'Organisasi',counterAccountId,notes:'Synthetic approved receipt'}}));
  assert.equal(cash.status,200,await cash.clone().text());
  const cashId=(await cash.json()).id;
  const lines=await prepare('SELECT a.code,a.category,l.debit,l.credit FROM ledger_entries e JOIN ledger_lines l ON l.entry_id=e.id AND l.owner=e.owner JOIN ledger_accounts a ON a.id=l.account_id AND a.owner=e.owner WHERE e.owner=? AND e.reference=? ORDER BY a.code').bind(owner,'KAS-'+cashId).all();
  assert.equal(lines.results.length,2,'One cash record creates exactly two journal lines');
  assert.equal(lines.results.reduce((sum,line)=>sum+Number(line.debit),0),100,'Journal debits balance');
  assert.equal(lines.results.reduce((sum,line)=>sum+Number(line.credit),0),100,'Journal credits balance');
  assert(lines.results.some(line=>line.code==='110001'&&Number(line.debit)===100),'Organisational cash is debited');
  assert(lines.results.some(line=>line.code==='210099'&&line.category==='liability'&&Number(line.credit)===100),'Member savings are credited to a liability, not revenue');
  assert.equal((await records.POST(req('/api/records','POST',{kind:'anggota',data:{name:'Forbidden',dusun:'Test'}}))).status,403)
 }
 const roleProfile=await load('src/app/api/account/route.ts',a.j);const ownName=req('/api/account','PATCH',{action:'profile',displayName:'Synthetic display '+role});ownName.headers.set('x-profile-account',u.accountId);assert.equal((await roleProfile.PATCH(ownName)).status,200,role+' can edit display name');
 const roleAvatar=await load('src/app/api/account/avatar/route.ts',a.j);const rolePhoto=new FormData();rolePhoto.append('file',new File([await require('sharp')({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer()],'photo.png'));assert.equal((await roleAvatar.POST(new Request('https://test.local/api/account/avatar',{method:'POST',headers:{origin:'https://test.local','x-profile-account':u.accountId},body:rolePhoto}))).status,200,role+' can edit own photo');
 // Changes revoke active sessions immediately.
 assert.equal((await accountAdmin.PATCH(req('/api/accounts','PATCH',{userId:u.accountId,role:'anggota',position:'Changed',programIds:[],enabled:true}))).status,200);assert.equal(await auth.getAuthenticatedUser(),null);
}
// Private file access is checked independently of menu visibility.
const fixtureFile=randomUUID();await prepare('INSERT INTO files(id,owner,name,mime,size,created,uploader_id) VALUES(?,?,?,?,?,?,?)').bind(fixtureFile,owner,'private.pdf','application/pdf',10,now,owner).run();storage.set(owner+'/'+fixtureFile,new ArrayBuffer(10));
const memberFiles=await load('src/app/api/files/route.ts',memberJar);assert.equal((await memberFiles.GET(req('/api/files?id='+fixtureFile))).status,404);assert.equal((await memberFiles.PATCH(req('/api/files','PATCH',{id:fixtureFile,name:'renamed.pdf'}))).status,403);assert.equal((await memberFiles.DELETE(req('/api/files?id='+fixtureFile,'DELETE'))).status,403);
const linked=await recordsAdmin.DELETE(req('/api/records?id='+ordinaryMember,'DELETE'));assert.equal(linked.status,409,'Linked member records are retained');
// Actual upload/preview and publication handlers, isolated storage/database only.
const ownerFiles=await load('src/app/api/files/route.ts',ownerJar);
const imageBytes=await require('sharp')({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
function imageRequest(bytes,name='fixture.png',origin='https://test.local'){const form=new FormData();form.append('file',new File([bytes],name,{type:'image/png'}));return new Request('https://test.local/api/files',{method:'POST',headers:{origin},body:form});}
assert.equal((await ownerFiles.POST(imageRequest(imageBytes,'fixture.png','https://evil.test'))).status,403);
assert.equal((await ownerFiles.POST(imageRequest(new Uint8Array([137,80,78,71,13,10,26,10])))).status,400,'A PNG header without a decodable image is rejected');
const uploaded=await ownerFiles.POST(imageRequest(imageBytes));assert.equal(uploaded.status,200);const imageId=(await uploaded.json()).id;
const preview=await ownerFiles.GET(req('/api/files?id='+imageId+'&preview=1'));assert.equal(preview.status,200);assert(preview.headers.get('content-disposition').startsWith('inline'));assert(preview.headers.get('cache-control').includes('no-store'));
const anonymousFiles=await load('src/app/api/files/route.ts',jar());assert.equal((await anonymousFiles.GET(req('/api/files?id='+imageId+'&preview=1'))).status,401);
assert.equal((await memberFiles.GET(req('/api/files?id='+imageId+'&preview=1'))).status,404,'Private preview never expands access');
const photoData={name:'Synthetic group photo',date:'2026-11-04',fileId:imageId,notes:'Synthetic credit',status:'Terbit'};
const deniedPhoto=await recordsAdmin.POST(req('/api/records','POST',{kind:'galeri',data:photoData}));assert.equal(deniedPhoto.status,400);assert.match((await deniedPhoto.json()).error,/izin publikasi/);
assert.equal((await recordsAdmin.POST(req('/api/records','POST',{kind:'galeri',data:{...photoData,status:'Draf'}}))).status,200,'Draft is allowed before publication permission');
assert.equal((await recordsAdmin.POST(req('/api/records','POST',{kind:'galeri',data:{...photoData,publicationPermission:'Dikonfirmasi',altText:'Synthetic plants in garden'}}))).status,200);
console.log('PASS gallery handlers: invalid/cross-origin upload rejected, valid PNG saved privately, authenticated owner preview only, unconfirmed publication rejected, draft and confirmed publication accepted.');
// Self-service display name and avatar: all roles can update only their own preferences.
function ownProfileRequest(request){request.headers.set('x-profile-account',principal.accountId);return request;}
const myProfile=await load('src/app/api/account/route.ts',memberJar);
assert.equal((await myProfile.PATCH(ownProfileRequest(req('/api/account','PATCH',{action:'profile',displayName:'Alias'},'https://evil.test')))).status,403);
for(const displayName of ['', 'x'.repeat(81), 'line\nbreak'])assert.equal((await myProfile.PATCH(ownProfileRequest(req('/api/account','PATCH',{action:'profile',displayName})))).status,400);
const staleProfile=req('/api/account','PATCH',{action:'profile',displayName:'Wrong session'});staleProfile.headers.set('x-profile-account',owner);assert.equal((await myProfile.PATCH(staleProfile)).status,409);
const renamed=await myProfile.PATCH(ownProfileRequest(req('/api/account','PATCH',{action:'profile',displayName:'  Nama   panggilan  ',role:'admin',accountId:owner})));assert.equal(renamed.status,200);assert.equal((await renamed.json()).user.displayName,'Nama panggilan');
const renamedUser=await memberAuth.getAuthenticatedUser();assert.equal(renamedUser.displayName,'Nama panggilan');assert.equal(renamedUser.fullName,'Synthetic member');assert.equal(renamedUser.role,'anggota');assert.equal((await prepare('SELECT full_name FROM users WHERE id=?').bind(owner).first()).full_name,'Synthetic owner');
assert.equal(JSON.parse((await prepare('SELECT data FROM records WHERE id=?').bind(ordinaryMember).first()).data).name,'Synthetic member');
const avatars=await load('src/app/api/account/avatar/route.ts',memberJar),ownerAvatar=await load('src/app/api/account/avatar/route.ts',ownerJar),anonAvatar=await load('src/app/api/account/avatar/route.ts',jar());
function avatarRequest(origin='https://test.local',bytes=imageBytes){const form=new FormData();form.append('file',new File([bytes],'avatar.png',{type:'image/png'}));form.append('accountId',owner);return new Request('https://test.local/api/account/avatar',{method:'POST',headers:{origin,'x-profile-account':principal.accountId},body:form});}
assert.equal((await anonAvatar.POST(avatarRequest())).status,401);assert.equal((await avatars.POST(avatarRequest('https://evil.test'))).status,403);
const staleAvatar=avatarRequest();staleAvatar.headers.set('x-profile-account',owner);assert.equal((await avatars.POST(staleAvatar)).status,409);
const avatarSaved=await avatars.POST(avatarRequest());assert.equal(avatarSaved.status,200,await avatarSaved.clone().text());const firstAvatar=(await avatarSaved.json()).user.avatarUrl;assert(firstAvatar.startsWith('/api/account/avatar?v='));
assert.equal((await anonAvatar.GET()).status,401);assert.equal((await ownerAvatar.GET()).status,404,'An owner does not read another account avatar');
const avatarRead=await avatars.GET();assert.equal(avatarRead.status,200);assert(avatarRead.headers.get('cache-control').includes('no-store'));const savedImage=Buffer.from(await avatarRead.arrayBuffer());const avatarMeta=await require('sharp')(savedImage).metadata();assert.equal(avatarMeta.width,256);assert.equal(avatarMeta.height,256);assert(!avatarMeta.exif);
const beforePhoto=await memberAuth.getAuthenticatedUser();const bluePhoto=await require('sharp')({create:{width:3,height:3,channels:3,background:'blue'}}).png().toBuffer();failProfileCommit=true;assert.equal((await avatars.POST(avatarRequest('https://test.local',bluePhoto))).status,503);assert.equal((await memberAuth.getAuthenticatedUser()).avatarUrl,beforePhoto.avatarUrl,'Failed transaction preserves previous avatar metadata');assert.deepEqual(Buffer.from(await (await avatars.GET()).arrayBuffer()),savedImage,'Failed transaction preserves previous bytes');
assert.equal((await avatars.POST(avatarRequest())).status,200);assert.notEqual((await memberAuth.getAuthenticatedUser()).avatarUrl,firstAvatar);assert.equal((await pool.query('SELECT * FROM file_objects WHERE key=$1',[owner+'/account-avatar/'+principal.accountId])).rows.length,1,'Replacing photo reuses one account object');
assert.equal((await avatars.DELETE(ownProfileRequest(req('/api/account/avatar','DELETE',undefined,'https://evil.test')))).status,403);assert.equal((await avatars.DELETE(ownProfileRequest(req('/api/account/avatar','DELETE')))).status,200);assert.equal((await avatars.GET()).status,404);assert.equal((await memberAuth.getAuthenticatedUser()).displayName,'Nama panggilan');assert.equal((await memberAuth.getAuthenticatedUser()).avatarUrl,'');
const ownerPhoto=new FormData();ownerPhoto.append('file',new File([imageBytes],'owner.png'));assert.equal((await ownerAvatar.POST(new Request('https://test.local/api/account/avatar',{method:'POST',headers:{origin:'https://test.local','x-profile-account':owner},body:ownerPhoto}))).status,200);const ownerName=req('/api/account','PATCH',{action:'profile',displayName:'Owner display'});ownerName.headers.set('x-profile-account',owner);assert.equal((await (await load('src/app/api/account/route.ts',ownerJar)).PATCH(ownerName)).status,200);
console.log('PASS account profile: normalized self-only display name, verified identity and roles preserved, ordinary member avatar allowed, private square PNG, cross-origin/anonymous isolation, atomic rollback, bounded replacement, deletion preserves name.');
// Revocation, expiry, replacement, reset, account disabling and password changes.
await prepare("DELETE FROM rate_limits WHERE key LIKE 'activation:%'").run();
const revokedMid=await member('Revoked fixture'),revoked=await invite(revokedMid);const row=await prepare('SELECT id FROM account_invitations WHERE owner=? AND email=?').bind(owner,revoked.email).first();assert.equal((await accountAdmin.PATCH(req('/api/accounts','PATCH',{action:'revoke',id:row.id}))).status,200);assert.equal((await activate(revoked)).response.status,400);
const expired=await invite(revokedMid);await prepare('UPDATE account_invitations SET expires=? WHERE owner=? AND email=?').bind('2020-01-01',owner,expired.email).run();assert.equal((await activate(expired)).response.status,400);
const replacement=await invite(revokedMid),newer=await invite(revokedMid);assert.equal((await activate(replacement)).response.status,400);assert.equal((await activate(newer)).response.status,200);
const self=await load('src/app/api/account/route.ts',memberJar);assert.equal((await self.PATCH(req('/api/account','PATCH',{action:'password',currentPassword:'wrong',password:'Different-password-123',confirmation:'Different-password-123'}))).status,400);assert.equal((await self.PATCH(req('/api/account','PATCH',{action:'password',currentPassword:password,password:'Different-password-123',confirmation:'Different-password-123'}))).status,200);
const resetResponse=await accountAdmin.POST(req('/api/accounts','POST',{action:'reset',userId:principal.accountId}));assert.equal(resetResponse.status,200);const reset={data:await resetResponse.json(),email:inv.email};assert.equal((await activate(reset)).response.status,200);assert.equal(await memberAuth.getAuthenticatedUser(),null,'Reset revokes old session');assert.equal((await activate(reset)).response.status,400);
const login=await load('src/app/api/auth/login/route.ts',jar());assert.equal((await login.POST(req('/api/auth/login','POST',{email:inv.email,password}))).status,200,'Member email/password login');
assert.equal((await accountAdmin.PATCH(req('/api/accounts','PATCH',{userId:owner,role:'anggota',enabled:false}))).status,403,'Owner cannot be demoted');
assert.equal((await accountAdmin.PATCH(req('/api/accounts','PATCH',{userId:principal.accountId,role:'anggota',enabled:false}))).status,200);assert.equal((await login.POST(req('/api/auth/login','POST',{email:inv.email,password}))).status,401);
// Public service topics, consent receipts, rejection, and administrator visibility.
const publicMessages=await load('src/app/api/messages/route.ts',jar());
const topics=['Informasi kelompok','Keanggotaan','Kemitraan','Dukungan akun','Pengaduan','Koreksi informasi','Permintaan data pribadi','Laporan keamanan','Bantuan aksesibilitas','Lainnya'];
for(let i=0;i<topics.length;i++){const request=req('/api/messages','POST',{name:'Synthetic visitor',contact:'visitor@example.test',topic:topics[i],message:'Synthetic request for '+topics[i],consent:true});request.headers.set('x-vercel-forwarded-for','198.51.100.'+(70+i));const response=await publicMessages.POST(request);assert.equal(response.status,200,await response.text())}
assert.equal((await publicMessages.POST(req('/api/messages','POST',{name:'Synthetic visitor',contact:'visitor@example.test',topic:'Pengaduan',message:'No consent should be rejected',consent:false}))).status,400);
assert.equal((await publicMessages.POST(req('/api/messages','POST',{name:'Synthetic visitor',contact:'visitor@example.test',topic:'Unknown topic',message:'Unknown category rejected',consent:true}))).status,400);
const consentRows=await prepare('SELECT consent_version,consented_at FROM messages').all();assert.equal(consentRows.results.length,topics.length);assert(consentRows.results.every(m=>m.consent_version==='1.1'&&Number.isFinite(Date.parse(m.consented_at))));
console.log('PASS public service topics and persisted consent version/time; missing consent and unknown topics rejected.');
console.log('PASS isolated PostgreSQL handler tests (activation CTE emulated; native SQL checked separately): owner preservation, invite validation, email binding, single-use/expired/revoked/replaced tokens, all six roles, shared organization, member privacy, program scopes, CRUD restrictions, attendance, finance, reset, session revocation, password change and disabled login. No production writes.');
await pool.end();
