import { requireIdentity } from "@/lib/session";

export default async function AppRootLayout({ children }: { children: React.ReactNode }) {
  await requireIdentity();
  return <>{children}</>;
}
