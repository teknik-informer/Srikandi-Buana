"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import ImagePicker from "./image-picker";
import { requestJSON } from "@/lib/request-json";
import { canDiscardChanges } from "@/lib/unsaved-changes";
import { markFormSaved } from "@/lib/unsaved-changes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup, FieldSet, FieldLegend, FieldDescription } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { siteDefaults, settingFields, settingGroups, validateSettings, type SiteSettings } from "@/lib/settings-config";
type FileRow = { id: string; name: string; mime: string; deleted_at?: string | null };
export default function SiteSettingsEditor({ files, onSaved }: { files: FileRow[]; onSaved: () => void | Promise<void> }) {
  const current = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const imagePending = useRef(false);
  const [uploading, setUploading] = useState(false);
  function imageBusy(value: boolean) { imagePending.current = value; setUploading(value); }
  const [data, setData] = useState<SiteSettings>({ ...siteDefaults }),
    [loading, setLoading] = useState(true),
    [loaded, setLoaded] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function load() {
    if (pending.current) return;
    current.current?.abort();
    const request = new AbortController();
    current.current = request;
    setLoading(true);
    setError("");
    try {
      const { response: r, data: d } = await requestJSON<{ settings?: SiteSettings; error?: string }>("/api/settings", { cache: "no-store", signal: request.signal });
      if (request.signal.aborted) return;
      if (!r.ok) throw Error(d?.error || "Pengaturan belum dapat dimuat.");
      if (!d?.settings) throw Error("Respons pengaturan belum lengkap. Coba lagi.");
      setData({ ...siteDefaults, ...d.settings });
      const currentForm = document.getElementById("site-settings-form");
      if (currentForm instanceof HTMLFormElement) markFormSaved(currentForm);
      setLoaded(true);
      setError("");
    } catch (e) {
      if (request.signal.aborted) return;
      setLoaded(false);
      setError(e instanceof Error ? e.message : "Pengaturan belum dapat dimuat");
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    load();
    return () => current.current?.abort();
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current || imagePending.current || loading || !loaded) return;
    pending.current = true;
    const form = e.currentTarget;
    setSaving(true);
    setError("");
    try {
      const validated = validateSettings(data);
      const { response: r, data: d } = await requestJSON<{ error?: string }>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!r.ok) throw Error(d?.error || "Pengaturan belum tersimpan.");
      setData(validated);
      markFormSaved(form);
      toast.success("Pengaturan tersimpan dan diterapkan pada halaman publik");
      setError("");
      try { await onSaved(); } catch { setError("Pengaturan tersimpan, tetapi tampilan belum diperbarui. Muat ulang halaman sebelum mencoba menyimpan lagi."); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pengaturan belum tersimpan");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan halaman publik</CardTitle>
        <CardDescription>
          Perubahan langsung tampil setelah disimpan. Masukkan hanya informasi yang telah diperiksa dan layak
          dipublikasikan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p role="alert" className="inbox-error">
            {error}
          </p>
        )}
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : !loaded ? (
          <Button onClick={load} variant="outline">
            Coba muat pengaturan lagi
          </Button>
        ) : (
          <form id="site-settings-form" data-protect-unsaved onSubmit={save}>
            <fieldset disabled={saving || uploading} className="min-w-0"><FieldGroup>
              <nav aria-label="Kelompok pengaturan" className="flex flex-wrap gap-2 rounded-lg bg-muted/40 p-3">
                {settingGroups.map(group => <Button asChild variant="outline" size="sm" key={group.id}><a href={"#settings-" + group.id}>{group.title}</a></Button>)}
              </nav>
              {settingGroups.map(group => <FieldSet key={group.id} id={"settings-" + group.id} className="scroll-mt-20 rounded-xl border p-4 sm:p-5">
                <FieldLegend>{group.title}</FieldLegend><FieldDescription>{group.description}</FieldDescription>
                <FieldGroup>{group.keys.map(key => {const f = settingFields.find(field => field.key === key)!; return <Field key={f.key}>
                  <FieldLabel htmlFor={"setting-" + f.key}>{f.label}{!f.optional ? " *" : ""}</FieldLabel>
                  {f.key.endsWith("FileId") ? <ImagePicker id={"setting-" + f.key} files={files} value={data[f.key]} onChange={id => setData(d => ({...d,[f.key]:id}))} onBusyChange={imageBusy} disabled={saving || uploading} /> : f.multiline ?
                    <Textarea id={"setting-" + f.key} required={!f.optional} rows={3} maxLength={f.key === "galleryIntro" ? 600 : f.key === "address" ? 500 : f.key === "heroSubtitle" ? 600 : f.key === "heroTitle" ? 150 : 5000} value={data[f.key]} onChange={e => setData(d => ({...d,[f.key]:e.target.value}))} /> :
                    <Input id={"setting-" + f.key} type={f.key === "email" ? "email" : f.key.endsWith("Url") ? "url" : f.key === "phone" ? "tel" : "text"} required={!f.optional} maxLength={f.key === "contactHours" ? 300 : f.key === "mapUrl" ? 1000 : f.key === "heroCredit" ? 220 : 5000} value={data[f.key]} onChange={e => setData(d => ({...d,[f.key]:e.target.value}))} />}
                </Field>;})}</FieldGroup>
                {group.id === "galeri" && <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href="/dashboard/galeri">Kelola foto galeri</a></Button><Button asChild variant="ghost"><a href="/dashboard/publikasi">Kelola kabar & kegiatan</a></Button></div>}
              </FieldSet>)}
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">Untuk akses akun dan password, buka <a className="underline" href="/dashboard/akun">Pengguna dan Hak Akses</a>. Untuk informasi kebijakan dan layanan, buka <a className="underline" href="/kebijakan" target="_blank" rel="noopener noreferrer">Pusat kebijakan</a>. Tanda * wajib diisi. Unggahan tersimpan di arsip; simpan formulir untuk menerapkannya ke situs.</div>
              <div className="flex gap-3 flex-wrap">
                <Button type="submit" disabled={saving || uploading}>
                  {saving ? "Menyimpan…" : "Simpan ke halaman publik"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (canDiscardChanges()) load();
                  }}
                  disabled={saving || uploading}
                >
                  Muat ulang
                </Button>
                <Button asChild variant="outline">
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    Lihat situs
                  </a>
                </Button>
              </div>
            </FieldGroup></fieldset>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
