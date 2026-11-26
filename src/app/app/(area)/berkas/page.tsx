import Link from "next/link";
import type { Metadata } from "next";
import { Download, FileText, FolderOpen, Printer } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader, Notice } from "@/components/ui";
import { FileUploadField } from "@/components/file-upload-field";
import { FileShareButton } from "@/components/file-share-button";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Pusat Berkas" };

interface FileRow {
  id: string;
  uploaded_by: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  scope_kind: "organization" | "field" | "self";
  created_at: string;
}

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB` : `${Math.ceil(bytes / 1024)} KiB`;
}

export default async function FileManagerPage({
  searchParams,
}: { searchParams: Promise<{ result?: string }> }) {
  const identity = await requireIdentity("files:read");
  const { result: actionResult } = await searchParams;
  const sql = getV9Sql();
  const files = rowsFromResult<FileRow>(await sql`
    SELECT asset.id::text AS id, asset.uploaded_by::text AS uploaded_by, asset.file_name,
      asset.size_bytes::int AS size_bytes, asset.category, asset.scope_kind,
      asset.created_at::text AS created_at
    FROM v9.file_assets AS asset
    WHERE asset.organization_id = ${identity.organizationId}
      AND asset.status = 'active'
      AND (
        asset.uploaded_by = ${identity.userId}
        OR (${can(identity, "files:manage")} = true)
        OR (asset.scope_kind = 'organization' AND ${can(identity, "files:read")} = true)
        OR (asset.scope_kind = 'field' AND asset.scope_ref = ${identity.field ?? null})
      )
      AND NOT EXISTS (
        SELECT 1 FROM v9.secretariat_document_files AS file
        INNER JOIN v9.secretariat_documents AS document ON document.id = file.document_id
        WHERE file.asset_id = asset.id
          AND (
            document.status <> 'final'
            OR document.visibility <> 'publik'
            OR file.revision_no <> (
              SELECT max(latest.revision_no)
              FROM v9.secretariat_document_files AS latest
              WHERE latest.document_id = file.document_id
            )
          )
      )
    ORDER BY asset.created_at DESC
    LIMIT 200
  `);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Layanan Berkas"
        title="Pusat Berkas"
        description="Satu tempat untuk unggah, unduh, membuka dan mencetak berkas, serta membagikan tautan akses sementara. Berkas disimpan secara privat melalui Cloudinary."
      />
      {actionResult === "uploaded" ? (
        <div className="mb-4"><Notice tone="success" title="Berkas tersimpan">Berkas berhasil diunggah ke penyimpanan organisasi.</Notice></div>
      ) : null}
      {can(identity, "files:upload") ? (
        <Card className="mb-5">
          <CardHeader title="Unggah berkas" subtitle="Berkas baru pada ruang pribadi akun Anda. Lampiran untuk modul lain dapat dipilih dari layanan yang sama." />
          <div className="p-4">
            <FileUploadField name="asset_id" label="Pilih berkas" scopeKind="self" category="general" refreshOnSuccess />
            <p className="mt-2 text-[10px] text-muted2">Setelah unggahan berhasil, berkas akan muncul pada daftar di bawah ini. Maksimal 3 MiB per berkas.</p>
          </div>
        </Card>
      ) : null}
      <Card>
        <CardHeader title="Berkas yang dapat Anda akses" subtitle={`${files.length} berkas terbaru · maksimal 200`} />
        {files.length ? (
          <div className="divide-y divide-line">
            {files.map((file) => {
              const canShare = file.uploaded_by === identity.userId || can(identity, "files:manage");
              const printable = file.mime_type === "application/pdf" || file.mime_type.startsWith("image/");
              return (
                <div key={file.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-lg bg-surface2 p-2 text-muted"><FileText size={18} /></div>
                    <div className="min-w-0">
                      <div className="break-words text-[12px] font-semibold text-ink">{file.file_name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted2">
                        <Badge tone="neutral">{file.category}</Badge>
                        <span>{sizeLabel(file.size_bytes)}</span>
                        <span>{new Date(file.created_at).toLocaleDateString("id-ID")}</span>
                        <span>{file.scope_kind === "self" ? "Pribadi" : file.scope_kind === "field" ? "Bidang" : "Organisasi"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/api/files/${file.id}`} className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[10px]"><Download size={12} /> Unduh</Link>
                    {printable ? (
                      <Link href={`/app/berkas/${file.id}`} className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[10px]"><Printer size={12} /> Buka / cetak</Link>
                    ) : null}
                    {canShare ? <FileShareButton fileId={file.id} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <FolderOpen size={28} className="mx-auto text-muted2" />
            <h2 className="mt-3 text-[13px] font-semibold text-ink">Belum ada berkas</h2>
            <p className="mt-1 text-[11px] text-muted">Berkas yang Anda unggah atau lampiran yang dibagikan kepada lingkup Anda akan muncul di sini.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
