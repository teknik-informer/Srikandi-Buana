"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { FileText, Plus, Printer, QrCode, Save, ShieldCheck } from "lucide-react";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import type { Row } from "@/lib/srikandi";
import type { SiteSettings } from "@/lib/settings-config";

type LetterForm = {
  name: string;
  type: string;
  date: string;
  number: string;
  nature: string;
  attachment: string;
  recipientTitle: string;
  recipient: string;
  recipientAddress: string;
  body: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  agenda: string;
  closing: string;
  internalNotes: string;
  status: "Draf";
};

type Props = {
  settings: Pick<SiteSettings, "address" | "email" | "phone">;
};

const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

function emptyForm(): LetterForm {
  return {
    name: "",
    type: "Undangan",
    date: localDate(),
    number: "",
    nature: "Biasa",
    attachment: "",
    recipientTitle: "",
    recipient: "",
    recipientAddress: "di Tempat",
    body: "",
    eventDate: "",
    eventTime: "",
    eventLocation: "",
    agenda: "",
    closing: "Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.",
    internalNotes: "",
    status: "Draf",
  };
}

function formFromRow(row: Row): LetterForm {
  const blank = emptyForm();
  const data = row.data;
  return {
    name: String(data.name ?? blank.name),
    type: String(data.type ?? blank.type),
    date: String(data.date ?? blank.date),
    number: String(data.number ?? ""),
    nature: String(data.nature ?? blank.nature),
    attachment: String(data.attachment ?? ""),
    recipientTitle: String(data.recipientTitle ?? ""),
    recipient: String(data.recipient ?? ""),
    recipientAddress: String(data.recipientAddress ?? ""),
    body: String(data.body ?? ""),
    eventDate: String(data.eventDate ?? ""),
    eventTime: String(data.eventTime ?? ""),
    eventLocation: String(data.eventLocation ?? ""),
    agenda: String(data.agenda ?? ""),
    closing: String(data.closing ?? ""),
    internalNotes: String(data.internalNotes ?? ""),
    status: "Draf",
  };
}

function dateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Tanggal belum diisi";
  const parsed = new Date(value + "T00:00:00");
  return Number.isNaN(parsed.getTime())
    ? "Tanggal belum diisi"
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(parsed);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  hint,
  maxLength = 500,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  const id = "letter-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}{required ? " *" : ""}</span>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  rows = 4,
  hint,
  maxLength = 5000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  hint?: string;
  maxLength?: number;
}) {
  const id = "letter-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}{required ? " *" : ""}</span>
      <textarea
        id={id}
        value={value}
        required={required}
        rows={rows}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 leading-6 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function OfficialLetterWorkspace({ settings }: Props) {
  const { rows, loading, error: loadError, load } = useWorkspaceData();
  const [form, setForm] = useState<LetterForm>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expectedUpdated, setExpectedUpdated] = useState("");
  const [savedSignature, setSavedSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const drafts = useMemo(
    () =>
      rows
        .filter((row) => row.kind === "surat_resmi")
        .sort((a, b) => Date.parse(b.updated || b.created) - Date.parse(a.updated || a.created)),
    [rows],
  );
  const signature = useMemo(() => JSON.stringify(form), [form]);
  const isDirty = !editingId || signature !== savedSignature;

  function set<K extends keyof LetterForm>(key: K, value: LetterForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function newDraft() {
    setForm(emptyForm());
    setEditingId(null);
    setExpectedUpdated("");
    setSavedSignature("");
    setError("");
    setMessage("");
  }

  function selectDraft(row: Row) {
    const next = formFromRow(row);
    setForm(next);
    setEditingId(row.id);
    setExpectedUpdated(row.updated);
    setSavedSignature(JSON.stringify(next));
    setError("");
    setMessage("");
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        kind: "surat_resmi",
        ...(editingId ? { id: editingId, expectedUpdated } : {}),
        data: { ...form, number: "", status: "Draf" },
      };
      const response = await fetch("/api/records", {
        method: editingId ? "PUT" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok?: boolean; id?: string; updated?: string; error?: string };
      if (!response.ok || !result.id) {
        throw new Error(result.error || "Draf belum berhasil disimpan.");
      }
      setEditingId(result.id);
      setExpectedUpdated(result.updated || new Date().toISOString());
      setSavedSignature(JSON.stringify(form));
      setMessage("Draf surat tersimpan. Dokumen belum disahkan dan belum dapat diterbitkan sebagai surat resmi.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Draf belum berhasil disimpan.");
    } finally {
      setBusy(false);
    }
  }

  const draftReference = editingId
    ? "DRAFT-" + editingId.slice(0, 8).toUpperCase()
    : "DRAF BELUM TERSIMPAN";

  return (
    <main className="workspace-page space-y-6" aria-labelledby="letter-workspace-title">
      <style jsx global>{`
        .official-letter-page { box-sizing: border-box; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm 16mm; background: #fff; color: #24332d; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.55; box-shadow: 0 12px 38px rgba(15, 35, 25, .13); }
        .official-letter-page * { box-sizing: border-box; }
        .official-letter-page .letter-rule { height: 3px; margin-top: 9mm; background: #1b4d3e; }
        .official-letter-page .letterhead { display: flex; align-items: center; justify-content: space-between; gap: 10mm; min-height: 25mm; }
        .official-letter-page .letter-meta { width: 100%; margin: 7mm 0; border-collapse: collapse; font-size: 10.5pt; }
        .official-letter-page .letter-meta td { vertical-align: top; padding: 1mm 0; }
        .official-letter-page .letter-signature { break-inside: avoid; page-break-inside: avoid; margin-top: 12mm; }
        .official-letter-page .letter-qr { min-width: 75mm; max-width: 83mm; border: 1px dashed #9aaea2; padding: 3mm; }
        .official-letter-page .letter-footer { margin-top: 13mm; border-top: 1px solid #d9e2dc; padding-top: 3mm; font-size: 8pt; color: #6c7b72; }
        @page { size: A4; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .official-letter-print, .official-letter-print * { visibility: visible !important; }
          .official-letter-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 210mm !important; }
          .official-letter-page { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 15mm 16mm !important; box-shadow: none !important; border: 0 !important; }
          .letter-print-hide { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <header className="flex flex-wrap items-end justify-between gap-4 letter-print-hide">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Administrasi dan dokumen</p>
          <h1 id="letter-workspace-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Penyusunan Surat Resmi</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Buat draf surat pada kop organisasi, periksa pratinjau A4, lalu simpan untuk pemeriksaan.
            Penerbitan final menunggu prosedur persetujuan organisasi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={newDraft} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
            <Plus className="size-4" /> Draf baru
          </button>
          <button type="button" disabled={!editingId || isDirty || busy} onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            <Printer className="size-4" /> Cetak / Simpan PDF
          </button>
        </div>
      </header>

      {(error || loadError) && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive letter-print-hide">
          {error || loadError}
        </div>
      )}
      {message && (
        <div role="status" className="rounded-xl border border-emerald-700/20 bg-emerald-700/5 p-3 text-sm text-emerald-800 dark:text-emerald-200 letter-print-hide">
          {message}
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(21rem,0.82fr)_minmax(0,1.18fr)]">
        <section className="space-y-5 letter-print-hide" aria-label="Formulir draf surat">
          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Isi naskah surat</h2>
                <p className="mt-1 text-xs text-muted-foreground">Kolom bertanda * wajib diisi. Nomor resmi belum dibuat pada tahap draf.</p>
              </div>
              <span className="rounded-full border border-amber-600/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200">DRAF</span>
            </div>
            <form onSubmit={saveDraft} className="space-y-4">
              <Field label="Perihal / judul surat" value={form.name} required maxLength={180} onChange={(value) => set("name", value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Jenis surat</span>
                  <select value={form.type} onChange={(event) => set("type", event.target.value)} className="min-h-10 rounded-lg border border-input bg-background px-3 py-2">
                    {["Undangan", "Permohonan", "Pemberitahuan", "Surat Pengantar", "Surat Keterangan", "Lainnya"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <Field label="Tanggal surat" value={form.date} type="date" required onChange={(value) => set("date", value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Sifat surat</span>
                  <select value={form.nature} onChange={(event) => set("nature", event.target.value)} className="min-h-10 rounded-lg border border-input bg-background px-3 py-2">
                    {["Biasa", "Penting", "Segera", "Rahasia"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <Field label="Lampiran" value={form.attachment} hint="Contoh: 1 (satu) berkas; kosongkan jika tidak ada." onChange={(value) => set("attachment", value)} />
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">Tujuan surat</h3>
                <div className="space-y-3">
                  <Field label="Jabatan / sapaan penerima" value={form.recipientTitle} onChange={(value) => set("recipientTitle", value)} />
                  <Field label="Nama penerima / pihak tujuan" value={form.recipient} required onChange={(value) => set("recipient", value)} />
                  <Field label="Alamat tujuan" value={form.recipientAddress} onChange={(value) => set("recipientAddress", value)} />
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">Isi surat</h3>
                <TextField label="Naskah utama" value={form.body} required rows={8} hint="Tuliskan isi surat. Pemisahan paragraf akan dipertahankan pada pratinjau." onChange={(value) => set("body", value)} />
                {form.type === "Undangan" && (
                  <div className="mt-4 space-y-3 rounded-xl bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rincian kegiatan (opsional)</p>
                    <Field label="Hari / tanggal kegiatan" value={form.eventDate} type="date" onChange={(value) => set("eventDate", value)} />
                    <Field label="Waktu kegiatan" value={form.eventTime} hint="Contoh: 09.00 WIB – selesai" onChange={(value) => set("eventTime", value)} />
                    <Field label="Tempat kegiatan" value={form.eventLocation} onChange={(value) => set("eventLocation", value)} />
                    <TextField label="Agenda utama" value={form.agenda} rows={2} onChange={(value) => set("agenda", value)} />
                  </div>
                )}
                <div className="mt-4">
                  <TextField label="Paragraf penutup" value={form.closing} rows={3} onChange={(value) => set("closing", value)} />
                </div>
              </div>
              <div className="border-t pt-4">
                <TextField label="Catatan internal (tidak dicetak)" value={form.internalNotes} rows={2} hint="Catatan ini hanya untuk pengelolaan draf dan tidak muncul pada halaman surat." onChange={(value) => set("internalNotes", value)} />
              </div>
              <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                <Save className="size-4" /> {busy ? "Menyimpan..." : editingId ? "Simpan perubahan draf" : "Simpan draf surat"}
              </button>
              {editingId && isDirty && <p className="text-xs text-amber-700 dark:text-amber-300">Ada perubahan yang belum disimpan. Simpan kembali sebelum mencetak.</p>}
            </form>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Draf tersimpan</h2>
                <p className="mt-1 text-xs text-muted-foreground">Draf milik organisasi yang dapat diakses sesuai kewenangan akun.</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{drafts.length}</span>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Memuat daftar draf…</p>
            ) : drafts.length ? (
              <div className="mt-3 divide-y">
                {drafts.map((row) => (
                  <button key={row.id} type="button" onClick={() => selectDraft(row)} className={"flex w-full items-start justify-between gap-3 py-3 text-left " + (editingId === row.id ? "text-primary" : "hover:text-primary")}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{String(row.data.name || "Tanpa perihal")}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{String(row.data.type || "Surat")} · {dateLabel(String(row.data.date || ""))}</span>
                    </span>
                    <span className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold">Draf</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed p-5 text-center">
                <FileText className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Belum ada draf surat</p>
                <p className="mt-1 text-xs text-muted-foreground">Draf yang disimpan akan muncul di sini.</p>
              </div>
            )}
          </div>
        </section>

        <section className="official-letter-print min-w-0" aria-label="Pratinjau surat ukuran A4">
          <div className="letter-print-hide mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Pratinjau dokumen</h2>
              <p className="text-xs text-muted-foreground">Tampilan cetak A4 · warna dan tata letak mengikuti kop organisasi</p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{draftReference}</span>
          </div>
          <div className="letter-print-frame overflow-x-auto rounded-xl border bg-muted/30 p-2 sm:p-4">
            <article className="official-letter-page">
              <header className="letterhead">
                <Image src="/brand/wordmark.png" width={280} height={90} alt="Logo KWT Srikandi Buana" priority className="h-auto w-[67mm] object-contain object-left" />
                <div className="max-w-[78mm] text-right text-[8.5pt] leading-[1.4] text-slate-600">
                  <strong className="block text-[9pt] text-[#1b4d3e]">KELOMPOK WANITA TANI (KWT) SRIKANDI BUANA</strong>
                  {settings.address && <span className="block">{settings.address}</span>}
                  {settings.email && <span className="block">Email: {settings.email}</span>}
                  {settings.phone && <span className="block">Kontak: {settings.phone}</span>}
                </div>
              </header>
              <div className="letter-rule" />

              <table className="letter-meta">
                <tbody>
                  <tr><td style={{ width: "14%" }}>Nomor</td><td style={{ width: "3%" }}>:</td><td>Belum diterbitkan</td><td style={{ textAlign: "right" }}>Temanggung, {dateLabel(form.date)}</td></tr>
                  <tr><td>Sifat</td><td>:</td><td>{form.nature}</td><td /></tr>
                  <tr><td>Lampiran</td><td>:</td><td>{form.attachment || "—"}</td><td /></tr>
                  <tr><td>Hal</td><td>:</td><td colSpan={2}><strong>{form.name || "Perihal surat"}</strong></td></tr>
                </tbody>
              </table>

              <section className="mb-6 text-[10.5pt] leading-[1.55]">
                <p>Kepada Yth.</p>
                {form.recipientTitle && <p className="font-semibold">{form.recipientTitle}</p>}
                <p className="font-semibold">{form.recipient || "[Nama penerima]"}</p>
                {form.recipientAddress && <p>{form.recipientAddress}</p>}
              </section>

              <section className="space-y-4 text-justify text-[10.5pt] leading-[1.65]">
                <p>Dengan hormat,</p>
                <p className="whitespace-pre-line">{form.body || "[Isi surat akan ditampilkan di sini.]"}</p>
                {(form.eventDate || form.eventTime || form.eventLocation || form.agenda) && (
                  <table className="w-full border-collapse text-left">
                    <tbody>
                      {form.eventDate && <tr><td className="w-[27%] py-1 align-top">Hari, tanggal</td><td className="w-[4%] py-1 align-top">:</td><td className="py-1 align-top">{dateLabel(form.eventDate)}</td></tr>}
                      {form.eventTime && <tr><td className="py-1 align-top">Waktu</td><td className="py-1 align-top">:</td><td className="py-1 align-top">{form.eventTime}</td></tr>}
                      {form.eventLocation && <tr><td className="py-1 align-top">Tempat</td><td className="py-1 align-top">:</td><td className="py-1 align-top">{form.eventLocation}</td></tr>}
                      {form.agenda && <tr><td className="py-1 align-top">Agenda</td><td className="py-1 align-top">:</td><td className="whitespace-pre-line py-1 align-top">{form.agenda}</td></tr>}
                    </tbody>
                  </table>
                )}
                {form.closing && <p className="whitespace-pre-line">{form.closing}</p>}
              </section>

              <section className="letter-signature grid grid-cols-[1fr_1fr] items-end gap-5 text-[9pt]">
                <div className="letter-qr flex items-center gap-3">
                  <div className="grid size-[18mm] shrink-0 place-items-center border border-dashed border-slate-400 text-slate-500"><QrCode className="size-8" /></div>
                  <div className="leading-[1.35]">
                    <strong className="block text-[8pt] text-[#1b4d3e]">VERIFIKASI DIGITAL</strong>
                    <span className="block font-semibold text-amber-800">Belum diterbitkan</span>
                    <span className="mt-1 block text-[7.5pt] text-slate-600">QR resmi dibuat setelah dokumen memperoleh persetujuan dan diterbitkan melalui sistem.</span>
                  </div>
                </div>
                <div className="text-center">
                  <p>Pengurus Harian KWT Srikandi Buana,</p>
                  <p className="mt-2 font-semibold">Penandatangan yang berwenang</p>
                  <div className="mt-[18mm] border-b border-transparent" />
                  <p className="text-[8pt] text-slate-600">Nama dan tanda tangan ditetapkan pada tahap pengesahan.</p>
                </div>
              </section>

              <footer className="letter-footer flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-amber-800">DRAF INTERNAL — BELUM DISAHKAN</span>
                <span>{draftReference}</span>
                <span>KWT Srikandi Buana</span>
              </footer>
            </article>
          </div>
          <div className="letter-print-hide mt-3 flex items-start gap-2 rounded-xl border bg-card p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>Halaman ini hanya menghasilkan pratinjau dan cetakan draf. Nomor surat final, tanda tangan elektronik, kode QR verifikasi, serta status dokumen resmi tidak dibuat pada tahap ini.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
