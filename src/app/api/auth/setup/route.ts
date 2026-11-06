import {timingSafeEqual} from 'node:crypto';
import {env} from '@/lib/runtime';
import {createSession,digest} from '@/lib/auth';
import {hashPassword} from '@/lib/password.mjs';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Permintaan lintas situs ditolak.'},403);
 const configured=process.env.ADMIN_SETUP_TOKEN_HASH,expires=Date.parse(process.env.ADMIN_SETUP_EXPIRES||''),email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
 if(!env.DB||!configured||!email||!Number.isFinite(expires)||Date.now()>expires)return json({error:'Aktivasi tidak tersedia atau sudah kedaluwarsa. Hubungi pengelola.'},403);
 try{const data=await readJsonObject(request,4000);const token=String(data.token||'');if(token.length>200||configured.length!==64||!timingSafeEqual(Buffer.from(digest(token)),Buffer.from(configured)))return json({error:'Tautan aktivasi tidak valid.'},403);
 if(String(data.email||'').trim().toLowerCase()!==email)return json({error:'Gunakan email pemilik akun Vercel yang telah ditetapkan.'},400);
 const existing=await env.DB.prepare('SELECT id FROM users LIMIT 1').first();if(existing)return json({error:'Akun admin sudah aktif. Silakan masuk menggunakan email dan password Anda.'},409);
 const password=String(data.password||'');if(password!==String(data.confirmation||''))return json({error:'Konfirmasi password tidak cocok.'},400);const passwordHash=await hashPassword(password),id=crypto.randomUUID();const created=await env.DB.prepare('INSERT INTO users(id,email,password_hash,full_name,created,workspace_owner,role) VALUES(?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING id').bind(id,email,passwordHash,'Administrator Srikandi Buana',new Date().toISOString(),id,'admin').first();if(!created)return json({error:'Akun sudah dibuat. Silakan masuk.'},409);
 await createSession(id,false);return json({ok:true,redirect:'/dashboard'});
 }catch(error){if(error instanceof RequestBodyError)return json({error:error.message},error.status);if(error instanceof Error&&error.message.startsWith('Password harus'))return json({error:error.message},400);return json({error:'Aktivasi belum berhasil. Silakan coba lagi.'},503)}
}
