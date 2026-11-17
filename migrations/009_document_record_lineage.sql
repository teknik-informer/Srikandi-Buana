-- v14.1: distinguish a legacy register record from its private file object.
-- Additive only. Source record and file IDs must never be conflated.
ALTER TABLE workspace_v14.documents
  ADD COLUMN IF NOT EXISTS source_legacy_record_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_v14_documents_legacy_record
  ON workspace_v14.documents(organization_id,source_legacy_record_id)
  WHERE source_legacy_record_id IS NOT NULL;
