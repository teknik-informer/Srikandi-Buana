import type { Metadata } from "next";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { FIELDS_BY_SLUG } from "@/config/fields";
import { PersetujuanClient, type ApprovalQueueData } from "./persetujuan-client";

export const metadata: Metadata = { title: "Persetujuan" };

interface FinanceApprovalRow {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  source_type: string;
  total_debit: string;
  total_credit: string;
  creator_name: string | null;
  created_by: string;
  submitted_at: string;
}

interface MembershipApprovalRow {
  id: string;
  reference_no: string;
  applicant_name: string;
  phone: string;
  address: string;
  interest_area: string | null;
  experience_level: string | null;
  message: string | null;
  status: "submitted" | "under_review";
  created_at: string;
}

interface WorkplanApprovalRow {
  id: string;
  reference_no: string;
  field_key: string;
  field_name: string;
  title: string;
  objective: string | null;
  period_start: string;
  period_end: string;
  creator_name: string | null;
  created_at: string;
}

function warnSource(area: string, reason: unknown): void {
  const errorType =
    reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
  console.warn(`[${area}] Source unavailable`, errorType);
}

export default async function PersetujuanPage() {
  const identity = await requireIdentity("organization:read");
  const canReadFinance = can(identity, "approval:read") || can(identity, "finance:journal:approve");
  const canReviewFinance = can(identity, "finance:journal:approve");
  const canReviewMembership = can(identity, "field:organisasi:review");
  const canReadMembership = canReviewMembership;
  const canApproveWorkplans = can(identity, "organization:team:approve");
  const canReadWorkplans = can(identity, "approval:read") || canApproveWorkplans;

  const empty: ApprovalQueueData = {
    currentUserId: identity.userId,
    finance: [],
    memberships: [],
    workplans: [],
    canReviewFinance,
    canReviewMembership,
    canApproveWorkplans,
    errors: [],
  };
  const data: ApprovalQueueData = { ...empty, errors: [] };

  let sql;
  try {
    sql = getV9Sql();
  } catch (reason) {
    warnSource("approval-inbox-connection", reason);
    return <PersetujuanClient data={{ ...data, errors: ["finance", "membership", "workplan"]}} />;
  }

  const jobs: Promise<void>[] = [];

  if (canReadFinance) {
    jobs.push((async () => {
      try {
        const rows = rowsFromResult<FinanceApprovalRow>(await sql`
          SELECT
            journal.id::text AS id,
            journal.reference_no,
            to_char(journal.journal_date, 'YYYY-MM-DD') AS journal_date,
            journal.description,
            journal.source_type,
            journal.total_debit::text AS total_debit,
            journal.total_credit::text AS total_credit,
            COALESCE(person.preferred_name, person.full_name, account.email) AS creator_name,
            journal.created_by::text AS created_by,
            to_char(journal.submitted_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS submitted_at
          FROM v9.finance_journals AS journal
          LEFT JOIN v9.user_accounts AS account
            ON account.id = journal.created_by
          LEFT JOIN v9.people AS person
            ON person.id = account.person_id
          WHERE journal.organization_id = ${identity.organizationId}
            AND journal.status = 'submitted'
          ORDER BY journal.submitted_at ASC, journal.created_at ASC
        `);
        data.finance = rows.map((row) => ({
          ...row,
          creator_name: row.creator_name ?? "Pengguna organisasi",
        }));
      } catch (reason) {
        warnSource("approval-inbox-finance", reason);
        data.errors.push("finance");
      }
    })());
  }

  if (canReadMembership) {
    jobs.push((async () => {
      try {
        const rows = rowsFromResult<MembershipApprovalRow>(await sql`
          SELECT
            interest.id::text AS id,
            interest.reference_no,
            interest.applicant_name,
            interest.phone,
            interest.address,
            interest.interest_area,
            interest.experience_level,
            interest.message,
            interest.status,
            to_char(interest.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS created_at
          FROM v9.membership_interests AS interest
          WHERE interest.organization_id = ${identity.organizationId}
            AND interest.status IN ('submitted', 'under_review')
          ORDER BY interest.created_at ASC
        `);
        data.memberships = rows;
      } catch (reason) {
        warnSource("approval-inbox-membership", reason);
        data.errors.push("membership");
      }
    })());
  }

  if (canReadWorkplans) {
    jobs.push((async () => {
      try {
        const rows = rowsFromResult<WorkplanApprovalRow>(await sql`
          SELECT
            workplan.id::text AS id,
            workplan.reference_no,
            workplan.field_key,
            workplan.title,
            workplan.objective,
            to_char(workplan.period_start, 'YYYY-MM-DD') AS period_start,
            to_char(workplan.period_end, 'YYYY-MM-DD') AS period_end,
            COALESCE(person.preferred_name, person.full_name, account.email) AS creator_name,
            to_char(workplan.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS created_at
          FROM v9.field_workplans AS workplan
          LEFT JOIN v9.user_accounts AS account
            ON account.id = workplan.created_by
          LEFT JOIN v9.people AS person
            ON person.id = account.person_id
          WHERE workplan.organization_id = ${identity.organizationId}
            AND workplan.status = 'submitted'
          ORDER BY workplan.submitted_at ASC NULLS LAST, workplan.created_at ASC
        `);
        data.workplans = rows.map((row) => ({
          ...row,
          field_name: FIELDS_BY_SLUG[row.field_key]?.shortName ?? row.field_key,
          creator_name: row.creator_name ?? "Koordinator bidang",
        }));
      } catch (reason) {
        warnSource("approval-inbox-workplan", reason);
        data.errors.push("workplan");
      }
    })());
  }

  await Promise.all(jobs);
  return <PersetujuanClient data={data} />;
}
