import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ClipboardList, MapPin, Phone } from "lucide-react";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Pendaftaran & Verifikasi" };

interface QueueSummary {
  submitted_count: number;
  review_count: number;
  approved_count: number;
  rejected_count: number;
}

interface ApplicationRow {
  id: string;
  reference_no: string;
  applicant_name: string;
  phone: string;
  address: string;
  interest_area: string | null;
  experience_level: string | null;
  status: "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

const statusLabel: Record<ApplicationRow["status"], string> = {
  submitted: "Menunggu tinjauan",
  under_review: "Sedang ditinjau",
  approved: "Disetujui untuk pendaftaran",
  rejected: "Ditolak",
  withdrawn: "Ditarik",
};

const interestLabel: Record<string, string> = {
  pertanian: "Budidaya & produksi",
  pelatihan: "Pelatihan & keterampilan",
  usaha: "Usaha & pemasaran",
  organisasi: "Kegiatan organisasi",
};

const experienceLabel: Record<string, string> = {
  baru: "Belum berpengalaman",
  "1-3": "1–3 tahun",
  "4-10": "4–10 tahun",
  "10+": "Lebih dari 10 tahun",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default async function VerifikasiPage() {
  const identity = await requireIdentity("secretariat:read");
  const sql = getV9Sql();
  const [summaryResult, applicationResult] = await Promise.all([
    sql`
      SELECT
        count(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
        count(*) FILTER (WHERE status = 'under_review')::int AS review_count,
        count(*) FILTER (WHERE status = 'approved')::int AS approved_count,
        count(*) FILTER (WHERE status = 'rejected')::int AS rejected_count
      FROM v9.membership_interests
      WHERE organization_id = ${identity.organizationId}
    `,
    sql`
      SELECT
        id::text AS id,
        reference_no,
        applicant_name,
        phone,
        address,
        interest_area,
        experience_level,
        status,
        created_at,
        reviewed_at,
        review_note
      FROM v9.membership_interests
      WHERE organization_id = ${identity.organizationId}
      ORDER BY created_at DESC
      LIMIT 100
    `,
  ]);
  const counts = rowsFromResult<QueueSummary>(summaryResult)[0] ?? {
    submitted_count: 0,
    review_count: 0,
    approved_count: 0,
    rejected_count: 0,
  };
  const rows = rowsFromResult<ApplicationRow>(applicationResult);
  const canReview = can(identity, "field:organisasi:review");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Pendaftaran & verifikasi anggota"
        description="Pemantauan pengajuan minat bergabung dari website. Peninjauan awal dilakukan Bidang Organisasi & Keanggotaan; pengesahan data anggota dan aktivasi dilakukan melalui Buku Induk Sekretariat."
        actions={
          <Link href="/app/sekretariat/anggota?status=menunggu" className="sb-btn sb-btn-outline">
            Buku Induk · Menunggu
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Menunggu tinjauan" value={counts.submitted_count} note="Pengajuan baru" tone="warning" />
        <StatCard label="Sedang ditinjau" value={counts.review_count} note="Dalam proses Bidang Organisasi" tone="info" />
        <StatCard label="Disetujui" value={counts.approved_count} note="Menunggu aktivasi di Buku Induk" tone="success" />
        <StatCard label="Ditolak" value={counts.rejected_count} note="Keputusan tersimpan" tone="neutral" />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Riwayat pengajuan"
            subtitle={`${rows.length} pengajuan terbaru · maksimal 100 catatan ditampilkan`}
            action={<Badge tone="neutral">Database organisasi</Badge>}
          />
          {rows.length ? (
            <div className="divide-y divide-line">
              {rows.map((row) => (
                <article key={row.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[10.5px] text-muted2">{row.reference_no}</div>
                      <h2 className="mt-1 text-[13px] font-semibold text-ink">{row.applicant_name}</h2>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1.5"><Phone size={11} />{row.phone}</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={11} />{formatDate(row.created_at)}</span>
                      </div>
                    </div>
                    <Badge tone={
                      row.status === "approved" ? "success" :
                      row.status === "submitted" || row.status === "under_review" ? "warning" : "neutral"
                    }>
                      {statusLabel[row.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-[11.5px] sm:grid-cols-2">
                    <div className="flex items-start gap-1.5 text-ink2">
                      <MapPin size={12} className="mt-0.5 shrink-0 text-muted" />
                      <span>{row.address}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                      <span>Minat: {interestLabel[row.interest_area ?? ""] ?? "Belum dipilih"}</span>
                      <span>Pengalaman: {experienceLabel[row.experience_level ?? ""] ?? "Belum diisi"}</span>
                    </div>
                  </div>
                  {row.review_note ? (
                    <p className="mt-2 border-l-2 border-line pl-2 text-[11px] text-muted">
                      Catatan tinjauan: {row.review_note}
                    </p>
                  ) : null}
                  {row.reviewed_at ? (
                    <div className="mt-2 text-[10.5px] text-muted2">Diperbarui {formatDate(row.reviewed_at)}</div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <ClipboardList size={27} className="mx-auto text-muted2" />
              <h2 className="mt-3 text-[14px] font-semibold text-ink">Belum ada pengajuan</h2>
              <p className="mt-1 text-[12px] text-muted">
                Pengajuan yang dikirim melalui formulir publik akan tercatat di sini.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        {canReview ? (
          <Notice tone="info" title="Tugas peninjauan">
            Akun ini juga memiliki kewenangan peninjauan Bidang Organisasi. Gunakan antrean tersebut
            untuk memutuskan pengajuan; pengaktifan keanggotaan tetap dilakukan melalui Buku Induk.
            <Link href="/app/bidang/organisasi/pengajuan" className="ml-1 font-semibold text-primary-700">
              Buka antrean peninjauan
            </Link>.
          </Notice>
        ) : (
          <Notice tone="info" title="Pemisahan tugas">
            Halaman ini bersifat pemantauan. Peninjauan awal dilakukan Koordinator Organisasi &
            Keanggotaan, sedangkan Sekretariat mengelola catatan resmi dan aktivasi anggota setelah
            persetujuan.
          </Notice>
        )}
      </div>
    </div>
  );
}
