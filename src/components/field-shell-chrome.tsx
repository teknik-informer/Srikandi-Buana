"use client";

import { StoreProvider, useStore, type Actor } from "@/lib/store";
import { Toaster } from "@/components/act";
import { AppShell } from "@/components/app-shell";
import { SearchProvider } from "@/components/search-dialog";
import { DEMO_ACCOUNTS, type DemoIdentity } from "@/lib/identity";

import { FIELDS_BY_SLUG, type FieldDef } from "@/config/fields";
import { fieldNav } from "@/config/field-nav";
import type { AppKey } from "@/config/apps";

const FIELD_APP_KEY: Record<string, AppKey> = {
  organisasi: "organisasi",
  pertanian: "pertanian",
  pelatihan: "pelatihan",
  usaha: "usaha",
};

export function FieldShellChrome({
  identity,
  fieldSlug,
  children,
}: {
  identity: DemoIdentity;
  fieldSlug: string;
  children: React.ReactNode;
}) {
  const field: FieldDef | undefined = FIELDS_BY_SLUG[fieldSlug];
  const nav = field
    ? [
        ...fieldNav(field).map((g) => ({
          label: g.label,
          items: g.items.map((i) => ({
            ...i,
            badge: i.href.endsWith("/tugas") ? 3 : i.href.endsWith("/anggaran") ? 1 : undefined,
          })),
        })),
        {
          label: "Lintas aplikasi",
          items: [
            { label: "Keuangan", href: "/app/keuangan" },
            { label: "Pengurus", href: "/app/pengurus" },
            { label: "Semua aplikasi", href: "/app" },
          ],
        },
      ]
    : [{ label: "Bidang", items: [{ label: "Peta bidang", href: "/app/bidang" }] }];

  const accountKey = DEMO_ACCOUNTS.find((a) => a.identity.memberId === identity.memberId)?.key ?? "ketua";
  const actor: Actor = { key: accountKey, name: identity.name, role: identity.role, scope: identity.scope };

  return (
    <StoreProvider actor={actor}>
      <SearchProvider>
        <ShellDalam
          identity={identity}
          activeApp={field ? FIELD_APP_KEY[fieldSlug] ?? "organisasi" : "organisasi"}
          nav={nav}
        >
          {children}
        </ShellDalam>
      </SearchProvider>
      <Toaster />
    </StoreProvider>
  );
}

/**
 * Cangkang bidang perlu membaca store dari dalam provider: notifikasi yang
 * baru diumumkan pengurus harus muncul di lonceng tanpa memuat ulang.
 */
function ShellDalam({
  identity,
  activeApp,
  nav,
  children,
}: {
  identity: DemoIdentity;
  activeApp: AppKey;
  nav: React.ComponentProps<typeof AppShell>["nav"];
  children: React.ReactNode;
}) {
  const { state } = useStore();
  return (
    <AppShell
      identity={identity}
      accounts={DEMO_ACCOUNTS.map((a) => ({ key: a.key, label: a.label, scope: a.identity.scope }))}
      activeApp={activeApp}
      nav={nav}
      notices={state.notices.map((n) => ({ id: n.id, title: n.title, date: n.date, href: n.href, unread: !n.read }))}
    >
      {children}
    </AppShell>
  );
}
