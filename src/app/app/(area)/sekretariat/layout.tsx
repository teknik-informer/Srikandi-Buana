import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { CORE_NAV } from "@/config/apps";

export default async function SekretariatLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();

  if (!identity) redirect("/masuk");
  return (
    <CoreShell
      identity={identity}
      activeApp="sekretariat"
      nav={[
        { label: "Sekretariat", items: CORE_NAV.sekretariat },
        { label: "Pintasan", items: [
          { label: "Website Studio", href: "/studio/website" },
          { label: "Pengurus Harian", href: "/app/pengurus" },
          { label: "Semua aplikasi", href: "/app" },
        ] },
      ]}
    >
      {children}
    </CoreShell>
  );
}
