import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.V9_DATABASE_URL?.trim();
const fullName = process.env.V9_BOOTSTRAP_NAME?.trim().replace(/\s+/g, " ");
const email = process.env.V9_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.V9_BOOTSTRAP_PASSWORD;
const confirmation = process.env.V9_BOOTSTRAP_CONFIRM;

function fail(message) {
  console.error(`[v9-bootstrap] ${message}`);
  process.exitCode = 1;
}

if (!connectionString) fail("V9_DATABASE_URL is required.");
if (!/^postgres(?:ql)?:\/\//i.test(connectionString ?? "")) {
  fail("V9_DATABASE_URL must be a PostgreSQL connection URL.");
}
if (!fullName || fullName.length < 3 || fullName.length > 160) {
  fail("V9_BOOTSTRAP_NAME must contain 3 to 160 characters.");
}
if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("V9_BOOTSTRAP_EMAIL must be a valid email address.");
}
if (!password || password.length < 12 || password.length > 256) {
  fail("V9_BOOTSTRAP_PASSWORD must contain 12 to 256 characters.");
}
if (confirmation !== "CREATE_FIRST_ORGANIZATION_ADMIN") {
  fail("Set V9_BOOTSTRAP_CONFIRM=CREATE_FIRST_ORGANIZATION_ADMIN to confirm the one-time operation.");
}
if (process.exitCode) process.exit();

const salt = randomBytes(16);
const derived = scryptSync(password, salt, 64, {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});
const passwordHash = [
  "scrypt",
  16_384,
  8,
  1,
  salt.toString("hex"),
  derived.toString("hex"),
].join("$");

// This single statement claims the bootstrap latch, creates the first account,
// grants only organization_admin, writes an audit event, then marks completion.
// If any dependent step fails, PostgreSQL rolls the entire statement back.
const sql = neon(connectionString);
const rows = await sql`
  WITH claim AS (
    INSERT INTO v9.bootstrap_state (id)
    SELECT 1
    WHERE NOT EXISTS (SELECT 1 FROM v9.user_accounts)
      AND EXISTS (
        SELECT 1 FROM v9.organizations
        WHERE slug = 'srikandi-buana' AND status = 'active'
      )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ),
  person AS (
    INSERT INTO v9.people (full_name, email, status)
    SELECT ${fullName}, ${email}, 'active'
    FROM claim
    RETURNING id
  ),
  account AS (
    INSERT INTO v9.user_accounts (
      person_id,
      email,
      password_hash,
      status,
      email_verified_at,
      must_change_password,
      password_changed_at
    )
    SELECT
      person.id,
      ${email},
      ${passwordHash},
      'active',
      now(),
      false,
      now()
    FROM person
    RETURNING id
  ),
  assignment AS (
    INSERT INTO v9.role_assignments (
      organization_id,
      user_id,
      role_key,
      scope_kind,
      is_active
    )
    SELECT organization.id, account.id, 'organization_admin', 'organization', true
    FROM account
    CROSS JOIN v9.organizations AS organization
    WHERE organization.slug = 'srikandi-buana'
    RETURNING organization_id, user_id
  ),
  audit AS (
    INSERT INTO v9.audit_events (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      after_state
    )
    SELECT
      assignment.organization_id,
      assignment.user_id,
      'bootstrap.first_organization_admin',
      'user_account',
      assignment.user_id::text,
      jsonb_build_object('email', ${email}, 'role', 'organization_admin')
    FROM assignment
    RETURNING id
  ),
  completed AS (
    UPDATE v9.bootstrap_state AS state
    SET completed_at = now(),
        completed_by = assignment.user_id
    FROM assignment
    WHERE state.id = 1
    RETURNING state.completed_at
  )
  SELECT account.id AS user_id, completed.completed_at
  FROM account
  CROSS JOIN completed
`;

if (!Array.isArray(rows) || rows.length !== 1) {
  fail("Bootstrap was not completed. The first account may already exist, or the V9 organization/migration is not ready. No partial setup was committed.");
  process.exit();
}

console.info("[v9-bootstrap] First organization administrator created.");
console.info("[v9-bootstrap] Sign in with the configured email and password, then remove bootstrap environment variables.");
console.info(`[v9-bootstrap] Account ID: ${rows[0].user_id}`);
