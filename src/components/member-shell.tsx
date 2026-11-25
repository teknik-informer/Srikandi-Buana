"use client";

import { AppShell } from "@/components/app-shell";
import { SearchProvider } from "@/components/search-dialog";
import type { AppIdentity } from "@/lib/identity";
import { CORE_NAV } from "@/config/apps";

const NAV = [
  { label: "Portal Anggota", items: CORE_NAV.anggota },
  {
    label: "Pintasan",
    items: [
      { label: "Agenda publik", href: "/kegiatan" },
      { label: "Katalog produk", href: "/produk" },
      { label: "Semua aplikasi", href: "/app" },
    ],
  },
];

export function MemberShell({
  identity,
  children,
}: {
  identity: AppIdentity;
  children: React.ReactNode;
}) {
  return (
    <SearchProvider identity={identity}>
      <AppShell
        identity={identity}
        accounts={[]}
        activeApp="anggota"
        nav={NAV}
        notices={[]}
      >
        {children}
      </AppShell>
    </SearchProvider>
  );
}
