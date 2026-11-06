import {consumeRateLimit} from "@/lib/rate-limit";
import {env} from '@/lib/runtime';
import {createSession,digest,safeReturn} from '@/lib/auth';
import {verifyPassword} from '@/lib/password.mjs';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'900'}:{})}});
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Permintaan lintas situs ditolak.'},403);
 if(!env.DB||!process.env.ADMIN_EMAIL)return json({error:'Layanan masuk belum dikonfigurasi oleh administrator.'},503);
 try{const raw=await readJsonObject(request,4000);const email=String(raw.email||'').trim().toLowerCase(),password=String(raw.password||'');if(!email||!password||email.length>180||password.length>128)return json({error:'Periksa email dan password Anda.'},400);
 const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';const fingerprint='login:'+digest(ip+'|'+email);if(!await consumeRateLimit(env.DB,fingerprint,5,900000))return json({error:'Terlalu banyak percobaan. Coba lagi setelah 15 menit.'},429);
 const user=await env.DB.prepare('SELECT u.id,u.email,u.password_hash,u.enabled,o.email AS owner_email,o.enabled AS owner_enabled,o.role AS owner_role FROM users u JOIN users o ON o.id=u.workspace_owner WHERE u.email=?').bind(email).first();const valid=await verifyPassword(password,user?.password_hash);if(!user||!user.enabled||!valid||!user.owner_enabled||user.owner_role!=='admin'||String(user.owner_email).toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase().trim())return json({error:'Email atau password tidak sesuai.'},401);
 await createSession(String(user.id),raw.remember===true);await env.DB.prepare('DELETE FROM rate_limits WHERE key=? OR window_start<?').bind(fingerprint,Date.now()-86400000).run();await env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(new Date().toISOString()).run();return json({ok:true,redirect:safeReturn(String(raw.returnTo||''))});
 }catch(error){if(error instanceof RequestBodyError)return json({error:error.message},error.status);return json({error:'Layanan masuk belum dapat diakses. Silakan coba kembali.'},503)}
}
