import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ClipboardCheck, FileText, Plus, ShieldCheck } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import {
  addSecretariatDecision,
  createSecretariatMinutesRevision,
  finalizeSecretariatMinutes,
  saveSecretariatMinutes,
} from "@/app/actions/secretariat-meetings";

export const metadata: Metadata = { title: "Notulen & Putusan" };

interface MeetingOption {
  id: string;
  reference_no: string;
  title: string;
  meeting_date: string;
  meeting_type: "pengurus" | "bidang" | "anggota";
  status: "scheduled" | "completed" | "cancelled";
  minutes_id: string | null;
  revision_no: number | null;
  minutes_status: "draft" | "final" | null;
  opening_notes: string | null;
  discussion_notes: string | null;
  closing_notes: string | null;
  prepared_by_label: string | null;
}

interface DecisionRow {
  id: string;
  order_no: number;
  decision_text: string;
  responsible_label: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
}

const meetingTypeLabel: Record<MeetingOption["meeting_type"], string> = {
  pengurus: "Rapat pengurus",
  bidang: "Rapat bidang",
  anggota: "Rapat anggota",
};

const meetingStatusLabel: Record<MeetingOption["status"], string> = {
  scheduled: "Terjadwal",
  completed: "Terlaksana",
  cancelled: "Dibatalkan",
};

const decisionStatusLabel: Record<DecisionRow["status"], string> = {
  open: "Terbuka",
  in_progress: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default async function NotulenPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting_id?: string; result?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const { meeting_id, result } = await searchParams;
  const sql = getV9Sql();

  const meetingResult = await sql`
    SELECT
      meeting.id::text AS id,
      meeting.reference_no,
      meeting.title,
      meeting.meeting_date::text AS meeting_date,
      meeting.meeting_type,
      meeting.status,
      latest_minutes.id::text AS minutes_id,
      latest_minutes.revision_no,
      latest_minutes.status AS minutes_status,
      latest_minutes.opening_notes,
      latest_minutes.discussion_notes,
      latest_minutes.closing_notes,
      latest_minutes.prepared_by_label
    FROM v9.secretariat_meetings AS meeting
    LEFT JOIN LATERAL (
      SELECT minutes.id, minutes.revision_no, minutes.status,
        minutes.opening_notes, minutes.discussion_notes,
        minutes.closing_notes, minutes.prepared_by_label
      FROM v9.secretariat_minutes AS minutes
      WHERE minutes.meeting_id = meeting.id
      ORDER BY minutes.revision_no DESC
      LIMIT 1
    ) AS latest_minutes ON true
    WHERE meeting.organization_id = ${identity.organizationId}
    ORDER BY meeting.meeting_date DESC, meeting.created_at DESC
    LIMIT 200
  `;
  const meetings = rowsFromResult<MeetingOption>(meetingResult);
  const selected =
    meetings.find((meeting) => meeting.id === meeting_id) ??
    meetings.find((meeting) => meeting.status !== "cancelled") ??
    meetings[0] ??
    null;

  let decisions: DecisionRow[] = [];
  if (selected?.minutes_id) {
    const decisionResult = await sql`
      SELECT
        id::text AS id,
        order_no,
        decision_text,
        responsible_label,
        due_date::text AS due_date,
        status
      FROM v9.secretariat_meeting_decisions
      WHERE minutes_id = ${selected.minutes_id}
      ORDER BY order_no
    `;
    decisions = rowsFromResult<DecisionRow>(decisionResult);
  }

  const notices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    saved: { tone: "success", text: "Draf notulen berhasil disimpan." },
    "decision-added": { tone: "success", text: "Keputusan rapat berhasil ditambahkan." },
    finalized: { tone: "success", text: "Notulen difinalkan dan sekarang terkunci sebagai revisi resmi." },
    "revision-created": { tone: "success", text: "Revisi baru dibuat dari salinan notulen final sebelumnya." },
    "revision-required": { tone: "warning", text: "Notulen sebelumnya sudah final. Buat revisi baru sebelum mengubah isinya." },
    "revision-blocked": { tone: "warning", text: "Revisi tidak dapat dibuat. Periksa apakah draf lain masih terbuka atau notulen final belum tersedia." },
    "not-ready": { tone: "warning", text: "Notulen belum dapat difinalkan. Pastikan rapat sudah berstatus terlaksana dan isi notulen atau keputusan sudah dicatat." },
    invalid: { tone: "danger", text: "Isian notulen tidak valid." },
    stale: { tone: "warning", text: "Notulen sudah berubah atau tidak ditemukan." },
    error: { tone: "danger", text: "Operasi notulen gagal. Periksa koneksi lalu coba kembali." },
  };

  const isDraft = selected?.minutes_status === "draft";
  const isFinal = selected?.minutes_status === "final";

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Notulen & putusan"
        description="Catatan rapat dan keputusan tertulis. Notulen final tidak ditimpa; perubahan dilakukan melalui revisi baru dengan riwayat yang tetap tersimpan."
        actions={<Link href="/app/sekretariat/rapat" className="sb-btn sb-btn-outline">Rapat & undangan</Link>}
      />

      {result && notices[result] ? (
        <div className="mb-4">
          <Notice tone={notices[result].tone} title="Pembaruan notulen">
            {notices[result].text}
          </Notice>
        </div>
      ) : null}

      {meetings.length === 0 ? (
        <Card>
          <div className="px-5 py-12">
            <EmptyState
              title="Belum ada rapat"
              body="Buat agenda rapat terlebih dahulu. Draf notulen akan disiapkan otomatis."
            />
            <div className="mt-4 text-center">
              <Link href="/app/sekretariat/rapat" className="sb-btn sb-btn-primary">Buat agenda rapat</Link>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Pilih rapat" subtitle={`${meetings.length} rapat tercatat`} />
              <div className="divide-y divide-line">
                {meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/app/sekretariat/notulen?meeting_id=${meeting.id}`}
                    className={`block px-4 py-3 transition-colors hover:bg-paper ${selected?.id === meeting.id ? "bg-paper" : ""}`}
                  >
                    <div className="font-mono text-[9.5px] text-muted2">{meeting.reference_no}</div>
                    <div className="mt-1 text-[12px] font-semibold text-ink">{meeting.title}</div>
                    <div className="mt-1 text-[10.5px] text-muted">{dateLabel(meeting.meeting_date)}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={meeting.status === "completed" ? "success" : meeting.status === "scheduled" ? "info" : "neutral"}>
                        {meetingStatusLabel[meeting.status]}
                      </Badge>
                      <Badge tone={meeting.minutes_status === "final" ? "success" : meeting.minutes_status === "draft" ? "warning" : "neutral"}>
                        {meeting.minutes_status === "final" ? `Final v${meeting.revision_no}` : meeting.minutes_status === "draft" ? "Draf" : "Belum ada"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {selected ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader
                    title={selected.title}
                    subtitle={`${selected.reference_no} · ${dateLabel(selected.meeting_date)} · ${meetingTypeLabel[selected.meeting_type]}`}
                    action={
                      <Badge tone={selected.status === "completed" ? "success" : selected.status === "scheduled" ? "info" : "neutral"}>
                        {meetingStatusLabel[selected.status]}
                      </Badge>
                    }
                  />
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-[11px] text-muted">
                    <Link href={`/app/sekretariat/presensi?meeting_id=${selected.id}`} className="sb-btn sb-btn-outline !h-8 !px-3 text-[10.5px]">
                      Daftar hadir
                    </Link>
                    <Link href="/app/sekretariat/rapat" className="text-[10.5px] font-semibold text-primary-700">
                      Ubah status rapat
                    </Link>
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    title="Isi notulen"
                    subtitle={isFinal ? `Revisi final ${selected.revision_no} · tidak dapat ditimpa` : "Simpan sebagai draf sampai isi diperiksa dan disahkan"}
                    action={
                      <StatusBadge status={isFinal ? "Final" : "Draf"} />
                    }
                  />
                  {isFinal ? (
                    <div className="space-y-4 p-4">
                      {[
                        ["Pembukaan", selected.opening_notes],
                        ["Pokok pembahasan", selected.discussion_notes],
                        ["Penutup", selected.closing_notes],
                      ].map(([label, value]) => (
                        <section key={label}>
                          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</h3>
                          <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink2">{value || "Tidak ada catatan."}</p>
                        </section>
                      ))}
                      <div className="flex items-center gap-2 border-t border-line pt-3 text-[11px] text-muted2">
                        <ShieldCheck size={14} />
                        Revisi final tersimpan dan tidak dapat diedit.
                      </div>
                      <form action={createSecretariatMinutesRevision}>
                        <input type="hidden" name="meeting_id" value={selected.id} />
                        <button type="submit" className="sb-btn sb-btn-outline">
                          Buat revisi baru
                        </button>
                      </form>
                    </div>
                  ) : isDraft ? (
                    <form action={saveSecretariatMinutes} className="space-y-3 p-4">
                      <input type="hidden" name="meeting_id" value={selected.id} />
                      <div>
                        <label htmlFor="opening-notes" className="mb-1 block text-[11.5px] font-semibold text-ink2">Pembukaan</label>
                        <textarea id="opening-notes" name="opening_notes" rows={3} maxLength={10000} className="sb-input !h-auto min-h-[86px] resize-y py-2.5" defaultValue={selected.opening_notes ?? ""} placeholder="Pimpinan rapat, waktu pembukaan, dan pengantar." />
                      </div>
                      <div>
                        <label htmlFor="discussion-notes" className="mb-1 block text-[11.5px] font-semibold text-ink2">Pokok pembahasan</label>
                        <textarea id="discussion-notes" name="discussion_notes" rows={6} maxLength={30000} className="sb-input !h-auto min-h-[150px] resize-y py-2.5" defaultValue={selected.discussion_notes ?? ""} placeholder="Catat ringkasan pembahasan, laporan, dan hal yang perlu ditindaklanjuti." />
                      </div>
                      <div>
                        <label htmlFor="closing-notes" className="mb-1 block text-[11.5px] font-semibold text-ink2">Penutup</label>
                        <textarea id="closing-notes" name="closing_notes" rows={3} maxLength={10000} className="sb-input !h-auto min-h-[86px] resize-y py-2.5" defaultValue={selected.closing_notes ?? ""} placeholder="Catatan penutup dan waktu rapat selesai." />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                        <span className="text-[10.5px] text-muted2">Penyusun: {selected.prepared_by_label ?? identity.name}</span>
                        <button type="submit" className="sb-btn sb-btn-primary">Simpan draf notulen</button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 text-[12px] text-muted">Draf notulen belum tersedia. Hubungi pengurus Sekretariat.</div>
                  )}
                </Card>

                <Card>
                  <CardHeader
                    title="Keputusan rapat"
                    subtitle={`${decisions.length} keputusan pada revisi ini`}
                    action={<Badge tone="neutral">{isFinal ? "Terkunci" : "Draf"}</Badge>}
                  />
                  {decisions.length ? (
                    <ol className="divide-y divide-line">
                      {decisions.map((decision) => (
                        <li key={decision.id} className="flex gap-3 px-4 py-3">
                          <Badge tone="neutral">{String(decision.order_no).padStart(2, "0")}</Badge>
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink2">{decision.decision_text}</p>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted2">
                              {decision.responsible_label ? <span>PIC {decision.responsible_label}</span> : null}
                              {decision.due_date ? <span>Tenggat {dateLabel(decision.due_date)}</span> : null}
                              <span>{decisionStatusLabel[decision.status]}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="px-4 py-5 text-[11.5px] text-muted">Belum ada keputusan yang dicatat.</div>
                  )}

                  {isDraft ? (
                    <form action={addSecretariatDecision} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
                      <input type="hidden" name="meeting_id" value={selected.id} />
                      <div className="sm:col-span-2">
                        <label htmlFor="decision-text" className="mb-1 block text-[11.5px] font-semibold text-ink2">Keputusan / tindak lanjut</label>
                        <textarea id="decision-text" name="decision_text" rows={3} minLength={3} maxLength={3000} required className="sb-input !h-auto min-h-[80px] resize-y py-2.5" placeholder="Tuliskan keputusan yang disepakati." />
                      </div>
                      <div>
                        <label htmlFor="decision-pic" className="mb-1 block text-[11.5px] font-semibold text-ink2">Penanggung jawab</label>
                        <input id="decision-pic" name="responsible_label" maxLength={160} className="sb-input" placeholder="Nama / bidang" />
                      </div>
                      <div>
                        <label htmlFor="decision-due" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tenggat (opsional)</label>
                        <input id="decision-due" name="due_date" type="date" className="sb-input" />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button type="submit" className="sb-btn sb-btn-outline">
                          <Plus size={14} /> Tambahkan keputusan
                        </button>
                      </div>
                    </form>
                  ) : null}
                </Card>

                {isDraft ? (
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-[12.5px] font-semibold text-ink">Pengesahan notulen</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">
                          Notulen hanya dapat difinalkan setelah rapat ditandai terlaksana dan sudah memiliki isi atau keputusan.
                        </p>
                      </div>
                      {selected.status === "completed" ? (
                        <form action={finalizeSecretariatMinutes}>
                          <input type="hidden" name="meeting_id" value={selected.id} />
                          <button type="submit" className="sb-btn sb-btn-primary">Finalkan notulen</button>
                        </form>
                      ) : (
                        <Link href="/app/sekretariat/rapat" className="sb-btn sb-btn-outline">Tandai rapat terlaksana</Link>
                      )}
                    </div>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}

      <div className="mt-5">
        <Notice tone="info" title="Riwayat revisi">
          Setiap notulen final disimpan sebagai revisi tersendiri. Membuat revisi baru menyalin isi
          dan daftar keputusan terakhir; revisi lama tetap utuh sebagai arsip.
        </Notice>
      </div>
    </div>
  );
}
