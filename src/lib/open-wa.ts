import 'server-only';
import {normalizeIndonesianMobilePhone} from '@/lib/phone';

const baseUrl=process.env.OPENWA_BASE_URL?.trim().replace(/\/+$/,'');
const apiKey=process.env.OPENWA_API_KEY?.trim();
const sessionId=process.env.OPENWA_SESSION_ID?.trim();

function config(){
 if(process.env.OPENWA_OUTBOUND_ENABLED!=='true')throw Object.assign(new Error('WhatsApp outbound belum diaktifkan. Integrasi ditunda sampai infrastruktur dan anggaran disetujui.'),{code:'OPENWA_DISABLED'});
 if(!baseUrl||!apiKey||!sessionId)throw Object.assign(new Error('OpenWA belum dikonfigurasi. Siapkan OPENWA_BASE_URL, OPENWA_API_KEY, dan OPENWA_SESSION_ID pada layanan Preview.'),{code:'OPENWA_NOT_CONFIGURED'});
 let parsed:URL;try{parsed=new URL(baseUrl)}catch{throw Object.assign(new Error('Alamat layanan OpenWA tidak valid.'),{code:'OPENWA_CONFIG_INVALID'})}
 if(parsed.protocol!=='https:'&&parsed.hostname!=='localhost'&&parsed.hostname!=='127.0.0.1')throw Object.assign(new Error('Layanan OpenWA harus menggunakan HTTPS.'),{code:'OPENWA_HTTPS_REQUIRED'});
 return {root:baseUrl.replace(/\/api$/,''),apiKey,sessionId};
}

async function request(path:string,init:RequestInit={}){
 const c=config();
 const response=await fetch(c.root+'/api'+path,{...init,cache:'no-store',signal:AbortSignal.timeout(12000),headers:{'X-API-Key':c.apiKey,'Content-Type':'application/json',...(init.headers||{})}});
 const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
 if(!response.ok)throw Object.assign(new Error('OpenWA menolak permintaan ('+response.status+').'),{code:'OPENWA_HTTP_'+response.status,status:response.status});
 return payload||{};
}

export async function getOpenWaStatus(){
 const c=config();
 const payload=await request('/sessions/'+encodeURIComponent(c.sessionId));
 const status=String(payload.status||'unknown');
 return {configured:true,connected:status==='ready',status,sessionId:c.sessionId};
}

export async function sendOpenWaText(phone:string,text:string,idempotencyKey:string){
 const c=config();
 const normalized=normalizeIndonesianMobilePhone(phone);
 if(!normalized)throw Object.assign(new Error('Nomor WhatsApp penerima tidak valid.'),{code:'OPENWA_PHONE_INVALID'});
 const state=await getOpenWaStatus();
 if(!state.connected)throw Object.assign(new Error('Sesi OpenWA belum siap. Status saat ini: '+state.status+'.'),{code:'OPENWA_SESSION_NOT_READY'});
 return request('/sessions/'+encodeURIComponent(c.sessionId)+'/messages/send-text',{
  method:'POST',
  headers:{'Idempotency-Key':idempotencyKey},
  body:JSON.stringify({chatId:normalized+'@c.us',text}),
 });
}
