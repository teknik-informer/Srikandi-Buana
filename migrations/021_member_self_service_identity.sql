-- Member self-service identity state and lightweight online presence.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TEXT;

-- Do not infer email verification from account creation time.
-- Only a successful, single-use email activation or email-change flow may set
-- email_verified_at. Existing accounts remain unverified until that happens.

CREATE INDEX IF NOT EXISTS users_last_seen_at
  ON users(last_seen_at)
  WHERE last_seen_at IS NOT NULL;
