-- Add a dedicated, single-use invitation purpose for verified email replacement.
-- Existing activation/reset semantics and the one-pending-invitation-per-member
-- invariant remain unchanged. This migration is additive and does not touch user data.
ALTER TABLE account_invitations
  DROP CONSTRAINT IF EXISTS account_invitations_purpose_check;

ALTER TABLE account_invitations
  ADD CONSTRAINT account_invitations_purpose_check
  CHECK (purpose IN ('activate', 'reset', 'change_email'));
