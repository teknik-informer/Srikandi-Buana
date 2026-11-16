-- Add a dedicated, single-use invitation purpose for verified email replacement.
-- Existing activation/reset semantics and the one-pending-invitation-per-member
-- invariant remain unchanged. This migration does not alter existing user rows.
ALTER TABLE account_invitations
  DROP CONSTRAINT IF EXISTS account_invitations_purpose_check;

ALTER TABLE account_invitations
  ADD CONSTRAINT account_invitations_purpose_check
  CHECK (purpose IN ('activate', 'reset', 'change_email'));

-- Enforce the same case-insensitive uniqueness used by login and the API.
-- The QA preflight checked for duplicates; the unique index is the final guard.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));
