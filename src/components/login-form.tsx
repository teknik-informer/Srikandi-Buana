"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { ArrowRight, KeyRound } from "lucide-react";

interface AccountLite {
  key: string;
  email: string;
  label: string;
  description: string;
  scope: string;
}

export function LoginForm({ accounts }: { accounts: AccountLite[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [selected, setSelected] = useState(accounts[0]?.key ?? "");

  return (
    <form action={action} className="mt-6 space-y-5">
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Akun demo</div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {accounts.map((a) => {
            const active = selected === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setSelected(a.key)}
                aria-pressed={active}
                className={`rounded-[10px] border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-primary-600 bg-primary-50 shadow-[0_0_0_1px_var(--sb-primary-600)]"
                    : "border-line bg-white hover:border-primary-300"
                }`}
              >
                <div className="text-[12.5px] font-semibold text-ink">{a.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{a.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-[12px] font-semibold text-ink2">Surel akun demo</label>
          <input
            id="email"
            name="email"
            className="sb-input"
            value={accounts.find((a) => a.key === selected)?.email ?? ""}
            readOnly
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-[12px] font-semibold text-ink2">Kata sandi</label>
          <input
            id="password"
            name="password"
            type="password"
            className="sb-input"
            defaultValue="demo1234"
            autoComplete="current-password"
            required
          />
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted2">
            <KeyRound size={12} /> Semua akun demo memakai kata sandi <span className="font-mono font-semibold text-ink2">demo1234</span>
          </p>
        </div>
      </div>

      <input type="hidden" name="key" value={selected} />

      {state.error ? (
        <p role="alert" className="rounded-sb-sm border border-[#ecc9c3] bg-[var(--sb-danger-bg)] px-3 py-2 text-[12.5px] text-[var(--sb-danger)]">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="sb-btn sb-btn-primary w-full" disabled={pending || !selected}>
        {pending ? "Memeriksa…" : "Masuk"}
        {!pending && <ArrowRight size={15} />}
      </button>
    </form>
  );
}
