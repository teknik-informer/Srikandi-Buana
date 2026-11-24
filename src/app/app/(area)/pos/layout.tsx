import { requireIdentity, can } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity("pos:sell");
  const canViewBusiness = can(identity, "field:usaha:read");
  const canViewFinance = can(identity, "finance:read");
  const items = [
    { label: "Kasir", href: "/app/pos" },
    ...(canViewBusiness ? [{ label: "Katalog & Pesanan", href: "/app/bidang/usaha/data" }] : []),
    ...(canViewFinance ? [{ label: "Jurnal terkait", href: "/app/keuangan/jurnal" }] : []),
  ];
  const shortcuts = [
    ...(canViewBusiness ? [{ label: "Bidang Usaha", href: "/app/bidang/usaha" }] : []),
    { label: "Semua aplikasi", href: "/app" },
  ];

  return (
    <CoreShell identity={identity} activeApp="pos" nav={[
      { label: "POS", items },
      { label: "Pintasan", items: shortcuts },
    ]}>
      {children}
    </CoreShell>
  );
}
