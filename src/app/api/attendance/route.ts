import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { env } from "@/lib/runtime";
import { getAuthenticatedUser } from "@/lib/auth";
import { isModuleAvailableForUser } from "@/features/identity/access-policy";
import { buildV14AttendanceSyncStatements } from "@/lib/workspace-v14-sync";
import { AttendanceMutationError, saveAttendanceRecord } from "@/lib/attendance/record-mutations";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return json({ error: "Akses khusus pengelola." }, 401);
  if (!isModuleAvailableForUser(user, "hrm")) {
    return json({ error: "Aplikasi HRM sedang dinonaktifkan atau diblokir untuk akun ini." }, 403);
  }
  if (user.role !== "sekretaris" && user.role !== "admin") {
    return json({ error: "Daftar hadir merupakan register administrasi yang dikelola Sekretariat." }, 403);
  }
  if (req.headers.get("origin") !== new URL(req.url).origin && req.headers.get("sec-fetch-site") !== "same-origin") {
    return json({ error: "Permintaan ditolak." }, 403);
  }
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);

  try {
    const raw = await readJsonObject(req, 250000) as {
      eventId: string;
      eventUpdated?: string;
      expectedUpdated?: string | null;
      memberIds: string[];
      notes?: string;
    };
    if (
      typeof raw.eventId !== "string" ||
      !raw.eventId.trim() ||
      !Array.isArray(raw.memberIds) ||
      raw.memberIds.length > 2000 ||
      !raw.memberIds.every((id) => typeof id === "string")
    ) {
      return json({ error: "Daftar hadir tidak valid." }, 400);
    }
    if (!Object.prototype.hasOwnProperty.call(raw, "expectedUpdated")) {
      return json({ error: "Versi daftar hadir wajib disertakan. Muat ulang kegiatan sebelum menyimpan." }, 428);
    }
    if (
      raw.expectedUpdated !== null &&
      (typeof raw.expectedUpdated !== "string" ||
        !raw.expectedUpdated.trim() ||
        raw.expectedUpdated.length > 80 ||
        !Number.isFinite(Date.parse(raw.expectedUpdated)))
    ) {
      return json({ error: "Versi daftar hadir tidak valid. Muat ulang sebelum menyimpan." }, 400);
    }
    if (typeof raw.eventUpdated !== "string" || !raw.eventUpdated.trim()) {
      return json({ error: "Versi kegiatan tidak tersedia. Muat ulang daftar kegiatan sebelum menyimpan." }, 428);
    }
    if (raw.eventUpdated.length > 80 || !Number.isFinite(Date.parse(raw.eventUpdated))) {
      return json({ error: "Versi kegiatan tidak valid. Muat ulang daftar kegiatan sebelum menyimpan." }, 400);
    }

    const db = env.DB;
    const event = await db.prepare(
      "SELECT data,updated FROM records WHERE id=? AND owner=? AND kind='kegiatan'",
    ).bind(raw.eventId, user.userId).first();
    if (!event) return json({ error: "Kegiatan tidak ditemukan." }, 404);
    if (String(event.updated) !== raw.eventUpdated) {
      return json({ error: "Detail kegiatan telah berubah. Muat ulang sebelum menyimpan daftar hadir." }, 409);
    }

    const attendanceRecordId = "attendance-" + raw.eventId;
    const existing = await db.prepare(
      "SELECT updated FROM records WHERE id=? AND owner=? AND kind='kehadiran'",
    ).bind(attendanceRecordId, user.userId).first();
    if (raw.expectedUpdated === null && existing) {
      return json({ error: "Daftar hadir sudah dibuat oleh pengurus lain. Muat ulang sebelum memperbarui." }, 409);
    }
    if (typeof raw.expectedUpdated === "string" && (!existing || String(existing.updated) !== raw.expectedUpdated)) {
      return json({ error: "Daftar hadir telah berubah di sesi lain. Muat ulang sebelum menyimpan kembali." }, 409);
    }

    const memberIds = [...new Set(raw.memberIds)];
    const all = await db.prepare(
      "SELECT id,data FROM records WHERE owner=? AND kind='anggota'",
    ).bind(user.userId).all();
    const index = new Map(all.results.map((row) => [String(row.id), JSON.parse(String(row.data)) as Record<string, unknown>]));
    if (memberIds.some((id) => !index.has(id))) {
      return json({ error: "Anggota tidak ditemukan dalam kelompok Anda." }, 400);
    }

    const notes = typeof raw.notes === "string" ? raw.notes.slice(0, 5000) : "";
    const eventName = String(JSON.parse(String(event.data)).name || "Kegiatan");
    const data = {
      eventId: raw.eventId,
      name: eventName,
      memberIds,
      memberNames: memberIds.map((id) => String(index.get(id)?.name || "Anggota")),
      notes,
    };
    const now = new Date().toISOString();
    const normalizedAttendance = await buildV14AttendanceSyncStatements(db, {
      owner: user.userId,
      actorId: user.accountId,
      attendanceRecordId,
      eventId: raw.eventId,
      memberStatuses: Object.fromEntries(memberIds.map((memberId) => [memberId, "Hadir penuh"])),
      externalParticipants: [],
      now,
    });

    await saveAttendanceRecord(db, {
      owner: user.userId,
      actorId: user.accountId,
      eventId: raw.eventId,
      eventUpdated: raw.eventUpdated,
      attendanceRecordId,
      expectedUpdated: raw.expectedUpdated,
      data,
      eventName,
      now,
    }, normalizedAttendance);

    return json({ ok: true, count: memberIds.length });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    if (error instanceof AttendanceMutationError) return json({ error: error.message }, error.status);
    return json({ error: "Daftar hadir belum tersimpan." }, 400);
  }
}
