import {getAccountProfile} from './account-profile';
import {cookies} from 'next/headers';
import {createHash,randomBytes} from 'node:crypto';
import {env} from './runtime';
import {roles,type Principal,type Role} from './permissions';
import {sessionCookie} from "./session-config";
export {sessionCookie} from "./session-config";
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function safeReturn(value:string|null|undefined){if(!value||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x1f]/.test(value))return '/dashboard';try{const url=new URL(value,'https://internal.local');return url.origin==='https://internal.local'&&!url.pathname.startsWith('/api/auth')&&!url.pathname.startsWith('/masuk')?url.pathname+url.search:'/dashboard'}catch{return '/dashboard'}}
export async function getAuthenticatedUser():Promise<Principal|null>{
 const token=(await cookies()).get(sessionCookie)?.value;if(!token||!env.DB||!process.env.ADMIN_EMAIL)return null;
 const user=await env.DB.prepare('SELECT u.id,u.email,u.full_name,u.role,u.workspace_owner,u.member_id,u.position,u.program_ids,o.email AS owner_email,o.enabled AS owner_enabled,o.role AS owner_role FROM sessions s JOIN users u ON u.id=s.user_id JOIN users o ON o.id=u.workspace_owner WHERE s.token_hash=? AND s.expires>? AND u.enabled=TRUE').bind(digest(token),new Date().toISOString()).first();
 if(!user||!user.owner_enabled||user.owner_role!=='admin'||String(user.owner_email).toLowerCase()!==process.env.ADMIN_EMAIL.trim().toLowerCase()||!(String(user.role) in roles))return null;
 if(user.role==='admin'&&(user.id!==user.workspace_owner||String(user.email).toLowerCase()!==process.env.ADMIN_EMAIL.trim().toLowerCase()))return null;
 if(user.role!=='admin'){const member=await env.DB.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(user.member_id,user.workspace_owner).first();if(!member)return null;const d=JSON.parse(String(member.data));if(d.status!=='Aktif'||d.verification!=='Terverifikasi')return null;}
 let programIds:string[]=[];try{const v=JSON.parse(String(user.program_ids));if(Array.isArray(v))programIds=v.filter((p:unknown)=>typeof p==='string')}catch{return null}
 const profile=await getAccountProfile(String(user.workspace_owner),String(user.id));
 return {accountId:String(user.id),userId:String(user.workspace_owner),email:String(user.email),displayName:profile.displayName||String(user.full_name),avatarUrl:profile.avatarUrl,fullName:String(user.full_name),role:user.role as Role,memberId:user.member_id?String(user.member_id):null,position:String(user.position||''),programIds};
}
export async function createSession(userId:string,remember:boolean){if(!env.DB)throw Error('Database belum tersedia.');const token=randomBytes(32).toString('base64url'),maxAge=remember?30*86400:8*3600;await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires,created) VALUES(?,?,?,?)').bind(digest(token),userId,new Date(Date.now()+maxAge*1000).toISOString(),new Date().toISOString()).run();const jar=await cookies();jar.set(sessionCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge});return token}
