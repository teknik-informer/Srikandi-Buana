import type { NeonDatabase, PreparedStatement } from "@/lib/runtime";

type AttendanceDatabase = Pick<NeonDatabase, "prepare" | "batch">;

export class AttendanceMutationError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}

const updatedTimestamp = "to_char(GREATEST(CAST(EXCLUDED.updated AS timestamptz), CAST(records.updated AS timestamptz) + INTERVAL '1 millisecond') AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')";

export async function saveAttendanceRecord(
  db: AttendanceDatabase,
  input: {
    owner: string;
    actorId: string;
    eventId: string;
    eventUpdated: string;
    attendanceRecordId: string;
    expectedUpdated: string | null;
    data: Record<string, unknown>;
    eventName: string;
    now: string;
  },
  normalizedWrites: PreparedStatement[],
) {
  const auditId = crypto.randomUUID();
  const sql = [
    "WITH changed AS (",
    "INSERT INTO records(id,owner,kind,data,created,updated)",
    "SELECT ?,?,'kehadiran',?,?,?",
    "WHERE (CAST(? AS TEXT) IS NULL OR EXISTS (",
    "  SELECT 1 FROM records AS current",
    "  WHERE current.id=? AND current.owner=? AND current.kind='kehadiran' AND current.updated=?",
    "))",
    "AND EXISTS (",
    "  SELECT 1 FROM records AS event",
    "  WHERE event.id=? AND event.owner=? AND event.kind='kegiatan' AND event.updated=?",
    ")",
    "ON CONFLICT(id) DO UPDATE SET",
    "data=EXCLUDED.data,",
    "updated=" + updatedTimestamp,
    "WHERE records.owner=EXCLUDED.owner",
    "AND records.kind='kehadiran'",
    "AND records.updated IS NOT DISTINCT FROM CAST(? AS TEXT)",
    "RETURNING id,updated",
    "),",
    "audit_written AS (",
    "INSERT INTO audit(id,owner,action,title,created)",
    "SELECT ?,?,'Diperbarui',?,? FROM changed",
    "RETURNING id",
    ")",
    "SELECT CASE",
    "WHEN EXISTS(SELECT 1 FROM changed) AND EXISTS(SELECT 1 FROM audit_written) THEN 1",
    "ELSE (1 / CASE WHEN EXISTS(SELECT 1 FROM changed) AND EXISTS(SELECT 1 FROM audit_written) THEN 1 ELSE 0 END)::text",
    "END AS saved",
  ].join("\n");

  const statement = db.prepare(sql).bind(
    input.attendanceRecordId,
    input.owner,
    JSON.stringify(input.data),
    input.now,
    input.now,
    input.expectedUpdated,
    input.attendanceRecordId,
    input.owner,
    input.expectedUpdated,
    input.eventId,
    input.owner,
    input.eventUpdated,
    input.expectedUpdated,
    auditId,
    input.owner,
    "Daftar hadir: " + input.eventName,
    input.now,
  );

  try {
    await db.batch([statement, ...normalizedWrites]);
  } catch (error) {
    const [attendanceRow, eventRow, idCollision] = await Promise.all([
      db.prepare("SELECT updated FROM records WHERE id=? AND owner=? AND kind='kehadiran'").bind(
        input.attendanceRecordId,
        input.owner,
      ).first(),
      db.prepare("SELECT updated FROM records WHERE id=? AND owner=? AND kind='kegiatan'").bind(
        input.eventId,
        input.owner,
      ).first(),
      db.prepare("SELECT id FROM records WHERE id=?").bind(input.attendanceRecordId).first(),
    ]);

    const versionChanged = input.expectedUpdated === null
      ? Boolean(attendanceRow || idCollision)
      : !attendanceRow || String(attendanceRow.updated) !== input.expectedUpdated;
    const eventChanged = !eventRow || String(eventRow.updated) !== input.eventUpdated;
    if (versionChanged || eventChanged) {
      throw new AttendanceMutationError(
        "Daftar hadir atau kegiatan telah berubah di sesi lain. Muat ulang sebelum menyimpan kembali.",
        409,
      );
    }
    throw error;
  }
}
