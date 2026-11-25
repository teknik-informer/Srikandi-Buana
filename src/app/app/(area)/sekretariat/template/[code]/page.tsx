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
  source_meeting_id: string | null;
  source_minutes_id: string | null;
  source_letter_id: string | null;
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
  searchParams?: Promise<{
    document_id?: string;
    source_meeting_id?: string;
    source_minutes_id?: string;
    source_letter_id?: string;
    result?: string;
  }>;
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
        document.source_meeting_id::text AS source_meeting_id,
        document.source_minutes_id::text AS source_minutes_id,
        document.source_letter_id::text AS source_letter_id,
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


  const requestedSources = [
    search?.source_meeting_id ?? "",
    search?.source_minutes_id ?? "",
    search?.source_letter_id ?? "",
  ].filter(Boolean);
  const validSourceUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (requestedSources.length > 1 || requestedSources.some((value) => !validSourceUuid(value))) notFound();

  const sourceMeetingId = existing?.source_meeting_id ?? search?.source_meeting_id ?? "";
  const sourceMinutesId = existing?.source_minutes_id ?? search?.source_minutes_id ?? "";
  const sourceLetterId = existing?.source_letter_id ?? search?.source_letter_id ?? "";
  const sourceCount = [sourceMeetingId, sourceMinutesId, sourceLetterId].filter(Boolean).length;
  if (sourceCount > 1 ||
      (sourceMeetingId && template.code !== "TPL-UND") ||
      (sourceMinutesId && template.code !== "TPL-NOT") ||
      (sourceLetterId && template.code !== "TPL-KEL")) notFound();
  if (existing && (
    (search?.source_meeting_id && search.source_meeting_id !== existing.source_meeting_id) ||
    (search?.source_minutes_id && search.source_minutes_id !== existing.source_minutes_id) ||
    (search?.source_letter_id && search.source_letter_id !== existing.source_letter_id)
  )) notFound();

  const sourceValues = new Map<string, string>();
  let sourceLabel = "";
  let sourceReference = "";
  let sourceTitle = "";
  let sourceNumber = "";
  let sourceDate = "";
  let sourceOwner = "";
  let linkedDocumentId: string | null = null;

  const attendanceLabels = {
    hadir: "Hadir",
    izin: "Izin",
    sakit: "Sakit",
    alpa: "Tanpa keterangan",
  } as const;
  const decisionStatusLabels = {
    open: "Terbuka",
    in_progress: "Berjalan",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  } as const;

  if (sourceMeetingId) {
    const sourceResult = await sql`
      SELECT
        meeting.id::text AS id,
        meeting.reference_no,
        meeting.title,
        meeting.meeting_date::text AS meeting_date,
        meeting.time_label,
        meeting.location,
        meeting.description,
        linked.id::text AS document_id
      FROM v9.secretariat_meetings AS meeting
      LEFT JOIN LATERAL (
        SELECT document.id
        FROM v9.secretariat_documents AS document
        WHERE document.organization_id = meeting.organization_id
          AND document.source_meeting_id = meeting.id
          AND document.status <> 'arsip'
        ORDER BY document.created_at DESC
        LIMIT 1
      ) AS linked ON true
      WHERE meeting.id = ${sourceMeetingId}
        AND meeting.organization_id = ${identity.organizationId}
        AND meeting.status <> 'cancelled'
      LIMIT 1
    `;
    const source = rowsFromResult<{
      id: string; reference_no: string; title: string; meeting_date: string;
      time_label: string | null; location: string | null; description: string | null;
      document_id: string | null;
    }>(sourceResult)[0];
    if (!source) notFound();
    linkedDocumentId = source.document_id;
    sourceLabel = "Agenda rapat terhubung";
    sourceReference = source.reference_no;
    sourceTitle = ("Undangan Rapat — " + source.title).slice(0, 300);
    sourceValues.set("perihal", ("Undangan " + source.title).slice(0, 240));
    sourceValues.set("nama_agenda", source.title);
    sourceValues.set("hari_tanggal", source.meeting_date);
    sourceValues.set("waktu", source.time_label ?? "");
    sourceValues.set("tempat", source.location ?? "");
    sourceValues.set("agenda_pembahasan", source.description ?? "");
  }

  if (sourceMinutesId) {
    const sourceResult = await sql`
      SELECT
        minutes.id::text AS minutes_id,
        minutes.revision_no,
        minutes.opening_notes,
        minutes.discussion_notes,
        minutes.closing_notes,
        minutes.prepared_by_label,
        meeting.id::text AS id,
        meeting.reference_no,
        meeting.title,
        meeting.meeting_date::text AS meeting_date,
        meeting.time_label,
        meeting.location,
        meeting.description,
        linked.id::text AS document_id
      FROM v9.secretariat_minutes AS minutes
      INNER JOIN v9.secretariat_meetings AS meeting ON meeting.id = minutes.meeting_id
      LEFT JOIN LATERAL (
        SELECT document.id
        FROM v9.secretariat_documents AS document
        WHERE document.organization_id = meeting.organization_id
          AND document.source_minutes_id = minutes.id
          AND document.status <> 'arsip'
        ORDER BY document.created_at DESC
        LIMIT 1
      ) AS linked ON true
      WHERE minutes.id = ${sourceMinutesId}
        AND meeting.organization_id = ${identity.organizationId}
        AND meeting.status <> 'cancelled'
      LIMIT 1
    `;
    const source = rowsFromResult<{
      minutes_id: string; revision_no: number; opening_notes: string | null;
      discussion_notes: string | null; closing_notes: string | null; prepared_by_label: string | null;
      id: string; reference_no: string; title: string; meeting_date: string;
      time_label: string | null; location: string | null; description: string | null;
      document_id: string | null;
    }>(sourceResult)[0];
    if (!source) notFound();
    linkedDocumentId = source.document_id;
    sourceLabel = "Notulen dan daftar hadir terhubung";
    sourceReference = source.reference_no + " · revisi notulen " + source.revision_no;
    sourceTitle = ("Notulen Rapat — " + source.title).slice(0, 300);
    sourceDate = source.meeting_date;
    sourceOwner = source.prepared_by_label ?? "";
    sourceValues.set("nama_rapat", source.title);
    sourceValues.set("tanggal_rapat", source.meeting_date);
    sourceValues.set("waktu_rapat", source.time_label ?? "");
    sourceValues.set("tempat_rapat", source.location ?? "");
    sourceValues.set("notulis", source.prepared_by_label ?? "");
    sourceValues.set("agenda", source.description ?? "");

    const [decisionResult, attendanceResult] = await Promise.all([
      sql`
        SELECT order_no, decision_text, responsible_label, due_date::text AS due_date, status
        FROM v9.secretariat_meeting_decisions
        WHERE minutes_id = ${source.minutes_id}
        ORDER BY order_no
      `,
      sql`
        SELECT attendance.display_name, attendance.role_label,
          attendance.attendance_status, attendance.signature_recorded
        FROM v9.secretariat_meeting_attendance AS attendance
        INNER JOIN v9.secretariat_meetings AS meeting ON meeting.id = attendance.meeting_id
        WHERE meeting.id = ${source.id}
          AND meeting.organization_id = ${identity.organizationId}
        ORDER BY
          CASE attendance.attendance_status
            WHEN 'hadir' THEN 1 WHEN 'izin' THEN 2 WHEN 'sakit' THEN 3 ELSE 4
          END,
          attendance.display_name
      `,
    ]);
    const decisions = rowsFromResult<{
      order_no: number; decision_text: string; responsible_label: string | null;
      due_date: string | null; status: keyof typeof decisionStatusLabels;
    }>(decisionResult);
    const attendees = rowsFromResult<{
      display_name: string; role_label: string | null;
      attendance_status: keyof typeof attendanceLabels; signature_recorded: boolean;
    }>(attendanceResult);
    const discussion = [
      source.opening_notes ? "Pembukaan:\n" + source.opening_notes : "",
      source.discussion_notes ? "Pokok pembahasan:\n" + source.discussion_notes : "",
      source.closing_notes ? "Penutup:\n" + source.closing_notes : "",
    ].filter(Boolean).join("\n\n");
    const decisionText = decisions.map((item) => item.order_no + ". " + item.decision_text).join("\n");
    const followUpText = decisions
      .filter((item) => item.responsible_label || item.due_date)
      .map((item) => {
        const details = [
          item.responsible_label ? "PIC: " + item.responsible_label : "",
          item.due_date ? "Tenggat: " + item.due_date : "",
          "Status: " + decisionStatusLabels[item.status],
        ].filter(Boolean).join(" · ");
        return item.order_no + ". " + item.decision_text + "\n   " + details;
      }).join("\n");
    const attendanceText = attendees.map((item, index) => {
      const role = item.role_label ? " · " + item.role_label : "";
      const signature = item.signature_recorded ? " · tanda tangan fisik diperiksa" : "";
      return (index + 1) + ". " + item.display_name + " — " +
        attendanceLabels[item.attendance_status] + role + signature;
    }).join("\n");
    sourceValues.set("peserta", attendanceText);
    sourceValues.set("pembahasan", discussion);
    sourceValues.set("keputusan", decisionText);
    sourceValues.set("tindak_lanjut", followUpText);
  }

  if (sourceLetterId) {
    const sourceResult = await sql`
      SELECT
        letter.id::text AS id,
        letter.reference_no,
        letter.number,
        letter.subject,
        letter.counterpart,
        letter.letter_date::text AS letter_date,
        letter.assignee_label,
        linked.id::text AS document_id
      FROM v9.secretariat_letters AS letter
      LEFT JOIN LATERAL (
        SELECT document.id
        FROM v9.secretariat_documents AS document
        WHERE document.organization_id = letter.organization_id
          AND document.source_letter_id = letter.id
          AND document.status <> 'arsip'
        ORDER BY document.created_at DESC
        LIMIT 1
      ) AS linked ON true
      WHERE letter.id = ${sourceLetterId}
        AND letter.organization_id = ${identity.organizationId}
        AND letter.direction = 'keluar'
      LIMIT 1
    `;
    const source = rowsFromResult<{
      id: string; reference_no: string; number: string | null; subject: string;
      counterpart: string; letter_date: string; assignee_label: string; document_id: string | null;
    }>(sourceResult)[0];
    if (!source) notFound();
    linkedDocumentId = source.document_id;
    sourceLabel = "Register surat keluar terhubung";
    sourceReference = source.reference_no;
    sourceTitle = source.subject;
    sourceNumber = source.number ?? "";
    sourceDate = source.letter_date;
    sourceOwner = source.assignee_label;
    sourceValues.set("tujuan", source.counterpart);
    sourceValues.set("perihal", source.subject);
  }

  if (existing && linkedDocumentId && existing.id !== linkedDocumentId) notFound();
  if (!existing && linkedDocumentId) {
    redirect("/app/sekretariat/template/" + template.code + "?document_id=" +
      linkedDocumentId + "&" +
      (sourceMeetingId ? "source_meeting_id=" + sourceMeetingId :
        sourceMinutesId ? "source_minutes_id=" + sourceMinutesId :
          "source_letter_id=" + sourceLetterId));
  }
  if (existing && (
    existing.source_meeting_id !== (sourceMeetingId || null) ||
    existing.source_minutes_id !== (sourceMinutesId || null) ||
    existing.source_letter_id !== (sourceLetterId || null)
  )) notFound();

  const contentJson = existing?.content_json;
  const initialValues = new Map<string, string>();
  for (const group of contentJson?.groups ?? []) {
    for (const field of group.fields) initialValues.set(field.key, field.value);
  }
  for (const [key, value] of sourceValues) {
    if (!initialValues.has(key)) initialValues.set(key, value);
  }

  const resultNotices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    invalid: { tone: "danger", text: "Periksa kembali kolom wajib dan format tanggal." },
    duplicate: { tone: "danger", text: "Nomor surat resmi tersebut sudah terdaftar pada organisasi." },
    "too-long": { tone: "warning", text: "Isi dokumen terlalu panjang. Ringkas keterangan sebelum disimpan." },
    error: { tone: "danger", text: "Dokumen belum berhasil disimpan. Tidak ada perubahan yang dinyatakan berhasil." },
    unavailable: { tone: "warning", text: "Register dokumen tidak tersedia atau catatan sudah berubah." },
    "source-invalid": { tone: "danger", text: "Sumber dokumen tidak ditemukan, tidak sesuai organisasi, atau tidak cocok dengan jenis template." },
  };
  const resultNotice = search?.result ? resultNotices[search.result] : undefined;
  const documentTitle = existing?.title ?? sourceTitle ??
    (template.code === "TPL-UND" ? "Undangan Rapat" : template.name);
  const documentNumber = existing?.number ?? sourceNumber;
  const documentDate = existing?.document_date ?? sourceDate ?? dateToday(organization.timezone);
  const documentOwner = existing?.owner_label ?? sourceOwner ?? identity.name;

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

      {sourceLabel ? (
        <div className="mb-4">
          <Notice tone="info" title={sourceLabel}>
            Data yang tersedia dimuat dari catatan operasional organisasi. Kolom yang belum memiliki
            data tetap harus dilengkapi berdasarkan fakta yang telah diverifikasi.
          </Notice>
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Identitas dokumen"
          subtitle="Nomor resmi tidak dibuat otomatis. Kosongkan jika belum ditetapkan oleh organisasi."
        />
        <form action={saveGeneratedSecretariatDocument} className="space-y-5 p-4">
          <input type="hidden" name="template_code" value={template.code} />
          {existing ? <input type="hidden" name="document_id" value={existing.id} /> : null}
          {sourceMeetingId ? <input type="hidden" name="source_meeting_id" value={sourceMeetingId} /> : null}
          {sourceMinutesId ? <input type="hidden" name="source_minutes_id" value={sourceMinutesId} /> : null}
          {sourceLetterId ? <input type="hidden" name="source_letter_id" value={sourceLetterId} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="generated-document-title" className="mb-1 block text-[11.5px] font-semibold text-ink2">Judul dokumen <span className="text-danger">*</span></label>
              <input
                id="generated-document-title"
                name="document_title"
                required
                minLength={3}
                maxLength={300}
                defaultValue={documentTitle}
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
                defaultValue={documentNumber}
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
                defaultValue={documentDate}
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
                defaultValue={documentOwner}
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
