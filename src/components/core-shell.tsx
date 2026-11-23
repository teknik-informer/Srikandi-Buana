"use client";

import { useStore, StoreProvider, type Actor } from "@/lib/store";
import { Toaster } from "@/components/act";
import { AppShell } from "@/components/app-shell";
import { SearchProvider } from "@/components/search-dialog";
import { DEMO_ACCOUNTS, type DemoIdentity } from "@/lib/identity";
import { NOTICES } from "@/data/organization";
import type { AppKey } from "@/config/apps";

/**
 * Client wrapper that mounts the shared operational store for an app area, so
 * every screen can act on the same data. `seedNotices` keeps the chrome's
 * notification popover in step with the store on first paint.
 */
export function CoreShell({
  identity,
  activeApp,
  nav,
  children,
}: {
  identity: DemoIdentity;
  activeApp: AppKey;
  nav: { label?: string; items: { label: string; href: string; badge?: number }[] }[];
  children: React.ReactNode;
}) {
  const accountKey = DEMO_ACCOUNTS.find((a) => a.identity.memberId === identity.memberId)?.key ?? "ketua";
  const actor: Actor = {
    key: accountKey,
    name: identity.name,
    role: identity.role,
    scope: identity.scope,
  };

  return (
    <StoreProvider actor={actor}>
      <SearchProvider>
        <LiveChrome identity={identity} activeApp={activeApp} nav={nav}>
          {children}
        </LiveChrome>
      </SearchProvider>
      <Toaster />
    </StoreProvider>
  );
}

/** Read the live store so the bell badge reflects notices the user just read. */
function LiveChrome({
  identity,
  activeApp,
  nav,
  children,
}: {
  identity: DemoIdentity;
  activeApp: AppKey;
  nav: { label?: string; items: { label: string; href: string; badge?: number }[] }[];
  children: React.ReactNode;
}) {
  const { state } = useStore();
  const liveBadges = nav.map((group) => ({
    ...group,
    items: group.items.map((i) => {
      if (i.href === "/app/pengurus/persetujuan") {
        const n = state.approvals.filter((a) => a.status === "menunggu").length;
        return { ...i, badge: n || undefined };
      }
      if (i.href === "/app/sekretariat/verifikasi") {
        const n = state.approvals.filter((a) => a.status === "revisi").length;
        return { ...i, badge: n || undefined };
      }
      if (i.href === "/app/keuangan/jurnal") {
        const n = state.drafts.length;
        return { ...i, badge: n || undefined };
      }
      if (i.href === "/app/sekretariat/surat") {
        const n = state.letters.filter((l) => l.status === "baru").length;
        return { ...i, badge: n || undefined };
      }
      return i;
    }),
  }));

  return (
    <AppShell
      identity={identity}
      accounts={DEMO_ACCOUNTS.map((a) => ({ key: a.key, label: a.label, scope: a.identity.scope }))}
      activeApp={activeApp}
      nav={liveBadges}
      notices={state.notices.map((n) => ({
        id: n.id,
        title: n.title,
        date: n.date,
        href: n.href,
        unread: !n.read,
      }))}
      fallbackNotices={NOTICES.length}
    >
      {children}
    </AppShell>
  );
}
