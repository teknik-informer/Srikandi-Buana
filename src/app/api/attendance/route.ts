import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { env } from "@/lib/runtime";
import { getAuthenticatedUser } from "@/lib/auth";
import { buildV14AttendanceSyncStatements } from "@/lib/workspace-v14-sync";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

const attendanceStates = new Set(["Hadir penuh", "Hadir sebagian", "Izin", "Tidak hadir"]);
const photoConsentStates = new Set(["Belum ditanyakan", "Setuju sesuai tujuan", "Tidak setuju"]);

type ExternalParticipantInput = {
  name?: unknown;
  organisation?: unknown;
  role?: unknown;
  attendanceStatus?: unknown;
  photoConsent?: unknown;
};

function cleanExternalParticipants(value: unknown): Array<{
  name: string;
  organisation: string;
  role: string;
  attendanceStatus: string;
  photoConsent: string;
}> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 500) {
    throw new Error("Daftar peserta eksternal tidak valid.");
  }

  return value.map((item: ExternalParticipantInput) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Data peserta eksternal tidak valid.");
    }
    const name = String(item.name ?? "").trim();
    const organisation = String(item.organisation ?? "").trim();
    const role = String(item.role ?? "").trim();
    const attendanceStatus = String(item.attendanceStatus ?? "");
    const photoConsent = String(item.photoConsent ?? "Belum ditanyakan");

    if (!name || name.length > 160) throw new Error("Nama peserta eksternal wajib diisi (maksimal 160 karakter).");
    if (organisation.length > 180 || role.length > 120) throw new Error("Nama lembaga atau peran peserta terlalu panjang.");
    if (!attendanceStates.has(attendanceStatus)) throw new Error("Status kehadiran peserta eksternal tidak valid.");
    if (!photoConsentStates.has(photoConsent)) throw new Error("Status izin foto tidak valid.");

    return { name, organisation, role, attendanceStatus, photoConsent };
  });
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return json({ error: "Akses khusus pengelola." }, 401);
  if (!["admin", "sekretaris"].includes(user.role)) {
    return json({ error: "Hak akses daftar hadir tidak tersedia." }, 403);
  }
  if (
    req.headers.get("origin") !== new URL(req.url).origin &&
    req.headers.get("sec-fetch-site") !== "same-origin"
  ) {
    return json({ error: "Permintaan ditolak." }, 403);
  }
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);

  try {
    const raw = (await readJsonObject(req, 250000)) as {
      eventId: string;
      memberIds: string[];
      memberStatuses?: unknown;
      externalParticipants?: unknown;
      notes?: string;
    };
    if (
      !raw.eventId ||
      !Array.isArray(raw.memberIds) ||
      raw.memberIds.length > 2000 ||
      !raw.memberIds.every((id) => typeof id === "string")
    ) {
      return json({ error: "Daftar hadir tidak valid." }, 400);
    }

    const event = await env.DB
      .prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='kegiatan'")
      .bind(raw.eventId, user.userId)
      .first();
    if (!event) return json({ error: "Kegiatan tidak ditemukan." }, 404);

    const submittedMemberIds = [...new Set(raw.memberIds)];
    const allMembers = await env.DB
      .prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota'")
      .bind(user.userId)
      .all();
    const memberIndex = new Map(
      allMembers.results.map((row) => [String(row.id), JSON.parse(String(row.data)) as Record<string, unknown>]),
    );
    if (submittedMemberIds.some((id) => !memberIndex.has(id))) {
      return json({ error: "Anggota tidak ditemukan dalam kelompok Anda." }, 400);
    }

    const currentAttendance = await env.DB
      .prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='kehadiran'")
      .bind("attendance-" + raw.eventId, user.userId)
      .first();
    const previousData = currentAttendance
      ? JSON.parse(String(currentAttendance.data)) as Record<string, unknown>
      : {};
    let previousStatuses: Record<string, string> = {};
    try {
      const stored = previousData.memberStatusJson;
      if (typeof stored === "string") {
        const parsed = JSON.parse(stored) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          previousStatuses = Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>)
              .filter(([id, status]) => memberIndex.has(id) && typeof status === "string" && (status === "Belum ditandai" || attendanceStates.has(status)))
              .map(([id, status]) => [id, String(status)]),
          );
        }
      }
    } catch {
      previousStatuses = {};
    }
    // Legacy records only stored memberIds. Preserve that meaning when migrating
    // their status map in memory; unknown members remain explicitly unmarked.
    if (!Object.keys(previousStatuses).length && Array.isArray(previousData.memberIds)) {
      for (const id of previousData.memberIds) {
        if (typeof id === "string" && memberIndex.has(id)) previousStatuses[id] = "Hadir penuh";
      }
    }

    let cleanedStatuses: Record<string, string> = {};
    if (raw.memberStatuses !== undefined) {
      if (!raw.memberStatuses || typeof raw.memberStatuses !== "object" || Array.isArray(raw.memberStatuses)) {
        return json({ error: "Status kehadiran anggota tidak valid." }, 400);
      }
      const submitted = raw.memberStatuses as Record<string, unknown>;
      if (Object.keys(submitted).length > 2000) return json({ error: "Daftar status anggota terlalu besar." }, 400);
      for (const [id, status] of Object.entries(submitted)) {
        if (!memberIndex.has(id)) return json({ error: "Anggota pada status kehadiran tidak ditemukan dalam kelompok Anda." }, 400);
        if (status !== "Belum ditandai" && !attendanceStates.has(String(status))) {
          return json({ error: "Status kehadiran anggota tidak valid." }, 400);
        }
        cleanedStatuses[id] = String(status);
      }
    } else {
      // Backward compatibility for existing clients that still submit memberIds.
      for (const id of submittedMemberIds) cleanedStatuses[id] = "Hadir penuh";
    }

    const memberStatusMap = { ...previousStatuses, ...cleanedStatuses };
    for (const row of allMembers.results) {
      const id = String(row.id);
      if (!memberStatusMap[id]) memberStatusMap[id] = "Belum ditandai";
    }
    const memberIds = Object.entries(memberStatusMap)
      .filter(([, status]) => status.startsWith("Hadir"))
      .map(([id]) => id);
    const externalParticipants = cleanExternalParticipants(raw.externalParticipants);
    const notes = String(raw.notes || "").slice(0, 5000);
    const data = {
      eventId: raw.eventId,
      name: String((JSON.parse(String(event.data)) as Record<string, unknown>).name || ""),
      memberIds,
      memberNames: memberIds.map((id) => String(memberIndex.get(id)?.name || "")),
      memberStatusJson: JSON.stringify(memberStatusMap),
      externalParticipantsJson: JSON.stringify(externalParticipants),
      notes,
    };
    const id = "attendance-" + raw.eventId;
    const now = new Date().toISOString();

    const normalizedAttendance = await buildV14AttendanceSyncStatements(env.DB, {
      owner: user.userId,
      actorId: user.accountId,
      attendanceRecordId: id,
      eventId: raw.eventId,
      memberStatuses: memberStatusMap,
      externalParticipants,
      now,
    });

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'kehadiran',?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated WHERE records.owner=excluded.owner",
      ).bind(id, user.userId, JSON.stringify(data), now, now),
      env.DB.prepare(
        "INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        user.userId,
        "Diperbarui",
        "Daftar hadir: " + data.name,
        now,
      ),
      ...normalizedAttendance,
    ]);

    return json({
      ok: true,
      count: memberIds.length,
      externalCount: externalParticipants.length,
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({
      error: error instanceof Error ? error.message : "Daftar hadir belum tersimpan.",
    }, 400);
  }
}
