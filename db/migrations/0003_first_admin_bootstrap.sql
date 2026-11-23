-- One-time bootstrap latch for the first organization administrator.
-- The table starts empty. The CLI claims its singleton row inside one SQL statement;
-- failed account creation rolls the claim back with the statement.

CREATE TABLE IF NOT EXISTS v9.bootstrap_state (
  id smallint PRIMARY KEY CHECK (id = 1),
  completed_at timestamptz,
  completed_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT
);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0003_first_admin_bootstrap.sql', 'sha256:initial-v9-first-admin-bootstrap')
ON CONFLICT (name) DO NOTHING;
