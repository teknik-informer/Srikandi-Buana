import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";

/**
 * Guard-only layout for everything under /app. Route groups below it mount the
 * actual shells: (launcher) for shared pages, (area) for pengurus, keuangan,
 * sekretariat, bidang, anggota and POS.
 */
export default async function AppRootLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  return <>{children}</>;
}
