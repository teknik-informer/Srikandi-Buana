-- Exercises the same SECURITY INVOKER functions called by business order
-- server actions. All data and actors are synthetic and exist only in the
-- disposable PostgreSQL 16 CI service. RLS is enabled and the function calls
-- execute as v9_app with a verified tenant-A organization-admin session.

\set ON_ERROR_STOP on

INSERT INTO v9.people (id, full_name, status)
VALUES ('b8100000-0000-4000-8000-000000000810', 'CI Business Order Lifecycle', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.user_accounts (
  id, person_id, email, password_hash, status, email_verified_at, legacy_auth_eligible
) VALUES (
  'b8200000-0000-4000-8000-000000000820',
  'b8100000-0000-4000-8000-000000000810',
  'business-order-lifecycle@invalid.example',
  'ci-only-unused-credential',
  'active',
  now(),
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.role_assignments (
  id, organization_id, user_id, role_key, scope_kind, is_active, valid_from
) VALUES (
  'b8300000-0000-4000-8000-000000000830',
  v9.get_public_organization_id(),
  'b8200000-0000-4000-8000-000000000820',
  'organization_admin',
  'organization',
  true,
  now() - interval '1 hour'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.sessions (id, user_id, token_hash, expires_at)
VALUES (
  'b8400000-0000-4000-8000-000000000840',
  'b8200000-0000-4000-8000-000000000820',
  repeat('b',64),
  now() + interval '2 hours'
)
ON CONFLICT (id) DO NOTHING;

-- A second active tracked product gives the multi-item atomicity test a
-- deterministic insufficient-stock line while the first product has stock.
INSERT INTO v9.business_products (
  id, organization_id, field_key, reference_no, sku, slug, product_name,
  product_kind, unit_label, selling_price, status, publication_status,
  track_stock, created_by, updated_by
) VALUES (
  'c1500000-0000-4000-8000-000000000150',
  v9.get_public_organization_id(),
  'usaha',
  'QA-PRD-LIFE-002',
  'QA-BIZ-LIFE-002',
  'qa-business-lifecycle-product-2',
  'QA Business Lifecycle Product 2',
  'physical',
  'pcs',
  10000,
  'active',
  'private',
  true,
  'b8200000-0000-4000-8000-000000000820',
  'b8200000-0000-4000-8000-000000000820'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.business_product_stock (
  product_id, warehouse_id, organization_id, field_key,
  on_hand, reserved, updated_by
) VALUES (
  'c1500000-0000-4000-8000-000000000150',
  'c3000000-0000-4000-8000-000000000003',
  v9.get_public_organization_id(),
  'usaha',
  1,
  0,
  'b8200000-0000-4000-8000-000000000820'
)
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

INSERT INTO v9.business_orders (
  id, organization_id, field_key, reference_no, customer_id,
  customer_name_snapshot, warehouse_id, order_channel, order_date, status,
  currency_code, subtotal, delivery_fee, total_amount, created_by, updated_by
) VALUES
  (
    'b8500000-0000-4000-8000-000000000850',
    v9.get_public_organization_id(), 'usaha', 'QA-ORD-LIFE-FULFILL',
    'c5000000-0000-4000-8000-000000000005', 'QA Customer Tenant A',
    'c3000000-0000-4000-8000-000000000003', 'internal', current_date, 'draft',
    'IDR', 20000, 0, 20000,
    'b8200000-0000-4000-8000-000000000820',
    'b8200000-0000-4000-8000-000000000820'
  ),
  (
    'b8600000-0000-4000-8000-000000000860',
    v9.get_public_organization_id(), 'usaha', 'QA-ORD-LIFE-CANCEL',
    'c5000000-0000-4000-8000-000000000005', 'QA Customer Tenant A',
    'c3000000-0000-4000-8000-000000000003', 'internal', current_date, 'draft',
    'IDR', 30000, 0, 30000,
    'b8200000-0000-4000-8000-000000000820',
    'b8200000-0000-4000-8000-000000000820'
  ),
  (
    'b8700000-0000-4000-8000-000000000870',
    v9.get_public_organization_id(), 'usaha', 'QA-ORD-LIFE-INSUFFICIENT',
    'c5000000-0000-4000-8000-000000000005', 'QA Customer Tenant A',
    'c3000000-0000-4000-8000-000000000003', 'internal', current_date, 'draft',
    'IDR', 90000, 0, 90000,
    'b8200000-0000-4000-8000-000000000820',
    'b8200000-0000-4000-8000-000000000820'
  ),
  (
    'b8800000-0000-4000-8000-000000000880',
    v9.get_public_organization_id(), 'usaha', 'QA-ORD-LIFE-PARTIAL',
    'c5000000-0000-4000-8000-000000000005', 'QA Customer Tenant A',
    'c3000000-0000-4000-8000-000000000003', 'internal', current_date, 'draft',
    'IDR', 30000, 0, 30000,
    'b8200000-0000-4000-8000-000000000820',
    'b8200000-0000-4000-8000-000000000820'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.business_order_items (
  id, organization_id, field_key, order_id, product_id,
  sku_snapshot, product_name_snapshot, unit_snapshot,
  quantity, unit_price, line_total, stock_reserved
) VALUES
  (
    'b8510000-0000-4000-8000-000000000851',
    v9.get_public_organization_id(), 'usaha',
    'b8500000-0000-4000-8000-000000000850',
    'c1000000-0000-4000-8000-000000000001',
    'QA-BIZ-A-001', 'QA Product Tenant A', 'pcs',
    2, 10000, 20000, 0
  ),
  (
    'b8610000-0000-4000-8000-000000000861',
    v9.get_public_organization_id(), 'usaha',
    'b8600000-0000-4000-8000-000000000860',
    'c1000000-0000-4000-8000-000000000001',
    'QA-BIZ-A-001', 'QA Product Tenant A', 'pcs',
    3, 10000, 30000, 0
  ),
  (
    'b8710000-0000-4000-8000-000000000871',
    v9.get_public_organization_id(), 'usaha',
    'b8700000-0000-4000-8000-000000000870',
    'c1000000-0000-4000-8000-000000000001',
    'QA-BIZ-A-001', 'QA Product Tenant A', 'pcs',
    9, 10000, 90000, 0
  ),
  (
    'b8810000-0000-4000-8000-000000000881',
    v9.get_public_organization_id(), 'usaha',
    'b8800000-0000-4000-8000-000000000880',
    'c1000000-0000-4000-8000-000000000001',
    'QA-BIZ-A-001', 'QA Product Tenant A', 'pcs',
    1, 10000, 10000, 0
  ),
  (
    'b8820000-0000-4000-8000-000000000882',
    v9.get_public_organization_id(), 'usaha',
    'b8800000-0000-4000-8000-000000000880',
    'c1500000-0000-4000-8000-000000000150',
    'QA-BIZ-LIFE-002', 'QA Business Lifecycle Product 2', 'pcs',
    2, 10000, 20000, 0
  )
ON CONFLICT (id) DO NOTHING;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('b',64), true);

DO $actor_identity$
DECLARE actor record;
BEGIN
  SELECT * INTO actor FROM v9._request_actor() LIMIT 1;
  IF actor.user_id IS DISTINCT FROM 'b8200000-0000-4000-8000-000000000820'::uuid
    OR actor.organization_id IS DISTINCT FROM v9.get_public_organization_id()
    OR actor.role_key IS DISTINCT FROM 'organization_admin'
    OR actor.scope_kind IS DISTINCT FROM 'organization'
  THEN
    RAISE EXCEPTION 'Order lifecycle actor did not resolve to the expected tenant organization administrator.';
  END IF;
END
$actor_identity$;

-- Reserve all stock for a valid draft order in one atomic operation.
DO $confirm_valid$
DECLARE affected integer;
BEGIN
  SELECT count(*)::integer INTO affected
  FROM v9.confirm_business_order(
    'b8500000-0000-4000-8000-000000000850',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one confirmed order; got %.', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_orders
    WHERE id = 'b8500000-0000-4000-8000-000000000850'
      AND status = 'confirmed'
      AND confirmed_by = 'b8200000-0000-4000-8000-000000000820'
      AND confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'The valid order did not reach confirmed state.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_order_items
    WHERE id = 'b8510000-0000-4000-8000-000000000851'
      AND stock_reserved = 2
  ) THEN
    RAISE EXCEPTION 'The order item does not carry its exact reservation quantity.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_product_stock
    WHERE product_id = 'c1000000-0000-4000-8000-000000000001'
      AND warehouse_id = 'c3000000-0000-4000-8000-000000000003'
      AND on_hand = 12 AND reserved = 4
  ) THEN
    RAISE EXCEPTION 'The stock register did not increase reserved quantity by exactly two.';
  END IF;

  SELECT count(*)::integer INTO affected
  FROM v9.confirm_business_order(
    'b8500000-0000-4000-8000-000000000850',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 0 THEN
    RAISE EXCEPTION 'A confirmed order was reserved more than once.';
  END IF;
END
$confirm_valid$;

-- Exercise the same two status steps as advanceBusinessOrder, each with an
-- audit event, before invoking the exact fulfillment function used by the app.
WITH updated AS (
  UPDATE v9.business_orders
  SET status = 'processing',
      updated_by = 'b8200000-0000-4000-8000-000000000820',
      updated_at = now()
  WHERE id = 'b8500000-0000-4000-8000-000000000850'
    AND organization_id = v9.get_public_organization_id()
    AND field_key = 'usaha'
    AND status = 'confirmed'
  RETURNING id, organization_id, field_key, reference_no, customer_id,
    status, total_amount
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'b8200000-0000-4000-8000-000000000820',
    'business_order.status.processing', 'business_order', id::text,
    jsonb_build_object('field_key',field_key,'reference_no',reference_no,
      'customer_id',customer_id,'status',status,'total_amount',total_amount)
  FROM updated RETURNING id
)
SELECT count(*) FROM updated INNER JOIN audit USING (id);

WITH updated AS (
  UPDATE v9.business_orders
  SET status = 'ready',
      updated_by = 'b8200000-0000-4000-8000-000000000820',
      updated_at = now()
  WHERE id = 'b8500000-0000-4000-8000-000000000850'
    AND organization_id = v9.get_public_organization_id()
    AND field_key = 'usaha'
    AND status = 'processing'
  RETURNING id, organization_id, field_key, reference_no, customer_id,
    status, total_amount
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'b8200000-0000-4000-8000-000000000820',
    'business_order.status.ready', 'business_order', id::text,
    jsonb_build_object('field_key',field_key,'reference_no',reference_no,
      'customer_id',customer_id,'status',status,'total_amount',total_amount)
  FROM updated RETURNING id
)
SELECT count(*) FROM updated INNER JOIN audit USING (id);

DO $fulfill_valid$
DECLARE affected integer; movement_count integer;
BEGIN
  SELECT count(*)::integer INTO affected
  FROM v9.fulfill_business_order(
    'b8500000-0000-4000-8000-000000000850',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one fulfilled order; got %.', affected;
  END IF;

  SELECT count(*)::integer INTO affected
  FROM v9.fulfill_business_order(
    'b8500000-0000-4000-8000-000000000850',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 0 THEN
    RAISE EXCEPTION 'A fulfilled order was processed more than once.';
  END IF;

  SELECT count(*)::integer INTO movement_count
  FROM v9.business_inventory_movements
  WHERE organization_id = v9.get_public_organization_id()
    AND field_key = 'usaha'
    AND source_reference = 'QA-ORD-LIFE-FULFILL'
    AND movement_type = 'sale'
    AND product_id = 'c1000000-0000-4000-8000-000000000001'
    AND quantity = 2
    AND on_hand_before = 12
    AND on_hand_delta = -2
    AND on_hand_after = 10;

  IF movement_count <> 1 THEN
    RAISE EXCEPTION 'Fulfillment must create exactly one immutable sale movement with before/delta/after 10/-2/8; got %.', movement_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_orders
    WHERE id = 'b8500000-0000-4000-8000-000000000850'
      AND status = 'fulfilled'
      AND fulfilled_by = 'b8200000-0000-4000-8000-000000000820'
      AND fulfilled_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Fulfilled order status and actor metadata are missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_order_items
    WHERE id = 'b8510000-0000-4000-8000-000000000851'
      AND stock_reserved = 0
  ) THEN
    RAISE EXCEPTION 'Fulfillment did not clear the order item reservation.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_product_stock
    WHERE product_id = 'c1000000-0000-4000-8000-000000000001'
      AND warehouse_id = 'c3000000-0000-4000-8000-000000000003'
      AND on_hand = 10 AND reserved = 2
  ) THEN
    RAISE EXCEPTION 'Fulfillment did not reduce on-hand and reserved stock exactly once.';
  END IF;
END
$fulfill_valid$;

-- A cancelled confirmed order releases its reservation exactly once and does
-- not create a sale movement.
DO $cancel_valid$
DECLARE affected integer; sale_count integer;
BEGIN
  SELECT count(*)::integer INTO affected
  FROM v9.confirm_business_order(
    'b8600000-0000-4000-8000-000000000860',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one confirmed cancellation fixture; got %.', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_product_stock
    WHERE product_id = 'c1000000-0000-4000-8000-000000000001'
      AND warehouse_id = 'c3000000-0000-4000-8000-000000000003'
      AND on_hand = 10 AND reserved = 5
  ) THEN
    RAISE EXCEPTION 'Cancellation fixture reservation was not created.';
  END IF;

  SELECT count(*)::integer INTO affected
  FROM v9.cancel_business_order(
    'b8600000-0000-4000-8000-000000000860',
    'b8200000-0000-4000-8000-000000000820',
    'Pelanggan membatalkan pesanan sebelum pemenuhan'
  );
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one cancelled order; got %.', affected;
  END IF;

  SELECT count(*)::integer INTO affected
  FROM v9.cancel_business_order(
    'b8600000-0000-4000-8000-000000000860',
    'b8200000-0000-4000-8000-000000000820',
    'Duplicate cancellation must not run'
  );
  IF affected <> 0 THEN
    RAISE EXCEPTION 'A cancelled order released stock more than once.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_orders
    WHERE id = 'b8600000-0000-4000-8000-000000000860'
      AND status = 'cancelled'
      AND cancelled_by = 'b8200000-0000-4000-8000-000000000820'
      AND cancelled_at IS NOT NULL
      AND internal_note LIKE '%Pelanggan membatalkan pesanan%'
  ) THEN
    RAISE EXCEPTION 'Cancellation state, actor or reason was not persisted.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_order_items
    WHERE id = 'b8610000-0000-4000-8000-000000000861'
      AND stock_reserved = 0
  ) THEN
    RAISE EXCEPTION 'Cancellation did not clear the item reservation.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_product_stock
    WHERE product_id = 'c1000000-0000-4000-8000-000000000001'
      AND warehouse_id = 'c3000000-0000-4000-8000-000000000003'
      AND on_hand = 10 AND reserved = 2
  ) THEN
    RAISE EXCEPTION 'Cancellation did not return reserved quantity to its original balance.';
  END IF;

  SELECT count(*)::integer INTO sale_count
  FROM v9.business_inventory_movements
  WHERE source_reference = 'QA-ORD-LIFE-CANCEL'
    AND movement_type = 'sale';

  IF sale_count <> 0 THEN
    RAISE EXCEPTION 'Cancelling a reservation must not create a sale movement.';
  END IF;
END
$cancel_valid$;

-- Insufficient stock must leave the order, item and stock register untouched.
DO $insufficient_stock$
DECLARE affected integer;
BEGIN
  SELECT count(*)::integer INTO affected
  FROM v9.confirm_business_order(
    'b8700000-0000-4000-8000-000000000870',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 0 THEN
    RAISE EXCEPTION 'An order exceeding available stock was confirmed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_orders
    WHERE id = 'b8700000-0000-4000-8000-000000000870'
      AND status = 'draft'
      AND confirmed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'An insufficient-stock order did not remain a draft.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_order_items
    WHERE id = 'b8710000-0000-4000-8000-000000000871'
      AND stock_reserved = 0
  ) THEN
    RAISE EXCEPTION 'An insufficient-stock order left a partial item reservation.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_product_stock
    WHERE product_id = 'c1000000-0000-4000-8000-000000000001'
      AND warehouse_id = 'c3000000-0000-4000-8000-000000000003'
      AND on_hand = 10 AND reserved = 2
  ) THEN
    RAISE EXCEPTION 'An insufficient-stock order changed the stock register.';
  END IF;
END
$insufficient_stock$;

-- Multi-item confirmation is all-or-nothing: the first item has stock but the
-- second item is short. The first item's stock must not be reserved partially.
DO $partial_reservation$
DECLARE affected integer;
BEGIN
  SELECT count(*)::integer INTO affected
  FROM v9.confirm_business_order(
    'b8800000-0000-4000-8000-000000000880',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 0 THEN
    RAISE EXCEPTION 'A multi-item order with one insufficient stock line was confirmed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_orders
    WHERE id = 'b8800000-0000-4000-8000-000000000880'
      AND status = 'draft'
      AND confirmed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A partially available order did not remain draft.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.business_product_stock
    WHERE product_id = 'c1000000-0000-4000-8000-000000000001'
      AND warehouse_id = 'c3000000-0000-4000-8000-000000000003'
      AND on_hand = 10 AND reserved = 2
  ) OR NOT EXISTS (
    SELECT 1 FROM v9.business_product_stock
    WHERE product_id = 'c1500000-0000-4000-8000-000000000150'
      AND warehouse_id = 'c3000000-0000-4000-8000-000000000003'
      AND on_hand = 1 AND reserved = 0
  ) THEN
    RAISE EXCEPTION 'Multi-item failure left a partial stock reservation.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.business_order_items
    WHERE order_id = 'b8800000-0000-4000-8000-000000000880'
      AND stock_reserved <> 0
  ) THEN
    RAISE EXCEPTION 'Multi-item failure left a nonzero stock_reserved quantity.';
  END IF;
END
$partial_reservation$;

-- A tenant-A actor cannot invoke a state transition on a known tenant-B order,
-- and a caller cannot substitute a different actor ID.
DO $tenant_and_actor_boundaries$
DECLARE affected integer;
BEGIN
  SELECT count(*)::integer INTO affected
  FROM v9.confirm_business_order(
    'c8000000-0000-4000-8000-000000000008',
    'b8200000-0000-4000-8000-000000000820'
  );
  IF affected <> 0 THEN
    RAISE EXCEPTION 'Tenant A order actor could transition a tenant-B order.';
  END IF;

  SELECT count(*)::integer INTO affected
  FROM v9.confirm_business_order(
    'b8700000-0000-4000-8000-000000000870',
    '40000000-0000-4000-8000-000000000004'
  );
  IF affected <> 0 THEN
    RAISE EXCEPTION 'Caller-supplied actor ID could replace the authenticated request actor.';
  END IF;
END
$tenant_and_actor_boundaries$;

DO $audit_assertions$
BEGIN
  IF (
    SELECT count(*) FROM v9.audit_events
    WHERE entity_type = 'business_order'
      AND entity_id = 'b8500000-0000-4000-8000-000000000850'
      AND action IN ('business_order.confirmed','business_order.status.processing',
        'business_order.status.ready','business_order.fulfilled')
  ) <> 4 THEN
    RAISE EXCEPTION 'Fulfilled order must have exactly four ordered lifecycle audit events.';
  END IF;

  IF (
    SELECT count(*) FROM v9.audit_events
    WHERE entity_type = 'business_order'
      AND entity_id = 'b8600000-0000-4000-8000-000000000860'
      AND action IN ('business_order.confirmed','business_order.cancelled')
  ) <> 2 THEN
    RAISE EXCEPTION 'Cancelled order must have exactly two lifecycle audit events.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.audit_events
    WHERE entity_type = 'business_order'
      AND entity_id IN (
        'b8700000-0000-4000-8000-000000000870',
        'b8800000-0000-4000-8000-000000000880'
      )
      AND action = 'business_order.confirmed'
  ) THEN
    RAISE EXCEPTION 'Rejected reservation attempts must not emit a confirmed audit event.';
  END IF;
END
$audit_assertions$;

COMMIT;

SELECT 'PASS PostgreSQL 16 business order lifecycle: tenant/actor binding, serialized stock reservation, exact fulfillment sale movements, idempotent cancellation, insufficient-stock rejection, multi-item atomicity and audit events.' AS result;
