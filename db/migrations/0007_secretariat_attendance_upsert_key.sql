-- Give every attendee a stable per-meeting key:
-- person UUID for registered members, normalized name for external guests.

ALTER TABLE v9.secretariat_meeting_attendance
  ADD COLUMN IF NOT EXISTS attendee_key text
  GENERATED ALWAYS AS (
    CASE
      WHEN person_id IS NOT NULL THEN 'person:' || person_id::text
      ELSE 'guest:' || lower(btrim(display_name))
    END
  ) STORED;

DROP INDEX IF EXISTS v9.secretariat_meeting_attendance_person_uq;
DROP INDEX IF EXISTS v9.secretariat_meeting_attendance_guest_name_uq;

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_meeting_attendance_attendee_key_uq
  ON v9.secretariat_meeting_attendance (meeting_id, attendee_key);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0007_secretariat_attendance_upsert_key.sql', 'sha256:initial-v9-secretariat-attendance-upsert-key')
ON CONFLICT (name) DO NOTHING;
