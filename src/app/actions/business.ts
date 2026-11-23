"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

type MutationRow = { id: string; reference_no?: string };

const PARTNER_TYPES = ["pemerintah","ngo","swasta","koperasi","akademik","komunitas","perorangan","lainnya"] as const;
const PARTNER_STATUSES = ["prospect","active","inactive","ended"] as const;
const OPPORTUNITY_TYPES = ["akses_pasar","pengadaan","hibah","pelatihan","riset","program","lainnya"] as const;
const OPPORTUNITY_STAGES = ["lead","qualified","proposal","negotiation","won","lost","on_hold"] as const;
const AGREEMENT_TYPES = ["mou","pks","kontrak","loi","nota_kesepahaman","lainnya"] as const;
const AGREEMENT_STATUSES = ["review","signed","active","expired","terminated"] as const;
const MILESTONE_STATUSES = ["open","in_progress","completed","blocked","cancelled"] as const;

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function failure(area: string, reason: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    reason instanceof Error ? reason.message : "Unknown error",
  );
}

function businessPath(result: string): string {
  return `/app/bidang/usaha/data?result=${encodeURIComponent(result)}`;
}

function requireBusinessWrite(identity: Awaited<ReturnType<typeof requireIdentity>>): void {
  if (!can(identity, "field:usaha:business:write")) redirect("/app");
}

function refreshBusiness(): void {
  revalidatePath("/app/bidang/usaha");
  revalidatePath("/app/bidang/usaha/data");
  revalidatePath("/app/bidang/usaha/rencana");
  revalidatePath("/app/bidang/usaha/laporan");
}

export async function createBusinessPartner(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const name = normalize(String(formData.get("partner_name") ?? ""));
  const type = String(formData.get("partner_type") ?? "").trim();
  const contactName = normalize(String(formData.get("contact_name") ?? ""));
  const contactRole = normalize(String(formData.get("contact_role") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const website = String(formData.get("website") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const relationship = String(formData.get("relationship_summary") ?? "").trim();
  const source = normalize(String(formData.get("source_label") ?? ""));
  const owner = normalize(String(formData.get("owner_label") ?? ""));
  const sinceDate = String(formData.get("since_date") ?? "").trim();
  const nextReview = String(formData.get("next_review_date") ?? "").trim();

  if (
    name.length < 2 || name.length > 240 ||
    !PARTNER_TYPES.includes(type as (typeof PARTNER_TYPES)[number]) ||
    contactName.length > 160 || contactRole.length > 160 ||
    phone.length > 60 || email.length > 254 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    website.length > 500 || address.length > 1000 ||
    relationship.length > 5000 || source.length > 160 || owner.length > 160 ||
    (sinceDate && !validDate(sinceDate)) ||
    (nextReview && !validDate(nextReview)) ||
    (sinceDate && nextReview && nextReview < sinceDate)
  ) {
    redirect(businessPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_partners (
          organization_id, field_key, partner_name, partner_type,
          status, contact_name, contact_role, phone, email, website,
          address, relationship_summary, source_label, owner_label,
          since_date, next_review_date, created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          ${name},
          ${type},
          'prospect',
          NULLIF(${contactName}, ''),
          NULLIF(${contactRole}, ''),
          NULLIF(${phone}, ''),
          NULLIF(${email}, ''),
          NULLIF(${website}, ''),
          NULLIF(${address}, ''),
          NULLIF(${relationship}, ''),
          NULLIF(${source}, ''),
          NULLIF(${owner}, ''),
          NULLIF(${sinceDate}, '')::date,
          NULLIF(${nextReview}, '')::date,
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
        RETURNING id, organization_id, field_key, reference_no, partner_name, partner_type, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_partner.created',
          'business_partner', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'partner_name', partner_name, 'partner_type', partner_type, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    failure("business-partner-create", reason);
    redirect(businessPath("error"));
  }

  if (!created) redirect(businessPath("field-unavailable"));
  refreshBusiness();
  redirect(businessPath("partner-created"));
}

export async function updateBusinessPartnerStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const partnerId = String(formData.get("partner_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!validUuid(partnerId) || !PARTNER_STATUSES.includes(status as (typeof PARTNER_STATUSES)[number])) {
    redirect(businessPath("invalid"));
  }
  if (status === "ended" && !can(identity, "organization:team:approve")) redirect("/app");

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_partners
        SET status = ${status}, updated_by = ${identity.userId}, updated_at = now()
        WHERE id = ${partnerId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status <> 'ended'
        RETURNING id, organization_id, field_key, reference_no, partner_name, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_partner.status.' || status,
          'business_partner', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'partner_name', partner_name, 'status', status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    failure("business-partner-status", reason);
    redirect(businessPath("error"));
  }

  if (!updated) redirect(businessPath("partner-stale"));
  refreshBusiness();
  redirect(businessPath("partner-updated"));
}

export async function createBusinessOpportunity(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const partnerId = String(formData.get("partner_id") ?? "").trim();
  const title = normalize(String(formData.get("title") ?? ""));
  const type = String(formData.get("opportunity_type") ?? "").trim();
  const estimatedText = String(formData.get("estimated_value") ?? "").trim();
  const estimatedValue = estimatedText === "" ? null : Number(estimatedText);
  const currency = String(formData.get("currency_code") ?? "IDR").trim().toUpperCase();
  const decisionDate = String(formData.get("expected_decision_date") ?? "").trim();
  const nextAction = String(formData.get("next_action") ?? "").trim();
  const nextActionDate = String(formData.get("next_action_date") ?? "").trim();
  const owner = normalize(String(formData.get("owner_label") ?? ""));
  const description = String(formData.get("description") ?? "").trim();

  if (
    (partnerId && !validUuid(partnerId)) ||
    title.length < 3 || title.length > 300 ||
    !OPPORTUNITY_TYPES.includes(type as (typeof OPPORTUNITY_TYPES)[number]) ||
    (estimatedValue !== null && (!Number.isFinite(estimatedValue) || estimatedValue < 0 || estimatedValue > 1_000_000_000_000_000)) ||
    !/^[A-Z]{3}$/.test(currency) ||
    (decisionDate && !validDate(decisionDate)) ||
    nextAction.length > 1000 || (nextActionDate && !validDate(nextActionDate)) ||
    owner.length > 160 || description.length > 5000
  ) {
    redirect(businessPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_opportunities (
          organization_id, field_key, partner_id, title, opportunity_type,
          stage, estimated_value, currency_code, expected_decision_date,
          next_action, next_action_date, owner_label, description,
          created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          partner.id,
          ${title},
          ${type},
          'lead',
          ${estimatedValue},
          ${currency},
          NULLIF(${decisionDate}, '')::date,
          NULLIF(${nextAction}, ''),
          NULLIF(${nextActionDate}, '')::date,
          NULLIF(${owner}, ''),
          NULLIF(${description}, ''),
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        LEFT JOIN v9.business_partners AS partner
          ON partner.id = NULLIF(${partnerId}, '')::uuid
          AND partner.organization_id = application.organization_id
          AND partner.field_key = application.field_key
          AND partner.status <> 'ended'
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
          AND (NULLIF(${partnerId}, '') IS NULL OR partner.id IS NOT NULL)
        RETURNING id, organization_id, field_key, reference_no, title, stage, partner_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_opportunity.created',
          'business_opportunity', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'title', title, 'stage', stage, 'partner_id', partner_id)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    failure("business-opportunity-create", reason);
    redirect(businessPath("error"));
  }

  if (!created) redirect(businessPath("partner-unavailable"));
  refreshBusiness();
  redirect(businessPath("opportunity-created"));
}

export async function updateBusinessOpportunityStage(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const opportunityId = String(formData.get("opportunity_id") ?? "").trim();
  const nextStage = String(formData.get("stage") ?? "").trim();
  const outcomeNote = String(formData.get("outcome_note") ?? "").trim();

  if (
    !validUuid(opportunityId) ||
    !OPPORTUNITY_STAGES.includes(nextStage as (typeof OPPORTUNITY_STAGES)[number]) ||
    outcomeNote.length > 3000
  ) {
    redirect(businessPath("invalid"));
  }

  if (["won", "lost"].includes(nextStage) && !can(identity, "organization:team:approve")) {
    redirect("/app");
  }
  if (["won", "lost"].includes(nextStage) && outcomeNote.length < 3) {
    redirect(businessPath("outcome-required"));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_opportunities
        SET
          stage = ${nextStage},
          won_at = CASE WHEN ${nextStage} = 'won' THEN now() ELSE NULL END,
          lost_at = CASE WHEN ${nextStage} = 'lost' THEN now() ELSE NULL END,
          outcome_note = NULLIF(${outcomeNote}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${opportunityId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND (
            (stage = 'lead' AND ${nextStage} IN ('qualified','on_hold','lost'))
            OR (stage = 'qualified' AND ${nextStage} IN ('proposal','on_hold','lost'))
            OR (stage = 'proposal' AND ${nextStage} IN ('negotiation','won','lost','on_hold'))
            OR (stage = 'negotiation' AND ${nextStage} IN ('won','lost','on_hold'))
            OR (stage = 'on_hold' AND ${nextStage} IN ('lead','qualified','proposal','negotiation','won','lost'))
          )
        RETURNING id, organization_id, field_key, reference_no, title, stage, partner_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_opportunity.stage.' || stage,
          'business_opportunity', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'title', title, 'stage', stage, 'partner_id', partner_id)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    failure("business-opportunity-stage", reason);
    redirect(businessPath("error"));
  }

  if (!updated) redirect(businessPath("opportunity-transition-blocked"));
  refreshBusiness();
  redirect(businessPath("opportunity-updated"));
}

export async function createBusinessAgreement(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const partnerId = String(formData.get("partner_id") ?? "").trim();
  const opportunityId = String(formData.get("opportunity_id") ?? "").trim();
  const type = String(formData.get("agreement_type") ?? "").trim();
  const title = normalize(String(formData.get("title") ?? ""));
  const externalReference = String(formData.get("external_reference") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const signatory = normalize(String(formData.get("signatory_label") ?? ""));
  const responsible = normalize(String(formData.get("responsible_label") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();

  if (
    !validUuid(partnerId) ||
    (opportunityId && !validUuid(opportunityId)) ||
    !AGREEMENT_TYPES.includes(type as (typeof AGREEMENT_TYPES)[number]) ||
    title.length < 3 || title.length > 300 ||
    externalReference.length > 120 ||
    (startDate && !validDate(startDate)) ||
    (endDate && !validDate(endDate)) ||
    (startDate && endDate && endDate < startDate) ||
    signatory.length > 160 || responsible.length > 160 || notes.length > 5000
  ) {
    redirect(businessPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_agreements (
          organization_id, field_key, partner_id, opportunity_id, agreement_type,
          title, external_reference, status, start_date, end_date,
          signatory_label, responsible_label, notes, created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          partner.id,
          opportunity.id,
          ${type},
          ${title},
          NULLIF(${externalReference}, ''),
          'draft',
          NULLIF(${startDate}, '')::date,
          NULLIF(${endDate}, '')::date,
          NULLIF(${signatory}, ''),
          NULLIF(${responsible}, ''),
          NULLIF(${notes}, ''),
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        INNER JOIN v9.business_partners AS partner
          ON partner.id = ${partnerId}
          AND partner.organization_id = application.organization_id
          AND partner.field_key = application.field_key
          AND partner.status <> 'ended'
        LEFT JOIN v9.business_opportunities AS opportunity
          ON opportunity.id = NULLIF(${opportunityId}, '')::uuid
          AND opportunity.partner_id = partner.id
          AND opportunity.organization_id = partner.organization_id
          AND opportunity.field_key = partner.field_key
          AND opportunity.stage NOT IN ('won','lost')
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
          AND (NULLIF(${opportunityId}, '') IS NULL OR opportunity.id IS NOT NULL)
        RETURNING id, organization_id, field_key, reference_no, title, status, partner_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_agreement.created',
          'business_agreement', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'title', title, 'status', status, 'partner_id', partner_id)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    failure("business-agreement-create", reason);
    redirect(businessPath("error"));
  }

  if (!created) redirect(businessPath("partner-or-opportunity-unavailable"));
  refreshBusiness();
  redirect(businessPath("agreement-created"));
}

export async function updateBusinessAgreementStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  const agreementId = String(formData.get("agreement_id") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (
    !validUuid(agreementId) ||
    !AGREEMENT_STATUSES.includes(nextStatus as (typeof AGREEMENT_STATUSES)[number]) ||
    notes.length > 5000
  ) {
    redirect(businessPath("invalid"));
  }

  if (["signed","active","expired"].includes(nextStatus) && !can(identity, "organization:team:approve")) {
    redirect("/app");
  }
  if (!can(identity, "field:usaha:business:write") && !can(identity, "organization:team:approve")) {
    redirect("/app");
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_agreements AS agreement
        SET
          status = ${nextStatus},
          approved_by = CASE WHEN ${nextStatus} IN ('signed','active','expired') THEN ${identity.userId} ELSE NULL END,
          approved_at = CASE WHEN ${nextStatus} IN ('signed','active','expired') THEN COALESCE(agreement.approved_at, now()) ELSE NULL END,
          notes = NULLIF(${notes}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE agreement.id = ${agreementId}
          AND agreement.organization_id = ${identity.organizationId}
          AND agreement.field_key = 'usaha'
          AND (
            (agreement.status = 'draft' AND ${nextStatus} = 'review')
            OR (agreement.status = 'review' AND ${nextStatus} IN ('signed','terminated'))
            OR (agreement.status = 'signed' AND ${nextStatus} IN ('active','terminated'))
            OR (agreement.status = 'active' AND ${nextStatus} IN ('expired','terminated'))
          )
        RETURNING agreement.id, agreement.organization_id, agreement.field_key,
          agreement.reference_no, agreement.title, agreement.status, agreement.partner_id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_agreement.status.' || status,
          'business_agreement', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'title', title, 'status', status, 'partner_id', partner_id)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    failure("business-agreement-status", reason);
    redirect(businessPath("error"));
  }

  if (!updated) redirect(businessPath("agreement-transition-blocked"));
  refreshBusiness();
  redirect(businessPath("agreement-updated"));
}

export async function createBusinessMilestone(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const partnerId = String(formData.get("partner_id") ?? "").trim();
  const opportunityId = String(formData.get("opportunity_id") ?? "").trim();
  const agreementId = String(formData.get("agreement_id") ?? "").trim();
  const title = normalize(String(formData.get("title") ?? ""));
  const dueDate = String(formData.get("due_date") ?? "").trim();

  if (
    !validUuid(partnerId) ||
    (Boolean(opportunityId) === Boolean(agreementId)) ||
    (opportunityId && !validUuid(opportunityId)) ||
    (agreementId && !validUuid(agreementId)) ||
    title.length < 3 || title.length > 300 ||
    (dueDate && !validDate(dueDate))
  ) {
    redirect(businessPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_milestones (
          organization_id, field_key, partner_id, opportunity_id, agreement_id,
          title, due_date, status, created_by, updated_by
        )
        SELECT
          partner.organization_id,
          partner.field_key,
          partner.id,
          opportunity.id,
          agreement.id,
          ${title},
          NULLIF(${dueDate}, '')::date,
          'open',
          ${identity.userId},
          ${identity.userId}
        FROM v9.business_partners AS partner
        LEFT JOIN v9.business_opportunities AS opportunity
          ON opportunity.id = NULLIF(${opportunityId}, '')::uuid
          AND opportunity.partner_id = partner.id
          AND opportunity.organization_id = partner.organization_id
          AND opportunity.field_key = partner.field_key
        LEFT JOIN v9.business_agreements AS agreement
          ON agreement.id = NULLIF(${agreementId}, '')::uuid
          AND agreement.partner_id = partner.id
          AND agreement.organization_id = partner.organization_id
          AND agreement.field_key = partner.field_key
          AND agreement.status NOT IN ('terminated','expired')
        WHERE partner.id = ${partnerId}
          AND partner.organization_id = ${identity.organizationId}
          AND partner.field_key = 'usaha'
          AND partner.status <> 'ended'
          AND (
            (NULLIF(${opportunityId}, '') IS NOT NULL AND opportunity.id IS NOT NULL)
            OR (NULLIF(${agreementId}, '') IS NOT NULL AND agreement.id IS NOT NULL)
          )
        RETURNING id, organization_id, field_key, reference_no, partner_id, opportunity_id, agreement_id, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_milestone.created',
          'business_milestone', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'partner_id', partner_id, 'opportunity_id', opportunity_id,
            'agreement_id', agreement_id, 'title', title, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    failure("business-milestone-create", reason);
    redirect(businessPath("error"));
  }

  if (!created) redirect(businessPath("partner-link-unavailable"));
  refreshBusiness();
  redirect(businessPath("milestone-created"));
}

export async function updateBusinessMilestoneStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const completionNote = String(formData.get("completion_note") ?? "").trim();
  if (
    !validUuid(milestoneId) ||
    !MILESTONE_STATUSES.includes(status as (typeof MILESTONE_STATUSES)[number]) ||
    completionNote.length > 3000 ||
    (status === 'completed' && completionNote.length < 3)
  ) {
    redirect(businessPath("invalid"));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_milestones
        SET
          status = ${status},
          completion_note = NULLIF(${completionNote}, ''),
          completed_by = CASE WHEN ${status} = 'completed' THEN ${identity.userId} ELSE NULL END,
          completed_at = CASE WHEN ${status} = 'completed' THEN now() ELSE NULL END,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${milestoneId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status NOT IN ('completed','cancelled')
          AND (
            (status = 'open' AND ${status} IN ('in_progress','blocked','cancelled','completed'))
            OR (status = 'in_progress' AND ${status} IN ('open','blocked','cancelled','completed'))
            OR (status = 'blocked' AND ${status} IN ('open','in_progress','cancelled'))
          )
        RETURNING id, organization_id, field_key, reference_no, partner_id,
          opportunity_id, agreement_id, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_milestone.status.' || status,
          'business_milestone', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'partner_id', partner_id, 'opportunity_id', opportunity_id,
            'agreement_id', agreement_id, 'title', title, 'status', status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    failure("business-milestone-status", reason);
    redirect(businessPath("error"));
  }

  if (!updated) redirect(businessPath("milestone-transition-blocked"));
  refreshBusiness();
  redirect(businessPath("milestone-updated"));
}
