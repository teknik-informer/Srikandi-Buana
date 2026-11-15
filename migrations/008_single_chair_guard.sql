-- Enforce a single active Chair authority per organization.
-- Existing duplicates must be reviewed against the final SK before this migration is applied.
CREATE UNIQUE INDEX IF NOT EXISTS users_one_active_chair_per_workspace
  ON users(workspace_owner)
  WHERE role='ketua' AND enabled=TRUE;

-- Only one pending initial Chair invitation may exist for a workspace.
-- Expired invitations are revoked by the bootstrap endpoint before a replacement is created.
CREATE UNIQUE INDEX IF NOT EXISTS account_invitations_one_pending_chair_per_workspace
  ON account_invitations(owner)
  WHERE role='ketua'
    AND purpose='activate'
    AND consumed_at IS NULL
    AND revoked_at IS NULL;
