import {getAuthenticatedUser} from '@/lib/auth';
export async function getAdminUser(){const u=await getAuthenticatedUser();return u?.role==='admin'?u:null}
