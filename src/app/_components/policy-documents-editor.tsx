"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { requestJSON } from "@/lib/request-json";
import { toast } from "sonner";
import { FilePlus2, Save, Archive, RotateCcw, Trash2, Plus, X } from "lucide-react";

type PolicyStatus = "draft" | "published" | "inactive";
type PolicySection = { id: string; title: string; paragraphs: string[]; items?: string[] };
type PolicyDocument = {
  slug: string; title: string; description: string; category: string; topic: string;
  status: PolicyStatus; version: string; effectiveDate: string; updatedAt: string; sections: PolicySection[];
};

const core = new Set(["privasi", "syarat-ketentuan", "kebijakan-cookie", "kebijakan-publikasi", "pedoman-komunitas", "pengaduan", "hak-data-pribadi", "aksesibilitas", "bantuan", "pengelola", "legalitas", "kebijakan-keamanan", "penyangkalan"]);
const today = () => new Date().toISOString().slice(0, 10);
const slugify = (value: string) => value.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
const emptyDocument = (): PolicyDocument => ({
  slug: "dokumen-baru", title: "", description: "", category: "Tata kelola informasi", topic: "Informasi kelompok",
  status: "draft", version: "1.0", effectiveDate: today(), updatedAt: today(),
  sections: [{ id: "ketentuan-umum", title: "Ketentuan umum", paragraphs: [""], items: [] }]
});
const statusLabel: Record<PolicyStatus, string> = { draft: "Draf", published: "Terbit", inactive: "Nonaktif" };
const statusVariant: Record<PolicyStatus, "secondary" | "default" | "outline"> = { draft: "secondary", published: "default", inactive: "outline" };

export default function PolicyDocumentsEditor() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [draft, setDraft] = useState<PolicyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const { response, data } = await requestJSON<{ documents?: PolicyDocument[]; error?: string }>("/api/policies", { cache: "no-store" });
      if (!response.ok || !data?.documents) throw new Error(data?.error || "Dokumen belum dapat dimuat.");
      setDocuments(data.documents);
      const selected = data.documents.find((doc) => doc.slug === selectedSlug) || data.documents[0] || null;
      setDraft(selected ? structuredClone(selected) : null);
      setSelectedSlug(selected?.slug || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dokumen belum dapat dimuat.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const publishedCount = useMemo(() => documents.filter((doc) => doc.status === "published").length, [documents]);
  const activeIndex = documents.findIndex((doc) => doc.slug === selectedSlug);

  function selectDocument(slug: string) {
    const document = documents.find((item) => item.slug === slug);
    if (!document) return;
    setSelectedSlug(slug);
    setDraft(structuredClone(document));
    setError("");
  }

  function updateDraft(update: Partial<PolicyDocument>) {
    setDraft((current) => current ? { ...current, ...update } : current);
  }

  function updateSection(index: number, update: Partial<PolicySection>) {
    setDraft((current) => current ? { ...current, sections: current.sections.map((section, i) => i === index ? { ...section, ...update } : section) } : current);
  }

  function addSection() {
    setDraft((current) => current ? { ...current, sections: [...current.sections, { id: "bagian-" + (current.sections.length + 1), title: "", paragraphs: [""], items: [] }] } : current);
  }

  function removeSection(index: number) {
    setDraft((current) => current && current.sections.length > 1 ? { ...current, sections: current.sections.filter((_, i) => i !== index) } : current);
  }

  async function persist(nextDocuments: PolicyDocument[], selected?: PolicyDocument) {
    setSaving(true); setError("");
    try {
      const normalized = nextDocuments.map((doc) => ({ ...doc, updatedAt: today() }));
      const { response, data } = await requestJSON<{ documents?: PolicyDocument[]; error?: string }>("/api/policies", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documents: normalized })
      });
      if (!response.ok || !data?.documents) throw new Error(data?.error || "Dokumen belum tersimpan.");
      setDocuments(data.documents);
      const next = selected ? data.documents.find((doc) => doc.slug === selected.slug) : data.documents.find((doc) => doc.slug === selectedSlug);
      setDraft(next ? structuredClone(next) : data.documents[0] ? structuredClone(data.documents[0]) : null);
      setSelectedSlug(next?.slug || "");
      toast.success("Dokumen dan kebijakan berhasil disimpan.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Dokumen belum tersimpan.";
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  }

  function createDocument() {
    const next = emptyDocument();
    const index = documents.findIndex((doc) => doc.slug === next.slug);
    if (index >= 0) next.slug = "dokumen-baru-" + (documents.length + 1);
    setDraft(next);
    setSelectedSlug(next.slug);
    setError("");
  }

  async function saveDocument() {
    if (!draft) return;
    const title = draft.title.trim();
    const slug = slugify(draft.slug || title);
    if (!slug) { setError("Judul dokumen wajib diisi."); return; }
    const next: PolicyDocument = {
      ...draft,
      slug,
      title,
      description: draft.description.trim(),
      sections: draft.sections.map((section) => ({
        ...section,
        id: slugify(section.title || section.id) || "bagian",
        title: section.title.trim(),
        paragraphs: section.paragraphs.flatMap((paragraph) => paragraph.split(/\n\s*\n/)).map((paragraph) => paragraph.trim()).filter(Boolean),
        items: (section.items || []).map((item) => item.trim()).filter(Boolean)
      }))
    };
    const existing = documents.findIndex((doc) => doc.slug === draft.slug);
    if (existing < 0 && documents.some((doc) => doc.slug === next.slug)) { setError("Alamat halaman sudah digunakan. Pilih slug yang berbeda."); return; }
    const all = [...documents];
    if (existing >= 0) all[existing] = next; else all.push(next);
    await persist(all, next);
  }

  async function setStatus(status: PolicyStatus) {
    if (!draft) return;
    const next = { ...draft, status };
    const all = documents.map((doc) => doc.slug === draft.slug ? next : doc);
    await persist(all, next);
  }

  async function deleteDocument() {
    if (!draft || core.has(draft.slug)) return;
    const all = documents.filter((doc) => doc.slug !== draft.slug);
    await persist(all, all[0]);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Dokumen & kebijakan situs</CardTitle>
            <CardDescription className="mt-1 max-w-3xl">
              Kelola legalitas situs, privasi, cookie, syarat penggunaan, publikasi, keamanan, pengaduan, dan dokumen pendukung. Hanya dokumen berstatus Terbit yang tampil untuk pengunjung.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={createDocument} disabled={loading || saving}><FilePlus2 data-icon="inline-start" /> Dokumen baru</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{documents.length} dokumen</Badge>
          <Badge>{publishedCount} terbit</Badge>
          <span>Draf dan nonaktif hanya terlihat di Studio.</span>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</p>}
        {loading ? <Skeleton className="h-56 w-full" /> : (
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.7fr)]">
            <aside className="min-w-0 space-y-2" aria-label="Daftar dokumen kebijakan">
              {documents.map((doc) => (
                <button key={doc.slug} type="button" onClick={() => selectDocument(doc.slug)} className={"flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 " + (selectedSlug === doc.slug ? "border-primary bg-muted/60" : "border-border")}>
                  <span className="min-w-0"><strong className="block break-words text-sm">{doc.title}</strong><small className="mt-1 block text-muted-foreground">{doc.version} · {doc.slug}</small></span>
                  <Badge variant={statusVariant[doc.status]}>{statusLabel[doc.status]}</Badge>
                </button>
              ))}
              {!documents.length && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Belum ada dokumen. Buat dokumen baru untuk memulai.</p>}
            </aside>

            {draft ? (
              <form className="min-w-0 space-y-4" onSubmit={(event) => { event.preventDefault(); void saveDocument(); }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Editor dokumen</p><h3 className="text-lg font-semibold">{draft.title || "Dokumen baru"}</h3></div>
                  <div className="flex flex-wrap gap-2">
                    {documents.some((doc) => doc.slug === draft.slug) && draft.status !== "published" && <Button type="button" size="sm" variant="outline" onClick={() => void setStatus("published")} disabled={saving}><RotateCcw data-icon="inline-start" /> Terbitkan</Button>}
                    {documents.some((doc) => doc.slug === draft.slug) && draft.status !== "inactive" && <Button type="button" size="sm" variant="outline" onClick={() => void setStatus("inactive")} disabled={saving}><Archive data-icon="inline-start" /> Nonaktifkan</Button>}
                    {documents.some((doc) => doc.slug === draft.slug) && draft.status === "inactive" && <Button type="button" size="sm" variant="outline" onClick={() => void setStatus("draft")} disabled={saving}><RotateCcw data-icon="inline-start" /> Pulihkan ke draf</Button>}
                    {!core.has(draft.slug) && documents.some((doc) => doc.slug === draft.slug) && <Button type="button" size="icon" variant="ghost" aria-label="Hapus dokumen" onClick={() => void deleteDocument()} disabled={saving}><Trash2 /></Button>}
                  </div>
                </div>
                <FieldGroup>
                  <Field><FieldLabel htmlFor="policy-title">Judul dokumen</FieldLabel><Input id="policy-title" required value={draft.title} maxLength={180} onChange={(event) => updateDraft({ title: event.target.value })} /></Field>
                  <Field><FieldLabel htmlFor="policy-description">Ringkasan</FieldLabel><Textarea id="policy-description" required rows={2} value={draft.description} maxLength={500} onChange={(event) => updateDraft({ description: event.target.value })} /></Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field><FieldLabel htmlFor="policy-category">Kategori</FieldLabel><NativeSelect id="policy-category" value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })}><NativeSelectOption value="Privasi & penggunaan">Privasi & penggunaan</NativeSelectOption><NativeSelectOption value="Tata kelola informasi">Tata kelola informasi</NativeSelectOption><NativeSelectOption value="Layanan & bantuan">Layanan & bantuan</NativeSelectOption><NativeSelectOption value="Legalitas situs">Legalitas situs</NativeSelectOption></NativeSelect></Field>
                    <Field><FieldLabel htmlFor="policy-status">Status</FieldLabel><NativeSelect id="policy-status" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as PolicyStatus })}><NativeSelectOption value="draft">Draf</NativeSelectOption><NativeSelectOption value="published">Terbit</NativeSelectOption><NativeSelectOption value="inactive">Nonaktif</NativeSelectOption></NativeSelect></Field>
                    <Field><FieldLabel htmlFor="policy-topic">Topik formulir kontak</FieldLabel><Input id="policy-topic" value={draft.topic} maxLength={100} onChange={(event) => updateDraft({ topic: event.target.value })} /></Field>
                    <Field><FieldLabel htmlFor="policy-version">Nomor versi</FieldLabel><Input id="policy-version" value={draft.version} maxLength={24} onChange={(event) => updateDraft({ version: event.target.value })} /></Field>
                    <Field><FieldLabel htmlFor="policy-effective">Tanggal berlaku</FieldLabel><Input id="policy-effective" type="date" value={draft.effectiveDate} onChange={(event) => updateDraft({ effectiveDate: event.target.value })} /></Field>
                    <Field><FieldLabel htmlFor="policy-slug">Alamat halaman (slug)</FieldLabel><Input id="policy-slug" value={draft.slug} disabled={documents.some((doc) => doc.slug === draft.slug)} onChange={(event) => { const slug = slugify(event.target.value); updateDraft({ slug }); setSelectedSlug(slug); }} /><FieldDescription>Gunakan huruf kecil dan tanda hubung. Alamat halaman: /{draft.slug}</FieldDescription></Field>
                  </div>
                </FieldGroup>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2"><h4 className="font-semibold">Isi dokumen</h4><Button type="button" size="sm" variant="outline" onClick={addSection}><Plus data-icon="inline-start" /> Tambah bagian</Button></div>
                  {draft.sections.map((section, index) => (
                    <section key={section.id + "-" + index} className="space-y-3 rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">Bagian {index + 1}</p><Button type="button" size="icon" variant="ghost" aria-label={"Hapus bagian " + (index + 1)} onClick={() => removeSection(index)} disabled={draft.sections.length <= 1}><X /></Button></div>
                      <Field><FieldLabel htmlFor={"policy-section-title-" + index}>Judul bagian</FieldLabel><Input id={"policy-section-title-" + index} value={section.title} maxLength={180} onChange={(event) => updateSection(index, { title: event.target.value, id: slugify(event.target.value) })} /></Field>
                      <Field><FieldLabel htmlFor={"policy-section-text-" + index}>Paragraf</FieldLabel><Textarea id={"policy-section-text-" + index} rows={5} value={section.paragraphs.join("\n\n")} onChange={(event) => updateSection(index, { paragraphs: event.target.value.split(/\n\s*\n/) })} /><FieldDescription>Pisahkan paragraf dengan satu baris kosong.</FieldDescription></Field>
                      <Field><FieldLabel htmlFor={"policy-section-items-" + index}>Daftar butir (opsional)</FieldLabel><Textarea id={"policy-section-items-" + index} rows={3} value={(section.items || []).join("\n")} onChange={(event) => updateSection(index, { items: event.target.value.split("\n") })} /><FieldDescription>Satu butir per baris.</FieldDescription></Field>
                    </section>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button type="submit" disabled={saving}><Save data-icon="inline-start" /> {saving ? "Menyimpan…" : "Simpan dokumen"}</Button>
                  <Button type="button" variant="outline" onClick={() => { const original = documents.find((doc) => doc.slug === selectedSlug); setDraft(original ? structuredClone(original) : null); }} disabled={saving}>Batalkan perubahan</Button>
                </div>
              </form>
            ) : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed p-6 text-center"><div><FilePlus2 className="mx-auto mb-3 text-muted-foreground" /><strong>Belum ada dokumen terpilih</strong><p className="mt-1 text-sm text-muted-foreground">Pilih dokumen pada daftar atau buat dokumen baru.</p></div></div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
