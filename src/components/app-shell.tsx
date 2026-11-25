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
import { canAccessApp } from "@/lib/app-access";
import { AppIcon } from "@/components/brand";
import { SearchProvider, SearchButton } from "@/components/search-dialog";
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
  const availableApps = APPS.filter((candidate) => canAccessApp(identity, candidate.key));

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
        <div className="sb-bar flex h-[68px] items-center gap-1 sm:gap-2 lg:gap-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Buka navigasi"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* ONE brand, transparent, directly on the bar — the white tile read
              as a sticker. `wordmark-on-dark` is the same lock-up with the
              green serif recoloured for dark backgrounds; the emblem keeps the
              organisation's own animation and colour. */}
          <Link
            href="/app"
            aria-label="Srikandi Buana — beranda aplikasi"
            className="inline-flex shrink-0 items-center rounded-md transition hover:opacity-90"
          >
            {/* Transparent lock-up: the gold emblem keeps its colour, the
                green serif is recoloured white for the dark bar. One image at
                every size — the emblem alone read as a broken logo on phones. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/wordmark-on-dark.png"
              alt="Srikandi Buana"
              width={900}
              height={329}
              className="h-[32px] w-auto sm:h-[36px] lg:h-[42px]"
              decoding="async"
              fetchPriority="high"
            />
          </Link>

          {/* Right cluster — the previous site's model: create, then a compact
              search button that opens the search dialog (also ⌘K), then the
              bell and the person. The bar itself stays clean. */}
          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/app/cepat" className="hidden items-center gap-1 rounded-full bg-[#7ddc93] px-3.5 py-2 text-[12px] font-bold text-[#0e2a16] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)] transition hover:bg-[#9ae8ac] sm:inline-flex">
              <Plus size={14} /> Buat
            </Link>

            <SearchButton />

            {/* notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setBell((v) => !v); setLauncher(false); setUser(false); }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d2b18]/55 text-white ring-1 ring-inset ring-white/20 hover:bg-[#0d2b18]/80"
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
                    {notices.length ? (
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
                    ) : (
                      <div className="px-4 py-4 text-[11.5px] leading-relaxed text-muted">
                        Layanan notifikasi belum diaktifkan. Pemberitahuan akan muncul di sini setelah layanan tersedia.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* user */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setUser((v) => !v); setLauncher(false); setBell(false); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0d2b18]/55 py-1 pl-1 pr-2.5 ring-1 ring-inset ring-white/20 hover:bg-[#0d2b18]/80"
                aria-expanded={user}
                aria-label="Menu akun"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e6c56a] text-[11px] font-bold text-[#2a1f00]">
                  {identity.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="hidden text-left sm:block" data-contrast-bg="#12301c">
                  <span className="block text-[11.5px] font-semibold leading-tight text-white">{identity.name}</span>
                  <span className="block text-[9.5px] leading-tight text-[#d3e6d7]">{identity.role}</span>
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
        {/* ── SIDEBAR — the app's own navigation. Deliberately carries NO second
               logo: the brand lives once, in the topbar. This panel opens by
               saying which application you are in. ── */}
        <aside
          className={`no-print fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col overflow-hidden border-r border-line bg-white pt-[68px] transition-transform lg:sticky lg:top-[68px] lg:h-[calc(100dvh-68px)] lg:pt-0 lg:translate-x-0 ${
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
          }`}
        >
          {/* ── APLIKASI AKTIF — the app switcher lives here, inside the
                 sidebar, as a card that mirrors the banner: same deep green,
                 same photographic tint. The topbar keeps only the brand, the
                 search and the person. ── */}
          <div className="relative z-20 shrink-0 px-2.5 pb-2 pt-2 sm:px-3">
            <button
              type="button"
              onClick={() => { setLauncher((v) => !v); }}
              aria-expanded={launcher}
              aria-label={`Aplikasi aktif: ${app.short}. Ganti aplikasi`}
              className="group relative flex w-full overflow-hidden rounded-[14px] text-left shadow-[0_10px_24px_-16px_rgba(9,32,19,0.9)] ring-1 ring-inset ring-white/10 transition hover:ring-white/25 lg:h-[124px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-kebun.jpg"
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover object-[60%_45%] transition duration-500 group-hover:scale-[1.03]"
                decoding="async"
              />
              <span className="absolute inset-0 bg-[linear-gradient(105deg,rgba(9,32,19,0.94)_0%,rgba(12,45,26,0.86)_58%,rgba(14,54,30,0.62)_100%)]" aria-hidden />
              {/* copy plate first, so it sits BEHIND the words (a scrim drawn
                  after the text dimmed it instead of backing it) */}
              <span className="pointer-events-none absolute inset-y-0 left-0 w-[86%] bg-[linear-gradient(90deg,rgba(9,32,19,0.90)_0%,rgba(9,32,19,0.80)_64%,rgba(9,32,19,0)_100%)]" aria-hidden />
              <span className="relative flex h-full w-full items-center gap-2.5 px-2.5 py-3 lg:px-3 lg:py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#0d2b18]/85 text-[#e4f6e8] ring-1 ring-inset ring-white/25">
                  <AppIcon name={app.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1" data-contrast-bg="#0c2a16">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[#a6dab2]">Aplikasi aktif</span>
                  <span className="mt-0.5 block truncate font-display text-[14px] font-bold leading-tight text-white">{app.short}</span>
                  {/* font-sans: the display face's "&" is the ampersand above */}
                  <span className="mt-[1px] block font-sans text-[10px] leading-[1.25] text-[#dbeadf]">{app.audience}</span>
                </span>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0d2b18]/70 text-white ring-1 ring-inset ring-white/25">
                  <ChevronDown size={13} className={`transition ${launcher ? "rotate-180" : ""}`} />
                </span>
              </span>

            </button>

            {launcher && (
              <>
                <button
                  type="button"
                  aria-label="Tutup daftar aplikasi"
                  onClick={() => setLauncher(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute left-2.5 right-2.5 top-full z-50 mt-1.5 sm:left-3 sm:right-3">
                  <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_28px_60px_-24px_rgba(15,26,43,0.45)] animate-rise">
                    <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted2">Ganti aplikasi</span>
                      <span className="text-[10px] text-muted2">{availableApps.length} tersedia</span>
                    </div>
                    <ul className="max-h-[min(62dvh,420px)] overflow-y-auto p-1.5">
                      {availableApps.map((a) => {
                        const active = a.key === activeApp;
                        return (
                          <li key={a.key}>
                            <Link
                              href={a.href}
                              className={`flex items-center gap-2.5 rounded-[9px] px-2 py-1.5 transition ${
                                active ? "bg-[#eaf6ec] ring-1 ring-inset ring-[#cfe6d3]" : "hover:bg-paper"
                              }`}
                            >
                              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[7px] ${active ? "bg-[#127e2f] text-white" : "bg-surface2 text-ink2"}`}>
                                <AppIcon name={a.icon} size={13} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12px] font-semibold text-ink">{a.short}</span>
                                <span className="block truncate text-[10px] text-muted">{a.audience}</span>
                              </span>
                              {active ? <Check size={13} className="shrink-0 text-[#127e2f]" /> : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-line bg-paper px-3.5 py-1.5 text-[10px] leading-snug text-muted2">
                      Aplikasi muncul sesuai kewenangan.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Everything below the pinned card scrolls; the card never does. */}
          <div className="sb-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <nav className="px-2.5 pb-3 pt-1 sm:px-3.5" aria-label="Navigasi aplikasi">
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
                          className={`group flex items-center gap-2.5 rounded-[10px] px-2 py-[9px] text-[12.5px] transition sm:px-2.5 ${
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

          <div className="mx-2.5 mb-2.5 rounded-[12px] border border-line bg-white p-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted2">Profil & keanggotaan</div>
            <div className="mt-1.5 text-[12px] font-semibold text-ink">Kelola informasi pribadi</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Periksa dan perbarui informasi profil melalui ruang anggota. Data kelengkapan akan ditampilkan setelah terhubung ke sumber data profil.
            </p>
            <Link href="/app/anggota/profil" className="mt-2 inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[10.5px] font-semibold text-ink2 hover:border-primary-300 hover:text-primary-800">
              Lihat Profil <ArrowRight size={11} />
            </Link>
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
          </div>
        </aside>

        {mobileOpen && <button type="button" className="fixed inset-0 z-20 bg-black/30 lg:hidden" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} />}

        {/* ── MAIN ── one container, shared with the topbar, so the content
               column lines up with the brand mark above it at every width. */}
        <main className="min-w-0 flex-1">
          <div className="sb-main-col py-5 sm:py-6">{children}</div>

          {/* status bar — the reference closes the page with an honest stamp */}
          <div className="sb-main-col pb-6">
            <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-white px-4 py-2.5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#22a34a] shadow-[0_0_0_3px_rgba(34,163,74,0.16)]" />
                <strong className="font-semibold text-ink">Sesi terverifikasi</strong>
                <span className="text-muted2">|</span>
                <span>Akun dan hak akses diperiksa melalui server</span>
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
