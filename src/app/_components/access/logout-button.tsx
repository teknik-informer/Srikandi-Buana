"use client";
import { type FormEvent } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-logout";
export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { busy, error, logout } = useLogout();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void logout();
  }
  return (
    <form action="/api/auth/logout" method="post" onSubmit={submit} className="workspace-logout" aria-busy={busy}>
      <Button
        type="submit"
        variant="outline"
        disabled={busy}
        className="min-h-11"
        title="Keluar akun"
        aria-label={busy ? "Mengakhiri sesi" : "Keluar akun"}
      >
        {busy ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <LogOut data-icon="inline-start" />
        )}
        <span className={compact ? "sidebar-account-label" : undefined}>{busy ? "Keluar…" : "Keluar akun"}</span>
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
