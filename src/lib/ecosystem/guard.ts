import {getAuthenticatedUser} from '@/lib/auth';
import {env} from '@/lib/runtime';
import {sameOrigin,json} from '@/lib/account-access';
import type {Principal} from '@/lib/permissions';
export {json};
export async function required(request:Request,write=false):Promise<{user:Principal;db:NonNullable<typeof env.DB>;error?:never}|{error:Response;user?:never;db?:never}>{
 const user=await getAuthenticatedUser();if(!user)return {error:json({error:'Silakan masuk untuk melanjutkan.'},401)};
 if(write&&!sameOrigin(request))return {error:json({error:'Permintaan lintas situs ditolak.'},403)};
 if(!env.DB)return {error:json({error:'Database belum terhubung.'},503)};
 return {user,db:env.DB};
}
export function errorReply(error:unknown){return json({error:'Layanan belum dapat memproses permintaan. Periksa migrasi database staging.'},503)}
