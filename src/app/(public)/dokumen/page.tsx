import Link from "next/link";
import type { Metadata } from "next";
import { Download, FileCheck2, FileText } from "lucide-react";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dokumen Publik",
  description: "Dokumen publik KWT Srikandi Buana yang telah difinalkan dan disetujui untuk diakses.",
};

interface PublicDocument {
  id: string;
  reference_no: string;
  number: string | null;
  title: string;
  category: string;
  document_date: string;
  owner_label: string;
  file_name: string;
  size_bytes: number;
}

const categories = [
  { value: "", label: "Semua" },
  { value: "laporan", label: "Laporan" },
  { value: "sk", label: "SK" },
  { value: "sop", label: "SOP" },
  { value: "surat", label: "Surat" },
  { value: "notulen", label: "Notulen" },
  { value: "publikasi", label: "Publikasi" },
];

function sizeLabel(value: number): string {
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.ceil(value / 1024)} KiB`;
}

export default async function DokumenPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const selectedCategory = categories.some((item) => item.value === kategori) ? (kategori ?? "") : "";
  const sql = getV9Sql();
  const result = await sql`
    SELECT
      document.id::text AS id,
      document.reference_no,
      document.number,
      document.title,
      document.category,
      document.document_date::text AS document_date,
      document.owner_label,
      latest_file.file_name,
      latest_file.size_bytes
    FROM v9.secretariat_documents AS document
    INNER JOIN LATERAL (
      SELECT file.file_name, file.size_bytes
      FROM v9.secretariat_document_files AS file
      WHERE file.document_id = document.id
      ORDER BY file.revision_no DESC
      LIMIT 1
    ) AS latest_file ON true
    WHERE document.status = 'final'
      AND document.visibility = 'publik'
      AND (
        ${selectedCategory} = ''
        OR lower(document.category) = ${selectedCategory}
      )
    ORDER BY document.document_date DESC, document.created_at DESC
    LIMIT 200
  `;
  const documents = rowsFromResult<PublicDocument>(result);

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Transparansi</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">
        Dokumen publik.
      </h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Hanya dokumen dengan klasifikasi publik, berkas terlampir, dan status final yang tersedia
        untuk diunduh. Dokumen internal dan terbatas tidak ditampilkan.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((item) => (
          <Link
            key={item.value || "all"}
            href={item.value ? `/dokumen?kategori=${item.value}` : "/dokumen"}
            className={`sb-chip ${selectedCategory === item.value ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Daftar dokumen"
          subtitle={`${documents.length} dokumen tersedia untuk publik`}
          action={<Badge tone="success">Final & publik</Badge>}
        />
        {documents.length ? (
          <div className="sb-scroll">
            <table className="sb-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Nomor / referensi</th>
                  <th>Judul</th>
                  <th>Kategori</th>
                  <th>Tanggal</th>
                  <th>Berkas</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <div className="font-mono text-[11px] text-muted">{document.number ?? "—"}</div>
                      <div className="mt-1 font-mono text-[9.5px] text-muted2">{document.reference_no}</div>
                    </td>
                    <td>
                      <div className="font-medium text-ink">{document.title}</div>
                      <div className="mt-1 text-[10.5px] text-muted">Pemilik: {document.owner_label}</div>
                    </td>
                    <td><Badge tone="neutral">{document.category}</Badge></td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(document.document_date)}</td>
                    <td>
                      <Link
                        href={`/api/secretariat/documents/${document.id}/file`}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-700"
                      >
                        <Download size={12} /> Unduh
                      </Link>
                      <div className="mt-1 text-[10px] text-muted2">{document.file_name} · {sizeLabel(document.size_bytes)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12">
            <EmptyState
              title="Belum ada dokumen publik"
              body="Dokumen akan tampil setelah Sekretariat mengunggah berkas, menetapkan klasifikasi publik, dan memfinalkannya."
            />
          </div>
        )}
      </Card>

      <div className="mt-5">
        <Notice tone="info" title="Permintaan dokumen">
          Untuk permintaan dokumen di luar daftar ini, ajukan melalui{" "}
          <Link href="/kontak?tujuan=informasi" className="font-semibold underline">
            halaman kontak
          </Link>
          . Permintaan akan ditinjau sesuai klasifikasi akses dan persetujuan organisasi.
        </Notice>
      </div>
    </div>
  );
}
