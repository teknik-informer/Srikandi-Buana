"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ShieldCheck, Upload } from "lucide-react";
type Source = {
  version: string;
  date: string;
  status: string;
  members: { number: string; name: string; address: string; phone: string }[];
  board: { role: string; names: string }[];
  attendance: { number: string; name: string; address: string }[];
};
export default function SourceReview({ refreshKey = 0, onImported }: { refreshKey?: number; onImported?: () => void }) {
  const [importing, setImporting] = useState(false);
  async function importSource() {
    setImporting(true);
    try {
      const r = await fetch("/api/source-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Impor belum berhasil.");
      await load();
      onImported?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impor belum dapat diselesaikan.");
    } finally {
      setImporting(false);
    }
  }
  const [source, setSource] = useState<Source | null>(null),
    [error, setError] = useState(""),
    [summary, setSummary] = useState<{ importedMembers: number; skippedMembers: number } | null>(null);
  async function load() {
    try {
      const r = await fetch("/api/source-import", { cache: "no-store" });
      const d = (await r.json()) as {
        source: Source;
        error?: string;
        importSummary?: { importedMembers: number; skippedMembers: number };
      };
      if (!r.ok) throw Error(d.error);
      setSource(d.source);
      setSummary(d.importSummary || null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dokumen belum dapat dimuat");
    }
  }
  useEffect(() => {
    load();
  }, [refreshKey]);
  return (
    <>
      <Alert>
        <ShieldCheck />
        <AlertTitle>Paket v1.1 · pembaruan 28 Oktober 2026</AlertTitle>
        <AlertDescription>
          Data berasal dari rekap dan transkripsi dalam dokumen. Lima puluh nama bukan otomatis lima puluh anggota
          aktif; 13 peserta adalah jumlah menurut scan. Susunan pengurus, masa tugas, persetujuan dan tanda tangan masih
          perlu diperiksa. Data ini tidak ditampilkan ke publik.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Referensi dan Verifikasi Dokumen</CardTitle>
          <CardDescription>
            Data sumber disimpan terenkripsi. Tinjau dokumen terlebih dahulu. Impor hanya dilakukan melalui tombol di
            halaman ini, tanpa mengganti data yang sudah ada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!summary && source && (
            <Button onClick={importSource} disabled={importing}>
              <Upload data-icon="inline-start" />
              {importing ? "Mengimpor…" : "Impor data sumber yang perlu diverifikasi"}
            </Button>
          )}
          {summary && (
            <p className="section-note">
              Penerapan awal: {summary.importedMembers} nama ditambahkan, {summary.skippedMembers} nama/alamat yang sama
              dilewati. Tidak ada status aktif atau persetujuan yang diasumsikan.
            </p>
          )}
          <Button asChild variant="outline">
            <a href="/api/source-document">
              <Download data-icon="inline-start" />
              Unduh paket lengkap (privat)
            </a>
          </Button>
          {error && (
            <div role="alert">
              <p>{error}</p>
              <Button onClick={load}>Coba lagi</Button>
            </div>
          )}
          {!source && !error ? (
            <Skeleton className="h-40 w-full mt-5" />
          ) : (
            source && (
              <div className="source-review">
                <h3>Perbedaan yang harus diperiksa</h3>
                <ul>
                  <li>Ada perbedaan ejaan nama antara rekap anggota, struktur pengurus dan daftar hadir.</li>
                  <li>Satu nama dapat muncul pada alamat berbeda; aplikasi tidak menggabungkannya otomatis.</li>
                  <li>Sebagian RT/RW antara rekap dan daftar hadir berbeda atau belum terverifikasi.</li>
                  <li>
                    Kontak yang kosong atau berformat tidak lazim dipertahankan sesuai sumber dan perlu konfirmasi.
                  </li>
                  <li>Kelompok jabatan berisi beberapa nama; urutan ketua/wakil dan masa tugas tidak diasumsikan.</li>
                </ul>
                <h3>Transkripsi susunan pengurus</h3>
                {source.board.map((b) => (
                  <div className="source-row" key={b.role}>
                    <strong>{b.role}</strong>
                    <p>{b.names}</p>
                    <small>Perlu verifikasi; bukan penetapan final</small>
                  </div>
                ))}
                <h3>13 peserta menurut transkripsi scan</h3>
                {source.attendance.map((a) => (
                  <div className="source-row" key={a.number}>
                    <strong>
                      {a.number}. {a.name}
                    </strong>
                    <p>{a.address}</p>
                  </div>
                ))}
                <p className="section-note">
                  Pencocokan nama ke daftar hadir terverifikasi dilakukan pengelola setelah memeriksa sumber asli. Tidak
                  ada tanda tangan yang dibuat oleh aplikasi.
                </p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </>
  );
}
