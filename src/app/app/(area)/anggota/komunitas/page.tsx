import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
} from "@/components/ui";
import {
  createMemberCommunityReply,
  createMemberCommunityTopic,
  updateOwnCommunityTopic,
  withdrawOwnCommunityTopic,
  updateOwnCommunityReply,
  withdrawOwnCommunityReply,
  moderateMemberCommunityReply,
  moderateMemberCommunityTopic,
  reportMemberCommunityContent,
  resolveMemberCommunityReport,
} from "@/app/actions/member-community";
import { can, requireIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Komunitas Anggota" };

type ContentStatus = "pending" | "published" | "rejected" | "hidden" | "withdrawn";

interface TopicRow {
  id: string;
  title: string;
  body: string;
  status: ContentStatus;
  moderation_note: string | null;
  created_at: string;
  author_user_id: string;
  author_name: string;
  reply_count: number;
}

interface ReplyRow {
  id: string;
  topic_id: string;
  body: string;
  status: ContentStatus;
  moderation_note: string | null;
  created_at: string;
  author_user_id: string;
  author_name: string;
}

interface ReportRow {
  id: string;
  topic_id: string | null;
  reply_id: string | null;
  reason: string;
  details: string | null;
  created_at: string;
  reporter_name: string;
  target_title: string | null;
  target_body: string | null;
  target_author: string | null;
}

const statusLabel: Record<ContentStatus, string> = {
  pending: "Menunggu moderasi",
  published: "Terbit",
  rejected: "Ditolak",
  hidden: "Disembunyikan",
  withdrawn: "Ditarik",
};

const statusTone: Record<ContentStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  published: "success",
  rejected: "danger",
  hidden: "neutral",
  withdrawn: "neutral",
};

const reasonLabel: Record<string, string> = {
  spam: "Spam / iklan",
  harassment: "Pelecehan / ujaran merendahkan",
  personal_data: "Membuka data pribadi",
  misinformation: "Informasi menyesatkan",
  other: "Lainnya",
};

const notices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "topic-submitted": { tone: "success", text: "Topik dikirim ke antrean moderasi. Topik akan terlihat oleh anggota setelah disetujui." },
  "reply-submitted": { tone: "success", text: "Balasan dikirim untuk ditinjau moderator sebelum tampil kepada anggota lain." },
  "topic-updated": { tone: "success", text: "Draf topik berhasil diperbarui." },
  "topic-withdrawn": { tone: "success", text: "Topik yang menunggu moderasi berhasil ditarik." },
  "reply-updated": { tone: "success", text: "Draf balasan berhasil diperbarui." },
  "reply-withdrawn": { tone: "success", text: "Balasan yang menunggu moderasi berhasil ditarik." },
  "topic-update-stale": { tone: "warning", text: "Topik tidak lagi berstatus menunggu moderasi atau bukan milik akun Anda." },
  "topic-withdraw-stale": { tone: "warning", text: "Topik tidak dapat ditarik karena statusnya sudah berubah." },
  "reply-update-stale": { tone: "warning", text: "Balasan tidak lagi berstatus menunggu moderasi atau bukan milik akun Anda." },
  "reply-withdraw-stale": { tone: "warning", text: "Balasan tidak dapat ditarik karena statusnya sudah berubah." },
  "topic-update-blocked": { tone: "danger", text: "Perubahan topik tidak dapat disimpan." },
  "topic-withdraw-blocked": { tone: "danger", text: "Topik tidak dapat ditarik." },
  "reply-update-blocked": { tone: "danger", text: "Perubahan balasan tidak dapat disimpan." },
  "reply-withdraw-blocked": { tone: "danger", text: "Balasan tidak dapat ditarik." },
  "report-submitted": { tone: "success", text: "Laporan diterima. Moderator akan meninjau konten yang dilaporkan." },
  "moderation-saved": { tone: "success", text: "Keputusan moderasi berhasil dicatat." },
  "report-review-saved": { tone: "success", text: "Penanganan laporan berhasil dicatat." },
  "topic-invalid": { tone: "warning", text: "Judul harus 5–180 karakter dan isi 10–5.000 karakter." },
  "reply-invalid": { tone: "warning", text: "Balasan harus berisi 2–2.500 karakter." },
  "report-invalid": { tone: "warning", text: "Jenis laporan atau data yang dikirim tidak valid." },
  "moderation-invalid": { tone: "warning", text: "Keputusan moderasi tidak valid. Penolakan atau penyembunyian wajib disertai alasan." },
  "report-review-invalid": { tone: "warning", text: "Keputusan penanganan laporan tidak valid." },
  "topic-rate-or-membership-blocked": { tone: "warning", text: "Topik tidak dibuat. Pastikan keanggotaan aktif dan batas pengiriman topik per jam tidak terlampaui." },
  "reply-rate-or-topic-blocked": { tone: "warning", text: "Balasan tidak dibuat. Pastikan topik sudah terbit, keanggotaan aktif, dan batas pengiriman tidak terlampaui." },
  "report-duplicate": { tone: "warning", text: "Anda sudah melaporkan konten tersebut. Satu anggota hanya dapat membuat satu laporan per konten." },
  "topic-blocked": { tone: "danger", text: "Topik tidak dapat disimpan. Muat ulang dan periksa kembali data." },
  "reply-blocked": { tone: "danger", text: "Balasan tidak dapat disimpan. Muat ulang dan periksa kembali data." },
  "report-blocked": { tone: "warning", text: "Laporan tidak dapat dibuat. Hanya konten terbit milik anggota lain yang dapat dilaporkan." },
  "report-membership-blocked": { tone: "warning", text: "Laporan memerlukan keanggotaan aktif." },
  "moderation-blocked": { tone: "danger", text: "Keputusan moderasi tidak dapat disimpan." },
  "topic-moderation-blocked": { tone: "danger", text: "Keputusan topik tidak dapat disimpan." },
  "reply-moderation-blocked": { tone: "danger", text: "Keputusan balasan tidak dapat disimpan." },
  "topic-moderation-stale": { tone: "warning", text: "Status topik sudah berubah. Muat ulang antrean moderasi." },
  "reply-moderation-stale": { tone: "warning", text: "Status balasan sudah berubah. Muat ulang antrean moderasi." },
  "report-review-blocked": { tone: "danger", text: "Laporan tidak dapat diperbarui." },
  "report-review-stale": { tone: "warning", text: "Laporan sudah ditangani atau tidak ditemukan." },
};

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(date);
}

function ReportForm({ targetType, targetId }: { targetType: "topic" | "reply"; targetId: string }) {
  return (
    <details className="mt-3 text-[10.5px]">
      <summary className="cursor-pointer font-semibold text-muted2 hover:text-ink2">Laporkan konten</summary>
      <form action={reportMemberCommunityContent} className="mt-2 grid gap-2 rounded-lg border border-line bg-paper p-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        <div>
          <label className="mb-1 block font-semibold text-muted">Alasan laporan</label>
          <select name="reason" required defaultValue="other" className="sb-input !h-9 text-[10.5px]">
            <option value="spam">Spam / iklan</option>
            <option value="harassment">Pelecehan / ujaran merendahkan</option>
            <option value="personal_data">Membuka data pribadi</option>
            <option value="misinformation">Informasi menyesatkan</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block font-semibold text-muted">Keterangan (opsional)</label>
          <input name="details" maxLength={1500} className="sb-input !h-9 text-[10.5px]" placeholder="Jelaskan secara singkat" />
        </div>
        <button type="submit" className="sb-btn sb-btn-outline !h-9 !px-3 text-[10.5px]">Kirim laporan</button>
      </form>
    </details>
  );
}

export default async function KomunitasPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity();
  const canReadMemberArea = can(identity, "member:self");
  const canModerate = can(identity, "member:community:moderate");
  if (!canReadMemberArea && !canModerate) redirect("/app");

  const params = searchParams ? await searchParams : {};
  const notice = params.result ? notices[params.result] : undefined;
  const sql = getV9Sql();

  let activeMembershipId: string | null = null;
  let topics: TopicRow[] = [];
  let replies: ReplyRow[] = [];
  let moderationTopics: TopicRow[] = [];
  let moderationReplies: ReplyRow[] = [];
  let reports: ReportRow[] = [];
  let unavailable = false;

  try {
    if (canReadMemberArea) {
      const membershipResult = await sql`
        SELECT membership.id::text AS id
        FROM v9.user_accounts AS account
        INNER JOIN v9.memberships AS membership
          ON membership.person_id = account.person_id
          AND membership.organization_id = ${identity.organizationId}
        INNER JOIN v9.people AS person
          ON person.id = membership.person_id
          AND person.status = 'active'
        WHERE account.id = ${identity.userId}
          AND account.status = 'active'
          AND membership.status = 'active'
          AND (membership.valid_from IS NULL OR membership.valid_from <= current_date)
          AND (membership.valid_until IS NULL OR membership.valid_until >= current_date)
        ORDER BY membership.created_at DESC
        LIMIT 1
      `;
      activeMembershipId = rowsFromResult<{ id: string }>(membershipResult)[0]?.id ?? null;
    }

    const [topicResult, replyResult] = await Promise.all([
      sql`
        SELECT
          topic.id::text AS id,
          topic.title,
          topic.body,
          topic.status,
          topic.moderation_note,
          topic.created_at::text AS created_at,
          topic.author_user_id::text AS author_user_id,
          COALESCE(person.full_name, account.email) AS author_name,
          (
            SELECT count(*)::int
            FROM v9.member_community_replies AS reply
            WHERE reply.organization_id = topic.organization_id
              AND reply.topic_id = topic.id
              AND reply.status = 'published'
          ) AS reply_count
        FROM v9.member_community_topics AS topic
        INNER JOIN v9.user_accounts AS account
          ON account.id = topic.author_user_id
        LEFT JOIN v9.people AS person
          ON person.id = account.person_id
        WHERE topic.organization_id = ${identity.organizationId}
          AND (
            topic.status = 'published'
            OR (topic.author_user_id = ${identity.userId} AND topic.status IN ('pending','rejected','hidden','withdrawn'))
            OR (${canModerate} AND topic.status IN ('rejected','hidden'))
          )
        ORDER BY
          CASE topic.status WHEN 'published' THEN 0 ELSE 1 END,
          topic.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT
          reply.id::text AS id,
          reply.topic_id::text AS topic_id,
          reply.body,
          reply.status,
          reply.moderation_note,
          reply.created_at::text AS created_at,
          reply.author_user_id::text AS author_user_id,
          COALESCE(person.full_name, account.email) AS author_name
        FROM v9.member_community_replies AS reply
        INNER JOIN v9.member_community_topics AS topic
          ON topic.id = reply.topic_id
          AND topic.organization_id = reply.organization_id
          AND topic.status = 'published'
        INNER JOIN v9.user_accounts AS account
          ON account.id = reply.author_user_id
        LEFT JOIN v9.people AS person
          ON person.id = account.person_id
        WHERE reply.organization_id = ${identity.organizationId}
          AND (
            reply.status = 'published'
            OR (reply.author_user_id = ${identity.userId} AND reply.status IN ('pending','rejected','hidden','withdrawn'))
            OR (${canModerate} AND reply.status IN ('rejected','hidden'))
          )
        ORDER BY reply.created_at
        LIMIT 500
      `,
    ]);
    topics = rowsFromResult<TopicRow>(topicResult);
    replies = rowsFromResult<ReplyRow>(replyResult);

    if (canModerate) {
      const [pendingTopicResult, pendingReplyResult, reportResult] = await Promise.all([
        sql`
          SELECT
            topic.id::text AS id,
            topic.title,
            topic.body,
            topic.status,
            topic.moderation_note,
            topic.created_at::text AS created_at,
            topic.author_user_id::text AS author_user_id,
            COALESCE(person.full_name, account.email) AS author_name,
            0::int AS reply_count
          FROM v9.member_community_topics AS topic
          INNER JOIN v9.user_accounts AS account ON account.id = topic.author_user_id
          LEFT JOIN v9.people AS person ON person.id = account.person_id
          WHERE topic.organization_id = ${identity.organizationId}
            AND topic.status = 'pending'
          ORDER BY topic.created_at
          LIMIT 100
        `,
        sql`
          SELECT
            reply.id::text AS id,
            reply.topic_id::text AS topic_id,
            reply.body,
            reply.status,
            reply.moderation_note,
            reply.created_at::text AS created_at,
            reply.author_user_id::text AS author_user_id,
            COALESCE(person.full_name, account.email) AS author_name
          FROM v9.member_community_replies AS reply
          INNER JOIN v9.member_community_topics AS topic
            ON topic.id = reply.topic_id
            AND topic.organization_id = reply.organization_id
            AND topic.status = 'published'
          INNER JOIN v9.user_accounts AS account ON account.id = reply.author_user_id
          LEFT JOIN v9.people AS person ON person.id = account.person_id
          WHERE reply.organization_id = ${identity.organizationId}
            AND reply.status = 'pending'
          ORDER BY reply.created_at
          LIMIT 200
        `,
        sql`
          SELECT
            report.id::text AS id,
            report.topic_id::text AS topic_id,
            report.reply_id::text AS reply_id,
            report.reason,
            report.details,
            report.created_at::text AS created_at,
            COALESCE(reporter.full_name, reporter_account.email) AS reporter_name,
            topic.title AS target_title,
            COALESCE(reply.body, topic.body) AS target_body,
            COALESCE(topic_author.full_name, topic_author_account.email,
              reply_author.full_name, reply_author_account.email) AS target_author
          FROM v9.member_community_reports AS report
          LEFT JOIN v9.member_community_topics AS topic
            ON topic.id = report.topic_id
            AND topic.organization_id = report.organization_id
          LEFT JOIN v9.user_accounts AS topic_author_account
            ON topic_author_account.id = topic.author_user_id
          LEFT JOIN v9.people AS topic_author
            ON topic_author.id = topic_author_account.person_id
          LEFT JOIN v9.member_community_replies AS reply
            ON reply.id = report.reply_id
            AND reply.organization_id = report.organization_id
          LEFT JOIN v9.user_accounts AS reply_author_account
            ON reply_author_account.id = reply.author_user_id
          LEFT JOIN v9.people AS reply_author
            ON reply_author.id = reply_author_account.person_id
          INNER JOIN v9.memberships AS reporter_membership
            ON reporter_membership.id = report.reporter_membership_id
            AND reporter_membership.organization_id = report.organization_id
          INNER JOIN v9.people AS reporter
            ON reporter.id = reporter_membership.person_id
          INNER JOIN v9.user_accounts AS reporter_account
            ON reporter_account.id = report.reporter_user_id
          WHERE report.organization_id = ${identity.organizationId}
            AND report.status = 'open'
          ORDER BY report.created_at
          LIMIT 200
        `,
      ]);
      moderationTopics = rowsFromResult<TopicRow>(pendingTopicResult);
      moderationReplies = rowsFromResult<ReplyRow>(pendingReplyResult);
      reports = rowsFromResult<ReportRow>(reportResult);
    }
  } catch (reason) {
    unavailable = true;
    const errorType = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
    console.warn("[member-community] Source unavailable", errorType);
  }

  const repliesByTopic = new Map<string, ReplyRow[]>();
  for (const reply of replies) {
    const list = repliesByTopic.get(reply.topic_id) ?? [];
    list.push(reply);
    repliesByTopic.set(reply.topic_id, list);
  }
  const canPost = !!activeMembershipId && !unavailable;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Komunitas & ruang diskusi"
        description="Ruang diskusi anggota dengan peninjauan konten, pelaporan, dan riwayat moderasi yang tercatat."
        actions={<Badge tone={unavailable ? "warning" : "success"}>{unavailable ? "Sumber tidak tersedia" : "Moderasi aktif"}</Badge>}
      />

      {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan komunitas">{notice.text}</Notice></div> : null}
      {unavailable ? (
        <div className="mb-4"><Notice tone="warning" title="Layanan komunitas belum dapat dimuat">Daftar topik, balasan, dan antrean moderasi disembunyikan sampai koneksi database pulih.</Notice></div>
      ) : null}

      {canReadMemberArea && !canModerate && !activeMembershipId ? (
        <div className="mb-4">
          <Notice tone="warning" title="Keanggotaan belum aktif">
            Anda dapat membaca topik yang telah diterbitkan, tetapi mengirim topik, membalas, atau melaporkan konten memerlukan keanggotaan aktif dan terverifikasi.
          </Notice>
        </div>
      ) : null}

      {canModerate ? (
        <Card className="mb-5">
          <CardHeader
            title="Antrean moderasi"
            subtitle="Konten anggota hanya diterbitkan setelah diperiksa. Penolakan dan penyembunyian wajib diberi alasan."
            action={<Badge tone={moderationTopics.length + moderationReplies.length + reports.length ? "warning" : "success"}>{moderationTopics.length + moderationReplies.length + reports.length} perlu ditinjau</Badge>}
          />
          {moderationTopics.length || moderationReplies.length || reports.length ? (
            <div className="divide-y divide-line">
              {moderationTopics.map((topic) => (
                <article key={topic.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">Topik baru</Badge>
                    <span className="text-[10px] text-muted2">{topic.author_name} · {dateLabel(topic.created_at)}</span>
                  </div>
                  <h3 className="mt-2 text-[13px] font-semibold text-ink">{topic.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-5 text-ink2">{topic.body}</p>
                  <form action={moderateMemberCommunityTopic} className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-end">
                    <input type="hidden" name="topic_id" value={topic.id} />
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted">Keputusan</label>
                      <select name="decision" defaultValue="published" className="sb-input !h-9 text-[10.5px]">
                        <option value="published">Terbitkan</option>
                        <option value="rejected">Tolak</option>
                        <option value="hidden">Sembunyikan</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted">Alasan jika ditolak / disembunyikan</label>
                      <input name="moderation_note" maxLength={1000} className="sb-input !h-9 text-[10.5px]" placeholder="Alasan moderasi" />
                    </div>
                    <button type="submit" className="sb-btn sb-btn-primary !h-9 text-[10.5px]">Simpan keputusan</button>
                  </form>
                </article>
              ))}

              {moderationReplies.map((reply) => (
                <article key={reply.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">Balasan baru</Badge>
                    <span className="text-[10px] text-muted2">{reply.author_name} · {dateLabel(reply.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-5 text-ink2">{reply.body}</p>
                  <form action={moderateMemberCommunityReply} className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-end">
                    <input type="hidden" name="reply_id" value={reply.id} />
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted">Keputusan</label>
                      <select name="decision" defaultValue="published" className="sb-input !h-9 text-[10.5px]">
                        <option value="published">Terbitkan</option>
                        <option value="rejected">Tolak</option>
                        <option value="hidden">Sembunyikan</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted">Alasan jika ditolak / disembunyikan</label>
                      <input name="moderation_note" maxLength={1000} className="sb-input !h-9 text-[10.5px]" placeholder="Alasan moderasi" />
                    </div>
                    <button type="submit" className="sb-btn sb-btn-primary !h-9 text-[10.5px]">Simpan keputusan</button>
                  </form>
                </article>
              ))}

              {reports.map((report) => (
                <article key={report.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">Laporan anggota</Badge>
                    <span className="text-[10px] text-muted2">{report.reporter_name} · {dateLabel(report.created_at)}</span>
                    <Badge tone="neutral">{reasonLabel[report.reason] ?? report.reason}</Badge>
                  </div>
                  {report.target_title ? <h3 className="mt-2 text-[12px] font-semibold text-ink">{report.target_title}</h3> : null}
                  {report.target_body ? <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[10.5px] text-muted">{report.target_body}</p> : null}
                  {report.target_author ? <p className="mt-1 text-[10px] text-muted2">Penulis: {report.target_author}</p> : null}
                  {report.details ? <p className="mt-1 text-[10.5px] text-ink2">Keterangan pelapor: {report.details}</p> : null}
                  <form action={resolveMemberCommunityReport} className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-end">
                    <input type="hidden" name="report_id" value={report.id} />
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted">Hasil penanganan</label>
                      <select name="decision" defaultValue="resolved" className="sb-input !h-9 text-[10.5px]">
                        <option value="resolved">Ditangani</option>
                        <option value="dismissed">Tidak terbukti</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted">Catatan moderator</label>
                      <input name="review_note" maxLength={1000} className="sb-input !h-9 text-[10.5px]" placeholder="Tindakan atau alasan" />
                    </div>
                    <button type="submit" className="sb-btn sb-btn-outline !h-9 text-[10.5px]">Simpan penanganan</button>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-4"><EmptyState title="Antrean moderasi bersih" body="Belum ada topik, balasan, atau laporan yang menunggu tinjauan." /></div>
          )}
        </Card>
      ) : null}

      {canPost ? (
        <Card className="mb-5">
          <CardHeader title="Buat topik diskusi" subtitle="Topik baru berstatus menunggu moderasi dan belum terlihat oleh anggota lain." />
          <form action={createMemberCommunityTopic} className="grid gap-3 p-4">
            <div>
              <label htmlFor="community-title" className="mb-1 block text-[11px] font-semibold text-ink2">Judul topik</label>
              <input id="community-title" name="title" required minLength={5} maxLength={180} className="sb-input" placeholder="Pokok diskusi atau pertanyaan" />
            </div>
            <div>
              <label htmlFor="community-body" className="mb-1 block text-[11px] font-semibold text-ink2">Isi diskusi</label>
              <textarea id="community-body" name="body" required minLength={10} maxLength={5000} rows={4} className="sb-input !h-auto resize-y py-2.5" placeholder="Jelaskan hal yang ingin dibahas dengan bahasa yang santun dan jelas." />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-muted2">Maksimal 3 topik per anggota dalam 1 jam. Tautan dan lampiran belum diaktifkan.</p>
              <button type="submit" disabled={unavailable} className="sb-btn sb-btn-primary !h-9 text-[11px]">Kirim untuk moderasi</button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {topics.map((topic) => {
          const topicReplies = repliesByTopic.get(topic.id) ?? [];
          const ownPending = topic.author_user_id === identity.userId && topic.status !== "published";
          return (
            <Card key={topic.id}>
              <article className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone[topic.status]}>{statusLabel[topic.status]}</Badge>
                  <span className="text-[10px] text-muted2">{topic.author_name} · {dateLabel(topic.created_at)}</span>
                  <Badge tone="neutral">{topic.reply_count} balasan terbit</Badge>
                </div>
                <h2 className="mt-2 text-[14px] font-semibold text-ink">{topic.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-5 text-ink2">{topic.body}</p>
                {ownPending ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-[10.5px] text-warning">Topik ini hanya terlihat oleh Anda dan moderator sampai diterbitkan.</p>
                    {topic.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <details className="min-w-[240px] flex-1">
                          <summary className="sb-btn sb-btn-outline !h-8 cursor-pointer !px-3 text-[10px]">Edit draf topik</summary>
                          <form action={updateOwnCommunityTopic} className="mt-2 space-y-2 rounded-lg border border-line bg-paper p-3">
                            <input type="hidden" name="topic_id" value={topic.id} />
                            <label className="block text-[10px] font-semibold text-muted">Judul</label>
                            <input name="title" required minLength={5} maxLength={180} defaultValue={topic.title} className="sb-input !h-9 text-[10.5px]" />
                            <label className="block text-[10px] font-semibold text-muted">Isi diskusi</label>
                            <textarea name="body" required minLength={10} maxLength={5000} rows={4} defaultValue={topic.body} className="sb-input !h-auto min-h-[90px] resize-y py-2 text-[10.5px]" />
                            <button type="submit" className="sb-btn sb-btn-primary !h-8 text-[10px]">Simpan draf</button>
                          </form>
                        </details>
                        <form action={withdrawOwnCommunityTopic}>
                          <input type="hidden" name="topic_id" value={topic.id} />
                          <button type="submit" className="sb-btn sb-btn-ghost !h-8 text-[10px]">Tarik topik</button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {topic.status === "rejected" && topic.moderation_note ? (
                  <Notice tone="warning" title="Catatan moderator">{topic.moderation_note}</Notice>
                ) : null}
                {canPost && topic.status === "published" && topic.author_user_id !== identity.userId ? <ReportForm targetType="topic" targetId={topic.id} /> : null}

                {topic.status === "published" ? (
                  <div className="mt-4 border-t border-line pt-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Balasan anggota</div>
                    {topicReplies.length ? (
                      <div className="mt-2 divide-y divide-line rounded-lg border border-line">
                        {topicReplies.map((reply) => (
                          <div key={reply.id} className="p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {reply.status !== "published" ? <Badge tone={statusTone[reply.status]}>{statusLabel[reply.status]}</Badge> : null}
                              <span className="text-[10px] text-muted2">{reply.author_name} · {dateLabel(reply.created_at)}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-ink2">{reply.body}</p>
                            {reply.author_user_id === identity.userId && reply.status === "pending" ? (
                              <div className="mt-2 flex flex-wrap items-start gap-2">
                                <span className="pt-1 text-[10px] text-warning">Menunggu moderasi</span>
                                <details className="min-w-[220px] flex-1">
                                  <summary className="sb-btn sb-btn-outline !h-7 cursor-pointer !px-2.5 text-[10px]">Edit draf balasan</summary>
                                  <form action={updateOwnCommunityReply} className="mt-2 space-y-2 rounded-lg border border-line bg-paper p-3">
                                    <input type="hidden" name="reply_id" value={reply.id} />
                                    <textarea name="body" required minLength={2} maxLength={2500} rows={3} defaultValue={reply.body} className="sb-input !h-auto min-h-[70px] resize-y py-2 text-[10.5px]" />
                                    <button type="submit" className="sb-btn sb-btn-primary !h-8 text-[10px]">Simpan draf</button>
                                  </form>
                                </details>
                                <form action={withdrawOwnCommunityReply}>
                                  <input type="hidden" name="reply_id" value={reply.id} />
                                  <button type="submit" className="sb-btn sb-btn-ghost !h-7 text-[10px]">Tarik</button>
                                </form>
                              </div>
                            ) : null}
                            {canPost && reply.status === "published" && reply.author_user_id !== identity.userId ? <ReportForm targetType="reply" targetId={reply.id} /> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10.5px] text-muted2">Belum ada balasan terbit.</p>
                    )}
                    {canPost ? (
                      <form action={createMemberCommunityReply} className="mt-3 space-y-2">
                        <input type="hidden" name="topic_id" value={topic.id} />
                        <label htmlFor={`community-reply-${topic.id}`} className="block text-[10.5px] font-semibold text-muted">Tulis balasan</label>
                        <textarea id={`community-reply-${topic.id}`} name="body" required minLength={2} maxLength={2500} rows={2} className="sb-input !h-auto resize-y py-2" placeholder="Tulis tanggapan yang relevan dan santun." />
                        <div className="flex justify-end">
                          <button type="submit" disabled={unavailable} className="sb-btn sb-btn-outline !h-8 text-[10.5px]">Kirim balasan untuk moderasi</button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </article>
            </Card>
          );
        })}
        {!topics.length && !unavailable ? (
          <Card className="p-5">
            <EmptyState title="Belum ada topik diskusi" body={canPost ? "Jadilah anggota pertama yang mengirim topik. Topik akan tampil setelah pemeriksaan moderator." : "Topik yang disetujui akan tampil di sini."} />
          </Card>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Notice tone="info" title="Aturan ruang diskusi">
          Gunakan bahasa yang santun, hindari data pribadi, dan tetap pada topik kegiatan organisasi. Tautan serta lampiran belum diizinkan.
        </Notice>
        <Notice tone="warning" title="Pengawasan konten">
          Topik dan balasan harus disetujui moderator. Anggota dapat melaporkan konten terbit; moderator mencatat keputusan dan alasannya. Catatan tidak dihapus permanen.
        </Notice>
      </div>
    </div>
  );
}
