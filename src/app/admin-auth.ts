import {getAuthenticatedUser} from '@/lib/auth';

/** Technical platform owner. This role is not an organizational approver. */
export async function getAdminUser(){
 const u=await getAuthenticatedUser();
 return u?.role==='admin'?u:null;
}

/** Organizational authority is reserved to the elected Chair. */
export async function getGovernanceAdminUser(){
 const u=await getAuthenticatedUser();
 return u?.role==='ketua'?u:null;
}

/** Source documents contain member identities and are available only to the Secretariat. */
export async function getSecretariatUser(){
 const u=await getAuthenticatedUser();
 return u?.role==='sekretaris'?u:null;
}

/** Public enquiries are handled by the Secretariat, with Chair oversight. */
export async function getMessageManagerUser(){
 const u=await getAuthenticatedUser();
 return u&&['ketua','sekretaris'].includes(u.role)?u:null;
}
