import Link from "next/link";
import type { Metadata } from "next";
import { DOCUMENTS } from "@/data/organization";
import { formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, Notice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Dokumen Publik",
  description: "Dokumen publik KWT Srikandi Buana: SK, ringkasan laporan program, dan publikasi yang disetujui.",
};

export default async function DokumenPage({ searchParams }: { searchParams: Promise<{ kategori?: string }> }) {
  const { kategori } = await searchParams;
  const publicDocs = DOCUMENTS.filter((d) => d.visibility === "publik" || d.category === "Laporan").filter(
    (d) => !kategori || d.category.toLowerCase() === kategori,
  );

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Transparansi</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Dokumen publik.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Hanya dokumen yang telah disetujui untuk dipublikasikan. Dokumen internal dan terbatas tidak
        ditampilkan di sini.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/dokumen" className={`sb-chip ${!kategori ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Semua</Link>
        <Link href="/dokumen?kategori=laporan" className={`sb-chip ${kategori === "laporan" ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Laporan</Link>
        <Link href="/dokumen?kategori=sk" className={`sb-chip ${kategori === "sk" ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>SK</Link>
      </div>

      <Card className="mt-6">
        <CardHeader title="Daftar dokumen" subtitle={`${publicDocs.length} dokumen tersedia untuk publik`} />
        <div className="sb-scroll">
          <table className="sb-table min-w-[640px]">
            <thead>
              <tr><th>Nomor</th><th>Judul</th><th>Kategori</th><th>Tanggal</th><th>Status</th></tr>
            </thead>
            <tbody>
              {publicDocs.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-[12px] text-muted">{d.number}</td>
                  <td className="font-medium text-ink">{d.title}</td>
                  <td>{d.category}</td>
                  <td className="text-muted">{formatDateID(d.date)}</td>
                  <td><Badge tone={d.status === "final" ? "success" : "warning"}>{d.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5">
        <Notice tone="info" title="Permintaan dokumen">
          Untuk permintaan dokumen di luar daftar ini, ajukan melalui <Link href="/kontak?tujuan=informasi" className="font-semibold underline">halaman kontak</Link>.
          Permintaan akan ditinjau sesuai kebijakan akses dan persetujuan organisasi.
        </Notice>
      </div>
    </div>
  );
}
