import { requireIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity("pos:sell");
  return (
    <CoreShell
      identity={identity}
      activeApp="pos"
      nav={[
        { label: "POS", items: [
          { label: "Kasir", href: "/app/pos" },
          { label: "Katalog & Pesanan", href: "/app/bidang/usaha/data" },
          { label: "Jurnal terkait", href: "/app/keuangan/jurnal" },
        ] },
        { label: "Pintasan", items: [
          { label: "Bidang Usaha", href: "/app/bidang/usaha" },
          { label: "Semua aplikasi", href: "/app" },
        ] },
      ]}
    >
      {children}
    </CoreShell>
  );
}
