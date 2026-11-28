#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the disposable PostgreSQL 16 CI service}"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

# Reuse the actual CI tenant identity from the customer fixture instead of
# assuming the UUID chosen by the initial migration runner.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO v9.sessions (user_id, token_hash, expires_at)
VALUES (
  '40000000-0000-4000-8000-000000000004',
  repeat('f',64),
  now() + interval '1 hour'
);

INSERT INTO v9.business_orders (
  id, organization_id, field_key, reference_no, customer_id,
  customer_name_snapshot, order_channel, order_date, status, currency_code,
  subtotal, delivery_fee, total_amount, created_by, updated_by,
  confirmed_by, confirmed_at, fulfilled_by, fulfilled_at
)
SELECT
  'e7000000-0000-4000-8000-000000000007',
  customer.organization_id,
  'usaha',
  'QA-ORD-A-RACE-001',
  customer.id,
  customer.customer_name,
  'pos',
  current_date,
  'fulfilled',
  'IDR',
  10000,
  0,
  10000,
  '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000004',
  now(),
  '40000000-0000-4000-8000-000000000004',
  now()
FROM v9.business_customers AS customer
WHERE customer.id = 'c5000000-0000-4000-8000-000000000005';

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v9.business_orders
    WHERE id = 'e7000000-0000-4000-8000-000000000007'
      AND total_amount = 10000
      AND status = 'fulfilled'
  ) THEN
    RAISE EXCEPTION 'Concurrency fixture order could not be created from the tenant-A customer.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.business_order_payments
    WHERE order_id = 'e7000000-0000-4000-8000-000000000007'
  ) THEN
    RAISE EXCEPTION 'Concurrency fixture order already has a payment receipt.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM v9.finance_cash_accounts AS cash
    INNER JOIN v9.business_orders AS order_row
      ON order_row.organization_id = cash.organization_id
    WHERE order_row.id = 'e7000000-0000-4000-8000-000000000007'
      AND cash.id = 'b3000000-0000-4000-8000-00000000000b'
      AND cash.status = 'active'
      AND cash.currency_code = 'IDR'
  ) THEN
    RAISE EXCEPTION 'Tenant A active IDR cash register fixture is not ready.';
  END IF;
END
$preflight$;
SQL

# Session A commits the first IDR 6,000 receipt, but deliberately holds the
# transaction open after the trigger has acquired its order-scoped advisory
# lock. The marker proves the first INSERT reached RETURNING before session B
# starts; it avoids relying on an arbitrary connection-start delay.
(
  set +e
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$work_dir/session-a.log" 2>&1 <<'SQL'
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('f',64), true);
SELECT
  current_user,
  actor.user_id AS actor_user_id,
  actor.organization_id AS actor_organization_id,
  actor.role_key AS actor_role,
  v9.get_public_organization_id() AS resolved_public_organization_id,
  (SELECT count(*) FROM v9.business_orders
    WHERE id = 'e7000000-0000-4000-8000-000000000007') AS visible_race_order_count,
  (SELECT status FROM v9.business_orders
    WHERE id = 'e7000000-0000-4000-8000-000000000007') AS visible_race_order_status
FROM v9._request_actor() AS actor;
INSERT INTO v9.business_order_payments (
  organization_id, field_key, order_id, cash_account_id,
  payment_date, amount, received_by, idempotency_key
) VALUES (
  v9.get_public_organization_id(),
  'usaha',
  'e7000000-0000-4000-8000-000000000007',
  'b3000000-0000-4000-8000-00000000000b',
  current_date,
  6000,
  '40000000-0000-4000-8000-000000000004',
  'e8000000-0000-4000-8000-000000000008'
)
RETURNING id;
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM v9.business_order_payments
    WHERE order_id = 'e7000000-0000-4000-8000-000000000007'
  ) THEN 'FIRST_RECEIPT_INSERTED'
  ELSE 'FIRST_RECEIPT_MISSING'
END;
SELECT pg_sleep(3);
COMMIT;
SQL
  printf '%s\n' "$?" >"$work_dir/session-a.status"
) &
pid_a=$!

for attempt in $(seq 1 100); do
  if grep -q "FIRST_RECEIPT_INSERTED" "$work_dir/session-a.log" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$pid_a" 2>/dev/null; then
    break
  fi
  sleep 0.1
done

if ! grep -q "FIRST_RECEIPT_INSERTED" "$work_dir/session-a.log" 2>/dev/null; then
  echo "FAIL: session A did not insert the first receipt."
  cat "$work_dir/session-a.log"
  wait "$pid_a" || true
  exit 1
fi

# Session B starts while A holds the same order-level lock. Its IDR 6,000
# receipt must wait, observe A's committed receipt, then be rejected because
# cumulative receipts would exceed the IDR 10,000 order total.
(
  set +e
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$work_dir/session-b.log" 2>&1 <<'SQL'
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('f',64), true);
INSERT INTO v9.business_order_payments (
  organization_id, field_key, order_id, cash_account_id,
  payment_date, amount, received_by, idempotency_key
) VALUES (
  v9.get_public_organization_id(),
  'usaha',
  'e7000000-0000-4000-8000-000000000007',
  'b3000000-0000-4000-8000-00000000000b',
  current_date,
  6000,
  '40000000-0000-4000-8000-000000000004',
  'e9000000-0000-4000-8000-000000000009'
)
RETURNING id;
COMMIT;
SQL
  printf '%s\n' "$?" >"$work_dir/session-b.status"
) &
pid_b=$!

wait "$pid_a" || true
wait "$pid_b" || true

status_a="$(cat "$work_dir/session-a.status" 2>/dev/null || echo missing)"
status_b="$(cat "$work_dir/session-b.status" 2>/dev/null || echo missing)"

if [[ "$status_a" != "0" ]]; then
  echo "FAIL: first concurrent receipt transaction should commit; status=$status_a"
  cat "$work_dir/session-a.log"
  exit 1
fi

if [[ "$status_b" == "0" ]]; then
  echo "FAIL: second concurrent receipt was accepted and could overpay the order."
  cat "$work_dir/session-b.log"
  exit 1
fi

if ! grep -Fq "Total received payment cannot exceed the order total." "$work_dir/session-b.log"; then
  echo "FAIL: session B failed for an unexpected reason; expected the overpayment guard."
  cat "$work_dir/session-b.log"
  exit 1
fi

final_state="$(psql "$DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "
  SELECT CASE
    WHEN count(*) = 1 AND COALESCE(sum(amount),0) = 6000
    THEN 'PASS'
    ELSE 'FAIL:' || count(*)::text || ':' || COALESCE(sum(amount),0)::text
  END
  FROM v9.business_order_payments
  WHERE order_id = 'e7000000-0000-4000-8000-000000000007';
")"

if [[ "$final_state" != "PASS" ]]; then
  echo "FAIL: expected exactly one IDR 6,000 receipt; got $final_state"
  exit 1
fi

echo "PASS PostgreSQL 16 concurrent payment guard: one receipt committed, concurrent overpayment rejected, total IDR 6,000."
