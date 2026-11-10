-- External institutions and NGO partners are isolated from the six internal roles.
CREATE TABLE IF NOT EXISTS external_organizations (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('government','ngo','partner')),
  legal_name TEXT NOT NULL CHECK (length(trim(legal_name)) BETWEEN 2 AND 180),
  registration_ref TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','suspended','rejected')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_owner)
);
CREATE INDEX IF NOT EXISTS external_organizations_workspace_status ON external_organizations(workspace_owner, verification_status, organization_type);

CREATE TABLE IF NOT EXISTS external_portal_accounts (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  password_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','disabled')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  UNIQUE (id, workspace_owner),
  FOREIGN KEY (organization_id, workspace_owner) REFERENCES external_organizations(id, workspace_owner)
);
CREATE INDEX IF NOT EXISTS external_portal_accounts_workspace_status ON external_portal_accounts(workspace_owner, status, created_at);

CREATE TABLE IF NOT EXISTS external_access_grants (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('government','ngo','partner')),
  purpose TEXT NOT NULL CHECK (length(trim(purpose)) BETWEEN 12 AND 500),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  approved_by TEXT NOT NULL REFERENCES users(id),
  approved_at TEXT NOT NULL,
  revoked_by TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (valid_until > valid_from),
  UNIQUE (id, workspace_owner),
  FOREIGN KEY (account_id, workspace_owner) REFERENCES external_portal_accounts(id, workspace_owner),
  FOREIGN KEY (organization_id, workspace_owner) REFERENCES external_organizations(id, workspace_owner)
);
CREATE INDEX IF NOT EXISTS external_access_grants_account_status ON external_access_grants(workspace_owner, account_id, status, valid_from, valid_until);

CREATE TABLE IF NOT EXISTS external_access_grant_scopes (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('project','program','region','aggregate')),
  scope_ref TEXT NOT NULL CHECK (length(trim(scope_ref)) BETWEEN 1 AND 160),
  permission TEXT NOT NULL CHECK (permission IN ('read','aggregate')),
  created_at TEXT NOT NULL,
  UNIQUE (grant_id, scope_type, scope_ref),
  FOREIGN KEY (grant_id, workspace_owner) REFERENCES external_access_grants(id, workspace_owner) ON DELETE CASCADE,
  CHECK ((scope_type = 'aggregate' AND permission = 'aggregate') OR (scope_type <> 'aggregate' AND permission = 'read'))
);
CREATE INDEX IF NOT EXISTS external_access_grant_scopes_lookup ON external_access_grant_scopes(workspace_owner, scope_type, scope_ref);

CREATE TABLE IF NOT EXISTS external_access_invitations (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  consumed_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (account_id, workspace_owner) REFERENCES external_portal_accounts(id, workspace_owner) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS external_access_one_pending_invitation ON external_access_invitations(account_id) WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS external_access_invitations_expiry ON external_access_invitations(expires_at, consumed_at, revoked_at);

CREATE TABLE IF NOT EXISTS external_portal_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES external_portal_accounts(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS external_portal_sessions_expiry ON external_portal_sessions(expires_at);

CREATE TABLE IF NOT EXISTS external_access_audit (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('internal','external','system')),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS external_access_audit_workspace_created ON external_access_audit(workspace_owner, created_at DESC);
