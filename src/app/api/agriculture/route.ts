import { env } from "@/lib/runtime";
import { getAuthenticatedUser } from "@/lib/auth";
import type { Principal, Role } from "@/lib/permissions";
import { json, sameOrigin } from "@/lib/account-access";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

const units = new Set(["kg", "kuintal", "ton", "liter", "buah", "ikat", "batang"]);
const tenureTypes = new Set(["owned", "leased", "shared", "group", "other"]);
const isoDate = (value: unknown, label: string, optional = false) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw && optional) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(label + " harus menggunakan tanggal yang valid.");
  const [year, month, day] = raw.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) {
    throw new Error(label + " tidak valid.");
  }
  return raw;
};
const textValue = (value: unknown, label: string, min: number, max: number) => {
  const valueText = typeof value === "string" ? value.trim() : "";
  if (valueText.length < min || valueText.length > max) throw new Error(label + " harus berisi " + min + "–" + max + " karakter.");
  return valueText;
};
const numericValue = (value: unknown, label: string, min: number, max: number, decimals = 2) => {
  const number = typeof value === "number" ? value : Number(String(value ?? ""));
  if (!Number.isFinite(number) || number < min || number > max || (decimals === 0 && !Number.isSafeInteger(number))) {
    throw new Error(label + " harus berupa angka yang valid.");
  }
  const scale = 10 ** decimals;
  return Math.round(number * scale) / scale;
};
const slug = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

async function context(request: Request, write = false, verification = false) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: json({ error: "Silakan masuk untuk mengelola data pertanian." }, 401) };
  if (write && !sameOrigin(request)) return { error: json({ error: "Permintaan lintas situs ditolak." }, 403) };
  if (!env.DB) return { error: json({ error: "Database belum tersedia." }, 503) };
  const assignedAgriculture = user.role === "koordinator" && user.programIds.includes("3");
  if (!["admin", "ketua"].includes(user.role) && !assignedAgriculture) {
    return { error: json({ error: "Modul pertanian hanya tersedia bagi Administrator, Ketua, atau Koordinator Program Pertanian." }, 403) };
  }
  if (verification && !["admin", "ketua"].includes(user.role)) {
    return { error: json({ error: "Verifikasi data hanya dapat dilakukan Administrator atau Ketua." }, 403) };
  }
  return { user, db: env.DB };
}

async function audit(user: Principal, action: string, targetType: "commodity" | "parcel" | "crop_cycle" | "harvest", targetId: string, reason = "", details: Record<string, unknown> = {}) {
  if (!env.DB) throw new Error("Database belum tersedia.");
  return env.DB.prepare(
    "INSERT INTO agriculture_audit(id,workspace_owner,actor_id,actor_role,action,target_type,target_id,reason,details,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)"
  ).bind(crypto.randomUUID(), user.userId, user.accountId, user.role, action, targetType, targetId, reason, JSON.stringify(details), new Date().toISOString());
}

function failure(error: unknown) {
  if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
  return json({ error: error instanceof Error ? error.message : "Data pertanian belum dapat diproses." }, 400);
}

export async function GET(request: Request) {
  const c = await context(request);
  if (c.error) return c.error;
  try {
    const owner = c.user!.userId;
    const [members, commodities, parcels, cycles, harvests, auditRows] = await Promise.all([
      c.db!.prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota' ORDER BY updated DESC").bind(owner).all(),
      c.db!.prepare("SELECT id,code,name,default_unit,status,created_at,updated_at FROM agriculture_commodities WHERE workspace_owner=? ORDER BY status,name").bind(owner).all(),
      c.db!.prepare("SELECT p.id,p.member_id,p.parcel_code,p.name,p.area_m2,p.tenure_type,p.location_label,p.status,p.verification_status,p.verification_note,p.created_at,p.updated_at,r.data AS member_data FROM farm_parcels p JOIN records r ON r.id=p.member_id AND r.owner=p.workspace_owner AND r.kind='anggota' WHERE p.workspace_owner=? ORDER BY p.created_at DESC").bind(owner).all(),
      c.db!.prepare("SELECT c.id,c.parcel_id,c.commodity_id,c.season_label,c.planted_area_m2,c.planting_date,c.expected_harvest_date,c.status,c.verification_status,c.verification_note,c.created_at,c.updated_at,p.name AS parcel_name,p.parcel_code,a.name AS commodity_name,a.default_unit FROM crop_cycles c JOIN farm_parcels p ON p.id=c.parcel_id AND p.workspace_owner=c.workspace_owner JOIN agriculture_commodities a ON a.id=c.commodity_id AND a.workspace_owner=c.workspace_owner WHERE c.workspace_owner=? ORDER BY c.planting_date DESC,c.created_at DESC").bind(owner).all(),
      c.db!.prepare("SELECT h.id,h.crop_cycle_id,h.harvest_date,h.quantity,h.unit_code,h.notes,h.verification_status,h.verification_note,h.created_at,c.season_label,p.name AS parcel_name,p.parcel_code,a.name AS commodity_name FROM harvest_records h JOIN crop_cycles c ON c.id=h.crop_cycle_id AND c.workspace_owner=h.workspace_owner JOIN farm_parcels p ON p.id=c.parcel_id AND p.workspace_owner=c.workspace_owner JOIN agriculture_commodities a ON a.id=c.commodity_id AND a.workspace_owner=c.workspace_owner WHERE h.workspace_owner=? ORDER BY h.harvest_date DESC,h.created_at DESC").bind(owner).all(),
      c.db!.prepare("SELECT actor_id,actor_role,action,target_type,target_id,reason,created_at FROM agriculture_audit WHERE workspace_owner=? ORDER BY created_at DESC LIMIT 40").bind(owner).all(),
    ]);
    const memberOptions = members.results.flatMap((row) => {
      try {
        const data = JSON.parse(String(row.data));
        return data.status === "Aktif" && data.verification === "Terverifikasi"
          ? [{ id: String(row.id), name: String(data.name || "Anggota"), dusun: String(data.dusun || "") }]
          : [];
      } catch { return []; }
    });
    const parcelRows = parcels.results.map((row) => {
      let memberName = "Anggota";
      try { memberName = String(JSON.parse(String(row.member_data)).name || memberName); } catch {}
      const { member_data: _privateMemberData, ...parcel } = row;
      return { ...parcel, member_name: memberName };
    });
    return json({
      members: memberOptions,
      commodities: commodities.results,
      parcels: parcelRows,
      cropCycles: cycles.results,
      harvests: harvests.results,
      audit: auditRows.results,
      permissions: { canVerify: ["admin", "ketua"].includes(c.user!.role) },
    });
  } catch {
    return json({ error: "Data pertanian belum dapat dimuat. Periksa apakah migrasi 006 sudah diterapkan pada database aplikasi." }, 503);
  }
}

export async function POST(request: Request) {
  const c = await context(request, true);
  if (c.error) return c.error;
  try {
    const raw = await readJsonObject(request, 12000);
    const action = String(raw.action || "");
    const user = c.user!;
    const db = c.db!;
    const now = new Date().toISOString();

    if (action === "create_commodity") {
      const name = textValue(raw.name, "Nama komoditas", 2, 120);
      const code = slug(name);
      if (code.length < 2) throw new Error("Nama komoditas harus menghasilkan kode yang valid.");
      const unit = String(raw.defaultUnit || "");
      if (!units.has(unit)) throw new Error("Pilih satuan dasar komoditas yang tersedia.");
      const duplicate = await db.prepare("SELECT id FROM agriculture_commodities WHERE workspace_owner=? AND code=?").bind(user.userId, code).first();
      if (duplicate) return json({ error: "Komoditas tersebut sudah terdaftar." }, 409);
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO agriculture_commodities(id,workspace_owner,code,name,default_unit,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,'active',?,?,?)")
          .bind(id, user.userId, code, name, unit, user.accountId, now, now),
        await audit(user, "Komoditas ditambahkan", "commodity", id, "", { name, unit }),
      ]);
      return json({ ok: true, id }, 201);
    }

    if (action === "create_parcel") {
      const memberId = textValue(raw.memberId, "Anggota penanggung jawab", 1, 100);
      const member = await db.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(memberId, user.userId).first();
      if (!member) return json({ error: "Anggota tidak ditemukan dalam workspace ini." }, 404);
      let memberData: Record<string, unknown>;
      try { memberData = JSON.parse(String(member.data)); } catch { return json({ error: "Data anggota perlu diperiksa sebelum digunakan." }, 409); }
      if (memberData.status !== "Aktif" || memberData.verification !== "Terverifikasi") {
        return json({ error: "Lahan hanya dapat dikaitkan dengan anggota aktif yang datanya telah diverifikasi." }, 409);
      }
      const parcelCode = textValue(raw.parcelCode, "Kode lahan", 2, 80).toUpperCase();
      const name = textValue(raw.name, "Nama/pengenal lahan", 2, 140);
      const areaM2 = numericValue(raw.areaM2, "Luas lahan (m²)", 0.01, 100000000);
      const tenureType = String(raw.tenureType || "");
      if (!tenureTypes.has(tenureType)) throw new Error("Pilih status penguasaan lahan yang valid.");
      const locationLabel = typeof raw.locationLabel === "string" ? raw.locationLabel.trim().slice(0, 200) : "";
      const duplicate = await db.prepare("SELECT id FROM farm_parcels WHERE workspace_owner=? AND parcel_code=?").bind(user.userId, parcelCode).first();
      if (duplicate) return json({ error: "Kode lahan sudah digunakan dalam workspace ini." }, 409);
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO farm_parcels(id,workspace_owner,member_id,parcel_code,name,area_m2,tenure_type,location_label,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(id, user.userId, memberId, parcelCode, name, areaM2, tenureType, locationLabel, user.accountId, user.accountId, now, now),
        await audit(user, "Data lahan dicatat; menunggu verifikasi", "parcel", id, "", { parcelCode, areaM2, tenureType }),
      ]);
      return json({ ok: true, id }, 201);
    }

    if (action === "create_crop_cycle") {
      const parcelId = textValue(raw.parcelId, "Lahan", 1, 100);
      const commodityId = textValue(raw.commodityId, "Komoditas", 1, 100);
      const seasonLabel = textValue(raw.seasonLabel, "Musim/periode tanam", 2, 100);
      const plantedAreaM2 = numericValue(raw.plantedAreaM2, "Luas tanam (m²)", 0.01, 100000000);
      const plantingDate = isoDate(raw.plantingDate, "Tanggal tanam")!;
      const expectedHarvestDate = isoDate(raw.expectedHarvestDate, "Perkiraan panen", true);
      const [parcel, commodity] = await Promise.all([
        db.prepare("SELECT id,area_m2,status FROM farm_parcels WHERE id=? AND workspace_owner=?").bind(parcelId, user.userId).first(),
        db.prepare("SELECT id,status FROM agriculture_commodities WHERE id=? AND workspace_owner=?").bind(commodityId, user.userId).first(),
      ]);
      if (!parcel || parcel.status !== "active") return json({ error: "Lahan aktif tidak ditemukan dalam workspace ini." }, 404);
      if (!commodity || commodity.status !== "active") return json({ error: "Komoditas aktif tidak ditemukan dalam workspace ini." }, 404);
      if (plantedAreaM2 > Number(parcel.area_m2)) throw new Error("Luas tanam tidak boleh melebihi luas lahan terdaftar.");
      if (expectedHarvestDate && expectedHarvestDate < plantingDate) throw new Error("Perkiraan panen tidak boleh mendahului tanggal tanam.");
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO crop_cycles(id,workspace_owner,parcel_id,commodity_id,season_label,planted_area_m2,planting_date,expected_harvest_date,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(id, user.userId, parcelId, commodityId, seasonLabel, plantedAreaM2, plantingDate, expectedHarvestDate, user.accountId, user.accountId, now, now),
        await audit(user, "Siklus tanam dicatat; menunggu verifikasi", "crop_cycle", id, "", { seasonLabel, plantedAreaM2, plantingDate, expectedHarvestDate }),
      ]);
      return json({ ok: true, id }, 201);
    }

    if (action === "create_harvest") {
      const cropCycleId = textValue(raw.cropCycleId, "Siklus tanam", 1, 100);
      const harvestDate = isoDate(raw.harvestDate, "Tanggal panen")!;
      const quantity = numericValue(raw.quantity, "Hasil panen", 0.001, 100000000000, 3);
      const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 2000) : "";
      const cycle = await db.prepare("SELECT c.id,c.status,a.default_unit FROM crop_cycles c JOIN agriculture_commodities a ON a.id=c.commodity_id AND a.workspace_owner=c.workspace_owner WHERE c.id=? AND c.workspace_owner=?")
        .bind(cropCycleId, user.userId).first();
      if (!cycle || cycle.status === "failed") return json({ error: "Siklus tanam tidak tersedia atau sudah dinyatakan gagal." }, 404);
      const unit = String(cycle.default_unit);
      if (!units.has(unit)) return json({ error: "Satuan komoditas perlu diperiksa sebelum panen dicatat." }, 409);
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO harvest_records(id,workspace_owner,crop_cycle_id,harvest_date,quantity,unit_code,notes,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
          .bind(id, user.userId, cropCycleId, harvestDate, quantity, unit, notes, user.accountId, user.accountId, now, now),
        await audit(user, "Hasil panen dicatat; menunggu verifikasi", "harvest", id, "", { harvestDate, quantity, unit }),
      ]);
      return json({ ok: true, id }, 201);
    }

    return json({ error: "Jenis pencatatan pertanian tidak dikenal." }, 400);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  const userContext = await context(request, true);
  if (userContext.error) return userContext.error;
  try {
    const raw = await readJsonObject(request, 5000);
    const action = String(raw.action || "");
    const id = textValue(raw.id, "ID data", 1, 100);
    const reason = typeof raw.reason === "string" ? raw.reason.trim().slice(0, 500) : "";
    const now = new Date().toISOString();
    const user = userContext.user!;
    const db = userContext.db!;
    if (!["admin", "ketua"].includes(user.role)) return json({ error: "Verifikasi hanya dapat dilakukan Administrator atau Ketua." }, 403);
    if (!["verify_parcel", "reject_parcel", "verify_crop_cycle", "reject_crop_cycle", "verify_harvest", "reject_harvest"].includes(action)) {
      return json({ error: "Tindakan verifikasi tidak dikenal." }, 400);
    }
    const targetType = action.endsWith("parcel") ? "parcel" : action.endsWith("crop_cycle") ? "crop_cycle" : "harvest";
    const nextStatus = action.startsWith("verify_") ? "verified" : "rejected";
    if (nextStatus === "rejected" && reason.length < 10) throw new Error("Alasan penolakan harus dijelaskan minimal 10 karakter.");
    let exists: Record<string, unknown> | null = null;
    if (targetType === "parcel") {
      exists = await db.prepare("SELECT id FROM farm_parcels WHERE id=? AND workspace_owner=? AND status='active'").bind(id, user.userId).first();
    } else if (targetType === "crop_cycle") {
      exists = await db.prepare(
        "SELECT c.id FROM crop_cycles c JOIN farm_parcels p ON p.id=c.parcel_id AND p.workspace_owner=c.workspace_owner WHERE c.id=? AND c.workspace_owner=? AND p.verification_status='verified' AND p.status='active'"
      ).bind(id, user.userId).first();
      if (!exists) return json({ error: "Verifikasi lahan terlebih dahulu sebelum memverifikasi siklus tanam." }, 409);
    } else {
      exists = await db.prepare(
        "SELECT h.id FROM harvest_records h JOIN crop_cycles c ON c.id=h.crop_cycle_id AND c.workspace_owner=h.workspace_owner JOIN farm_parcels p ON p.id=c.parcel_id AND p.workspace_owner=c.workspace_owner WHERE h.id=? AND h.workspace_owner=? AND c.verification_status='verified' AND p.verification_status='verified' AND p.status='active'"
      ).bind(id, user.userId).first();
      if (!exists) return json({ error: "Lahan dan siklus tanam harus terverifikasi sebelum hasil panen diverifikasi." }, 409);
    }
    if (!exists) return json({ error: "Data pertanian tidak ditemukan dalam workspace ini." }, 404);
    const table = targetType === "parcel" ? "farm_parcels" : targetType === "crop_cycle" ? "crop_cycles" : "harvest_records";
    await db.batch([
      db.prepare("UPDATE " + table + " SET verification_status=?,verification_note=?,verified_by=?,verified_at=?,updated_by=?,updated_at=? WHERE id=? AND workspace_owner=?")
        .bind(nextStatus, reason, nextStatus === "verified" ? user.accountId : null, nextStatus === "verified" ? now : null, user.accountId, now, id, user.userId),
      await audit(user, nextStatus === "verified" ? "Data diverifikasi" : "Data ditolak", targetType, id, reason),
    ]);
    return json({ ok: true, verificationStatus: nextStatus });
  } catch (error) {
    return failure(error);
  }
}
