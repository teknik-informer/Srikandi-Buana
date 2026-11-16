-- v12.3: verified WhatsApp login identity and admin-confirmed activation.
-- Additive only; existing email identities and sessions remain unchanged.
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_by TEXT;

ALTER TABLE account_invitations ADD COLUMN IF NOT EXISTS login_phone TEXT;
ALTER TABLE account_invitations ADD COLUMN IF NOT EXISTS phone_verified_at TEXT;
ALTER TABLE account_invitations ADD COLUMN IF NOT EXISTS phone_verified_by TEXT;

ALTER TABLE account_invitations
  DROP CONSTRAINT IF EXISTS account_invitations_purpose_check;
ALTER TABLE account_invitations
  ADD CONSTRAINT account_invitations_purpose_check
  CHECK (purpose IN ('activate', 'reset', 'change_email', 'activate_wa', 'reset_wa'));

CREATE UNIQUE INDEX IF NOT EXISTS users_login_phone_unique
  ON users(login_phone) WHERE login_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS invitations_phone_pending
  ON account_invitations(owner, login_phone, expires)
  WHERE purpose='activate_wa' AND consumed_at IS NULL AND revoked_at IS NULL;
