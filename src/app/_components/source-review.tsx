"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ShieldCheck, Upload } from "lucide-react";
import type { Role } from "@/lib/permissions";

type Source = {
  version: string;
  date: string;
  status: string;
  members: { number: string; name: string; address: string; phone: string }[];
  board: { role: string; names: string }[];
  attendance: { number: string; name: string; address: string }[];
};

export default function SourceReview({
  role,
  refreshKey = 0,
  onImported,
}: {
  role: Role;
  refreshKey?: number;
  onImported?: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [canImport, setCanImport] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{ importedMembers: number; skippedMembers: number; deferredMembers?: number; sourceMembers?: number; sourceAttendance?: number; personalDataImported?: boolean } | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/source-import", { cache: "no-store" });
      const data = (await response.json()) as {
        source?: Source;
        error?: string;
        canImport?: boolean;
        importSummary?: { importedMembers: number; skippedMembers: number; deferredMembers?: number; sourceMembers?: number; sourceAttendance?: number; personalDataImported?: boolean };
      };
      if (!response.ok || !data.source) throw Error(data.error || "Dokumen belum dapat dimuat.");
      setSource(data.source);
      setCanImport(data.canImport === true);
      setSummary(data.importSummary || null);
      setError("");
    } catch (cause) {
      setSource(null);
      setCanImport(false);
      setSummary(null);
      setError(cause instanceof Error ? cause.message : "Dokumen belum dapat dimuat.");
    }
  }

  async function importSource() {
    if (!canImport || importing) return;
    setImporting(true);
    try {
      const response = await fetch("/api/source-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Impor belum berhasil.");
      await load();
      onImported?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impor belum dapat diselesaikan.");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    void load();
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
            {role === "admin"
              ? "Administrator Sistem hanya dapat menerapkan metadata nonpribadi satu kali. Identitas, alamat, dan nomor kontak tidak ditampilkan pada layar ini."
              : role === "ketua"
                ? "Ketua melihat status dan metadata kelembagaan. Identitas anggota, alamat, kontak, serta dokumen asli dikelola terbatas oleh Sekretariat."
                : "Sekretariat memeriksa dokumen asli, mencocokkan identitas, dan mencatat hasil verifikasi. Impor metadata tidak mengganti catatan yang sudah ada."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canImport && !summary && source && (
            <Button onClick={() => void importSource()} disabled={importing}>
              <Upload data-icon="inline-start" />
              {importing ? "Mengimpor…" : "Terapkan metadata nonpribadi"}
            </Button>
          )}
          {summary && (
            <p className="section-note">
              Metadata kelembagaan diterapkan. {summary.personalDataImported === false ? "Tidak ada identitas atau nomor kontak pribadi yang disalin ke database." : `Riwayat impor lama mencatat ${summary.importedMembers} nama ditambahkan.`} {summary.deferredMembers ?? summary.sourceMembers ?? 0} catatan calon anggota dan {summary.sourceAttendance ?? 0} peserta tetap ditahan untuk verifikasi dokumen dan dasar pemrosesan.
            </p>
          )}
          {role === "sekretaris" && (
            <Button asChild variant="outline">
              <a href="/api/source-document">
                <Download data-icon="inline-start" />
                Unduh paket lengkap (privat)
              </a>
            </Button>
          )}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <Button onClick={() => void load()}>Coba lagi</Button>
            </div>
          )}
          {!source && !error ? (
            <Skeleton className="h-40 w-full" />
          ) : role === "admin" ? (
            <p className="section-note">
              {summary
                ? "Impor awal selesai. Pemeriksaan identitas, alamat, status keanggotaan, dan persetujuan data dilakukan oleh pengelola organisasi."
                : "Metadata nonpribadi dapat diterapkan satu kali. Data individu tidak disalin ke database melalui akun teknis; pemeriksaan identitas dan dasar pemrosesan dilakukan oleh pengelola organisasi."}
            </p>
          ) : role === "ketua" ? (
            <p className="section-note">
              Ketua memperoleh ringkasan nonpribadi untuk pengawasan. Daftar nama, alamat, nomor kontak, transkripsi daftar hadir, dan paket dokumen lengkap hanya tersedia bagi Sekretariat sesuai kebutuhan verifikasi.
              {summary ? " Metadata paket sudah diterapkan dan identitas individu tetap ditahan." : " Pemeriksaan dokumen asli dan pencocokan identitas menunggu proses Sekretariat."}
            </p>
          ) : (
            source && (
              <div className="source-review">
                <h3>Perbedaan yang harus diperiksa</h3>
                <ul>
                  <li>Ada perbedaan ejaan nama antara rekap anggota, struktur pengurus dan daftar hadir.</li>
                  <li>Satu nama dapat muncul pada alamat berbeda; aplikasi tidak menggabungkannya otomatis.</li>
                  <li>Sebagian RT/RW antara rekap dan daftar hadir berbeda atau belum terverifikasi.</li>
                  <li>Kontak yang kosong atau berformat tidak lazim dipertahankan sesuai sumber dan perlu konfirmasi.</li>
                  <li>Kelompok jabatan berisi beberapa nama; urutan ketua/wakil dan masa tugas tidak diasumsikan.</li>
                </ul>
                <h3>Transkripsi susunan pengurus</h3>
                {source.board.map((item) => (
                  <div className="source-row" key={item.role}>
                    <strong>{item.role}</strong>
                    <p>{item.names}</p>
                    <small>Perlu verifikasi; bukan penetapan final</small>
                  </div>
                ))}
                <h3>13 peserta menurut transkripsi scan</h3>
                {source.attendance.map((item) => (
                  <div className="source-row" key={item.number}>
                    <strong>{item.number}. {item.name}</strong>
                    <p>{item.address}</p>
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
