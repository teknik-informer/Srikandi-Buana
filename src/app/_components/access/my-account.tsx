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
type Account = {
  user: { accountId: string; avatarUrl?: string; email: string; displayName: string; role: Role; position: string; programIds: string[] };
  profile: { name: string; dusun: string; phone: string; status: string; verification: string };
};
export default function MyAccount() {
  const [data, setData] = useState<Account | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
      .then(({ response: r, data: d }) => {
        if (request.signal.aborted) return;
        if (!r.ok) throw Error(d?.error || "Informasi akun belum dapat dimuat.");
        if (!d?.user || !d.profile) throw Error("Respons akun belum lengkap. Muat ulang sebelum melanjutkan.");
        setData(d);
      })
      .catch((e) => {
        if (request.signal.aborted) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Informasi akun belum dapat dimuat.");
      })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
  }
  useEffect(() => {
    load();
    return () => current.current?.abort();
  }, []);
  async function change(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    const form = e.currentTarget;
    setBusy(true);
    setPasswordError("");
    try {
      const { response: r, data: d } = await requestJSON<{ error?: string }>("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "password", ...Object.fromEntries(new FormData(form)) }),
        });
      if (!r.ok) throw Error(d?.error || "Password belum diperbarui. Coba lagi.");
      markFormSaved(form);
      form.reset();
      toast.success("Password diperbarui. Seluruh sesi lama telah dicabut.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Password belum diperbarui. Coba lagi.";
      setPasswordError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Informasi belum dapat dimuat</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" onClick={load}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {data && <AccountProfileEditor key={data.user.accountId} user={data.user} onSaved={(profile: ProfileIdentity) => setData(current => current ? {...current,user:{...current.user,...profile}} : current)} />}
      <Card>
        <CardHeader>
          <CardTitle>Akun saya</CardTitle>
          <CardDescription>
            Identitas dan mandat akses Anda. Gunakan Keluar akun di bagian atas atau di bawah untuk mengakhiri sesi
            perangkat ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data ? (
            <dl className="flex flex-col gap-3">
              {[
                ["Nama tampilan", data.user.displayName],
                ["Nama keanggotaan", data.profile.name],
                ["Email masuk", data.user.email],
                ["Hak akses", roles[data.user.role]],
                ["Jabatan", data.user.position || "Belum dicatat"],
                ["Program penugasan", data.user.programIds.join(", ") || "—"],
                ["Alamat", data.profile.dusun || "—"],
                ["WhatsApp", data.profile.phone || "—"],
                ["Keanggotaan", data.profile.status],
                ["Verifikasi", data.profile.verification],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-medium break-words">{value}</dd>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Hubungi sekretaris untuk koreksi identitas. Perubahan hak akses hanya dilakukan administrator.
              </p>
            </dl>
          ) : loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <p>Informasi akun belum tersedia. Muat ulang untuk mencoba kembali.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ubah Kata Sandi</CardTitle>
          <CardDescription>Setelah berhasil, sesi pada perangkat lain akan berakhir.</CardDescription>
        </CardHeader>
        <CardContent>
          <form data-protect-unsaved onSubmit={change}>
            <FieldGroup>
              {passwordError && <Alert variant="destructive"><AlertTitle>Kata sandi belum diperbarui</AlertTitle><AlertDescription>{passwordError}</AlertDescription></Alert>}
              {[
                ["currentPassword", "Kata sandi saat ini", "current-password"],
                ["password", "Kata sandi baru", "new-password"],
                ["confirmation", "Konfirmasi kata sandi baru", "new-password"],
              ].map(([name, label, autocomplete]) => (
                <Field key={name}>
                  <FieldLabel htmlFor={name}>{label}</FieldLabel>
                  <Input
                    id={name}
                    name={name}
                    type="password"
                    autoComplete={autocomplete}
                    minLength={name === "currentPassword" ? undefined : 12}
                    maxLength={128}
                    required
                    disabled={busy}
                  />
                </Field>
              ))}
              <p className="text-sm text-muted-foreground">
                Gunakan 12–128 karakter. Kata sandi tidak perlu diberikan kepada administrator.
              </p>
              <Button disabled={busy || !data}>{busy ? "Menyimpan…" : "Perbarui kata sandi"}</Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        <LogoutButton />
      </div>
    </div>
  );
}
