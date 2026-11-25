import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FilePlus2, Save, ArrowLeft, FileText } from "lucide-react";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { saveGeneratedSecretariatDocument } from "@/app/actions/secretariat-documents";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { getSecretariatTemplate, type GeneratedDocumentContent } from "@/lib/secretariat-templates";

export const metadata: Metadata = { title: "Generator Dokumen Sekretariat" };

interface OrganizationRow {
  legal_name: string;
  short_name: string;
  address: string | null;
  timezone: string;
}

interface ExistingDocumentRow {
  id: string;
  title: string;
  number: string | null;
  document_date: string;
  owner_label: string;
  visibility: "internal" | "terbatas";
  status: "draft" | "final";
  content_json: GeneratedDocumentContent;
  revision_no: number;
}

function dateToday(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default async function SecretariatTemplateBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ document_id?: string; result?: string }>;
}) {
  const identity = await requireIdentity("secretariat:documents:write");
  const { code } = await params;
  const search = await searchParams;
  const template = getSecretariatTemplate(code);
  if (!template) notFound();

  const sql = getV9Sql();
  const organizationResult = await sql`
    SELECT legal_name, short_name, address, timezone
    FROM v9.organizations
    WHERE id = ${identity.organizationId}
      AND status = 'active'
    LIMIT 1
  `;
  const organization = rowsFromResult<OrganizationRow>(organizationResult)[0];
  if (!organization) redirect("/app");

  let existing: ExistingDocumentRow | undefined;
  if (search?.document_id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search.document_id)) {
      notFound();
    }
    const result = await sql`
      SELECT
        document.id::text AS id,
        document.title,
        document.number,
        document.document_date::text AS document_date,
        document.owner_label,
        document.visibility,
        document.status,
        generation.content_json,
        generation.revision_no
      FROM v9.secretariat_documents AS document
      INNER JOIN LATERAL (
        SELECT content_json, revision_no, template_code
        FROM v9.secretariat_document_generations
        WHERE document_id = document.id
        ORDER BY revision_no DESC
        LIMIT 1
      ) AS generation ON generation.template_code = ${template.code}
      WHERE document.id = ${search.document_id}
        AND document.organization_id = ${identity.organizationId}
        AND document.status <> 'arsip'
        AND document.visibility <> 'publik'
      LIMIT 1
    `;
    existing = rowsFromResult<ExistingDocumentRow>(result)[0];
    if (!existing) notFound();
    if (existing.visibility === "terbatas" &&
        !["platform_admin", "organization_admin", "chair", "secretary"].includes(identity.roleKey)) {
      notFound();
    }
  }

  const contentJson = existing?.content_json;
  const initialValues = new Map<string, string>();
  for (const group of contentJson?.groups ?? []) {
    for (const field of group.fields) initialValues.set(field.key, field.value);
  }

  const resultNotices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    invalid: { tone: "danger", text: "Periksa kembali kolom wajib dan format tanggal." },
    duplicate: { tone: "danger", text: "Nomor surat resmi tersebut sudah terdaftar pada organisasi." },
    "too-long": { tone: "warning", text: "Isi dokumen terlalu panjang. Ringkas keterangan sebelum disimpan." },
    error: { tone: "danger", text: "Dokumen belum berhasil disimpan. Tidak ada perubahan yang dinyatakan berhasil." },
    unavailable: { tone: "warning", text: "Register dokumen tidak tersedia atau catatan sudah berubah." },
  };
  const resultNotice = search?.result ? resultNotices[search.result] : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat · Generator"
        title={existing ? "Revisi isi dokumen" : template.name}
        description={existing
          ? `Revisi ${existing.revision_no} menjadi versi baru. Versi lama tetap tersimpan sebagai riwayat dan dokumen kembali ke draf untuk diperiksa.`
          : template.purpose}
        actions={
          <Link href="/app/sekretariat/template" className="sb-btn sb-btn-outline">
            <ArrowLeft size={14} /> Daftar template
          </Link>
        }
      />
      {resultNotice ? (
        <div className="mb-4">
          <Notice tone={resultNotice.tone} title="Generator dokumen">{resultNotice.text}</Notice>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="info">{template.code}</Badge>
        <Badge tone="neutral">Kategori register: {template.category}</Badge>
        <Badge tone="neutral">{existing ? `Dokumen ${existing.revision_no} · ${existing.status === "final" ? "Final" : "Draf"}` : "Nomor referensi dibuat oleh register"}</Badge>
      </div>

      <Card>
        <CardHeader
          title="Identitas dokumen"
          subtitle="Nomor resmi tidak dibuat otomatis. Kosongkan jika belum ditetapkan oleh organisasi."
        />
        <form action={saveGeneratedSecretariatDocument} className="space-y-5 p-4">
          <input type="hidden" name="template_code" value={template.code} />
          {existing ? <input type="hidden" name="document_id" value={existing.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="generated-document-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Judul dokumen <span className="text-danger">*</span></label>
              <input
                id="generated-document-title"
                name="document_title"
                required
                minLength={3}
                maxLength={300}
                defaultValue={existing?.title ?? (template.code === "TPL-UND" ? "Undangan Rapat" : template.name)}
                className="sb-input"
                placeholder="Masukkan judul dokumen"
              />
            </div>
            <div>
              <label htmlFor="generated-document-number" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nomor resmi (opsional)</label>
              <input
                id="generated-document-number"
                name="number"
                maxLength={100}
                defaultValue={existing?.number ?? ""}
                className="sb-input"
                placeholder="Diisi sesuai keputusan penomoran"
              />
            </div>
            <div>
              <label htmlFor="generated-document-date" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal dokumen <span className="text-danger">*</span></label>
              <input
                id="generated-document-date"
                name="document_date"
                type="date"
                required
                defaultValue={existing?.document_date ?? dateToday(organization.timezone)}
                className="sb-input"
              />
            </div>
            <div>
              <label htmlFor="generated-document-owner" className="mb-1 block text-[11.5px] font-semibold text-ink2">Penanggung jawab / penyusun <span className="text-danger">*</span></label>
              <input
                id="generated-document-owner"
                name="owner_label"
                required
                minLength={2}
                maxLength={160}
                defaultValue={existing?.owner_label ?? identity.name}
                className="sb-input"
              />
            </div>
            <div>
              <label htmlFor="generated-document-visibility" className="mb-1 block text-[11.5px] font-semibold text-ink2">Klasifikasi akses</label>
              <select
                id="generated-document-visibility"
                name="visibility"
                defaultValue={existing?.visibility ?? "internal"}
                className="sb-input"
              >
                <option value="internal">Internal organisasi</option>
                <option value="terbatas">Terbatas untuk pengurus berwenang</option>
              </select>
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <div className="mb-4 flex items-start gap-2">
              <FileText size={17} className="mt-0.5 text-primary-700" />
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Isi {template.name.toLowerCase()}</h2>
                <p className="mt-0.5 text-[10.5px] text-muted">Isi setiap bagian berdasarkan keputusan, data, dan keterangan yang sudah diverifikasi.</p>
              </div>
            </div>
            <div className="space-y-5">
              {template.sections.map((section, sectionIndex) => (
                <section key={section.title}>
                  <h3 className="mb-3 border-b border-line pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink2">
                    {sectionIndex + 1}. {section.title}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {section.fields.map((key) => {
                      const field = template.fields.find((candidate) => candidate.key === key);
                      if (!field) return null;
                      const id = `generated-${template.code}-${field.key}`;
                      const defaultValue = initialValues.get(field.key) ?? "";
                      return (
                        <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                          <label htmlFor={id} className="mb-1 block text-[11px] font-semibold text-ink2">
                            {field.label} {field.required ? <span className="text-danger">*</span> : <span className="font-normal text-muted2">(opsional)</span>}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              id={id}
                              name={`field_${field.key}`}
                              required={field.required}
                              maxLength={field.maxLength}
                              rows={field.rows ?? 3}
                              defaultValue={defaultValue}
                              placeholder={field.placeholder}
                              className="sb-input !h-auto resize-y py-2.5"
                            />
                          ) : (
                            <input
                              id={id}
                              name={`field_${field.key}`}
                              type={field.type}
                              required={field.required}
                              maxLength={field.type === "date" ? undefined : field.maxLength}
                              defaultValue={defaultValue}
                              placeholder={field.placeholder}
                              className="sb-input"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10.5px] leading-relaxed text-muted2">
              Penyimpanan membuat draf pada Register Dokumen. Isi revisi sebelumnya tidak dihapus.
            </p>
            <button type="submit" className="sb-btn sb-btn-primary shrink-0">
              {existing ? <Save size={14} /> : <FilePlus2 size={14} />}
              {existing ? "Simpan revisi isi" : "Buat draf dokumen"}
            </button>
          </div>
        </form>
      </Card>

      <div className="mt-4">
        <Notice tone="warning" title="Pemeriksaan sebelum finalisasi">
          Template ini merupakan alat bantu penyusunan, bukan pengesahan keputusan atau pengganti AD/ART.
          Pastikan isi, dasar keputusan, nomor resmi, tanggal, serta kewenangan penandatangan sudah diperiksa
          sebelum dokumen difinalkan.
        </Notice>
      </div>
    </div>
  );
}
