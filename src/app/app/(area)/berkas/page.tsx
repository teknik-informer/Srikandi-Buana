import Link from "next/link";
import type { Metadata } from "next";
import { Download, FileText, FolderOpen, Printer, HardDrive, ShieldCheck, UploadCloud, FileImage, FileSpreadsheet, File as FileIcon } from "lucide-react";
import { Badge, Card, CardHeader, Notice } from "@/components/ui";
import { AppBanner } from "@/components/dash-kit";
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

  const totalBytes = files.reduce((sum, file) => sum + file.size_bytes, 0);
  const privateFiles = files.filter((file) => file.scope_kind === "self").length;
  const sharedFiles = files.filter((file) => file.scope_kind !== "self").length;

  return (
    <div className="space-y-5 pb-8">
      <AppBanner
        eyebrow="Ruang dokumen organisasi"
        title="Pusat Berkas"
        lead="Satu ruang kerja untuk menyimpan, menemukan, membuka, mencetak, mengunduh, dan membagikan dokumen sesuai lingkup kewenangan."
        image="/images/komunitas.jpg"
        imageAlt="Anggota organisasi mengelola catatan dan dokumen bersama"
        facts={[`${files.length} berkas dapat diakses`, "Penyimpanan privat Cloudinary", "Akses dibatasi per akun dan lingkup"]}
        badge={<Badge tone="neutral">Dokumen & media</Badge>}
      />

      {actionResult === "uploaded" ? (
        <Notice tone="success" title="Berkas tersimpan">Berkas berhasil diunggah ke penyimpanan organisasi.</Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted2">Berkas tersedia</span><FileText size={16} className="text-primary-700" /></div>
          <div className="mt-2 text-[26px] font-bold leading-none tabular-nums text-ink">{files.length}</div>
          <div className="mt-1 text-[10.5px] text-muted">Terbaru · maksimum 200 item</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted2">Ukuran total</span><HardDrive size={16} className="text-primary-700" /></div>
          <div className="mt-2 text-[26px] font-bold leading-none tabular-nums text-ink">{(totalBytes / 1024 / 1024).toFixed(1)} <span className="text-[13px] font-semibold text-muted">MiB</span></div>
          <div className="mt-1 text-[10.5px] text-muted">Akumulasi berkas dalam daftar</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted2">Lingkup akses</span><ShieldCheck size={16} className="text-primary-700" /></div>
          <div className="mt-2 text-[26px] font-bold leading-none tabular-nums text-ink">{privateFiles} <span className="text-[13px] font-semibold text-muted">pribadi</span></div>
          <div className="mt-1 text-[10.5px] text-muted">{sharedFiles} berkas bidang/organisasi</div>
        </Card>
      </div>

      {can(identity, "files:upload") ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <Card>
            <CardHeader title="Tambahkan berkas" subtitle="Unggah ke ruang pribadi akun Anda. Pilih berkas yang benar sebelum mengirim." action={<UploadCloud size={17} className="text-primary-700" />} />
            <div className="p-4">
              <div className="rounded-[14px] border border-dashed border-[#b9cdbd] bg-[#f6faf6] p-4 sm:p-5">
                <FileUploadField name="asset_id" label="Pilih berkas" scopeKind="self" category="general" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx,.mp4" refreshOnSuccess />
                <p className="mt-2 text-[10px] text-muted2">Maksimal 3 MiB per berkas. Format: PDF, JPG, PNG, WebP, DOCX, XLSX, PPTX, dan MP4.</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-[12px] font-bold text-ink"><ShieldCheck size={16} className="text-primary-700" /> Perlindungan dokumen</div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">Berkas disimpan secara privat. Tautan unduhan tidak membuka akses umum; sistem memeriksa akun, organisasi, serta lingkup berkas ketika diminta.</p>
            <div className="mt-4 space-y-2 border-t border-line pt-3 text-[10.5px] text-muted2">
              <div className="flex items-center justify-between"><span>Ruang pribadi</span><Badge tone="neutral">Pemilik akun</Badge></div>
              <div className="flex items-center justify-between"><span>Ruang bidang</span><Badge tone="neutral">Anggota bidang</Badge></div>
              <div className="flex items-center justify-between"><span>Ruang organisasi</span><Badge tone="neutral">Hak pengelola</Badge></div>
            </div>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader title="Daftar berkas" subtitle={`${files.length} item yang dapat Anda akses · diurutkan dari unggahan terbaru`} action={<Badge tone="neutral">Cloudinary privat</Badge>} />
        {files.length ? (
          <div className="grid gap-2 p-3 sm:p-4">
            {files.map((file) => {
              const canShare = file.uploaded_by === identity.userId || can(identity, "files:manage");
              const printable = file.mime_type === "application/pdf" || file.mime_type.startsWith("image/");
              const ImageType = file.mime_type.startsWith("image/") ? FileImage : file.mime_type.includes("spreadsheet") ? FileSpreadsheet : FileIcon;
              return (
                <article key={file.id} className="group flex min-w-0 flex-col gap-3 rounded-[13px] border border-line bg-white p-3 transition hover:border-[#b8d0bd] hover:shadow-[0_8px_24px_-20px_rgba(12,49,27,.45)] sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#edf5ee] text-[#226c35]"><ImageType size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-[12px] font-semibold text-ink">{file.file_name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted2">
                        <Badge tone="neutral">{file.category}</Badge>
                        <span>{sizeLabel(file.size_bytes)}</span>
                        <span>{new Date(file.created_at).toLocaleDateString("id-ID")}</span>
                        <span>{file.scope_kind === "self" ? "Pribadi" : file.scope_kind === "field" ? "Bidang" : "Organisasi"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={`/api/files/${file.id}`} aria-label={`Unduh ${file.file_name}`} title="Unduh" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink2 transition hover:border-primary-300 hover:bg-[#f4f8f4] hover:text-primary-800"><Download size={14} /></Link>
                    {printable ? (
                      <Link href={`/app/berkas/${file.id}`} aria-label={`Buka atau cetak ${file.file_name}`} title="Buka / cetak" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink2 transition hover:border-primary-300 hover:bg-[#f4f8f4] hover:text-primary-800"><Printer size={14} /></Link>
                    ) : null}
                    {canShare ? <FileShareButton fileId={file.id} /> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf5ee] text-[#226c35]"><FolderOpen size={25} /></div>
            <h2 className="mt-4 text-[14px] font-semibold text-ink">Belum ada berkas</h2>
            <p className="mx-auto mt-1 max-w-md text-[11.5px] leading-relaxed text-muted">Berkas yang Anda unggah atau lampiran yang dibagikan kepada lingkup Anda akan muncul di sini.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
