import Link from "next/link";
import type { Metadata } from "next";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Struktur & SK" };

interface OrganizationRow {
  legal_name: string;
  short_name: string;
  status: string;
  legal_status: string | null;
}

interface DocumentRow {
  id: string;
  reference_no: string;
  number: string | null;
  title: string;
  document_date: string;
  owner_label: string;
  visibility: string;
  status: string;
}

interface FieldRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  is_enabled: boolean;
  mandate: string | null;
}

interface SummaryRow {
  sk_count: number;
  final_count: number;
  total_count: number;
}

interface DecisionMeetingRow {
  id: string;
  reference_no: string;
  title: string;
  meeting_date: string;
  minutes_status: string | null;
  decision_count: number;
}

export default async function SKPage() {
  const identity = await requireIdentity("secretariat:read");
  let organization: OrganizationRow | null = null;
  let documents: DocumentRow[] = [];
  let fields: FieldRow[] = [];
  let summary: SummaryRow | null = null;
  let decisionMeetings: DecisionMeetingRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [organizationResult, documentResult, fieldResult, summaryResult, meetingResult] = await Promise.all([
      sql`
        SELECT legal_name, short_name, status, legal_status
        FROM v9.organizations
        WHERE id = ${identity.organizationId}
        LIMIT 1
      `,
      sql`
        SELECT
          document.id::text AS id,
          document.reference_no,
          document.number,
          document.title,
          document.document_date::text AS document_date,
          document.owner_label,
          document.visibility,
          document.status
        FROM v9.secretariat_documents AS document
        WHERE document.organization_id = ${identity.organizationId}
          AND lower(document.category) = 'sk'
        ORDER BY document.document_date DESC, document.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT
          application.field_key,
          application.name,
          application.short_name,
          application.route,
          application.is_enabled,
          application.mandate
        FROM v9.field_applications AS application
        WHERE application.organization_id = ${identity.organizationId}
        ORDER BY application.display_order, application.name
      `,
      sql`
        SELECT
          count(*) FILTER (WHERE lower(category) = 'sk')::int AS sk_count,
          count(*) FILTER (WHERE status = 'final')::int AS final_count,
          count(*)::int AS total_count
        FROM v9.secretariat_documents
        WHERE organization_id = ${identity.organizationId}
      `,
      sql`
        SELECT
          meeting.id::text AS id,
          meeting.reference_no,
          meeting.title,
          meeting.meeting_date::text AS meeting_date,
          latest_minutes.status AS minutes_status,
          COALESCE(decision_count.count, 0)::int AS decision_count
        FROM v9.secretariat_meetings AS meeting
        LEFT JOIN LATERAL (
          SELECT minutes.id, minutes.status
          FROM v9.secretariat_minutes AS minutes
          WHERE minutes.meeting_id = meeting.id
          ORDER BY minutes.revision_no DESC
          LIMIT 1
        ) AS latest_minutes ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS count
          FROM v9.secretariat_meeting_decisions AS decision
          WHERE decision.minutes_id = latest_minutes.id
        ) AS decision_count ON true
        WHERE meeting.organization_id = ${identity.organizationId}
          AND meeting.status = 'completed'
          AND latest_minutes.status = 'final'
          AND COALESCE(decision_count.count, 0) > 0
        ORDER BY meeting.meeting_date DESC, meeting.created_at DESC
        LIMIT 20
      `,
    ]);

    organization = rowsFromResult<OrganizationRow>(organizationResult)[0] ?? null;
    documents = rowsFromResult<DocumentRow>(documentResult);
    fields = rowsFromResult<FieldRow>(fieldResult);
    summary = rowsFromResult<SummaryRow>(summaryResult)[0] ?? null;
    decisionMeetings = rowsFromResult<DecisionMeetingRow>(meetingResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[secretariat-sk] Source unavailable", reason instanceof Error ? reason.name : "UnknownError");
  }

  const legalStatus = organization?.legal_status?.trim() || "Belum tercatat dalam registry organisasi";
  const activeFields = fields.filter((field) => field.is_enabled);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Struktur & surat keputusan"
        description="Register SK, identitas organisasi, bidang terdaftar, dan keputusan rapat yang telah difinalkan."
        actions={<Link href="/app/pengurus/struktur" className="sb-btn sb-btn-outline">Susunan pengurus</Link>}
      />

      {unavailable ? (
        <Notice tone="danger" title="Register belum dapat dimuat">
          Informasi SK dan struktur tidak ditampilkan sebagai data kosong. Periksa koneksi layanan data lalu coba kembali.
        </Notice>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="SK tercatat" value={String(summary?.sk_count ?? 0)} note="Register dokumen kategori SK" />
            <StatCard label="Dokumen final" value={String(summary?.final_count ?? 0)} note={String(summary?.total_count ?? 0) + " dokumen di register"} tone="success" />
            <StatCard label="Bidang diaktifkan" value={String(activeFields.length)} note="Berdasarkan field_applications" tone="info" href="/app/pengurus/pengaturan" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
            <Card>
              <CardHeader title="Surat keputusan" subtitle="Dokumen kategori SK yang tercatat pada Sekretariat" />
              {documents.length ? (
                <ul className="divide-y divide-line">
                  {documents.map((document) => (
                    <li key={document.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-ink">{document.title}</div>
                          <div className="mt-0.5 font-mono text-[10.5px] text-muted2">
                            {document.number ?? document.reference_no}
                          </div>
                        </div>
                        <Badge tone={document.visibility === "publik" ? "success" : "info"}>{document.visibility}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                        <span>{formatDateID(document.document_date, "long")}</span>
                        <span>·</span>
                        <span>Pemilik {document.owner_label}</span>
                        <span>·</span>
                        <StatusBadge status={document.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4">
                  <EmptyState title="Belum ada SK tercatat" body="Dokumen akan muncul setelah Sekretariat meregistrasi SK pada arsip organisasi." />
                </div>
              )}
              <div className="border-t border-line px-4 py-2.5">
                <Link href="/app/sekretariat/dokumen" className="text-[11.5px] font-semibold text-primary-700">Buka register dokumen →</Link>
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader title="Identitas organisasi" subtitle="Data dari registry organisasi aktif" />
                <div className="space-y-2 px-4 py-3">
                  <div>
                    <div className="sb-label mb-1">Nama organisasi</div>
                    <div className="text-[13px] font-semibold text-ink">{organization?.legal_name ?? "Belum tercatat"}</div>
                    {organization?.short_name ? <div className="text-[11px] text-muted">{organization.short_name}</div> : null}
                  </div>
                  <div>
                    <div className="sb-label mb-1">Status badan hukum</div>
                    <div className="text-[12.5px] text-ink2">{legalStatus}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="sb-label">Status registry</span>
                    <StatusBadge status={organization?.status ?? "Tidak tersedia"} />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Bidang terdaftar" subtitle="Unit dan aplikasi bidang organisasi" />
                {activeFields.length ? (
                  <ul className="divide-y divide-line">
                    {activeFields.map((field) => (
                      <li key={field.field_key} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[12.5px] font-medium text-ink">{field.short_name || field.name}</div>
                          <Badge tone="success">Aktif</Badge>
                        </div>
                        {field.mandate ? <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{field.mandate}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4"><EmptyState title="Belum ada bidang aktif" body="Status bidang mengikuti registry organisasi." /></div>
                )}
              </Card>
            </div>
          </div>

          <div className="mt-5">
            <Card>
              <CardHeader
                title="Rapat penetapan"
                subtitle="Rapat selesai dengan notulen final dan keputusan tercatat"
                action={<Link href="/app/sekretariat/rapat" className="text-[11.5px] font-semibold text-primary-700">Rapat →</Link>}
              />
              {decisionMeetings.length ? (
                <ul className="divide-y divide-line">
                  {decisionMeetings.map((meeting) => (
                    <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-ink">{meeting.title}</div>
                        <div className="text-[10.5px] text-muted2">{meeting.reference_no} · {formatDateID(meeting.meeting_date, "short")}</div>
                      </div>
                      <Badge tone="success">{meeting.decision_count} keputusan</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4">
                  <EmptyState title="Belum ada keputusan rapat final" body="Keputusan akan muncul setelah notulen rapat difinalkan dan butir keputusan diregistrasi." />
                </div>
              )}
            </Card>
          </div>

          <div className="mt-5">
            <Notice tone="info" title="Status kelembagaan mengikuti dokumen yang tercatat">
              {legalStatus}. Halaman ini tidak menetapkan atau menyimpulkan status hukum organisasi di luar data dan dokumen resmi yang diregistrasi.
            </Notice>
          </div>
        </>
      )}
    </div>
  );
}
