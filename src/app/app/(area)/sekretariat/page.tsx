import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Inbox, MessagesSquare } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { advanceSecretariatLetter } from "@/app/actions/secretariat-letters";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Sekretariat" };

interface OverviewRow {
  inbound_pending_count: number;
  final_document_count: number;
  public_document_count: number;
  draft_document_count: number;
  upcoming_meeting_count: number;
}

interface LetterRow {
  id: string;
  reference_no: string;
  number: string | null;
  subject: string;
  counterpart: string;
  letter_date: string;
  status: "baru" | "diproses" | "selesai";
  assignee_label: string;
}

interface MeetingRow {
  id: string;
  reference_no: string;
  title: string;
  meeting_type: "pengurus" | "bidang" | "anggota";
  meeting_date: string;
  time_label: string | null;
  location: string | null;
  minutes_status: "draft" | "final" | null;
  attendance_count: number;
}

interface DocumentRow {
  id: string;
  reference_no: string;
  title: string;
  category: string;
  document_date: string;
  visibility: "publik" | "internal" | "terbatas";
  status: "draft" | "final" | "arsip";
}

const letterStatusLabel: Record<LetterRow["status"], string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
};

const letterStatusTone: Record<LetterRow["status"], "warning" | "info" | "success"> = {
  baru: "warning",
  diproses: "info",
  selesai: "success",
};

const meetingTypeLabel: Record<MeetingRow["meeting_type"], string> = {
  pengurus: "Rapat pengurus",
  bidang: "Rapat bidang",
  anggota: "Rapat anggota",
};

function unavailableErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function SekretariatDashboard() {
  const identity = await requireIdentity("secretariat:read");
  const canManageLetters = can(identity, "secretariat:letters:write");

  let overview: OverviewRow | null = null;
  let letters: LetterRow[] = [];
  let meetings: MeetingRow[] = [];
  let documents: DocumentRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [overviewResult, lettersResult, meetingsResult, documentsResult] = await Promise.all([
      sql`
        SELECT
          (
            SELECT count(*)::int
            FROM v9.secretariat_letters
            WHERE organization_id = ${identity.organizationId}
              AND direction = 'masuk'
              AND status <> 'selesai'
          ) AS inbound_pending_count,
          (
            SELECT count(*)::int
            FROM v9.secretariat_documents
            WHERE organization_id = ${identity.organizationId}
              AND status = 'final'
          ) AS final_document_count,
          (
            SELECT count(*)::int
            FROM v9.secretariat_documents
            WHERE organization_id = ${identity.organizationId}
              AND status = 'final'
              AND visibility = 'publik'
          ) AS public_document_count,
          (
            SELECT count(*)::int
            FROM v9.secretariat_documents
            WHERE organization_id = ${identity.organizationId}
              AND status = 'draft'
          ) AS draft_document_count,
          (
            SELECT count(*)::int
            FROM v9.secretariat_meetings
            WHERE organization_id = ${identity.organizationId}
              AND status = 'scheduled'
              AND meeting_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
              AND meeting_date <= (now() AT TIME ZONE 'Asia/Jakarta')::date + 7
          ) AS upcoming_meeting_count
      `,
      sql`
        SELECT
          id::text AS id,
          reference_no,
          number,
          subject,
          counterpart,
          letter_date::text AS letter_date,
          status,
          assignee_label
        FROM v9.secretariat_letters
        WHERE organization_id = ${identity.organizationId}
          AND direction = 'masuk'
        ORDER BY letter_date DESC, created_at DESC
        LIMIT 6
      `,
      sql`
        SELECT
          meeting.id::text AS id,
          meeting.reference_no,
          meeting.title,
          meeting.meeting_type,
          meeting.meeting_date::text AS meeting_date,
          meeting.time_label,
          meeting.location,
          latest_minutes.status AS minutes_status,
          COALESCE(attendance.hadir_count, 0)::int AS attendance_count
        FROM v9.secretariat_meetings AS meeting
        LEFT JOIN LATERAL (
          SELECT minutes.status
          FROM v9.secretariat_minutes AS minutes
          WHERE minutes.meeting_id = meeting.id
          ORDER BY minutes.revision_no DESC
          LIMIT 1
        ) AS latest_minutes ON true
        LEFT JOIN LATERAL (
          SELECT count(*) FILTER (WHERE attendee.attendance_status = 'hadir') AS hadir_count
          FROM v9.secretariat_meeting_attendance AS attendee
          WHERE attendee.meeting_id = meeting.id
        ) AS attendance ON true
        WHERE meeting.organization_id = ${identity.organizationId}
          AND meeting.status = 'scheduled'
          AND meeting.meeting_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
        ORDER BY meeting.meeting_date ASC, meeting.created_at ASC
        LIMIT 5
      `,
      sql`
        SELECT
          id::text AS id,
          reference_no,
          title,
          category,
          document_date::text AS document_date,
          visibility,
          status
        FROM v9.secretariat_documents
        WHERE organization_id = ${identity.organizationId}
          AND status <> 'arsip'
        ORDER BY document_date DESC, created_at DESC
        LIMIT 5
      `,
    ]);

    overview = rowsFromResult<OverviewRow>(overviewResult)[0] ?? null;
    letters = rowsFromResult<LetterRow>(lettersResult);
    meetings = rowsFromResult<MeetingRow>(meetingsResult);
    documents = rowsFromResult<DocumentRow>(documentsResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[secretariat-dashboard] Source unavailable", unavailableErrorType(reason));
  }

  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.sekretariat}
        facts={
          overview
            ? [
                `${overview.inbound_pending_count} surat masuk perlu tindak lanjut`,
                `${overview.final_document_count} dokumen final`,
                `${overview.upcoming_meeting_count} rapat dalam 7 hari`,
                `${overview.draft_document_count} draf dokumen`,
              ]
            : ["Data Sekretariat belum tersedia"]
        }
        actions={[
          { href: "/app/sekretariat/surat", label: "Registrasi surat", primary: true },
          { href: "/app/sekretariat/dokumen", label: "Dokumen & arsip" },
        ]}
      />

      {unavailable ? (
        <div className="mt-4">
          <Notice tone="warning" title="Data Sekretariat belum dapat dimuat">
            Koneksi ke sumber data organisasi sedang tidak tersedia. Ringkasan dan daftar di halaman ini
            disembunyikan sementara agar tidak menampilkan angka contoh sebagai catatan resmi. Muat ulang
            halaman setelah koneksi pulih.
          </Notice>
        </div>
      ) : null}

      {overview ? (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Surat masuk perlu tindak lanjut"
              value={overview.inbound_pending_count}
              note="Status baru atau diproses"
              tone={overview.inbound_pending_count ? "warning" : "success"}
              href="/app/sekretariat/surat"
            />
            <StatCard
              label="Dokumen final"
              value={overview.final_document_count}
              note={`${overview.public_document_count} dapat diakses publik`}
              tone="success"
              href="/app/sekretariat/dokumen"
            />
            <StatCard
              label="Rapat 7 hari ke depan"
              value={overview.upcoming_meeting_count}
              note="Agenda rapat yang sudah tersimpan"
              tone="info"
              href="/app/sekretariat/rapat"
            />
            <StatCard
              label="Draf dokumen"
              value={overview.draft_document_count}
              note="Belum difinalkan"
              tone="neutral"
              href="/app/sekretariat/dokumen"
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.9fr)]">
            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Surat masuk terbaru"
                  subtitle={`${letters.length} catatan terbaru dari register surat`}
                  action={
                    <Link href="/app/sekretariat/surat" className="text-[11.5px] font-semibold text-primary-700">
                      Semua surat <ArrowRight size={12} className="inline" />
                    </Link>
                  }
                />
                {letters.length ? (
                  <div className="divide-y divide-line">
                    {letters.map((letter) => (
                      <article key={letter.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[9.5px] text-muted2">{letter.reference_no}</span>
                            <Badge tone={letterStatusTone[letter.status]}>{letterStatusLabel[letter.status]}</Badge>
                          </div>
                          <h2 className="mt-1 text-[12.5px] font-semibold text-ink">{letter.subject}</h2>
                          <p className="mt-1 text-[10.5px] text-muted">
                            {letter.counterpart} · {letter.number || "Nomor surat belum dicatat"} · {formatDateID(letter.letter_date, "short")}
                          </p>
                          <p className="mt-1 text-[10.5px] text-muted2">Penanggung jawab: {letter.assignee_label}</p>
                        </div>
                        {canManageLetters && letter.status !== "selesai" ? (
                          <form action={advanceSecretariatLetter} className="shrink-0">
                            <input type="hidden" name="id" value={letter.id} />
                            <input
                              type="hidden"
                              name="next"
                              value={letter.status === "baru" ? "diproses" : "selesai"}
                            />
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">
                              {letter.status === "baru" ? "Proses" : "Selesaikan"}
                            </button>
                          </form>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-9">
                    <EmptyState title="Belum ada surat masuk" body="Surat yang diregistrasi pada modul Sekretariat akan muncul di sini." />
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Rapat & agenda mendatang"
                  subtitle="Agenda tersimpan dan status notulen terakhir"
                  action={
                    <Link href="/app/sekretariat/rapat" className="text-[11.5px] font-semibold text-primary-700">
                      Semua rapat <ArrowRight size={12} className="inline" />
                    </Link>
                  }
                />
                {meetings.length ? (
                  <div className="divide-y divide-line">
                    {meetings.map((meeting) => (
                      <article key={meeting.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-[9.5px] text-muted2">{meeting.reference_no}</div>
                            <h2 className="mt-1 text-[12.5px] font-semibold text-ink">{meeting.title}</h2>
                            <p className="mt-1 text-[10.5px] text-muted">
                              {formatDateID(meeting.meeting_date, "short")}
                              {meeting.time_label ? ` · ${meeting.time_label}` : ""}
                              {meeting.location ? ` · ${meeting.location}` : ""}
                            </p>
                          </div>
                          <Badge tone="info">{meetingTypeLabel[meeting.meeting_type]}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted2">
                            <Badge tone="neutral">{meeting.attendance_count} hadir tercatat</Badge>
                            <Badge tone={meeting.minutes_status === "final" ? "success" : meeting.minutes_status === "draft" ? "warning" : "neutral"}>
                              {meeting.minutes_status === "final" ? "Notulen final" : meeting.minutes_status === "draft" ? "Notulen draf" : "Notulen belum dibuat"}
                            </Badge>
                          </div>
                          <Link
                            href={`/app/sekretariat/notulen?meeting_id=${meeting.id}`}
                            className="text-[10.5px] font-semibold text-primary-700"
                          >
                            Buka notulen
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-9">
                    <EmptyState title="Belum ada agenda mendatang" body="Agenda yang disimpan di modul Rapat & Undangan akan tampil di sini." />
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Register dokumen terbaru"
                  subtitle="Status dan klasifikasi akses dari arsip organisasi"
                  action={
                    <Link href="/app/sekretariat/dokumen" className="text-[11.5px] font-semibold text-primary-700">
                      Buka arsip <ArrowRight size={12} className="inline" />
                    </Link>
                  }
                />
                {documents.length ? (
                  <div className="divide-y divide-line">
                    {documents.map((document) => (
                      <article key={document.id} className="px-4 py-3">
                        <div className="font-mono text-[9.5px] text-muted2">{document.reference_no}</div>
                        <h2 className="mt-1 text-[12px] font-semibold text-ink">{document.title}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted2">
                          <span>{document.category}</span>
                          <span>·</span>
                          <span>{formatDateID(document.document_date, "short")}</span>
                          <Badge tone={document.visibility === "publik" ? "info" : document.visibility === "terbatas" ? "warning" : "neutral"}>
                            {document.visibility}
                          </Badge>
                          <StatusBadge status={document.status === "final" ? "Final" : "Draf"} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-9">
                    <EmptyState title="Belum ada dokumen" body="Dokumen yang diregistrasi akan muncul di panel ini." />
                  </div>
                )}
                <div className="border-t border-line p-3">
                  <Link href="/app/sekretariat/dokumen" className="sb-btn sb-btn-outline !h-8 w-full !px-3 text-[10.5px]">
                    Kelola dokumen <ArrowRight size={12} />
                  </Link>
                </div>
              </Card>

              <Card>
                <CardHeader title="Ruang kerja Sekretariat" action={<MessagesSquare size={15} className="text-muted2" />} />
                <div className="divide-y divide-line">
                  <Link href="/app/sekretariat/rapat" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                    Rapat & undangan <ArrowRight size={13} />
                  </Link>
                  <Link href="/app/sekretariat/notulen" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                    Notulen & putusan <ArrowRight size={13} />
                  </Link>
                  <Link href="/app/sekretariat/agenda" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                    Agenda organisasi <CalendarDays size={13} />
                  </Link>
                  <Link href="/studio/website" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                    Website Studio <FileText size={13} />
                  </Link>
                  <Link href="/app/sekretariat/surat" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                    Surat & ekspedisi <Inbox size={13} />
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
