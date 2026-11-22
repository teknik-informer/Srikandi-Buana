"use client";

import { AppShell } from "@/components/app-shell";
import { DEMO_ACCOUNTS, type DemoIdentity } from "@/lib/identity";
import { NOTICES } from "@/data/organization";
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

  return (
    <AppShell
      identity={identity}
      accounts={DEMO_ACCOUNTS.map((a) => ({ key: a.key, label: a.label, scope: a.identity.scope }))}
      activeApp={field ? FIELD_APP_KEY[fieldSlug] ?? "organisasi" : "organisasi"}
      nav={nav}
      notices={NOTICES.map((n) => ({ id: n.id, title: n.title, date: n.date, href: n.href, unread: !n.read }))}
    >
      {children}
    </AppShell>
  );
}
