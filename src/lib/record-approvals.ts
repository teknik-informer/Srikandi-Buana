import "server-only";
import { createHash } from "node:crypto";
import type { Principal } from "@/lib/permissions";

export type ApprovalStatus =
  | "pending_verification"
  | "revision"
  | "pending_chair"
  | "approved"
  | "rejected";

export type ApprovalVerifierRole = "sekretaris" | "bendahara";

export function verifierRoleForRecord(kind: string): ApprovalVerifierRole | null {
  if (["kas", "aset"].includes(kind)) return "bendahara";
  return "sekretaris";
}

function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort((a, b) => a.localeCompare(b, "en"))
        .map((key) => [key, normalized((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function approvalSnapshot(record: {
  id: string;
  kind: string;
  data: Record<string, unknown>;
}) {
  return JSON.stringify(normalized({
    id: record.id,
    kind: record.kind,
    data: record.data,
  }));
}

export function approvalSnapshotHash(snapshot: string) {
  return createHash("sha256").update(snapshot, "utf8").digest("hex");
}

export function canSubmitApproval(user: Principal) {
  return ["sekretaris", "bendahara", "koordinator"].includes(user.role);
}

export function approvalActions(
  user: Principal,
  item: {
    status: ApprovalStatus;
    verifier_role: ApprovalVerifierRole;
    submitted_by: string;
  },
): string[] {
  if (
    item.status === "pending_verification"
    && user.role === item.verifier_role
    && user.accountId !== item.submitted_by
  ) return ["verify", "request_revision"];

  if (item.status === "pending_chair" && user.role === "ketua") {
    return ["approve", "request_revision", "reject"];
  }
  return [];
}

export function approvalStatusLabel(status: ApprovalStatus) {
  return ({
    pending_verification: "Menunggu verifikasi bidang",
    revision: "Perlu perbaikan",
    pending_chair: "Menunggu persetujuan Ketua",
    approved: "Disetujui Ketua · siap diproses",
    rejected: "Ditolak Ketua",
  } satisfies Record<ApprovalStatus, string>)[status];
}
