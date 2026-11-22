"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, ChevronDown, ChevronRight, LogOut, Menu, Plus, Search, X, Check,
  Settings, Mail, FileText, ListChecks, BarChart3, Activity, Target,
  ClipboardCheck, CalendarDays, Users, Network, SlidersHorizontal, Home,
  CircleHelp, ArrowUpRight, ArrowRight, Facebook, Instagram, Youtube,
} from "lucide-react";
import { APPS, type AppKey } from "@/config/apps";
import { AppIcon } from "@/components/brand";
import { switchContext } from "@/app/actions/auth";
import { MEMBERS } from "@/data/organization";
import { demoNow } from "@/lib/store";
import type { DemoIdentity } from "@/lib/identity";
import { useStoreOptional } from "@/lib/store";

interface NavItem { label: string; href: string; badge?: number }
interface NavGroup { label?: string; items: NavItem[] }

/* Icon per route — the reference sidebar shows a glyph on every row. */
function navIcon(href: string) {
  const tail = href.split("/").filter(Boolean).pop() ?? "";
  const MAP: Record<string, typeof Home> = {
    pengurus: Home, sekretariat: Mail, keuangan: FileText, anggota: Users, pos: Target,
    dashboard: Home, struktur: Network, anggotaorg: Users, bidang: SlidersHorizontal,
    program: Target, persetujuan: ClipboardCheck, rapat: CalendarDays, dokumen: FileText,
    tugas: ListChecks, laporan: BarChart3, indikator: Activity, pengaturan: Settings,
    profil: Users, agenda: CalendarDays, komunitas: Users, kontribusi: Target,
  };
  return MAP[tail] ?? Home;
}

/** "22 Nov 2026, 09:15 WIB" — deterministic demo clock, never `new Date()`. */
function demoStamp() {
  const d = demoNow();
  const p = (n: number) => String(n).padStart(2, "0");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  // demoNow is +07:00; shift to WIB wall clock for display
  const wib = new Date(d.getTime() + 7 * 3600_000);
  return `${wib.getUTCDate()} ${MONTHS[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${p(wib.getUTCHours())}:${p(wib.getUTCMinutes())} WIB`;
}

/** Honest profile completeness: share of member fields that are actually filled. */
function profileCompleteness(memberId: string) {
  const m = MEMBERS.find((x) => x.id === memberId);
  if (!m) return { pct: 0, label: "Belum terhubung" };
  const checks = [
    !!m.name, !!m.role && m.role !== "—", !!m.scope && m.scope !== "—",
    !!m.village, !!m.joined, !!m.phone, (m.interests?.length ?? 0) > 0, !!m.status,
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const label = pct >= 90 ? "Sangat baik" : pct >= 70 ? "Baik" : "Perlu dilengkapi";
  return { pct, label };
}

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
  const profile = profileCompleteness(identity.memberId);

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
    <div className="min-h-dvh bg-[#f7f9fc]">
      {/* ── TOPBAR — deep green, matching the reference dashboard ── */}
      <header className="no-print sticky top-0 z-40 bg-[#14351f] text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex h-[58px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Buka navigasi"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* compact mark on phones, full lock-up from lg up */}
          <Link href="/app" className="inline-flex shrink-0 items-center rounded-[9px] bg-white p-1 lg:hidden" aria-label="Beranda aplikasi">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="" aria-hidden width={63} height={96} className="h-6 w-auto" decoding="async" />
          </Link>

          {/* On the deep-green bar the full-colour lock-up would put dark green
              type on dark green, so the emblem + wordmark are set in the light
              duotone the brand block already uses. */}
          <Link href="/app" className="hidden shrink-0 items-center gap-2 lg:flex" aria-label="Beranda aplikasi">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/emblem-light.png" alt="" aria-hidden width={167} height={256} className="h-7 w-auto" decoding="async" />
            <span className="leading-none">
              <span className="block font-display text-[15px] font-extrabold tracking-tight text-white">Srikandi</span>
              <span className="block font-display text-[12px] font-extrabold tracking-[0.18em] text-[#e6c56a]">BUANA</span>
            </span>
          </Link>

          {/* app switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setLauncher((v) => !v); setBell(false); setUser(false); }}
              aria-expanded={launcher}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-left ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
            >
              <AppIcon name={app.icon} size={15} className="text-[#bfe3c6]" />
              <span className="hidden max-w-[170px] truncate text-[12.5px] font-semibold text-white sm:block">{app.short}</span>
              <ChevronDown size={13} className="text-white/70" />
            </button>
            {launcher && (
              <div className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,560px)]">
                <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_28px_60px_-24px_rgba(15,26,43,0.4)] animate-rise">
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

          {/* scope pill */}
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] text-white/85 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7ddc93]" />
            Konteks: <span className="font-semibold text-white">{identity.scope}</span>
          </span>

          {/* search — wide pill like the reference, ⌘K opens the same field */}
          <div className="ml-auto hidden max-w-[380px] flex-1 items-center md:flex">
            <label className="relative w-full">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/55" />
              <input
                type="search"
                placeholder="Cari data, orang, dokumen…"
                aria-label="Cari"
                className="w-full rounded-full border border-white/15 bg-white/10 py-2 pl-8 pr-12 text-[12px] text-white placeholder:text-white/55 focus:border-[#7ddc93] focus:bg-white/15 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (q) window.location.href = `/app/cari?q=${encodeURIComponent(q)}`;
                  }
                }}
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-white/20 px-1.5 py-0.5 font-sans text-[9.5px] text-white/60 lg:block">⌘K</kbd>
            </label>
          </div>
          <Link
            href="/app/cari"
            aria-label="Cari"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15 md:hidden"
          >
            <Search size={16} />
          </Link>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link href="/app/cepat" className="hidden items-center gap-1 rounded-full bg-[#7ddc93] px-3.5 py-2 text-[12px] font-bold text-[#0e2a16] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)] transition hover:bg-[#9ae8ac] sm:inline-flex">
              <Plus size={14} /> Buat
            </Link>

            {/* notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setBell((v) => !v); setLauncher(false); setUser(false); }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15 hover:bg-white/20"
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
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)]">
                  <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_28px_60px_-24px_rgba(15,26,43,0.4)] animate-rise">
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
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-2.5 ring-1 ring-inset ring-white/15 hover:bg-white/20"
                aria-expanded={user}
                aria-label="Menu akun"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e6c56a] text-[11px] font-bold text-[#2a1f00]">
                  {identity.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[11.5px] font-semibold leading-tight text-white">{identity.name}</span>
                  <span className="block text-[9.5px] leading-tight text-white/70">{identity.role}</span>
                </span>
                <ChevronDown size={12} className="hidden text-white/70 sm:block" />
              </button>
              {user && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,300px)]">
                  <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_28px_60px_-24px_rgba(15,26,43,0.4)] animate-rise">
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
        {/* ── SIDEBAR — white surface, green brand block, grouped rows ── */}
        <aside
          className={`no-print fixed inset-y-0 left-0 z-30 w-[264px] overflow-y-auto border-r border-line bg-white pt-[58px] transition-transform lg:sticky lg:top-[58px] lg:h-[calc(100dvh-58px)] lg:translate-x-0 ${
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
          }`}
        >
          {/* brand block */}
          <div className="relative overflow-hidden bg-[#14351f] px-4 pb-5 pt-4 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{ backgroundImage: "radial-gradient(circle at 82% 10%, #7ddc93 0, transparent 55%), radial-gradient(circle at 10% 110%, #e6c56a 0, transparent 50%)" }}
            />
            <div className="relative flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/emblem-light.png" alt="" aria-hidden width={167} height={256} className="h-11 w-auto" />
              <span className="leading-none">
                <span className="block font-display text-[17px] font-extrabold tracking-tight">Srikandi</span>
                <span className="block font-display text-[15px] font-extrabold tracking-[0.16em] text-[#e6c56a]">BUANA</span>
              </span>
            </div>
            <div className="relative mt-2.5 text-[10px] font-medium tracking-[0.02em] text-white/70">
              Bersama Membangun Negeri
            </div>
          </div>

          <nav className="px-2.5 py-3" aria-label="Navigasi aplikasi">
            <div className="mb-2 flex items-center gap-2.5 rounded-[12px] bg-[#f2f7ef] px-3 py-2 ring-1 ring-inset ring-[#e0ebdd]">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-700 text-white">
                <AppIcon name={app.icon} size={16} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold text-[#14351f]">{app.short}</div>
                <div className="truncate text-[10px] text-muted">{app.audience}</div>
              </div>
            </div>
            {nav.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-3 border-t border-line pt-3" : "mt-1"}>
                {group.label ? (
                  <div className="mb-1.5 px-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted2">{group.label}</div>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = activeHref === item.href;
                    const Icon = navIcon(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[12.5px] transition ${
                            active
                              ? "bg-[#127e2f] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(18,126,47,0.9)]"
                              : "font-medium text-ink2 hover:bg-[#f4f7f2] hover:text-[#14351f]"
                          }`}
                        >
                          <Icon size={15} strokeWidth={1.9} className={active ? "text-white" : "text-[#5f7a5c] group-hover:text-[#127e2f]"} aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {(item.badge ?? 0) > 0 ? (
                            <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-[var(--sb-accent-500)] text-[#241500]"}`}>
                              {item.badge}
                            </span>
                          ) : active ? null : (
                            <ChevronRight size={12} className="text-muted2 opacity-0 transition group-hover:opacity-100" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Quick actions — the reference sidebar keeps its calls to action
              above the profile block, not at the very bottom of a long scroll. */}
          <div className="px-2.5 pb-1">
            <div className="mb-1.5 px-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted2">Pintasan cepat</div>
            <div className="grid grid-cols-2 gap-1.5">
              <Link href="/app/pengurus/persetujuan" className="flex items-center gap-1.5 rounded-[9px] border border-line bg-white px-2 py-1.5 text-[11px] font-semibold text-ink2 transition hover:border-primary-300 hover:text-primary-800">
                <ClipboardCheck size={13} className="text-[#127e2f]" /> Persetujuan
                {(nav.flatMap((g) => g.items).find((i) => i.href === "/app/pengurus/persetujuan")?.badge ?? 0) > 0 ? (
                  <span className="ml-auto rounded-full bg-[var(--sb-accent-500)] px-1.5 text-[9.5px] font-bold text-[#241500]">
                    {nav.flatMap((g) => g.items).find((i) => i.href === "/app/pengurus/persetujuan")?.badge}
                  </span>
                ) : null}
              </Link>
              <Link href="/app/keuangan/jurnal" className="flex items-center gap-1.5 rounded-[9px] border border-line bg-white px-2 py-1.5 text-[11px] font-semibold text-ink2 transition hover:border-primary-300 hover:text-primary-800">
                <FileText size={13} className="text-[#1f6fd0]" /> Jurnal
              </Link>
            </div>
          </div>

          {/* workspace completeness — ring from real member fields */}
          <div className="mx-2.5 mb-2.5 rounded-[12px] border border-line bg-white p-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted2">Workspace Anda</div>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="relative grid h-[62px] w-[62px] shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#127e2f 0 ${profile.pct}%, #e9b91c ${profile.pct}% ${Math.min(profile.pct + 4, 100)}%, #e8eee6 ${Math.min(profile.pct + 4, 100)}% 100%)`,
                }}
                role="img"
                aria-label={`Kelengkapan profil ${profile.pct} persen`}
              >
                <span className="grid h-[48px] w-[48px] place-items-center rounded-full bg-white font-display text-[14px] font-extrabold text-[#14351f]">
                  {profile.pct}%
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-ink">Profil Lengkap</div>
                <div className="text-[11px] text-muted">{profile.label}</div>
                <Link href="/app/anggota/profil" className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[10.5px] font-semibold text-ink2 hover:border-primary-300 hover:text-primary-800">
                  Lihat Profil <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>

          {/* help card */}
          <div className="mx-2.5 mb-3 overflow-hidden rounded-[12px] bg-[#eaf6ec] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[12px] font-bold text-[#14351f]">Butuh Bantuan?</div>
                <div className="text-[10.5px] text-[#3f5d42]">Pusat Bantuan &amp; FAQ</div>
                <Link href="/bantuan" className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-[#14351f] shadow-sm ring-1 ring-[#d6e6d8] hover:bg-[#f7fbf7]">
                  <CircleHelp size={11} /> Hubungi Kami
                </Link>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#127e2f] text-white">
                <CircleHelp size={16} />
              </span>
            </div>
          </div>

          <div className="border-t border-line px-2.5 py-2.5">
            <Link href="/app" className="flex items-center justify-between rounded-[10px] px-2.5 py-2 text-[11.5px] font-semibold text-ink2 transition hover:bg-[#f4f7f2] hover:text-[#14351f]">
              Semua aplikasi <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>

        {mobileOpen && <button type="button" className="fixed inset-0 z-20 bg-black/30 lg:hidden" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} />}

        {/* ── MAIN ── */}
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[1240px]">{children}</div>

          {/* status bar — the reference closes the page with an honest stamp */}
          <div className="mx-auto mt-8 max-w-[1240px]">
            <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-white px-4 py-2.5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#22a34a] shadow-[0_0_0_3px_rgba(34,163,74,0.16)]" />
                <strong className="font-semibold text-ink">Sistem Online</strong>
                <span className="text-muted2">|</span>
                <span>Terakhir diperbarui: {demoStamp()}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="hidden sm:inline">Srikandi Buana © 2026 | Desa Ngadimulyo, Kec. Kedu, Kab. Temanggung</span>
                <span className="flex items-center gap-0.5 text-muted2">
                  <Link href="/galeri" aria-label="Dokumentasi kegiatan" className="inline-flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-[#f4f7f2] hover:text-[#14351f]"><Youtube size={14} /></Link>
                  <Link href="/kabar" aria-label="Kabar kelompok" className="inline-flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-[#f4f7f2] hover:text-[#14351f]"><Facebook size={14} /></Link>
                  <Link href="/kegiatan" aria-label="Agenda kegiatan" className="inline-flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-[#f4f7f2] hover:text-[#14351f]"><Instagram size={14} /></Link>
                  <Link href="/kontak" aria-label="Kontak" className="inline-flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-[#f4f7f2] hover:text-[#14351f]"><Mail size={14} /></Link>
                </span>
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
