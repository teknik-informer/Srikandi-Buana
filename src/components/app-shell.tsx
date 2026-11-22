"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Bell, ChevronDown, ChevronRight, LogOut, Menu, Plus, Search, X, Check,
} from "lucide-react";
import { APPS, type AppKey } from "@/config/apps";
import { AppIcon, Wordmark } from "@/components/brand";
import { switchContext } from "@/app/actions/auth";
import type { DemoIdentity } from "@/lib/identity";
import { useStoreOptional } from "@/lib/store";

interface NavItem { label: string; href: string; badge?: number }
interface NavGroup { label?: string; items: NavItem[] }

export function AppShell({
  identity,
  accounts,
  activeApp,
  nav,
  notices,
  children,
}: {
  identity: DemoIdentity;
  accounts: { key: string; label: string; scope: string }[];
  activeApp: AppKey;
  nav: NavGroup[];
  notices: { id: string; title: string; date: string; href?: string; unread: boolean }[];
  children: React.ReactNode;
  fallbackNotices?: number;
}) {
  const pathname = usePathname();
  // Optional: shells can mount outside a StoreProvider (public/preview), in
  // which case "mark all read" is simply hidden rather than crashing the page.
  const store = useStoreOptional();
  const markAllRead = () => store?.dispatch({ type: "notice.readAll" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [launcher, setLauncher] = useState(false);
  const [bell, setBell] = useState(false);
  const [user, setUser] = useState(false);
  const unread = notices.filter((n) => n.unread).length;
  const app = APPS.find((a) => a.key === activeApp)!;

  /**
   * Only one nav item may look active. A parent route like `/app/pengurus`
   * is a prefix of every child route, so the winner is the most specific
   * href that matches — exact match first, then the longest prefix.
   */
  const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));
  const activeHref =
    allHrefs.find((h) => h === pathname) ??
    allHrefs
      .filter((h) => pathname.startsWith(h + "/"))
      .sort((a, b) => b.length - a.length)[0] ??
    "";

  useEffect(() => {
    setMobileOpen(false);
    setLauncher(false);
    setBell(false);
    setUser(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLauncher(false); setBell(false); setUser(false); setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ── TOPBAR ── */}
      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex h-[58px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink2 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Buka navigasi"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link href="/app" className="hidden shrink-0 sm:block" aria-label="Srikandi Buana">
            <Wordmark compact />
          </Link>

          {/* app switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setLauncher((v) => !v); setBell(false); setUser(false); }}
              aria-expanded={launcher}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-left transition hover:border-primary-300"
            >
              <AppIcon name={app.icon} size={15} className="text-primary-700" />
              <span className="hidden max-w-[170px] truncate text-[12.5px] font-semibold text-ink sm:block">{app.short}</span>
              <ChevronDown size={13} className="text-muted" />
            </button>
            {launcher && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-[min(92vw,560px)]">
                <div className="sb-card animate-rise overflow-hidden">
                  <div className="border-b border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    Aplikasi &amp; cakupan Anda
                  </div>
                  <div className="grid max-h-[60vh] gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                    {APPS.map((a) => {
                      const active = a.key === activeApp;
                      return (
                        <Link
                          key={a.key}
                          href={a.href}
                          className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-2 transition ${
                            active ? "bg-primary-50 ring-1 ring-primary-200" : "hover:bg-surface2"
                          }`}
                        >
                          <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${active ? "bg-primary text-primary-50" : "bg-surface2 text-ink2"}`}>
                            <AppIcon name={a.icon} size={14} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-semibold text-ink">{a.short}</span>
                            <span className="block text-[10.5px] text-muted">{a.audience}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="border-t border-line bg-paper px-4 py-2 text-[10.5px] text-muted2">
                    Aplikasi hanya muncul sesuai kewenangan. Menonaktifkan modul tidak menghapus data historis.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* context */}
          <span className="hidden items-center gap-1.5 rounded-full bg-[var(--sb-surface-2)] px-3 py-1.5 text-[11.5px] text-ink2 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            Konteks: <span className="font-semibold">{identity.scope}</span>
          </span>

          {/* search (desktop field · compact icon on phones) */}
          <div className="ml-auto hidden max-w-[260px] flex-1 items-center md:flex">
            <label className="relative w-full">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted2" />
              <input
                type="search"
                placeholder="Cari data, orang, dokumen…"
                aria-label="Cari"
                className="w-full rounded-full border border-transparent bg-[var(--sb-surface-2)] py-2 pl-8 pr-3 text-[12px] text-ink placeholder:text-muted2 focus:border-primary-400 focus:bg-white focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (q) window.location.href = `/app/cari?q=${encodeURIComponent(q)}`;
                  }
                }}
              />
            </label>
          </div>
          <Link
            href="/app/cari"
            aria-label="Cari"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink2 hover:border-primary-300 md:hidden"
          >
            <Search size={16} />
          </Link>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link href="/app/cepat" className="hidden items-center gap-1 rounded-full bg-[var(--sb-primary-700)] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(18,126,47,0.55)] transition hover:bg-[var(--sb-primary-800)] sm:inline-flex">
              <Plus size={14} /> Buat
            </Link>

            {/* notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setBell((v) => !v); setLauncher(false); setUser(false); }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink2 hover:border-primary-300"
                aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
                aria-expanded={bell}
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sb-accent-500)] px-1 text-[9.5px] font-bold text-[#241500]">
                    {unread}
                  </span>
                )}
              </button>
              {bell && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(92vw,360px)]">
                  <div className="sb-card animate-rise overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                      <span className="text-[12px] font-semibold text-ink">Notifikasi</span>
                      <div className="flex items-center gap-2">
                        {unread > 0 && store ? (
                          <button
                            type="button"
                            onClick={markAllRead}
                            className="inline-flex min-h-[28px] items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-primary-700 hover:bg-primary-50"
                          >
                            <Check size={12} /> Tandai dibaca
                          </button>
                        ) : null}
                        <Link href="/app/notifikasi" className="text-[11px] font-semibold text-primary-700">Lihat semua</Link>
                      </div>
                    </div>
                    <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
                      {notices.slice(0, 5).map((n) => (
                        <li key={n.id}>
                          <Link href={n.href ?? "/app/notifikasi"} className="block px-4 py-2.5 hover:bg-paper">
                            <div className="flex items-start gap-2">
                              {n.unread ? <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> : <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                              <div>
                                <div className="text-[12px] font-medium leading-snug text-ink">{n.title}</div>
                                <div className="mt-0.5 text-[10.5px] text-muted2">{n.date}</div>
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* user */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setUser((v) => !v); setLauncher(false); setBell(false); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 hover:border-primary-300"
                aria-expanded={user}
                aria-label="Menu akun"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-800">
                  {identity.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[11.5px] font-semibold leading-tight text-ink">{identity.name}</span>
                  <span className="block text-[9.5px] leading-tight text-muted">{identity.role}</span>
                </span>
                <ChevronDown size={12} className="hidden text-muted sm:block" />
              </button>
              {user && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(92vw,300px)]">
                  <div className="sb-card animate-rise overflow-hidden">
                    <div className="border-b border-line px-4 py-3">
                      <div className="text-[12.5px] font-semibold text-ink">{identity.name}</div>
                      <div className="text-[11px] text-muted">{identity.role} · {identity.scope}</div>
                      <div className="mt-1.5 text-[10.5px] leading-snug text-muted2">{identity.note}</div>
                    </div>
                    <div className="px-2 py-2">
                      <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Ganti konteks (demo)</div>
                      <ul className="max-h-[220px] overflow-y-auto">
                        {accounts.map((a) => (
                          <li key={a.key}>
                            <form action={switchContext.bind(null, a.key)}>
                              <button
                                type="submit"
                                className="flex w-full items-center justify-between gap-2 rounded-[7px] px-2 py-1.5 text-left text-[11.5px] text-ink2 hover:bg-surface2"
                              >
                                <span>{a.label}</span>
                                {a.key === identity.memberId ? <Check size={12} className="text-primary-700" /> : null}
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t border-line px-2 py-2">
                      <Link href="/app/anggota/profil" className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 text-[11.5px] text-ink2 hover:bg-surface2">Profil &amp; preferensi</Link>
                      <Link href="/bantuan" className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 text-[11.5px] text-ink2 hover:bg-surface2">Pusat bantuan</Link>
                      <Link href="/keluar" className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 text-[11.5px] font-semibold text-[var(--sb-danger)] hover:bg-[var(--sb-danger-bg)]">
                        <LogOut size={13} /> Keluar
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── SIDEBAR ── */}
        <aside
          className={`no-print fixed inset-y-0 left-0 z-30 w-[248px] overflow-y-auto bg-[var(--sb-primary-900)] pt-[58px] transition-transform lg:sticky lg:top-[58px] lg:h-[calc(100dvh-58px)] lg:translate-x-0 ${
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
          }`}
        >
          <nav className="px-3 py-4" aria-label="Navigasi aplikasi">
            <div className="mb-4 flex items-center gap-2.5 rounded-[12px] bg-white/10 px-3 py-2.5 ring-1 ring-inset ring-white/10">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white/15 text-primary-100">
                <AppIcon name={app.icon} size={16} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold text-white">{app.short}</div>
                <div className="truncate text-[10px] text-primary-200/90">{app.audience}</div>
              </div>
            </div>
            {nav.map((group, gi) => (
              <div key={gi} className="mb-4">
                {group.label ? (
                  <div className="mb-1.5 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary-200/70">{group.label}</div>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = activeHref === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between gap-2 rounded-[10px] px-2.5 py-[9px] text-[12.5px] transition ${
                            active
                              ? "bg-[var(--sb-primary-700)] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]"
                              : "font-medium text-primary-100/85 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {item.badge ? (
                            <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-[var(--sb-accent-500)] text-[#241500]"}`}>
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="sticky bottom-0 border-t border-white/10 bg-[var(--sb-primary-900)] px-3 py-3">
            <Link href="/app" className="flex items-center justify-between rounded-[10px] px-2.5 py-2 text-[11.5px] font-semibold text-primary-200/90 transition hover:bg-white/10 hover:text-white">
              Semua aplikasi <ChevronRight size={13} />
            </Link>
          </div>
        </aside>

        {mobileOpen && <button type="button" className="fixed inset-0 z-20 bg-black/30 lg:hidden" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} />}

        {/* ── MAIN ── */}
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
