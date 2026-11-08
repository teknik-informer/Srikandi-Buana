import type { NeonDatabase, PreparedStatement } from "@/lib/runtime";
import { mapLegacyRecordToV14 } from "@/features/workspace-v14/legacy-mapping.mjs";

type LegacyRecord = {
  owner: string;
  actorId: string;
  id: string;
  kind: string;
  data: Record<string, unknown>;
  now: string;
};

const stableId = (prefix: string, sourceId: string) => prefix + ":" + sourceId;
const json = (value: unknown) => JSON.stringify(value ?? {});
const clean = (value: unknown, max = 5000) =>
  typeof value === "string" ? value.trim().slice(0, max) : null;

function statementForMapping(
  db: NeonDatabase,
  organizationId: string,
  source: LegacyRecord,
): PreparedStatement[] {
  const mapped = mapLegacyRecordToV14(source.kind, source.data);
  if (!mapped) return [];

  const sourceId = source.id;
  const sourceChecksum = JSON.stringify(source.data);
  const id = stableId("v14:" + mapped.domain, sourceId);
  const v = mapped.values;
  const statements: PreparedStatement[] = [];

  if (mapped.domain === "member_profiles") {
    statements.push(db.prepare(`
      INSERT INTO workspace_v14.member_profiles (
        id,organization_id,source_legacy_record_id,display_name,preferred_name,village,phone,
        membership_status,identity_verification_status,data_consent_status,data_notice_version,
        consented_at,photo_consent_status,profile_data,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULLIF(?,'')::timestamptz,?,?,?::timestamptz,?::timestamptz)
      ON CONFLICT (organization_id,source_legacy_record_id) DO UPDATE SET
        display_name=excluded.display_name,
        preferred_name=excluded.preferred_name,
        village=excluded.village,
        phone=excluded.phone,
        membership_status=excluded.membership_status,
        identity_verification_status=excluded.identity_verification_status,
        data_consent_status=excluded.data_consent_status,
        data_notice_version=excluded.data_notice_version,
        photo_consent_status=excluded.photo_consent_status,
        profile_data=excluded.profile_data,
        updated_at=excluded.updated_at
    `).bind(
      id, organizationId, sourceId,
      v.displayName, v.preferredName, v.village, v.phone,
      v.membershipStatus, v.identityVerificationStatus, v.dataConsentStatus,
      v.dataNoticeVersion, clean(source.data.consentedAt, 80) || "",
      v.photoConsentStatus, json(v.profileData), source.now, source.now,
    ));
  }

  if (mapped.domain === "partner_organizations") {
    statements.push(db.prepare(`
      INSERT INTO workspace_v14.partner_organizations (
        id,organization_id,source_legacy_record_id,display_name,website,
        relationship_stage,relationship_status,verification_status,
        official_contact_confirmed,contact_data,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,'unverified',?,?::jsonb,?::timestamptz,?::timestamptz)
      ON CONFLICT (organization_id,source_legacy_record_id) DO UPDATE SET
        display_name=excluded.display_name,
        website=excluded.website,
        relationship_stage=excluded.relationship_stage,
        relationship_status='pre_agreement',
        official_contact_confirmed=excluded.official_contact_confirmed,
        contact_data=excluded.contact_data,
        updated_at=excluded.updated_at
    `).bind(
      id, organizationId, sourceId, v.displayName, v.website,
      v.relationshipStage, "pre_agreement", v.officialContactConfirmed,
      json(v.contactData), source.now, source.now,
    ));

    const interactionDate = clean(source.data.interactionDate, 10) || clean(source.data.date, 10);
    if (interactionDate && /^\d{4}-\d{2}-\d{2}$/.test(interactionDate)) {
      const interactionId = stableId("v14:partner-interaction", sourceId);
      statements.push(db.prepare(`
        INSERT INTO workspace_v14.partner_interactions (
          id,organization_id,partner_organization_id,interaction_type,occurred_at,channel,
          summary,next_action,next_action_owner,next_review_at,evidence_document_id,created_by,created_at
        ) VALUES (?,?,?, ?,?::date::timestamptz,?,?, ?,?,NULLIF(?,'')::date::timestamptz,NULLIF(?,''),?,?::timestamptz)
        ON CONFLICT (id) DO UPDATE SET
          partner_organization_id=excluded.partner_organization_id,
          interaction_type=excluded.interaction_type,
          occurred_at=excluded.occurred_at,
          channel=excluded.channel,
          summary=excluded.summary,
          next_action=excluded.next_action,
          next_action_owner=excluded.next_action_owner,
          next_review_at=excluded.next_review_at,
          evidence_document_id=excluded.evidence_document_id
      `).bind(
        interactionId, organizationId, id,
        source.data.formPreset === "partner-engagement-log" ? "other" : "meeting",
        interactionDate, clean(source.data.contactChannel, 80),
        clean(source.data.summary || source.data.notes, 5000) || "Catatan penjajakan mitra",
        clean(source.data.nextAction, 2000),
        clean(source.data.owner, 160),
        clean(source.data.nextReviewDate, 10) || "",
        clean(source.data.evidenceFileId, 180) || "",
        source.actorId,
        source.now,
      ));
    }
  }

  if (mapped.domain === "programmes") {
    statements.push(db.prepare(`
      INSERT INTO workspace_v14.programmes (
        id,organization_id,source_legacy_record_id,programme_code,name,purpose,
        lifecycle_status,agreement_status,metadata,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,'preparation','not_received',?::jsonb,?::timestamptz,?::timestamptz)
      ON CONFLICT (organization_id,source_legacy_record_id) DO UPDATE SET
        programme_code=excluded.programme_code,
        name=excluded.name,
        purpose=excluded.purpose,
        lifecycle_status='preparation',
        agreement_status='not_received',
        metadata=excluded.metadata,
        updated_at=excluded.updated_at
    `).bind(
      id, organizationId, sourceId, v.programmeCode, v.name, v.purpose,
      json(v.metadata), source.now, source.now,
    ));
  }

  if (mapped.domain === "activities") {
    const evidence = Array.isArray(v.evidence) ? v.evidence : [];
    statements.push(db.prepare(`
      INSERT INTO workspace_v14.activities (
        id,organization_id,source_legacy_record_id,title,activity_type,description,
        starts_at,ends_at,location,status,result_summary,evidence_json,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,NULLIF(?,'')::timestamptz,NULLIF(?,'')::timestamptz,?,?,?,?::jsonb,?::timestamptz,?::timestamptz)
      ON CONFLICT (organization_id,source_legacy_record_id) DO UPDATE SET
        title=excluded.title,
        activity_type=excluded.activity_type,
        description=excluded.description,
        starts_at=excluded.starts_at,
        ends_at=excluded.ends_at,
        location=excluded.location,
        status=excluded.status,
        result_summary=excluded.result_summary,
        evidence_json=excluded.evidence_json,
        updated_at=excluded.updated_at
    `).bind(
      id, organizationId, sourceId, v.title, v.activityType, v.description,
      v.startsAt, v.endsAt, v.location, v.status, v.resultSummary,
      json(evidence), source.now, source.now,
    ));
  }

  if (mapped.domain === "tasks") {
    const evidence = Array.isArray(v.evidence) ? v.evidence : [];
    statements.push(db.prepare(`
      INSERT INTO workspace_v14.tasks (
        id,organization_id,source_legacy_record_id,title,description,priority,status,
        due_at,completed_at,completion_summary,evidence_json,created_by,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,NULLIF(?,'')::timestamptz,NULLIF(?,'')::timestamptz,?,?::jsonb,?,?::timestamptz,?::timestamptz)
      ON CONFLICT (organization_id,source_legacy_record_id) DO UPDATE SET
        title=excluded.title,
        description=excluded.description,
        priority=excluded.priority,
        status=excluded.status,
        due_at=excluded.due_at,
        completed_at=excluded.completed_at,
        completion_summary=excluded.completion_summary,
        evidence_json=excluded.evidence_json,
        updated_at=excluded.updated_at
    `).bind(
      id, organizationId, sourceId, v.title, v.description, v.priority, v.status,
      v.dueAt, v.completedAt, v.completionSummary, json(evidence), source.actorId,
      source.now, source.now,
    ));
  }

  if (mapped.domain === "documents") {
    statements.push(db.prepare(`
      INSERT INTO workspace_v14.documents (
        id,organization_id,source_legacy_file_id,document_type,title,source_party,source_version,
        document_status,verification_status,private_file_id,uploaded_by,metadata,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,'unverified',NULLIF(?,''),?,?::jsonb,?::timestamptz,?::timestamptz)
      ON CONFLICT (organization_id,source_legacy_file_id) DO UPDATE SET
        document_type=excluded.document_type,
        title=excluded.title,
        source_party=excluded.source_party,
        source_version=excluded.source_version,
        document_status=excluded.document_status,
        private_file_id=excluded.private_file_id,
        metadata=excluded.metadata,
        updated_at=excluded.updated_at
    `).bind(
      id, organizationId, sourceId, v.documentType, v.title, v.sourceParty,
      v.sourceVersion, v.documentStatus, v.privateFileId, source.actorId,
      json(v.metadata), source.now, source.now,
    ));
  }

  // The mapping is marked "transformed", never "verified". Verification is
  // a separate review decision and must not be inferred from a successful upsert.
  statements.push(db.prepare(`
    INSERT INTO workspace_v14.legacy_record_map (
      id,organization_id,source_schema,source_table,source_id,source_kind,
      source_checksum,target_domain,target_id,migration_status
    ) VALUES (?,?, 'public','records',?,?,md5(?),?,?,'transformed')
    ON CONFLICT (organization_id,source_schema,source_table,source_id) DO UPDATE SET
      source_kind=excluded.source_kind,
      source_checksum=excluded.source_checksum,
      target_domain=excluded.target_domain,
      target_id=excluded.target_id,
      migration_status='transformed',
      reconciled_at=NULL
  `).bind(
    stableId("legacy-record", sourceId), organizationId, sourceId, source.kind,
    json(source.data), mapped.domain, id,
  ));

  return statements;
}

export async function buildV14RecordSyncStatements(
  db: NeonDatabase,
  source: LegacyRecord,
): Promise<PreparedStatement[]> {
  try {
    const schema = await db.prepare(
      "SELECT to_regclass('workspace_v14.organizations') AS relation, to_regclass('workspace_v14.legacy_record_map') AS lineage",
    ).first();
    if (!schema?.relation || !schema?.lineage) return [];

    const organization = await db.prepare(
      "SELECT id FROM workspace_v14.organizations WHERE source_owner_user_id=?",
    ).bind(source.owner).first();
    if (!organization?.id) return [];

    return statementForMapping(db, String(organization.id), source);
  } catch {
    // A legacy-only deployment remains operational until the v14 schema is
    // installed. The Preview schema is tested separately by the migration gate.
    return [];
  }
}


const attendanceStatus = (value: unknown) => {
  switch (value) {
    case "Hadir penuh": return "present_full";
    case "Hadir sebagian": return "present_partial";
    case "Izin": return "excused";
    case "Tidak hadir": return "absent";
    default: return "unmarked";
  }
};

const photoConsentStatus = (value: unknown) => {
  switch (value) {
    case "Setuju sesuai tujuan": return "granted_for_stated_purpose";
    case "Tidak setuju": return "declined";
    default: return "not_asked";
  }
};

/** Keeps the normalized attendee register aligned with its one legacy activity attendance record. */
export async function buildV14AttendanceSyncStatements(
  db: NeonDatabase,
  input: {
    owner: string;
    actorId: string;
    attendanceRecordId: string;
    eventId: string;
    memberStatuses: Record<string, string>;
    externalParticipants: Array<{
      name: string;
      organisation: string;
      role: string;
      attendanceStatus: string;
      photoConsent: string;
    }>;
    now: string;
  },
): Promise<PreparedStatement[]> {
  try {
    const schema = await db.prepare(
      "SELECT to_regclass('workspace_v14.organizations') AS relation, to_regclass('workspace_v14.activity_attendance') AS attendance",
    ).first();
    if (!schema?.relation || !schema?.attendance) return [];

    const organization = await db.prepare(
      "SELECT id FROM workspace_v14.organizations WHERE source_owner_user_id=?",
    ).bind(input.owner).first();
    if (!organization?.id) return [];
    const organizationId = String(organization.id);

    const activity = await db.prepare(
      "SELECT id FROM workspace_v14.activities WHERE organization_id=? AND source_legacy_record_id=?",
    ).bind(organizationId, input.eventId).first();
    if (!activity?.id) return [];
    const activityId = String(activity.id);
    const statements: PreparedStatement[] = [];

    for (const [memberRecordId, status] of Object.entries(input.memberStatuses)) {
      const member = await db.prepare(
        "SELECT id FROM workspace_v14.member_profiles WHERE organization_id=? AND source_legacy_record_id=?",
      ).bind(organizationId, memberRecordId).first();
      if (!member?.id) continue;
      const memberProfileId = String(member.id);
      statements.push(db.prepare(`
        INSERT INTO workspace_v14.activity_attendance (
          id,organization_id,activity_id,member_profile_id,participant_type,display_name,
          attendance_status,photo_consent_status,created_at,updated_at
        )
        SELECT ?,?,?,?,?,m.display_name,?,?,?::timestamptz,?::timestamptz
        FROM workspace_v14.member_profiles m
        WHERE m.id=? AND m.organization_id=?
        ON CONFLICT (id) DO UPDATE SET
          display_name=excluded.display_name,
          attendance_status=excluded.attendance_status,
          photo_consent_status=excluded.photo_consent_status,
          updated_at=excluded.updated_at
      `).bind(
        stableId("v14:attendance-member", input.attendanceRecordId + ":" + memberRecordId),
        organizationId, activityId, memberProfileId, "member",
        attendanceStatus(status), "not_asked", input.now, input.now,
        memberProfileId, organizationId,
      ));
    }

    // External participants are a roster attached to this legacy attendance record.
    // Replacing only the external rows for this activity keeps one canonical list.
    statements.push(db.prepare(
      "DELETE FROM workspace_v14.activity_attendance WHERE organization_id=? AND activity_id=? AND participant_type='external'",
    ).bind(organizationId, activityId));

    input.externalParticipants.forEach((person, index) => {
      statements.push(db.prepare(`
        INSERT INTO workspace_v14.activity_attendance (
          id,organization_id,activity_id,participant_type,display_name,organization_name,
          participant_role,attendance_status,photo_consent_status,created_at,updated_at
        ) VALUES (?,?,?,'external',?,?,?,?,?,?::timestamptz,?::timestamptz)
      `).bind(
        stableId("v14:attendance-external", input.attendanceRecordId + ":" + (index + 1)),
        organizationId, activityId,
        clean(person.name, 160) || "Peserta eksternal",
        clean(person.organisation, 180),
        clean(person.role, 120),
        attendanceStatus(person.attendanceStatus),
        photoConsentStatus(person.photoConsent),
        input.now, input.now,
      ));
    });

    statements.push(db.prepare(`
      INSERT INTO workspace_v14.legacy_record_map (
        id,organization_id,source_schema,source_table,source_id,source_kind,
        source_checksum,target_domain,target_id,migration_status
      ) VALUES (?,?, 'public','records',?,'kehadiran',md5(?),'activity_attendance',?,'transformed')
      ON CONFLICT (organization_id,source_schema,source_table,source_id) DO UPDATE SET
        source_checksum=excluded.source_checksum,
        target_domain='activity_attendance',
        target_id=excluded.target_id,
        migration_status='transformed',
        reconciled_at=NULL
    `).bind(
      stableId("legacy-record", input.attendanceRecordId),
      organizationId, input.attendanceRecordId,
      json({ eventId: input.eventId, memberStatuses: input.memberStatuses, externalParticipants: input.externalParticipants }),
      activityId,
    ));
    return statements;
  } catch {
    return [];
  }
}
