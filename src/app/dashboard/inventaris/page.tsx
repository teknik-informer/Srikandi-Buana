import {getAuthenticatedUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import WorkspaceShell from '@/app/_components/workspace-shell';
import InventoryWorkspace from '@/app/_components/inventory-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Inventaris dan Kartu Stok | Srikandi Buana',robots:{index:false,follow:false}};
export default async function Page(){
 const user=await getAuthenticatedUser();
 if(!user)redirect('/masuk?return_to=/dashboard/inventaris');
 if(!['admin','ketua','bendahara'].includes(user.role))redirect('/dashboard');
 return <WorkspaceShell user={user} section="inventaris" title="Inventaris & Kartu Stok"><InventoryWorkspace role={user.role}/></WorkspaceShell>;
}
