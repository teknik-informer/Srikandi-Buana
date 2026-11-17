"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock3, KeyRound, RefreshCw, ShieldCheck, ToggleLeft, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Module = {
  id: string;
  label: string;
  category: string;
  route: string | null;
  readiness: string;
  lifecycle_status: string;
  default_enabled: boolean;
  enabled: boolean;
  workspaceOverride: boolean | null;
  workspaceReason: string | null;
  canEnable: boolean;
};
type Account = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  position: string;
  enabled: boolean;
  assignable: boolean;
};
type Grant = {
  id: string;
  userId: string;
  moduleId: string;
  effect: "allow" | "deny";
  reason: string;
  validFrom: string;
  expiresAt: string | null;
  createdAt: string;
  expired: boolean;
};
type Audit = {
  action: string;
  moduleId: string;
  targetUserId: string | null;
  targetName: string | null;
  actorName: string;
  reason: string;
  createdAt: string;
};
type Payload = {
  modules: Module[];
  accounts: Account[];
  grants: Grant[];
  audit: Audit[];
};
const roleNames: Record<string, string> = {
  ketua: "Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  koordinator: "Koordinator",
  anggota: "Anggota",
};

function localDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })
    : "Tanggal tidak tersedia";
}

export default function PlatformModuleAccessManager() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [moduleReasons, setModuleReasons] = useState<Record<string, string>>({});
  const [targetUser, setTargetUser] = useState("");
  const [targetModule, setTargetModule] = useState("");
  const [effect, setEffect] = useState("allow");
  const [expiresAt, setExpiresAt] = useState("");
  const [grantReason, setGrantReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/platform/modules", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(body.error || "Registri modul belum dapat dimuat.");
      if (!body || !Array.isArray(body.modules) || !Array.isArray(body.accounts) || !Array.isArray(body.grants) || !Array.isArray(body.audit)) {
        throw new Error("Respons pusat modul belum lengkap.");
      }
      setData(body);
      setTargetModule((current) => current || body.modules.find((item) => item.category === "application")?.id || "");
      setTargetUser((current) => current || body.accounts.find((item) => item.assignable)?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Koneksi pusat modul gagal.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const assignableAccounts = useMemo(() => data?.accounts.filter((account) => account.assignable) ?? [], [data]);
  const applicationModules = useMemo(() => data?.modules.filter((module) => module.category === "application") ?? [], [data]);

  async function submit(action: string, body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/platform/modules", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const result = await response.json() as { error?: string; ok?: boolean; unchanged?: boolean };
      if (!response.ok) throw new Error(result.error || "Perubahan akses belum tersimpan.");
      setSuccess(result.unchanged ? "Tidak ada perubahan karena status sudah sesuai." : "Perubahan tersimpan dan masuk ke audit akses.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Perubahan belum tersimpan.");
    } finally {
      setBusy(false);
    }
  }

  function setModuleEnabled(module: Module) {
    const reason = (moduleReasons[module.id] || "").trim();
    if (reason.length < 12) {
      setError("Alasan perubahan modul wajib diisi minimal 12 karakter.");
      return;
    }
    void submit("set_module_enabled", { moduleId: module.id, enabled: !module.enabled, reason });
    setModuleReasons((current) => ({ ...current, [module.id]: "" }));
  }

  function saveUserAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetUser || !targetModule) {
      setError("Pilih akun dan aplikasi terlebih dahulu.");
      return;
    }
    if (grantReason.trim().length < 12) {
      setError("Alasan perubahan akses wajib diisi minimal 12 karakter.");
      return;
    }
    void submit("set_user_module_access", {
      userId: targetUser,
      moduleId: targetModule,
      effect,
      expiresAt: expiresAt || null,
      reason: grantReason.trim(),
    });
    setGrantReason("");
    setExpiresAt("");
  }

  function moduleName(moduleId: string) {
    return data?.modules.find((module) => module.id === moduleId)?.label || moduleId;
  }
  function accountName(userId: string | null) {
    return data?.accounts.find((account) => account.id === userId)?.fullName || "Akun tidak tersedia";
  }

  return (
    <section className="space-y-5" aria-labelledby="module-access-manager-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h2 id="module-access-manager-title" className="text-lg font-semibold">Pengelolaan Akses Modul</h2>
            <Badge variant="outline">Tersimpan di database QA</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Aktifkan ruang kerja dan tetapkan akses peluncuran aplikasi untuk akun tertentu. Hak baca, tulis, ekspor dan persetujuan tetap mengikuti role organisasi serta scope record.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || busy}>
          <RefreshCw data-icon="inline-start" />
          Muat ulang
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Perubahan belum berhasil</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Perubahan tercatat</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <Alert>
        <ShieldCheck />
        <AlertTitle>Grant aplikasi bukan grant data</AlertTitle>
        <AlertDescription>
          “Izinkan aplikasi” hanya membuka ruang kerja. Pengguna tetap tidak dapat membaca atau mengubah data di luar kewenangan role dan penugasan organisasinya. Akun Administrator Sistem tidak dapat diberi hak bisnis melalui pengaturan ini.
        </AlertDescription>
      </Alert>

      {loading && !data ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ToggleLeft className="size-4 text-primary" /> Status ruang aplikasi</CardTitle>
                <CardDescription>Penonaktifan berlaku untuk seluruh akun pada workspace ini. Modul fondasi tanpa route belum dapat diaktifkan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {applicationModules.map((module) => (
                  <div key={module.id} className="space-y-2 rounded-xl border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{module.label}</p>
                        <p className="text-xs text-muted-foreground">{module.route || "Belum ada route ruang kerja"} · {module.readiness}</p>
                      </div>
                      <Badge variant={module.enabled ? "default" : "secondary"}>{module.enabled ? "Aktif" : "Nonaktif"}</Badge>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={moduleReasons[module.id] || ""}
                        onChange={(event) => setModuleReasons((current) => ({ ...current, [module.id]: event.target.value }))}
                        placeholder="Alasan perubahan (minimal 12 karakter)"
                        maxLength={500}
                        aria-label={"Alasan perubahan " + module.label}
                      />
                      <Button
                        size="sm"
                        variant={module.enabled ? "outline" : "default"}
                        disabled={busy || (!module.enabled && !module.canEnable)}
                        onClick={() => setModuleEnabled(module)}
                      >
                        {module.enabled ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </div>
                    {module.workspaceOverride !== null && (
                      <p className="text-xs text-muted-foreground">Override terakhir: {module.workspaceOverride ? "aktif" : "nonaktif"} · {module.workspaceReason}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-primary" /> Penetapan akses akun</CardTitle>
                <CardDescription>Pilih satu akun internal dan satu aplikasi. Akun admin sistem dikecualikan dari grant bisnis.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveUserAccess} className="space-y-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="module-access-user">Akun pengguna</FieldLabel>
                      <NativeSelect id="module-access-user" value={targetUser} onChange={(event) => setTargetUser(event.target.value)}>
                        <NativeSelectOption value="">Pilih akun</NativeSelectOption>
                        {assignableAccounts.map((account) => (
                          <NativeSelectOption key={account.id} value={account.id}>
                            {account.fullName} · {roleNames[account.role] || account.role} · {account.email}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="module-access-module">Aplikasi</FieldLabel>
                      <NativeSelect id="module-access-module" value={targetModule} onChange={(event) => setTargetModule(event.target.value)}>
                        {applicationModules.map((module) => (
                          <NativeSelectOption key={module.id} value={module.id}>{module.label}</NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="module-access-effect">Keputusan akses</FieldLabel>
                      <NativeSelect id="module-access-effect" value={effect} onChange={(event) => setEffect(event.target.value)}>
                        <NativeSelectOption value="allow">Izinkan membuka aplikasi</NativeSelectOption>
                        <NativeSelectOption value="deny">Blokir akses aplikasi</NativeSelectOption>
                        <NativeSelectOption value="inherit">Ikuti role organisasi</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="module-access-expiry">Masa berlaku (opsional, maksimal 366 hari)</FieldLabel>
                      <Input id="module-access-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="module-access-reason">Alasan dan dasar penetapan</FieldLabel>
                      <Textarea id="module-access-reason" value={grantReason} onChange={(event) => setGrantReason(event.target.value)} maxLength={500} rows={3} placeholder="Tuliskan alasan penetapan akses, misalnya penugasan kerja atau pembatasan sementara." required />
                    </Field>
                  </FieldGroup>
                  <Button type="submit" disabled={busy || !assignableAccounts.length || !targetModule}>
                    {busy ? "Menyimpan…" : "Simpan perubahan akses"}
                  </Button>
                  {!assignableAccounts.length && <p className="text-xs text-muted-foreground">Belum ada akun struktural/anggota aktif yang dapat diberi override.</p>}
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Override akses yang tercatat</CardTitle>
              <CardDescription>Grant kedaluwarsa tetap terlihat sebagai histori; saat kedaluwarsa role kembali menjadi acuan, kecuali ada aturan penolakan aktif lainnya.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.grants.length ? (
                <div className="space-y-2">
                  {data.grants.map((grant) => (
                    <div key={grant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{accountName(grant.userId)} · {moduleName(grant.moduleId)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{grant.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Ditetapkan {localDate(grant.createdAt)}{grant.expiresAt ? " · Berakhir " + localDate(grant.expiresAt) : " · Tanpa batas waktu"}</p>
                      </div>
                      <Badge variant={grant.expired ? "secondary" : grant.effect === "deny" ? "destructive" : "default"}>
                        {grant.expired ? "Kedaluwarsa" : grant.effect === "allow" ? "Izinkan aplikasi" : "Blokir aplikasi"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Belum ada override akses. Semua pengguna mengikuti role dan scope organisasi.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-primary" /> Riwayat perubahan akses</CardTitle>
              <CardDescription>Log append-only yang menyimpan pelaku, target, alasan dan waktu perubahan.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.audit.length ? (
                <div className="space-y-3">
                  {data.audit.map((entry, index) => (
                    <div key={entry.createdAt + entry.moduleId + index} className="border-l-2 pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{moduleName(entry.moduleId)}</p>
                        <Badge variant="outline">{entry.action.replaceAll("_", " ")}</Badge>
                      </div>
                      <p className="mt-1 text-sm">{entry.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.actorName}{entry.targetName ? " → " + entry.targetName : ""} · {localDate(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Belum ada perubahan akses pada workspace ini.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
