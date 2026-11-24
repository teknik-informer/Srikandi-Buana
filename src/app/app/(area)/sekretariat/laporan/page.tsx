import Link from "next/link";
import type { Metadata } from "next";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  FileText,
  Mail,
  Users,
} from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan Sekretariat" };

interface LetterSummary {
  direction: "masuk" | "keluar";
  total_count: number;
  new_count: number;
  processing_count: number;
  completed_count: number;
}

interface DocumentSummary {
  category: string;
  total_count: number;
  final_count: number;
  draft_count: number;
  archived_count: number;
}

interface MeetingSummary {
  id: string;
  reference_no: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  minutes_status: "draft" | "final" | null;
  attendance_count: number;
  meeting_status: string;
}

interface MemberSummary {
  active_count: number;
  pending_count: number;
  inactive_count: number;
  left_count: number;
}

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function jakartaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

const meetingTypeLabels: Record<string, string> = {
  pengurus: "Rapat pengurus",
  bidang: "Rapat bidang",
  anggota: "Rapat anggota",
};

export default async function LaporanSekretariatPage({
  searchParams,
}: {
  searchParams?: Promise<{ start?: string; end?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const params = await searchParams;
  const today = jakartaToday();
  const defaultStart = today.slice(0, 7) + "-01";
  const startParam = params?.start;
  const endParam = params?.end;
  const start = validDate(startParam) ? startParam : defaultStart;
  const end = validDate(endParam) ? endParam : today;
  const validRange = start <= end;

  let letters: LetterSummary[] = [];
  let documents: DocumentSummary[] = [];
  let meetings: MeetingSummary[] = [];
  let members: MemberSummary | null = null;
  let unavailable = false;

  if (validRange) {
    try {
      const sql = getV9Sql();
      const [letterResult, documentResult, meetingResult, memberResult] = await Promise.all([
        sql`
          SELECT
            direction,
            count(*)::int AS total_count,
            count(*) FILTER (WHERE status = 'baru')::int AS new_count,
            count(*) FILTER (WHERE status = 'diproses')::int AS processing_count,
            count(*) FILTER (WHERE status = 'selesai')::int AS completed_count
          FROM v9.secretariat_letters
          WHERE organization_id = ${identity.organizationId}
            AND letter_date BETWEEN ${start}::date AND ${end}::date
          GROUP BY direction
          ORDER BY direction
        `,
        sql`
          SELECT
            category,
            count(*)::int AS total_count,
            count(*) FILTER (WHERE status = 'final')::int AS final_count,
            count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
            count(*) FILTER (WHERE status = 'arsip')::int AS archived_count
          FROM v9.secretariat_documents
          WHERE organization_id = ${identity.organizationId}
            AND document_date BETWEEN ${start}::date AND ${end}::date
          GROUP BY category
          ORDER BY category
        `,
        sql`
          SELECT
            meeting.id::text AS id,
            meeting.reference_no,
            meeting.title,
            meeting.meeting_type,
            meeting.meeting_date::text AS meeting_date,
            meeting.status AS meeting_status,
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
            AND meeting.meeting_date BETWEEN ${start}::date AND ${end}::date
          ORDER BY meeting.meeting_date DESC, meeting.created_at DESC
          LIMIT 200
        `,
        sql`
          SELECT
            count(*) FILTER (WHERE membership.status = 'active')::int AS active_count,
            count(*) FILTER (WHERE membership.status = 'pending')::int AS pending_count,
            count(*) FILTER (WHERE membership.status = 'inactive')::int AS inactive_count,
            count(*) FILTER (WHERE membership.status = 'left')::int AS left_count
          FROM v9.memberships AS membership
          WHERE membership.organization_id = ${identity.organizationId}
        `,
      ]);

      letters = rowsFromResult<LetterSummary>(letterResult);
      documents = rowsFromResult<DocumentSummary>(documentResult);
      meetings = rowsFromResult<MeetingSummary>(meetingResult);
      members = rowsFromResult<MemberSummary>(memberResult)[0] ?? null;
    } catch (reason) {
      unavailable = true;
      console.warn("[secretariat-reports] Source unavailable", safeErrorType(reason));
    }
  }

  const letterCount = letters.reduce((sum, row) => sum + row.total_count, 0);
  const completedLetters = letters.reduce((sum, row) => sum + row.completed_count, 0);
  const documentCount = documents.reduce((sum, row) => sum + row.total_count, 0);
  const finalDocumentCount = documents.reduce((sum, row) => sum + row.final_count, 0);
  const finalMinutesCount = meetings.filter((meeting) => meeting.minutes_status === "final").length;
  const incoming = letters.find((row) => row.direction === "masuk");
  const outgoing = letters.find((row) => row.direction === "keluar");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Laporan kesekretariatan"
        description="Rekap surat, arsip, rapat, dokumentasi keputusan, dan keanggotaan dari register organisasi."
        actions={<Link href="/app/pengurus/laporan" className="sb-btn sb-btn-outline">Laporan organisasi <ArrowRight size={13} /></Link>}
      />

      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label htmlFor="report-start" className="mb-1 block text-[10.5px] font-semibold text-muted">Tanggal awal</label>
            <input id="report-start" name="start" type="date" defaultValue={start} className="sb-input" />
          </div>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="report-end" className="mb-1 block text-[10.5px] font-semibold text-muted">Tanggal akhir</label>
            <input id="report-end" name="end" type="date" defaultValue={end} className="sb-input" />
          </div>
          <button type="submit" className="sb-btn sb-btn-primary !h-10">Terapkan periode</button>
          <Link href="/app/sekretariat/laporan" className="sb-btn sb-btn-outline !h-10">Periode berjalan</Link>
        </form>
        <div className="mt-2 text-[10.5px] text-muted2">
          Periode {formatDateID(start, "short")} sampai {formatDateID(end, "short")} · Waktu Asia/Jakarta
        </div>
      </Card>

      {!validRange ? (
        <div className="mb-4">
          <Notice tone="warning" title="Rentang tanggal tidak valid">
            Tanggal awal tidak boleh melewati tanggal akhir.
          </Notice>
        </div>
      ) : null}

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Sumber laporan sekretariat belum dapat dimuat">
            Koneksi ke register sekretariat atau buku induk sedang tidak tersedia. Nilai laporan disembunyikan
            sampai sumber data pulih.
          </Notice>
        </div>
      ) : null}

      {validRange && !unavailable && members ? (
        <>
          <div className="mb-4">
            <Notice tone="info" title="Dasar perhitungan">
              Surat, arsip, dan rapat mengikuti tanggal pada masing-masing register dalam periode terpilih.
              Status keanggotaan menunjukkan posisi terkini, bukan jumlah anggota yang tercatat pada periode
              historis. Jumlah hadir berasal dari daftar presensi rapat yang disimpan.
            </Notice>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Surat tercatat" value={letterCount} note={(incoming?.total_count ?? 0) + " masuk · " + (outgoing?.total_count ?? 0) + " keluar"} tone="info" icon={<Mail size={17} />} />
            <StatCard label="Surat selesai" value={completedLetters} note={Math.max(0, letterCount - completedLetters) + " belum selesai"} tone="success" icon={<FileText size={17} />} />
            <StatCard label="Dokumen diarsip" value={documentCount} note={finalDocumentCount + " final" } tone="info" icon={<Archive size={17} />} />
            <StatCard label="Rapat tercatat" value={meetings.length} note={finalMinutesCount + " notulen final"} tone="accent" icon={<CalendarDays size={17} />} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Rekap surat" subtitle="Per arah dan status dalam periode" />
              <div className="sb-scroll">
                <table className="sb-table min-w-[520px]">
                  <thead><tr><th>Arah</th><th className="num">Jumlah</th><th className="num">Baru</th><th className="num">Diproses</th><th className="num">Selesai</th></tr></thead>
                  <tbody>
                    {(["masuk", "keluar"] as const).map((direction) => {
                      const row = letters.find((item) => item.direction === direction);
                      return (
                        <tr key={direction}>
                          <td className="font-medium text-ink">{direction === "masuk" ? "Surat masuk" : "Surat keluar"}</td>
                          <td className="num">{row?.total_count ?? 0}</td>
                          <td className="num">{row?.new_count ?? 0}</td>
                          <td className="num">{row?.processing_count ?? 0}</td>
                          <td className="num">{row?.completed_count ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader title="Arsip per kategori" subtitle="Status dokumen pada register organisasi" />
              {documents.length ? (
                <div className="sb-scroll">
                  <table className="sb-table min-w-[480px]">
                    <thead><tr><th>Kategori</th><th className="num">Jumlah</th><th className="num">Final</th><th className="num">Draf</th><th className="num">Arsip</th></tr></thead>
                    <tbody>
                      {documents.map((row) => (
                        <tr key={row.category}>
                          <td className="font-medium text-ink">{row.category}</td>
                          <td className="num">{row.total_count}</td>
                          <td className="num">{row.final_count}</td>
                          <td className="num">{row.draft_count}</td>
                          <td className="num">{row.archived_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4"><EmptyState title="Belum ada dokumen pada periode ini" body="Dokumen akan muncul setelah diregistrasi pada modul Arsip." /></div>
              )}
            </Card>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Rapat & notulen" subtitle="Status dokumentasi dan presensi aktual" />
              {meetings.length ? (
                <ul className="divide-y divide-line">
                  {meetings.map((meeting) => (
                    <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[9.5px] text-muted2">{meeting.reference_no}</span>
                          <Badge tone="neutral">{meetingTypeLabels[meeting.meeting_type] ?? meeting.meeting_type}</Badge>
                        </div>
                        <div className="mt-1 text-[12px] font-semibold text-ink">{meeting.title}</div>
                        <div className="text-[10.5px] text-muted2">{formatDateID(meeting.meeting_date, "short")} · {meeting.attendance_count} hadir</div>
                      </div>
                      <Badge tone={meeting.minutes_status === "final" ? "success" : meeting.minutes_status === "draft" ? "warning" : "neutral"}>
                        {meeting.minutes_status === "final" ? "Notulen final" : meeting.minutes_status === "draft" ? "Notulen draf" : "Belum ada notulen"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4"><EmptyState title="Belum ada rapat pada periode ini" body="Agenda rapat muncul setelah disimpan pada register Sekretariat." /></div>
              )}
            </Card>

            <Card>
              <CardHeader title="Buku induk anggota" subtitle="Status keanggotaan saat ini" action={<Users size={16} className="text-muted2" />} />
              <ul className="divide-y divide-line">
                {([
                  { label: "Aktif", count: members.active_count, tone: "success" },
                  { label: "Menunggu", count: members.pending_count, tone: "warning" },
                  { label: "Nonaktif", count: members.inactive_count, tone: "neutral" },
                  { label: "Keluar", count: members.left_count, tone: "neutral" },
                ] as const).map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-[12px] font-medium text-ink">{item.label}</span>
                    <Badge tone={item.tone}>{item.count}</Badge>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-4 py-3">
                <Link href="/app/sekretariat/anggota" className="text-[11px] font-semibold text-primary-700">Buka Buku Induk <ArrowRight size={12} className="inline" /></Link>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      <div className="mt-5">
        <Notice tone="info" title="Batas laporan">
          Laporan ini adalah rekap operasional dari register Sekretariat. Penetapan format laporan resmi,
          nomor pengesahan, tanda tangan, dan ekspor PDF/Excel menunggu keputusan organisasi.
        </Notice>
      </div>
    </div>
  );
}
