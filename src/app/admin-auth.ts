import {getAuthenticatedUser} from '@/lib/auth';

/** Technical platform owner. This role is not an organizational approver. */
export async function getAdminUser(){
 const u=await getAuthenticatedUser();
 return u?.role==='admin'?u:null;
}

/** Platform owner and elected Chair can administer external-access and controlled export services. */
export async function getGovernanceAdminUser(){
 const u=await getAuthenticatedUser();
 return u&&['admin','ketua'].includes(u.role)?u:null;
}

/** Source documents contain member identities and are available only to the Secretariat. */
export async function getSecretariatUser(){
 const u=await getAuthenticatedUser();
 return u?.role==='sekretaris'?u:null;
}

/** Public enquiries are handled by the Secretariat and Chair; the platform owner has audited operational access. */
export async function getMessageManagerUser(){
 const u=await getAuthenticatedUser();
 return u&&['admin','ketua','sekretaris'].includes(u.role)?u:null;
}
