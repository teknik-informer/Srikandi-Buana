-- Secretariat document register with revisioned file payloads.
-- Files are stored in the isolated V9 PostgreSQL schema; no demo documents are seeded.
-- Maximum file size is enforced at 3 MiB by both the application and database.

CREATE SEQUENCE IF NOT EXISTS v9.secretariat_document_reference_seq;

CREATE TABLE IF NOT EXISTS v9.secretariat_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'DOC-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('v9.secretariat_document_reference_seq')::text, 6, '0')
  ),
  number text,
  title text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('SK', 'Laporan', 'SOP', 'Surat', 'Notulen', 'Publikasi')),
  document_date date NOT NULL,
  owner_label text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('publik', 'internal', 'terbatas')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'final', 'arsip')),
  description text,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  finalized_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  archived_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (number IS NULL OR length(btrim(number)) BETWEEN 1 AND 100),
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (length(btrim(owner_label)) BETWEEN 2 AND 160),
  CHECK (description IS NULL OR length(description) <= 4000),
  CHECK (
    (status = 'draft' AND archived_at IS NULL)
    OR (status = 'final' AND finalized_by IS NOT NULL AND finalized_at IS NOT NULL AND archived_at IS NULL)
    OR (status = 'arsip' AND archived_by IS NOT NULL AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_documents_org_number_uq
  ON v9.secretariat_documents (organization_id, number)
  WHERE number IS NOT NULL;

CREATE INDEX IF NOT EXISTS secretariat_documents_org_status_date_idx
  ON v9.secretariat_documents (organization_id, status, document_date DESC);

CREATE INDEX IF NOT EXISTS secretariat_documents_org_visibility_status_idx
  ON v9.secretariat_documents (organization_id, visibility, status);

CREATE TABLE IF NOT EXISTS v9.secretariat_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES v9.secretariat_documents(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  file_name text NOT NULL,
  mime_type text NOT NULL
    CHECK (mime_type IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 3145728),
  sha256 char(64) NOT NULL,
  file_data bytea NOT NULL,
  uploaded_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, revision_no),
  CHECK (length(btrim(file_name)) BETWEEN 1 AND 180),
  CHECK (sha256 ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS secretariat_document_files_latest_idx
  ON v9.secretariat_document_files (document_id, revision_no DESC);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0008_secretariat_document_register_and_files.sql', 'sha256:initial-v9-secretariat-document-register-files')
ON CONFLICT (name) DO NOTHING;
