-- Immutable generated document contents, versioned under the existing Secretariat document register.
-- The register remains the authoritative record for access, status, numbering and audit.

CREATE TABLE IF NOT EXISTS v9.secretariat_document_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES v9.secretariat_documents(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  template_code text NOT NULL
    CHECK (template_code IN ('TPL-SK','TPL-UND','TPL-KEL','TPL-NOT','TPL-LAP','TPL-SPR')),
  content_json jsonb NOT NULL
    CHECK (jsonb_typeof(content_json) = 'object')
    CHECK (jsonb_typeof(content_json->'groups') = 'array')
    CHECK (octet_length(content_json::text) <= 100000),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, revision_no),
  CHECK (content_json->>'templateCode' = template_code)
);

CREATE INDEX IF NOT EXISTS secretariat_document_generations_latest_idx
  ON v9.secretariat_document_generations (document_id, revision_no DESC);

CREATE OR REPLACE FUNCTION v9.protect_secretariat_document_generation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  document_status text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Generated document revisions are immutable and cannot be updated or deleted.';
  END IF;

  SELECT document.status
  INTO document_status
  FROM v9.secretariat_documents AS document
  WHERE document.id = NEW.document_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Generated document register entry was not found.';
  END IF;

  IF document_status = 'arsip' THEN
    RAISE EXCEPTION 'An archived document cannot receive a generated revision.';
  END IF;

  IF document_status = 'final' THEN
    UPDATE v9.secretariat_documents
    SET status = 'draft',
        finalized_by = NULL,
        finalized_at = NULL,
        updated_at = now()
    WHERE id = NEW.document_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS secretariat_document_generations_guard
  ON v9.secretariat_document_generations;

CREATE TRIGGER secretariat_document_generations_guard
BEFORE INSERT OR UPDATE OR DELETE
ON v9.secretariat_document_generations
FOR EACH ROW
EXECUTE FUNCTION v9.protect_secretariat_document_generation();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0040_secretariat_document_generator.sql', 'sha256:v9-secretariat-document-generator-20261125')
ON CONFLICT (name) DO NOTHING;
