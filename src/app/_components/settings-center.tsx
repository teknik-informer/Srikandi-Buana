"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, Globe2, KeyRound, Palette, ShieldCheck, UsersRound } from "lucide-react";
import { requestJSON } from "@/lib/request-json";
import { markFormSaved } from "@/lib/unsaved-changes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import SiteSettingsEditor from "./site-settings-editor";

type FileRow = { id: string; name: string; mime: string; deleted_at?: string | null };
type OrganizationSettings = {
  name: string; shortName: string; village: string; district: string; regency: string;
  province: string; postalCode: string; country: string; description: string;
};
const defaults: OrganizationSettings = {
  name: "KWT Srikandi Buana", shortName: "Srikandi Buana", village: "Ngadimulyo",
  district: "Kedu", regency: "Temanggung", province: "Jawa Tengah", postalCode: "56252",
  country: "Indonesia", description: "",
};
const fields: { key: keyof OrganizationSettings; label: string; max: number; multiline?: boolean }[] = [
  { key: "name", label: "Nama resmi organisasi", max: 140 },
  { key: "shortName", label: "Nama singkat", max: 100 },
  { key: "village", label: "Desa", max: 100 },
  { key: "district", label: "Kecamatan", max: 100 },
  { key: "regency", label: "Kabupaten", max: 100 },
  { key: "province", label: "Provinsi", max: 100 },
  { key: "postalCode", label: "Kode pos", max: 5 },
  { key: "country", label: "Negara", max: 100 },
  { key: "description", label: "Catatan identitas organisasi", max: 1000, multiline: true },
];

function OrganizationEditor() {
  const [data, setData] = useState(defaults), [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const request = useRef<AbortController | null>(null), pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    requestJSON<{ settings?: OrganizationSettings; error?: string }>("/api/organization-settings", { cache: "no-store", signal: controller.signal })
      .then(({ response, data: result }) => {
        if (!response.ok || !result?.settings) throw new Error(result?.error || "Data organisasi belum dapat dimuat.");
        if (!controller.signal.aborted) { setData({ ...defaults, ...result.settings }); setLoaded(true); }
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Koneksi gagal."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current || !loaded) return;
    pending.current = true; setSaving(true); setError("");
    const form = event.currentTarget;
    try {
      const { response, data: result } = await requestJSON<{ error?: string }>("/api/organization-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(result?.error || "Pengaturan organisasi belum tersimpan.");
      markFormSaved(form); toast.success("Identitas organisasi berhasil disimpan.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Pengaturan belum tersimpan.";
      setError(message); toast.error(message);
    } finally { pending.current = false; setSaving(false); }
  }
  return <Card id="organisasi">
    <CardHeader><CardTitle>Identitas organisasi</CardTitle><CardDescription>Data induk organisasi yang digunakan sebagai referensi administrasi. Perubahan hanya berlaku setelah disimpan oleh administrator.</CardDescription></CardHeader>
    <CardContent>
      {error && <Alert variant="destructive"><AlertTitle>Pengaturan belum selesai</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {loading ? <Skeleton className="h-48 w-full" /> : !loaded ? <p className="text-sm text-muted-foreground">Data belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.</p> :
        <form data-protect-unsaved onSubmit={save}><FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => <Field key={field.key} className={field.multiline ? "sm:col-span-2" : ""}>
              <FieldLabel htmlFor={"org-" + field.key}>{field.label}</FieldLabel>
              {field.multiline ? <Textarea id={"org-" + field.key} maxLength={field.max} rows={3} value={data[field.key]} onChange={(event) => setData((current) => ({ ...current, [field.key]: event.target.value }))} /> :
                <Input id={"org-" + field.key} maxLength={field.max} required value={data[field.key]} onChange={(event) => setData((current) => ({ ...current, [field.key]: event.target.value }))} />}
            </Field>)}
          </div>
          <div><Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan identitas organisasi"}</Button></div>
        </FieldGroup></form>}
    </CardContent>
  </Card>;
}

export default function SettingsCenter({ files, onSaved }: { files: FileRow[]; onSaved: () => void | Promise<void> }) {
  const shortcuts = [
    { href: "#preferensi", title: "Preferensi tampilan", description: "Tema, warna, tipografi, lebar konten, header, dan navigasi.", icon: Palette },
    { href: "#organisasi", title: "Identitas organisasi", description: "Nama dan wilayah organisasi sebagai data induk.", icon: Building2 },
    { href: "#website", title: "Website publik", description: "Beranda, profil, kontak, media sosial, logo, dan galeri.", icon: Globe2 },
    { href: "/dashboard/akun-saya", title: "Akun & keamanan", description: "Profil akun, pembaruan kata sandi, dan sesi login.", icon: KeyRound },
    { href: "/dashboard/akun", title: "Pengguna & hak akses", description: "Akun terdaftar, mandat peran, undangan, dan riwayat keamanan.", icon: UsersRound },
  ];
  return <div id="top" className="flex flex-col gap-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {shortcuts.map((item) => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a451]">
          <div className="mb-3 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground"><Icon size={18} /></span><span className="text-muted-foreground" aria-hidden="true">↗</span></div>
          <strong className="block text-sm font-semibold">{item.title}</strong><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
        </Link>;
      })}
    </div>
    <Card id="preferensi"><CardHeader><CardTitle>Preferensi tampilan global</CardTitle><CardDescription>Gunakan ikon roda gigi di header ruang kerja untuk mengatur tampilan. Preferensi berlaku lintas halaman pada perangkat dan akun browser yang sama.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Buka ikon roda gigi pada header untuk mengubah preferensi. Perubahan diterapkan langsung dan tersimpan otomatis.</p></CardContent></Card>
    <OrganizationEditor />
    <div id="website"><SiteSettingsEditor files={files} onSaved={onSaved} /></div>
    <Card><CardHeader><CardTitle>Kontrol dan keamanan akses</CardTitle><CardDescription>Pengaturan keamanan mengikuti sistem akun dan otorisasi yang sudah berjalan. Administrator dapat mengelola peran; setiap pengguna mengubah kata sandinya sendiri.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/dashboard/akun-saya"><ShieldCheck data-icon="inline-start" /> Akun & keamanan</Link></Button><Button asChild variant="outline"><Link href="/dashboard/akun"><UsersRound data-icon="inline-start" /> Pengguna & hak akses</Link></Button></CardContent></Card>
  </div>;
}
