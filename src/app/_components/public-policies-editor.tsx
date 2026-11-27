"use client";

import { useEffect, useState } from "react";
import { requestJSON } from "@/lib/request-json";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ManagedPolicy, PublicPolicySettings } from "@/lib/public-policies";

type SectionDraft = { id: string; title: string; paragraphsText: string; itemsText: string };
type PolicyDraft = Omit<ManagedPolicy, "sections"> & { sections: SectionDraft[] };

const topics = [
  "Informasi kelompok", "Keanggotaan", "Kemitraan", "Dukungan akun",
  "Pengaduan", "Koreksi informasi", "Permintaan data pribadi",
  "Laporan keamanan", "Bantuan aksesibilitas", "Lainnya",
];
const defaultSettings: PublicPolicySettings = { enabled: true, documents: [] };

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

function toDraft(document?: ManagedPolicy): PolicyDraft {
  return {
    id: document?.id || "",
    slug: document?.slug || "",
    title: document?.title || "",
    description: document?.description || "",
    category: document?.category || "Privasi & penggunaan",
    topic: document?.topic || "Informasi kelompok",
    status: document?.status || "draft",
    version: document?.version || "1.0",
    effectiveDate: document?.effectiveDate || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    updatedAt: document?.updatedAt || "",
    sections: document?.sections.map((section) => ({
      id: section.id,
      title: section.title,
      paragraphsText: section.paragraphs.join("\n\n"),
      itemsText: (section.items || []).join("\n"),
    })) || [{ id: "informasi-umum", title: "Informasi umum", paragraphsText: "", itemsText: "" }],
  };
}

function fromDraft(draft: PolicyDraft): ManagedPolicy {
  const slug = slugify(draft.slug || draft.title);
  return {
    id: draft.id || slug,
    slug,
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category.trim(),
    topic: draft.topic,
    status: draft.status,
    version: draft.version.trim() || "1.0",
    effectiveDate: draft.effectiveDate.trim(),
    updatedAt: draft.updatedAt || "",
    sections: draft.sections.map((section, index) => ({
      id: slugify(section.id || section.title) || "bagian-" + (index + 1),
      title: section.title.trim(),
      paragraphs: section.paragraphsText.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean),
      ...(section.itemsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).length
        ? { items: section.itemsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }
        : {}),
    })),
  };
}

export default function PublicPoliciesEditor() {
  const [settings, setSettings] = useState<PublicPolicySettings>(defaultSettings);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await requestJSON<{ settings?: PublicPolicySettings; error?: string }>(
        "/api/policies",
        { cache: "no-store" },
      );
      if (!response.ok || !data?.settings) throw new Error(data?.error || "Pengaturan kebijakan belum dapat dimuat.");
      setSettings(data.settings);
      setDraft(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pengaturan kebijakan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function saveDraft() {
    if (!draft) return;
    const document = fromDraft(draft);
    if (!document.title || !document.description || !document.category || !document.slug || !document.sections.length) {
      setError("Lengkapi judul, slug, ringkasan, kategori, dan minimal satu bagian.");
      return;
    }
    const duplicate = settings.documents.some((item) => item.slug === document.slug && item.id !== document.id);
    if (duplicate) {
      setError("Slug tersebut sudah dipakai dokumen lain. Gunakan slug yang berbeda.");
      return;
    }
    setSettings((current) => {
      const exists = current.documents.some((item) => item.id === document.id);
      return {
        ...current,
        documents: exists
          ? current.documents.map((item) => item.id === document.id ? document : item)
          : [...current.documents, document],
      };
    });
    setDraft(null);
    setError("");
  }

  async function saveAll() {
    if (saving || loading) return;
    setSaving(true);
    setError("");
    try {
      const { response, data } = await requestJSON<{ settings?: PublicPolicySettings; error?: string }>(
        "/api/policies",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        },
      );
      if (!response.ok || !data?.settings) throw new Error(data?.error || "Pengaturan kebijakan belum tersimpan.");
      setSettings(data.settings);
      toast.success("Pengaturan dan dokumen kebijakan berhasil disimpan.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Pengaturan kebijakan belum tersimpan.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function removeDocument(document: ManagedPolicy) {
    if (!window.confirm("Hapus dokumen “" + document.title + "”? Dokumen tidak lagi tampil pada pusat kebijakan setelah perubahan disimpan.")) return;
    setSettings((current) => ({
      ...current,
      documents: current.documents.filter((item) => item.id !== document.id),
    }));
    if (draft?.id === document.id) setDraft(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumen & kebijakan publik</CardTitle>
        <CardDescription>
          Kelola dokumen yang tampil pada pusat kebijakan. Dokumen Draf hanya tersimpan untuk pengelola; dokumen Terbit dapat dibaca pengunjung.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="space-y-3" aria-live="polite"><div className="h-5 w-48 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded-lg bg-muted" /></div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div className="min-w-0">
                <p className="font-medium">Pusat kebijakan situs</p>
                <p className="text-sm text-muted-foreground">Matikan untuk menyembunyikan pusat kebijakan dan halaman dokumennya dari pengunjung.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={settings.enabled}
                  onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
                />
                {settings.enabled ? "Aktif" : "Nonaktif"}
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold">Daftar dokumen</h3><p className="text-sm text-muted-foreground">{settings.documents.length} dokumen tersimpan</p></div>
              <Button type="button" variant="outline" onClick={() => { setError(""); setDraft(toDraft()); }}>Tambah dokumen</Button>
            </div>
            <div className="overflow-hidden rounded-xl border">
              {settings.documents.length ? settings.documents.map((document) => (
                <div key={document.id} className="flex flex-wrap items-start justify-between gap-3 border-b p-4 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{document.title}</p>
                      <span className={"rounded-full px-2 py-0.5 text-xs " + (document.status === "published" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>{document.status === "published" ? "Terbit" : "Draf"}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{document.category} · /{document.slug} · Versi {document.version}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{document.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setError(""); setDraft(toDraft(document)); }}>Ubah</Button>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeDocument(document)}>Hapus</Button>
                  </div>
                </div>
              )) : <p className="p-5 text-sm text-muted-foreground">Belum ada dokumen. Tambahkan dokumen pertama untuk mengisi pusat kebijakan.</p>}
            </div>

            {draft && (
              <section className="space-y-4 rounded-xl border bg-muted/10 p-4 sm:p-5" aria-label="Editor dokumen kebijakan">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="font-semibold">{draft.id ? "Ubah dokumen" : "Dokumen baru"}</h3><p className="text-sm text-muted-foreground">Isi bagian yang akan diterbitkan. Jangan masukkan nomor legalitas atau klaim yang belum diverifikasi.</p></div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>Tutup editor</Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium">Judul dokumen *</span><Input value={draft.title} maxLength={150} onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value, ...(!current.slug ? { slug: slugify(event.target.value) } : {}) } : current)} /></label>
                  <label className="space-y-1.5 text-sm"><span className="font-medium">Slug alamat *</span><Input value={draft.slug} maxLength={90} placeholder="contoh: legalitas-situs" onChange={(event) => setDraft((current) => current ? { ...current, slug: slugify(event.target.value) } : current)} /><span className="block text-xs text-muted-foreground">Alamat dibuat dari huruf kecil, angka, dan tanda hubung.</span></label>
                  <label className="space-y-1.5 text-sm"><span className="font-medium">Kategori *</span><Input value={draft.category} maxLength={80} onChange={(event) => setDraft((current) => current ? { ...current, category: event.target.value } : current)} /></label>
                  <label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium">Ringkasan *</span><Textarea rows={2} maxLength={500} value={draft.description} onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)} /></label>
                  <label className="space-y-1.5 text-sm"><span className="font-medium">Status</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={draft.status} onChange={(event) => setDraft((current) => current ? { ...current, status: event.target.value as "published" | "draft" } : current)}><option value="draft">Draf</option><option value="published">Terbit</option></select></label>
                  <label className="space-y-1.5 text-sm"><span className="font-medium">Topik formulir tindak lanjut</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={draft.topic} onChange={(event) => setDraft((current) => current ? { ...current, topic: event.target.value } : current)}>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></label>
                  <label className="space-y-1.5 text-sm"><span className="font-medium">Versi</span><Input value={draft.version} maxLength={30} onChange={(event) => setDraft((current) => current ? { ...current, version: event.target.value } : current)} /></label>
                  <label className="space-y-1.5 text-sm"><span className="font-medium">Tanggal berlaku</span><Input value={draft.effectiveDate} maxLength={60} onChange={(event) => setDraft((current) => current ? { ...current, effectiveDate: event.target.value } : current)} /></label>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Isi dokumen</h4><Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => current ? { ...current, sections: [...current.sections, { id: "", title: "", paragraphsText: "", itemsText: "" }] } : current)}>Tambah bagian</Button></div>
                  {draft.sections.map((section, index) => (
                    <div key={index} className="space-y-3 rounded-lg border bg-background p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">Bagian {index + 1}</p>{draft.sections.length > 1 && <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDraft((current) => current ? { ...current, sections: current.sections.filter((_, i) => i !== index) } : current)}>Hapus bagian</Button>}</div>
                      <label className="block space-y-1.5 text-sm"><span className="font-medium">Judul bagian *</span><Input value={section.title} maxLength={150} onChange={(event) => setDraft((current) => current ? { ...current, sections: current.sections.map((item, i) => i === index ? { ...item, title: event.target.value, id: item.id || slugify(event.target.value) } : item) } : current)} /></label>
                      <label className="block space-y-1.5 text-sm"><span className="font-medium">Paragraf</span><Textarea rows={4} maxLength={12000} value={section.paragraphsText} placeholder="Satu paragraf per baris kosong." onChange={(event) => setDraft((current) => current ? { ...current, sections: current.sections.map((item, i) => i === index ? { ...item, paragraphsText: event.target.value } : item) } : current)} /></label>
                      <label className="block space-y-1.5 text-sm"><span className="font-medium">Butir daftar (opsional)</span><Textarea rows={3} maxLength={6000} value={section.itemsText} placeholder="Satu butir per baris." onChange={(event) => setDraft((current) => current ? { ...current, sections: current.sections.map((item, i) => i === index ? { ...item, itemsText: event.target.value } : item) } : current)} /></label>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDraft(null)}>Batal</Button>
                  <Button type="button" onClick={saveDraft}>Terapkan ke daftar</Button>
                </div>
              </section>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => void load()} disabled={saving}>Muat ulang</Button>
              <Button type="button" onClick={() => void saveAll()} disabled={saving || !!draft}>
                {saving ? "Menyimpan…" : "Simpan pengaturan kebijakan"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
