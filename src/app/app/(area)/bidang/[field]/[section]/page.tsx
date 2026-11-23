import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, FileText, MapPin, Phone } from "lucide-react";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { FIELDS_BY_SLUG } from "@/config/fields";
import { FIELD_SECTION_KEYS } from "@/config/field-nav";
import { FieldSectionView } from "@/components/field-section";
import { decideMembershipInterest } from "@/app/actions/membership";

export const metadata: Metadata = { title: "Aplikasi Bidang" };

export function generateStaticParams() {
  return Object.keys(FIELDS_BY_SLUG).flatMap((field) =>
    FIELD_SECTION_KEYS.map((section) => ({ field, section })),
  );
}

interface MembershipInterestRow {
  id: string;
  reference_no: string;
  applicant_name: string;
  phone: string;
  address: string;
  interest_area: string | null;
  experience_level: string | null;
  message: string | null;
  status: "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

const statusLabel: Record<MembershipInterestRow["status"], string> = {
  submitted: "Menunggu tinjauan",
  under_review: "Sedang ditinjau",
  approved: "Disetujui · menunggu aktivasi anggota",
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

async function MembershipInterestQueue({ result }: { result?: string }) {
  const identity = await requireIdentity("field:organisasi:review");
  const sql = getV9Sql();
  const query = await sql`
    SELECT
      id::text AS id,
      reference_no,
      applicant_name,
      phone,
      address,
      interest_area,
      experience_level,
      message,
      status,
      created_at,
      reviewed_at,
      review_note
    FROM v9.membership_interests
    WHERE organization_id = ${identity.organizationId}
    ORDER BY
      CASE status
        WHEN 'submitted' THEN 1
        WHEN 'under_review' THEN 2
        WHEN 'approved' THEN 3
        WHEN 'rejected' THEN 4
        ELSE 5
      END,
      created_at DESC
    LIMIT 100
  `;
  const rows = rowsFromResult<MembershipInterestRow>(query);
  const openCount = rows.filter(
    (row) => row.status === "submitted" || row.status === "under_review",
  ).length;

  const notices: Record<string, string> = {
    under_review: "Pengajuan ditandai sedang ditinjau.",
    approved:
      "Pengajuan disetujui dan data keanggotaan dibuat/dihubungkan dalam status menunggu verifikasi.",
    rejected: "Pengajuan ditolak dan keputusan dicatat dalam audit.",
    stale: "Status pengajuan sudah berubah atau pengajuan tidak ditemukan. Muat ulang daftar.",
    invalid: "Keputusan tidak valid. Periksa kembali formulir.",
  };

  return (
    <main className="sb-shell py-7 sm:py-9">
      <div className="mb-5">
        <Link
          href="/app/bidang/organisasi"
          className="text-[12px] font-semibold text-primary-700 hover:underline"
        >
          ← Dashboard Organisasi & Keanggotaan
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="sb-label mb-1">Bidang Organisasi & Keanggotaan</div>
            <h1 className="font-display text-[27px] font-bold tracking-tight text-ink sm:text-[32px]">
              Pengajuan Keanggotaan
            </h1>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">
              Tinjau minat bergabung yang dikirim melalui website. Persetujuan membuat atau
              menghubungkan data orang dan keanggotaan dengan status menunggu verifikasi; bukan
              aktivasi anggota otomatis.
            </p>
          </div>
          <div className="rounded-[12px] border border-line bg-white px-4 py-2.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">
              Perlu tindakan
            </div>
            <div className="mt-0.5 text-[22px] font-bold tabular-nums text-ink">{openCount}</div>
          </div>
        </div>
      </div>

      {result && notices[result] ? (
        <div
          role="status"
          className="mb-4 rounded-[10px] border border-line bg-paper px-4 py-3 text-[12.5px] text-ink2"
        >
          {notices[result]}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <section className="rounded-[14px] border border-dashed border-line bg-white px-6 py-12 text-center">
          <ClipboardCheck size={27} className="mx-auto text-muted2" />
          <h2 className="mt-3 text-[15px] font-semibold text-ink">
            Belum ada pengajuan masuk
          </h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Pengajuan dari formulir website akan tampil di sini setelah tersimpan.
          </p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[14px] border border-line bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[930px] border-collapse text-left text-[12px]">
                <thead className="bg-paper text-[10.5px] font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Pemohon</th>
                    <th className="px-4 py-3">Minat & pengalaman</th>
                    <th className="px-4 py-3">Alamat & catatan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-mono text-[10.5px] text-muted2">
                          {row.reference_no}
                        </div>
                        <div className="mt-1 font-semibold text-ink">{row.applicant_name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-muted">
                          <Phone size={12} />
                          {row.phone}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted2">
                          <CalendarDays size={11} />
                          {formatDate(row.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-ink">
                          {interestLabel[row.interest_area ?? ""] ?? "Belum dipilih"}
                        </div>
                        <div className="mt-1 text-muted">
                          {experienceLabel[row.experience_level ?? ""] ?? "Belum diisi"}
                        </div>
                      </td>
                      <td className="max-w-[270px] px-4 py-4">
                        <div className="flex items-start gap-1.5 text-ink2">
                          <MapPin size={12} className="mt-0.5 shrink-0 text-muted" />
                          <span>{row.address}</span>
                        </div>
                        {row.message ? (
                          <p className="mt-2 whitespace-pre-wrap text-muted">{row.message}</p>
                        ) : (
                          <p className="mt-2 text-muted2">Tidak ada catatan tambahan.</p>
                        )}
                        {row.review_note ? (
                          <p className="mt-2 border-l-2 border-line pl-2 text-muted">
                            Catatan tinjauan: {row.review_note}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex max-w-[180px] rounded-full bg-paper px-2.5 py-1 text-[10.5px] font-semibold text-ink2">
                          {statusLabel[row.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {row.status === "submitted" || row.status === "under_review" ? (
                          <form
                            action={decideMembershipInterest}
                            className="min-w-[170px] space-y-2"
                          >
                            <input type="hidden" name="id" value={row.id} />
                            <select
                              name="decision"
                              defaultValue="under_review"
                              className="sb-input !h-9 text-[11.5px]"
                              aria-label={`Keputusan untuk ${row.applicant_name}`}
                            >
                              <option value="under_review">Sedang ditinjau</option>
                              <option value="approved">Setujui untuk pendaftaran</option>
                              <option value="rejected">Tolak pengajuan</option>
                            </select>
                            <input
                              name="review_note"
                              maxLength={1000}
                              className="sb-input !h-9 text-[11px]"
                              placeholder="Catatan (opsional)"
                            />
                            <button
                              type="submit"
                              className="sb-btn sb-btn-primary !h-9 !w-full !px-3 text-[11.5px]"
                            >
                              Simpan keputusan
                            </button>
                          </form>
                        ) : (
                          <span className="text-[11px] text-muted2">Keputusan tersimpan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="rounded-[13px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-muted2">{row.reference_no}</div>
                    <h2 className="mt-1 text-[14px] font-bold text-ink">{row.applicant_name}</h2>
                    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
                      <Phone size={12} />
                      {row.phone}
                    </div>
                  </div>
                  <span className="max-w-[170px] rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink2">
                    {statusLabel[row.status]}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 border-t border-line pt-3 text-[11.5px]">
                  <div>
                    <span className="text-muted">Minat:</span>{" "}
                    <span className="font-medium text-ink2">
                      {interestLabel[row.interest_area ?? ""] ?? "Belum dipilih"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Pengalaman:</span>{" "}
                    <span className="font-medium text-ink2">
                      {experienceLabel[row.experience_level ?? ""] ?? "Belum diisi"}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-ink2">
                    <MapPin size={12} className="mt-0.5 shrink-0 text-muted" />
                    {row.address}
                  </div>
                  {row.message ? (
                    <p className="whitespace-pre-wrap text-muted">{row.message}</p>
                  ) : null}
                  <div className="text-[10.5px] text-muted2">{formatDate(row.created_at)}</div>
                  {row.review_note ? (
                    <p className="border-l-2 border-line pl-2 text-muted">
                      Catatan tinjauan: {row.review_note}
                    </p>
                  ) : null}
                </div>
                {row.status === "submitted" || row.status === "under_review" ? (
                  <form
                    action={decideMembershipInterest}
                    className="mt-3 space-y-2 border-t border-line pt-3"
                  >
                    <input type="hidden" name="id" value={row.id} />
                    <select
                      name="decision"
                      defaultValue="under_review"
                      className="sb-input !h-10 text-[12px]"
                      aria-label={`Keputusan untuk ${row.applicant_name}`}
                    >
                      <option value="under_review">Sedang ditinjau</option>
                      <option value="approved">Setujui untuk pendaftaran</option>
                      <option value="rejected">Tolak pengajuan</option>
                    </select>
                    <input
                      name="review_note"
                      maxLength={1000}
                      className="sb-input !h-10 text-[12px]"
                      placeholder="Catatan (opsional)"
                    />
                    <button
                      type="submit"
                      className="sb-btn sb-btn-primary !h-10 !w-full text-[12px]"
                    >
                      Simpan keputusan
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 rounded-[12px] border border-line bg-paper p-4 text-[11.5px] leading-relaxed text-muted">
        <div className="flex items-center gap-2 font-semibold text-ink2">
          <FileText size={14} /> Catatan administrasi
        </div>
        Pengajuan yang disetujui menghasilkan atau menghubungkan profil orang dan membuat catatan
        keanggotaan berstatus menunggu verifikasi. Aktivasi anggota, penetapan nomor anggota, dan
        pemberian akun masuk tetap merupakan langkah terpisah yang memerlukan kewenangan pengurus.
      </div>
    </main>
  );
}

export default async function BidangSection({
  params,
  searchParams,
}: {
  params: Promise<{ field: string; section: string }>;
  searchParams?: Promise<{ result?: string }>;
}) {
  const { field: slug, section } = await params;
  const field = FIELDS_BY_SLUG[slug];
  if (!field || !FIELD_SECTION_KEYS.includes(section)) notFound();

  if (section === "pengajuan") {
    if (slug !== "organisasi") notFound();
    await requireIdentity("field:organisasi:review");
    const search = await searchParams;
    return <MembershipInterestQueue result={search?.result} />;
  }

  return <FieldSectionView field={field} section={section} />;
}
