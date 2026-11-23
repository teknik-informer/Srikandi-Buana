-- Keep enrollment capacity atomic under concurrent registrations.
ALTER TABLE v9.training_sessions
  ADD COLUMN IF NOT EXISTS registered_count integer NOT NULL DEFAULT 0;

ALTER TABLE v9.training_sessions
  ADD CONSTRAINT training_sessions_registered_count_check
  CHECK (registered_count >= 0);

UPDATE v9.training_sessions AS session
SET registered_count = (
  SELECT count(*)::int
  FROM v9.training_enrollments AS enrollment
  WHERE enrollment.session_id = session.id
    AND enrollment.registration_status IN ('registered','confirmed')
);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0013_training_capacity_counter.sql', 'sha256:initial-v9-training-capacity-counter')
ON CONFLICT (name) DO NOTHING;
