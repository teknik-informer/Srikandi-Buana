"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Save, Trash2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { roles, type Role } from "@/lib/permissions";
import { requestJSON } from "@/lib/request-json";
import { markFormDirty, markFormSaved } from "@/lib/unsaved-changes";
import { publishProfileIdentity, type ProfileIdentity } from "@/hooks/use-profile-identity";
import UserAvatar from "./user-avatar";
import { toast } from "sonner";
type ProfileUser = ProfileIdentity & { email: string; role: Role; position: string };
export default function AccountProfileEditor({ user, onSaved }: { user: ProfileUser; onSaved: (profile: ProfileIdentity) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [selected, setSelected] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef(false), request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null), photoForm = useRef<HTMLFormElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!selected) { setPreview(""); return; }
    const url = URL.createObjectURL(selected); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selected]);
  function committed(profile: ProfileIdentity) {
    onSaved(profile); publishProfileIdentity(profile);
  }
  function choose(file?: File) {
    if (!file || pending.current) return;
    setError("");
    if (!/\.(jpe?g|png)$/i.test(file.name) || !file.size || file.size > 3 * 1024 * 1024) { setError("Pilih foto JPG/PNG berukuran maksimal 3 MB. Ekspor HEIC ke JPG terlebih dahulu."); return; }
    setSelected(file); markFormDirty(photoForm.current);
  }
  async function send(url: string, init: RequestInit, done: (profile: ProfileIdentity) => void) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    const controller = new AbortController(); request.current = controller;
    try {
      const headers = new Headers(init.headers); headers.set("X-Profile-Account", user.accountId);
      const { response, data } = await requestJSON<{ user?: ProfileIdentity; error?: string }>(url, { ...init, headers, signal: controller.signal }, url.endsWith("/avatar") && init.method === "POST" ? 90000 : 25000);
      if (controller.signal.aborted) return;
      if (!response.ok || !data?.user || data.user.accountId !== user.accountId) throw Error(data?.error || "Perubahan profil belum terkonfirmasi. Muat ulang untuk memeriksa sebelum mengirim ulang.");
      committed(data.user); done(data.user); toast.success("Profil diperbarui.");
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Profil belum diperbarui. Coba lagi."); }
    finally { pending.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    void send("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "profile", displayName }) }, profile => { setDisplayName(profile.displayName); markFormSaved(form); });
  }
  function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const body = new FormData(); body.append("file", selected);
    void send("/api/account/avatar", { method: "POST", body }, () => clearPhotoDraft());
  }
  function clearPhotoDraft() {
    setSelected(null); if (input.current) input.current.value = "";
    if (photoForm.current) markFormSaved(photoForm.current);
  }
  return <Card className="lg:col-span-2">
    <CardHeader><CardTitle>Profil pengguna</CardTitle><CardDescription>Atur nama yang tampil di ruang kerja dan foto akun pribadi Anda.</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      <div className="flex min-w-0 items-center gap-4 rounded-xl border bg-muted/20 p-4 sm:p-5">
        <UserAvatar user={{ displayName: user.displayName, avatarUrl: preview || user.avatarUrl }} className="size-16 ring-4 ring-background sm:size-20" />
        <div className="min-w-0 space-y-2"><p className="break-words text-xl font-semibold tracking-tight">{user.displayName}</p><p className="break-all text-sm text-muted-foreground">{user.email}</p><div className="flex flex-wrap gap-2"><Badge variant="secondary">{roles[user.role]}</Badge>{user.position && <Badge variant="outline">{user.position}</Badge>}</div></div>
      </div>
      {error && <Alert variant="destructive"><AlertTitle>Profil belum diperbarui</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <form data-protect-unsaved onSubmit={saveName} aria-label="Ubah nama tampilan">
          <fieldset disabled={busy} className="min-w-0"><FieldGroup><Field><FieldLabel htmlFor="profile-display-name">Nama tampilan</FieldLabel><Input id="profile-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} required autoComplete="nickname" aria-describedby="profile-name-help" /><FieldDescription id="profile-name-help">1–80 karakter. Nama keanggotaan, email masuk, dan mandat akses dicatat terpisah.</FieldDescription></Field><Button type="submit" disabled={busy || !displayName.trim()}><Save className="size-4" />{busy ? "Memproses…" : "Simpan nama tampilan"}</Button></FieldGroup></fieldset>
        </form>
        <form ref={photoForm} data-protect-unsaved onSubmit={savePhoto} aria-label="Ubah foto profil">
          <fieldset disabled={busy} className="min-w-0"><FieldGroup><Field><FieldLabel htmlFor="profile-photo">Foto profil</FieldLabel><Input ref={input} id="profile-photo" data-unsaved-ignore type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="sr-only" onChange={e => choose(e.target.files?.[0])} aria-describedby="profile-photo-help" /><Button type="button" variant="outline" onClick={() => input.current?.click()}><Camera className="size-4" />Pilih foto</Button><FieldDescription id="profile-photo-help">JPG/PNG, maksimal 3 MB dan 40 megapiksel. Foto dipotong persegi dari tengah, ditampilkan membulat, dan metadata lokasi dihapus. Foto ini hanya untuk akun Anda.</FieldDescription>{selected && <p className="break-all text-sm" role="status">Pilihan baru: {selected.name}. Simpan foto untuk menerapkannya.</p>}</Field><div className="flex flex-wrap gap-2">{selected ? <><Button type="submit" disabled={busy}><Save className="size-4" />Simpan foto</Button><Button type="button" variant="ghost" disabled={busy} onClick={clearPhotoDraft}><X className="size-4" />Batalkan pilihan</Button></> : user.avatarUrl && <Button type="button" variant="outline" disabled={busy} onClick={() => { void send("/api/account/avatar", { method: "DELETE" }, () => clearPhotoDraft()); }}><Trash2 className="size-4" />Hapus foto profil</Button>}</div></FieldGroup></fieldset>
        </form>
      </div>
      {busy && <p role="status" className="text-sm text-muted-foreground">Perubahan sedang diproses. Tunggu sampai selesai.</p>}
    </CardContent>
  </Card>;
}
