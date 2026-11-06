"use client";
import { requestJSON } from "@/lib/request-json";
import { WorkspaceSearch } from "./workspace-ui";
import { WorkspaceDialogContent as DialogContent } from "./workspace-dialog";
import { useState, useRef, useEffect } from "react";
import { RefreshCw, Download, Trash2, Copy, ArrowUpRight, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useInboxData } from "@/hooks/use-inbox-data";
import { exportMessages, type Message } from "@/lib/message-data";
import { dateID } from "@/lib/srikandi";
const statuses = ["Baru", "Dibaca", "Ditindaklanjuti"];
function reply(contact: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return "mailto:" + encodeURIComponent(contact);
  let number = contact.replace(/\D/g, "");
  if (number.startsWith("0")) number = "62" + number.slice(1);
  return /^\d{9,16}$/.test(number) ? "https://wa.me/" + number : null;
}
export default function Inbox() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState<Message | null>(null);
  const pending = useRef(false);
  const exportRequest = useRef<AbortController | null>(null);
  const { messages, total, pages, counts, loading, error, load } = useInboxData(page, filter, query, setPage);
  const locked = busy || exporting;
  useEffect(() => () => exportRequest.current?.abort(), []);
  async function mutate(id: string, status?: string) {
    if (pending.current || loading || error) return;
    pending.current = true; setBusy(true); setActionError("");
    try {
      const { response, data: result } = await requestJSON<{ error?: string }>("/api/messages" + (status ? "" : "?id=" + encodeURIComponent(id)), {
        method: status ? "PATCH" : "DELETE",
        ...(status ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) } : {}),
      });
      if (!response.ok) {
        if (response.status === 401) await load();
        throw Error(result?.error || "Tindakan belum berhasil. Coba lagi.");
      }
      setDeleting(null);
      toast.success(status ? "Status pesan diperbarui." : "Pesan telah dihapus.");
      await load();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Tindakan belum berhasil."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function exportCSV() {
    if (pending.current || loading || error || !total) return;
    pending.current = true; setExporting(true); setActionError("");
    const request = new AbortController(); exportRequest.current = request;
    try {
      const result = await exportMessages(filter, query, request.signal);
      if (request.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      try {
        const link = document.createElement("a"); link.href = url; link.download = "pesan-srikandi-buana.csv"; link.click();
      } finally { URL.revokeObjectURL(url); }
      toast.success(result.count + " pesan diekspor.");
    } catch (e) {
      if (!request.signal.aborted) setActionError(e instanceof Error ? e.message : "Ekspor belum berhasil.");
    } finally { pending.current = false; setExporting(false); }
  }
  const actionPanel = actionError && <Alert variant="destructive"><AlertTitle>Tindakan belum berhasil</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>;
  return <>
    <div className="inbox-stats">{statuses.map((status) => <button key={status} disabled={locked} onClick={() => { setFilter(status); setPage(1); setActionError(""); }} aria-pressed={filter === status}><span>{status}</span><strong>{loading || error ? "—" : counts[status] || 0}</strong></button>)}</div>
    <Card>
      <CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Pesan pengunjung</CardTitle><CardDescription>Kontak dan isi pesan hanya terlihat oleh pengelola. Telusuri pesan, kelola tindak lanjut, dan ekspor seluruh hasil pencarian.</CardDescription></div><Button variant="ghost" size="icon" disabled={locked || loading} onClick={load} aria-label="Muat ulang pesan"><RefreshCw /></Button></div></CardHeader>
      <CardContent>
        <div className="inbox-toolbar">
          <WorkspaceSearch placeholder="Cari nama, kontak, atau pesan…" maxLength={200} label="Cari pesan pengunjung" disabled={locked} value={query} onChange={(value) => { setQuery(value); setPage(1); setActionError(""); }} />
          <NativeSelect value={filter} disabled={locked} onChange={(e) => { setFilter(e.target.value); setPage(1); setActionError(""); }} aria-label="Filter pesan">{["Semua", ...statuses].map((status) => <NativeSelectOption key={status}>{status}</NativeSelectOption>)}</NativeSelect>
          <Button variant="outline" onClick={exportCSV} disabled={loading || locked || !!error || !total}><Download data-icon="inline-start" />{exporting ? "Mengekspor…" : "Ekspor hasil pencarian"}</Button>
        </div>
        <p className="section-note" role="status">{loading ? "Memuat pesan…" : error ? "Pesan belum tersedia." : total + " pesan · halaman " + page + " dari " + pages}</p>
        {error && <Alert variant="destructive"><AlertTitle>Pesan belum dapat dimuat</AlertTitle><AlertDescription>{error}<Button variant="outline" disabled={locked || loading} onClick={load}>Coba lagi</Button></AlertDescription></Alert>}
        {!deleting && actionPanel}
        {loading ? <Skeleton className="h-40 w-full" /> : !error && (messages.length ? <div className="flex flex-col gap-5">
          {messages.map((message) => <article key={message.id} className="inbox-message">
            <header><div><strong>{message.name}</strong><small>{message.contact} · {dateID(message.created)}</small></div><NativeSelect aria-label={"Status pesan dari " + message.name} disabled={locked} value={message.status} onChange={(e) => mutate(message.id, e.target.value)}>{statuses.map((status) => <NativeSelectOption key={status}>{status}</NativeSelectOption>)}</NativeSelect></header>
            <span>{message.topic} · REF {message.id.slice(0, 8).toUpperCase()}</span><p>{message.message}</p>
            <small className="text-muted-foreground">{message.consent_version && message.consented_at ? "Persetujuan formulir: kebijakan v" + message.consent_version + " · " + dateID(message.consented_at) : "Catatan lama: versi persetujuan belum tercatat."}</small>
            <div className="inbox-message-actions">
              {reply(message.contact) && <Button asChild variant="outline" size="sm"><a href={reply(message.contact)!} target="_blank" rel="noopener noreferrer"><ArrowUpRight data-icon="inline-start" />Buka kontak</a></Button>}
              <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(message.contact); toast.success("Kontak disalin."); } catch { toast.error("Pilih teks kontak, lalu salin secara manual."); } }}><Copy data-icon="inline-start" />Salin kontak</Button>
              <Button variant="ghost" size="sm" disabled={locked} onClick={() => { setActionError(""); setDeleting(message); }}><Trash2 data-icon="inline-start" />Hapus</Button>
            </div>
          </article>)}
          {pages > 1 && <nav aria-label="Halaman pesan" className="inbox-pagination"><Button variant="outline" disabled={locked || page <= 1} onClick={() => setPage(page - 1)}><ArrowLeft data-icon="inline-start" />Sebelumnya</Button><span>{page}/{pages}</span><Button variant="outline" disabled={locked || page >= pages} onClick={() => setPage(page + 1)}>Berikutnya<ArrowRight data-icon="inline-end" /></Button></nav>}
        </div> : <Empty><EmptyHeader><EmptyTitle>{query || filter !== "Semua" ? "Pesan tidak ditemukan" : "Belum ada pesan"}</EmptyTitle><EmptyDescription>{query || filter !== "Semua" ? "Hapus pencarian atau pilih Semua." : "Pesan dari formulir Hubungi kami akan muncul di sini."}</EmptyDescription></EmptyHeader>{(query || filter !== "Semua") && <Button variant="outline" onClick={() => { setQuery(""); setFilter("Semua"); setPage(1); }}>Tampilkan semua pesan</Button>}</Empty>)}
      </CardContent>
    </Card>
    <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !pending.current) setDeleting(null); }}>
      <DialogContent className="workspace-dialog"><DialogHeader><DialogTitle>Hapus pesan pengunjung?</DialogTitle><DialogDescription>Pesan dari {deleting?.name} beserta kontaknya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</DialogDescription></DialogHeader>
        {actionPanel}<div className="flex gap-2 justify-end"><Button variant="outline" disabled={locked} onClick={() => setDeleting(null)}>Batal</Button><Button variant="destructive" disabled={locked} onClick={() => deleting && mutate(deleting.id)}>{busy ? "Menghapus…" : "Hapus pesan"}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
