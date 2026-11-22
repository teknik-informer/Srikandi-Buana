"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X, ArrowRight } from "lucide-react";
import { MEGA_MENU, FOOTER_MENU } from "@/config/navigation";
import { ORG, DEMO_BANNER } from "@/config/org";
import { Wordmark } from "@/components/brand";

export function PublicHeader() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (heading: string) =>
    MEGA_MENU.find((g) => g.heading === heading)?.items.some((i) =>
      pathname === i.href.split("?")[0] || (i.href !== "/" && pathname.startsWith(i.href.split("?")[0]) && i.href.split("?")[0].length > 1),
    );

  return (
    <>
      {/* demo ribbon */}
      <div className="no-print bg-primary-900 px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-primary-100">
        {DEMO_BANNER}{" "}
        <Link href="/masuk" className="underline decoration-primary-400 underline-offset-2 hover:text-white">
          Masuk demo
        </Link>
      </div>

      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-[62px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Srikandi Buana — beranda">
            <Wordmark />
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Menu utama">
            {MEGA_MENU.map((group) => {
              const active = isActive(group.heading);
              const isOpen = open === group.heading;
              return (
                <div
                  key={group.heading}
                  className="relative"
                  onMouseEnter={() => setOpen(group.heading)}
                  onMouseLeave={() => setOpen(null)}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpen(isOpen ? null : group.heading)}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-[13px] font-semibold transition ${
                      active ? "text-primary-800" : "text-ink2 hover:text-primary-800"
                    }`}
                  >
                    {group.heading}
                    <ChevronDown size={13} className={`transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="absolute left-1/2 top-full w-[420px] -translate-x-1/2 pt-2">
                      <div className="sb-card animate-rise overflow-hidden p-2">
                        {group.items.map((item) => (
                          <Link
                            key={item.href + item.label}
                            href={item.href}
                            className="group flex items-start gap-3 rounded-[9px] px-3 py-2.5 transition hover:bg-primary-50"
                          >
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400 transition group-hover:bg-accent" />
                            <span>
                              <span className="block text-[13px] font-semibold text-ink group-hover:text-primary-800">
                                {item.label}
                              </span>
                              {item.desc ? <span className="block text-[11.5px] text-muted">{item.desc}</span> : null}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/gabung" className="sb-btn sb-btn-primary !px-4 !py-2 text-[12.5px]">
              Bergabung
              <ArrowRight size={14} />
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

        {/* mobile drawer */}
        {mobile && (
          <div className="max-h-[75vh] overflow-y-auto border-t border-line bg-paper px-4 pb-5 pt-2 lg:hidden">
            {MEGA_MENU.map((group) => (
              <div key={group.heading} className="border-b border-line py-2.5 last:border-0">
                <div className="sb-label mb-1.5">{group.heading}</div>
                <div className="grid grid-cols-1 gap-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className="rounded-md px-2 py-1.5 text-[13.5px] font-medium text-ink2 hover:bg-primary-50"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-4 flex gap-2">
              <Link href="/gabung" className="sb-btn sb-btn-primary flex-1">Minat bergabung</Link>
              <Link href="/masuk" className="sb-btn sb-btn-outline flex-1">Masuk</Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="no-print mt-16 border-t border-line bg-primary-950 text-primary-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <Wordmark light />
            <p className="mt-4 max-w-[26ch] text-[12.5px] leading-relaxed text-primary-200/80">
              {ORG.legalName}. {ORG.village}, {ORG.district}, {ORG.regency}, {ORG.province}.
            </p>
            <p className="mt-3 text-[12px] text-primary-300/70">{ORG.address}</p>
            <p className="mt-2 text-[12px] text-primary-300/70">
              {ORG.email} · {ORG.hours}
            </p>
          </div>
          {FOOTER_MENU.map((group) => (
            <div key={group.heading}>
              <div className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary-300">{group.heading}</div>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link href={item.href} className="text-[12.5px] text-primary-200/85 transition hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-primary-800 pt-5 text-[11.5px] text-primary-300/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {ORG.legalName}. Seluruh hak dilindungi.</p>
          <p>
            Blueprint {ORG.docVersion} · Lingkungan demo · Data contoh berlabel
          </p>
        </div>
      </div>
    </footer>
  );
}
