import {randomBytes} from 'node:crypto';
import {env} from './runtime';
import {digest} from './auth';
import {roles,type Role} from './permissions';
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export const sameOrigin=(r:Request)=>r.headers.get('origin')===new URL(r.url).origin;
export function accessInput(raw:Record<string,unknown>){const role=String(raw.role||'anggota') as Role;if(!(role in roles)||role==='admin')throw Error('Pilih peran anggota atau pengurus. Akun administrator pemilik tetap dilindungi.');const position=String(raw.position||'').trim();if(position.length>120)throw Error('Jabatan maksimal 120 karakter.');const list=raw.programIds??[];if(!Array.isArray(list)||list.length>9||list.some(p=>typeof p!=='string'||!/[1-9]/.test(p)||p.length!==1))throw Error('Program penugasan tidak valid.');const programIds=role==='koordinator'?[...new Set(list as string[])]:[];if(role==='koordinator'&&!programIds.length)throw Error('Pilih setidaknya satu program untuk koordinator.');return {role,position,programIds}}
export async function accessAudit(owner:string,actor:string,action:string,target:string){if(!env.DB)throw Error('Database belum tersedia.');return env.DB.prepare('INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,actor,action,target,new Date().toISOString())}
export function inviteToken(){const token=randomBytes(32).toString('base64url');return {token,hash:digest(token)}}
export function activationLink(request:Request,token:string){const base=new URL(process.env.APP_URL||new URL(request.url).origin);if(base.protocol!=='https:'&&base.hostname!=='localhost')throw Error('Alamat aplikasi harus HTTPS.');return new URL('/aktivasi',base).toString()+'#token='+token}
