import Link from "next/link";
import type { Metadata } from "next";
import { Archive, Download, FileCheck2, FilePlus2, FileText, LockKeyhole } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import {
  archiveSecretariatDocument,
  finalizeSecretariatDocument,
  registerSecretariatDocument,
  updateSecretariatDocument,
  uploadSecretariatDocumentRevision,
} from "@/app/actions/secretariat-documents";

export const metadata: Metadata = { title: "Dokumen & Arsip" };

interface DocumentSummary {
  total_count: number;
  draft_count: number;
  final_count: number;
  public_count: number;
  archived_count: number;
}

interface DocumentRow {
  id: string;
  reference_no: string;
  number: string | null;
  title: string;
  category: "SK" | "Laporan" | "SOP" | "Surat" | "Notulen" | "Publikasi";
  document_date: string;
  owner_label: string;
  visibility: "publik" | "internal" | "terbatas";
  status: "draft" | "final" | "arsip";
  description: string | null;
  file_revision: number | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  template_code: string | null;
  generated_revision: number | null;
  has_generated_content: boolean;
}

const categories = ["SK", "Laporan", "SOP", "Surat", "Notulen", "Publikasi"] as const;

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function sizeLabel(value: number | null): string {
  if (!value) return "Belum ada berkas";
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.ceil(value / 1024)} KiB`;
}

const statusLabel: Record<DocumentRow["status"], string> = {
  draft: "Draf",
  final: "Final",
  arsip: "Arsip",
};

const visibilityLabel: Record<DocumentRow["visibility"], string> = {
  publik: "Publik",
  internal: "Internal",
  terbatas: "Terbatas",
};

export default async function DokumenPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; message?: string; status?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const { result, message, status } = await searchParams;
  const canWrite = can(identity, "secretariat:documents:write");
  const canPublish = can(identity, "documents:publish");
  const showArchived = status === "arsip";
  const sql = getV9Sql();

  const [summaryResult, documentsResult] = await Promise.all([
    sql`
      SELECT
        count(*)::int AS total_count,
        count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
        count(*) FILTER (WHERE status = 'final')::int AS final_count,
        count(*) FILTER (WHERE status = 'final' AND visibility = 'publik')::int AS public_count,
        count(*) FILTER (WHERE status = 'arsip')::int AS archived_count
      FROM v9.secretariat_documents
      WHERE organization_id = ${identity.organizationId}
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
        latest_file.mime_type,
        latest_file.size_bytes,
        latest_generation.template_code,
        latest_generation.revision_no AS generated_revision,
        (latest_generation.id IS NOT NULL) AS has_generated_content
      FROM v9.secretariat_documents AS document
      LEFT JOIN LATERAL (
        SELECT file.revision_no, file.file_name, file.mime_type, file.size_bytes
        FROM v9.secretariat_document_files AS file
        WHERE file.document_id = document.id
        ORDER BY file.revision_no DESC
        LIMIT 1
      ) AS latest_file ON true
      LEFT JOIN LATERAL (
        SELECT generation.id, generation.template_code, generation.revision_no
        FROM v9.secretariat_document_generations AS generation
        WHERE generation.document_id = document.id
        ORDER BY generation.revision_no DESC
        LIMIT 1
      ) AS latest_generation ON true
      WHERE document.organization_id = ${identity.organizationId}
        AND (
          (${showArchived} = true AND document.status = 'arsip')
          OR (${showArchived} = false AND document.status <> 'arsip')
        )
      ORDER BY document.document_date DESC, document.created_at DESC
      LIMIT 300
    `,
  ]);
  const summary = rowsFromResult<DocumentSummary>(summaryResult)[0] ?? {
    total_count: 0, draft_count: 0, final_count: 0, public_count: 0, archived_count: 0,
  };
  const documents = rowsFromResult<DocumentRow>(documentsResult);

  const notices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    created: { tone: "success", text: "Dokumen berhasil diregistrasi. Status awal adalah draf." },
    updated: { tone: "success", text: "Metadata dokumen berhasil diperbarui." },
    "file-uploaded": { tone: "success", text: "Versi berkas berhasil diunggah. Dokumen kembali ke draf untuk diperiksa sebelum difinalkan." },
    finalized: { tone: "success", text: "Dokumen difinalkan. Dokumen publik yang disetujui kini dapat diakses dari website." },
    archived: { tone: "success", text: "Dokumen dipindahkan ke arsip tanpa menghapus riwayat berkas." },
    duplicate: { tone: "danger", text: "Nomor dokumen sudah digunakan pada organisasi ini." },
    invalid: { tone: "danger", text: "Metadata dokumen tidak valid. Periksa kembali isian." },
    forbidden: { tone: "danger", text: "Akun ini tidak memiliki kewenangan untuk mengatur dokumen publik." },
    locked: { tone: "warning", text: "Metadata terkunci setelah final. Buat unggahan revisi atau periksa status dokumen." },
    "not-ready": { tone: "warning", text: "Dokumen belum siap difinalkan. Pastikan berkas sudah diunggah dan kewenangan publik tersedia." },
    error: { tone: "danger", text: "Operasi dokumen gagal. Periksa koneksi dan coba kembali." },
    stale: { tone: "warning", text: "Dokumen sudah berubah atau tidak ditemukan." },
    "file-invalid": { tone: "danger", text: message ? message.slice(0, 250) : "Berkas tidak valid." },
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Dokumen & arsip"
        description="Register dokumen dengan konten hasil generator, lampiran, klasifikasi akses, revisi, dan jejak audit. Dokumen final tidak dihapus; setiap revisi memerlukan pemeriksaan ulang."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!showArchived ? (
              <Link href="/app/sekretariat/template" className="sb-btn sb-btn-primary">
                <FilePlus2 size={14} /> Generator dokumen
              </Link>
            ) : null}
            <Link
              href={showArchived ? "/app/sekretariat/dokumen" : "/app/sekretariat/dokumen?status=arsip"}
              className="sb-btn sb-btn-outline"
            >
              <Archive size={14} /> {showArchived ? "Dokumen aktif" : "Lihat arsip"}
            </Link>
          </div>
        }
      />

      {result && notices[result] ? (
        <div className="mb-4">
          <Notice tone={notices[result].tone} title="Pembaruan arsip">
            {notices[result].text}
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total dokumen" value={summary.total_count} note="Semua status" />
        <StatCard label="Draf" value={summary.draft_count} note="Belum difinalkan" tone="warning" />
        <StatCard label="Final" value={summary.final_count} note="Siap dirujuk" tone="success" />
        <StatCard label="Publik" value={summary.public_count} note="Final dan terlihat di website" tone="info" />
      </div>

      {canWrite && !showArchived ? (
        <Card className="mt-5">
          <CardHeader
            title="Registrasi dokumen"
            subtitle="Berkas dapat diunggah sekarang atau ditambahkan sebagai revisi setelah registrasi."
          />
          <form action={registerSecretariatDocument} encType="multipart/form-data" className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-3">
              <label htmlFor="document-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Judul dokumen</label>
              <input id="document-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder="Mis. Surat Keputusan Susunan Pengurus" />
            </div>
            <div>
              <label htmlFor="document-number" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nomor dokumen resmi</label>
              <input id="document-number" name="number" maxLength={100} className="sb-input" placeholder="Nomor sesuai dokumen" />
            </div>
            <div>
              <label htmlFor="document-category" className="mb-1 block text-[11.5px] font-semibold text-ink2">Kategori</label>
              <select id="document-category" name="category" required defaultValue="SK" className="sb-input">
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="document-date" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal dokumen</label>
              <input id="document-date" name="document_date" type="date" required className="sb-input" />
            </div>
            <div>
              <label htmlFor="document-owner" className="mb-1 block text-[11.5px] font-semibold text-ink2">Unit pemilik / penanggung jawab</label>
              <input id="document-owner" name="owner_label" required minLength={2} maxLength={160} className="sb-input" placeholder="Mis. Sekretariat" />
            </div>
            <div>
              <label htmlFor="document-visibility" className="mb-1 block text-[11.5px] font-semibold text-ink2">Klasifikasi akses</label>
              <select id="document-visibility" name="visibility" defaultValue="internal" className="sb-input">
                <option value="internal">Internal</option>
                <option value="terbatas">Terbatas</option>
                {canPublish ? <option value="publik">Publik (memerlukan finalisasi)</option> : null}
              </select>
            </div>
            <div>
              <label htmlFor="document-file" className="mb-1 block text-[11.5px] font-semibold text-ink2">Berkas (opsional)</label>
              <input id="document-file" name="document_file" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.pptx" className="sb-input !h-auto py-2 text-[10.5px]" />
              <p className="mt-1 text-[10px] text-muted2">PDF, JPG, PNG, DOCX, XLSX, PPTX · maksimal 3 MiB.</p>
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <label htmlFor="document-description" className="mb-1 block text-[11.5px] font-semibold text-ink2">Keterangan (opsional)</label>
              <textarea id="document-description" name="description" rows={2} maxLength={4000} className="sb-input !h-auto resize-y py-2.5" placeholder="Ringkasan atau keterangan akses dokumen." />
            </div>
            <div className="flex justify-end sm:col-span-2 xl:col-span-3">
              <button type="submit" className="sb-btn sb-btn-primary"><FilePlus2 size={14} /> Simpan registrasi</button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mt-5">
        <Card>
          <CardHeader
            title={showArchived ? "Arsip dokumen" : "Register dokumen"}
            subtitle={`${documents.length} catatan · maksimal 300 dokumen terbaru`}
            action={<Badge tone="neutral">Sumber data V9</Badge>}
          />
          {documents.length ? (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="sb-table min-w-[1180px]">
                  <thead>
                    <tr>
                      <th>Dokumen</th><th>Kategori / tanggal</th><th>Akses</th><th>Berkas</th><th>Status</th><th>Pengelolaan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((document) => (
                      <tr key={document.id} className="align-top">
                        <td className="max-w-[260px]">
                          <div className="font-mono text-[9.5px] text-muted2">{document.reference_no}</div>
                          <div className="mt-1 font-semibold text-ink">{document.title}</div>
                          <div className="mt-1 text-[10.5px] text-muted">{document.number ?? "Nomor resmi belum dicatat"} · {document.owner_label}</div>
                        </td>
                        <td>
                          <div className="text-[11.5px] text-ink2">{document.category}</div>
                          <div className="mt-1 text-[10.5px] text-muted">{dateLabel(document.document_date)}</div>
                        </td>
                        <td><Badge tone={document.visibility === "publik" ? "success" : document.visibility === "terbatas" ? "warning" : "neutral"}>{visibilityLabel[document.visibility]}</Badge></td>
                        <td>
                          <div className="space-y-1.5">
                            {document.file_name ? (
                              <>
                                <Link href={`/api/secretariat/documents/${document.id}/file`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700">
                                  <Download size={12} /> {document.file_name}
                                </Link>
                                <div className="text-[10px] text-muted2">Berkas rev {document.file_revision} · {sizeLabel(document.size_bytes)}</div>
                              </>
                            ) : null}
                            {document.has_generated_content ? (
                              <Link href={`/app/sekretariat/dokumen/${document.id}/cetak`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700">
                                <FileText size={12} /> Isi dokumen · rev {document.generated_revision}
                              </Link>
                            ) : null}
                            {!document.file_name && !document.has_generated_content ? (
                              <span className="text-[10.5px] text-muted2">Belum ada isi atau berkas</span>
                            ) : null}
                          </div>
                        </td>
                        <td><Badge tone={document.status === "final" ? "success" : document.status === "draft" ? "warning" : "neutral"}>{statusLabel[document.status]}</Badge></td>
                        <td>
                          {canWrite && document.status !== "arsip" ? (
                            <div className="min-w-[205px] space-y-2">
                              {document.status === "draft" ? (
                                <form action={updateSecretariatDocument} className="space-y-1.5">
                                  <input type="hidden" name="document_id" value={document.id} />
                                  <input name="title" required maxLength={300} defaultValue={document.title} className="sb-input !h-8 text-[10.5px]" aria-label="Judul dokumen" />
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input name="number" maxLength={100} defaultValue={document.number ?? ""} className="sb-input !h-8 text-[10px]" placeholder="Nomor" aria-label="Nomor dokumen" />
                                    <select name="category" defaultValue={document.category} className="sb-input !h-8 text-[10px]" aria-label="Kategori">
                                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                                    </select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input name="document_date" type="date" required defaultValue={document.document_date} className="sb-input !h-8 text-[10px]" aria-label="Tanggal dokumen" />
                                    <input name="owner_label" required maxLength={160} defaultValue={document.owner_label} className="sb-input !h-8 text-[10px]" aria-label="Pemilik dokumen" />
                                  </div>
                                  <select name="visibility" defaultValue={document.visibility} className="sb-input !h-8 text-[10px]" aria-label="Klasifikasi akses">
                                    <option value="internal">Internal</option><option value="terbatas">Terbatas</option>
                                    {canPublish ? <option value="publik">Publik</option> : null}
                                  </select>
                                  <textarea name="description" rows={2} maxLength={4000} defaultValue={document.description ?? ""} className="sb-input !h-auto resize-y py-1.5 text-[10px]" placeholder="Keterangan" aria-label="Keterangan" />
                                  <button type="submit" className="sb-btn sb-btn-outline !h-7 !w-full !px-2 text-[10px]">Simpan metadata draf</button>
                                </form>
                              ) : null}

                              <form action={uploadSecretariatDocumentRevision} className="space-y-1.5">
                                <input type="hidden" name="document_id" value={document.id} />
                                <input type="file" name="document_file" required accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.pptx" className="sb-input !h-auto py-1.5 text-[9.5px]" aria-label="Unggah revisi dokumen" />
                                <button type="submit" className="sb-btn sb-btn-outline !h-7 !w-full !px-2 text-[10px]">Unggah revisi berkas</button>
                              </form>
                              {document.status === "draft" ? (
                                <form action={finalizeSecretariatDocument}>
                                  <input type="hidden" name="document_id" value={document.id} />
                                  <button type="submit" disabled={(!document.file_name && !document.has_generated_content) ||
                                    (document.visibility === "publik" && (!document.file_name || !canPublish))} className="sb-btn sb-btn-primary !h-7 !w-full !px-2 text-[10px]">
                                    Finalkan dokumen
                                  </button>
                                </form>
                              ) : null}
                              <form action={archiveSecretariatDocument}>
                                <input type="hidden" name="document_id" value={document.id} />
                                <button type="submit" className="sb-btn sb-btn-ghost !h-7 !w-full !px-2 text-[10px]">Pindahkan ke arsip</button>
                              </form>
                            </div>
                          ) : (
                            <span className="text-[10.5px] text-muted2">Arsip dikunci</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 xl:hidden">
                {documents.map((document) => (
                  <article key={document.id} className="rounded-[11px] border border-line bg-white p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[9.5px] text-muted2">{document.reference_no}</div>
                        <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{document.title}</h3>
                        <p className="mt-1 text-[10.5px] text-muted">{document.number ?? "Nomor resmi belum dicatat"} · {document.owner_label}</p>
                      </div>
                      <Badge tone={document.status === "final" ? "success" : document.status === "draft" ? "warning" : "neutral"}>{statusLabel[document.status]}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="neutral">{document.category}</Badge>
                      <Badge tone={document.visibility === "publik" ? "success" : document.visibility === "terbatas" ? "warning" : "neutral"}>{visibilityLabel[document.visibility]}</Badge>
                      <span className="self-center text-[10px] text-muted2">{dateLabel(document.document_date)}</span>
                    </div>
                    <div className="mt-2 space-y-1.5 border-t border-line pt-2">
                      {document.file_name ? (
                        <Link href={`/api/secretariat/documents/${document.id}/file`} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary-700">
                          <Download size={12} /> {document.file_name} · rev {document.file_revision} · {sizeLabel(document.size_bytes)}
                        </Link>
                      ) : null}
                      {document.has_generated_content ? (
                        <Link href={`/app/sekretariat/dokumen/${document.id}/cetak`} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary-700">
                          <FileText size={12} /> Buka isi & cetak · rev {document.generated_revision}
                        </Link>
                      ) : null}
                      {!document.file_name && !document.has_generated_content ? <span className="text-[10.5px] text-muted2">Belum ada isi atau berkas</span> : null}
                    </div>
                    {canWrite && document.status !== "arsip" ? (
                      <div className="mt-3 space-y-2 border-t border-line pt-3">
                        {document.status === "draft" ? (
                          <form action={updateSecretariatDocument} className="grid gap-2">
                            <input type="hidden" name="document_id" value={document.id} />
                            <input name="title" required maxLength={300} defaultValue={document.title} className="sb-input !h-9 text-[11px]" aria-label="Judul dokumen" />
                            <div className="grid grid-cols-2 gap-2">
                              <input name="number" maxLength={100} defaultValue={document.number ?? ""} className="sb-input !h-9 text-[10.5px]" placeholder="Nomor" aria-label="Nomor dokumen" />
                              <select name="category" defaultValue={document.category} className="sb-input !h-9 text-[10.5px]" aria-label="Kategori">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input name="document_date" type="date" required defaultValue={document.document_date} className="sb-input !h-9 text-[10.5px]" aria-label="Tanggal" />
                              <input name="owner_label" required maxLength={160} defaultValue={document.owner_label} className="sb-input !h-9 text-[10.5px]" aria-label="Pemilik dokumen" />
                            </div>
                            <select name="visibility" defaultValue={document.visibility} className="sb-input !h-9 text-[10.5px]" aria-label="Klasifikasi">
                              <option value="internal">Internal</option><option value="terbatas">Terbatas</option>{canPublish ? <option value="publik">Publik</option> : null}
                            </select>
                            <textarea name="description" rows={2} maxLength={4000} defaultValue={document.description ?? ""} className="sb-input !h-auto resize-y py-2 text-[10.5px]" placeholder="Keterangan" aria-label="Keterangan" />
                            <button type="submit" className="sb-btn sb-btn-outline !h-9 !w-full text-[10.5px]">Simpan metadata draf</button>
                          </form>
                        ) : null}
                        <form action={uploadSecretariatDocumentRevision} className="flex flex-wrap gap-2">
                          <input type="hidden" name="document_id" value={document.id} />
                          <input type="file" name="document_file" required accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.pptx" className="sb-input min-w-0 flex-1 !h-auto py-2 text-[9.5px]" aria-label="Unggah revisi berkas" />
                          <button type="submit" className="sb-btn sb-btn-outline !h-9 !px-3 text-[10px]">Unggah</button>
                        </form>
                        {document.status === "draft" ? (
                          <form action={finalizeSecretariatDocument}>
                            <input type="hidden" name="document_id" value={document.id} />
                            <button type="submit" disabled={(!document.file_name && !document.has_generated_content) ||
                                    (document.visibility === "publik" && (!document.file_name || !canPublish))} className="sb-btn sb-btn-primary !h-9 !w-full text-[10.5px]">Finalkan dokumen</button>
                          </form>
                        ) : null}
                        <form action={archiveSecretariatDocument}>
                          <input type="hidden" name="document_id" value={document.id} />
                          <button type="submit" className="sb-btn sb-btn-ghost !h-9 !w-full text-[10.5px]">Pindahkan ke arsip</button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <FileText size={28} className="mx-auto text-muted2" />
              <h2 className="mt-3 text-[14px] font-semibold text-ink">{showArchived ? "Arsip kosong" : "Belum ada dokumen"}</h2>
              <p className="mt-1 text-[11.5px] text-muted">{showArchived ? "Dokumen yang diarsipkan akan tampil di sini." : "Registrasikan dokumen organisasi untuk mulai membangun Buku Arsip."}</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Akses, berkas, dan revisi">
          Konten hasil generator disimpan sebagai revisi yang tidak dapat ditimpa. Dokumen internal atau
          terbatas dapat difinalkan setelah isi diperiksa. Dokumen publik memerlukan berkas final yang
          diunggah sebelum dapat difinalkan dan dipublikasikan. Mengunggah berkas atau membuat revisi isi
          membuka draf kembali untuk pemeriksaan ulang. Dokumen tidak dihapus, tetapi dipindahkan ke arsip.
        </Notice>
      </div>
    </div>
  );
}
