import {getAuthenticatedUser} from '@/lib/auth';
export async function getAdminUser(){const u=await getAuthenticatedUser();return u?.role==='admin'?u:null}

/** Organization super-admin: the elected Chair or the protected technical owner. */
export async function getGovernanceAdminUser(){
 const u=await getAuthenticatedUser();
 return u&&["admin","ketua"].includes(u.role)?u:null;
}

/** Secretariat inbox: operational messages are handled by the Chair, system owner, or Secretary. */
export async function getMessageManagerUser(){
 const u=await getAuthenticatedUser();
 return u&&["admin","ketua","sekretaris"].includes(u.role)?u:null;
}
