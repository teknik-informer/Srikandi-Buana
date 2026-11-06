import {policyVersion} from "@/lib/information-pages";
import {contactTopics} from "@/lib/contact-topics";
import {consumeRateLimit} from "@/lib/rate-limit";
import {isValidContact} from "@/lib/contact-validation";
import {readJsonObject,RequestBodyError} from "@/lib/request-body";
import {env} from "@/lib/runtime";
import {getAdminUser} from "../../admin-auth";
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{"Cache-Control":"no-store",...(status===429?{"Retry-After":"600"}:{})}});
const sameOrigin=(r:Request)=>r.headers.get("origin")===new URL(r.url).origin||r.headers.get("sec-fetch-site")==="same-origin";
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Permintaan lintas situs ditolak."},403);
 if(!env.DB)return json({error:"Layanan pesan belum tersedia. Silakan coba lagi nanti."},503);
 if(Number(req.headers.get("content-length")||0)>12000)return json({error:"Pesan terlalu panjang."},413);
 try{const raw=await readJsonObject(req,16000) as Record<string,unknown>;
 if(raw.website)return json({ok:true});
 const d={name:String(raw.name||"").trim(),contact:String(raw.contact||"").trim(),topic:String(raw.topic||"").trim(),message:String(raw.message||"").trim()};
 if(d.name.length<2||d.name.length>100||d.contact.length<5||d.contact.length>180||!contactTopics.includes(d.topic)||d.message.length<10||d.message.length>3000||raw.consent!==true)return json({error:"Lengkapi nama, kontak, topik, pesan (10–3000 karakter), dan persetujuan penggunaan data."},400);
 if(!isValidContact(d.contact))return json({error:'Masukkan alamat email atau nomor WhatsApp yang valid.'},400);
 const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('srikandi-buana:'+ip));const ipHash=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');const since=new Date(Date.now()-10*60*1000).toISOString();
 if(!await consumeRateLimit(env.DB,'contact:'+ipHash,3,600000))return json({error:"Terlalu banyak pesan. Silakan mencoba kembali setelah 10 menit."},429);
 const id=crypto.randomUUID(),created=new Date().toISOString();await env.DB.prepare("INSERT INTO messages(id,name,contact,topic,message,status,ip_hash,created,consent_version,consented_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,d.name,d.contact,d.topic,d.message,'Baru',ipHash,created,policyVersion,created).run();return json({ok:true,reference:id.slice(0,8).toUpperCase()});
 }catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);return json({error:"Pesan belum tersimpan. Silakan mencoba kembali."},400)}
}
export async function GET(req:Request){
 if(!await getAdminUser())return json({error:"Akses khusus pengelola."},401);
 if(!env.DB)return json({error:"Database belum tersedia."},503);
 try{const params=new URL(req.url).searchParams;const page=Number(params.get('page')||1),limit=Number(params.get('limit')||20),status=params.get('status')||'Semua',query=(params.get('q')||'').trim();
 if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(limit)||limit<1||limit>100||query.length>200||!['Semua','Baru','Dibaca','Ditindaklanjuti'].includes(status))return json({error:'Parameter pencarian atau halaman tidak valid.'},400);
 const where=" WHERE (?='Semua' OR status=?) AND (?='' OR instr(lower(id||' '||name||' '||contact||' '||topic||' '||message),lower(?))>0)";
 const args=[status,status,query,query];const totalRow=await env.DB.prepare('SELECT COUNT(*) as total FROM messages'+where).bind(...args).first();const total=Number(totalRow?.total||0),pages=Math.max(1,Math.ceil(total/limit)),currentPage=Math.min(page,pages);
 const [rows,summary]=await Promise.all([env.DB.prepare('SELECT id,name,contact,topic,message,status,created,consent_version,consented_at FROM messages'+where+' ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').bind(...args,limit,(currentPage-1)*limit).all(),env.DB.prepare('SELECT status,COUNT(*) as total FROM messages GROUP BY status').all()]);
 const counts:Record<string,number>={Baru:0,Dibaca:0,Ditindaklanjuti:0};for(const row of summary.results)if(String(row.status) in counts)counts[String(row.status)]=Number(row.total);
 return json({messages:rows.results,total,page:currentPage,pages,limit,counts});
 }catch{return json({error:'Pesan belum dapat dimuat. Silakan coba kembali.'},503)}
}
export async function PATCH(req:Request){if(!await getAdminUser())return json({error:"Akses khusus pengelola."},401);if(!sameOrigin(req))return json({error:"Permintaan ditolak."},403);if(!env.DB)return json({error:"Database belum tersedia."},503);try{const {id,status}=await readJsonObject(req,16000) as {id:string;status:string};if(!id||!['Baru','Dibaca','Ditindaklanjuti'].includes(status))return json({error:"Status tidak valid."},400);const row=await env.DB.prepare("SELECT id FROM messages WHERE id=?").bind(id).first();if(!row)return json({error:"Pesan tidak ditemukan."},404);await env.DB.prepare("UPDATE messages SET status=? WHERE id=?").bind(status,id).run();return json({ok:true})}catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);return json({error:"Status belum tersimpan."},400)}}
export async function DELETE(req:Request){if(!await getAdminUser())return json({error:"Akses khusus pengelola."},401);if(!sameOrigin(req))return json({error:"Permintaan ditolak."},403);if(!env.DB)return json({error:"Database belum tersedia."},503);try{const id=new URL(req.url).searchParams.get('id');if(!id)return json({error:"ID pesan wajib diisi."},400);const row=await env.DB.prepare("SELECT id FROM messages WHERE id=?").bind(id).first();if(!row)return json({error:"Pesan tidak ditemukan."},404);await env.DB.prepare("DELETE FROM messages WHERE id=?").bind(id).run();return json({ok:true})}catch{return json({error:"Pesan belum dapat dihapus. Silakan coba kembali."},503)}}
