import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { CORE_NAV } from "@/config/apps";
import { orgSummary } from "@/lib/org-summary";

export default async function PengurusLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();

  if (!identity) redirect("/masuk");
  // Badge sidebar harus mencerminkan antrean yang benar-benar menunggu
  // keputusan pengurus, bukan konstanta.
  const { approvals } = await orgSummary();
  const pending = approvals.filter((a) => a.status === "menunggu" || a.status === "revisi").length;

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
