// Isolated database and real API handlers. No production connection or business fixtures.
import {newDb,DataType} from 'pg-mem';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),mem=newDb();
mem.public.registerFunction({name:'decode',args:[DataType.text,DataType.text],returns:DataType.bytea,implementation:(v,e)=>Buffer.from(v,e)});
mem.public.registerFunction({name:'jsonb_typeof',args:[DataType.jsonb],returns:DataType.text,implementation:v=>Array.isArray(v)?'array':typeof v});
for(const file of ['001_initial.sql','002_roles.sql','003_message_consent.sql','004_enterprise_operations.sql'])mem.public.none(readFileSync('migrations/'+file,'utf8'));
const {Pool}=mem.adapters.createPg(),pool=new Pool();
const compatBuild=await build({entryPoints:['src/lib/sql-compat.ts'],bundle:true,write:false,format:'cjs',platform:'node'}),compat={exports:{}};vm.runInNewContext(compatBuild.outputFiles[0].text,{module:compat,exports:compat.exports});
const translate=compat.exports.postgresStatement;
async function execute(text,args){try{return await pool.query(translate(text).replace(/ FOR UPDATE/g,''),args);}catch(e){console.error(e.message);throw e;}}
function prepare(text,args=[]){return{text,args,bind(...args){return prepare(text,args)},async first(){return(await execute(text,args)).rows[0]||null},async all(){return{results:(await execute(text,args)).rows}},async run(){return{meta:{changes:(await execute(text,args)).rowCount}}}};}
let fail=false;
const DB={prepare,async batch(statements){const backup=mem.backup();try{const results=[];for(const s of statements){if(fail&&s.text.startsWith('INSERT INTO operational_events')){fail=false;throw Error('Simulated event commit failure');}results.push(await execute(s.text,s.args));}return results;}catch(e){backup.restore();throw e;}}};
const owner=randomUUID(),account=randomUUID(),otherOwner=randomUUID(),now=new Date().toISOString();
for(const id of [owner,account,otherOwner])await pool.query('INSERT INTO users(id,email,password_hash,full_name,created,workspace_owner,role) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,id+'@example.test','NOT-A-LOGIN','Isolated fixture',now,id===account?owner:id,id===account?'anggota':'admin']);
const principal=(role,id=account,workspace=owner)=>({accountId:id,userId:workspace,displayName:'Isolated '+role,fullName:'Isolated fixture',email:id+'@example.test',role,memberId:null,position:'',programIds:[]});
let user=principal('anggota');
const files={async get(key){const r=await prepare('SELECT content FROM file_objects WHERE key=?').bind(key).first();return r?{body:new Uint8Array(r.content)}:null}};
async function load(entry){const out=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'isolation',setup(b){b.onLoad({filter:/\/lib\/runtime\.ts$/},()=>({contents:'export const env=globalThis.testEnv;',loader:'ts'}));b.onLoad({filter:/\/lib\/auth\.ts$/},()=>({contents:'export const getAuthenticatedUser=async()=>globalThis.getUser();export const digest=async()=>"isolated";',loader:'ts'}));}}]});const module={exports:{}};vm.runInNewContext(out.outputFiles[0].text,{module,exports:module.exports,getUser:()=>user,testEnv:{DB,BUCKET:files},require,process:{env:{APP_URL:'https://test.local'}},crypto,Response,Request,Headers,URL,Buffer,TextEncoder,TextDecoder,Uint8Array,File,console});return module.exports;}
const route=await load('src/app/api/operations/route.ts'),proof=await load('src/app/api/operations/proof/route.ts'),domain=await load('src/lib/enterprise/operations.ts');
const req=(method,data,path='/api/operations',origin='https://test.local')=>new Request('https://test.local'+path,{method,headers:{origin,'content-type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
const input={category:'administration',title:'Isolated letter request',description:'Administration document for isolated testing',desired_date:'2026-11-05',amount:0,quantity:0,fund:'Organisasi',asset_id:null,end_date:''};
let current;
async function create(data=input,submit=false,id=randomUUID()){const r=await route.POST(req('POST',{accountId:user.accountId,clientRequestId:id,data,submit}));assert.equal(r.status,200,await r.clone().text());return(await r.json()).item;}
async function action(action,extra={}){const r=await route.PATCH(req('PATCH',{accountId:user.accountId,id:current.id,version:current.version,action,note:'Isolated action note',...extra}));if(r.ok)current=(await r.clone().json()).item;return r;}
user=null;assert.equal((await route.GET(req('GET'))).status,401);assert.equal((await proof.GET(req('GET',null,'/api/operations/proof?id=missing'))).status,401);user=principal('anggota');
assert.equal((await route.POST(req('POST',{},'/api/operations','https://evil.test'))).status,403);
assert.equal((await route.POST(req('POST',{accountId:owner}))).status,409);
for(const data of [{...input,category:'__proto__'},{...input,desired_date:'2026-02-30'},{...input,category:'purchase',amount:-1},{...input,category:'asset_loan',quantity:1.5}])assert.throws(()=>domain.validateOperation(data,true));
assert.equal((await route.POST(req('POST',{accountId:account,clientRequestId:randomUUID(),data:{...input,title:''}}))).status,400,'Human validation error');
current=await create();const draftId=current.id;assert.equal(current.status,'draft');assert.equal((await create(input,false,current.id)).id,current.id,'Creation idempotence');assert.equal((await pool.query('SELECT * FROM operational_events WHERE request_id=$1',[current.id])).rows.length,1);
user=principal('admin',owner);assert.equal((await route.GET(req('GET',null,'/api/operations?id='+draftId))).status,404,'Other user draft is private');assert.equal((await route.GET(req('GET',null,'/api/operations?scope=all'))).status,200);
user=principal('anggota');assert.equal((await action('approve')).status,403);assert.equal((await action('submit')).status,200);assert.equal(current.status,'submitted');const stale=current.version;
user=principal('admin',owner);assert.equal((await action('request_revision')).status,403,'System developer cannot make organizational approval decisions');user=principal('ketua',owner);assert.equal((await action('request_revision')).status,200);user=principal('anggota');assert.equal((await action('edit',{data:{...input,title:'Revised isolated request'},submit:true})).status,200);
user=principal('ketua',owner);assert.equal((await action('approve',{version:stale})).status,409);assert.equal((await action('approve')).status,200);assert.equal(current.status,'approved');assert.equal((await action('fulfill')).status,403,'Chair cannot fulfill admin service');
user=principal('sekretaris',account);assert.equal((await action('fulfill')).status,403,'Requester cannot fulfill own request');user=principal('sekretaris',owner);assert.equal((await action('fulfill')).status,200);assert.equal(current.status,'completed');assert.equal((await action('cancel')).status,403);
user=principal('admin',otherOwner,otherOwner);assert.equal((await route.GET(req('GET',null,'/api/operations?id='+current.id))).status,404);
user=principal('anggota');current=await create();const version=current.version;fail=true;assert.equal((await action('submit')).status,503);assert.equal((await pool.query('SELECT version,status FROM operational_requests WHERE id=$1',[current.id])).rows[0].version,version,'Audit failure rolls back status');
assert.equal((await route.GET(req('GET',null,'/api/operations?scope=review'))).status,403);assert.equal((await route.GET(req('GET',null,'/api/operations?scope=fulfill'))).status,403);
current=await create({...input,category:'expense',amount:50000});assert.equal((await action('submit')).status,400,'Expense proof required');
const form=new FormData();form.append('id',current.id);form.append('accountId',account);form.append('version',String(current.version));form.append('file',new File([Buffer.from('%PDF-1.4\nIsolated proof')],'proof.pdf',{type:'application/pdf'}));
const uploaded=await proof.POST(new Request('https://test.local/api/operations/proof',{method:'POST',headers:{origin:'https://test.local'},body:form}));assert.equal(uploaded.status,200,await uploaded.clone().text());current=(await uploaded.json()).item;
assert.equal((await proof.GET(req('GET',null,'/api/operations/proof?id='+current.id))).status,200);user=principal('admin',owner);assert.equal((await proof.GET(req('GET',null,'/api/operations/proof?id='+current.id))).status,404,'Draft proof private');user=principal('anggota');assert.equal((await action('submit')).status,200);
for(const role of ['admin','ketua','sekretaris','bendahara','koordinator','anggota']){const p=principal(role);assert(!domain.operationActions(p,{...current,status:'submitted'}).includes('approve'),'No self approval '+role);assert(!domain.operationActions(p,{...current,status:'approved'}).includes('fulfill'),'No self fulfillment '+role);}
const events=(await pool.query('SELECT version FROM operational_events WHERE request_id=$1 ORDER BY version',[current.id])).rows;assert.deepEqual(events.map(e=>e.version),[1,2,3]);
console.log('PASS enterprise real handlers: authentication, origin/account guard, draft/proof privacy, workspace isolation, six-role self-approval restriction, state transitions, stale version, idempotent creation, required expense proof, transactional audit rollback. Asset/cash native SQL verified separately on isolated Neon.');
