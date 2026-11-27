"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { requestJSON } from "@/lib/request-json";
import { toast } from "sonner";
import {
  defaultPublicPolicySettings,
  validatePublicPolicySettings,
  type ManagedPolicyDocument,
  type PublicPolicySettings
} from "@/lib/public-policies";
import { contactTopics } from "@/lib/contact-topics";

type SectionDraft = { id: string; title: string; paragraphsText: string; itemsText: string };
type DocumentDraft = {
  slug: string;
  title: string;
  description: string;
  category: string;
  topic: string;
  status: "published" | "draft";
  version: string;
  sections: SectionDraft[];
};
const toSections = (document: ManagedPolicyDocument): SectionDraft[] =>
  document.sections.map(section => ({
    id: section.id,
    title: section.title,
    paragraphsText: section.paragraphs.join("\n\n"),
    itemsText: (section.items || []).join("\n")
  }));
const toDraft = (document: ManagedPolicyDocument): DocumentDraft => ({
  slug: document.slug,
  title: document.title,
  description: document.description,
  category: document.category,
  topic: document.topic,
  status: document.status,
  version: document.version,
  sections: toSections(document)
});
const blankDraft = (): DocumentDraft => ({
  slug: "",
  title: "",
  description: "",
  category: "Layanan & bantuan",
  topic: "Informasi kelompok",
  status: "draft",
  version: "1.0",
  sections: [{ id: "informasi", title: "Informasi", paragraphsText: "", itemsText: "" }]
});
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function PublicPoliciesEditor({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const [settings, setSettings] = useState<PublicPolicySettings>(defaultPublicPolicySettings);
  const [draft, setDraft] = useState<DocumentDraft | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const publishedCount = useMemo(() => settings.documents.filter(item => item.status === "published").length, [settings.documents]);
  const draftCount = settings.documents.length - publishedCount;

  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const { response, data } = await requestJSON<{ settings?: PublicPolicySettings; error?: string }>("/api/policies", { cache: "no-store", signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!response.ok || !data?.settings) throw new Error(data?.error || "Dokumen kebijakan belum dapat dimuat.");
      setSettings(validatePublicPolicySettings(data.settings));
      setDraft(null);
      setOriginalSlug(null);
      setLoaded(true);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setLoaded(false);
      setError(cause instanceof Error ? cause.message : "Dokumen kebijakan belum dapat dimuat.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, []);

  function edit(document: ManagedPolicyDocument) {
    setDraft(toDraft(document));
    setOriginalSlug(document.slug);
    setSlugTouched(false);
    setError("");
  }
  function create() {
    setDraft(blankDraft());
    setOriginalSlug(null);
    setSlugTouched(false);
    setError("");
  }
  function updateDraft(patch: Partial<DocumentDraft>) {
    setDraft(current => current ? { ...current, ...patch } : current);
  }
  function updateSection(index: number, patch: Partial<SectionDraft>) {
    setDraft(current => current ? {
      ...current,
      sections: current.sections.map((section, i) => i === index ? { ...section, ...patch } : section)
    } : current);
  }
  function addSection() {
    setDraft(current => current ? {
      ...current,
      sections: [...current.sections, { id: "bagian-" + (current.sections.length + 1), title: "", paragraphsText: "", itemsText: "" }]
    } : current);
  }
  function removeSection(index: number) {
    setDraft(current => current ? { ...current, sections: current.sections.filter((_, i) => i !== index) } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const slug = slugify(draft.slug || draft.title);
      const sections = draft.sections.map((section, index) => ({
        id: slugify(section.id || section.title || "bagian-" + (index + 1)),
        title: section.title.trim(),
        paragraphs: section.paragraphsText.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean),
        items: section.itemsText.split("\n").map(value => value.trim()).filter(Boolean)
      })).map(section => ({ ...section, ...(section.items.length ? { items: section.items } : {}) }));
      const document: ManagedPolicyDocument = {
        slug,
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category.trim(),
        topic: draft.topic,
        status: draft.status,
        version: draft.version.trim() || "1.0",
        updatedAt: new Date().toISOString().slice(0, 10),
        sections
      };
      const documents = [...settings.documents];
      const existingIndex = originalSlug ? documents.findIndex(item => item.slug === originalSlug) : -1;
      if (existingIndex >= 0) documents[existingIndex] = document;
      else documents.push(document);
      const next = validatePublicPolicySettings({ ...settings, documents });
      const { response, data } = await requestJSON<{ error?: string; settings?: PublicPolicySettings }>("/api/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!response.ok || !data?.settings) throw new Error(data?.error || "Dokumen kebijakan belum tersimpan.");
      setSettings(validatePublicPolicySettings(data.settings));
      setDraft(null);
      setOriginalSlug(null);
      toast.success(document.status === "published" ? "Dokumen disimpan dan diterbitkan." : "Draf kebijakan berhasil disimpan.");
      await onSaved?.();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Dokumen kebijakan belum tersimpan.";
      setError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function changeEnabled(enabled: boolean) {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const next = validatePublicPolicySettings({ ...settings, enabled });
      const { response, data } = await requestJSON<{ error?: string; settings?: PublicPolicySettings }>("/api/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!response.ok || !data?.settings) throw new Error(data?.error || "Status pusat kebijakan belum tersimpan.");
      setSettings(validatePublicPolicySettings(data.settings));
      toast.success(enabled ? "Pusat kebijakan diaktifkan." : "Pusat kebijakan dinonaktifkan dari halaman publik.");
      await onSaved?.();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Status pusat kebijakan belum tersimpan.";
      setError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function remove(document: ManagedPolicyDocument) {
    if (pending.current || !window.confirm('Hapus dokumen "' + document.title + '"? Halaman publiknya juga akan dinonaktifkan.')) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const next = validatePublicPolicySettings({ ...settings, documents: settings.documents.filter(item => item.slug !== document.slug) });
      const { response, data } = await requestJSON<{ error?: string; settings?: PublicPolicySettings }>("/api/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!response.ok || !data?.settings) throw new Error(data?.error || "Dokumen belum dihapus.");
      setSettings(validatePublicPolicySettings(data.settings));
      if (originalSlug === document.slug) { setDraft(null); setOriginalSlug(null); }
      toast.success("Dokumen dihapus dari pusat kebijakan.");
      await onSaved?.();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Dokumen belum dihapus.";
      setError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Dokumen & kebijakan situs</CardTitle>
            <CardDescription className="mt-1">Kelola isi, status publikasi, dan daftar dokumen pada pusat kebijakan. Perubahan tersimpan di database Production aplikasi ini.</CardDescription>
          </div>
          <Button type="button" onClick={create} disabled={saving || loading}>Tambah dokumen</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <Checkbox id="public-policies-enabled" checked={settings.enabled} onCheckedChange={value => void changeEnabled(value === true)} disabled={saving || loading || !loaded} />
          <div className="min-w-0 flex-1">
            <label htmlFor="public-policies-enabled" className="text-sm font-medium">Aktifkan pusat kebijakan pada situs publik</label>
            <p className="text-xs text-muted-foreground">Saat dimatikan, halaman pusat kebijakan dan seluruh detail dokumennya tidak ditampilkan kepada pengunjung.</p>
          </div>
          <Badge variant={settings.enabled ? "default" : "secondary"}>{settings.enabled ? "Aktif" : "Nonaktif"}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{settings.documents.length} dokumen</span><span>·</span><span>{publishedCount} diterbitkan</span><span>·</span><span>{draftCount} draf</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {loading ? <Skeleton className="h-36 w-full" /> : !loaded ? (
          <Button type="button" variant="outline" onClick={() => void load()}>Muat ulang dokumen</Button>
        ) : (
          <>
            <div className="grid gap-2">
              {settings.documents.map(document => (
                <div key={document.slug} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{document.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{document.slug} · {document.category} · v{document.version}</p>
                  </div>
                  <Badge variant={document.status === "published" ? "default" : "secondary"}>{document.status === "published" ? "Terbit" : "Draf"}</Badge>
                  <Button type="button" size="sm" variant="outline" onClick={() => edit(document)} disabled={saving}>Edit</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void remove(document)} disabled={saving}>Hapus</Button>
                </div>
              ))}
              {settings.documents.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada dokumen. Tambahkan dokumen pertama untuk memulai.</p>}
            </div>
            {draft && (
              <form onSubmit={save} className="space-y-4 rounded-xl border bg-muted/20 p-4" data-protect-unsaved>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{originalSlug ? "Ubah dokumen kebijakan" : "Dokumen kebijakan baru"}</h3>
                    <p className="text-xs text-muted-foreground">Gunakan bahasa yang jelas, faktual, dan sesuai keputusan organisasi.</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft(null); setOriginalSlug(null); }} disabled={saving}>Tutup editor</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">Judul dokumen
                    <Input required maxLength={140} value={draft.title} onChange={event => {
                      const title = event.target.value;
                      setDraft(current => current ? { ...current, title, ...(!slugTouched && !originalSlug ? { slug: slugify(title) } : {}) } : current);
                    }} />
                  </label>
                  <label className="grid gap-1.5 text-sm">Slug URL
                    <Input required minLength={3} maxLength={64} value={draft.slug} onChange={event => { setSlugTouched(true); updateDraft({ slug: slugify(event.target.value) }); }} />
                  </label>
                  <label className="grid gap-1.5 text-sm md:col-span-2">Ringkasan
                    <Textarea required rows={2} maxLength={500} value={draft.description} onChange={event => updateDraft({ description: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">Kategori
                    <Input required maxLength={80} value={draft.category} onChange={event => updateDraft({ category: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">Topik formulir kontak
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.topic} onChange={event => updateDraft({ topic: event.target.value })}>
                      {contactTopics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm">Versi dokumen
                    <Input maxLength={24} value={draft.version} onChange={event => updateDraft({ version: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">Status publikasi
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.status} onChange={event => updateDraft({ status: event.target.value as "published" | "draft" })}>
                      <option value="draft">Draf — hanya terlihat pengelola</option>
                      <option value="published">Terbit — tampil pada situs publik</option>
                    </select>
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><h4 className="text-sm font-semibold">Isi dokumen</h4><p className="text-xs text-muted-foreground">Pisahkan paragraf dengan satu baris kosong. Daftar dibuat satu butir per baris.</p></div>
                    <Button type="button" size="sm" variant="outline" onClick={addSection} disabled={saving || draft.sections.length >= 20}>Tambah bagian</Button>
                  </div>
                  {draft.sections.map((section, index) => (
                    <div key={index} className="space-y-2 rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">Bagian {index + 1}</p>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeSection(index)} disabled={saving || draft.sections.length <= 1}>Hapus bagian</Button>
                      </div>
                      <Input required placeholder="Judul bagian" value={section.title} onChange={event => updateSection(index, { title: event.target.value, ...(!section.id || section.id.startsWith("bagian-") ? { id: slugify(event.target.value) } : {}) })} />
                      <Textarea rows={4} placeholder="Tulis paragraf. Pisahkan paragraf dengan baris kosong." value={section.paragraphsText} onChange={event => updateSection(index, { paragraphsText: event.target.value })} />
                      <Textarea rows={2} placeholder="Daftar opsional: satu butir per baris." value={section.itemsText} onChange={event => updateSection(index, { itemsText: event.target.value })} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan dokumen"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setDraft(null); setOriginalSlug(null); }} disabled={saving}>Batal</Button>
                </div>
              </form>
            )}
            <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              Dokumen bawaan tetap tersedia saat pertama kali dibuka. Dokumen berstatus Draf tidak ditampilkan ke publik. Halaman legalitas dimulai sebagai draf agar nomor pengesahan, identitas badan, atau registrasi layanan tidak terbit sebelum diverifikasi.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
