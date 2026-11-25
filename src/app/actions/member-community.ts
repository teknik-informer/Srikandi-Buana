"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

interface MutationRow {
  id: string;
}

function communityPath(result: string): string {
  return `/app/anggota/komunitas?result=${encodeURIComponent(result)}`;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBody(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function auditError(area: string, reason: unknown): void {
  console.warn(`[${area}] Mutation failed`, safeErrorType(reason));
}

export async function createMemberCommunityTopic(formData: FormData): Promise<void> {
  const identity = await requireIdentity("member:self");
  const title = normalize(String(formData.get("title") ?? ""));
  const body = normalizeBody(String(formData.get("body") ?? ""));

  if (title.length < 5 || title.length > 180 || body.length < 10 || body.length > 5000) {
    redirect(communityPath("topic-invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH active_membership AS MATERIALIZED (
        SELECT membership.id
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
      ),
      community_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(
          hashtextextended(${identity.organizationId}::text || ':community:' || ${identity.userId}::text, 0)
        ) AS locked
      ),
      recent AS MATERIALIZED (
        SELECT count(*)::int AS recent_count
        FROM v9.member_community_topics AS topic
        WHERE topic.organization_id = ${identity.organizationId}
          AND topic.author_user_id = ${identity.userId}
          AND topic.created_at > now() - interval '1 hour'
      ),
      inserted AS (
        INSERT INTO v9.member_community_topics (
          organization_id, membership_id, author_user_id, updated_by,
          title, body, status
        )
        SELECT
          ${identity.organizationId}, membership.id, ${identity.userId}, ${identity.userId},
          ${title}, ${body}, 'pending'
        FROM active_membership AS membership
        CROSS JOIN community_lock
        CROSS JOIN recent
        WHERE recent.recent_count < 3
        RETURNING id, organization_id, title, status, membership_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id, ${identity.userId}, 'member_community_topic.created',
          'member_community_topic', id::text,
          jsonb_build_object('title', title, 'status', status, 'membership_id', membership_id)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    auditError("member-community-topic-create", reason);
    redirect(communityPath("topic-blocked"));
  }

  if (!created) redirect(communityPath("topic-rate-or-membership-blocked"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("topic-submitted"));
}

export async function createMemberCommunityReply(formData: FormData): Promise<void> {
  const identity = await requireIdentity("member:self");
  const topicId = String(formData.get("topic_id") ?? "").trim();
  const body = normalizeBody(String(formData.get("body") ?? ""));

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(topicId)
    || body.length < 2 || body.length > 2500) {
    redirect(communityPath("reply-invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH active_membership AS MATERIALIZED (
        SELECT membership.id
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
      ),
      community_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(
          hashtextextended(${identity.organizationId}::text || ':community:' || ${identity.userId}::text, 0)
        ) AS locked
      ),
      recent AS MATERIALIZED (
        SELECT count(*)::int AS recent_count
        FROM v9.member_community_replies AS reply
        WHERE reply.organization_id = ${identity.organizationId}
          AND reply.author_user_id = ${identity.userId}
          AND reply.created_at > now() - interval '1 hour'
      ),
      inserted AS (
        INSERT INTO v9.member_community_replies (
          organization_id, topic_id, membership_id, author_user_id, updated_by,
          body, status
        )
        SELECT
          ${identity.organizationId}, ${topicId}::uuid, membership.id,
          ${identity.userId}, ${identity.userId}, ${body}, 'pending'
        FROM active_membership AS membership
        CROSS JOIN community_lock
        CROSS JOIN recent
        WHERE recent.recent_count < 10
          AND EXISTS (
            SELECT 1
            FROM v9.member_community_topics AS topic
            WHERE topic.id = ${topicId}::uuid
              AND topic.organization_id = ${identity.organizationId}
              AND topic.status = 'published'
          )
        RETURNING id, organization_id, topic_id, body, status, membership_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id, ${identity.userId}, 'member_community_reply.created',
          'member_community_reply', id::text,
          jsonb_build_object('topic_id', topic_id, 'status', status, 'membership_id', membership_id)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id FROM inserted INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    auditError("member-community-reply-create", reason);
    redirect(communityPath("reply-blocked"));
  }

  if (!created) redirect(communityPath("reply-rate-or-topic-blocked"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("reply-submitted"));
}

export async function reportMemberCommunityContent(formData: FormData): Promise<void> {
  const identity = await requireIdentity("member:self");
  const targetType = String(formData.get("target_type") ?? "").trim();
  const targetId = String(formData.get("target_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const details = normalizeBody(String(formData.get("details") ?? ""));

  if (
    !["topic","reply"].includes(targetType) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId) ||
    !["spam","harassment","personal_data","misinformation","other"].includes(reason) ||
    details.length > 1500
  ) redirect(communityPath("report-invalid"));

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH active_membership AS MATERIALIZED (
        SELECT membership.id
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
      ),
      inserted AS (
        INSERT INTO v9.member_community_reports (
          organization_id, reporter_membership_id, reporter_user_id,
          topic_id, reply_id, reason, details, status
        )
        SELECT
          ${identity.organizationId}, membership.id, ${identity.userId},
          CASE WHEN ${targetType} = 'topic' THEN ${targetId}::uuid ELSE NULL::uuid END,
          CASE WHEN ${targetType} = 'reply' THEN ${targetId}::uuid ELSE NULL::uuid END,
          ${reason}, NULLIF(${details}, ''), 'open'
        FROM active_membership AS membership
        RETURNING id, organization_id, topic_id, reply_id, reason, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'member_community_report.created',
          'member_community_report', id::text,
          jsonb_build_object('topic_id', topic_id, 'reply_id', reply_id, 'reason', reason, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id FROM inserted INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reasonError) {
    auditError("member-community-report-create", reasonError);
    const message = reasonError instanceof Error ? reasonError.message.toLowerCase() : "";
    if (message.includes("member_community_topic_report_once_idx")
      || message.includes("member_community_reply_report_once_idx")) {
      redirect(communityPath("report-duplicate"));
    }
    redirect(communityPath("report-blocked"));
  }

  if (!created) redirect(communityPath("report-membership-blocked"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("report-submitted"));
}

export async function moderateMemberCommunityTopic(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  if (!can(identity, "member:community:moderate")) redirect("/app");

  const topicId = String(formData.get("topic_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = normalizeBody(String(formData.get("moderation_note") ?? ""));

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(topicId) ||
    !["published","rejected","hidden"].includes(decision) ||
    (["rejected","hidden"].includes(decision) && note.length < 3) ||
    note.length > 1000
  ) redirect(communityPath("moderation-invalid"));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT topic.id, topic.status, topic.title
        FROM v9.member_community_topics AS topic
        WHERE topic.id = ${topicId}
          AND topic.organization_id = ${identity.organizationId}
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.member_community_topics AS topic
        SET status = ${decision},
          moderated_by = ${identity.userId},
          moderated_at = now(),
          moderation_note = NULLIF(${note}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        FROM before_row
        WHERE topic.id = before_row.id
          AND topic.status IN ('pending','published','hidden')
        RETURNING topic.id, topic.organization_id, topic.status, topic.title
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          'member_community_topic.' || updated.status,
          'member_community_topic', updated.id::text,
          jsonb_build_object('status', before_row.status, 'title', before_row.title),
          jsonb_build_object('status', updated.status, 'title', updated.title, 'moderation_note', ${note})
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    auditError("member-community-topic-moderate", reason);
    redirect(communityPath("topic-moderation-blocked"));
  }

  if (!changed) redirect(communityPath("topic-moderation-stale"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("moderation-saved"));
}

export async function moderateMemberCommunityReply(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  if (!can(identity, "member:community:moderate")) redirect("/app");

  const replyId = String(formData.get("reply_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = normalizeBody(String(formData.get("moderation_note") ?? ""));

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(replyId) ||
    !["published","rejected","hidden"].includes(decision) ||
    (["rejected","hidden"].includes(decision) && note.length < 3) ||
    note.length > 1000
  ) redirect(communityPath("moderation-invalid"));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT reply.id, reply.status, reply.topic_id
        FROM v9.member_community_replies AS reply
        WHERE reply.id = ${replyId}
          AND reply.organization_id = ${identity.organizationId}
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.member_community_replies AS reply
        SET status = ${decision},
          moderated_by = ${identity.userId},
          moderated_at = now(),
          moderation_note = NULLIF(${note}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        FROM before_row
        WHERE reply.id = before_row.id
          AND reply.status IN ('pending','published','hidden')
        RETURNING reply.id, reply.organization_id, reply.status, reply.topic_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          'member_community_reply.' || updated.status,
          'member_community_reply', updated.id::text,
          jsonb_build_object('status', before_row.status, 'topic_id', before_row.topic_id),
          jsonb_build_object('status', updated.status, 'topic_id', updated.topic_id, 'moderation_note', ${note})
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    auditError("member-community-reply-moderate", reason);
    redirect(communityPath("reply-moderation-blocked"));
  }

  if (!changed) redirect(communityPath("reply-moderation-stale"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("moderation-saved"));
}

export async function resolveMemberCommunityReport(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  if (!can(identity, "member:community:moderate")) redirect("/app");

  const reportId = String(formData.get("report_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = normalizeBody(String(formData.get("review_note") ?? ""));

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId) ||
    !["resolved","dismissed"].includes(decision) ||
    note.length > 1000
  ) redirect(communityPath("report-review-invalid"));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT report.id, report.status, report.reason
        FROM v9.member_community_reports AS report
        WHERE report.id = ${reportId}
          AND report.organization_id = ${identity.organizationId}
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.member_community_reports AS report
        SET status = ${decision},
          reviewed_by = ${identity.userId},
          reviewed_at = now(),
          review_note = NULLIF(${note}, '')
        FROM before_row
        WHERE report.id = before_row.id
          AND report.status = 'open'
        RETURNING report.id, report.organization_id, report.status, report.reason
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          'member_community_report.' || updated.status,
          'member_community_report', updated.id::text,
          jsonb_build_object('status', before_row.status, 'reason', before_row.reason),
          jsonb_build_object('status', updated.status, 'reason', updated.reason, 'review_note', ${note})
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    auditError("member-community-report-review", reason);
    redirect(communityPath("report-review-blocked"));
  }

  if (!changed) redirect(communityPath("report-review-stale"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("report-review-saved"));
}


export async function updateOwnCommunityTopic(formData: FormData): Promise<void> {
  const identity = await requireIdentity("member:self");
  const topicId = String(formData.get("topic_id") ?? "").trim();
  const title = normalize(String(formData.get("title") ?? ""));
  const body = normalizeBody(String(formData.get("body") ?? ""));

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(topicId) ||
    title.length < 5 || title.length > 180 ||
    body.length < 10 || body.length > 5000
  ) redirect(communityPath("topic-invalid"));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT topic.id, topic.organization_id, topic.title, topic.body
        FROM v9.member_community_topics AS topic
        WHERE topic.id = ${topicId}
          AND topic.organization_id = ${identity.organizationId}
          AND topic.author_user_id = ${identity.userId}
          AND topic.status = 'pending'
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.member_community_topics AS topic
        SET title = ${title},
          body = ${body},
          updated_by = ${identity.userId},
          updated_at = now()
        FROM before_row
        WHERE topic.id = before_row.id
        RETURNING topic.id, topic.organization_id, topic.title, topic.body
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT
          updated.organization_id, ${identity.userId},
          'member_community_topic.edited', 'member_community_topic', updated.id::text,
          jsonb_build_object('title', before_row.title, 'body', before_row.body),
          jsonb_build_object('title', updated.title, 'body', updated.body)
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    auditError("member-community-topic-update", reason);
    redirect(communityPath("topic-update-blocked"));
  }

  if (!changed) redirect(communityPath("topic-update-stale"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("topic-updated"));
}

export async function withdrawOwnCommunityTopic(formData: FormData): Promise<void> {
  const identity = await requireIdentity("member:self");
  const topicId = String(formData.get("topic_id") ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(topicId)) {
    redirect(communityPath("topic-withdraw-blocked"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT topic.id, topic.organization_id, topic.status, topic.title
        FROM v9.member_community_topics AS topic
        WHERE topic.id = ${topicId}
          AND topic.organization_id = ${identity.organizationId}
          AND topic.author_user_id = ${identity.userId}
          AND topic.status = 'pending'
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.member_community_topics AS topic
        SET status = 'withdrawn',
          updated_by = ${identity.userId},
          updated_at = now()
        FROM before_row
        WHERE topic.id = before_row.id
        RETURNING topic.id, topic.organization_id, topic.status, topic.title
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          'member_community_topic.withdrawn', 'member_community_topic', updated.id::text,
          jsonb_build_object('status', before_row.status, 'title', before_row.title),
          jsonb_build_object('status', updated.status, 'title', updated.title)
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    auditError("member-community-topic-withdraw", reason);
    redirect(communityPath("topic-withdraw-blocked"));
  }

  if (!changed) redirect(communityPath("topic-withdraw-stale"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("topic-withdrawn"));
}

export async function updateOwnCommunityReply(formData: FormData): Promise<void> {
  const identity = await requireIdentity("member:self");
  const replyId = String(formData.get("reply_id") ?? "").trim();
  const body = normalizeBody(String(formData.get("body") ?? ""));

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(replyId) ||
    body.length < 2 || body.length > 2500
  ) redirect(communityPath("reply-invalid"));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT reply.id, reply.organization_id, reply.body
        FROM v9.member_community_replies AS reply
        WHERE reply.id = ${replyId}
          AND reply.organization_id = ${identity.organizationId}
          AND reply.author_user_id = ${identity.userId}
          AND reply.status = 'pending'
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.member_community_replies AS reply
        SET body = ${body},
          updated_by = ${identity.userId},
          updated_at = now()
        FROM before_row
        WHERE reply.id = before_row.id
        RETURNING reply.id, reply.organization_id, reply.body
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          'member_community_reply.edited', 'member_community_reply', updated.id::text,
          jsonb_build_object('body', before_row.body),
          jsonb_build_object('body', updated.body)
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    auditError("member-community-reply-update", reason);
    redirect(communityPath("reply-update-blocked"));
  }

  if (!changed) redirect(communityPath("reply-update-stale"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("reply-updated"));
}

export async function withdrawOwnCommunityReply(formData: FormData): Promise<void> {
  const identity = await requireIdentity("member:self");
  const replyId = String(formData.get("reply_id") ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(replyId)) {
    redirect(communityPath("reply-withdraw-blocked"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH before_row AS MATERIALIZED (
        SELECT reply.id, reply.organization_id, reply.status, reply.topic_id
        FROM v9.member_community_replies AS reply
        WHERE reply.id = ${replyId}
          AND reply.organization_id = ${identity.organizationId}
          AND reply.author_user_id = ${identity.userId}
          AND reply.status = 'pending'
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.member_community_replies AS reply
        SET status = 'withdrawn',
          updated_by = ${identity.userId},
          updated_at = now()
        FROM before_row
        WHERE reply.id = before_row.id
        RETURNING reply.id, reply.organization_id, reply.status, reply.topic_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id,
          before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          'member_community_reply.withdrawn', 'member_community_reply', updated.id::text,
          jsonb_build_object('status', before_row.status, 'topic_id', before_row.topic_id),
          jsonb_build_object('status', updated.status, 'topic_id', updated.topic_id)
        FROM updated
        INNER JOIN before_row ON before_row.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    auditError("member-community-reply-withdraw", reason);
    redirect(communityPath("reply-withdraw-blocked"));
  }

  if (!changed) redirect(communityPath("reply-withdraw-stale"));
  revalidatePath("/app/anggota/komunitas");
  redirect(communityPath("reply-withdrawn"));
}
