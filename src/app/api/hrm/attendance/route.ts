import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getAuthenticatedUser } from "@/lib/auth";
import { isArchitectFullAccess, type Principal } from "@/features/identity/access-policy";
import { env } from "@/lib/runtime";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const sessionTypes = ["Rapat", "Penyuluhan", "Pelatihan", "Gotong Royong", "Kegiatan Pertanian", "Kegiatan Program", "Kunjungan Lapangan", "Kegiatan Organisasi", "Lainnya"];
const attendanceStatuses = ["present", "late", "excused", "sick", "absent"];
type Stored = { id: string; data: Record<string, unknown>; created: string; updated: string };
type SessionData = {
  sessionName: string; sessionType: string; eventDate: string; startTime: string; endTime: string;
  location: string; eventId: string | null; programId: string | null; participantIds: string[];
  status: "scheduled" | "active" | "closed" | "cancelled"; lateAfterMinutes: number;
  geofenceEnabled: boolean; latitude?: number; longitude?: number; allowedRadius?: number;
  createdBy: string; createdByName: string;
};
function parse(row: Record<string, unknown>): Stored {
  return { id: String(row.id), data: JSON.parse(String(row.data)) as Record<string, unknown>, created: String(row.created), updated: String(row.updated) };
}
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return origin === new URL(req.url).origin || req.headers.get("sec-fetch-site") === "same-origin";
}
function full(user: Principal) { return isArchitectFullAccess(user); }
function canManage(user: Principal) { return full(user) || user.role === "sekretaris" || user.role === "koordinator"; }
function canReview(user: Principal) { return full(user) || user.role === "sekretaris" || user.role === "ketua"; }
function canReadManagement(user: Principal) { return full(user) || ["ketua", "sekretaris", "koordinator"].includes(user.role); }
function canManageSession(user: Principal, data: Record<string, unknown>) {
  if (full(user) || user.role === "sekretaris") return true;
  return user.role === "koordinator" && !!data.programId && user.programIds.includes(String(data.programId));
}
function localNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { date: get("year") + "-" + get("month") + "-" + get("day"), time: get("hour") + ":" + get("minute"), iso: new Date().toISOString() };
}
function minutes(value: string) { const [h, m] = value.split(":").map(Number); return h * 60 + m; }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value; }
function validTime(value: string) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (n: number) => n * Math.PI / 180, dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function rows(owner: string, kind: string) {
  if (!env.DB) throw new Error("Database belum tersedia.");
  const result = await env.DB.prepare("SELECT id,data,created,updated FROM records WHERE owner=? AND kind=? ORDER BY created DESC").bind(owner, kind).all();
  return result.results.map(parse);
}
function auditStatement(owner: string, actor: Principal, action: string, title: string, details: Record<string, unknown>) {
  if (!env.DB) throw new Error("Database belum tersedia.");
  const id = randomUUID(), now = new Date().toISOString();
  return env.DB.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'attendance_audit',?,?,?)")
    .bind(id, owner, JSON.stringify({ action, title, actorId: actor.accountId, actorName: actor.displayName, details, occurredAt: now }), now, now);
}
async function getContext(req: Request, write = false) {
  const user = await getAuthenticatedUser();
  if (!user) return { response: json({ error: "Silakan masuk untuk melanjutkan." }, 401) };
  if (write && !sameOrigin(req)) return { response: json({ error: "Permintaan lintas situs ditolak." }, 403) };
  if (!env.DB) return { response: json({ error: "Database belum tersedia." }, 503) };
  return { user, db: env.DB };
}
async function validateParticipants(owner: string, ids: string[]) {
  if (!env.DB) throw new Error("Database belum tersedia.");
  const unique = [...new Set(ids)];
  if (unique.length > 1000 || unique.some((id) => typeof id !== "string" || !id.trim() || id.length > 128)) throw new Error("Daftar peserta tidak valid.");
  if (!unique.length) throw new Error("Pilih sedikitnya satu peserta.");
  const all = await env.DB.prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota'").bind(owner).all();
  const index = new Map(all.results.map((row) => [String(row.id), JSON.parse(String(row.data)) as Record<string, unknown>]));
  for (const id of unique) {
    const member = index.get(id);
    if (!member || member.status !== "Aktif" || member.verification !== "Terverifikasi") throw new Error("Peserta harus merupakan anggota aktif dengan data terverifikasi.");
  }
  return unique;
}
export async function GET(req: Request) {
  try {
    const context = await getContext(req);
    if (context.response) return context.response;
    const user = context.user!;
    const owner = user.userId;
    if (!canReadManagement(user) && user.role !== "anggota") return json({ error: "Anda tidak memiliki akses ke data presensi." }, 403);
    const [sessions, attendance, corrections, members] = await Promise.all([
      rows(owner, "attendance_session"), rows(owner, "attendance_record"), rows(owner, "attendance_correction"),
      (full(user) || user.role === "sekretaris") ? env.DB!.prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota' ORDER BY created").bind(owner).all() : Promise.resolve({ results: [] as Record<string, unknown>[] }),
    ]);
    if (user.role === "anggota") {
      const ownId = user.memberId;
      const ownSessions = sessions.filter((s) => s.data.status === "active" && Array.isArray(s.data.participantIds) && (s.data.participantIds as string[]).includes(String(ownId)));
      const ownRecords = attendance.filter((r) => r.data.participantId === ownId);
      const ownCorrections = corrections.filter((r) => r.data.requestedBy === user.accountId || r.data.participantId === ownId);
      return json({ mode: "member", sessions: ownSessions.map((s) => ({ id: s.id, data: s.data })), records: ownRecords.map((r) => ({ id: r.id, data: r.data, created: r.created })), corrections: ownCorrections.map((r) => ({ id: r.id, data: r.data, created: r.created })) });
    }
    const visibleSessions = sessions.filter((s) => canManageSession(user, s.data) || user.role === "ketua");
    const sessionIds = new Set(visibleSessions.map((s) => s.id));
    const visibleRecords = attendance.filter((r) => sessionIds.has(String(r.data.sessionId)));
    const visibleCorrections = corrections.filter((r) => sessionIds.has(String(r.data.sessionId)));
    if (new URL(req.url).searchParams.get("format") === "csv") {
      const quote = (value: unknown) => {
        const text = String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""');
        return '"' + text + '"';
      };
      const sessionIndex = new Map(visibleSessions.map((session) => [session.id, session.data]));
      const csvRows: unknown[][] = [["Tanggal", "Kegiatan", "Jenis", "Nama Peserta", "Dusun", "Status", "Waktu Hadir", "Metode", "Verifikasi"]];
      for (const record of visibleRecords) {
        const session = sessionIndex.get(String(record.data.sessionId));
        csvRows.push([
          session?.eventDate, session?.sessionName, session?.sessionType, record.data.participantName,
          record.data.participantDusun, record.data.status, record.data.checkInAt, record.data.method,
          record.data.verificationStatus,
        ]);
      }
      const csv = "\uFEFF" + csvRows.map((row) => row.map(quote).join(",")).join("\r\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="rekap-presensi-srikandi-buana.csv"', "Cache-Control": "no-store" } });
    }
    const eligibleMembers").replaceAll('"', '""');
        return '"' + text + '"';
      };
      const sessionIndex = new Map(visibleSessions.map((session) => [session.id, session.data]));
      const csvRows = [["Tanggal", "Kegiatan", "Jenis", "Nama Peserta", "Dusun", "Status", "Waktu Hadir", "Metode", "Verifikasi"]];
      for (const record of visibleRecords) {
        const session = sessionIndex.get(String(record.data.sessionId));
        csvRows.push([
          session?.eventDate, session?.sessionName, session?.sessionType, record.data.participantName,
          record.data.participantDusun, record.data.status, record.data.checkInAt, record.data.method,
          record.data.verificationStatus,
        ]);
      }
      const csv = "\uFEFF" + csvRows.map((row) => row.map(quote).join(",")).join("\r\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="rekap-presensi-srikandi-buana.csv"', "Cache-Control": "no-store" } });
    }
    const eligibleMembers = members.results.map((r) => ({ id: String(r.id), data: JSON.parse(String(r.data)) as Record<string, unknown> }))
      .filter((r) => r.data.status === "Aktif" && r.data.verification === "Terverifikasi")
      .map((r) => ({ id: r.id, name: String(r.data.name || ""), dusun: String(r.data.dusun || ""), role: String(r.data.role || "Anggota") }));
    const today = localNow().date;
    const todaySessions = visibleSessions.filter((s) => s.data.eventDate === today);
    const recordsToday = visibleRecords.filter((r) => {
      const session = visibleSessions.find((s) => s.id === r.data.sessionId);
      return session?.data.eventDate === today;
    });
    const present = recordsToday.filter((r) => ["present", "late"].includes(String(r.data.status))).length;
    return json({
      mode: "management",
      summary: { sessionsToday: todaySessions.length, present, late: recordsToday.filter((r) => r.data.status === "late").length, correctionsPending: visibleCorrections.filter((r) => r.data.approvalStatus === "pending").length },
      sessions: visibleSessions.map((s) => ({ id: s.id, data: s.data, created: s.created, updated: s.updated })),
      records: visibleRecords.map((r) => ({ id: r.id, data: r.data, created: r.created, updated: r.updated })),
      corrections: visibleCorrections.map((r) => ({ id: r.id, data: r.data, created: r.created })),
      members: eligibleMembers,
    });
  } catch {
    return json({ error: "Data presensi belum dapat dimuat." }, 503);
  }
}
export async function POST(req: Request) {
  try {
    const context = await getContext(req, true);
    if (context.response) return context.response;
    const user = context.user!, owner = user.userId, db = context.db!;
    const body = await readJsonObject(req, 50000) as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "create_session") {
      if (!canManage(user)) return json({ error: "Hak membuat sesi presensi tidak tersedia." }, 403);
      const sessionName = String(body.sessionName || "").trim().slice(0, 160);
      const sessionType = String(body.sessionType || "");
      const eventDate = String(body.eventDate || "");
      const startTime = String(body.startTime || ""), endTime = String(body.endTime || "");
      const location = String(body.location || "").trim().slice(0, 240);
      const programId = body.programId ? String(body.programId) : null;
      const eventId = body.eventId ? String(body.eventId) : null;
      if (!sessionName || !sessionTypes.includes(sessionType) || !validDate(eventDate) || !validTime(startTime) || !validTime(endTime) || minutes(endTime) <= minutes(startTime) || !location) return json({ error: "Periksa nama, jenis, tanggal, waktu, dan lokasi kegiatan." }, 400);
      const scope = { programId };
      if (!canManageSession(user, scope)) return json({ error: "Sesi berada di luar penugasan program Anda." }, 403);
      if (eventId) {
        const event = await db.prepare("SELECT id FROM records WHERE id=? AND owner=? AND kind='kegiatan'").bind(eventId, owner).first();
        if (!event) return json({ error: "Agenda kegiatan tidak ditemukan." }, 404);
      }
      const participantIds = await validateParticipants(owner, Array.isArray(body.participantIds) ? body.participantIds.map(String) : []);
      const lateAfterMinutes = Number(body.lateAfterMinutes ?? 15);
      if (!Number.isInteger(lateAfterMinutes) || lateAfterMinutes < 0 || lateAfterMinutes > 60) return json({ error: "Batas keterlambatan harus 0 sampai 60 menit." }, 400);
      const geofenceEnabled = body.geofenceEnabled === true;
      const latitude = Number(body.latitude), longitude = Number(body.longitude), allowedRadius = Number(body.allowedRadius || 100);
      if (geofenceEnabled && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(allowedRadius) || allowedRadius < 25 || allowedRadius > 2000)) return json({ error: "Pengaturan lokasi presensi tidak valid." }, 400);
      const id = randomUUID(), now = new Date().toISOString();
      const data: SessionData = { sessionName, sessionType, eventDate, startTime, endTime, location, eventId, programId, participantIds, status: "scheduled", lateAfterMinutes, geofenceEnabled, ...(geofenceEnabled ? { latitude, longitude, allowedRadius } : {}), createdBy: user.accountId, createdByName: user.displayName };
      await db.batch([
        db.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'attendance_session',?,?,?)").bind(id, owner, JSON.stringify(data), now, now),
        auditStatement(owner, user, "session.created", "Sesi presensi dibuat: " + sessionName, { sessionId: id }),
      ]);
      return json({ ok: true, id, data }, 201);
    }
    if (action === "check_in") {
      const sessionId = String(body.sessionId || ""), method = String(body.method || "self");
      if (!sessionId || !["self", "manual", "qr", "location"].includes(method)) return json({ error: "Permintaan presensi tidak valid." }, 400);
      const sessionRow = await db.prepare("SELECT id,data FROM records WHERE id=? AND owner=? AND kind='attendance_session'").bind(sessionId, owner).first();
      if (!sessionRow) return json({ error: "Sesi presensi tidak ditemukan." }, 404);
      const session = JSON.parse(String(sessionRow.data)) as SessionData;
      if (!canManageSession(user, session) && user.role !== "anggota") return json({ error: "Sesi berada di luar kewenangan Anda." }, 403);
      if (session.status !== "active") return json({ error: "Sesi presensi belum dibuka atau sudah ditutup." }, 409);
      const now = localNow();
      if (now.date !== session.eventDate || minutes(now.time) < minutes(session.startTime) || minutes(now.time) > minutes(session.endTime)) return json({ error: "Presensi hanya dapat dilakukan pada tanggal dan waktu sesi yang ditetapkan." }, 409);
      const participantId = user.role === "anggota" ? String(user.memberId || "") : String(body.participantId || "");
      if (!participantId || !session.participantIds.includes(participantId)) return json({ error: "Akun atau peserta tidak terdaftar pada sesi ini." }, 403);
      const member = await db.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(participantId, owner).first();
      if (!member) return json({ error: "Data peserta tidak ditemukan." }, 404);
      const memberData = JSON.parse(String(member.data)) as Record<string, unknown>;
      if (memberData.status !== "Aktif" || memberData.verification !== "Terverifikasi") return json({ error: "Peserta tidak memenuhi syarat presensi." }, 403);
      if (user.role === "anggota" && !["self", "qr", "location"].includes(method)) return json({ error: "Anggota hanya dapat melakukan presensi mandiri." }, 403);
      if (user.role !== "anggota" && (!canManage(user) || method !== "manual")) return json({ error: "Petugas hanya dapat mencatat kehadiran melalui metode manual." }, 403);
      if (method === "qr") {
        const token = String(body.token || "");
        if (token.length < 32 || token.length > 128) return json({ error: "Token QR tidak valid." }, 400);
        const qrRows = await rows(owner, "attendance_qr_token");
        const qr = qrRows.find((r) => r.data.sessionId === sessionId && r.data.tokenHash === digest(token) && r.data.status === "active" && Date.parse(String(r.data.expiresAt)) > Date.now());
        if (!qr) return json({ error: "QR tidak berlaku, kedaluwarsa, atau berasal dari sesi lain." }, 403);
      }
      let locationVerification: Record<string, unknown> | null = null;
      if (method === "location" && !session.geofenceEnabled) return json({ error: "Validasi GPS belum diaktifkan untuk sesi ini." }, 400);
      if (method === "location" || session.geofenceEnabled) {
        if (session.geofenceEnabled) {
          if (body.locationConsent !== true) return json({ error: "Izinkan penggunaan lokasi hanya untuk memvalidasi presensi ini." }, 400);
          const lat = Number(body.latitude), lon = Number(body.longitude), accuracy = Number(body.accuracy);
          if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 500) return json({ error: "Lokasi perangkat tidak tersedia atau akurasinya terlalu rendah." }, 400);
          const distance = haversine(lat, lon, Number(session.latitude), Number(session.longitude));
          if (distance > Number(session.allowedRadius) + accuracy) return json({ error: "Anda berada di luar radius lokasi kegiatan." }, 403);
          locationVerification = { verified: true, accuracyMeters: Math.round(accuracy), checkedAt: now.iso };
        }
      }
      const status = minutes(now.time) > minutes(session.startTime) + Number(session.lateAfterMinutes) ? "late" : "present";
      const id = "attendance-" + digest(owner + ":" + sessionId + ":" + participantId).slice(0, 48);
      const data = { sessionId, participantId, participantType: "member", participantName: String(memberData.name || ""), participantDusun: String(memberData.dusun || ""), status, checkInAt: now.iso, checkOutAt: null, method, verificationStatus: locationVerification ? "verified" : method === "manual" ? "recorded_by_officer" : "self_reported", recordedBy: user.accountId, locationVerification };
      const auditId = randomUUID();
      const inserted = await db.prepare("WITH inserted AS (INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'attendance_record',?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id), logged AS (INSERT INTO records(id,owner,kind,data,created,updated) SELECT ?,?,'attendance_audit',?,?,? FROM inserted) SELECT id FROM inserted")
        .bind(id, owner, JSON.stringify(data), now.iso, now.iso, auditId, owner, JSON.stringify({ action: "attendance.checked_in", title: "Presensi dicatat: " + String(memberData.name || "Peserta"), actorId: user.accountId, actorName: user.displayName, details: { sessionId, attendanceId: id, method, status }, occurredAt: now.iso }), now.iso, now.iso).first();
      if (!inserted) return json({ error: "Presensi untuk peserta ini sudah tercatat." }, 409);
      return json({ ok: true, id, status, checkInAt: now.iso }, 201);
    }
    if (action === "request_correction") {
      if (user.role !== "anggota" || !user.memberId) return json({ error: "Pengajuan koreksi hanya tersedia untuk akun anggota yang terhubung." }, 403);
      const recordId = String(body.attendanceRecordId || ""), requestedStatus = String(body.requestedStatus || ""), reason = String(body.reason || "").trim().slice(0, 1000);
      if (!recordId || !attendanceStatuses.includes(requestedStatus) || reason.length < 10) return json({ error: "Pilih status yang benar dan jelaskan alasan minimal 10 karakter." }, 400);
      const record = await db.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='attendance_record'").bind(recordId, owner).first();
      if (!record) return json({ error: "Catatan presensi tidak ditemukan." }, 404);
      const previous = JSON.parse(String(record.data)) as Record<string, unknown>;
      if (previous.participantId !== user.memberId) return json({ error: "Anda hanya dapat mengoreksi presensi sendiri." }, 403);
      const duplicate = (await rows(owner, "attendance_correction")).some((r) => r.data.attendanceRecordId === recordId && r.data.approvalStatus === "pending");
      if (duplicate) return json({ error: "Masih ada pengajuan koreksi yang menunggu pemeriksaan." }, 409);
      const id = randomUUID(), now = new Date().toISOString();
      const correction = { attendanceRecordId: recordId, sessionId: previous.sessionId, participantId: user.memberId, requestedBy: user.accountId, previousStatus: String(previous.status), requestedStatus, reason, approvalStatus: "pending", reviewedBy: null, reviewedAt: null };
      await db.batch([
        db.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'attendance_correction',?,?,?)").bind(id, owner, JSON.stringify(correction), now, now),
        auditStatement(owner, user, "correction.requested", "Pengajuan koreksi presensi", { correctionId: id, attendanceRecordId: recordId }),
      ]);
      return json({ ok: true, id, approvalStatus: "pending" }, 201);
    }
    if (action === "create_qr") {
      if (!canManage(user)) return json({ error: "Hak membuat token QR tidak tersedia." }, 403);
      const sessionId = String(body.sessionId || "");
      const sessionRow = await db.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='attendance_session'").bind(sessionId, owner).first();
      if (!sessionRow) return json({ error: "Sesi presensi tidak ditemukan." }, 404);
      const session = JSON.parse(String(sessionRow.data)) as SessionData;
      if (!canManageSession(user, session) || session.status !== "active") return json({ error: "Token QR hanya dapat dibuat untuk sesi aktif dalam penugasan Anda." }, 403);
      const now = new Date(), token = randomBytes(32).toString("base64url"), expiresAt = new Date(Math.min(now.getTime() + 30 * 60 * 1000, new Date(session.eventDate + "T" + session.endTime + ":00+07:00").getTime())).toISOString();
      if (Date.parse(expiresAt) <= now.getTime()) return json({ error: "Waktu sesi sudah berakhir." }, 409);
      const id = randomUUID(), created = now.toISOString();
      await db.batch([
        db.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'attendance_qr_token',?,?,?)").bind(id, owner, JSON.stringify({ sessionId, tokenHash: digest(token), expiresAt, status: "active", createdBy: user.accountId }), created, created),
        auditStatement(owner, user, "qr.created", "Token QR presensi dibuat", { sessionId, expiresAt }),
      ]);
      const base = process.env.APP_URL?.trim() || new URL(req.url).origin;
      return json({ ok: true, token, expiresAt, checkInUrl: (base.endsWith("/") ? base.slice(0, -1) : base) + "/dashboard/presensi-saya?sessionId=" + encodeURIComponent(sessionId) + "&token=" + encodeURIComponent(token) }, 201);
    }
    return json({ error: "Tindakan presensi tidak dikenal." }, 400);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "Presensi belum dapat disimpan." }, 400);
  }
}
export async function PATCH(req: Request) {
  try {
    const context = await getContext(req, true);
    if (context.response) return context.response;
    const user = context.user!, owner = user.userId, db = context.db!;
    const body = await readJsonObject(req, 30000) as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "session_status") {
      const sessionId = String(body.sessionId || ""), nextStatus = String(body.status || "");
      if (!["active", "closed", "cancelled"].includes(nextStatus)) return json({ error: "Status sesi tidak valid." }, 400);
      const row = await db.prepare("SELECT data,updated FROM records WHERE id=? AND owner=? AND kind='attendance_session'").bind(sessionId, owner).first();
      if (!row) return json({ error: "Sesi presensi tidak ditemukan." }, 404);
      const previous = JSON.parse(String(row.data)) as SessionData;
      if (!canManageSession(user, previous)) return json({ error: "Sesi berada di luar kewenangan Anda." }, 403);
      if (body.expectedUpdated && String(row.updated) !== String(body.expectedUpdated)) return json({ error: "Sesi telah berubah. Muat ulang sebelum melanjutkan." }, 409);
      if (previous.status === "closed" || previous.status === "cancelled") return json({ error: "Sesi yang telah ditutup atau dibatalkan tidak dapat dibuka kembali." }, 409);
      if (nextStatus === "active" && previous.status !== "scheduled") return json({ error: "Hanya sesi terjadwal yang dapat dibuka." }, 409);
      if (nextStatus === "closed" && previous.status !== "active") return json({ error: "Hanya sesi aktif yang dapat ditutup dan direkap." }, 409);
      const now = new Date().toISOString(), next = { ...previous, status: nextStatus };
      await db.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=? AND kind='attendance_session'").bind(JSON.stringify(next), now, sessionId, owner).run();
      if (nextStatus === "closed") {
        const current = await rows(owner, "attendance_record"), presentIds = new Set(current.filter((r) => r.data.sessionId === sessionId).map((r) => String(r.data.participantId)));
        const memberRows = await db.prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota'").bind(owner).all();
        const statements = memberRows.results.filter((m) => previous.participantIds.includes(String(m.id)) && !presentIds.has(String(m.id))).map((m) => {
          const member = JSON.parse(String(m.data)) as Record<string, unknown>, id = "attendance-" + digest(owner + ":" + sessionId + ":" + String(m.id)).slice(0, 48);
          const data = { sessionId, participantId: String(m.id), participantType: "member", participantName: String(member.name || ""), participantDusun: String(member.dusun || ""), status: "absent", checkInAt: null, checkOutAt: null, method: "manual", verificationStatus: "system_closed", recordedBy: user.accountId, locationVerification: null };
          return db.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'attendance_record',?,?,?) ON CONFLICT(id) DO NOTHING").bind(id, owner, JSON.stringify(data), now, now);
        });
        if (statements.length) await db.batch(statements);
      }
      await appendAudit(owner, user, "session." + nextStatus, "Status sesi presensi diperbarui", { sessionId, previousStatus: previous.status, nextStatus });
      return json({ ok: true, status: nextStatus });
    }
    if (action === "manual_record") {
      if (!canManage(user)) return json({ error: "Hak mencatat daftar hadir tidak tersedia." }, 403);
      const sessionId = String(body.sessionId || ""), participantId = String(body.participantId || ""), status = String(body.status || ""), reason = String(body.reason || "").trim().slice(0, 500);
      if (!attendanceStatuses.includes(status) || !participantId || reason.length < 3) return json({ error: "Pilih peserta, status, dan alasan pencatatan." }, 400);
      const sessionRow = await db.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='attendance_session'").bind(sessionId, owner).first();
      if (!sessionRow) return json({ error: "Sesi tidak ditemukan." }, 404);
      const session = JSON.parse(String(sessionRow.data)) as SessionData;
      if (!canManageSession(user, session) || session.status === "cancelled") return json({ error: "Sesi berada di luar kewenangan Anda atau telah dibatalkan." }, 403);
      if (!session.participantIds.includes(participantId)) return json({ error: "Peserta tidak terdaftar pada sesi ini." }, 400);
      const member = await db.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(participantId, owner).first();
      if (!member) return json({ error: "Peserta tidak ditemukan." }, 404);
      const m = JSON.parse(String(member.data)) as Record<string, unknown>, id = "attendance-" + digest(owner + ":" + sessionId + ":" + participantId).slice(0, 48), now = new Date().toISOString();
      const old = await db.prepare("SELECT data,updated FROM records WHERE id=? AND owner=? AND kind='attendance_record'").bind(id, owner).first();
      if (old && !body.expectedUpdated) return json({ error: "Catatan sudah ada. Gunakan alur koreksi agar riwayat tetap tercatat." }, 409);
      if (old && String(old.updated) !== String(body.expectedUpdated)) return json({ error: "Catatan berubah. Muat ulang sebelum menyimpan." }, 409);
      const previous = old ? JSON.parse(String(old.data)) as Record<string, unknown> : null;
      const data = { sessionId, participantId, participantType: "member", participantName: String(m.name || ""), participantDusun: String(m.dusun || ""), status, checkInAt: status === "present" || status === "late" ? now : null, checkOutAt: null, method: "manual", verificationStatus: "recorded_by_officer", recordedBy: user.accountId, locationVerification: null, ...(previous ? { previousStatus: previous.status } : {}) };
      if (old) await db.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=? AND kind='attendance_record'").bind(JSON.stringify(data), now, id, owner).run();
      else await db.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,'attendance_record',?,?,?)").bind(id, owner, JSON.stringify(data), now, now).run();
      await appendAudit(owner, user, old ? "attendance.corrected_by_officer" : "attendance.manual_recorded", "Pencatatan manual presensi", { attendanceId: id, participantId, previousStatus: previous?.status ?? null, nextStatus: status, reason });
      return json({ ok: true, id, status });
    }
    if (action === "review_correction") {
      if (!canReview(user)) return json({ error: "Hak pemeriksaan koreksi tidak tersedia." }, 403);
      const correctionId = String(body.correctionId || ""), decision = String(body.decision || ""), reviewNote = String(body.reviewNote || "").trim().slice(0, 1000);
      if (!["approved", "rejected"].includes(decision) || reviewNote.length < 3) return json({ error: "Pilih keputusan dan tulis alasan pemeriksaan." }, 400);
      const row = await db.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='attendance_correction'").bind(correctionId, owner).first();
      if (!row) return json({ error: "Pengajuan koreksi tidak ditemukan." }, 404);
      const correction = JSON.parse(String(row.data)) as Record<string, unknown>;
      if (correction.approvalStatus !== "pending") return json({ error: "Pengajuan ini sudah diputuskan." }, 409);
      const attendanceRow = await db.prepare("SELECT data,updated FROM records WHERE id=? AND owner=? AND kind='attendance_record'").bind(String(correction.attendanceRecordId), owner).first();
      if (!attendanceRow) return json({ error: "Catatan presensi sumber tidak ditemukan." }, 409);
      const attendance = JSON.parse(String(attendanceRow.data)) as Record<string, unknown>;
      const now = new Date().toISOString();
      const nextCorrection = { ...correction, approvalStatus: decision, reviewedBy: user.accountId, reviewedAt: now, reviewNote };
      if (decision === "approved") {
        const nextAttendance = { ...attendance, previousStatus: attendance.status, status: correction.requestedStatus, verificationStatus: "corrected", correctionId, correctedAt: now };
        await db.batch([
          db.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=? AND kind='attendance_record'").bind(JSON.stringify(nextAttendance), now, String(correction.attendanceRecordId), owner),
          db.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=? AND kind='attendance_correction'").bind(JSON.stringify(nextCorrection), now, correctionId, owner),
        ]);
      } else {
        await db.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=? AND kind='attendance_correction'").bind(JSON.stringify(nextCorrection), now, correctionId, owner).run();
      }
      await appendAudit(owner, user, "correction." + decision, "Pengajuan koreksi presensi diputuskan", { correctionId, attendanceRecordId: correction.attendanceRecordId, decision, reviewNote });
      return json({ ok: true, approvalStatus: decision });
    }
    return json({ error: "Tindakan presensi tidak dikenal." }, 400);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({ error: "Perubahan presensi belum dapat disimpan." }, 400);
  }
}
