"use client";

/**
 * Interactive primitives: buttons that act, dialogs that commit, toasts that
 * confirm. Used by every operational screen so the demo behaves like a working
 * application rather than a set of static reports.
 */

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, X, Info, RotateCcw } from "lucide-react";
import { useStore, useStoreOptional } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "outline" | "ghost" | "danger" | "accent" | "soft";

const VARIANT: Record<Variant, string> = {
  primary: "sb-btn sb-btn-primary",
  outline: "sb-btn sb-btn-outline",
  ghost: "sb-btn sb-btn-ghost",
  danger: "sb-btn sb-btn-danger",
  accent: "sb-btn sb-btn-accent",
  soft: "sb-btn border border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100",
};

export function Btn({
  variant = "outline",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`${VARIANT[variant]} ${size === "sm" ? "!py-1.5 !text-[12px]" : ""} ${className}`}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const nodes = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const first = ref.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button.sb-btn-primary',
      );
      first?.focus();
    }, 30);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[rgb(15_26_43/0.45)] p-4 py-[6vh]">
      <div
        aria-hidden
        className="fixed inset-0"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-10 w-full rounded-sb border border-line bg-white shadow-[var(--sb-shadow-lg)]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 id={titleId} className="font-display text-[16px] font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-[12.5px] text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="-mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface2 hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-sb border-t border-line bg-paper px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form field                                                          */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-semibold text-ink2">
        {label}
        {required ? <span className="ml-0.5 text-[var(--sb-danger)]">*</span> : null}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1 text-[11.5px] font-medium text-[var(--sb-danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted2">{hint}</p>
      ) : null}
    </div>
  );
}

/* Export bare inputs so every page shares one look. */
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`sb-input w-full ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`sb-input w-full ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`sb-input w-full min-h-[80px] ${props.className ?? ""}`} />;
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

export function Toaster() {
  const store = useStoreOptional();
  const toast = store?.toast ?? null;
  const clearToast = store?.clearToast;

  useEffect(() => {
    if (!toast || !clearToast) return;
    const t = window.setTimeout(clearToast, 6500);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast || !clearToast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-sb border px-4 py-3 shadow-[var(--sb-shadow-lg)] ${
          toast.ok
            ? "border-[#cfe3cd] bg-[var(--sb-success-bg)] text-[var(--sb-success)]"
            : "border-[#ecc9c3] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]"
        }`}
      >
        <span className="mt-0.5 shrink-0">
          {toast.ok ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-snug">{toast.text}</p>
          {toast.href ? (
            <a href={toast.href} className="mt-0.5 inline-block text-[11.5px] font-semibold underline">
              Buka hasilnya →
            </a>
          ) : null}
        </div>
        <button
          type="button"
          onClick={clearToast}
          aria-label="Tutup notifikasi"
          className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo state chip + reset                                             */
/* ------------------------------------------------------------------ */

export function DemoStateChip({ compact = false, tone = "light" }: { compact?: boolean; tone?: "light" | "dark" }) {
  const { state } = useStore();
  const pending = state.approvals.filter((a) => a.status === "menunggu").length;
  const skin =
    tone === "dark"
      ? "border-white/20 bg-white/10 text-[#dfeadd] backdrop-blur-sm"
      : "border-line bg-paper text-muted";
  const dot = tone === "dark" ? "bg-[#7ddc93]" : "bg-[var(--sb-primary-500)]";
  const sep = tone === "dark" ? "text-white/30" : "text-line-strong";
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${skin}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        Data demo
      </span>
      {!compact ? (
        <>
          <span aria-hidden className={sep}>·</span>
          <span>{state.journals.length} jurnal</span>
          <span aria-hidden className={sep}>·</span>
          <span>{pending} menunggu</span>
          <span aria-hidden className={sep}>·</span>
          <span>tersimpan di peramban</span>
        </>
      ) : null}
    </span>
  );
}

export function ResetDemo({
  variant = "ghost",
  label = "Kembalikan data demo",
}: {
  variant?: Variant;
  label?: string;
}) {
  const { reset, state } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn variant={variant} size="sm" icon={<RotateCcw size={14} />} onClick={() => setOpen(true)}>
        {label}
      </Btn>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Kembalikan data demo ke kondisi awal?"
        description="Semua perubahan Anda pada sesi ini — persetujuan, jurnal, surat, penjualan — akan dihapus dan data kembali seperti 22 November 2026."
        width={480}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Ya, kembalikan
            </Btn>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-2 text-[12.5px]">
          <dt className="text-muted">Jurnal</dt>
          <dd className="text-right font-semibold text-ink">{state.journals.length} → 22</dd>
          <dt className="text-muted">Persetujuan diputuskan</dt>
          <dd className="text-right font-semibold text-ink">
            {state.approvals.filter((a) => a.status !== "menunggu").length} → 2
          </dd>
          <dt className="text-muted">Surat terdaftar</dt>
          <dd className="text-right font-semibold text-ink">{state.letters.length} → 5</dd>
          <dt className="text-muted">Entri jejak audit</dt>
          <dd className="text-right font-semibold text-ink">{state.audit.length} → 1</dd>
        </dl>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Client-side filter tabs with live counts                            */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="hide-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-paper p-1">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.key)}
            className={`min-h-[36px] whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition ${
              active ? "bg-[var(--sb-primary-700)] text-white shadow-sm" : "text-muted hover:bg-surface2 hover:text-ink"
            }`}
          >
            {o.label}
            {typeof o.count === "number" ? (
              <span className={`ml-1.5 tabular-nums ${active ? "text-white/80" : "text-muted2"}`}>{o.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live search                                                         */
/* ------------------------------------------------------------------ */

const SearchCtx = createContext<{ q: string; setQ: (s: string) => void } | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [q, setQ] = useState("");
  return <SearchCtx.Provider value={{ q, setQ }}>{children}</SearchCtx.Provider>;
}

export function useSearch() {
  const c = useContext(SearchCtx);
  if (!c) throw new Error("useSearch must be used inside <SearchProvider>");
  return c;
}

export function SearchBox({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  const { q, setQ } = useSearch();
  return (
    <div className={`relative ${className}`}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="sb-input w-full pl-9"
      />
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </div>
  );
}

export function match(value: string, q: string): boolean {
  if (!q.trim()) return true;
  const hay = value.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

/* ------------------------------------------------------------------ */
/* Inline empty state for filtered tables                              */
/* ------------------------------------------------------------------ */

export function NoRows({ q }: { q: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <Info size={20} className="text-muted2" aria-hidden />
      <p className="mt-1.5 text-[13px] font-semibold text-ink">Tidak ada baris yang cocok</p>
      <p className="mt-0.5 text-[12px] text-muted">
        {q ? `Tidak ada hasil untuk “${q}”. Coba kata kunci lain.` : "Belum ada data pada filter ini."}
      </p>
    </div>
  );
}
