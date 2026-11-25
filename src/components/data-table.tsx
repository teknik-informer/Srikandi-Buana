"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, Eye, Search, Download, Upload, ChevronDown, ArrowUpDown,
} from "lucide-react";
import { Btn, Modal } from "@/components/act";
import { Badge, Card, EmptyState } from "@/components/ui";
import { useStoreOptional } from "@/lib/store";

/**
 * DATA TABLE — one table, four verbs, used by every module in the demo.
 *
 * Visible rows are searchable, sortable and paged. Add/Edit/View/Delete open a
 * real modal form; when the caller wires a `useStore` collection, every verb
 * writes through the store reducer, so the change is visible in other apps and
 * lands in the audit trail. Nothing here claims to be a backend: the store is
 * localStorage and the page says so.
 */

export type FieldType = "text" | "number" | "money" | "date" | "select" | "textarea" | "checkbox";

export interface Column<T> {
  key: string;
  label: string;
  /** right-align + tabular figures */
  numeric?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
  /** include in the searchable text */
  search?: boolean;
  /** cannot be edited after creation */
  locked?: boolean;
}

export interface FormField<T> {
  key: keyof T & string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  /** hide from the form (kept for identity) */
  hidden?: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
}

export interface CrudConfig<T> {
  rows: T[];
  columns: Column<T>[];
  fields: FormField<T>[];
  getId: (row: T) => string;
  /** Label for one record, used in dialogs: "produk", "lahan", "anggota". */
  noun: string;
  makeEmpty: () => T;
  /** Validate before save; return an error message or null. */
  validate?: (draft: T, mode: "create" | "edit") => string | null;
  onCreate?: (draft: T) => Promise<boolean> | boolean;
  onUpdate?: (row: T, draft: T) => Promise<boolean> | boolean;
  onDelete?: (row: T) => Promise<boolean> | boolean;
  /** Shown in the view dialog under the key/value list. */
  detail?: (row: T) => ReactNode;
  /**
   * Impor baris dari CSV. Dipanggil sekali per baris yang lolos validasi;
   * kembalikan true bila baris tersimpan. Tanpa prop ini tombol impor tidak
   * muncul — jadi modul yang belum siap tidak menawarkan janji kosong.
   */
  onImport?: (draft: T) => Promise<boolean> | boolean;
  /** Optional extra actions per row (links, status toggles). */
  rowActions?: (row: T) => ReactNode;
  initialSort?: string;
  pageSize?: number;
  /** Honest note under the toolbar. */
  note?: string;
}

const rupiah = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

function display(field: FormField<never>, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "money") return rupiah(Number(value));
  if (field.type === "number") return Number(value).toLocaleString("id-ID");
  if (field.type === "checkbox") return value ? "Ya" : "Tidak";
  if (field.type === "select") {
    return field.options?.find((o) => o.value === String(value))?.label ?? String(value);
  }
  return String(value);
}

/**
 * Angka gaya Indonesia dari sel CSV: "Rp 55.000" → 55000, "1.234,5" → 1234.5,
 * "55.000" → 55000 (titik = pemisah ribuan, bukan desimal).
 */
function parseAngkaID(mentah: string): number {
  const bersih = mentah.replace(/[^\d,.-]/g, "").trim();
  if (!bersih) return 0;
  const adaKoma = bersih.includes(",");
  let normal: string;
  if (adaKoma) {
    // koma = desimal; titik = ribuan
    normal = bersih.replace(/\./g, "").replace(",", ".");
  } else {
    // hanya titik: bila tepat 3 digit di belakang titik, itu pemisah ribuan
    const bagian = bersih.split(".");
    normal = bagian.length > 1 && bagian[bagian.length - 1].length === 3 ? bagian.join("") : bersih;
  }
  const angka = Number(normal);
  return Number.isFinite(angka) ? angka : 0;
}

export function DataTable<T>({
  rows,
  columns,
  fields,
  getId,
  noun,
  makeEmpty,
  validate,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
  detail,
  rowActions,
  initialSort,
  pageSize = 8,
  note,
}: CrudConfig<T>) {
  const store = useStoreOptional();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(initialSort ? { key: initialSort, dir: 1 } : null);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<null | { kind: "create" } | { kind: "edit" | "view"; row: T }>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [impor, setImpor] = useState<null | {
    nama: string;
    siap: T[];
    ditolak: { baris: number; alasan: string }[];
  }>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imporHasil, setImporHasil] = useState<number | null>(null);

  const searchable = columns.filter((c) => c.search !== false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      searchable.some((c) => {
        const raw = (r as Record<string, unknown>)[c.key];
        const text = typeof raw === "number" ? String(raw) : String(raw ?? "");
        return text.toLowerCase().includes(term);
      }),
    );
  }, [rows, q, searchable]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key];
      const bv = (b as Record<string, unknown>)[sort.key];
      if (col?.numeric) return (Number(av) - Number(bv)) * sort.dir;
      return String(av ?? "").localeCompare(String(bv ?? ""), "id") * sort.dir;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const openCreate = () => { setDraft(makeEmpty()); setErr(null); setMode({ kind: "create" }); };
  const openEdit = (row: T) => { setDraft({ ...row }); setErr(null); setMode({ kind: "edit", row }); };
  const openView = (row: T) => { setDraft(null); setErr(null); setMode({ kind: "view", row }); };
  const close = () => { setMode(null); setDraft(null); setErr(null); };

  const editable = (f: FormField<T>) => !f.hidden;

  /**
   * Baca CSV yang ekspornya berasal dari tabel ini sendiri: pemisah titik
   * koma, kolom dipetakan lewat label, BOM dibuang. Baris yang gagal validasi
   * tidak menggagalkan seluruh berkas — dilaporkan per baris.
   */
  const bacaCsv = async (file: File) => {
    const teks = (await file.text()).replace(/^\uFEFF/, "");
    const baris = teks.split(/\r?\n/).filter((b) => b.trim().length > 0);
    if (baris.length < 2) {
      setImpor({ nama: file.name, siap: [], ditolak: [{ baris: 0, alasan: "Berkas tidak punya baris data." }] });
      return;
    }
    const pisah = (b: string) => {
      const out: string[] = [];
      let cur = "";
      let dalamKutip = false;
      for (let i = 0; i < b.length; i += 1) {
        const c = b[i];
        if (c === '"') {
          if (dalamKutip && b[i + 1] === '"') { cur += '"'; i += 1; }
          else dalamKutip = !dalamKutip;
        } else if (c === ";" && !dalamKutip) {
          out.push(cur);
          cur = "";
        } else cur += c;
      }
      out.push(cur);
      return out.map((x) => x.trim());
    };
    const kepala = pisah(baris[0]);
    const kolomByLabel = new Map(columns.map((c) => [c.label.toLowerCase(), c.key]));
    const peta = kepala.map((h) => kolomByLabel.get(h.toLowerCase()) ?? null);

    const siap: T[] = [];
    const ditolak: { baris: number; alasan: string }[] = [];
    for (let i = 1; i < baris.length; i += 1) {
      const sel = pisah(baris[i]);
      const kosong = makeEmpty();
      const rec = kosong as Record<string, unknown>;
      peta.forEach((key, idx) => {
        if (!key) return;
        const mentah = sel[idx] ?? "";
        const field = fields.find((f) => f.key === key);
        const asli = rec[key];
        if (typeof asli === "number" || field?.type === "money" || field?.type === "number") {
          rec[key] = parseAngkaID(mentah);
        } else if (typeof asli === "boolean") {
          rec[key] = /^(ya|true|1|tayang)$/i.test(mentah.trim());
        } else if (field?.type === "select" && field.options) {
          const cocok = field.options.find(
            (o) => o.value.toLowerCase() === mentah.toLowerCase() || o.label.toLowerCase() === mentah.toLowerCase(),
          );
          rec[key] = cocok ? cocok.value : mentah;
        } else {
          rec[key] = mentah;
        }
      });
      const draftRow = rec as T;
      const verdict = validate?.(draftRow, "create") ?? null;
      if (verdict) ditolak.push({ baris: i + 1, alasan: verdict });
      else siap.push(draftRow);
    }
    setImpor({ nama: file.name, siap, ditolak });
  };

  const jalankanImpor = async () => {
    if (!impor || !onImport) return;
    setBusy(true);
    let berhasil = 0;
    try {
      for (const row of impor.siap) {
        const okBaris = await onImport(row);
        if (okBaris) berhasil += 1;
      }
      setImpor(null);
      setQ("");
      setSort(null);
      setPage(0);
      setErr(null);
      setImporHasil(berhasil);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft || !mode) return;
    const verdict = validate?.(draft, mode.kind === "create" ? "create" : "edit") ?? null;
    if (verdict) { setErr(verdict); return; }
    setBusy(true);
    try {
      const okState =
        mode.kind === "create"
          ? await (onCreate ? onCreate(draft) : true)
          : await (onUpdate ? onUpdate(mode.row as T, draft) : true);
      if (okState) {
        // A new row is prepended to the store, so clear the local filter, sort
        // and pager — otherwise the row the user just created can land on a
        // page they are not looking at.
        if (mode.kind === "create") { setQ(""); setSort(null); setPage(0); }
        close();
      } else setErr(`Perubahan ${noun} ditolak. Periksa kembali isian Anda.`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const okState = onDelete ? await onDelete(confirmDelete) : true;
      if (okState) setConfirmDelete(null);
    } finally {
      setBusy(false);
    }
  };

  const viewRow = mode && mode.kind !== "create" ? (mode.row as T) : null;

  return (
    <Card>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
        <div className="relative min-w-0 flex-1 sm:max-w-[300px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted2" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder={`Cari ${noun}…`}
            aria-label={`Cari ${noun}`}
            className="w-full rounded-full border border-line bg-[#fbfdfb] py-[7px] pl-8 pr-3 text-[12px] text-ink placeholder:text-muted2 focus:border-primary-400 focus:bg-white focus:outline-none"
          />
        </div>
        <span className="hidden text-[11px] text-muted2 sm:inline">
          {sorted.length} {noun}{sorted.length !== filtered.length ? ` (dari ${rows.length})` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {onImport ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                aria-label={`Berkas CSV ${noun}`}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void bacaCsv(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[11.5px] font-semibold text-ink2 transition hover:border-primary-300 hover:text-primary-800"
              >
                <Upload size={13} /> Impor CSV
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => exportCsv(columns, sorted, `srikandi-${noun}.csv`)}
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[11.5px] font-semibold text-ink2 transition hover:border-primary-300 hover:text-primary-800"
          >
            <Download size={13} /> Ekspor CSV
          </button>
          {onCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-primary-700 px-3.5 text-[11.5px] font-bold text-white transition hover:bg-primary-800"
            >
              <Plus size={14} /> Tambah {noun}
            </button>
          ) : null}
        </div>
      </div>

      {/* table */}
      {current.length ? (
        <div className="sb-scroll">
          <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line bg-[#f7faf7] text-[10.5px] uppercase tracking-[0.06em] text-muted">
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-3 py-2 font-bold ${c.numeric ? "text-right" : ""}`} style={c.width ? { width: c.width } : undefined}>
                    <button
                      type="button"
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                      className={`inline-flex items-center gap-1 ${c.numeric ? "flex-row-reverse" : ""} hover:text-ink`}
                    >
                      {c.label}
                      <ArrowUpDown size={11} className={sort?.key === c.key ? "text-primary-700" : "opacity-40"} />
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {current.map((row) => (
                <tr key={getId(row)} className="transition hover:bg-[#fbfdfb]">
                  {columns.map((c) => {
                    const raw = (row as Record<string, unknown>)[c.key];
                    return (
                      <td key={c.key} className={`px-3 py-2 align-middle ${c.numeric ? "text-right tabular-nums" : ""}`}>
                        {c.render ? c.render(row) : typeof raw === "number" && c.numeric ? raw.toLocaleString("id-ID") : String(raw ?? "—")}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-0.5">
                      {rowActions?.(row)}
                      <IconBtn label={`Lihat ${noun}`} onClick={() => openView(row)}><Eye size={14} /></IconBtn>
                      {onUpdate ? <IconBtn label={`Ubah ${noun}`} onClick={() => openEdit(row)}><Pencil size={14} /></IconBtn> : null}
                      {onDelete ? <IconBtn label={`Hapus ${noun}`} danger onClick={() => setConfirmDelete(row)}><Trash2 size={14} /></IconBtn> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6">
          <EmptyState
            title={q ? `Tidak ada ${noun} yang cocok` : `Belum ada ${noun}`}
            body={q ? "Coba kata kunci lain — pencarian mencocokkan teks pada kolom yang terlihat." : `Tambahkan ${noun} pertama; setiap perubahan tercatat di jejak audit.`}
          />
        </div>
      )}

      {/* pager + honesty note */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 sm:px-4">
        <span className="text-[10.5px] text-muted2">
          {note ?? "Perubahan tersimpan di perangkat ini (localStorage) dan masuk jejak audit — demo berlabel."}
        </span>
        {pages > 1 ? (
          <div className="flex items-center gap-1">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink2 disabled:opacity-40">Sebelumnya</button>
            <span className="px-1 text-[11px] text-muted">{page + 1}/{pages}</span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink2 disabled:opacity-40">Berikutnya</button>
          </div>
        ) : null}
      </div>

      {/* create / edit */}
      <Modal
        open={mode?.kind === "create" || mode?.kind === "edit"}
        onClose={close}
        title={`${mode?.kind === "edit" ? "Ubah" : "Tambah"} ${noun}`}
        description={
          mode?.kind === "edit"
            ? "Perubahan langsung terlihat di aplikasi lain dan dicatat pada jejak audit."
            : "Isian bertanda * wajib. Data disimpan di perangkat ini (demo)."
        }
        footer={
          <>
            <button type="button" onClick={close} className="sb-btn sb-btn-ghost">Batal</button>
            <button type="button" onClick={save} disabled={busy} className="sb-btn sb-btn-primary">
              {busy ? "Menyimpan…" : mode?.kind === "edit" ? "Simpan perubahan" : `Simpan ${noun}`}
            </button>
          </>
        }
      >
        {draft && mode ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); void save(); }}
          >
            {fields.filter(editable).map((f) => {
              const value = (draft as Record<string, unknown>)[f.key];
              const locked = mode.kind === "edit" && columns.find((c) => c.key === f.key)?.locked;
              const wide = f.type === "textarea";
              return (
                <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
                  <label htmlFor={`f-${f.key}`} className="mb-1 block text-[11.5px] font-semibold text-ink2">
                    {f.label}{f.required ? <span className="text-[var(--sb-danger)]"> *</span> : null}
                  </label>
                  {f.type === "select" ? (
                    <div className="relative">
                      <select
                        id={`f-${f.key}`}
                        value={String(value ?? "")}
                        disabled={locked}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value } as T)}
                        className="sb-input appearance-none pr-8 disabled:bg-surface2 disabled:text-muted"
                      >
                        <option value="">— pilih —</option>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted2" />
                    </div>
                  ) : f.type === "textarea" ? (
                    <textarea
                      id={`f-${f.key}`}
                      value={String(value ?? "")}
                      disabled={locked}
                      rows={3}
                      placeholder={f.placeholder}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value } as T)}
                      className="sb-input min-h-[72px] resize-y disabled:bg-surface2"
                    />
                  ) : f.type === "checkbox" ? (
                    <label className="flex min-h-[38px] items-center gap-2 rounded-sb-sm border border-line px-3 text-[12.5px] text-ink2">
                      <input
                        id={`f-${f.key}`}
                        type="checkbox"
                        checked={Boolean(value)}
                        disabled={locked}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked } as T)}
                        className="h-4 w-4 accent-[#127e2f]"
                      />
                      {f.hint ?? "Aktif"}
                    </label>
                  ) : (
                    <input
                      id={`f-${f.key}`}
                      type={f.type === "date" ? "date" : f.type === "number" || f.type === "money" ? "number" : "text"}
                      inputMode={f.type === "number" || f.type === "money" ? "numeric" : undefined}
                      min={f.min}
                      step={f.step ?? (f.type === "money" ? 500 : undefined)}
                      value={value === undefined || value === null ? "" : String(value)}
                      disabled={locked}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [f.key]: f.type === "number" || f.type === "money" ? Number(e.target.value) : e.target.value,
                        } as T)
                      }
                      className="sb-input disabled:bg-surface2 disabled:text-muted"
                    />
                  )}
                  {f.hint && f.type !== "checkbox" ? <p className="mt-1 text-[10.5px] text-muted2">{f.hint}</p> : null}
                </div>
              );
            })}
            {err ? (
              <p role="alert" className="sm:col-span-2 rounded-sb-sm border border-[#ecc9c3] bg-[var(--sb-danger-bg)] px-3 py-2 text-[12px] text-[var(--sb-danger)]">
                {err}
              </p>
            ) : null}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        ) : null}
      </Modal>

      {/* view */}
      <Modal
        open={mode?.kind === "view"}
        onClose={close}
        title={`${noun.charAt(0).toUpperCase()}${noun.slice(1)}`}
        description="Rincian lengkap; sumber data dan riwayat perubahan tercatat di jejak audit."
        footer={
          <>
            <button type="button" onClick={close} className="sb-btn sb-btn-ghost">Tutup</button>
            {onUpdate && viewRow ? (
              <button type="button" onClick={() => openEdit(viewRow)} className="sb-btn sb-btn-primary">Ubah</button>
            ) : null}
          </>
        }
      >
        {viewRow ? (
          <div>
            <dl className="divide-y divide-line rounded-sb-sm border border-line">
              {fields.map((f) => (
                <div key={f.key} className="grid gap-0.5 px-3 py-2 sm:grid-cols-[180px_1fr]">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{f.label}</dt>
                  <dd className="text-[13px] text-ink2">{display(f as FormField<never>, (viewRow as Record<string, unknown>)[f.key])}</dd>
                </div>
              ))}
            </dl>
            {detail ? <div className="mt-3">{detail(viewRow)}</div> : null}
            {store ? (
              <p className="mt-3 text-[10.5px] leading-snug text-muted2">
                Aksi ubah/hapus pada demo ini dicatat sebagai peristiwa audit dengan nama aktor dan waktu.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* delete */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={`Hapus ${noun}?`}
        description="Penghapusan pada demo ini bersifat nyata terhadap data lokal Anda."
        width={460}
        footer={
          <>
            <button type="button" onClick={() => setConfirmDelete(null)} className="sb-btn sb-btn-ghost">Batal</button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="sb-btn sb-btn-primary !bg-[var(--sb-danger)] hover:!bg-[#a03330]"
            >
              {busy ? "Menghapus…" : `Hapus ${noun}`}
            </button>
          </>
        }
      >
        {confirmDelete ? (
          <div className="text-[12.5px] text-ink2">
            <p className="mb-2">
              <Badge tone="danger">Tidak dapat dibatalkan</Badge>
            </p>
            <p className="leading-relaxed">
              <strong className="font-semibold text-ink">{getId(confirmDelete)}</strong> akan dihapus dari daftar.
              Bagian lain aplikasi yang membaca daftar ini akan langsung ikut berubah; jejak audit tetap menyimpan
              catatan bahwa data ini pernah ada.
            </p>
            <p className="mt-2 text-[11px] text-muted2">
              Catatan: pada produksi, data master organisasi umumnya dinonaktifkan (soft delete), bukan dihapus permanen. Demo ini memakai
              hapus langsung agar efeknya terlihat.
            </p>
          </div>
        ) : null}
      </Modal>

      {impor ? (
        <Modal
          open
          onClose={() => setImpor(null)}
          title={`Impor ${noun} dari CSV`}
          description={`${impor.nama} — ${impor.siap.length} baris siap, ${impor.ditolak.length} ditolak.`}
          width={620}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setImpor(null)}>Batal</Btn>
              <Btn variant="primary" onClick={jalankanImpor} disabled={busy || impor.siap.length === 0}>
                {busy ? "Menyimpan…" : `Simpan ${impor.siap.length} baris`}
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-muted">
              Berkas dibaca dengan pemisah titik koma, sama seperti hasil "Ekspor CSV" di toolbar. Kolom
              dipetakan lewat judul kolom; baris yang tidak lolos pemeriksaan tidak menghalangi baris lain.
            </p>
            {impor.siap.length > 0 ? (
              <div className="rounded-sb-sm border border-[#cfe3cd] bg-[var(--sb-success-bg)] px-3 py-2">
                <p className="text-[12px] font-semibold text-[var(--sb-success)]">{impor.siap.length} baris siap disimpan</p>
                <ul className="mt-1 space-y-0.5 text-[11.5px] text-ink2">
                  {impor.siap.slice(0, 4).map((r, i) => (
                    <li key={i} className="truncate">
                      · {String((r as Record<string, unknown>)[fields[0]?.key ?? "id"] ?? `baris ${i + 1}`)}
                    </li>
                  ))}
                  {impor.siap.length > 4 ? <li className="text-muted2">… dan {impor.siap.length - 4} baris lain</li> : null}
                </ul>
              </div>
            ) : null}
            {impor.ditolak.length > 0 ? (
              <div className="rounded-sb-sm border border-[var(--sb-danger)]/30 bg-[var(--sb-danger-bg)] px-3 py-2">
                <p className="text-[12px] font-semibold text-[var(--sb-danger)]">{impor.ditolak.length} baris ditolak</p>
                <ul className="mt-1 space-y-0.5 text-[11.5px] text-ink2">
                  {impor.ditolak.slice(0, 6).map((d) => (
                    <li key={d.baris}>· Baris {d.baris}: {d.alasan}</li>
                  ))}
                  {impor.ditolak.length > 6 ? <li className="text-muted2">… dan {impor.ditolak.length - 6} baris lain</li> : null}
                </ul>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {imporHasil !== null ? (
        <Modal
          open
          onClose={() => setImporHasil(null)}
          title="Impor selesai"
          description={`${imporHasil} ${noun} tersimpan dari berkas CSV.`}
          footer={<Btn variant="primary" onClick={() => setImporHasil(null)}>Tutup</Btn>}
        >
          <p className="text-[12.5px] leading-relaxed text-muted">
            Semua baris yang tersimpan sudah masuk ke dokumen bersama, tampil di tabel ini, dan tercatat
            satu per satu di jejak audit.
          </p>
        </Modal>
      ) : null}
    </Card>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
        danger ? "text-[#a33a36] hover:bg-[#fdeaea]" : "text-ink2 hover:bg-[#f1f6f1] hover:text-primary-800"
      }`}
    >
      {children}
    </button>
  );
}

function exportCsv<T>(columns: Column<T>[], rows: T[], filename: string) {
  const esc = (v: unknown) => {
    const s = typeof v === "number" ? String(v) : String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => esc((r as Record<string, unknown>)[c.key])).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { rupiah };
