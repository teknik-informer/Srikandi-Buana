import { build } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const React = require("react");

// Isolated hook/component logic tests. This is not a browser or visual renderer.
async function harness(entry, globals = {}) {
  const slots = [], dependencies = [], effects = [], setters = [], cleanups = [];
  let cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = { ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      setters[i] ??= (v) => { slots[i] = typeof v === "function" ? v(slots[i]) : v; };
      return [slots[i], setters[i]];
    },
    useRef(initial) {
      const i = cursor++;
      return slots[i] ??= { current: initial };
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!same(dependencies[i], deps)) { slots[i] = fn; dependencies[i] = deps; }
      return slots[i];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(dependencies[i], deps)) {
        effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); dependencies[i] = deps;
      }
    },
  };
  const out = await build({ entryPoints: [entry], bundle: true, write: false, format: "cjs",
    platform: "node", packages: "external", jsx: "automatic", alias: { cn: resolve("src/lib/cn.ts") } });
  const module = { exports: {} };
  const context = { module, exports: module.exports, AbortController, URL, URLSearchParams, console, setTimeout, clearTimeout,
    require: (name) => name === "react" ? hooks : name === "sonner"
      ? { toast: { success() {}, error() {} } } : require(name), ...globals };
  vm.runInNewContext(out.outputFiles[0].text, context);
  return { exports: module.exports, context,
    render(fn) { cursor = 0; return fn(); },
    effects() { for (const fn of effects.splice(0)) fn(); },
  };
}
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const payload = (id) => ({ records: [{ id }], files: [{ id }], audit: [{ id }] });
const calls = [];
const data = await harness("src/hooks/use-workspace-data.ts", { fetch: (_url, options) => {
  const request = deferred(); calls.push({ ...request, signal: options.signal }); return request.promise;
} });
let state = data.render(() => data.exports.useWorkspaceData());
data.effects();
assert.equal(calls.length, 1);
const newer = state.load();
assert(calls[0].signal.aborted);
calls[1].resolve(response(200, payload("new"))); await newer;
calls[0].resolve(response(401, { error: "expired old request" }));
await new Promise((r) => setImmediate(r));
state = data.render(() => data.exports.useWorkspaceData());
assert.equal(state.rows[0].id, "new"); assert.equal(state.unauthorized, false);
const expired = state.load(); calls[2].resolve(response(401, {})); await expired;
state = data.render(() => data.exports.useWorkspaceData());
assert.equal(state.rows.length, 0); assert.equal(state.files.length, 0); assert.equal(state.audit.length, 0);
assert.equal(state.unauthorized, true); assert.match(state.error, /Sesi masuk/);
const retry = state.load(); calls[3].resolve(response(200, payload("restored"))); await retry;
state = data.render(() => data.exports.useWorkspaceData()); assert.equal(state.rows[0].id, "restored");
assert.equal(state.unauthorized, false); assert.equal(state.error, "");
console.log("PASS record loading: aborted late 401 cannot replace a newer result; active 401 clears private data; retry restores state.");

let requests = 0, reloads = 0, mutationRequest = deferred();
const mutation = await harness("src/hooks/use-record-mutation.ts", { fetch: () => { requests++; return mutationRequest.promise; } });
const reload = async () => { reloads++; };
let action = mutation.render(() => mutation.exports.useRecordMutation(reload));
const first = action.mutate("PUT", { name: "kept draft" });
assert.equal(await action.mutate("PUT", {}), false); assert.equal(requests, 1);
mutationRequest.resolve(response(409, { error: "Catatan telah diubah pengguna lain." }));
assert.equal(await first, false);
action = mutation.render(() => mutation.exports.useRecordMutation(reload));
assert.match(action.error, /pengguna lain/); assert.equal(action.busy, false); assert.equal(reloads, 0);
mutationRequest = deferred(); const success = action.mutate("PUT", {});
mutationRequest.resolve(response(200, { ok: true })); assert.equal(await success, true); assert.equal(reloads, 1);
mutationRequest = deferred(); const rejected = action.mutate("DELETE");
mutationRequest.resolve(response(401, {})); assert.equal(await rejected, false); assert.equal(reloads, 2);
action = mutation.render(() => mutation.exports.useRecordMutation(reload)); assert.match(action.error, /Sesi masuk/);
console.log("PASS mutations: double submit blocked, conflict preserved for retry, success reloads, expired session reloads and reports recovery.");

function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const match = find(child, predicate); if (match) return match;
  }
}
let confirm = false, attendanceRequest = deferred(), attendanceCalls = 0, saved = 0;
const form = { dataset: {} };
const attendance = await harness("src/app/_components/attendance.tsx", {
  document: { querySelector: () => form.dataset.unsaved ? form : null }, window: { confirm: () => confirm },
  fetch: () => { attendanceCalls++; return attendanceRequest.promise; },
});
const row = (id, kind, values) => ({ id, kind, data: values, created: "2026-11-03", updated: "2026-11-03" });
let rows = [row("a", "kegiatan", { name: "Kegiatan A" }), row("b", "kegiatan", { name: "Kegiatan B" }),
  row("m", "anggota", { name: "Isolated fixture" }), row("at", "kehadiran", { eventId: "a", notes: "old", memberIds: [] })];
const render = () => attendance.render(() => attendance.exports.default({ rows, onSaved: async () => { saved++; } }));
let tree = render(); attendance.effects();
find(tree, (n) => n.props?.id === "attendance-event").props.onChange({ target: { value: "a" } });
tree = render(); find(tree, (n) => n.type === "form").props.ref.current = form; attendance.effects(); tree = render();
find(tree, (n) => n.props?.id === "attendance-notes").props.onChange({ target: { value: "unsaved draft" } });
assert.equal(form.dataset.unsaved, "true");
rows = rows.map((r) => r.id === "at" ? { ...r, data: { ...r.data, notes: "server update" } } : r);
tree = render(); attendance.effects(); tree = render();
assert.equal(find(tree, (n) => n.props?.id === "attendance-notes").props.value, "unsaved draft");
find(tree, (n) => n.props?.id === "attendance-event").props.onChange({ target: { value: "b" } });
tree = render(); assert.equal(find(tree, (n) => n.props?.id === "attendance-event").props.value, "a");
let submit = find(tree, (n) => n.type === "form").props.onSubmit;
const saving = submit({ preventDefault() {} }); await submit({ preventDefault() {} }); assert.equal(attendanceCalls, 1);
tree = render(); assert.equal(find(tree, (n) => n.props?.id === "attendance-event").props.disabled, true);
attendanceRequest.resolve(response(503, { error: "Coba lagi nanti." })); await saving;
assert.equal(form.dataset.unsaved, "true"); tree = render();
assert.equal(find(tree, (n) => n.props?.id === "attendance-notes").props.value, "unsaved draft");
attendanceRequest = deferred(); submit = find(tree, (n) => n.type === "form").props.onSubmit;
const retrySave = submit({ preventDefault() {} }); attendanceRequest.resolve(response(200, { ok: true })); await retrySave;
assert.equal(form.dataset.unsaved, undefined); assert.equal(saved, 1);
tree = render(); find(tree, (n) => n.props?.children === "Tandai semua").props.onClick();
assert.equal(form.dataset.unsaved, "true"); confirm = true;
tree = render(); find(tree, (n) => n.props?.id === "attendance-event").props.onChange({ target: { value: "b" } });
tree = render(); attendance.effects(); tree = render();
assert.equal(find(tree, (n) => n.props?.id === "attendance-event").props.value, "b");
assert.equal(find(tree, (n) => n.props?.id === "attendance-notes").props.value, "");
console.log("PASS attendance: refresh preserves draft, switching can be cancelled, bulk selection marks dirty, pending save blocks duplicate, failure keeps draft, success clears dirty state.");

// Settings: invalid social links, double submit and request failure keep the editor intact.
const config = await harness('src/lib/settings-config.ts');
const publicSettings = {...config.exports.siteDefaults};
class FormFixture { constructor(){this.dataset={unsaved:'true'};} }
const settingsForm = new FormFixture();
let settingsRequests=0,settingsSaved=0,settingsPut=deferred();
const settings = await harness('src/app/_components/site-settings-editor.tsx', {
 HTMLFormElement:FormFixture, document:{getElementById:()=>settingsForm,querySelector:()=>settingsForm.dataset.unsaved?settingsForm:null}, window:{confirm:()=>false},
 fetch:(_url,options)=>{if(options?.method==='PUT'){settingsRequests++;return settingsPut.promise;}return Promise.resolve(response(200,{settings:publicSettings}));},
});
const settingsRender=()=>settings.render(()=>settings.exports.default({files:[],onSaved:()=>{settingsSaved++;}}));
let settingTree=settingsRender();settings.effects();await new Promise(r=>setImmediate(r));settingTree=settingsRender();
settingsForm.dataset.unsaved='true';
find(settingTree,n=>n.props?.id==='setting-facebookUrl').props.onChange({target:{value:'https://invalid.example/profile'}});
settingTree=settingsRender();await find(settingTree,n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:settingsForm});
assert.equal(settingsRequests,0);assert.equal(settingsForm.dataset.unsaved,'true');
settingTree=settingsRender();find(settingTree,n=>n.props?.id==='setting-facebookUrl').props.onChange({target:{value:'https://facebook.com/isolated-fixture'}});
settingTree=settingsRender();let settingsSubmit=find(settingTree,n=>n.type==='form').props.onSubmit;
const settingsSave=settingsSubmit({preventDefault(){},currentTarget:settingsForm});await settingsSubmit({preventDefault(){},currentTarget:settingsForm});assert.equal(settingsRequests,1);
settingTree=settingsRender();assert.equal(find(settingTree,n=>n.type==='fieldset').props.disabled,true);
settingsPut.resolve(response(503,{error:'Belum tersimpan'}));await settingsSave;
assert.equal(settingsForm.dataset.unsaved,'true');settingTree=settingsRender();
assert.equal(find(settingTree,n=>n.props?.id==='setting-facebookUrl').props.value,'https://facebook.com/isolated-fixture');
settingsPut=deferred();const settingsRetry=find(settingTree,n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:settingsForm});settingsPut.resolve(response(200,{ok:true}));await settingsRetry;
assert.equal(settingsSaved,1);assert.equal(settingsForm.dataset.unsaved,undefined);
console.log('PASS settings: invalid social domain rejected before sending; double submit blocked; pending controls locked; failure retains edits; success clears dirty state.');

// Files: rename does not discard its draft or send twice; expired upload queue stops.
const renameFixture=new FormFixture();
let fileRequest=deferred(),fileRequests=0,refreshFileError=false;
const manager=await harness('src/app/_components/file-manager.tsx',{
 document:{querySelector:()=>renameFixture.dataset.unsaved?renameFixture:null},window:{confirm:()=>false},FormData,
 fetch:()=>{fileRequests++;return fileRequest.promise;},
});
const managerProps={files:[{id:'f',name:'fixture.pdf',size:100,mime:'application/pdf',created:'2026-11-03'}],onChange:async()=>{if(refreshFileError)throw Error('refresh failed');}};
const managerRender=()=>manager.render(()=>manager.exports.default(managerProps));
let fileTree=managerRender();find(fileTree,n=>n.props?.['aria-label']==='Ganti nama fixture.pdf').props.onClick();fileTree=managerRender();
const renameElement=find(fileTree,n=>n.type==='form');renameElement.props.ref.current=renameFixture;
find(fileTree,n=>n.props?.id==='archive-file-name').props.onChange({target:{value:'renamed.pdf'}});
fileTree=managerRender();let renameSubmit=find(fileTree,n=>n.type==='form').props.onSubmit;
renameSubmit({preventDefault(){}});renameSubmit({preventDefault(){}});assert.equal(fileRequests,1);
fileRequest.resolve(response(409,{error:'Berkas masih dipakai.'}));await new Promise(r=>setImmediate(r));fileTree=managerRender();
assert.equal(find(fileTree,n=>n.props?.id==='archive-file-name').props.value,'renamed.pdf');assert.equal(renameFixture.dataset.unsaved,'true');
fileRequest=deferred();refreshFileError=true;find(fileTree,n=>n.type==='form').props.onSubmit({preventDefault(){}});fileRequest.resolve(response(200,{ok:true}));await new Promise(r=>setImmediate(r));fileTree=managerRender();
assert.equal(renameFixture.dataset.unsaved,undefined);assert.equal(find(fileTree,n=>n.props?.['aria-label']==='Ganti nama fixture.pdf').props.disabled,false);
fileRequest=deferred();const beforeFiles=fileRequests;
const uploadInput=find(fileTree,n=>n.props?.type==='file');const files=[new File(['test'],'one.pdf'),new File(['test'],'two.pdf')];
const uploadPromise=uploadInput.props.onChange({target:{files}});await uploadInput.props.onChange({target:{files}});assert.equal(fileRequests,beforeFiles+1);
fileRequest.resolve(response(401,{error:'Silakan masuk.'}));await uploadPromise;fileTree=managerRender();assert.equal(fileRequests,beforeFiles+1);
function allNodes(node,result=[]){if(!node||typeof node!=='object')return result;result.push(node);for(const child of React.Children.toArray(node.props?.children))allNodes(child,result);return result;}
assert(allNodes(fileTree).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('two.pdf: belum diproses')));
assert.equal(find(fileTree,n=>n.props?.type==='file').props.disabled,false);
console.log('PASS files: rename failure retains draft; duplicate request blocked; refresh failure unlocks controls; 401 stops upload batch and lists unprocessed files.');

// Accounts: response link opens only after confirmation is closed; drafts survive failures.
class FieldsFixture extends Map {constructor(form){super(Object.entries(form.fields));}}
let accountPost=deferred(),accountPosts=0;
const accountForm={dataset:{unsaved:'true'},fields:{memberId:'member',email:'isolated@example.test'},reset(){this.didReset=true;}};
const accountPayload={users:[{id:'u',email:'isolated@example.test',full_name:'Fixture',role:'anggota',position:'',program_ids:'[]',member_id:'linked',enabled:true}],members:[{id:'member',name:'Fixture',status:'Aktif',verification:'Terverifikasi'}],invitations:[],audit:[]};
const accounts=await harness('src/app/_components/access/accounts.tsx',{
 FormData:FieldsFixture,document:{querySelector:()=>accountForm.dataset.unsaved?accountForm:null},window:{confirm:()=>false},
 fetch:(_url,options)=>{if(options?.method){accountPosts++;return accountPost.promise;}return Promise.resolve(response(200,accountPayload));},
});
const accountsRender=()=>accounts.render(()=>accounts.exports.default());
let accountTree=accountsRender();accounts.effects();await new Promise(r=>setImmediate(r));accountTree=accountsRender();
const inviteSubmit=find(accountTree,n=>n.type==='form').props.onSubmit;
const invitation=inviteSubmit({preventDefault(){},currentTarget:accountForm});await inviteSubmit({preventDefault(){},currentTarget:accountForm});assert.equal(accountPosts,1);
accountPost.resolve(response(409,{error:'Undangan sudah ada.'}));await invitation;assert.equal(accountForm.dataset.unsaved,'true');assert(!accountForm.didReset);
accountTree=accountsRender();find(accountTree,n=>n.props?.children==='Pulihkan password').props.onClick();accountTree=accountsRender();
const opened=tree=>allNodes(tree).filter(n=>n.type?.name==='Dialog'&&n.props.open);
assert.equal(opened(accountTree).length,1);
accountPost=deferred();const resetting=find(accountTree,n=>n.props?.children==='Lanjutkan').props.onClick();
accountPost.resolve(response(200,{url:'https://example.test/isolated-token',email:'isolated@example.test',expires:'2026-11-04',purpose:'reset'}));await resetting;accountTree=accountsRender();
assert.equal(opened(accountTree).length,1);assert.equal(find(accountTree,n=>n.props?.id==='activation-link').props.value,'https://example.test/isolated-token');
const roleFields=await harness('src/app/_components/access/role-fields.tsx');
const roleTree=prefix=>roleFields.render(()=>roleFields.exports.default({idPrefix:prefix,value:{role:'koordinator',position:'',programIds:[]},onChange(){}}));
const idsA=allNodes(roleTree('invite')).map(n=>n.props?.id).filter(Boolean),idsB=allNodes(roleTree('edit')).map(n=>n.props?.id).filter(Boolean);
assert(!idsA.some(id=>idsB.includes(id)));
console.log('PASS accounts: invitation double submit blocked; error keeps draft; reset result replaces confirmation with one dialog; role/scope IDs do not collide.');

// Inbox: replace an in-flight search, reject malformed results and clear private data on failure.
const inboxCalls=[],inboxTimers=new Map();let nextTimer=0;
const inboxData=await harness('src/hooks/use-inbox-data.ts',{
 setTimeout:fn=>{inboxTimers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>inboxTimers.delete(id),
 fetch:(_url,options)=>{const d=deferred();inboxCalls.push({...d,signal:options.signal});return d.promise;},
});
const message=id=>({id,name:'Fixture '+id,contact:'fixture@example.test',topic:'Info',message:'Isolated message',status:'Baru',created:'2026-11-03'});
const messagePage=items=>({messages:items,total:items.length,page:1,pages:1,counts:{Baru:items.length,Dibaca:0,Ditindaklanjuti:0}});
let inboxQuery='old';const inboxRender=()=>inboxData.render(()=>inboxData.exports.useInboxData(1,'Semua',inboxQuery));
let inboxState=inboxRender();inboxData.effects();
for(const fn of [...inboxTimers.values()])fn();inboxTimers.clear();assert.equal(inboxCalls.length,1);
inboxQuery='new';inboxState=inboxRender();inboxData.effects();assert(inboxCalls[0].signal.aborted);
inboxCalls[0].resolve(response(401,{error:'Old session result'}));await new Promise(r=>setImmediate(r));inboxState=inboxRender();assert.equal(inboxState.error,'');
for(const fn of [...inboxTimers.values()])fn();inboxTimers.clear();inboxCalls[1].resolve(response(200,messagePage([message('new')])));await new Promise(r=>setImmediate(r));inboxState=inboxRender();assert.equal(inboxState.messages[0].id,'new');
const inboxFailed=inboxState.load();inboxCalls[2].resolve(response(401,{error:'Sesi berakhir'}));await inboxFailed;inboxState=inboxRender();assert.equal(inboxState.messages.length,0);assert.equal(inboxState.total,0);assert.match(inboxState.error,/Sesi/);
const inboxMalformed=inboxState.load();inboxCalls[3].resolve(response(200,{messages:'wrong'}));await inboxMalformed;inboxState=inboxRender();assert.equal(inboxState.messages.length,0);assert.match(inboxState.error,/belum lengkap/);
console.log('PASS inbox data: debounced search aborts old request; late 401 ignored; active failure clears private messages/counts; malformed data rejected.');

let exportPageCalls=0,exportMode='normal';
const exportData=await harness('src/lib/message-data.ts',{fetch:async url=>{
 exportPageCalls++;const page=Number(new URL(url,'https://example.test').searchParams.get('page'));
 const items=page===1?Array.from({length:100},(_,i)=>message(String(i))):[message(exportMode==='duplicate'?'99':'100')];
 return response(200,{messages:items,total:exportMode==='changed'&&page===2?102:101,page,pages:2,counts:{Baru:101}});
}});
let exported=await exportData.exports.exportMessages('Semua','fixture');assert.equal(exported.count,101);assert.equal(exportPageCalls,2);assert(exported.csv.includes('Fixture 100'));
exportMode='changed';await assert.rejects(exportData.exports.exportMessages('Semua','fixture'),/berubah/);
exportMode='duplicate';await assert.rejects(exportData.exports.exportMessages('Semua','fixture'),/belum lengkap/);
const abortedExport=new AbortController();abortedExport.abort();const beforeAbort=exportPageCalls;await assert.rejects(exportData.exports.exportMessages('Semua','fixture',abortedExport.signal),/dibatalkan/);assert.equal(exportPageCalls,beforeAbort);
console.log('PASS message export: all 101 results fetched across pages; changed totals/duplicate incomplete pages rejected; aborted export does not send.');

const paging=await harness('src/lib/list-page.ts');
assert.equal(paging.exports.listPage(0,99).start,0);assert.equal(paging.exports.listPage(26,2).start,26);assert.equal(paging.exports.listPage(1,99).page,1);assert.equal(paging.exports.listPage(100,-1).page,1);
managerProps.files=Array.from({length:61},(_,i)=>({id:'f'+i,name:'File '+i+'.pdf',size:1,mime:'application/pdf',created:'2026-11-03'}));
fileTree=managerRender();assert.equal(allNodes(fileTree).filter(n=>n.props?.className==='document-row').length,25);
find(fileTree,n=>n.props?.label==='Halaman arsip').props.onPageChange(3);fileTree=managerRender();assert.equal(allNodes(fileTree).filter(n=>n.props?.className==='document-row').length,11);
find(fileTree,n=>n.props?.label==='Cari berkas').props.onChange('File 0.pdf');fileTree=managerRender();assert.equal(allNodes(fileTree).filter(n=>n.props?.className==='document-row').length,1);assert.equal(find(fileTree,n=>n.props?.label==='Halaman arsip').props.page,1);
const manyAccounts=await harness('src/app/_components/access/accounts.tsx',{fetch:async()=>response(200,{...accountPayload,users:Array.from({length:61},(_,i)=>({...accountPayload.users[0],id:'u'+i,full_name:'Person '+i}))})});
const manyRender=()=>manyAccounts.render(()=>manyAccounts.exports.default());let manyTree=manyRender();manyAccounts.effects();await new Promise(r=>setImmediate(r));manyTree=manyRender();
assert(!allNodes(manyTree).some(n=>n.props?.children==='Person 25'));find(manyTree,n=>n.props?.label==='Halaman akun').props.onPageChange(2);manyTree=manyRender();assert(allNodes(manyTree).some(n=>n.props?.children==='Person 25'));assert(!allNodes(manyTree).some(n=>n.props?.children==='Person 0'));
find(manyTree,n=>n.props?.label==='Cari akun').props.onChange('Person 60');manyTree=manyRender();assert.equal(find(manyTree,n=>n.props?.label==='Halaman akun').props.page,1);
console.log('PASS pagination: page bounds clamp after shrinking; files and accounts show 25 per page; changing search returns to page one.');

const cash=await harness('src/lib/cash-report.ts');
const transaction=(id,date,type,amount,fund='Organisasi')=>row(id,'kas',{name:'Transaction '+id,date,type,amount,fund});
const cashRows=[transaction('previous','2026-10-01','Pemasukan',100),transaction('b','2026-11-03','Pengeluaran',20),transaction('a','2026-11-03','Pemasukan',50),transaction('future','2026-12-01','Pemasukan',500),transaction('other','2026-11-01','Pemasukan',10,'Usaha')];
const report=cash.exports.calculateCashReport(cashRows,'2026-11','Organisasi');assert.equal(report.opening,100);assert.equal(report.incoming,50);assert.equal(report.outgoing,20);assert.equal(report.closing,130);assert.equal(report.lines[0].r.id,'a');assert.equal(report.lines[0].balance,150);
const reportCSV=cash.exports.cashReportCSV(report,'Organisasi');assert(reportCSV.includes('"Total periode","Organisasi","50","20","130"'));assert(!reportCSV.includes('Transaction future'));assert(!reportCSV.includes('Transaction other'));
assert.equal(reportCSV,cash.exports.cashReportCSV(cash.exports.calculateCashReport([...cashRows].reverse(),'2026-11','Organisasi'),'Organisasi'));
const emptyMonth=cash.exports.calculateCashReport(cashRows,'2027-01','Organisasi');assert.equal(emptyMonth.opening,630);assert.equal(emptyMonth.closing,630);assert.equal(emptyMonth.lines.length,0);
assert.throws(()=>cash.exports.calculateCashReport([transaction('bad','2026-11-01','Pemasukan','NaN')],'2026-11','Organisasi'),/tidak valid/);
assert.throws(()=>cash.exports.calculateCashReport([transaction('bad','2026-02-30','Pemasukan',1)],'2026-11','Organisasi'),/tanggal/);
assert.throws(()=>cash.exports.calculateCashReport([transaction('big','2026-11-01','Pemasukan',Number.MAX_SAFE_INTEGER),transaction('overflow','2026-11-02','Pemasukan',1)],'2026-11','Organisasi'),/batas perhitungan/);
const csv=await harness('src/lib/csv.ts');assert(csv.exports.csvCell('  =SUM(A1)').startsWith('"\''));assert(csv.exports.csvCell('\t=1').startsWith('"\''));assert.equal(csv.exports.csvCell('a"b'),'"a""b"');
const fs=require('node:fs'),postcss=require('postcss');const css=postcss.parse(fs.readFileSync('src/app/globals.css','utf8'));
let guardedBodyHide=false,multipage=false;
css.walkAtRules('media',media=>{if(media.params!=='print')return;media.walkRules(rule=>{
 if(rule.selector.includes('> *:not([data-print-root])')){assert(rule.selector.includes('body:has(> [data-print-root])'));guardedBodyHide=true;}
 if(rule.selector.includes('html:has(.report-sheet)'))rule.walkDecls('overflow',d=>{if(d.value==='visible')multipage=true;});
});});assert(guardedBodyHide);assert(multipage);
console.log('PASS cash reports: opening/month/fund/running/closing/CSV agree, tie order stable, empty-month carry correct, invalid/unsafe totals blocked; legacy print hide is scoped and report overflow allows pages (CSS check, not physical print).');

const inboxUiTimers=new Map();let inboxUiTimerId=0,inboxWrites=0,inboxWrite=deferred();const inboxUiReads=[];
const inboxUI=await harness('src/app/_components/inbox.tsx',{
 setTimeout:fn=>{inboxUiTimers.set(++inboxUiTimerId,fn);return inboxUiTimerId;},clearTimeout:id=>inboxUiTimers.delete(id),
 fetch:(_url,options)=>{if(options?.method){inboxWrites++;return inboxWrite.promise;}const d=deferred();inboxUiReads.push(d);return d.promise;},
});
const inboxUiRender=()=>inboxUI.render(()=>inboxUI.exports.default());let inboxTree=inboxUiRender();inboxUI.effects();for(const fn of [...inboxUiTimers.values()])fn();inboxUiTimers.clear();inboxUiReads[0].resolve(response(200,messagePage([message('ui')])));await new Promise(r=>setImmediate(r));inboxTree=inboxUiRender();
const changeStatus=find(inboxTree,n=>n.props?.['aria-label']==='Status pesan dari Fixture ui').props.onChange;
const statusChange=changeStatus({target:{value:'Dibaca'}});await changeStatus({target:{value:'Dibaca'}});assert.equal(inboxWrites,1);
inboxWrite.resolve(response(503,{error:'Belum berubah'}));await statusChange;inboxTree=inboxUiRender();assert.equal(find(inboxTree,n=>n.props?.['aria-label']==='Status pesan dari Fixture ui').props.value,'Baru');
find(inboxTree,n=>n.props?.children?.some?.(child=>child==='Hapus')).props.onClick();inboxTree=inboxUiRender();
inboxWrite=deferred();const deletion=find(inboxTree,n=>n.props?.children==='Hapus pesan').props.onClick();inboxWrite.resolve(response(503,{error:'Belum dihapus'}));await deletion;inboxTree=inboxUiRender();assert.equal(opened(inboxTree).length,1);assert(allNodes(inboxTree).some(n=>n.props?.children==='Belum dihapus'));
console.log('PASS inbox actions: duplicate status change blocked; failed status stays unchanged; failed deletion keeps confirmation and its error visible.');
assert.equal(csv.exports.csvCell(-20),'"-20"');
const negativeReport=cash.exports.calculateCashReport([transaction('negative','2026-11-01','Pengeluaran',20)],'2026-11','Organisasi');assert.equal(negativeReport.closing,-20);assert(cash.exports.cashReportCSV(negativeReport,'Organisasi').includes('"Total periode","Organisasi","0","20","-20"'));
console.log('PASS negative cash balance remains a numeric CSV value; untrusted formula-like text is still escaped.');

// Real deadline wiring at the component boundary: no waits for wall-clock 25/90 seconds.
const deadlineTimers = new Map(); let deadlineId = 0, deadlineWrites = 0;
const deadlines = {
  setTimeout(fn, ms) { deadlineTimers.set(++deadlineId, { fn, ms }); return deadlineId; },
  clearTimeout(id) { deadlineTimers.delete(id); },
};
const stall = (_url, options) => {
  deadlineWrites++;
  return new Promise((_resolve, reject) => {
    if (options.signal.aborted) reject(Error('aborted'));
    else options.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true });
  });
};
async function expire(ms) {
  const item = [...deadlineTimers.values()].find(t => t.ms === ms);
  assert(item, 'expected finite request deadline '+ms); item.fn();
  await new Promise(r => setImmediate(r));
}
const timedRename = await harness('src/app/_components/file-manager.tsx', { ...deadlines, fetch: stall });
const timedRenameRender = () => timedRename.render(() => timedRename.exports.default({...managerProps,files:[managerProps.files[0]]}));
let timedTree = timedRenameRender();
find(timedTree,n=>n.props?.['aria-label']==='Ganti nama File 0.pdf').props.onClick();
timedTree=timedRenameRender();find(timedTree,n=>n.props?.id==='archive-file-name').props.onChange({target:{value:'Keep this.pdf'}});
timedTree=timedRenameRender();const timedSubmit=find(timedTree,n=>n.type==='form').props.onSubmit;
const beforeDeadline=deadlineWrites;timedSubmit({preventDefault(){}});timedSubmit({preventDefault(){}});
assert.equal(deadlineWrites,beforeDeadline+1);await expire(25000);timedTree=timedRenameRender();
assert.equal(find(timedTree,n=>n.props?.id==='archive-file-name').props.value,'Keep this.pdf');
assert(allNodes(timedTree).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('Status penyimpanan belum dapat dipastikan')));
assert.equal(find(timedTree,n=>n.type==='fieldset').props.disabled,false);assert.equal(deadlineTimers.size,0);
const timedUpload = await harness('src/app/_components/file-manager.tsx', {...deadlines,fetch:stall,FormData});
const timedUploadRender=()=>timedUpload.render(()=>timedUpload.exports.default(managerProps));
let uploadTree=timedUploadRender();const timedUploadInput=find(uploadTree,n=>n.props?.type==='file');
const uploading=timedUploadInput.props.onChange({target:{files:[new File(['test'],'timeout.pdf')]}});
await expire(90000);await uploading;uploadTree=timedUploadRender();
assert.equal(find(uploadTree,n=>n.props?.type==='file').props.disabled,false);
assert(allNodes(uploadTree).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('timeout.pdf: Koneksi terlalu lama')));
assert.equal(deadlineTimers.size,0);
const timeoutForm={dataset:{unsaved:'true'},fields:{memberId:'member',email:'kept@example.test'},reset(){this.didReset=true;}};
const timedAccounts=await harness('src/app/_components/access/accounts.tsx',{
 ...deadlines,FormData:FieldsFixture,fetch:(url,options)=>options.method?stall(url,options):Promise.resolve(response(200,accountPayload)),
});
const timedAccountRender=()=>timedAccounts.render(()=>timedAccounts.exports.default());
let timedAccountTree=timedAccountRender();timedAccounts.effects();await new Promise(r=>setImmediate(r));timedAccountTree=timedAccountRender();
const timedInvite=find(timedAccountTree,n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:timeoutForm});
await expire(25000);await timedInvite;timedAccountTree=timedAccountRender();
assert.equal(timeoutForm.dataset.unsaved,'true');assert(!timeoutForm.didReset);
assert.equal(find(timedAccountTree,n=>n.type==='fieldset').props.disabled,false);assert.equal(deadlineTimers.size,0);
// Timed-out reads surface recovery instead of keeping a skeleton indefinitely.
const timedProfile=await harness('src/app/_components/access/my-account.tsx',{...deadlines,fetch:stall});
const profileRender=()=>timedProfile.render(()=>timedProfile.exports.default());profileRender();timedProfile.effects();await new Promise(r=>setImmediate(r));await expire(25000);
const profileTree=profileRender();assert(allNodes(profileTree).some(n=>React.Children.toArray(n.props?.children).some(c=>typeof c==='string'&&c.includes('Data terlalu lama merespons'))));
assert(allNodes(profileTree).some(n=>n.props?.children==='Coba lagi'));assert.equal(deadlineTimers.size,0);
const timedMessages=await harness('src/lib/message-data.ts',{...deadlines,fetch:stall});
const messageTimeout=assert.rejects(timedMessages.exports.fetchMessagePage({page:1,limit:20,status:'Semua',query:''}),/Data terlalu lama/);
await expire(25000);await messageTimeout;assert.equal(deadlineTimers.size,0);
console.log('PASS operational deadlines: timed-out rename/invitation preserve draft and release locks; no duplicate write/retry; upload gets 90s deadline and file-level error; profile/messages expose recovery; timers cleaned.');
const passwordForm={dataset:{unsaved:'true'},fields:{currentPassword:'synthetic-old',password:'synthetic-new-123',confirmation:'synthetic-new-123'},reset(){this.didReset=true;}};
const timedPassword=await harness('src/app/_components/access/my-account.tsx',{
 ...deadlines,FormData:FieldsFixture,fetch:(url,options)=>options.method?stall(url,options):Promise.resolve(response(200,{user:{email:'fixture@example.test',displayName:'Fixture',role:'anggota',position:'',programIds:[]},profile:{name:'Fixture',dusun:'',phone:'',status:'Aktif',verification:'Terverifikasi'}})),
});
const passwordRender=()=>timedPassword.render(()=>timedPassword.exports.default());passwordRender();timedPassword.effects();await new Promise(r=>setImmediate(r));
let passwordTree=passwordRender();const submitPassword=find(passwordTree,n=>n.type==='form').props.onSubmit;
const beforePassword=deadlineWrites;const passwordSaving=submitPassword({preventDefault(){},currentTarget:passwordForm});await submitPassword({preventDefault(){},currentTarget:passwordForm});
assert.equal(deadlineWrites,beforePassword+1);await expire(25000);await passwordSaving;passwordTree=passwordRender();
assert(!passwordForm.didReset);assert.equal(passwordForm.dataset.unsaved,'true');assert.equal(find(passwordTree,n=>n.props?.id==='password').props.disabled,false);assert.equal(deadlineTimers.size,0);
const timedAttendanceForm={dataset:{}};let timedAttendanceSaved=0;
const timedAttendance=await harness('src/app/_components/attendance.tsx',{...deadlines,fetch:stall});
const timedAttendanceRender=()=>timedAttendance.render(()=>timedAttendance.exports.default({rows,onSaved:async()=>{timedAttendanceSaved++;}}));
let timedAttendanceTree=timedAttendanceRender();timedAttendance.effects();find(timedAttendanceTree,n=>n.props?.id==='attendance-event').props.onChange({target:{value:'a'}});
timedAttendanceTree=timedAttendanceRender();find(timedAttendanceTree,n=>n.type==='form').props.ref.current=timedAttendanceForm;timedAttendance.effects();timedAttendanceTree=timedAttendanceRender();
find(timedAttendanceTree,n=>n.props?.id==='attendance-notes').props.onChange({target:{value:'Keep attendance notes'}});timedAttendanceTree=timedAttendanceRender();
const attendanceTimeout=find(timedAttendanceTree,n=>n.type==='form').props.onSubmit({preventDefault(){}});await expire(25000);await attendanceTimeout;timedAttendanceTree=timedAttendanceRender();
assert.equal(find(timedAttendanceTree,n=>n.props?.id==='attendance-notes').props.value,'Keep attendance notes');assert.equal(timedAttendanceForm.dataset.unsaved,'true');assert.equal(timedAttendanceSaved,0);assert.equal(find(timedAttendanceTree,n=>n.props?.id==='attendance-event').props.disabled,false);assert.equal(deadlineTimers.size,0);
console.log('PASS password/attendance deadlines: no false success, no double password request, forms retain dirty state and unlock after timeout.');
// Logout must also recover if headers or response body stalls.
let logoutRedirect='',logoutTransport='stall';const logoutDirtyForm={dataset:{unsaved:'true'}};
const logoutHook=await harness('src/hooks/use-logout.ts',{
 ...deadlines,document:{querySelector:()=>null,querySelectorAll:()=>[logoutDirtyForm]},window:{location:{replace:url=>{logoutRedirect=url;}}},
 fetch:(url,options)=>logoutTransport==='stall'?stall(url,options):Promise.resolve(response(200,{ok:true})),
});
const logoutRender=()=>logoutHook.render(()=>logoutHook.exports.useLogout());let logoutState=logoutRender();const beforeLogout=deadlineWrites;
const logoutTimeout=logoutState.logout();await logoutState.logout();assert.equal(deadlineWrites,beforeLogout+1);await expire(25000);await logoutTimeout;logoutState=logoutRender();
assert.equal(logoutState.busy,false);assert.match(logoutState.error,/Status sesi belum dapat dipastikan/);assert.equal(logoutRedirect,'');assert.equal(logoutDirtyForm.dataset.unsaved,'true');assert.equal(deadlineTimers.size,0);
logoutTransport='success';await logoutState.logout();assert.equal(logoutRedirect,'/masuk?logged_out=1');assert.equal(logoutDirtyForm.dataset.unsaved,undefined);assert.equal(deadlineTimers.size,0);
console.log('PASS logout deadline: double request blocked, timeout releases button and preserves form, retry clears dirty state only after server success and redirects.');

// Image upload is a private archive step, not an implicit publish operation.
let photoRequest=deferred(),photoPosts=0;const photoBusy=[],photoChosen=[];
const photoForm={dataset:{}};
const picker=await harness('src/app/_components/image-picker.tsx',{FormData,fetch:(_url,options)=>{photoPosts++;assert.equal(options.method,'POST');return photoRequest.promise;}});
const pickerProps={id:'test-image',name:'fileId',files:[{id:'old',name:'old.jpg',mime:'image/jpeg'},{id:'pdf',name:'private.pdf',mime:'application/pdf'},{id:'deleted',name:'deleted.png',mime:'image/png',deleted_at:'2026-11-04'}],defaultValue:'old',onChange:id=>photoChosen.push(id),onBusyChange:busy=>photoBusy.push(busy)};
const pickerRender=()=>picker.render(()=>picker.exports.default(pickerProps));let photoTree=pickerRender();picker.effects();
find(photoTree,n=>n.props?.id==='test-image').props.ref.current={form:photoForm};
assert(!allNodes(photoTree).some(n=>n.props?.value==='pdf'||n.props?.value==='deleted'));
const selectPhoto=()=>find(photoTree,n=>n.props?.type==='file').props.onChange;
selectPhoto()({target:{files:[new File(['x'],'photo.heic',{type:'image/heic'})]}});photoTree=pickerRender();assert.equal(photoPosts,0);assert(allNodes(photoTree).some(n=>n.props?.role==='alert'));
selectPhoto()({target:{files:[new File(['bytes'],'photo.png',{type:'image/png'})]}});
selectPhoto()({target:{files:[new File(['bytes'],'photo.png',{type:'image/png'})]}});assert.equal(photoPosts,1);assert.equal(photoForm.dataset.unsaved,'true');
photoTree=pickerRender();assert.equal(find(photoTree,n=>n.props?.id==='test-image').props.disabled,true);
photoRequest.resolve(response(500,{error:'Upload failed'}));await new Promise(r=>setImmediate(r));photoTree=pickerRender();assert.equal(find(photoTree,n=>n.props?.id==='test-image').props.value,'old');assert.equal(photoBusy.at(-1),false);assert.equal(photoChosen.length,0);
photoRequest=deferred();selectPhoto()({target:{files:[new File(['bytes'],'new.png',{type:'image/png'})]}});photoRequest.resolve(response(200,{ok:true,id:'uploaded-private'}));await new Promise(r=>setImmediate(r));photoTree=pickerRender();assert.equal(find(photoTree,n=>n.props?.id==='test-image').props.value,'uploaded-private');assert.equal(photoChosen.at(-1),'uploaded-private');assert.equal(find(photoTree,n=>n.type==='img').props.src,'/api/files?id=uploaded-private&preview=1');
assert.equal(photoPosts,2);find(photoTree,n=>n.props?.children==='Lepaskan foto').props.onClick();photoTree=pickerRender();assert.equal(find(photoTree,n=>n.props?.id==='test-image').props.value,'');assert.equal(photoPosts,2,'detaching does not delete an archive');
// Settings cannot publish an incomplete image selection while upload is in flight.
settingTree=settingsRender();const imageField=find(settingTree,n=>n.type?.name==='ImagePicker');assert(imageField);imageField.props.onBusyChange(true);
const settingsBeforePhoto=settingsRequests;await find(settingTree,n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:settingsForm});assert.equal(settingsRequests,settingsBeforePhoto);imageField.props.onBusyChange(false);
console.log('PASS image workflow: unsupported photo rejected, duplicate upload blocked, failure retains selection, successful private upload becomes selection, preview remains authenticated, detach does not delete; settings submission waits for image upload.');

// Personal profile editor: separate drafts, explicit photo save, and immediate identity sync.
let personalRequest=deferred(),personalCalls=0;const personalEvents=[],personalRequests=[],revokedPreviews=[];
let personalUser={accountId:'self-fixture',displayName:'Original Name',avatarUrl:'',email:'fixture@example.test',role:'anggota',position:''};
class FixtureCustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
const personal=await harness('src/app/_components/access/account-profile-editor.tsx',{
 Headers,FormData,CustomEvent:FixtureCustomEvent,URL:{createObjectURL:()=> 'blob:private-fixture',revokeObjectURL:url=>revokedPreviews.push(url)},
 window:{dispatchEvent:event=>personalEvents.push(event)},
 fetch:(url,options)=>{personalCalls++;personalRequests.push({url,options});return personalRequest.promise;},
});
const personalRender=()=>personal.render(()=>personal.exports.default({user:personalUser,onSaved:payload=>{personalUser={...personalUser,...payload.user};}}));
let personalTree=personalRender();personal.effects();
const nameDraft={dataset:{unsaved:'true'}},photoDraft={dataset:{}};
find(personalTree,n=>n.props?.['aria-label']==='Ubah foto profil').props.ref.current=photoDraft;
find(personalTree,n=>n.props?.id==='profile-photo').props.ref.current={value:'selected'};
find(personalTree,n=>n.props?.id==='profile-display-name').props.onChange({target:{value:'Draft Alias'}});personalTree=personalRender();
const submitAlias=()=>find(personalTree,n=>n.props?.['aria-label']==='Ubah nama tampilan').props.onSubmit({preventDefault(){},currentTarget:nameDraft});
submitAlias();submitAlias();assert.equal(personalCalls,1);assert.equal(personalRequests[0].options.headers.get('x-profile-account'),'self-fixture');assert.equal(JSON.parse(personalRequests[0].options.body).displayName,'Draft Alias');
personalRequest.resolve(response(503,{error:'Not saved'}));await new Promise(r=>setImmediate(r));personalTree=personalRender();assert.equal(find(personalTree,n=>n.props?.id==='profile-display-name').props.value,'Draft Alias');assert.equal(nameDraft.dataset.unsaved,'true');
personalRequest=deferred();submitAlias();personalRequest.resolve(response(200,{ok:true,user:{accountId:'self-fixture',displayName:'Saved Alias',avatarUrl:''}}));await new Promise(r=>setImmediate(r));personalTree=personalRender();assert.equal(nameDraft.dataset.unsaved,undefined);assert.equal(personalEvents.at(-1).detail.displayName,'Saved Alias');
const choosePersonal=files=>find(personalTree,n=>n.props?.id==='profile-photo').props.onChange({target:{files}});
choosePersonal([new File(['x'],'unsupported.heic')]);personalTree=personalRender();assert.equal(photoDraft.dataset.unsaved,undefined);assert.equal(personalCalls,2);
choosePersonal([new File(['fixture'],'portrait.png')]);personalTree=personalRender();personal.effects();await new Promise(r=>setTimeout(r,5));personalTree=personalRender();assert.equal(photoDraft.dataset.unsaved,'true');assert(allNodes(personalTree).some(n=>n.type?.name==='UserAvatar'&&n.props.user.avatarUrl==='blob:private-fixture'));
find(personalTree,n=>n.props?.children?.some?.(c=>c==='Batal')).props.onClick();personalTree=personalRender();personal.effects();assert.equal(photoDraft.dataset.unsaved,undefined);assert(revokedPreviews.includes('blob:private-fixture'));assert.equal(personalCalls,2);
choosePersonal([new File(['fixture'],'portrait.png')]);personalTree=personalRender();personal.effects();await new Promise(r=>setTimeout(r,5));personalTree=personalRender();
const submitPortrait=()=>find(personalTree,n=>n.props?.['aria-label']==='Ubah foto profil').props.onSubmit({preventDefault(){},currentTarget:photoDraft});
personalRequest=deferred();submitPortrait();submitPortrait();assert.equal(personalCalls,3);assert.equal(personalRequests.at(-1).url,'/api/account/avatar');assert.equal(personalRequests.at(-1).options.body.get('file').name,'portrait.png');
personalRequest.resolve(response(503,{error:'Photo not saved'}));await new Promise(r=>setImmediate(r));personalTree=personalRender();assert.equal(photoDraft.dataset.unsaved,'true');assert(allNodes(personalTree).some(n=>n.props?.children?.some?.(c=>c==='Simpan foto')));
// A photo response must not overwrite another form's unsaved name.
find(personalTree,n=>n.props?.id==='profile-display-name').props.onChange({target:{value:'Another unsaved alias'}});nameDraft.dataset.unsaved='true';personalTree=personalRender();
personalRequest=deferred();submitPortrait();personalRequest.resolve(response(200,{ok:true,user:{accountId:'self-fixture',displayName:'Saved Alias',avatarUrl:'/api/account/avatar?v=fixture-new'}}));await new Promise(r=>setImmediate(r));personalTree=personalRender();personal.effects();personalTree=personalRender();assert.equal(photoDraft.dataset.unsaved,undefined);assert.equal(nameDraft.dataset.unsaved,'true');assert.equal(find(personalTree,n=>n.props?.id==='profile-display-name').props.value,'Another unsaved alias');assert.equal(personalEvents.at(-1).detail.avatarUrl,'/api/account/avatar?v=fixture-new');
personalRequest=deferred();find(personalTree,n=>n.props?.children?.some?.(c=>c==='Hapus')).props.onClick();personalRequest.resolve(response(200,{ok:true,user:{accountId:'self-fixture',displayName:'Saved Alias',avatarUrl:''}}));await new Promise(r=>setImmediate(r));assert.equal(personalUser.avatarUrl,'');assert.equal(personalUser.role,'anggota');
const identityListeners=new Map();const identityHook=await harness('src/hooks/use-profile-identity.ts',{window:{addEventListener:(name,fn)=>identityListeners.set(name,fn),removeEventListener:name=>identityListeners.delete(name)}});
const identityUser={accountId:'self',displayName:'Before',avatarUrl:''};const identityRender=()=>identityHook.render(()=>identityHook.exports.useProfileIdentity(identityUser));identityRender();identityHook.effects();
identityListeners.get('srikandi:profile-updated')({detail:{accountId:'other',displayName:'Not mine'}});assert.equal(identityRender().displayName,'Before');
identityListeners.get('srikandi:profile-updated')({detail:{accountId:'self',displayName:'After',avatarUrl:'/api/account/avatar?v=new'}});assert.equal(identityRender().displayName,'After');assert.equal(identityRender().avatarUrl,'/api/account/avatar?v=new');
console.log('PASS personal profile UI: name/photo single-flight and retained drafts, cancel revokes preview, explicit photo save, photo update preserves unsaved name, delete restores initials, expected-account header, immediate sync only for same account.');

// Employee portal: real component event handlers, controlled network; no visual browser claim.
let enterpriseRequest=deferred(),enterpriseWrites=0;
const enterprise=await harness('src/app/_components/enterprise-workspace.tsx',{crypto,window:{confirm:()=>false,addEventListener(){},removeEventListener(){}},fetch:(_url,init={})=>{if(init.method){enterpriseWrites++;return enterpriseRequest.promise;}if(_url.includes('?id='))return Promise.resolve(response(404,{error:'Reload detail'}));return Promise.resolve(response(200,{items:[],counts:{},assets:[],total:0,pages:1,page:1,canReview:false,canFulfill:false}));}});
const enterpriseUser={accountId:'employee-self',userId:'workspace',displayName:'Employee',fullName:'Employee',role:'anggota',email:'self@example.test',position:'',programIds:[],memberId:null};
const erender=()=>enterprise.render(()=>enterprise.exports.default({user:enterpriseUser,section:'pengajuan'}));
let etree=erender();enterprise.effects();await new Promise(r=>setImmediate(r));etree=erender();
find(find(etree,n=>n.type?.name==='WorkspacePageHeader').props.actions,n=>n.props?.children?.some?.(c=>c==='Buat pengajuan')).props.onClick();etree=erender();
find(etree,n=>n.props?.id==='operation-title').props.onChange({target:{value:'Draft that must remain'}});etree=erender();
let eform=find(etree,n=>n.type==='form');const esave=eform.props.onSubmit({preventDefault(){}});eform.props.onSubmit({preventDefault(){}});assert.equal(enterpriseWrites,1,'No double create');
etree=erender();assert.equal(find(etree,n=>n.type==='fieldset').props.disabled,true);
enterpriseRequest.resolve(response(409,{error:'Data changed'}));await esave;etree=erender();assert.equal(find(etree,n=>n.props?.id==='operation-title').props.value,'Draft that must remain');assert(find(etree,n=>n.props?.role==='alert'&&n.props.children==='Data changed'));
const edialog=find(etree,n=>n.props?.open===true&&n.props?.onOpenChange);edialog.props.onOpenChange(false);assert(find(erender(),n=>n.props?.open===true&&n.props?.onOpenChange),'Dirty close cancelled');
enterpriseRequest=deferred();eform=find(erender(),n=>n.type==='form');const secondSave=eform.props.onSubmit({preventDefault(){}});enterpriseRequest.resolve(response(200,{item:{id:'created'}}));await secondSave;etree=erender();assert(!find(etree,n=>n.props?.open===true&&find(n,x=>x.type==='form')),'Successful draft closes editor');
console.log('PASS employee portal client: duplicate save prevented, pending fields disabled, conflict preserves draft, dirty dialog close guarded, success closes editor and reloads. Not a browser layout test.');

const enterpriseUnavailable=await harness('src/app/_components/enterprise-workspace.tsx',{crypto,fetch:async()=>response(503,{error:'Unavailable'}),window:{confirm:()=>false,addEventListener(){},removeEventListener(){}}});
const unavailableRender=()=>enterpriseUnavailable.render(()=>enterpriseUnavailable.exports.default({user:enterpriseUser,section:'portal'}));unavailableRender();enterpriseUnavailable.effects();await new Promise(r=>setImmediate(r));const unavailableTree=unavailableRender();assert.equal(find(unavailableTree,n=>n.type?.name==='WorkspaceMetric').props.value,'—','Unavailable data must not be presented as zero');
console.log('PASS portal unavailable metrics: failed loading shows unknown values, never false zero business counts.');
