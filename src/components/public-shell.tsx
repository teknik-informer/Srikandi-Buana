"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, Search, ShieldCheck, X } from "lucide-react";
import { MEGA_MENU, MEGA_TAGLINE, FOOTER_MENU } from "@/config/navigation";
import { ORG, DEMO_BANNER } from "@/config/org";
import { AppIcon, Wordmark } from "@/components/brand";

const slug = (s: string) => s.toLowerCase();

/** Does the current path belong to this menu group? (longest-prefix wins) */
function matches(items: { href: string }[], pathname: string) {
  return items.some((i) => {
    const base = i.href.split("?")[0].split("#")[0];
    return base !== "/" && (pathname === base || pathname.startsWith(base + "/"));
  });
}

export function PublicHeader() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  /**
   * Hovering already opens a panel; if the pointer then *clicks* the trigger the
   * naive toggle would close what the hover just opened. Remember when hover
   * opened it and let that click be a no-op.
   */
  const hoverAt = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openOnHover = useCallback((heading: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    hoverAt.current = Date.now();
    setOpen(heading);
  }, []);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  }, []);
  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
    setPalette(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
        setPalette(false);
      }
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close a panel on an outside click, the way the old site did.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <div className="no-print bg-[#123d32] px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-primary-100">
        {DEMO_BANNER}{" "}
        <Link href="/masuk" className="underline decoration-primary-400 underline-offset-2 hover:text-white">
          Masuk demo
        </Link>
      </div>

      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div ref={navRef} className="relative mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="flex h-[68px] items-center justify-between gap-4">
            <Link href="/" aria-label="Srikandi Buana — beranda" className="shrink-0" onMouseEnter={() => setOpen(null)}>
              {/* taller lock-up on desktop, compact on phones */}
              <span className="hidden sm:block"><Wordmark height={46} /></span>
              <span className="sm:hidden"><Wordmark compact /></span>
            </Link>

            {/* ── desktop nav: Beranda · Produk · four grouped panels ── */}
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Menu utama">
              <Link
                href="/"
                onMouseEnter={() => setOpen(null)}
                className={`inline-flex items-center rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition ${
                  pathname === "/" ? "text-[#123d32]" : "text-ink2 hover:text-[#123d32]"
                }`}
              >
                Beranda
                {pathname === "/" && <span className="ml-1.5 h-1 w-1 rounded-full bg-[#c8992e]" />}
              </Link>
              <Link
                href="/produk"
                onMouseEnter={() => setOpen(null)}
                className={`inline-flex items-center rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition ${
                  matches([{ href: "/produk" }], pathname) ? "text-[#123d32]" : "text-ink2 hover:text-[#123d32]"
                }`}
              >
                Produk
              </Link>
              {MEGA_MENU.map((group) => {
                const isActive = matches(group.items, pathname);
                const isOpen = open === group.heading;
                return (
                  <button
                    key={group.heading}
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={`public-mega-${slug(group.heading)}`}
                    onMouseEnter={() => setOpen(group.heading)}
                    onFocus={() => setOpen(group.heading)}
                    onClick={() => setOpen(isOpen ? null : group.heading)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition ${
                      isOpen || isActive ? "text-[#123d32]" : "text-ink2 hover:text-[#123d32]"
                    }`}
                  >
                    {group.heading}
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                );
              })}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-[12.5px] font-medium text-muted transition hover:border-primary-300 hover:text-ink"
                aria-label="Cari di situs"
              >
                <Search size={14} />
                <span className="hidden xl:inline">Cari</span>
                <kbd className="hidden rounded border border-line bg-[#fafaf9] px-1.5 py-0.5 font-sans text-[10px] text-muted2 xl:inline">⌘K</kbd>
              </button>
              <Link href="/kontak" className="sb-btn sb-btn-primary !px-4 !py-2 text-[13px]">
                Hubungi kami
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/masuk"
                aria-label="Masuk ruang kerja pengelola"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-[#123d32] transition hover:border-primary-300 hover:bg-primary-50"
              >
                <ShieldCheck size={16} />
              </Link>
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink lg:hidden"
              aria-label={mobile ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobile}
              onClick={() => setMobile((v) => !v)}
            >
              {mobile ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>

          {/* page dimmer behind the open panel */}
          {open ? (
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setOpen(null)}
              className="fixed inset-x-0 bottom-0 top-[calc(68px+var(--sb-ribbon,0px))] -z-10 hidden cursor-default bg-[#0f2417]/12 backdrop-blur-[1.5px] lg:block"
            />
          ) : null}

          {/* ── mega panels (one at a time, 270px feature aside + columns) ── */}
          {MEGA_MENU.map((group) => {
            const isOpen = open === group.heading;
            if (!isOpen) return null;
            return (
              <div
                key={group.heading}
                id={`public-mega-${slug(group.heading)}`}
                className="public-mega absolute inset-x-4 top-full z-50 hidden overflow-hidden rounded-b-[12px] border border-t-0 border-[#e7e5e4] bg-white shadow-[0_18px_35px_rgba(18,61,50,0.12)] lg:inset-x-6 lg:block"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="grid grid-cols-[270px_1fr]">
                  <aside className="border-r border-[#e7e5e4] bg-[#fbfcfb] px-6 py-6">
                    <Wordmark height={38} />
                    <div className="mt-6 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">
                      {group.feature.eyebrow}
                    </div>
                    <h2 className="mt-2 font-display text-[25px] leading-[1.15] text-[#123d32]">
                      {group.feature.title}
                    </h2>
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink2">{group.feature.body}</p>
                    <Link
                      href={group.feature.href}
                      onClick={() => setOpen(null)}
                      className="mt-5 text-[12.5px] font-semibold leading-snug text-[#123d32] underline-offset-4 hover:underline"
                    >
                      {group.feature.linkLabel}{" "}
                      <ArrowUpRight size={12} className="inline align-[-1px]" aria-hidden />
                    </Link>
                  </aside>

                  <div className={`grid gap-x-6 px-6 py-6 ${group.columns.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                    {group.columns.map((col) => (
                      <section key={col.heading}>
                        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">{col.heading}</h3>
                        <ul className="mt-3 space-y-1">
                          {col.items.map((item) => (
                            <li key={item.href + item.label}>
                              <Link
                                href={item.href}
                                onClick={() => setOpen(null)}
                                className="group flex items-start gap-2.5 rounded-[9px] px-2 py-2 transition hover:bg-[#f4f8f3]"
                              >
                                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#e7ede6] bg-white text-[#123d32]">
                                  <AppIcon name={item.icon ?? "file"} size={15} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <strong className="block text-[12.5px] font-semibold leading-snug text-ink group-hover:text-[#123d32]">
                                    {item.label}
                                  </strong>
                                  {item.desc ? (
                                    <small className="block text-[11px] leading-snug text-muted">{item.desc}</small>
                                  ) : null}
                                </span>
                                {item.external ? (
                                  <ArrowUpRight size={12} className="mt-1 shrink-0 text-muted2" />
                                ) : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-[#e7e5e4] px-6 py-2.5">
                  <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted2">{MEGA_TAGLINE}</span>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="!inline-flex shrink-0 flex-nowrap items-center gap-1.5 whitespace-nowrap !py-0 text-[11.5px] font-semibold leading-tight text-ink2 hover:text-[#123d32]"
                    aria-label={`Tutup submenu ${group.heading}`}
                  >
                    Tutup <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* mobile drawer */}
        {mobile && (
          <div className="max-h-[78vh] overflow-y-auto border-t border-line bg-white px-4 pb-6 pt-3 lg:hidden">
            <Link href="/" className="flex items-center justify-between border-b border-line py-2.5 text-[14px] font-semibold text-ink">
              Beranda <ArrowRight size={14} className="text-muted2" />
            </Link>
            <Link href="/produk" className="flex items-center justify-between border-b border-line py-2.5 text-[14px] font-semibold text-ink">
              Produk <ArrowRight size={14} className="text-muted2" />
            </Link>
            {MEGA_MENU.map((group) => (
              <details key={group.heading} className="group border-b border-line py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-ink">
                  {group.heading}
                  <ChevronDown size={15} className="text-muted2 transition group-open:rotate-180" />
                </summary>
                <div className="mt-2 space-y-3 pb-1">
                  {group.columns.map((col) => (
                    <div key={col.heading}>
                      <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted2">{col.heading}</div>
                      {col.items.map((item) => (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[13px] text-ink2"
                        >
                          <AppIcon name={item.icon ?? "file"} size={14} className="text-[#123d32]" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            ))}
            <div className="mt-4 flex gap-2">
              <Link href="/kontak" className="sb-btn sb-btn-primary flex-1">Hubungi kami</Link>
              <Link href="/masuk" className="sb-btn sb-btn-outline flex-1">Masuk</Link>
            </div>
          </div>
        )}
      </header>

      {palette && <SitePalette onClose={() => setPalette(false)} />}
    </>
  );
}

/**
 * ⌘K search. The old site showed the shortcut without a working field; here it
 * filters the real public pages and navigates, so the affordance is honest.
 */
function SitePalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const entries = useMemo(
    () => [
      { label: "Beranda", href: "/", desc: "Halaman utama" },
      { label: "Katalog produk", href: "/produk", desc: "Kopi, madu, gula aren, olahan kebun" },
      ...MEGA_MENU.flatMap((g) => g.items.map((i) => ({ label: i.label, href: i.href, desc: i.desc ?? g.heading }))),
      { label: "Masuk ruang kerja", href: "/masuk", desc: "Akun demo pengurus, sekretariat, bendahara" },
      { label: "Portal mitra", href: "/portal", desc: "Akses eksternal terbatas" },
    ],
    [],
  );

  const hits = entries.filter((e) =>
    `${e.label} ${e.desc}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-[#123d32]/40 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Cari di situs"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_28px_60px_-24px_rgba(18,61,50,0.45)]">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={16} className="text-muted2" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) go(hits[0].href); }}
            placeholder="Cari halaman: profil, program, pelatihan, kontak…"
            aria-label="Kata kunci"
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-muted2"
          />
          <button type="button" onClick={onClose} aria-label="Tutup pencarian" className="text-muted2 hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <ul className="max-h-[46vh] overflow-y-auto p-1.5">
          {hits.slice(0, 8).map((h) => (
            <li key={h.href + h.label}>
              <button
                type="button"
                onClick={() => go(h.href)}
                className="flex w-full items-center justify-between gap-3 rounded-[9px] px-3 py-2 text-left hover:bg-[#f4f8f3]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{h.label}</span>
                  <span className="block truncate text-[11px] text-muted">{h.desc}</span>
                </span>
                <ArrowRight size={13} className="shrink-0 text-muted2" />
              </button>
            </li>
          ))}
          {hits.length === 0 && (
            <li className="px-3 py-6 text-center text-[12.5px] text-muted">
              Tidak ada halaman yang cocok. Coba “program”, “produk”, atau “kontak”.
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-line bg-[#fbfcfb] px-4 py-2 text-[10.5px] text-muted2">
          <span>Enter membuka hasil pertama · Esc menutup</span>
          <kbd className="rounded border border-line bg-white px-1.5 py-0.5">⌘K</kbd>
        </div>
      </div>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="no-print border-t border-white/10 bg-[#123d32] text-primary-100">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <span className="inline-flex items-center gap-2.5 rounded-[10px] bg-white px-3 py-2">
              <Wordmark height={38} />
            </span>
            <p className="mt-4 max-w-[26ch] text-[12.5px] leading-relaxed text-primary-200/90">
              {ORG.legalName}. {ORG.village}, {ORG.district}, {ORG.regency}, {ORG.province}.
            </p>
            <p className="mt-3 text-[12px] text-primary-300/90">{ORG.address}</p>
            <p className="mt-2 text-[12px] text-primary-300/90">
              {ORG.email} · {ORG.hours}
            </p>
          </div>
          {FOOTER_MENU.map((group) => (
            <div key={group.heading}>
              <div className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary-300">{group.heading}</div>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link href={item.href} className="text-[12.5px] text-primary-200/95 transition hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-[11.5px] text-primary-100/90 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {ORG.legalName}. Seluruh hak dilindungi.</p>
          <p>Blueprint {ORG.docVersion} · Lingkungan demo · Data contoh berlabel</p>
        </div>
      </div>
    </footer>
  );
}
