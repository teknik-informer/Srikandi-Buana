"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { ArrowUpRight, CornerDownLeft, Search, X } from "lucide-react";
import { APPS } from "@/config/apps";
import { AppIcon } from "@/components/brand";
import { searchAll, countHits, type SearchGroup } from "@/lib/search";
import { useStore } from "@/lib/store";

const TONE: Record<SearchGroup, string> = {
  Menu: "bg-[#eef4ff] text-[#1f4f8f]",
  Anggota: "bg-[#e8f2ff] text-[#1f5fa0]",
  Program: "bg-[#efe9ff] text-[#5b3fa8]",
  Produk: "bg-[#fff2e0] text-[#8a5a00]",
  Dokumen: "bg-[#e9f5ea] text-[#2c6b39]",
  Lahan: "bg-[#eaf6ec] text-[#127e2f]",
  Jurnal: "bg-[#fdeaea] text-[#a33a36]",
  Kabar: "bg-[#eef1f5] text-[#44516380]",
};

/** A few destinations worth reaching in one keystroke, mirroring the old
    site's "Akses cepat" row. */
const SHORTCUTS = [
  { href: "/app", label: "Beranda aplikasi", note: "Pusat kendali" },
  { href: "/app/pengurus/persetujuan", label: "Persetujuan", note: "Keputusan menunggu" },
  { href: "/app/keuangan/jurnal", label: "Jurnal keuangan", note: "Buku besar" },
  { href: "/app/sekretariat/dokumen", label: "Dokumen", note: "Arsip keputusan" },
];

/* ── shared state: one dialog, opened from the topbar or by ⌘K ───────────── */

interface SearchCtx { open: boolean; setOpen: (v: boolean) => void }
const Ctx = createContext<SearchCtx | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // the dialog owns the scroll lock while it is up
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const value = useMemo(() => ({ open, setOpen }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <SearchDialog />
    </Ctx.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(Ctx);
  // tolerate a page that renders the button outside the provider
  return ctx ?? { open: false, setOpen: () => {} };
}

/**
 * Topbar trigger. Position and shape are taken from the previous site: a
 * square icon button sitting in the right-hand action cluster, next to the
 * notifications and the account — not a wide field across the bar.
 */
export function SearchButton() {
  const { open, setOpen } = useSearch();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Cari anggota, program, produk, atau dokumen"
      aria-haspopup="dialog"
      aria-expanded={open}
      title="Cari · Ctrl/⌘ K"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d2b18]/55 text-white ring-1 ring-inset ring-white/20 transition hover:bg-[#0d2b18]/80"
    >
      <Search size={16} />
    </button>
  );
}

/* ── the dialog itself ─────────────────────────────────────────────────── */

function SearchDialog() {
  const { open, setOpen } = useSearch();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Pencarian membaca dokumen bersama lewat store. Sebelumnya indeks dibangun
  // sekali dari data benih, sehingga anggota/produk/surat yang baru dibuat
  // tidak pernah muncul.
  const { state, ready } = useStore();
  const groups = useMemo(
    () =>
      searchAll(q, 6, ready
        ? {
            members: state.members,
            documents: state.documents,
            programs: state.programs,
            products: state.products,
            lands: state.lands,
            journals: state.journals,
            letters: state.letters,
          }
        : null),
    [q, ready, state.members, state.documents, state.programs, state.products, state.lands, state.journals, state.letters],
  );
  const flat = useMemo(() => groups.flatMap((g) => g.hits).slice(0, 24), [groups]);

  const query = q.trim().toLowerCase();
  const apps = useMemo(
    () =>
      APPS.filter(
        (a) => !query || `${a.short} ${a.name} ${a.audience} ${a.description}`.toLowerCase().includes(query),
      ).slice(0, 6),
    [query],
  );

  // reset whenever it opens so the field is always ready to type into
  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => setCursor(0), [q]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  if (!open) return null;

  const shown = apps.slice(0, 4);
  const hits = flat.slice(0, 12);

  return (
    <div className="no-print fixed inset-0 z-[60]" role="presentation">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Tutup pencarian"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-[#05130b]/55 backdrop-blur-[2px]"
      />

      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian aplikasi"
        className="absolute left-1/2 top-[8vh] w-[min(92vw,780px)] -translate-x-1/2 overflow-hidden rounded-[18px] border border-[#d8e3da] bg-white shadow-[0_40px_90px_-30px_rgba(6,22,12,0.6)] animate-rise"
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-4">
          <div className="min-w-0">
            <h2 className="font-display text-[17px] font-bold leading-tight text-[#0e2a16]">Pencarian</h2>
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
              Cari anggota, program, produk, dokumen, lahan, jurnal — atau lompat ke aplikasi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup pencarian"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-[#f0f4ef] hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* the field — full width, tall, first thing inside the dialog */}
        <div className="px-5 pb-3 pt-2.5">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f7a5c]" />
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari anggota, program, produk, dokumen…"
              aria-label="Cari di seluruh aplikasi"
              autoComplete="off"
              role="combobox"
              aria-expanded="true"
              aria-controls="search-dialog-results"
              className="h-[46px] w-full rounded-[12px] border border-[#d8e3da] bg-[#f6f9f5] pl-10 pr-16 text-[13.5px] text-ink placeholder:text-[#5f7359] transition focus:border-[#127e2f] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#127e2f]/15"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, hits.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (hits[cursor]) go(hits[cursor].href);
                  else if (q.trim()) go(`/app/cari?q=${encodeURIComponent(q.trim())}`);
                }
              }}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#d8e3da] bg-white px-1.5 py-0.5 font-sans text-[10px] text-muted">
              Esc
            </kbd>
          </label>
        </div>

        <div id="search-dialog-results" className="max-h-[min(60dvh,520px)] overflow-y-auto border-t border-[#e7eee6]">
          {/* applications first — the same hierarchy the old dialog used */}
          {shown.length > 0 && (
            <section className="px-3.5 pt-3" aria-label="Aplikasi">
              <p className="px-1 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted2">Aplikasi</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {shown.map((a) => (
                  <Link
                    key={a.key}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-2.5 rounded-[10px] border border-[#e7eee6] bg-[#fbfdfa] px-2.5 py-2 transition hover:border-[#bcd9c2] hover:bg-white"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-[#eaf6ec] text-[#127e2f]">
                      <AppIcon name={a.icon} size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-ink">{a.short}</span>
                      <span className="block truncate text-[10px] text-muted">{a.audience}</span>
                    </span>
                    <ArrowUpRight size={13} className="shrink-0 text-muted2 transition group-hover:text-[#127e2f]" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* live results */}
          {q.trim().length >= 2 ? (
            hits.length ? (
              groups.map((g) => {
                const inGroup = g.hits.filter((h) => hits.includes(h));
                if (!inGroup.length) return null;
                return (
                  <section key={g.group} className="px-3.5 pt-3" aria-label={`Hasil ${g.group}`}>
                    <p className="px-1 pb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted2">{g.group}</p>
                    <ul>
                      {inGroup.map((h) => {
                        const idx = hits.indexOf(h);
                        return (
                          <li key={h.group + h.label + h.href}>
                            <Link
                              href={h.href}
                              onClick={() => setOpen(false)}
                              onMouseEnter={() => setCursor(idx)}
                              className={`flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition ${idx === cursor ? "bg-[#f0f7f1]" : "hover:bg-[#f7faf6]"}`}
                            >
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${TONE[h.group]}`}>{h.group}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-medium text-ink">{h.label}</span>
                                <span className="block truncate text-[10.5px] text-muted2">{h.meta}</span>
                              </span>
                              {idx === cursor ? <CornerDownLeft size={12} className="shrink-0 text-muted2" /> : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[12.5px] font-semibold text-ink">Tidak ada hasil untuk “{q.trim()}”</p>
                <p className="mt-1 text-[11px] text-muted2">Coba nama anggota, kode program, nomor jurnal, atau judul dokumen.</p>
              </div>
            )
          ) : null}

          {/* shortcuts — the old dialog's "Akses cepat" */}
          {q.trim().length < 2 ? (
            <section className="px-3.5 pt-3" aria-label="Akses cepat">
              <p className="px-1 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted2">Akses cepat</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {SHORTCUTS.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-2 rounded-[8px] px-2 py-1.5 transition hover:bg-[#f7faf6]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-ink">{s.label}</span>
                      <span className="block truncate text-[10px] text-muted2">{s.note}</span>
                    </span>
                    <ArrowUpRight size={13} className="shrink-0 text-muted2 transition group-hover:text-[#127e2f]" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* footer — key help + the "lihat semua" escape hatch */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e7eee6] bg-[#f7faf6] px-5 py-2">
          <span className="text-[10.5px] text-muted2">↑↓ pilih · ↵ buka · Esc tutup · ⌘K kapan saja</span>
          {q.trim() ? (
            <Link
              href={`/app/cari?q=${encodeURIComponent(q.trim())}`}
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-[#0f6b28] hover:underline"
            >
              Lihat semua hasil ({countHits(groups)} temuan)
            </Link>
          ) : (
            <span className="text-[10.5px] text-muted2">Data contoh berlabel</span>
          )}
        </div>
      </div>
    </div>
  );
}
