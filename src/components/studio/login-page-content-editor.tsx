"use client";

import { useActionState, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { saveLoginPageContent, type SaveLoginPageContentState } from "@/app/actions/login-page-content";
import type { LoginPageContent, LoginPageHighlight } from "@/lib/login-page-content";

const emptyResult: SaveLoginPageContentState = { ok: false, message: "" };
const makeId = () => "highlight-" + Math.random().toString(36).slice(2, 10);

function TextField({ label, value, onChange, maxLength = 180 }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-ink2">{label}</span>
      <input type="text" value={value} maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)} className="sb-input w-full min-w-0" />
    </label>
  );
}

function TextArea({ label, value, onChange, maxLength = 500, rows = 3 }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number; rows?: number;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-ink2">{label}</span>
      <textarea value={value} maxLength={maxLength} rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="sb-input h-auto w-full resize-y py-2" />
      <span className="mt-1 block text-right text-[10px] text-muted">{value.length}/{maxLength}</span>
    </label>
  );
}

export function LoginPageContentEditor({ initialContent }: { initialContent: LoginPageContent }) {
  const [content, setContent] = useState<LoginPageContent>(initialContent);
  const [result, action, pending] = useActionState(saveLoginPageContent, emptyResult);

  function patch<K extends keyof LoginPageContent>(key: K, value: LoginPageContent[K]) {
    setContent((current) => ({ ...current, [key]: value }));
  }
  function patchHighlight(index: number, value: Partial<LoginPageHighlight>) {
    setContent((current) => ({
      ...current,
      highlights: current.highlights.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item),
    }));
  }
  function addHighlight() {
    setContent((current) => ({
      ...current,
      highlights: [...current.highlights, { id: makeId(), title: "Poin baru", description: "Keterangan singkat." }],
    }));
  }
  function deleteHighlight(index: number) {
    setContent((current) => ({ ...current, highlights: current.highlights.filter((_, itemIndex) => itemIndex !== index) }));
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="content_json" value={JSON.stringify(content)} />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-line bg-white p-4">
          <div>
            <h3 className="text-[13px] font-bold text-ink">Panel pengenalan</h3>
            <p className="mt-1 text-[10.5px] text-muted">Teks di sisi kiri halaman masuk pada layar desktop.</p>
          </div>
          <TextField label="Label kecil di atas judul" value={content.leftEyebrow} onChange={(value) => patch("leftEyebrow", value)} maxLength={80} />
          <TextArea label="Judul utama (gunakan baris baru untuk memisah baris)" value={content.leftTitle} onChange={(value) => patch("leftTitle", value)} maxLength={180} rows={3} />
          <TextArea label="Deskripsi pengenalan" value={content.leftDescription} onChange={(value) => patch("leftDescription", value)} maxLength={500} rows={4} />
          <TextField label="Teks tautan kembali" value={content.backLinkLabel} onChange={(value) => patch("backLinkLabel", value)} maxLength={40} />
        </section>

        <section className="space-y-3 rounded-xl border border-line bg-white p-4">
          <div>
            <h3 className="text-[13px] font-bold text-ink">Kartu formulir masuk</h3>
            <p className="mt-1 text-[10.5px] text-muted">Atur pesan di atas formulir dan label kolom autentikasi.</p>
          </div>
          <TextField label="Label kecil kartu" value={content.cardEyebrow} onChange={(value) => patch("cardEyebrow", value)} maxLength={80} />
          <TextField label="Judul kartu" value={content.cardTitle} onChange={(value) => patch("cardTitle", value)} maxLength={120} />
          <TextArea label="Pengantar formulir" value={content.cardDescription} onChange={(value) => patch("cardDescription", value)} maxLength={240} rows={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Label surel" value={content.emailLabel} onChange={(value) => patch("emailLabel", value)} maxLength={50} />
            <TextField label="Placeholder surel" value={content.emailPlaceholder} onChange={(value) => patch("emailPlaceholder", value)} maxLength={100} />
            <TextField label="Label kata sandi" value={content.passwordLabel} onChange={(value) => patch("passwordLabel", value)} maxLength={50} />
            <TextField label="Tombol masuk" value={content.loginButtonLabel} onChange={(value) => patch("loginButtonLabel", value)} maxLength={40} />
            <TextField label="Teks saat proses" value={content.loginPendingLabel} onChange={(value) => patch("loginPendingLabel", value)} maxLength={60} />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-line bg-white p-4 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[13px] font-bold text-ink">Poin manfaat</h3>
              <p className="mt-1 text-[10.5px] text-muted">Tambah, ubah, atau hapus poin yang ditampilkan di panel pengenalan. Maksimal 8 poin.</p>
            </div>
            <button type="button" onClick={addHighlight} disabled={content.highlights.length >= 8}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-primary-800 disabled:opacity-40">
              <Plus size={13} /> Tambah poin
            </button>
          </div>
          {content.highlights.length ? content.highlights.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-xl border border-line bg-paper/50 p-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
              <TextField label="Judul poin" value={item.title} onChange={(value) => patchHighlight(index, { title: value })} maxLength={90} />
              <TextField label="Keterangan" value={item.description} onChange={(value) => patchHighlight(index, { description: value })} maxLength={180} />
              <button type="button" onClick={() => deleteHighlight(index)} aria-label="Hapus poin manfaat"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          )) : <p className="rounded-lg bg-paper px-3 py-3 text-[11px] text-muted">Belum ada poin manfaat yang ditampilkan.</p>}
        </section>

        <section className="space-y-3 rounded-xl border border-line bg-white p-4">
          <h3 className="text-[13px] font-bold text-ink">Catatan keamanan</h3>
          <TextArea label="Keterangan sesi dan hak akses" value={content.securityNote} onChange={(value) => patch("securityNote", value)} maxLength={300} rows={4} />
        </section>
        <section className="space-y-3 rounded-xl border border-line bg-white p-4">
          <h3 className="text-[13px] font-bold text-ink">Catatan bawah halaman</h3>
          <TextArea label="Keterangan akses pengguna" value={content.footerNote} onChange={(value) => patch("footerNote", value)} maxLength={180} rows={4} />
        </section>
      </div>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="min-w-0 text-[11px]" aria-live="polite">
          {result.message
            ? <span className={result.ok ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{result.message}</span>
            : <span className="text-muted">Perubahan teks halaman masuk tidak berlaku sebelum disimpan.</span>}
        </div>
        <button type="submit" disabled={pending} className="sb-btn sb-btn-primary shrink-0 disabled:cursor-wait disabled:opacity-60">
          <Save size={14} /> {pending ? "Menyimpan…" : "Simpan teks halaman masuk"}
        </button>
      </div>
    </form>
  );
}
