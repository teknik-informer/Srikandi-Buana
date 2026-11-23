import { requireIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { CORE_NAV } from "@/config/apps";

export default async function KeuanganLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity("finance:read");
  return (
    <CoreShell
      identity={identity}
      activeApp="keuangan"
      nav={[
        {
          label: "Keuangan Native",
          items: CORE_NAV.keuangan.map((i) => ({
            ...i,
            badge: i.label === "Kas & Bank" ? 1 : undefined,
          })),
        },
        { label: "Pintasan", items: [
          { label: "Posting rule & kontrol", href: "/app/keuangan/pengaturan" },
          { label: "Dana & program", href: "/app/keuangan/anggaran" },
          { label: "Semua aplikasi", href: "/app" },
        ] },
      ]}
    >
      {children}
    </CoreShell>
  );
}
