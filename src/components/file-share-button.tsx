"use client";

import { useState } from "react";
import { Copy, Link2, LoaderCircle, Printer, Share2, X } from "lucide-react";

export function FileShareButton({ fileId, disabled = false }: { fileId: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [shareId, setShareId] = useState("");
  const [message, setMessage] = useState("");
  const [showLinks, setShowLinks] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [links, setLinks] = useState<Array<{ id: string; expires_at: string; max_downloads: number | null; download_count: number; revoked: boolean; expired: boolean; exhausted: boolean }>>([]);

  async function createLink() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 7 }),
        cache: "no-store",
      });
      const payload = await response.json() as { id?: string; url?: string; error?: string; expiresAt?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Tautan tidak dapat dibuat.");
      setUrl(payload.url);
      setShareId(payload.id || "");
      await navigator.clipboard.writeText(payload.url);
      setMessage("Tautan 7 hari dibuat dan disalin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tautan tidak dapat dibuat.");
    } finally {
      setBusy(false);
    }
  }

  async function loadLinks() {
    setLoadingLinks(true);
    try {
      const response = await fetch(`/api/files/${fileId}/share`, { cache: "no-store" });
      const payload = await response.json() as { links?: typeof links; error?: string };
      if (!response.ok || !payload.links) throw new Error(payload.error || "Daftar tautan tidak dapat dimuat.");
      setLinks(payload.links);
      setShowLinks(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Daftar tautan tidak dapat dimuat.");
    } finally { setLoadingLinks(false); }
  }

  async function revokeLink(targetShareId: string) {
    if (!targetShareId) return;
    try {
      const response = await fetch(`/api/files/${fileId}/share`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId: targetShareId }), cache: "no-store",
      });
      if (!response.ok) throw new Error("Tautan tidak dapat dicabut.");
      if (targetShareId === shareId) { setUrl(""); setShareId(""); }
      setLinks((current) => current.map((item) => item.id === targetShareId ? { ...item, revoked: true } : item));
      setMessage("Tautan berbagi telah dicabut.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tautan tidak dapat dicabut."); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Tautan disalin.");
    } catch {
      setMessage("Salin tautan secara manual: " + url);
    }
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button type="button" disabled={disabled || busy} onClick={() => void createLink()} className="sb-btn sb-btn-outline !h-7 !px-2 text-[10px]">
        <Share2 size={12} /> {busy ? "Membuat…" : "Bagikan"}
      </button>
      {url ? <button type="button" onClick={() => void copyLink()} className="sb-btn sb-btn-ghost !h-7 !px-2 text-[10px]"><Copy size={12} /> Salin</button> : null}
      <button type="button" disabled={loadingLinks} onClick={() => showLinks ? setShowLinks(false) : void loadLinks()} className="sb-btn sb-btn-ghost !h-7 !px-2 text-[10px]">{loadingLinks ? <LoaderCircle size={12} className="animate-spin" /> : <Link2 size={12} />} {showLinks ? "Tutup tautan" : "Kelola tautan"}</button>
      {showLinks ? <div className="mt-2 w-full min-w-[220px] space-y-1 rounded-lg border border-line bg-paper p-2">
        {links.length ? links.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 text-[10px]">
          <span className="min-w-0">{item.revoked ? "Dicabut" : item.expired ? "Kedaluwarsa" : item.exhausted ? "Batas unduhan tercapai" : "Aktif"} · {new Date(item.expires_at).toLocaleDateString("id-ID")} · {item.download_count}{item.max_downloads ? `/${item.max_downloads}` : ""} unduhan</span>
          {!item.revoked ? <button type="button" onClick={() => void revokeLink(item.id)} className="shrink-0 text-rose-700 hover:underline"><X size={12} /> Cabut</button> : null}
        </div>) : <span className="text-[10px] text-muted">Belum ada tautan.</span>}
      </div> : null}
      {message ? <span className="text-[10px] text-muted2">{message}</span> : null}
    </div>
  );
}

export function FilePrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="sb-btn sb-btn-primary no-print">
      <Printer size={13} /> Cetak halaman
    </button>
  );
}
