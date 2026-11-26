type AgricultureRow = Record<string, unknown>;
type BoundStatement = { first(): Promise<AgricultureRow | null> };
type AgricultureDatabase = {
  prepare(sql: string): { bind(...values: unknown[]): BoundStatement };
};

export class AgricultureMutationError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}

const updatedTimestamp = "to_char(GREATEST(CAST(? AS timestamptz), CAST(target.updated_at AS timestamptz) + INTERVAL '1 millisecond') AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')";

async function commitMutation(
  db: AgricultureDatabase,
  sql: string,
  values: unknown[],
  conflictMessage: string,
) {
  const row = await db.prepare(sql).bind(...values).first();
  if (!row) throw new AgricultureMutationError(conflictMessage, 409);
  return row;
}

export async function updateFarmParcel(
  db: AgricultureDatabase,
  input: {
    owner: string;
    actorId: string;
    actorRole: string;
    id: string;
    expectedUpdated: string;
    memberId: string;
    parcelCode: string;
    name: string;
    areaM2: number;
    tenureType: string;
    locationLabel: string;
    now: string;
  },
) {
  const auditId = crypto.randomUUID();
  const sql = [
    "WITH changed AS (",
    "UPDATE farm_parcels AS target",
    "SET member_id=?, parcel_code=?, name=?, area_m2=?, tenure_type=?, location_label=?,",
    "verification_status='pending', verification_note='', verified_by=NULL, verified_at=NULL,",
    "updated_by=?, updated_at=" + updatedTimestamp,
    "WHERE target.id=? AND target.workspace_owner=? AND target.status='active' AND target.updated_at=?",
    "AND EXISTS (SELECT 1 FROM records AS member",
    "WHERE member.id=? AND member.owner=target.workspace_owner AND member.owner=?",
    "AND member.kind='anggota' AND member.data::jsonb->>'status'='Aktif'",
    "AND member.data::jsonb->>'verification'='Terverifikasi')",
    "RETURNING target.id",
    ")",
    "INSERT INTO agriculture_audit(id,workspace_owner,actor_id,actor_role,action,target_type,target_id,reason,details,created_at)",
    "SELECT ?,?,?,?,'Register lahan diperbarui; verifikasi ulang diperlukan','parcel',changed.id,'',?,?",
    "FROM changed RETURNING target_id",
  ].join("\n");
  return commitMutation(
    db,
    sql,
    [
      input.memberId, input.parcelCode, input.name, input.areaM2, input.tenureType,
      input.locationLabel, input.actorId, input.now, input.id, input.owner,
      input.expectedUpdated, input.memberId, input.owner, auditId, input.owner,
      input.actorId, input.actorRole,
      JSON.stringify({
        parcelCode: input.parcelCode,
        areaM2: input.areaM2,
        tenureType: input.tenureType,
        memberId: input.memberId,
      }),
      input.now,
    ],
    "Register lahan telah berubah. Muat ulang data sebelum menyimpan kembali.",
  );
}

export async function archiveFarmParcel(
  db: AgricultureDatabase,
  input: {
    owner: string;
    actorId: string;
    actorRole: string;
    id: string;
    expectedUpdated: string;
    reason: string;
    now: string;
  },
) {
  const auditId = crypto.randomUUID();
  const sql = [
    "WITH changed AS (",
    "UPDATE farm_parcels AS target",
    "SET status='archived', updated_by=?, updated_at=" + updatedTimestamp,
    "WHERE target.id=? AND target.workspace_owner=? AND target.status='active' AND target.updated_at=?",
    "RETURNING target.id",
    ")",
    "INSERT INTO agriculture_audit(id,workspace_owner,actor_id,actor_role,action,target_type,target_id,reason,details,created_at)",
    "SELECT ?,?,?,?,'Register lahan diarsipkan','parcel',changed.id,?,'{}',?",
    "FROM changed RETURNING target_id",
  ].join("\n");
  return commitMutation(
    db,
    sql,
    [
      input.actorId, input.now, input.id, input.owner, input.expectedUpdated,
      auditId, input.owner, input.actorId, input.actorRole, input.reason, input.now,
    ],
    "Register lahan telah berubah. Muat ulang data sebelum mengarsipkan.",
  );
}

export type AgricultureVerificationTarget = "parcel" | "crop_cycle" | "harvest";

export async function setAgricultureVerification(
  db: AgricultureDatabase,
  input: {
    owner: string;
    actorId: string;
    actorRole: string;
    id: string;
    expectedUpdated: string;
    targetType: AgricultureVerificationTarget;
    nextStatus: "verified" | "rejected";
    reason: string;
    now: string;
  },
) {
  const tableByTarget: Record<AgricultureVerificationTarget, string> = {
    parcel: "farm_parcels",
    crop_cycle: "crop_cycles",
    harvest: "harvest_records",
  };
  const table = tableByTarget[input.targetType];
  const parentGuard = input.targetType === "parcel"
    ? "AND target.status='active'"
    : input.targetType === "crop_cycle"
      ? [
          "AND EXISTS (SELECT 1 FROM farm_parcels AS parcel",
          "WHERE parcel.id=target.parcel_id AND parcel.workspace_owner=target.workspace_owner",
          "AND parcel.status='active' AND parcel.verification_status='verified')",
        ].join(" ")
      : [
          "AND EXISTS (SELECT 1 FROM crop_cycles AS cycle",
          "JOIN farm_parcels AS parcel ON parcel.id=cycle.parcel_id AND parcel.workspace_owner=cycle.workspace_owner",
          "WHERE cycle.id=target.crop_cycle_id AND cycle.workspace_owner=target.workspace_owner",
          "AND cycle.verification_status='verified' AND parcel.verification_status='verified' AND parcel.status='active')",
        ].join(" ");
  const action = input.nextStatus === "verified" ? "Data diverifikasi" : "Data ditolak";
  const verifiedBy = input.nextStatus === "verified" ? input.actorId : null;
  const verifiedAt = input.nextStatus === "verified" ? input.now : null;
  const auditId = crypto.randomUUID();
  const sql = [
    "WITH changed AS (",
    "UPDATE " + table + " AS target",
    "SET verification_status=?, verification_note=?, verified_by=?, verified_at=?, updated_by=?, updated_at=" + updatedTimestamp,
    "WHERE target.id=? AND target.workspace_owner=? AND target.updated_at=? " + parentGuard,
    "RETURNING target.id",
    ")",
    "INSERT INTO agriculture_audit(id,workspace_owner,actor_id,actor_role,action,target_type,target_id,reason,details,created_at)",
    "SELECT ?,?,?,?,?,?,changed.id,?,'{}',?",
    "FROM changed RETURNING target_id",
  ].join("\n");
  return commitMutation(
    db,
    sql,
    [
      input.nextStatus, input.reason, verifiedBy, verifiedAt, input.actorId, input.now,
      input.id, input.owner, input.expectedUpdated, auditId, input.owner, input.actorId,
      input.actorRole, action, input.targetType, input.reason, input.now,
    ],
    "Data pertanian atau status verifikasinya telah berubah. Muat ulang sebelum melanjutkan.",
  );
}
