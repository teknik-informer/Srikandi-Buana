import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { env } from "@/lib/runtime";
import { getAuthenticatedUser } from "@/lib/auth";

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

    const memberIds = [...new Set(raw.memberIds)];
    const allMembers = await env.DB
      .prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota'")
      .bind(user.userId)
      .all();
    const memberIndex = new Map(
      allMembers.results.map((row) => [String(row.id), JSON.parse(String(row.data)) as Record<string, unknown>]),
    );
    if (memberIds.some((id) => !memberIndex.has(id))) {
      return json({ error: "Anggota tidak ditemukan dalam kelompok Anda." }, 400);
    }

    const externalParticipants = cleanExternalParticipants(raw.externalParticipants);
    const notes = String(raw.notes || "").slice(0, 5000);
    const data = {
      eventId: raw.eventId,
      name: String((JSON.parse(String(event.data)) as Record<string, unknown>).name || ""),
      memberIds,
      memberNames: memberIds.map((id) => String(memberIndex.get(id)?.name || "")),
      externalParticipantsJson: JSON.stringify(externalParticipants),
      notes,
    };
    const id = "attendance-" + raw.eventId;
    const now = new Date().toISOString();

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
