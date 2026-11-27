"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { ArrowRight, Mail, LockKeyhole } from "lucide-react";
import type { LoginPageContent } from "@/lib/login-page-content";

/** Compact sign-in form; role and scope are resolved from server-side assignments. */
export function LoginForm({ content }: { content: LoginPageContent }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-4">
      <div className="grid gap-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-[12px] font-semibold text-ink2">
            {content.emailLabel}
          </label>
          <div className="relative">
            <Mail size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted2" />
            <input
              id="email"
              name="email"
              type="email"
              className="sb-input !pl-9"
              placeholder={content.emailPlaceholder}
              autoComplete="username"
              maxLength={254}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-[12px] font-semibold text-ink2">
            {content.passwordLabel}
          </label>
          <div className="relative">
            <LockKeyhole size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted2" />
            <input
              id="password"
              name="password"
              type="password"
              className="sb-input !pl-9"
              autoComplete="current-password"
              maxLength={256}
              required
            />
          </div>
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
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? content.loginPendingLabel : content.loginButtonLabel}
        {!pending && <ArrowRight size={15} />}
      </button>
    </form>
  );
}
