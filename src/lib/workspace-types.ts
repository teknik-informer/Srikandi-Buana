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
export type WorkspaceData = { records: Row[]; files: WorkspaceFile[]; audit: WorkspaceAudit[]; user: string };
