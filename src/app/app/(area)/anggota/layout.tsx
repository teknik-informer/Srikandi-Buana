import { requireIdentity } from "@/lib/session";
import { MemberShell } from "@/components/member-shell";

export default async function AnggotaLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity("member:self");
  return <MemberShell identity={identity}>{children}</MemberShell>;
}
