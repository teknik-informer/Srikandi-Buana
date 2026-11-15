import {getAuthenticatedUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import WorkspaceShell from '@/app/_components/workspace-shell';
import {AccountingWorkspace} from '@/app/_components/ecosystem-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Akuntansi dan Buku Besar | Srikandi Buana',robots:{index:false,follow:false}};
export default async function Page(){const user=await getAuthenticatedUser();if(!user)redirect('/masuk?return_to=/dashboard/akuntansi');if(!['ketua','sekretaris','bendahara'].includes(user.role))redirect('/dashboard');return <WorkspaceShell user={user} section="akuntansi" title="Akuntansi dan Buku Besar"><AccountingWorkspace role={user.role}/></WorkspaceShell>}
