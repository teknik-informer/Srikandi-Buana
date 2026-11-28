import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, FileCheck2, FileEdit, LockKeyhole } from "lucide-react";
import { Badge, Card, Notice } from "@/components/ui";
import { DocumentPrintButton } from "@/components/secretariat-document-print-actions";
import { archiveSecretariatDocument, finalizeSecretariatDocument } from "@/app/actions/secretariat-documents";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { formatDateID } from "@/lib/format";
import type { GeneratedDocumentContent } from "@/lib/secretariat-templates";

export const metadata = { title: "Dokumen Hasil Generator" };

interface GeneratedDocumentRow {
  id: string;
  reference_no: string;
  number: string | null;
  title: string;
  document_date: string;
  owner_label: string;
  visibility: "publik" | "internal" | "terbatas";
  status: "draft" | "final";
  template_code: string;
  template_name: string;
  revision_no: number;
  content_json: GeneratedDocumentContent;
  has_file: boolean;
}

function displayValue(value: string, type: string): string {
  if (type !== "date" || !value) return value;
  return formatDateID(value, "long");
}

export default async function SecretariatGeneratedDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const { id } = await params;
  const search = await searchParams;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const sql = getV9Sql();
  const result = await sql`
    SELECT
      document.id::text AS id,
      document.reference_no,
      document.number,
      document.title,
      document.document_date::text AS document_date,
      document.owner_label,
      document.visibility,
      document.status,
      generation.template_code,
      generation.content_json->>'templateName' AS template_name,
      generation.revision_no,
      generation.content_json,
      EXISTS (
        SELECT 1 FROM v9.secretariat_document_files AS file
        WHERE file.document_id = document.id
      ) AS has_file
    FROM v9.secretariat_documents AS document
    INNER JOIN LATERAL (
      SELECT template_code, content_json, revision_no
      FROM v9.secretariat_document_generations
      WHERE document_id = document.id
      ORDER BY revision_no DESC
      LIMIT 1
    ) AS generation ON true
    WHERE document.id = ${id}
      AND document.organization_id = ${identity.organizationId}
      AND document.status <> 'arsip'
    LIMIT 1
  `;
  const document = rowsFromResult<GeneratedDocumentRow>(result)[0];
  if (!document) notFound();

  if (document.visibility === "terbatas" &&
      !["platform_admin", "organization_admin", "chair", "secretary"].includes(identity.roleKey)) {
    notFound();
  }

  const generated = document.content_json;
  const canWrite = can(identity, "secretariat:documents:write");
  const canFinalize = can(identity, "secretariat:documents:write") &&
    (document.visibility !== "publik" || (document.has_file && can(identity, "documents:publish")));
  const notices: Record<string, string> = {
    created: "Draf hasil generator berhasil disimpan. Periksa naskah di bawah, cetak bila diperlukan, lalu finalkan setelah disetujui.",
    revised: "Revisi isi tersimpan sebagai versi baru. Dokumen kembali ke status draf untuk pemeriksaan ulang.",
  };

  return (
    <div className="mx-auto max-w-[1000px] pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/app/sekretariat/dokumen" className="sb-btn sb-btn-outline">
          <ArrowLeft size={14} /> Kembali ke register
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && document.visibility !== "publik" ? (
            <Link
              href={`/app/sekretariat/template/${document.template_code}?document_id=${document.id}`}
              className="sb-btn sb-btn-outline"
            >
              <FileEdit size={14} /> Perbaiki / buat revisi
            </Link>
          ) : null}
          <DocumentPrintButton />
        </div>
      </div>

      {search?.result && notices[search.result] ? (
        <div className="mb-4 print:hidden">
          <Notice tone="success" title="Register dokumen">{notices[search.result]}</Notice>
        </div>
      ) : null}

      {document.status === "draft" ? (
        <div className="mb-4 print:hidden">
          <Notice tone="warning" title="Draf — belum menjadi dokumen final">
            Periksa isi, nomor resmi, tanggal, kewenangan penandatangan, dan bukti pendukung sebelum finalisasi.
            Draf ini belum boleh diperlakukan sebagai keputusan atau surat resmi yang telah disahkan.
          </Notice>
        </div>
      ) : null}
      {document.status === "draft" ? (
        <Card className="mb-4 print:hidden">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="sb-label mb-1">Langkah berikutnya</div>
              <h2 className="text-[13px] font-semibold text-ink">Periksa, koreksi, cetak, lalu finalkan naskah</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
                Bila ada kesalahan redaksi, nomor, tanggal, atau susunan isi, pilih “Perbaiki / buat revisi” di bagian atas. Koreksi disimpan sebagai versi baru; versi sebelumnya tetap tercatat. Cetak atau simpan sebagai PDF setelah isi benar, lalu finalkan setelah disetujui pihak berwenang.
              </p>
            </div>
            {canFinalize ? (
              <form action={finalizeSecretariatDocument} className="shrink-0">
                <input type="hidden" name="document_id" value={document.id} />
                <button type="submit" className="sb-btn sb-btn-primary">
                  <FileCheck2 size={14} /> Finalkan setelah diperiksa
                </button>
              </form>
            ) : (
              <p className="max-w-[220px] text-[10.5px] text-muted">Finalisasi memerlukan kewenangan Sekretariat atau Ketua.</p>
            )}
            {canWrite ? (
              <form action={archiveSecretariatDocument} className="shrink-0">
                <input type="hidden" name="document_id" value={document.id} />
                <button type="submit" className="sb-btn sb-btn-outline">
                  <Archive size={14} /> Pindahkan draf ke arsip
                </button>
              </form>
            ) : null}
          </div>
        </Card>
      ) : null}

      <article id="sb-generated-document-print" className="mx-auto w-full max-w-[210mm] border border-line bg-white px-7 py-9 shadow-sm sm:px-12 sm:py-12 print:max-w-none print:border-0 print:px-0 print:py-0 print:shadow-none">
        {document.status === "draft" ? (
          <div className="mb-5 border-2 border-rose-700 px-3 py-2 text-center text-[12px] font-extrabold uppercase tracking-[0.18em] text-rose-800">
            DRAF — BELUM DISAHKAN
          </div>
        ) : null}
        <header className="border-b-2 border-black pb-4 text-center text-black">
          <h1 className="text-[18px] font-bold uppercase tracking-wide sm:text-[20px]">
            {generated.organization.shortName}
          </h1>
          <p className="mt-1 text-[12px] font-semibold uppercase">{generated.organization.legalName}</p>
          {generated.organization.address ? (
            <p className="mt-1 text-[10px] leading-relaxed">{generated.organization.address}</p>
          ) : null}
        </header>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-2 text-[10px] text-black">
          <div>
            <p>Nomor: {document.number ?? "................................"}</p>
            <p>Lampiran: —</p>
            <p>Perihal: {generated.title}</p>
          </div>
          <div className="text-right">
            <p>{formatDateID(document.document_date, "long")}</p>
            <p className="mt-1 font-mono text-[9px] text-neutral-500">Ref. {document.reference_no}</p>
            {generated.source ? (
              <p className="mt-1 text-[9px] text-neutral-500">
                Sumber operasional: {
                  generated.source.kind === "meeting" ? "Agenda rapat" :
                  generated.source.kind === "minutes" ? "Revisi notulen" :
                  generated.source.kind === "letter" ? "Register surat keluar" :
                  generated.source.kind === "field_activity" ? "Kegiatan bidang" : "Program bidang"
                } · {generated.source.reference ?? "Referensi internal"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-7 text-center text-black">
          <p className="text-[14px] font-bold uppercase underline underline-offset-4">{generated.documentHeading}</p>
          <h2 className="mt-2 text-[13px] font-semibold uppercase">{generated.title}</h2>
          {document.number ? <p className="mt-1 text-[10.5px]">Nomor: {document.number}</p> : null}
        </div>

        <div className="mt-7 space-y-5 text-[11.5px] leading-[1.7] text-black">
          {generated.groups.map((group, index) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[11.5px] font-bold">{group.title}</h3>
              <div className="space-y-2.5">
                {group.fields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "space-y-1" : "grid gap-2 sm:grid-cols-[170px_1fr]"}>
                    <div className="font-semibold">{field.label}</div>
                    <div className="whitespace-pre-wrap break-words">{displayValue(field.value, field.type)}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 flex justify-end text-[11.5px] leading-relaxed text-black">
          <div className="min-w-[210px] text-center">
            <p>{generated.ownerLabel}</p>
            <div className="my-12" />
            <p className="font-semibold underline underline-offset-2">{generated.organization.shortName}</p>
            <p className="mt-1 text-[9px] text-neutral-500">Penanggung jawab / penyusun</p>
          </div>
        </footer>

        <div className="mt-8 border-t border-neutral-300 pt-2 text-[8.5px] text-neutral-500">
          Dokumen tersimpan pada Register Sekretariat · {document.reference_no} · Revisi isi {document.revision_no}
        </div>
      </article>


      {document.visibility === "terbatas" ? (
        <div className="mt-4 print:hidden">
          <Notice tone="warning" title="Dokumen terbatas">
            <LockKeyhole size={13} className="mr-1 inline" /> Dokumen ini hanya dapat dibuka oleh Ketua, Administrator Organisasi, dan Sekretaris.
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
