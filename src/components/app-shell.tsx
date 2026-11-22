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
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [launcher, setLauncher] = useState(false);
  const [bell, setBell] = useState(false);
  const [user, setUser] = useState(false);
  const unread = notices.filter((n) => n.unread).length;
  const app = APPS.find((a) => a.key === activeApp)!;

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
      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper">
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
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] text-ink2 md:inline-flex">
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
                className="w-full rounded-lg border border-line bg-white py-1.5 pl-8 pr-3 text-[12px] text-ink placeholder:text-muted2 focus:border-primary-400 focus:outline-none"
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink2 hover:border-primary-300 md:hidden"
          >
            <Search size={16} />
          </Link>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link href="/app/cepat" className="hidden items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[12px] font-semibold text-primary-50 transition hover:bg-primary-800 sm:inline-flex">
              <Plus size={14} /> Buat
            </Link>

            {/* notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setBell((v) => !v); setLauncher(false); setUser(false); }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink2 hover:border-primary-300"
                aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
                aria-expanded={bell}
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-bold text-[#241500]">
                    {unread}
                  </span>
                )}
              </button>
              {bell && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(92vw,360px)]">
                  <div className="sb-card animate-rise overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                      <span className="text-[12px] font-semibold text-ink">Notifikasi</span>
                      <Link href="/app/notifikasi" className="text-[11px] font-semibold text-primary-700">Lihat semua</Link>
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white py-1 pl-1 pr-2 hover:border-primary-300"
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
          className={`no-print fixed inset-y-0 left-0 z-30 w-[248px] overflow-y-auto border-r border-line bg-paper pt-[58px] transition-transform lg:sticky lg:top-[58px] lg:h-[calc(100dvh-58px)] lg:translate-x-0 ${
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
          }`}
        >
          <nav className="px-3 py-4" aria-label="Navigasi aplikasi">
            <div className="mb-3 flex items-center gap-2 rounded-sb-sm bg-primary-50 px-2.5 py-2">
              <AppIcon name={app.icon} size={15} className="text-primary-700" />
              <div className="min-w-0">
                <div className="truncate text-[11.5px] font-bold text-primary-900">{app.short}</div>
                <div className="truncate text-[10px] text-primary-700/80">{app.audience}</div>
              </div>
            </div>
            {nav.map((group, gi) => (
              <div key={gi} className="mb-4">
                {group.label ? (
                  <div className="mb-1 px-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted2">{group.label}</div>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href + "/"));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between gap-2 rounded-[7px] px-2 py-[7px] text-[12.5px] transition ${
                            active
                              ? "bg-primary text-primary-50 font-semibold"
                              : "font-medium text-ink2 hover:bg-surface2"
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {item.badge ? (
                            <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-primary-700 text-white" : "bg-accent-100 text-accent-700"}`}>
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
          <div className="sticky bottom-0 border-t border-line bg-paper px-3 py-3">
            <Link href="/app" className="flex items-center justify-between rounded-sb-sm px-2 py-1.5 text-[11px] font-semibold text-muted hover:bg-surface2">
              Semua aplikasi <ChevronRight size={12} />
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
