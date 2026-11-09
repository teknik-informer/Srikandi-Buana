import type { Row } from "./srikandi";
export type WorkspaceFile = {
  id: string;
  name: string;
  size: number;
  created: string;
  mime: string;
  deleted_at?: string | null;
  uploader_id?: string;
};
export type WorkspaceAudit = { action: string; title: string; created: string };
export type WorkspaceData = { records: Row[]; files: WorkspaceFile[]; audit: WorkspaceAudit[]; assetMovements?: AssetMovement[]; user: string };

export type AssetMovement = {
  id: string;
  event_type: "issued" | "returned" | "maintenance" | "damaged" | "lost" | "status_changed";
  from_status: string | null;
  to_status: string;
  occurred_at: string;
  notes: string;
  asset_name: string;
  member_name: string;
  evidence_json: unknown;
};
