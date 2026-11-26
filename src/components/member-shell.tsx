"use client";

import { AppShell } from "@/components/app-shell";
import { SearchProvider } from "@/components/search-dialog";
import type { AppIdentity } from "@/lib/identity";
import { CORE_NAV } from "@/config/apps";

export function MemberShell({
  identity,
  children,
  showPublicActivities,
  showPublicProducts,
}: {
  identity: AppIdentity;
  children: React.ReactNode;
  showPublicActivities: boolean;
  showPublicProducts: boolean;
}) {
  const nav = [
    { label: "Portal Anggota", items: CORE_NAV.anggota },
    {
      label: "Pintasan",
      items: [
        ...(showPublicActivities ? [{ label: "Agenda publik", href: "/kegiatan" }] : []),
        ...(showPublicProducts ? [{ label: "Produk", href: "/produk" }] : []),
        { label: "Semua aplikasi", href: "/app" },
      ],
    },
  ];
  return (
    <SearchProvider identity={identity}>
      <AppShell
        identity={identity}
        accounts={[]}
        activeApp="anggota"
        nav={nav}
        notices={[]}
      >
        {children}
      </AppShell>
    </SearchProvider>
  );
}
