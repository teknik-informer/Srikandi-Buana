"use client";

import AccountProfileEditor from "./account-profile-editor";
import type { ProfileIdentity } from "@/hooks/use-profile-identity";
import { requestJSON } from "@/lib/request-json";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { roles, type Role } from "@/lib/permissions";
import LogoutButton from "./logout-button";
import { markFormSaved } from "@/lib/unsaved-changes";
import { toast } from "sonner";
import { BriefcaseBusiness, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

type Account = {
  user: { accountId: string; avatarUrl?: string; email: string; loginPhone?: string; displayName: string; role: Role; position: string; programIds: string[] };
  profile: { name: string; dusun: string; phone: string; status: string; verification: string };
};

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof UserRound }) {
  return (
    <div className="min-w-0 rounded-xl border bg-background p-3">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">{Icon && <Icon className="size-3.5" />}{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export default function MyAccount() {
  const [data, setData] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordError, setPasswordError] = useState("");
  const pending = useRef(false);
  const current = useRef<AbortController | null>(null);

  function load() {
    current.current?.abort();
    const request = new AbortController();
    current.current = request;
    setLoading(true);
    setError("");
    requestJSON<Account & { error?: string }>("/api/account", { cache: "no-store", signal: request.signal })
      .then(({ response, data: result }) => {
        if (request.signal.aborted) return;
        if (!response.ok) throw Error(result?.error || "Informasi akun belum dapat dimuat.");
        if (!result?.user || !result.profile) throw Error("Informasi akun belum lengkap. Muat ulang.");
        setData(result);
      })
      .catch(cause => {
        if (request.signal.aborted) return;
        setData(null);
        setError(cause instanceof Error ? cause.message : "Informasi akun belum dapat dimuat.");
      })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
  }

  useEffect(() => {
    load();
    return () => current.current?.abort();
  }, []);

  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    const form = event.currentTarget;
    setBusy(true);
    setPasswordError("");
    try {
      const { response, data: result } = await requestJSON<{ error?: string }>("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", ...Object.fromEntries(new FormData(form)) }),
      });
      if (!response.ok) throw Error(result?.error || "Kata sandi belum diperbarui. Coba lagi.");
      markFormSaved(form);
      form.reset();
      toast.success("Kata sandi berhasil diperbarui.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Kata sandi belum diperbarui. Coba lagi.";
      setPasswordError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {error && (
        <Alert variant="destructive" className="xl:col-span-2">
          <AlertTitle>Informasi akun belum tersedia</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}<Button variant="outline" onClick={load}>Coba lagi</Button>
          </AlertDescription>
        </Alert>
      )}

      {data && <AccountProfileEditor key={data.user.accountId} user={data.user} onSaved={(profile: ProfileIdentity) => setData(current => current ? { ...current, user: { ...current.user, ...profile } } : current)} />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4 text-primary" />Identitas dan kontak</CardTitle>
          <CardDescription>Informasi yang terhubung dengan keanggotaan Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          {data ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Nama keanggotaan" value={data.profile.name} />
              <Detail label="Email akun" value={data.user.email || "Belum terhubung"} icon={Mail} />
              <Detail label="Nomor telepon" value={data.profile.phone || data.user.loginPhone || "Belum dicatat"} icon={Phone} />
              <Detail label="Dusun / alamat" value={data.profile.dusun || "Belum dicatat"} icon={MapPin} />
            </dl>
          ) : loading ? <Skeleton className="h-36 w-full" /> : <p className="text-sm text-muted-foreground">Data akun belum tersedia.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" />Keanggotaan dan akses</CardTitle>
          <CardDescription>Status dan kewenangan akun pada sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          {data ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Status keanggotaan" value={data.profile.status} />
              <Detail label="Verifikasi data" value={data.profile.verification} />
              <Detail label="Hak akses" value={roles[data.user.role]} icon={ShieldCheck} />
              <Detail label="Jabatan" value={data.user.position || "Belum dicatat"} icon={BriefcaseBusiness} />
              <div className="sm:col-span-2"><Detail label="Program penugasan" value={data.user.programIds.join(", ") || "Tidak ada penugasan"} /></div>
            </dl>
          ) : loading ? <Skeleton className="h-36 w-full" /> : <p className="text-sm text-muted-foreground">Data akses belum tersedia.</p>}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Koreksi identitas dan perubahan hak akses dikelola oleh pengurus.</p>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Keamanan akun</CardTitle>
          <CardDescription>Perbarui kata sandi secara berkala. Jangan bagikan kepada siapa pun.</CardDescription>
        </CardHeader>
        <CardContent>
          <form data-protect-unsaved onSubmit={change}>
            <FieldGroup>
              {passwordError && <Alert variant="destructive"><AlertTitle>Kata sandi belum diperbarui</AlertTitle><AlertDescription>{passwordError}</AlertDescription></Alert>}
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["currentPassword", "Kata sandi saat ini", "current-password"],
                  ["password", "Kata sandi baru", "new-password"],
                  ["confirmation", "Ulangi kata sandi baru", "new-password"],
                ].map(([name, label, autocomplete]) => (
                  <Field key={name}>
                    <FieldLabel htmlFor={name}>{label}</FieldLabel>
                    <Input id={name} name={name} type="password" autoComplete={autocomplete} minLength={name === "currentPassword" ? undefined : 12} maxLength={128} required disabled={busy} />
                  </Field>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Gunakan 12–128 karakter.</p>
              <div><Button disabled={busy || !data}>{busy ? "Menyimpan…" : "Perbarui kata sandi"}</Button></div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div className="xl:col-span-2"><LogoutButton /></div>
    </div>
  );
}
