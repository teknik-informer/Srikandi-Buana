import {getAuthenticatedUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
import WorkspaceShell from '@/app/_components/workspace-shell';
import NotificationCenter from '@/app/_components/notification-center';
export const dynamic='force-dynamic';
export const metadata={title:'Notifikasi | Srikandi Buana',robots:{index:false,follow:false}};
export default async function Page(){const user=await getAuthenticatedUser();if(!user)redirect('/masuk?return_to=/dashboard/notifikasi');return <WorkspaceShell user={user} section="notifikasi" title="Notifikasi"><NotificationCenter/></WorkspaceShell>}
