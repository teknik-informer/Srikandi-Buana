"use client";

import { StoreProvider, type Actor } from "@/lib/store";
import { Toaster } from "@/components/act";
import { AppShell } from "@/components/app-shell";
import { SearchProvider } from "@/components/search-dialog";
import type { DemoIdentity } from "@/lib/identity";
import type { AppKey } from "@/config/apps";

/**
 * Shared workspace chrome. The legacy StoreProvider remains mounted while
 * unmigrated client screens are retired, but it is not an authority for
 * navigation badges or notifications. Layouts must supply server-backed
 * navigation metadata; unsupported notification delivery stays visibly off.
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
  const actor: Actor = {
    key: identity.memberId,
    name: identity.name,
    role: identity.role,
    scope: identity.scope,
  };

  return (
    <StoreProvider actor={actor}>
      <SearchProvider>
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
    </StoreProvider>
  );
}
