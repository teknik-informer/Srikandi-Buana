-- Add a dedicated, single-use invitation purpose for verified email replacement.
-- Existing activation/reset semantics and the one-pending-invitation-per-member
-- invariant remain unchanged. This migration is additive and does not touch user data.
ALTER TABLE account_invitations
  DROP CONSTRAINT IF EXISTS account_invitations_purpose_check;

ALTER TABLE account_invitations
  ADD CONSTRAINT account_invitations_purpose_check
  CHECK (purpose IN ('activate', 'reset', 'change_email'));

-- Login resolves email case-insensitively; enforce the same uniqueness at the database layer.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate case-insensitive user emails must be reconciled before applying verified email changes';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));
