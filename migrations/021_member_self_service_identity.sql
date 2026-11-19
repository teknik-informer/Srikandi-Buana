-- Member self-service identity state and lightweight online presence.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TEXT;

-- Existing non-root accounts were created through the one-time email activation flow.
UPDATE users
SET email_verified_at = created
WHERE email_verified_at IS NULL
  AND role <> 'admin'
  AND email NOT LIKE '%.invalid';

CREATE INDEX IF NOT EXISTS users_last_seen_at
  ON users(last_seen_at)
  WHERE last_seen_at IS NOT NULL;
