import { getAuthenticatedUser } from "@/lib/auth";
import { env } from "@/lib/runtime";
import { RequestBodyError, readJsonObject } from "@/lib/request-body";
import { sameOrigin, json } from "@/lib/account-access";
import { canReadRecord, canWriteRecord, visibleRecord } from "@/lib/permissions";
import {
  approvalActions,
  approvalSnapshot,
  approvalSnapshotHash,
  canSubmitApproval,
  verifierRoleForRecord,
  type ApprovalStatus,
} from "@/lib/record-approvals";

export const dynamic = "force-dynamic";

type RecordRow = {
  id: string;
  kind: string;
  data: string;
  created: string;
  updated: string;
};

type CaseRow = {
  id: string;
  owner: string;
  record_id: string;
  record_kind: string;
  verifier_role: "sekretaris" | "bendahara";
  status: ApprovalStatus;
  current_version: number;
  submitted_by: string;
  submitted_at: string;
  verified_by: string | null;
  verified_at: string | null;
  chair_by: string | null;
  chair_at: string | null;
  note: string;
  updated: string;
};

const failure = (error: unknown) => {
  if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
  return json({
    error: error instanceof Error ? error.message : "Permintaan persetujuan belum dapat diproses.",
  }, 400);
};

async function currentUser() {
  const user = await getAuthenticatedUser();
  if (!user) return { error: json({ error: "Silakan masuk untuk mengelola persetujuan." }, 401) };
  if (!env.DB) return { error: json({ error: "Database belum tersedia." }, 503) };
  return { user, db: env.DB };
}

async function loadRecord(owner: string, id: string): Promise<RecordRow | null> {
  const row = await env.DB!.prepare(
    "SELECT id,kind,data,created,updated FROM records WHERE id=? AND owner=?",
  ).bind(id, owner).first();
  return row ? {
    id: String(row.id),
    kind: String(row.kind),
    data: String(row.data),
    created: String(row.created),
    updated: String(row.updated),
  } : null;
}

function parseRecord(row: RecordRow) {
  return {
    id: row.id,
    kind: row.kind,
    data: JSON.parse(row.data) as Record<string, unknown>,
    created: row.created,
    updated: row.updated,
  };
}

async function appendEvent(input: {
  owner: string;
  caseId: string;
  version: number;
  actorId: string;
  actorRole: string;
  action: string;
  fromStatus: string | null;
  toStatus: ApprovalStatus;
  note: string;
  snapshotHash: string | null;
  created: string;
}) {
  return env.DB!.prepare(
    "INSERT INTO record_approval_events(id,owner,case_id,version,actor_id,actor_role,action,from_status,to_status,note,snapshot_sha256,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
  ).bind(
    crypto.randomUUID(),
    input.owner,
    input.caseId,
    input.version,
    input.actorId,
    input.actorRole,
    input.action,
    input.fromStatus,
    input.toStatus,
    input.note,
    input.snapshotHash,
    input.created,
  );
}

export async function GET(request: Request) {
  const c = await currentUser();
  if (c.error) return c.error;
  try {
    const url = new URL(request.url);
    const recordId = url.searchParams.get("recordId");
    const clauses = ["c.owner=?"];
    const args: unknown[] = [c.user!.userId];
    if (recordId) {
      clauses.push("c.record_id=?");
      args.push(recordId);
    }
    if (c.user!.role === "koordinator") {
      clauses.push("v.submitted_by=?");
      args.push(c.user!.accountId);
    }
    if (c.user!.role === "anggota") return json({ cases: [] });

    const rows = await c.db!.prepare(
      "SELECT c.*,v.snapshot,v.snapshot_sha256,v.source_updated,v.version AS snapshot_version,r.updated AS record_updated " +
      "FROM record_approval_cases c " +
      "JOIN record_approval_versions v ON v.case_id=c.id AND v.owner=c.owner AND v.version=c.current_version " +
      "JOIN records r ON r.id=c.record_id AND r.owner=c.owner " +
      "WHERE " + clauses.join(" AND ") + " ORDER BY c.updated DESC LIMIT 200",
    ).bind(...args).all();

    const cases = [];
    for (const raw of rows.results) {
      let snapshotRecord: ReturnType<typeof parseRecord>;
      try {
        snapshotRecord = {
          ...JSON.parse(String(raw.snapshot)),
          created: "",
          updated: String(raw.source_updated),
        } as ReturnType<typeof parseRecord>;
      } catch {
        continue;
      }
      if (!canReadRecord(c.user!, snapshotRecord)) continue;
      const caseRow = raw as unknown as CaseRow & Record<string, unknown>;
      const actions = approvalActions(c.user!, {
        status: caseRow.status,
        verifier_role: caseRow.verifier_role,
        submitted_by: caseRow.submitted_by,
      });
      const approvalRecord = visibleRecord(c.user!, snapshotRecord);
      const eventRows = await c.db!.prepare(
        "SELECT actor_id,actor_role,action,from_status,to_status,note,created FROM record_approval_events " +
        "WHERE owner=? AND case_id=? AND version=? ORDER BY created ASC",
      ).bind(c.user!.userId, caseRow.id, caseRow.current_version).all();

      cases.push({
        id: caseRow.id,
        recordId: caseRow.record_id,
        kind: caseRow.record_kind,
        verifierRole: caseRow.verifier_role,
        status: caseRow.status,
        currentVersion: Number(caseRow.current_version),
        submittedBy: caseRow.submitted_by,
        submittedAt: caseRow.submitted_at,
        verifiedBy: caseRow.verified_by,
        verifiedAt: caseRow.verified_at,
        chairBy: caseRow.chair_by,
        chairAt: caseRow.chair_at,
        note: caseRow.note,
        updated: caseRow.updated,
        snapshotHash: String(raw.snapshot_sha256),
        snapshotCurrent: String(raw.record_updated) === String(raw.source_updated)
          && approvalSnapshotHash(approvalSnapshot({
            id: String(snapshotRecord.id),
            kind: String(snapshotRecord.kind),
            data: snapshotRecord.data,
          })) === String(raw.snapshot_sha256),
        record: approvalRecord,
        actions,
        history: eventRows.results,
      });
    }
    return json({ cases });
  } catch {
    return json({ error: "Antrean verifikasi belum dapat dimuat. Periksa ketersediaan basis data." }, 503);
  }
}

export async function POST(request: Request) {
  const c = await currentUser();
  if (c.error) return c.error;
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);

  try {
    const raw = await readJsonObject(request, 10000);
    const action = String(raw.action || "");
    const now = new Date().toISOString();
    const note = String(raw.note || "").trim();
    if (note.length > 2000) return json({ error: "Catatan maksimal 2.000 karakter." }, 400);

    if (action === "submit") {
      if (!canSubmitApproval(c.user!)) return json({ error: "Peran ini tidak dapat mengajukan data untuk verifikasi." }, 403);
      const recordId = String(raw.recordId || "").trim();
      if (!recordId || recordId.length > 100) return json({ error: "Pilih catatan yang akan diajukan." }, 400);
      const source = await loadRecord(c.user!.userId, recordId);
      if (!source) return json({ error: "Catatan tidak ditemukan dalam kelompok ini." }, 404);
      const record = parseRecord(source);
      if (!canReadRecord(c.user!, record) || !canWriteRecord(c.user!, record)) {
        return json({ error: "Catatan berada di luar kewenangan atau penugasan akun Anda." }, 403);
      }
      const verifierRole = verifierRoleForRecord(record.kind);
      if (!verifierRole) return json({ error: "Modul ini belum memiliki penanggung jawab verifikasi." }, 400);

      const snapshot = approvalSnapshot({
        id: record.id,
        kind: record.kind,
        data: record.data,
      });
      const snapshotHash = approvalSnapshotHash(snapshot);
      const existing = await c.db!.prepare(
        "SELECT * FROM record_approval_cases WHERE owner=? AND record_id=?",
      ).bind(c.user!.userId, recordId).first();

      if (existing && String(existing.status) !== "revision") {
        return json({
          error: "Catatan sudah berada dalam proses verifikasi atau telah diputuskan. Periksa menu Verifikasi & Pengesahan.",
          status: String(existing.status),
        }, 409);
      }

      const caseId = existing ? String(existing.id) : crypto.randomUUID();
      const version = existing ? Number(existing.current_version) + 1 : 1;
      const eventAction = existing ? "resubmitted" : "submitted";
      const eventFrom = existing ? "revision" : null;
      const versionId = crypto.randomUUID();
      const statements = existing
        ? [
            c.db!.prepare(
              "UPDATE record_approval_cases SET record_kind=?,verifier_role=?,status='pending_verification',current_version=?,submitted_by=?,submitted_at=?,verified_by=NULL,verified_at=NULL,chair_by=NULL,chair_at=NULL,note='',updated=? " +
              "WHERE id=? AND owner=? AND status='revision' AND current_version=?",
            ).bind(record.kind, verifierRole, version, c.user!.accountId, now, now, caseId, c.user!.userId, Number(existing.current_version)),
            c.db!.prepare(
              "INSERT INTO record_approval_versions(id,owner,case_id,version,source_updated,snapshot,snapshot_sha256,submitted_by,submitted_at) " +
              "SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM record_approval_cases WHERE id=? AND owner=? AND status='pending_verification' AND current_version=? AND submitted_by=?)",
            ).bind(versionId, c.user!.userId, caseId, version, source.updated, snapshot, snapshotHash, c.user!.accountId, now, caseId, c.user!.userId, version, c.user!.accountId),
            c.db!.prepare(
              "INSERT INTO record_approval_events(id,owner,case_id,version,actor_id,actor_role,action,from_status,to_status,note,snapshot_sha256,created) " +
              "SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM record_approval_cases WHERE id=? AND owner=? AND status='pending_verification' AND current_version=? AND submitted_by=?)",
            ).bind(crypto.randomUUID(), c.user!.userId, caseId, version, c.user!.accountId, c.user!.role, eventAction, eventFrom, "pending_verification", note, snapshotHash, now, caseId, c.user!.userId, version, c.user!.accountId),
          ]
        : [
            c.db!.prepare(
              "INSERT INTO record_approval_cases(id,owner,record_id,record_kind,verifier_role,status,current_version,submitted_by,submitted_at,created,updated) " +
              "VALUES(?,?,?,?,?,'pending_verification',1,?,?,?,?)",
            ).bind(caseId, c.user!.userId, recordId, record.kind, verifierRole, c.user!.accountId, now, now, now),
            c.db!.prepare(
              "INSERT INTO record_approval_versions(id,owner,case_id,version,source_updated,snapshot,snapshot_sha256,submitted_by,submitted_at) " +
              "SELECT ?,?,?,1,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM record_approval_cases WHERE id=? AND owner=? AND current_version=1 AND status='pending_verification' AND submitted_by=?)",
            ).bind(versionId, c.user!.userId, caseId, source.updated, snapshot, snapshotHash, c.user!.accountId, now, caseId, c.user!.userId, c.user!.accountId),
            c.db!.prepare(
              "INSERT INTO record_approval_events(id,owner,case_id,version,actor_id,actor_role,action,from_status,to_status,note,snapshot_sha256,created) " +
              "SELECT ?,?,?,1,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM record_approval_cases WHERE id=? AND owner=? AND current_version=1 AND status='pending_verification' AND submitted_by=?)",
            ).bind(crypto.randomUUID(), c.user!.userId, caseId, c.user!.accountId, c.user!.role, eventAction, eventFrom, "pending_verification", note, snapshotHash, now, caseId, c.user!.userId, c.user!.accountId),
          ];
      await c.db!.batch(statements);
      const saved = await c.db!.prepare(
        "SELECT id,status,current_version,submitted_by FROM record_approval_cases WHERE id=? AND owner=?",
      ).bind(caseId, c.user!.userId).first();
      if (!saved || Number(saved.current_version) !== version || String(saved.submitted_by) !== c.user!.accountId || String(saved.status) !== "pending_verification") {
        return json({ error: "Pengajuan tidak tersimpan atau data berubah bersamaan. Muat ulang dan periksa statusnya." }, 409);
      }
      return json({
        ok: true,
        caseId,
        status: "pending_verification",
        version,
        verifierRole,
      }, 201);
    }

    const caseId = String(raw.caseId || "").trim();
    if (!caseId || caseId.length > 100) return json({ error: "Identitas proses persetujuan tidak valid." }, 400);
    const current = await c.db!.prepare(
      "SELECT * FROM record_approval_cases WHERE id=? AND owner=?",
    ).bind(caseId, c.user!.userId).first() as unknown as CaseRow | null;
    if (!current) return json({ error: "Proses persetujuan tidak ditemukan." }, 404);
    const allowedActions = approvalActions(c.user!, current);
    if (!allowedActions.includes(action)) return json({ error: "Tindakan berada di luar kewenangan atau tahap proses." }, 403);
    if (["request_revision", "reject"].includes(action) && note.length < 5) {
      return json({ error: "Tuliskan alasan yang jelas, minimal 5 karakter." }, 400);
    }

    const source = await loadRecord(c.user!.userId, current.record_id);
    if (!source) return json({ error: "Catatan sumber tidak ditemukan. Proses dihentikan untuk menjaga jejak verifikasi." }, 409);
    const record = parseRecord(source);
    if (!canReadRecord(c.user!, record)) return json({ error: "Catatan berada di luar hak akses akun." }, 403);
    const currentSnapshot = approvalSnapshot({
      id: record.id,
      kind: record.kind,
      data: record.data,
    });
    const currentHash = approvalSnapshotHash(currentSnapshot);
    const submittedVersion = await c.db!.prepare(
      "SELECT source_updated,snapshot_sha256 FROM record_approval_versions WHERE owner=? AND case_id=? AND version=?",
    ).bind(c.user!.userId, current.id, current.current_version).first();

    if (
      !submittedVersion
      || String(submittedVersion.source_updated) !== source.updated
      || String(submittedVersion.snapshot_sha256) !== currentHash
    ) {
      const conflictNote = "Data sumber berubah setelah diajukan. Diperlukan pengajuan ulang dan verifikasi baru.";
      await c.db!.batch([
        c.db!.prepare(
          "UPDATE record_approval_cases SET status='revision',verified_by=NULL,verified_at=NULL,chair_by=NULL,chair_at=NULL,note=?,updated=? " +
          "WHERE id=? AND owner=? AND status=? AND current_version=?",
        ).bind(conflictNote, now, current.id, c.user!.userId, current.status, current.current_version),
        await appendEvent({
          owner: c.user!.userId,
          caseId: current.id,
          version: current.current_version,
          actorId: c.user!.accountId,
          actorRole: c.user!.role,
          action: "snapshot_conflict",
          fromStatus: current.status,
          toStatus: "revision",
          note: conflictNote,
          snapshotHash: currentHash,
          created: now,
        }),
      ]);
      return json({ error: conflictNote, status: "revision" }, 409);
    }

    let nextStatus: ApprovalStatus;
    let eventAction: string;
    let verifiedBy = current.verified_by;
    let verifiedAt = current.verified_at;
    let chairBy = current.chair_by;
    let chairAt = current.chair_at;

    if (action === "verify") {
      nextStatus = "pending_chair";
      eventAction = "verified";
      verifiedBy = c.user!.accountId;
      verifiedAt = now;
    } else if (action === "request_revision") {
      nextStatus = "revision";
      eventAction = "revision_requested";
      verifiedBy = null;
      verifiedAt = null;
      chairBy = null;
      chairAt = null;
    } else if (action === "approve") {
      nextStatus = "approved";
      eventAction = "approved";
      chairBy = c.user!.accountId;
      chairAt = now;
    } else {
      nextStatus = "rejected";
      eventAction = "rejected";
      chairBy = c.user!.accountId;
      chairAt = now;
    }

    await c.db!.batch([
      c.db!.prepare(
        "UPDATE record_approval_cases SET status=?,verified_by=?,verified_at=?,chair_by=?,chair_at=?,note=?,updated=? " +
        "WHERE id=? AND owner=? AND status=? AND current_version=?",
      ).bind(nextStatus, verifiedBy, verifiedAt, chairBy, chairAt, note, now, current.id, c.user!.userId, current.status, current.current_version),
      await appendEvent({
        owner: c.user!.userId,
        caseId: current.id,
        version: current.current_version,
        actorId: c.user!.accountId,
        actorRole: c.user!.role,
        action: eventAction,
        fromStatus: current.status,
        toStatus: nextStatus,
        note,
        snapshotHash: currentHash,
        created: now,
      }),
    ]);

    const result = await c.db!.prepare(
      "SELECT status,updated FROM record_approval_cases WHERE id=? AND owner=?",
    ).bind(current.id, c.user!.userId).first();
    if (!result || String(result.status) !== nextStatus) {
      return json({ error: "Keputusan tidak tersimpan karena antrean berubah. Muat ulang." }, 409);
    }
    return json({
      ok: true,
      caseId: current.id,
      status: nextStatus,
      updated: String(result.updated),
      generated: false,
      message: nextStatus === "approved"
        ? "Disetujui Ketua. Dokumen masih menunggu proses generator resmi; belum diterbitkan atau dipublikasikan."
        : nextStatus === "pending_chair"
          ? "Verifikasi selesai. Data diteruskan ke antrean persetujuan Ketua."
          : nextStatus === "revision"
            ? "Perbaikan diminta. Pengaju dapat memperbarui data dan mengajukannya kembali."
            : "Keputusan penolakan Ketua telah dicatat.",
    });
  } catch (error) {
    return failure(error);
  }
}
