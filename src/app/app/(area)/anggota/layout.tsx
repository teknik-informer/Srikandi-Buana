import { requireIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { CORE_NAV } from "@/config/apps";

export default async function AnggotaLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity("member:self");
  return (
    <CoreShell
      identity={identity}
      activeApp="anggota"
      nav={[
        { label: "Portal Anggota", items: CORE_NAV.anggota },
        { label: "Pintasan", items: [
          { label: "Agenda publik", href: "/kegiatan" },
          { label: "Katalog produk", href: "/produk" },
          { label: "Semua aplikasi", href: "/app" },
        ] },
      ]}
    >
      {children}
    </CoreShell>
  );
}
