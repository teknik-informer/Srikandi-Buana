"use client";

import { AppShell } from "@/components/app-shell";
import { DEMO_ACCOUNTS, type DemoIdentity } from "@/lib/identity";
import { NOTICES } from "@/data/organization";
import type { AppKey } from "@/config/apps";

/** Thin client wrapper so server layouts can mount the shared shell. */
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
  return (
    <AppShell
      identity={identity}
      accounts={DEMO_ACCOUNTS.map((a) => ({ key: a.key, label: a.label, scope: a.identity.scope }))}
      activeApp={activeApp}
      nav={nav}
      notices={NOTICES.map((n) => ({ id: n.id, title: n.title, date: n.date, href: n.href, unread: !n.read }))}
    >
      {children}
    </AppShell>
  );
}
