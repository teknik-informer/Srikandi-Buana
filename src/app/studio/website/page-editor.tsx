"use client";

/**
 * Page editor — menyunting susunan block satu halaman: tambah, hapus, geser,
 * ubah isi field, ubah judul & status, lalu terbitkan.
 *
 * Semua perubahan langsung terlihat di pratinjau di kolom kanan, dan setelah
 * disimpan ikut tampil di halaman publik pada perangkat yang sama.
 *
 * Catatan jujur soal cakupan: field yang tersedia per block dibatasi pada yang
 * benar-benar dirender halaman publik (lihat EDITABLE_FIELDS di lib/cms.ts).
 * Menampilkan kontrol untuk field yang tidak dirender akan membuat studio
 * berbohong tentang apa yang bisa diubah.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, Check, Eye, Plus, RotateCcw, Save, Trash2, TriangleAlert, X,
} from "lucide-react";
import { Badge, Card, CardHeader, Notice } from "@/components/ui";
import { BLOCK_REGISTRY, type BlockKey } from "@/config/blocks";
import {
  EDITABLE_FIELDS, defaultPages, limitOf, loadPages, newUid, savePages,
  type CmsBlock, type CmsPage, type PageStatus,
} from "@/lib/cms";

const input =
  "mt-1 w-full rounded-[8px] border border-line bg-white px-2.5 py-1.5 text-[12.5px] text-ink outline-none transition placeholder:text-muted2 focus:border-primary focus:ring-2 focus:ring-primary/15";

const STATUS_LABEL: Record<PageStatus, string> = {
  published: "Terbit",
  review: "Tinjauan",
  draft: "Draf",
};

const STATUS_TONE: Record<PageStatus, "success" | "warning" | "neutral"> = {
  published: "success",
  review: "warning",
  draft: "neutral",
};

function blockName(key: BlockKey) {
  return BLOCK_REGISTRY.find((b) => b.key === key)?.name ?? key;
}

/* ══════════════════════ pratinjau ══════════════════════ */

/**
 * Pratinjau merender block dengan gaya yang menyerupai situs publik. Ia bukan
 * komponen halaman sebenarnya — halaman publik tetap perlu diubah agar membaca
 * model ini — tetapi cukup untuk menilai urutan, panjang teks, dan nada.
 */
function BlockPreview({ b }: { b: CmsBlock }) {
  const f = b.fields;
  const name = blockName(b.block);

  const body = (() => {
    switch (b.block) {
      case "hero-editorial":
        return (
          <div className="rounded-[10px] bg-[linear-gradient(100deg,#0a2e1a,#10512c)] p-4 text-white">
            {f.eyebrow ? (
              <div className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#f0d79a]">{f.eyebrow}</div>
            ) : null}
            <div className="mt-1.5 whitespace-pre-line font-display text-[19px] leading-tight">
              {f.headline || <span className="italic text-white/40">Judul utama belum diisi</span>}
            </div>
            {f.subheadline ? (
              <div className="mt-1.5 max-w-[42ch] text-[10.5px] leading-relaxed text-[#dcecdf]">{f.subheadline}</div>
            ) : null}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {f.ctaPrimary ? (
                <span className="rounded-full bg-[#127e2f] px-2.5 py-1 text-[9.5px] font-bold">{f.ctaPrimary}</span>
              ) : null}
              {f.ctaSecondary ? (
                <span className="rounded-full border border-white/40 px-2.5 py-1 text-[9.5px] font-bold">{f.ctaSecondary}</span>
              ) : null}
            </div>
          </div>
        );
      case "rich-text":
        return (
          <div>
            <div className="text-[13px] font-semibold text-ink">{f.headline || name}</div>
            <div className="mt-1 whitespace-pre-line text-[10.5px] leading-relaxed text-muted">
              {f.subheadline || <span className="italic">Isi teks belum diisi</span>}
            </div>
          </div>
        );
      case "story-quote":
        return (
          <div className="border-l-2 border-[#e6c56a] pl-3">
            <div className="text-[10.5px] italic leading-relaxed text-ink2">
              &ldquo;{f.subheadline || "Kutipan belum diisi"}&rdquo;
            </div>
            <div className="mt-1 text-[10px] font-semibold text-ink">{f.headline || "Nama penutur"}</div>
            {f.note ? <div className="text-[9.5px] text-muted2">{f.note}</div> : null}
          </div>
        );
      case "cta-join":
        return (
          <div className="rounded-[10px] bg-[var(--sb-canvas)] p-3.5 text-center">
            <div className="text-[12.5px] font-semibold text-ink">{f.headline || "Ajakan bergabung"}</div>
            {f.subheadline ? <div className="mt-1 text-[10px] leading-relaxed text-muted">{f.subheadline}</div> : null}
            {f.ctaPrimary ? (
              <span className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-[9.5px] font-bold text-white">
                {f.ctaPrimary}
              </span>
            ) : null}
          </div>
        );
      case "stat-strip":
        return (
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[8px] border border-line bg-white p-2">
                <div className="text-[15px] font-bold text-ink">{["128", "6", "17"][i]}</div>
                <div className="text-[8.5px] text-muted2">{["anggota", "bidang", "program"][i]}</div>
              </div>
            ))}
            {f.note ? <div className="col-span-3 text-[8.5px] text-muted2">{f.note}</div> : null}
          </div>
        );
      case "field-cards":
        return (
          <div>
            {f.headline ? <div className="text-[12px] font-semibold text-ink">{f.headline}</div> : null}
            {f.subheadline ? <div className="mt-0.5 text-[9.5px] text-muted">{f.subheadline}</div> : null}
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 rounded-[5px] bg-surface2" />
              ))}
            </div>
          </div>
        );
      default:
        // block daftar: tampilkan jumlah baris sesuai field limit
        return (
          <div>
            {f.headline ? <div className="text-[12px] font-semibold text-ink">{f.headline}</div> : null}
            {f.subheadline ? <div className="mt-0.5 text-[9.5px] text-muted">{f.subheadline}</div> : null}
            <div className="mt-1.5 space-y-1">
              {Array.from({ length: Math.min(limitOf([b], b.block, 3, 6), 6) }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-[6px] border border-line bg-white p-1.5">
                  <span className="h-4 w-4 rounded bg-surface2" />
                  <span className="h-1.5 flex-1 rounded bg-surface2" />
                </div>
              ))}
            </div>
          </div>
        );
    }
  })();

  return (
    <div className="rounded-[9px] border border-line bg-white p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted2">{name}</span>
        <code className="text-[8.5px] text-muted2">{b.block}</code>
      </div>
      {body}
    </div>
  );
}

/* ══════════════════════ editor ══════════════════════ */

export function PageEditor({ activePath }: { activePath: string }) {
  const [pages, setPages] = useState<CmsPage[]>(() => defaultPages());
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [adding, setAdding] = useState<BlockKey | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Muat dari penyimpanan sekali di klien.
  useState(() => {
    if (typeof window !== "undefined") setPages(loadPages());
    return null;
  });

  const page = useMemo(
    () => pages.find((p) => p.path === activePath) ?? pages[0],
    [pages, activePath],
  );

  const mutate = (fn: (p: CmsPage) => CmsPage) => {
    setPages((all) => all.map((p) => (p.path === page.path ? fn(p) : p)));
    setDirty(true);
    setSavedAt(null);
  };

  const setField = (uid: string, key: string, value: string) =>
    mutate((p) => ({
      ...p,
      blocks: p.blocks.map((b) =>
        b.uid === uid ? { ...b, fields: { ...b.fields, [key]: value } } : b,
      ),
    }));

  const move = (index: number, dir: -1 | 1) =>
    mutate((p) => {
      const next = [...p.blocks];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...p, blocks: next };
    });

  const remove = (uid: string) =>
    mutate((p) => ({ ...p, blocks: p.blocks.filter((b) => b.uid !== uid) }));

  const add = () => {
    if (!adding) return;
    mutate((p) => ({
      ...p,
      blocks: [...p.blocks, { uid: newUid(), block: adding as BlockKey, fields: {} }],
    }));
    setAdding("");
  };

  const save = () => {
    const stamped: CmsPage[] = pages.map((p) =>
      p.path === page.path
        ? {
            ...p,
            updatedAt: new Date().toLocaleString("id-ID", {
              year: "numeric", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit",
            }),
            updatedBy: "Studio",
          }
        : p,
    );
    setPages(stamped);
    savePages(stamped);
    setDirty(false);
    setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  };

  const discard = () => {
    setPages(loadPages());
    setDirty(false);
    setSavedAt(null);
  };

  const resetAll = () => {
    if (!confirm("Kembalikan semua halaman ke susunan awal? Suntingan di perangkat ini akan hilang.")) return;
    setPages(defaultPages());
    savePages(defaultPages());
    setDirty(false);
  };

  if (!page) return null;

  return (
    <div className="space-y-4">
      {/* ── status halaman ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={page.title}
          subtitle={`${page.path} · ${page.blocks.length} block · diperbarui ${page.updatedAt || "—"}`}
          action={<Badge tone={dirty ? "warning" : "success"}>{dirty ? "Belum disimpan" : savedAt ? `Tersimpan ${savedAt}` : "Tersimpan"}</Badge>}
        />
        <div className="flex flex-wrap items-end gap-3 px-4 py-3">
          <label className="min-w-[180px] flex-1">
            <span className="text-[11.5px] font-semibold text-ink">Judul halaman</span>
            <input
              className={input}
              value={page.title}
              onChange={(e) => mutate((p) => ({ ...p, title: e.target.value }))}
              maxLength={60}
            />
          </label>
          <label className="w-[150px]">
            <span className="text-[11.5px] font-semibold text-ink">Status</span>
            <select
              className={input}
              value={page.status}
              onChange={(e) => mutate((p) => ({ ...p, status: e.target.value as PageStatus }))}
            >
              <option value="draft">Draf</option>
              <option value="review">Tinjauan</option>
              <option value="published">Terbit</option>
            </select>
          </label>
          <Badge tone={STATUS_TONE[page.status]}>{STATUS_LABEL[page.status]}</Badge>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── daftar block ─────────────────────────────────────────────── */}
        <Card className="min-w-0">
          <CardHeader
            title="Susunan block"
            subtitle="Urutan di sini adalah urutan tampil di situs. Klik sebuah block untuk menyunting isinya."
            action={<Badge tone="neutral">{page.blocks.length} block</Badge>}
          />

          {page.blocks.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[12px] text-muted">Halaman ini belum memiliki block.</p>
              <p className="mt-1 text-[11px] text-muted2">Tambahkan block pertama di bawah.</p>
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {page.blocks.map((b, i) => {
                const isOpen = expanded === b.uid;
                const specs = EDITABLE_FIELDS[b.block] ?? [];
                return (
                  <li key={b.uid}>
                    <div className="flex items-start gap-2.5 px-3 py-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface2 text-[10px] font-bold text-ink2">
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : b.uid)}
                        aria-expanded={isOpen}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[12.5px] font-semibold text-ink">{blockName(b.block)}</span>
                          <code className="rounded bg-surface2 px-1 py-0.5 text-[9px] text-muted2">{b.block}</code>
                          {b.fields.headline ? (
                            <span className="max-w-[220px] truncate text-[10px] text-muted">
                              — {b.fields.headline.replace(/\n/g, " ")}
                            </span>
                          ) : (
                            <span className="text-[10px] italic text-muted2">memakai teks bawaan</span>
                          )}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label={`Naikkan ${blockName(b.block)}`}
                          className="rounded border border-line p-1 text-muted transition hover:bg-surface2 hover:text-ink disabled:opacity-35"
                        >
                          <ArrowUp size={12} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === page.blocks.length - 1}
                          aria-label={`Turunkan ${blockName(b.block)}`}
                          className="rounded border border-line p-1 text-muted transition hover:bg-surface2 hover:text-ink disabled:opacity-35"
                        >
                          <ArrowDown size={12} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExpanded(b.uid);
                          }}
                          aria-label={`Sunting ${blockName(b.block)}`}
                          className="rounded border border-line p-1 text-muted transition hover:bg-surface2 hover:text-ink"
                        >
                          <Eye size={12} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(b.uid)}
                          aria-label={`Hapus ${blockName(b.block)}`}
                          className="rounded border border-line p-1 text-[var(--sb-danger)] transition hover:bg-[var(--sb-danger-bg)]"
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="border-t border-line bg-paper px-3 py-3">
                        {specs.length === 0 ? (
                          <p className="text-[11px] text-muted">Block ini tidak memiliki field yang dapat disunting.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {specs.map((s) => {
                              const val = (b.fields as Record<string, string | undefined>)[s.key] ?? "";
                              const tooLong = s.max ? val.length > s.max : false;
                              return (
                                <label key={s.key} className="block">
                                  <span className="flex items-baseline justify-between gap-2">
                                    <span className="text-[11.5px] font-semibold text-ink">
                                      {s.label}
                                      {s.required ? <span className="text-[var(--sb-danger)]"> *</span> : null}
                                    </span>
                                    {s.max ? (
                                      <span className={`text-[9.5px] ${tooLong ? "font-bold text-[var(--sb-danger)]" : "text-muted2"}`}>
                                        {val.length}/{s.max}
                                      </span>
                                    ) : null}
                                  </span>
                                  {s.hint ? <span className="block text-[10px] text-muted2">{s.hint}</span> : null}
                                  {s.type === "textarea" ? (
                                    <textarea
                                      className={`${input} min-h-[64px] resize-y`}
                                      value={val}
                                      rows={3}
                                      onChange={(e) => setField(b.uid, s.key, e.target.value)}
                                    />
                                  ) : (
                                    <input
                                      className={input}
                                      value={val}
                                      onChange={(e) => setField(b.uid, s.key, e.target.value)}
                                      placeholder={s.type === "url" ? "/gabung" : undefined}
                                    />
                                  )}
                                </label>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => setExpanded(null)}
                              className="text-[11px] font-semibold text-primary-700 hover:underline"
                            >
                              Selesai menyunting
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}

          {/* tambah block */}
          <div className="flex flex-wrap items-end gap-2 border-t border-line bg-paper px-3 py-2.5">
            <label className="min-w-[210px] flex-1">
              <span className="text-[11px] font-semibold text-ink">Tambah block</span>
              <select
                className={input}
                value={adding}
                onChange={(e) => setAdding(e.target.value as BlockKey | "")}
              >
                <option value="">— pilih dari registry —</option>
                {BLOCK_REGISTRY.map((reg) => (
                  <option key={reg.key} value={reg.key}>
                    {reg.name} · {reg.group}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={add}
              disabled={!adding}
              className="sb-btn sb-btn-outline !py-1.5 text-[12px] disabled:opacity-45"
            >
              <Plus size={14} aria-hidden />
              Tambahkan
            </button>
          </div>

          {/* aksi halaman */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="sb-btn sb-btn-primary !py-2 text-[12.5px] disabled:opacity-45"
            >
              {dirty ? <Save size={15} aria-hidden /> : <Check size={15} aria-hidden />}
              {dirty ? "Simpan & terbitkan" : "Tersimpan"}
            </button>
            <button
              type="button"
              onClick={discard}
              disabled={!dirty}
              className="sb-btn sb-btn-outline !py-2 text-[12.5px] disabled:opacity-45"
            >
              <RotateCcw size={15} aria-hidden />
              Batalkan
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-[var(--sb-danger)] hover:underline"
            >
              <X size={12} aria-hidden />
              Kembalikan semua halaman
            </button>
          </div>
        </Card>

        {/* ── pratinjau ─────────────────────────────────────────────────── */}
        <aside aria-label="Pratinjau halaman" className="h-fit self-start">
          <div className="rounded-[12px] border border-line bg-[var(--sb-canvas)] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted">Pratinjau</span>
              <span className="flex items-center gap-1 text-[9px] text-muted2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--sb-success)]" />
                langsung
              </span>
            </div>
            <div className="sb-scroll max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
              {page.blocks.length === 0 ? (
                <p className="rounded-[9px] border border-dashed border-line bg-white px-3 py-6 text-center text-[10.5px] text-muted2">
                  Belum ada block untuk ditampilkan.
                </p>
              ) : (
                page.blocks.map((b) => <BlockPreview key={b.uid} b={b} />)
              )}
            </div>
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-muted2">
            Pratinjau menyerupai situs, bukan pengganti. Buka{" "}
            <Link href={page.path} target="_blank" className="font-semibold text-primary-700 hover:underline">
              {page.path}
            </Link>{" "}
            untuk melihat hasil sebenarnya.
          </p>
        </aside>
      </div>

      <Notice tone="info" title="Di mana suntingan ini disimpan">
        Suntingan tersimpan di peramban ini (localStorage) dan langsung terlihat pada perangkat yang
        sama. Ini belum basis data bersama — semua pengurus baru melihat perubahan setelah integrasi
        server-side mengambil alih penyimpanan konten. Studio menyatakan batas ini terang-terangan
        agar tidak ada yang mengira perubahan sudah tersiar ke semua perangkat.
      </Notice>
    </div>
  );
}
