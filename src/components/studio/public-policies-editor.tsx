"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { savePublicPolicies, type SavePublicPoliciesState } from "@/app/actions/public-policies";
import type { PolicyDocument, PolicySection, PolicyStatus, PublicPolicySettings } from "@/lib/public-policies";

const emptyResult: SavePublicPoliciesState = { ok: false, message: "" };
const makeId = (prefix: string) => prefix + "-" + Math.random().toString(36).slice(2, 9);

function TextField({ label, value, onChange, maxLength = 140, placeholder = "" }: {
  label: string; value: string; onChange: (value: string) => void;
  maxLength?: number; placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-ink2">{label}</span>
      <input value={value} maxLength={maxLength} placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="sb-input w-full min-w-0" />
    </label>
  );
}

export function PublicPoliciesEditor({ initialSettings }: { initialSettings: PublicPolicySettings }) {
  const [settings, setSettings] = useState<PublicPolicySettings>(initialSettings);
  const [result, action, pending] = useActionState(savePublicPolicies, emptyResult);

  function patchDocument(index: number, patch: Partial<PolicyDocument>) {
    setSettings((current) => {
      const documents = [...current.documents];
      documents[index] = { ...documents[index], ...patch };
      return { ...current, documents };
    });
  }
  function addDocument() {
    const item: PolicyDocument = {
      id: makeId("policy"), slug: "dokumen-baru", title: "Dokumen kebijakan baru",
      category: "Kebijakan", summary: "", version: "1.0", effectiveDate: "",
      status: "draft", sections: [],
    };
    setSettings((current) => ({ ...current, documents: [...current.documents, item] }));
  }
  function deleteDocument(index: number) {
    setSettings((current) => ({ ...current, documents: current.documents.filter((_, i) => i !== index) }));
  }
  function patchSection(documentIndex: number, sectionIndex: number, patch: Partial<PolicySection>) {
    setSettings((current) => {
      const documents = [...current.documents];
      const document = { ...documents[documentIndex], sections: [...documents[documentIndex].sections] };
      document.sections[sectionIndex] = { ...document.sections[sectionIndex], ...patch };
      documents[documentIndex] = document;
      return { ...current, documents };
    });
  }
  function addSection(documentIndex: number) {
    setSettings((current) => {
      const documents = [...current.documents];
      const document = { ...documents[documentIndex], sections: [...documents[documentIndex].sections] };
      document.sections.push({ id: makeId("section"), heading: "Bagian baru", body: "" });
      documents[documentIndex] = document;
      return { ...current, documents };
    });
  }
  function deleteSection(documentIndex: number, sectionIndex: number) {
    setSettings((current) => {
      const documents = [...current.documents];
      documents[documentIndex] = {
        ...documents[documentIndex],
        sections: documents[documentIndex].sections.filter((_, i) => i !== sectionIndex),
      };
      return { ...current, documents };
    });
  }

  const published = settings.documents.filter((document) => document.status === "published").length;
  const drafts = settings.documents.filter((document) => document.status === "draft").length;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="policies_json" value={JSON.stringify(settings)} />
      <section className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[13px] font-bold text-ink">Dokumen & kebijakan utama situs</h2>
            <p className="mt-1 max-w-3xl text-[10.5px] leading-relaxed text-muted">
              Kelola legalitas, syarat penggunaan, privasi, cookie, keamanan, hak data, publikasi, pengaduan, penyangkalan, aksesibilitas, dan bantuan. Dokumen Draf atau Nonaktif tidak dapat dibuka pengunjung.
            </p>
          </div>
          <button type="button" onClick={addDocument} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-primary-400 px-3 py-2 text-[11px] font-semibold text-primary-800">
            <Plus size={13} /> Tambah dokumen
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3">
          <label className="flex items-center gap-2 text-[11px] font-semibold text-ink">
            <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings((s) => ({ ...s, enabled: event.target.checked }))} className="h-4 w-4 accent-[#127e2f]" />
            Aktifkan halaman kebijakan publik
          </label>
          <span className="text-[10.5px] text-muted">{published} terbit · {drafts} draf · {settings.documents.length} dokumen tersimpan</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">Draf — belum ditampilkan</span>
          <span className="rounded-md bg-green-50 px-2 py-1 text-green-800">Terbit — tersedia untuk publik</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">Nonaktif — disimpan, tidak ditampilkan</span>
        </div>
      </section>

      {settings.documents.map((document, di) => (
        <details key={document.id} className="rounded-xl border border-line bg-white" open={document.status === "draft"}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-bold text-ink">{document.title}</span>
              <span className="mt-0.5 block truncate text-[10px] text-muted">/{document.slug} · {document.sections.length} bagian</span>
            </span>
            <span className={"shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold " + (document.status === "published" ? "bg-green-50 text-green-800" : document.status === "inactive" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800")}>
              {document.status === "published" ? "Terbit" : document.status === "inactive" ? "Nonaktif" : "Draf"}
            </span>
          </summary>
          <div className="space-y-4 border-t border-line p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <TextField label="Judul dokumen" value={document.title} onChange={(title) => patchDocument(di, { title })} />
              <TextField label="Slug URL" value={document.slug} onChange={(slug) => patchDocument(di, { slug })} maxLength={80} placeholder="kebijakan-privasi" />
              <TextField label="Kategori" value={document.category} onChange={(category) => patchDocument(di, { category })} maxLength={80} />
              <TextField label="Versi" value={document.version} onChange={(version) => patchDocument(di, { version })} maxLength={30} />
              <TextField label="Tanggal berlaku (YYYY-MM-DD)" value={document.effectiveDate} onChange={(effectiveDate) => patchDocument(di, { effectiveDate })} maxLength={10} placeholder="2026-11-27" />
              <label className="block min-w-0">
                <span className="mb-1 block text-[11px] font-semibold text-ink2">Status publikasi</span>
                <select value={document.status} onChange={(event) => patchDocument(di, { status: event.target.value as PolicyStatus })} className="sb-input w-full">
                  <option value="draft">Draf</option>
                  <option value="published">Terbit</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-ink2">Ringkasan</span>
              <textarea value={document.summary} onChange={(event) => patchDocument(di, { summary: event.target.value })} maxLength={700} rows={2} className="sb-input h-auto w-full resize-y py-2" />
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-bold text-ink">Isi dokumen</h3>
                <button type="button" onClick={() => addSection(di)} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary-700"><Plus size={12} /> Tambah bagian</button>
              </div>
              {document.sections.map((section, si) => (
                <section key={section.id} className="rounded-xl border border-line bg-paper/60 p-3">
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <TextField label="Judul bagian" value={section.heading} onChange={(heading) => patchSection(di, si, { heading })} maxLength={120} />
                    </div>
                    <button type="button" onClick={() => deleteSection(di, si)} aria-label="Hapus bagian" className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50"><Trash2 size={13} /></button>
                  </div>
                  <label className="mt-2 block">
                    <span className="mb-1 block text-[11px] font-semibold text-ink2">Isi bagian</span>
                    <textarea value={section.body} onChange={(event) => patchSection(di, si, { body: event.target.value })} maxLength={15000} rows={4} className="sb-input h-auto w-full resize-y py-2" />
                  </label>
                </section>
              ))}
            </div>
            <div className="flex justify-end border-t border-line pt-3">
              <button type="button" onClick={() => deleteDocument(di)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10.5px] font-semibold text-red-700 hover:bg-red-50"><Trash2 size={13} /> Hapus dokumen</button>
            </div>
          </div>
        </details>
      ))}

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="min-w-0 text-[11px]" aria-live="polite">
          {result.message ? <span className={result.ok ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{result.message}</span> : <span className="text-muted">Perubahan berlaku setelah disimpan.</span>}
        </div>
        <button type="submit" disabled={pending} className="sb-btn sb-btn-primary shrink-0 disabled:cursor-wait disabled:opacity-60">
          <Save size={14} /> {pending ? "Menyimpan…" : "Simpan dokumen kebijakan"}
        </button>
      </div>
    </form>
  );
}
