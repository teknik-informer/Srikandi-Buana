"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { ArrowRight, KeyRound, ChevronRight } from "lucide-react";

interface AccountLite {
  key: string;
  email: string;
  label: string;
  description: string;
  scope: string;
}

/**
 * Two modes, one card.
 *
 * Phones and short windows could not fit eight role cards plus two fields
 * without scrolling, so the demo accounts moved behind a "peran" step: the
 * grid lists roles only, choosing one opens the two fields. On tall screens
 * the list is skipped entirely and the form shows the chosen role as a single
 * summary row. Login never needs a scrollbar.
 */
export function LoginForm({ accounts }: { accounts: AccountLite[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [selected, setSelected] = useState(accounts[0]?.key ?? "");
  const [picking, setPicking] = useState(false);
  const current = accounts.find((a) => a.key === selected);

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="key" value={selected} />

      {/* ── role picker (never mounts when the summary row is showing) ── */}
      {picking ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Pilih peran demo</span>
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="text-[11.5px] font-semibold text-primary-700 hover:underline"
            >
              Batal
            </button>
          </div>
          <ul className="sb-login-roles -mx-1 grid max-h-[56dvh] gap-1 overflow-y-auto px-1 sm:max-h-[46dvh] sm:grid-cols-2 [@media(max-height:520px)]:max-h-[42dvh]">
            {accounts.map((a) => {
              const active = selected === a.key;
              return (
                <li key={a.key}>
                  <button
                    type="button"
                    onClick={() => { setSelected(a.key); setPicking(false); }}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-2.5 rounded-[9px] border px-3 py-1.5 text-left transition ${
                      active
                        ? "border-primary-600 bg-primary-50"
                        : "border-line bg-white hover:border-primary-300 hover:bg-paper"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold leading-tight text-ink">{a.label}</span>
                      <span className="block truncate text-[10.5px] leading-tight text-muted">{a.description}</span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted2" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full items-center gap-3 rounded-[12px] border border-line bg-[#f7fbf7] px-3 py-2.5 text-left transition hover:border-primary-300"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-800">
            <KeyRound size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted2">Akun demo</span>
            <span className="block truncate text-[12.5px] font-semibold text-ink">{current?.label ?? "Pilih peran"}</span>
          </span>
          <span className="shrink-0 text-[11.5px] font-semibold text-primary-700">Ganti</span>
        </button>
      )}

      {/* ── the two fields ── */}
      <div className="mt-3 grid gap-2.5">
        <div>
          <label htmlFor="email" className="mb-1 block text-[12px] font-semibold text-ink2">
            Surel akun demo
          </label>
          <input
            id="email"
            name="email"
            className="sb-input"
            value={current?.email ?? ""}
            readOnly
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-[12px] font-semibold text-ink2">
            Kata sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="sb-input"
            defaultValue="demo1234"
            autoComplete="current-password"
            required
          />
          <p className="mt-1 text-[11px] text-muted2">
            Semua akun demo memakai kata sandi <span className="font-mono font-semibold text-ink2">demo1234</span>
          </p>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="mt-3 rounded-sb-sm border border-[#ecc9c3] bg-[var(--sb-danger-bg)] px-3 py-2 text-[12.5px] text-[var(--sb-danger)]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        className="sb-btn sb-btn-primary mt-4 w-full"
        disabled={pending || !selected}
        aria-busy={pending}
        title={!selected ? "Pilih salah satu akun demo." : undefined}
      >
        {pending ? "Memeriksa…" : "Masuk"}
        {!pending && <ArrowRight size={15} />}
      </button>
    </form>
  );
}
