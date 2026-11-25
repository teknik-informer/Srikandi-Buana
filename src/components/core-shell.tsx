"use client";

import { Toaster } from "@/components/act";
import { AppShell } from "@/components/app-shell";
import { SearchProvider } from "@/components/search-dialog";
import type { DemoIdentity } from "@/lib/identity";
import type { AppKey } from "@/config/apps";

/**
 * Shared workspace chrome. Operational pages use server-backed domain data.
 * The browser demo store is deliberately not mounted in active workspaces.
 * Legacy demo components remain isolated and are not an operational source.
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
  return (
    <>
      <SearchProvider identity={identity}>
        <AppShell
          identity={identity}
          accounts={[]}
          activeApp={activeApp}
          nav={nav}
          notices={[]}
        >
          {children}
        </AppShell>
      </SearchProvider>
      <Toaster />
    </>
  );
}
