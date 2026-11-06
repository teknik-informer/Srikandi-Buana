import {getAuthenticatedUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import WorkspaceShell from '@/app/_components/workspace-shell';
import {CommerceWorkspace} from '@/app/_components/ecosystem-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Katalog dan Pemesanan | Srikandi Buana',robots:{index:false,follow:false}};
export default async function Page(){const user=await getAuthenticatedUser();if(!user)redirect('/masuk?return_to=/dashboard/penjualan');return <WorkspaceShell user={user} section="penjualan" title="Katalog dan Pemesanan"><CommerceWorkspace role={user.role}/></WorkspaceShell>}
