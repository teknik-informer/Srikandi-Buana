import {createHash, randomUUID} from "node:crypto";
import {getAuthenticatedUser} from "@/lib/auth";
import {env} from "@/lib/runtime";
import {canReadKindForRole, canReadRecord, visibleRecord, type Principal} from "@/lib/permissions";
import type {ReportGroupId} from "@/lib/enterprise-reporting";
import type {Row} from "@/lib/srikandi";
import {readJsonObject, RequestBodyError} from "@/lib/request-body";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  Response.json(value, {status, headers: {"Cache-Control": "private, no-store"}});
const groups: ReportGroupId[] = ["operasional","keanggotaan","administrasi","keuangan","usaha","publikasi"];
const groupKinds: Record<ReportGroupId,string[]> = {
  operasional:["program","laporan_program","tindaklanjut","kegiatan","musyawarah","kehadiran"],
  keanggotaan:["anggota"],
  administrasi:["pengurus","persetujuan","register","sumber","kelembagaan","transkripsi","dokumen"],
  keuangan:["kas"],
  usaha:["aset","lotkopi","usaha","kemitraan"],
  publikasi:["publikasi","galeri"],
};
function canCreate(user: Principal, group: ReportGroupId) {
  if (user.role === "sekretaris") return ["operasional","keanggotaan","administrasi","publikasi"].includes(group);
  if (user.role === "bendahara") return ["keuangan","usaha"].includes(group);
  return user.role === "koordinator" && group === "operasional";
}
function canReadPackage(user: Principal, group: ReportGroupId, createdBy: string) {
  if (user.role === "ketua") return true;
  if (user.role === "sekretaris") return ["operasional","keanggotaan","administrasi","publikasi"].includes(group);
  if (user.role === "bendahara") return ["keuangan","usaha"].includes(group);
  return user.role === "koordinator" && group === "operasional" && createdBy === user.accountId;
}
function canVerify(user: Principal, group: ReportGroupId) {
  if (user.role === "sekretaris") return ["operasional","keanggotaan","administrasi","publikasi"].includes(group);
  return user.role === "bendahara" && ["keuangan","usaha"].includes(group);
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return "{" + Object.keys(object).sort().map(key => JSON.stringify(key) + ":" + stable(object[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
function sha256(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}
function rowDate(row: Row) {
  const value = row.data.date || row.data.dueDate || row.created;
  const date = String(value || "").slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}
function inPeriod(row: Row, start: string, end: string) {
  const date = rowDate(row);
  return (!start || (date && date >= start)) && (!end || (date && date <= end));
}
function chairSafeSnapshot(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const snapshot = value as Record<string, unknown>;
  const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  const safeRows = rows.filter((item): item is Row =>
    Boolean(item && typeof item === "object" && !Array.isArray(item) &&
      typeof (item as Row).kind === "string" && (item as Row).data &&
      typeof (item as Row).data === "object")
  ).map(row => {
    if (["kehadiran","transkripsi","anggota","persetujuan"].includes(row.kind)) {
      return visibleRecord({role:"ketua"} as Principal,row);
    }
    const metadataKeys = ["date","status","type","category","programId","period","code"];
    return {
      id: row.id,
      kind: row.kind,
      created: row.created,
      updated: row.updated,
      data: Object.fromEntries(metadataKeys
        .filter(key => key in row.data)
        .map(key => [key,row.data[key]])),
    };
  });
  return {...snapshot,rows:safeRows};
}
function snapshotRows(group: ReportGroupId, rows: Row[]) {
  if (group === "keanggotaan") {
    const count = (predicate: (row: Row) => boolean) => rows.filter(predicate).length;
    const statuses = new Map<string,number>();
    for (const row of rows) {
      const status = String(row.data.status || "Belum ditetapkan");
      statuses.set(status,(statuses.get(status)||0)+1);
    }
    return {
      summary: {
        total: rows.length,
        statuses: [...statuses.entries()].sort(([a],[b])=>a.localeCompare(b,"id")).map(([status,total])=>({status,total})),
        verified: count(row=>row.data.verification === "Terverifikasi"),
        consentRecorded: count(row=>row.data.consent === "Terdokumentasi"),
      },
      rows: [],
    };
  }
  const safeRows = rows.map(row => {
    if (row.kind === "kehadiran") {
      const ids = Array.isArray(row.data.memberIds) ? row.data.memberIds : [];
      const names = Array.isArray(row.data.memberNames) ? row.data.memberNames : [];
      return {...row, data: {
        ...(row.data.eventId ? {eventId:row.data.eventId} : {}),
        ...(row.data.name ? {name:row.data.name} : {}),
        count: Math.max(ids.length,names.length),
      }};
    }
    return row;
  });
  return {summary:{total:safeRows.length},rows:safeRows};
}
async function context() {
  const user = await getAuthenticatedUser();
  if (!user) return {error:json({error:"Silakan masuk untuk mengakses paket laporan."},401)};
  if (user.role === "admin" || user.role === "anggota") return {error:json({error:"Akses paket laporan tidak tersedia untuk peran ini."},403)};
  if (!env.DB) return {error:json({error:"Database belum tersedia."},503)};
  return {user,db:env.DB};
}
export async function GET() {
  try {
    const c = await context(); if (c.error) return c.error;
    const result = await c.db!.prepare("SELECT id,group_id,title,period_start,period_end,package_version,status,snapshot_hash,created_by,created_at,verified_by,verified_at,verification_note,approved_by,approved_at,approval_note,rejected_by,rejected_at,rejection_note,snapshot FROM report_packages WHERE owner=? ORDER BY created_at DESC LIMIT 100").bind(c.user!.userId).all();
    const visible = result.results.filter(row =>
      groups.includes(String(row.group_id) as ReportGroupId) &&
      canReadPackage(c.user!,String(row.group_id) as ReportGroupId,String(row.created_by))
    ).map(row => c.user!.role === "ketua"
      ? {...row,snapshot:chairSafeSnapshot(row.snapshot)}
      : row);
    return json({packages:visible});
  } catch {
    return json({error:"Paket laporan belum tersedia. Pastikan migrasi paket laporan telah diterapkan pada database lingkungan ini."},503);
  }
}
export async function POST(req: Request) {
  try {
    const c = await context(); if (c.error) return c.error;
    if (req.headers.get("origin") !== new URL(req.url).origin && req.headers.get("sec-fetch-site") !== "same-origin")
      return json({error:"Permintaan lintas situs ditolak."},403);
    const body = await readJsonObject(req,12000) as {groupId?:unknown;title?:unknown;periodStart?:unknown;periodEnd?:unknown};
    const group = String(body.groupId || "") as ReportGroupId;
    const title = String(body.title || "").trim();
    const start = body.periodStart == null || body.periodStart === "" ? "" : String(body.periodStart);
    const end = body.periodEnd == null || body.periodEnd === "" ? "" : String(body.periodEnd);
    const validDate = (value:string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+"T00:00:00Z").toISOString().slice(0,10)===value);
    if (!groups.includes(group) || !canCreate(c.user!,group)) return json({error:"Anda tidak berwenang menyusun paket untuk domain ini."},403);
    if (c.user!.role === "koordinator" && c.user!.programIds.length === 0) return json({error:"Akun Koordinator belum memiliki penugasan program. Hubungi pengelola organisasi."},403);
    if (title.length < 3 || title.length > 200 || !validDate(start) || !validDate(end) || (start && end && start > end))
      return json({error:"Judul atau rentang periode tidak valid."},400);
    const raw = await c.db!.prepare("SELECT id,kind,data,created,updated,md5(data::jsonb::text) AS source_hash FROM records WHERE owner=? ORDER BY created,id").bind(c.user!.userId).all();
    const candidates = raw.results.map(item => ({
      id:String(item.id),kind:String(item.kind),data:JSON.parse(String(item.data)) as Record<string,unknown>,
      created:String(item.created),updated:String(item.updated),
      sourceHash:String(item.source_hash),
    }));
    const allowed = candidates.filter(row => groupKinds[group].includes(row.kind) && canReadRecord(c.user!,row));
    const periodRows = allowed.filter(row => inPeriod(row as unknown as Row,start,end));
    const sourceManifest = periodRows.map(row => ({id:row.id,kind:row.kind,updated:row.updated,sourceHash:row.sourceHash}));
    // Capture the exact visibility scope used to build this snapshot.
    const sourceScope = c.user!.role === "koordinator"
      ? {mode:"program_ids",programIds:[...new Set(c.user!.programIds.map(String))].sort(),kinds:groupKinds[group].filter(kind=>canReadKindForRole(c.user!.role,kind))}
      : {mode:"all",kinds:groupKinds[group].filter(kind=>canReadKindForRole(c.user!.role,kind))};
    const visibleRows = periodRows.map(row => visibleRecord(c.user!,row) as Row);
    const data = snapshotRows(group,visibleRows);
    const snapshot = {
      organization:"KWT Srikandi Buana",groupId:group,title,
      periodStart:start || null,periodEnd:end || null,
      generatedAt:new Date().toISOString(),sourceCount:sourceManifest.length,
      summary:data.summary,rows:data.rows,
    };
    const snapshotHash = sha256(snapshot);
    const id = randomUUID(), now = new Date().toISOString(), eventId = randomUUID();
    const periodStartKey = start || "", periodEndKey = end || "";
    const counterSql = "INSERT INTO report_package_counters(owner,group_id,period_start_key,period_end_key,last_version) VALUES(?,?,?,?,(SELECT COALESCE(MAX(package_version),0)+1 FROM report_packages WHERE owner=? AND group_id=? AND period_start IS NOT DISTINCT FROM ?::date AND period_end IS NOT DISTINCT FROM ?::date)) ON CONFLICT(owner,group_id,period_start_key,period_end_key) DO UPDATE SET last_version=report_package_counters.last_version+1 RETURNING last_version";
    const createSql = [
      "WITH candidates AS MATERIALIZED (SELECT id,owner,status,snapshot_hash FROM report_packages WHERE owner=? AND group_id=? AND period_start IS NOT DISTINCT FROM ?::date AND period_end IS NOT DISTINCT FROM ?::date AND status<>'superseded')",
      ", superseded AS (UPDATE report_packages p SET status='superseded',superseded_at=? FROM candidates c WHERE p.id=c.id RETURNING p.id,p.owner,c.status AS previous_status,p.snapshot_hash)",
      ", old_events AS (INSERT INTO report_package_events(id,owner,package_id,actor_id,action,from_status,to_status,note,snapshot_hash,created_at) SELECT gen_random_uuid()::text,owner,id,?,'superseded',previous_status,'superseded','Versi baru dibuat.',snapshot_hash,? FROM superseded RETURNING id)",
      ", created AS (INSERT INTO report_packages(id,owner,group_id,title,period_start,period_end,package_version,status,source_manifest,source_scope,snapshot,snapshot_hash,created_by,created_at) SELECT ?,?,?,?,?,?,(SELECT last_version FROM report_package_counters WHERE owner=? AND group_id=? AND period_start_key=? AND period_end_key=?),'draft',?::jsonb,?::jsonb,?::jsonb,?,?,? WHERE (SELECT count(*) FROM old_events)>=0 RETURNING id,status,snapshot_hash,package_version)",
      "INSERT INTO report_package_events(id,owner,package_id,actor_id,action,from_status,to_status,note,snapshot_hash,created_at) SELECT ?,?,id,?,'created',NULL,'draft','Paket dibuat dari catatan sumber yang dapat diakses.',snapshot_hash,? FROM created RETURNING package_id"
    ].join(" ");
    const batchResults = await c.db!.batch([
      c.db!.prepare(counterSql).bind(c.user!.userId,group,periodStartKey,periodEndKey,c.user!.userId,group,start||null,end||null),
      c.db!.prepare(createSql).bind(
        c.user!.userId,group,start||null,end||null,now,c.user!.accountId,now,
        id,c.user!.userId,group,title,start||null,end||null,
        c.user!.userId,group,periodStartKey,periodEndKey,
        JSON.stringify(sourceManifest),JSON.stringify(sourceScope),JSON.stringify(snapshot),snapshotHash,c.user!.accountId,now,
        eventId,c.user!.userId,c.user!.accountId,now
      )
    ]);
    const counterRows = (batchResults[0] as {rows?:Array<{last_version:number|string}>}).rows || [];
    const insertedRows = (batchResults[1] as {rows?:Array<{package_id:string}>}).rows || [];
    const version = Number(counterRows[0]?.last_version || 0);
    if (!insertedRows.length || version < 1) return json({error:"Paket belum dapat dibuat. Periksa kembali periode dan versi."},409);
    return json({ok:true,id,version,snapshotHash},201);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({error:error.message},error.status);
    return json({error:"Paket laporan belum dapat dibuat. Pastikan migrasi 009 telah diterapkan dan sumber data valid."},503);
  }
}
export async function PATCH(req: Request) {
  try {
    const c = await context(); if (c.error) return c.error;
    if (req.headers.get("origin") !== new URL(req.url).origin && req.headers.get("sec-fetch-site") !== "same-origin")
      return json({error:"Permintaan lintas situs ditolak."},403);
    const body = await readJsonObject(req,8000) as {id?:unknown;action?:unknown;note?:unknown};
    const id = String(body.id || ""), action = String(body.action || "");
    const note = String(body.note || "").trim();
    if (!id || id.length > 80 || !["verify","approve","reject"].includes(action) || note.length < 3 || note.length > 2000)
      return json({error:"Permintaan perubahan status tidak valid. Catatan minimal 3 karakter."},400);
    const pkg = await c.db!.prepare("SELECT id,group_id,status,created_by,snapshot_hash,source_manifest FROM report_packages WHERE id=? AND owner=?").bind(id,c.user!.userId).first();
    if (!pkg || !groups.includes(String(pkg.group_id) as ReportGroupId)) return json({error:"Paket tidak ditemukan."},404);
    const group = String(pkg.group_id) as ReportGroupId;
    let from = "", to = "", assignments = "", extraCondition = "";
    if (action === "verify") {
      if (!canVerify(c.user!,group)) return json({error:"Verifikasi hanya dapat dilakukan pemilik domain."},403);
      from = "draft"; to = "verified";
      assignments = "verified_by=?,verified_at=?,verification_note=?";
      extraCondition = "AND created_by<>?";
    } else {
      if (c.user!.role !== "ketua") return json({error:"Keputusan akhir paket hanya dapat dilakukan Ketua."},403);
      if (String(pkg.created_by) === c.user!.accountId) return json({error:"Penyusun paket tidak dapat mengesahkan paket buatannya sendiri."},403);
      if (action === "approve") {
        from = "verified"; to = "approved";
        assignments = "approved_by=?,approved_at=?,approval_note=?";
        extraCondition = [
          "AND report_packages.source_scope IS NOT NULL",
          "AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_packages.source_manifest) AS items(item) LEFT JOIN records r ON r.id=items.item->>'id' AND r.owner=report_packages.owner AND r.kind=items.item->>'kind' WHERE r.id IS NULL OR r.updated IS DISTINCT FROM items.item->>'updated' OR md5(r.data::jsonb::text) IS DISTINCT FROM items.item->>'sourceHash')",
          "AND NOT EXISTS (SELECT 1 FROM records r CROSS JOIN LATERAL (SELECT LEFT(COALESCE(NULLIF(r.data::jsonb->>'date',''),NULLIF(r.data::jsonb->>'dueDate',''),r.created::text),10) AS source_date) d WHERE r.owner=report_packages.owner AND r.kind IN (SELECT jsonb_array_elements_text(report_packages.source_scope->'kinds')) AND (report_packages.source_scope->>'mode'='all' OR (report_packages.source_scope->>'mode'='program_ids' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(report_packages.source_scope->'programIds') AS scoped(program_id) WHERE scoped.program_id=r.data::jsonb->>'programId'))) AND (report_packages.period_start IS NULL OR (d.source_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND d.source_date >= report_packages.period_start::text)) AND (report_packages.period_end IS NULL OR (d.source_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND d.source_date <= report_packages.period_end::text)) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_packages.source_manifest) AS items(item) WHERE items.item->>'id'=r.id AND items.item->>'kind'=r.kind))"
        ].join(" ");
      } else {
        from = "verified"; to = "rejected";
        assignments = "rejected_by=?,rejected_at=?,rejection_note=?";
      }
    }
    const now = new Date().toISOString();
    const result = await c.db!.prepare(`WITH changed AS (
      UPDATE report_packages SET status=?,${assignments}
      WHERE id=? AND owner=? AND status=? ${extraCondition}
      RETURNING id,owner,status,snapshot_hash
    )
    INSERT INTO report_package_events(id,owner,package_id,actor_id,action,from_status,to_status,note,snapshot_hash,created_at)
    SELECT ?,owner,id,?, ?,?, ?,?,snapshot_hash,? FROM changed
    RETURNING package_id`).bind(
      to,c.user!.accountId,now,note,id,c.user!.userId,from,
      ...(action==="verify" ? [c.user!.accountId] : []),
      randomUUID(),c.user!.userId,action==="verify"?"verified":action==="approve"?"approved":"rejected",
      from,to,note,now
    ).all();
    if (!result.results.length) {
      if (action === "approve") return json({error:"Paket belum dapat disahkan: status berubah atau ada sumber yang berubah, dihapus, atau tidak lagi cocok. Buat versi baru dan verifikasi ulang."},409);
      return json({error:"Status paket berubah atau tindakan tidak memenuhi syarat. Muat ulang daftar paket."},409);
    }
    return json({ok:true,id,status:to});
  } catch (error) {
    if (error instanceof RequestBodyError) return json({error:error.message},error.status);
    return json({error:"Status paket belum dapat diperbarui."},503);
  }
}
