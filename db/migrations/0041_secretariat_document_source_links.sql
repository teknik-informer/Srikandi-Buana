-- Link generated Secretariat documents to their canonical operational source.
ALTER TABLE v9.secretariat_documents
  ADD COLUMN IF NOT EXISTS source_meeting_id uuid NULL
    REFERENCES v9.secretariat_meetings(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_minutes_id uuid NULL
    REFERENCES v9.secretariat_minutes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_letter_id uuid NULL
    REFERENCES v9.secretariat_letters(id) ON DELETE RESTRICT;

ALTER TABLE v9.secretariat_documents
  ADD CONSTRAINT secretariat_documents_single_source_check
  CHECK (num_nonnulls(source_meeting_id, source_minutes_id, source_letter_id) <= 1);

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_documents_active_source_meeting_uq
  ON v9.secretariat_documents(source_meeting_id)
  WHERE source_meeting_id IS NOT NULL AND status <> 'arsip';

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_documents_active_source_minutes_uq
  ON v9.secretariat_documents(source_minutes_id)
  WHERE source_minutes_id IS NOT NULL AND status <> 'arsip';

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_documents_active_source_letter_uq
  ON v9.secretariat_documents(source_letter_id)
  WHERE source_letter_id IS NOT NULL AND status <> 'arsip';
