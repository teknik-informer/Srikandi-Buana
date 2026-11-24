import Link from "next/link";
import type { Metadata } from "next";
import { Archive, ArrowRight, FileCheck2, FileText, LockKeyhole } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Dokumen Organisasi" };

interface DocumentSummary {
  total_count: number;
  final_count: number;
  draft_count: number;
  public_count: number;
  archived_count: number;
}

interface DocumentRow {
  id: string;
  reference_no: string;
  number: string | null;
  title: string;
  category: string;
  document_date: string;
  owner_label: string;
  visibility: "publik" | "internal" | "terbatas";
  status: "draft" | "final" | "arsip";
  description: string | null;
  file_revision: number | null;
  file_name: string | null;
  mime_type: string | null;
}

const visibilityLabel: Record<DocumentRow["visibility"], string> = {
  publik: "Publik",
  internal: "Internal",
  terbatas: "Terbatas",
};

const statusLabel: Record<DocumentRow["status"], string> = {
  draft: "Draf",
  final: "Final",
  arsip: "Arsip",
};

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function PengurusDokumenPage() {
  const identity = await requireIdentity("organization:read");
  const canReadSecretariat = can(identity, "secretariat:read");
  let summary: DocumentSummary | null = null;
  let documents: DocumentRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [summaryResult, documentsResult] = await Promise.all([
      sql`
        SELECT
          count(*)::int AS total_count,
          count(*) FILTER (WHERE status = 'final')::int AS final_count,
          count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
          count(*) FILTER (WHERE status = 'final' AND visibility = 'publik')::int AS public_count,
          count(*) FILTER (WHERE status = 'arsip')::int AS archived_count
        FROM v9.secretariat_documents
        WHERE organization_id = ${identity.organizationId}
          AND (
            (${canReadSecretariat} = true AND status <> 'arsip')
            OR (${canReadSecretariat} = false AND status = 'final' AND visibility = 'publik')
          )
      `,
      sql`
        SELECT
          document.id::text AS id,
          document.reference_no,
          document.number,
          document.title,
          document.category,
          document.document_date::text AS document_date,
          document.owner_label,
          document.visibility,
          document.status,
          document.description,
          latest_file.revision_no AS file_revision,
          latest_file.file_name,
          latest_file.mime_type
        FROM v9.secretariat_documents AS document
        LEFT JOIN LATERAL (
          SELECT file.revision_no, file.file_name, file.mime_type
          FROM v9.secretariat_document_files AS file
          WHERE file.document_id = document.id
          ORDER BY file.revision_no DESC
          LIMIT 1
        ) AS latest_file ON true
        WHERE document.organization_id = ${identity.organizationId}
          AND (
            (${canReadSecretariat} = true AND document.status <> 'arsip')
            OR (
              ${canReadSecretariat} = false
              AND document.status = 'final'
              AND document.visibility = 'publik'
            )
          )
        ORDER BY document.document_date DESC, document.created_at DESC
        LIMIT 200
      `,
    ]);
    summary = rowsFromResult<DocumentSummary>(summaryResult)[0] ?? null;
    documents = rowsFromResult<DocumentRow>(documentsResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-documents] Source unavailable", safeErrorType(reason));
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Dokumen organisasi"
        description="Dokumen yang tersimpan pada register Sekretariat, dengan klasifikasi akses sesuai kewenangan akun."
        actions={
          canReadSecretariat ? (
            <Link href="/app/sekretariat/dokumen" className="sb-btn sb-btn-outline">
              Kelola arsip <ArrowRight size={13} />
            </Link>
          ) : (
            <Badge tone="neutral"><LockKeyhole size={11} className="mr-1 inline" /> Baca dokumen publik</Badge>
          )
        }
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Register dokumen belum dapat dimuat">
            Koneksi ke register Sekretariat sedang tidak tersedia. Daftar dokumen contoh tidak ditampilkan.
          </Notice>
        </div>
      ) : null}

      {summary ? (
        <>
          {canReadSecretariat ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Dokumen aktif" value={summary.total_count} note="Draf dan final" tone="info" icon={<FileText size={17} />} />
              <StatCard label="Final" value={summary.final_count} note="Telah difinalkan" tone="success" icon={<FileCheck2 size={17} />} />
              <StatCard label="Draf" value={summary.draft_count} note="Menunggu pemeriksaan" tone="warning" />
              <StatCard label="Publik" value={summary.public_count} note="Final dan dapat diakses publik" tone="info" icon={<Archive size={17} />} />
            </div>
          ) : (
            <div className="mb-4">
              <Notice tone="info" title="Tampilan dokumen publik">
                Akun ini hanya menampilkan dokumen berstatus final dan berklasifikasi publik. Dokumen internal
                atau terbatas tidak disertakan pada hasil maupun angka ringkasan.
              </Notice>
            </div>
          )}

          <Card className="mt-4">
            <CardHeader
              title="Register dokumen"
              subtitle={canReadSecretariat ? `${documents.length} dokumen terbaru yang dapat dilihat akun ini` : `${documents.length} dokumen publik final`}
              action={<Badge tone="neutral">Sumber Sekretariat</Badge>}
            />
            {documents.length ? (
              <div className="sb-scroll">
                <table className="sb-table min-w-[820px]">
                  <thead>
                    <tr><th>Nomor / tanggal</th><th>Judul dokumen</th><th>Kategori</th><th>Pemilik</th><th>Akses</th><th>Status</th><th>Berkas</th></tr>
                  </thead>
                  <tbody>
                    {documents.map((document) => (
                      <tr key={document.id}>
                        <td className="whitespace-nowrap">
                          <div className="font-mono text-[10px] text-muted">{document.number ?? document.reference_no}</div>
                          <div className="mt-0.5 text-[9.5px] text-muted2">{formatDateID(document.document_date, "short")}</div>
                        </td>
                        <td className="max-w-[260px]">
                          <div className="font-medium text-ink">{document.title}</div>
                          {document.description ? <div className="mt-0.5 line-clamp-2 text-[10px] text-muted">{document.description}</div> : null}
                        </td>
                        <td className="text-muted">{document.category}</td>
                        <td className="text-muted">{document.owner_label}</td>
                        <td>
                          <Badge tone={document.visibility === "publik" ? "success" : document.visibility === "terbatas" ? "warning" : "neutral"}>
                            {visibilityLabel[document.visibility]}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={document.status === "final" ? "success" : "warning"}>{statusLabel[document.status]}</Badge>
                        </td>
                        <td className="text-[10px] text-muted">
                          {document.file_name ? (
                            <span>{document.file_name}{document.file_revision ? ` · v${document.file_revision}` : ""}</span>
                          ) : "Belum ada berkas"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="Belum ada dokumen yang dapat ditampilkan"
                  body={canReadSecretariat
                    ? "Dokumen akan muncul setelah diregistrasi pada modul Sekretariat."
                    : "Belum ada dokumen final berklasifikasi publik pada register organisasi."}
                />
              </div>
            )}
          </Card>
        </>
      ) : null}

      <div className="mt-4">
        <Notice tone="warning" title="Klasifikasi akses tetap berlaku">
          Dokumen internal dan terbatas tidak disajikan melalui halaman umum Pengurus. Akun dengan kewenangan
          Sekretariat dapat membuka register lengkap dan mengikuti kontrol akses pada modul pemilik dokumen.
        </Notice>
      </div>
    </div>
  );
}
