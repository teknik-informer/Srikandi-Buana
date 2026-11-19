"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronDown, LoaderCircle, UserRoundPen } from "lucide-react";

type ProfileField = { key: string; label: string; placeholder: string; multiline?: boolean };
type ProfileGroup = { title: string; description: string; fields: ProfileField[] };

const groups: ProfileGroup[] = [
  {
    title: "Latar belakang",
    description: "Pendidikan dan kegiatan utama.",
    fields: [
      { key: "education", label: "Pendidikan terakhir", placeholder: "Contoh: SMA / sederajat" },
      { key: "occupation", label: "Pekerjaan atau kegiatan utama", placeholder: "Contoh: Petani, usaha rumahan" },
    ],
  },
  {
    title: "Keahlian dan pengalaman",
    description: "Kompetensi, pengalaman, serta pelatihan yang pernah diikuti.",
    fields: [
      { key: "skills", label: "Keahlian", placeholder: "Keahlian yang dimiliki", multiline: true },
      { key: "experience", label: "Pengalaman", placeholder: "Pengalaman pertanian, organisasi, atau usaha", multiline: true },
      { key: "trainingHistory", label: "Pelatihan dan sertifikasi", placeholder: "Pelatihan atau pendampingan yang pernah diikuti", multiline: true },
    ],
  },
  {
    title: "Potensi dan tujuan",
    description: "Informasi singkat tentang lahan, komoditas, dan minat pengembangan.",
    fields: [
      { key: "farmArea", label: "Luas lahan garapan", placeholder: "Contoh: 0,25 hektare" },
      { key: "commodities", label: "Komoditas utama", placeholder: "Contoh: Kopi, cabai, sayuran" },
      { key: "bio", label: "Profil singkat", placeholder: "Ceritakan minat dan tujuan pengembangan diri", multiline: true },
    ],
  },
];

const fields: ProfileField[] = groups.flatMap(group => group.fields);

export default function MemberProfileCompletion({ profile, onSaved }: { profile: Record<string, unknown>; onSaved: () => unknown }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const completed = fields.filter(field => String(profile[field.key] || "").trim()).length;
  const percent = Math.round(completed / fields.length * 100);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    try {
      const response = await fetch("/api/member/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Profil belum dapat disimpan.");
      await onSaved();
      setEditing(false);
      setSuccess(result.profileCompleted ? "Profil dan CV berhasil dilengkapi." : "Perubahan profil berhasil disimpan.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Koneksi terputus. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="member-cv-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><UserRoundPen className="size-5" /></span>
          <div>
            <h3 id="member-cv-title" className="font-semibold">Profil pribadi & CV</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Kenalkan pengalaman, keahlian, dan potensi Anda.</p>
          </div>
        </div>
        <Badge variant={percent === 100 ? "secondary" : "outline"}>{completed}/{fields.length} terisi</Badge>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: percent + "%" }} /></div>
      {success && <p role="status" className="mt-3 text-sm text-emerald-700">{success}</p>}
      {!editing ? (
        <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => { setError(""); setEditing(true); }}>
          {percent === 100 ? "Perbarui CV" : "Lengkapi profil"} <ChevronDown className="ml-2 size-4" />
        </Button>
      ) : (
        <form className="mt-5 space-y-5" onSubmit={submit} aria-busy={saving}>
          {groups.map(group => (
            <fieldset key={group.title} className="space-y-3 border-t pt-4 first:border-0 first:pt-0" disabled={saving}>
              <div><legend className="font-semibold text-sm">{group.title}</legend><p className="mt-1 text-xs text-muted-foreground">{group.description}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.fields.map(field => (
                  <label key={field.key} className={"grid gap-1.5 text-sm" + ("multiline" in field && field.multiline ? " sm:col-span-2" : "")}>
                    <span className="font-medium">{field.label}</span>
                    {"multiline" in field && field.multiline
                      ? <Textarea name={field.key} rows={3} maxLength={1200} defaultValue={String(profile[field.key] || "")} placeholder={field.placeholder} />
                      : <Input name={field.key} maxLength={1200} defaultValue={String(profile[field.key] || "")} placeholder={field.placeholder} />}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <p className="text-xs leading-5 text-muted-foreground">Data login, kontak, dan verifikasi tetap dikelola melalui pengurus.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? <><LoaderCircle className="mr-2 size-4 animate-spin" />Menyimpan…</> : <><CheckCircle2 className="mr-2 size-4" />Simpan profil</>}</Button>
          </div>
        </form>
      )}
    </section>
  );
}
