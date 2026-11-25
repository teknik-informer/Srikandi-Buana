-- Connect generated activity reports to their canonical field operation records.
ALTER TABLE v9.secretariat_documents
  ADD COLUMN IF NOT EXISTS source_field_activity_id uuid NULL,
  ADD COLUMN IF NOT EXISTS source_field_program_id uuid NULL,
  ADD COLUMN IF NOT EXISTS source_field_key text NULL;

ALTER TABLE v9.secretariat_documents
  DROP CONSTRAINT IF EXISTS secretariat_documents_single_source_check;

ALTER TABLE v9.secretariat_documents
  ADD CONSTRAINT secretariat_documents_single_source_check
  CHECK (
    num_nonnulls(
      source_meeting_id,
      source_minutes_id,
      source_letter_id,
      source_field_activity_id,
      source_field_program_id
    ) <= 1
    AND (
      (source_field_activity_id IS NOT NULL OR source_field_program_id IS NOT NULL)
      = (source_field_key IS NOT NULL)
    )
  );

ALTER TABLE v9.secretariat_documents
  ADD CONSTRAINT secretariat_documents_source_field_activity_fkey
  FOREIGN KEY (source_field_activity_id, organization_id, source_field_key)
  REFERENCES v9.field_activities(id, organization_id, field_key)
  ON DELETE RESTRICT;

ALTER TABLE v9.secretariat_documents
  ADD CONSTRAINT secretariat_documents_source_field_program_fkey
  FOREIGN KEY (source_field_program_id, organization_id, source_field_key)
  REFERENCES v9.field_programs(id, organization_id, field_key)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_documents_active_source_field_activity_uq
  ON v9.secretariat_documents(source_field_activity_id)
  WHERE source_field_activity_id IS NOT NULL AND status <> 'arsip';

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_documents_active_source_field_program_uq
  ON v9.secretariat_documents(source_field_program_id)
  WHERE source_field_program_id IS NOT NULL AND status <> 'arsip';
