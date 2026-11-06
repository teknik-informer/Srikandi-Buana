"use client";
import { requestJSON } from "@/lib/request-json";
import { WorkspaceSearch } from "./workspace-ui";
import { WorkspaceDialogContent as DialogContent } from "./workspace-dialog";
import { useState, useRef, type FormEvent } from "react";
import { Download, Upload, Trash2, Pencil, RotateCcw, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import ListPagination from "./list-pagination";
import { listPage } from "@/lib/list-page";
import { dateID } from "@/lib/srikandi";
import { canDiscardChanges, markFormSaved } from "@/lib/unsaved-changes";
type FileRow = { id: string; name: string; size: number; mime: string; created: string; deleted_at?: string | null };
export default function FileManager({ files, onChange, loading = false, loadError = "" }: {
  files: FileRow[]; onChange: () => Promise<void>; loading?: boolean; loadError?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("Aktif");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState<FileRow | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<FileRow | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const renameForm = useRef<HTMLFormElement>(null);
  const pending = useRef(false);
  const unavailable = busy || loading || !!loadError;
  const filtered = files.filter((f) => (view === "Sampah" ? !!f.deleted_at : !f.deleted_at) && f.name.toLowerCase().includes(query.toLowerCase()));
  const range = listPage(filtered.length, page);
  async function refresh() {
    try { await onChange(); }
    catch { setError("Perubahan telah tersimpan, tetapi daftar arsip belum diperbarui. Muat ulang daftar sebelum mencoba tindakan yang sama."); }
  }
  async function action(method: string, id: string, body?: unknown) {
    if (pending.current || loading || loadError) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const { response: r, data: d } = await requestJSON<{ error?: string }>("/api/files" + (method === "DELETE" ? "?id=" + encodeURIComponent(id) : ""), {
        method, headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw Error(d?.error || "Perubahan arsip belum tersimpan. Coba lagi.");
      if (renameForm.current) markFormSaved(renameForm.current);
      toast.success("Arsip diperbarui."); setRenaming(null); setDeleting(null);
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Perubahan belum tersimpan.";
      setError(message); toast.error(message);
    } finally { pending.current = false; setBusy(false); }
  }
  async function upload(list: FileList | null) {
    if (!list?.length || pending.current || loading || loadError) return;
    const batch = Array.from(list);
    pending.current = true; setBusy(true); setUploading(true); setError("");
    setProgress({ done: 0, total: batch.length }); setUploadErrors([]);
    let success = 0;
    const errors: string[] = [];
    try {
      for (const [index, file] of batch.entries()) {
        let stop = false;
        try {
          if (file.size === 0 || file.size > 3 * 1024 * 1024) throw Error("Ukuran berkas harus 1 byte hingga 3 MB.");
          if (!/\.(pdf|docx|xlsx|jpe?g|png)$/i.test(file.name)) throw Error("Format berkas tidak didukung.");
          const fd = new FormData(); fd.append("file", file);
          const { response: r, data: d } = await requestJSON<{ error?: string }>("/api/files", { method: "POST", body: fd }, 90000);
          if (!r.ok) {
            stop = r.status === 401 || r.status === 403;
            throw Error(d?.error || (stop ? "Sesi atau hak unggah tidak tersedia. Masuk kembali." : "Unggah belum berhasil."));
          }
          success++;
        } catch (e) { errors.push(file.name + ": " + (e instanceof Error ? e.message : "Unggah belum berhasil.")); }
        setProgress({ done: index + 1, total: batch.length });
        if (stop) {
          errors.push(...batch.slice(index + 1).map((f) => f.name + ": belum diproses karena sesi atau hak unggah tidak tersedia."));
          break;
        }
      }
      if (success) toast.success(success + " berkas tersimpan.");
      if (errors.length) toast.error(errors.length + " berkas perlu diperiksa.");
      setUploadErrors(errors);
      if (success) await refresh();
    } finally {
      pending.current = false; setBusy(false); setUploading(false);
      if (input.current) input.current.value = "";
    }
  }
  function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (renaming) void action("PATCH", renaming.id, { id: renaming.id, name });
  }
  const errorPanel = error && <Alert variant="destructive"><AlertTitle>Periksa tindakan arsip</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  return <>
    <Card>
      <CardHeader><CardTitle>Arsip kelompok</CardTitle><CardDescription>Unggah beberapa berkas sekaligus. Maksimal 3 MB per berkas, PDF/DOCX/XLSX/JPG/PNG. Sampah dapat dipulihkan dan tetap menggunakan ruang penyimpanan.</CardDescription></CardHeader>
      <CardContent>
        {!renaming && !deleting && errorPanel}
        <div className="inbox-toolbar">
          <WorkspaceSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Cari nama berkas…" label="Cari berkas" />
          <NativeSelect value={view} onChange={(e) => { setView(e.target.value); setPage(1); }} aria-label="Tampilan arsip"><NativeSelectOption>Aktif</NativeSelectOption><NativeSelectOption>Sampah</NativeSelectOption></NativeSelect>
          <Button disabled={unavailable} onClick={() => input.current?.click()}><Upload data-icon="inline-start" />{uploading ? "Mengunggah…" : "Unggah berkas"}</Button>
          <input ref={input} type="file" className="sr-only" aria-label="Pilih berkas untuk diunggah" disabled={unavailable} multiple accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={(e) => upload(e.target.files)} />
        </div>
        <div className={dragging ? "file-drop-zone dragging" : "file-drop-zone"} onDragOver={(e) => { e.preventDefault(); if (!unavailable) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files); }}>
          <Upload /><span><strong>Tarik berkas ke sini</strong><small>atau gunakan tombol Unggah berkas · Maksimal 3 MB per berkas</small></span>
        </div>
        {progress.total > 0 && <p className="section-note" role="status">{uploading ? "Memproses" : "Selesai memproses"} {progress.done} dari {progress.total} berkas.</p>}
        {uploadErrors.length > 0 && <Alert variant="destructive"><AlertTitle>Berkas yang perlu diperiksa</AlertTitle><AlertDescription>{uploadErrors.map((message, i) => <p key={i}>{message}</p>)}<p>Periksa daftar arsip sebelum mengunggah ulang berkas yang gagal karena jaringan, agar tidak membuat salinan ganda.</p></AlertDescription></Alert>}
        {loading ? <Skeleton className="mt-4 h-40 w-full" /> : loadError ? <p role="status">Daftar arsip belum tersedia. Gunakan Coba lagi pada pemberitahuan pemuatan data.</p> : <>
          <p className="section-note">{filtered.length} berkas · {(filtered.reduce((n, f) => n + f.size, 0) / 1024 / 1024).toFixed(2)} MB</p>
          {filtered.length ? filtered.slice(range.offset, range.end).map((f) => <div className="document-row" key={f.id}>
            <div className="file-icon"><FileText /></div><div className="min-w-0 flex-1"><strong className="break-all">{f.name}</strong><small>{dateID(f.created)} · {(f.size / 1024).toFixed(0)} KB</small></div>
            {f.deleted_at ? <Button variant="outline" size="sm" disabled={unavailable} onClick={() => action("PATCH", f.id, { id: f.id, action: "restore" })}><RotateCcw data-icon="inline-start" />Pulihkan</Button> : <div className="flex shrink-0 gap-1">
              <Button asChild variant="ghost" size="icon"><a href={"/api/files?id=" + encodeURIComponent(f.id)} aria-label={"Unduh " + f.name} download><Download /></a></Button>
              <Button variant="ghost" size="icon" aria-label={"Ganti nama " + f.name} disabled={unavailable} onClick={() => { setError(""); setRenaming(f); setName(f.name); }}><Pencil /></Button>
              <Button variant="ghost" size="icon" aria-label={"Pindahkan " + f.name + " ke sampah"} disabled={unavailable} onClick={() => { setError(""); setDeleting(f); }}><Trash2 /></Button>
            </div>}
          </div>) : <Empty><EmptyHeader><EmptyTitle>{query ? "Berkas tidak ditemukan" : view === "Sampah" ? "Sampah kosong" : "Belum ada berkas"}</EmptyTitle><EmptyDescription>{query ? "Coba kata pencarian lain." : "Berkas sesuai tampilan yang dipilih akan muncul di sini."}</EmptyDescription></EmptyHeader>{query && <Button variant="outline" onClick={() => setQuery("")}>Hapus pencarian</Button>}</Empty>}
          <ListPagination total={filtered.length} page={page} onPageChange={setPage} label="Halaman arsip" disabled={busy} />
        </>}
      </CardContent>
    </Card>
    <Dialog open={!!renaming} onOpenChange={(v) => { if (!v && !pending.current && canDiscardChanges(renameForm.current)) setRenaming(null); }}>
      <DialogContent className="workspace-dialog"><DialogHeader><DialogTitle>Ganti nama berkas</DialogTitle><DialogDescription>Pertahankan ekstensi asli. Isi berkas dan referensi konten tetap sama.</DialogDescription></DialogHeader>
        {errorPanel}<form ref={renameForm} data-protect-unsaved onSubmit={rename}><fieldset disabled={busy} className="min-w-0"><FieldGroup>
          <Field><FieldLabel htmlFor="archive-file-name">Nama berkas</FieldLabel><Input id="archive-file-name" value={name} required maxLength={180} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => { if (canDiscardChanges(renameForm.current)) setRenaming(null); }}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan nama"}</Button></div>
        </FieldGroup></fieldset></form>
      </DialogContent>
    </Dialog>
    <Dialog open={!!deleting} onOpenChange={(v) => { if (!v && !pending.current) setDeleting(null); }}>
      <DialogContent className="workspace-dialog"><DialogHeader><DialogTitle>Pindahkan ke sampah?</DialogTitle><DialogDescription>{deleting?.name} dapat dipulihkan dari menu Sampah. Berkas yang masih dipakai konten atau pengaturan tidak dapat dipindahkan.</DialogDescription></DialogHeader>
        {errorPanel}<div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>Batal</Button><Button disabled={busy} onClick={() => deleting && action("DELETE", deleting.id)}>{busy ? "Memproses…" : "Pindahkan ke sampah"}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
