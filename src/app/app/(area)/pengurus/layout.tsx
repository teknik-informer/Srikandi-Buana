import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { CORE_NAV } from "@/config/apps";
import { APPROVALS } from "@/data/organization";

export default async function PengurusLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();

  if (!identity) redirect("/masuk");
  const pending = APPROVALS.filter((a) => a.status === "menunggu" || a.status === "revisi").length;

  return (
    <CoreShell
      identity={identity}
      activeApp="pengurus"
      nav={[
        {
          label: "Pengurus Harian",
          items: CORE_NAV.pengurus.map((i) => ({
            ...i,
            badge: i.label === "Persetujuan" ? pending : undefined,
          })),
        },
        {
          label: "Pintasan",
          items: [
            { label: "Aplikasi bidang", href: "/app/bidang" },
            { label: "Keuangan ringkas", href: "/app/keuangan" },
            { label: "Semua aplikasi", href: "/app" },
          ],
        },
      ]}
    >
      {children}
    </CoreShell>
  );
}
