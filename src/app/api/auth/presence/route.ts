import {getAuthenticatedUser} from '@/lib/auth';
import {json} from '@/lib/account-access';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getAuthenticatedUser();
 if(!user)return json({error:'Sesi tidak aktif.'},401);
 return json({ok:true});
}
