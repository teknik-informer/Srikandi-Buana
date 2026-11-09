import { required, json, errorReply } from "@/lib/ecosystem/guard";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

const financeRoles = ["admin", "ketua", "bendahara"];
const policyTypes = [
  "membership_dues",
  "savings",
  "loan",
  "compensation",
  "allowance",
  "asset_use",
];

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function organizationId(db: NonNullable<Awaited<ReturnType<typeof required>>["db"]>, owner: string) {
  const relation = await db.prepare(
    "SELECT to_regclass('workspace_v14.member_financial_policies') AS policies, to_regclass('workspace_v14.organizations') AS organizations, to_regclass('workspace_v14.documents') AS documents",
  ).first();
  if (!relation?.policies || !relation?.organizations || !relation?.documents) {
    throw new Error("Subledger kebijakan keuangan anggota belum tersedia pada database ini.");
  }
  const row = await db.prepare(
    "SELECT id FROM workspace_v14.organizations WHERE source_owner_user_id=?",
  ).bind(owner).first();
  if (!row?.id) throw new Error("Organisasi tidak ditemukan pada ruang kerja ini.");
  return String(row.id);
}

export async function GET(request: Request) {
  const c = await required(request);
  if (c.error) return c.error;
  if (!financeRoles.includes(c.user.role)) {
    return json({ error: "Akses kebijakan keuangan anggota dibatasi." }, 403);
  }

  try {
    const orgId = await organizationId(c.db, c.user.userId);
    const [policies, documents] = await Promise.all([
      c.db.prepare(`
        SELECT
          p.id,p.policy_code,p.policy_version,p.policy_type,p.policy_status,p.terms,
          p.approval_document_id,p.approved_by,p.approved_at,p.effective_from,
          p.effective_until,p.created_at,p.updated_at,d.title AS approval_document_title
        FROM workspace_v14.member_financial_policies p
        LEFT JOIN workspace_v14.documents d
          ON d.id=p.approval_document_id AND d.organization_id=p.organization_id
        WHERE p.organization_id=?
        ORDER BY p.created_at DESC,p.policy_code,p.policy_version
        LIMIT 200
      `).bind(orgId).all(),
      c.db.prepare(`
        SELECT id,title,document_type,document_status,verification_status
        FROM workspace_v14.documents
        WHERE organization_id=?
          AND document_status IN ('source_verified','approved')
          AND verification_status='verified'
        ORDER BY updated_at DESC
        LIMIT 100
      `).bind(orgId).all(),
    ]);
    return json({ policies: policies.results, approvalDocuments: documents.results });
  } catch (error) {
    return errorReply(error);
  }
}

export async function POST(request: Request) {
  const c = await required(request, true);
  if (c.error) return c.error;
  if (!financeRoles.includes(c.user.role)) {
    return json({ error: "Akses kebijakan keuangan anggota dibatasi." }, 403);
  }

  try {
    const body = await readJsonObject(request, 10000);
    if (body.action !== "create") return json({ error: "Tindakan kebijakan tidak dikenal." }, 400);

    const code = typeof body.policyCode === "string" ? body.policyCode.trim().toUpperCase() : "";
    const version = typeof body.policyVersion === "string" ? body.policyVersion.trim() : "";
    const type = typeof body.policyType === "string" ? body.policyType : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const clauses = Array.isArray(body.clauses)
      ? body.clauses.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
      : [];

    if (!/^[A-Z0-9][A-Z0-9._-]{1,39}$/.test(code)) {
      return json({ error: "Kode kebijakan harus 2–40 karakter: huruf, angka, titik, garis bawah, atau tanda hubung." }, 400);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/.test(version)) {
      return json({ error: "Versi kebijakan tidak valid." }, 400);
    }
    if (!policyTypes.includes(type)) return json({ error: "Jenis kebijakan tidak dikenal." }, 400);
    if (!summary || summary.length > 1200 || clauses.length > 30 || clauses.some((item) => item.length > 500)) {
      return json({ error: "Ringkasan atau butir kebijakan kosong atau terlalu panjang." }, 400);
    }

    const orgId = await organizationId(c.db, c.user.userId);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const terms = JSON.stringify({ summary, clauses });

    await c.db.batch([
      c.db.prepare(`
        INSERT INTO workspace_v14.member_financial_policies(
          id,organization_id,policy_code,policy_version,policy_type,policy_status,
          terms,created_at,updated_at
        ) VALUES(?,?,?,?,?,'draft',?::jsonb,?::timestamptz,?::timestamptz)
      `).bind(id,orgId,code,version,type,terms,now,now),
      c.db.prepare(
        "INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),c.user.userId,"Draf kebijakan keuangan anggota dibuat",
        code + " v" + version + " · " + type,now,
      ),
    ]);
    return json({ ok: true, id, status: "draft" }, 201);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({
      error: error instanceof Error && !/database|sql|neon/i.test(error.message)
        ? error.message
        : "Draf kebijakan belum dapat disimpan. Periksa kesiapan database Preview.",
    }, 503);
  }
}

export async function PATCH(request: Request) {
  const c = await required(request, true);
  if (c.error) return c.error;
  if (!financeRoles.includes(c.user.role)) {
    return json({ error: "Akses kebijakan keuangan anggota dibatasi." }, 403);
  }

  try {
    const body = await readJsonObject(request, 4000);
    if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id)) {
      return json({ error: "ID kebijakan tidak valid." }, 400);
    }
    const orgId = await organizationId(c.db, c.user.userId);
    const now = new Date().toISOString();

    if (body.action === "submit") {
      const result = await c.db.prepare(`
        UPDATE workspace_v14.member_financial_policies
        SET policy_status='submitted',updated_at=?::timestamptz
        WHERE id=? AND organization_id=? AND policy_status='draft'
        RETURNING policy_code,policy_version
      `).bind(now,body.id,orgId).first();
      if (!result) return json({ error: "Hanya draf kebijakan yang dapat diajukan. Muat ulang status kebijakan." }, 409);
      await c.db.prepare(
        "INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),c.user.userId,"Kebijakan keuangan diajukan untuk persetujuan",
        String(result.policy_code) + " v" + String(result.policy_version),now,
      ).run();
      return json({ ok: true, status: "submitted" });
    }

    if (body.action === "approve") {
      if (!["admin", "ketua"].includes(c.user.role)) {
        return json({ error: "Pengesahan kebijakan hanya dapat dilakukan Ketua atau Administrator." }, 403);
      }
      const documentId = typeof body.approvalDocumentId === "string" ? body.approvalDocumentId : "";
      const effectiveFrom = body.effectiveFrom;
      const effectiveUntil = body.effectiveUntil === undefined || body.effectiveUntil === "" ? null : body.effectiveUntil;
      if (!/^[a-f0-9-]{36}$/i.test(documentId) || !validDate(effectiveFrom) || (effectiveUntil !== null && !validDate(effectiveUntil))) {
        return json({ error: "Pilih dokumen pengesahan terverifikasi dan tanggal berlaku yang valid." }, 400);
      }
      if (effectiveUntil && effectiveUntil < effectiveFrom) {
        return json({ error: "Tanggal akhir kebijakan tidak boleh sebelum tanggal mulai." }, 400);
      }
      const document = await c.db.prepare(`
        SELECT id,title FROM workspace_v14.documents
        WHERE id=? AND organization_id=?
          AND document_status IN ('source_verified','approved')
          AND verification_status='verified'
      `).bind(documentId,orgId).first();
      if (!document) return json({ error: "Dokumen pengesahan harus berasal dari arsip organisasi dan telah diverifikasi." }, 409);

      const result = await c.db.prepare(`
        UPDATE workspace_v14.member_financial_policies
        SET policy_status='approved',approval_document_id=?,approved_by=?,
            approved_at=?::timestamptz,effective_from=?::date,
            effective_until=NULLIF(?,'')::date,updated_at=?::timestamptz
        WHERE id=? AND organization_id=? AND policy_status='submitted'
        RETURNING policy_code,policy_version,policy_type
      `).bind(
        documentId,c.user.accountId,now,effectiveFrom,effectiveUntil ?? "",
        now,body.id,orgId,
      ).first();
      if (!result) return json({ error: "Kebijakan tidak sedang menunggu persetujuan atau sudah disahkan. Buat versi baru untuk perubahan berikutnya." }, 409);
      await c.db.prepare(
        "INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),c.user.userId,"Kebijakan keuangan disahkan",
        String(result.policy_code) + " v" + String(result.policy_version) + " · " + String(document.title),now,
      ).run();
      return json({ ok: true, status: "approved" });
    }

    return json({ error: "Tindakan kebijakan tidak dikenal." }, 400);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({
      error: error instanceof Error && !/database|sql|neon/i.test(error.message)
        ? error.message
        : "Status kebijakan belum dapat diperbarui. Periksa kesiapan database Preview.",
    }, 503);
  }
}
