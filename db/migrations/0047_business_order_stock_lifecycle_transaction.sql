-- Move the stock-affecting order transitions into SECURITY INVOKER functions.
-- These functions are the single transaction boundary used by both application
-- actions and PostgreSQL integration tests. RLS stays enabled; request actor
-- and organization scope are verified before touching operational rows.

CREATE OR REPLACE FUNCTION v9._business_order_actor_organization(
  p_actor_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, v9
AS $business_order_actor$
DECLARE
  actor record;
BEGIN
  SELECT * INTO actor
  FROM v9._request_actor()
  LIMIT 1;

  IF actor.user_id IS NULL
    OR actor.user_id IS DISTINCT FROM p_actor_user_id
    OR actor.organization_id IS NULL
    OR actor.role_key IS NULL
    OR actor.role_key NOT IN (
      'platform_admin',
      'organization_admin',
      'chair',
      'field_coordinator'
    )
    OR v9._tenant_row_visible(
      actor.organization_id,
      'usaha',
      NULL,
      NULL,
      NULL,
      NULL
    ) IS DISTINCT FROM true
  THEN
    RETURN NULL;
  END IF;

  RETURN actor.organization_id;
END;
$business_order_actor$;

REVOKE ALL ON FUNCTION v9._business_order_actor_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v9._business_order_actor_organization(uuid) TO v9_app;


CREATE OR REPLACE FUNCTION v9.confirm_business_order(
  p_order_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, v9
AS $business_order_confirm$
DECLARE
  target_organization uuid;
  target_order record;
  lock_row record;
  item_count integer;
  tracked_count integer;
  locked_stock_count integer;
  stock_is_available boolean;
  changed_count integer;
  result_id uuid;
BEGIN
  target_organization := v9._business_order_actor_organization(p_actor_user_id);
  IF target_organization IS NULL OR p_order_id IS NULL THEN
    RETURN;
  END IF;

  SELECT order_row.id, order_row.organization_id, order_row.field_key,
    order_row.reference_no, order_row.warehouse_id, order_row.status,
    order_row.customer_id, order_row.total_amount
  INTO target_order
  FROM v9.business_orders AS order_row
  WHERE order_row.id = p_order_id
    AND order_row.organization_id = target_organization
    AND order_row.field_key = 'usaha'
    AND order_row.status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Lock all stock rows in stable order before checking availability. This
  -- serializes separate orders competing for the same product/warehouse.
  FOR lock_row IN
    SELECT stock.product_id, stock.warehouse_id
    FROM v9.business_product_stock AS stock
    INNER JOIN v9.business_order_items AS item
      ON item.product_id = stock.product_id
      AND item.organization_id = stock.organization_id
      AND item.field_key = stock.field_key
    INNER JOIN v9.business_products AS product
      ON product.id = item.product_id
      AND product.organization_id = item.organization_id
      AND product.field_key = item.field_key
    WHERE item.order_id = target_order.id
      AND item.organization_id = target_order.organization_id
      AND product.track_stock = true
      AND stock.warehouse_id = target_order.warehouse_id
    ORDER BY stock.product_id, stock.warehouse_id
    FOR UPDATE OF stock
  LOOP
    NULL;
  END LOOP;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE product.track_stock)::integer,
    count(stock.product_id) FILTER (WHERE product.track_stock)::integer,
    COALESCE(bool_and(
      product.status = 'active'
      AND (
        product.track_stock = false
        OR (
          stock.product_id IS NOT NULL
          AND stock.on_hand - stock.reserved >= item.quantity
        )
      )
    ), false)
  INTO item_count, tracked_count, locked_stock_count, stock_is_available
  FROM v9.business_order_items AS item
  INNER JOIN v9.business_products AS product
    ON product.id = item.product_id
    AND product.organization_id = item.organization_id
    AND product.field_key = item.field_key
  LEFT JOIN v9.business_product_stock AS stock
    ON stock.product_id = item.product_id
    AND stock.warehouse_id = target_order.warehouse_id
    AND stock.organization_id = item.organization_id
    AND stock.field_key = item.field_key
    AND product.track_stock = true
  WHERE item.order_id = target_order.id
    AND item.organization_id = target_order.organization_id
    AND item.field_key = target_order.field_key;

  IF item_count = 0
    OR tracked_count <> locked_stock_count
    OR stock_is_available IS DISTINCT FROM true
  THEN
    RETURN;
  END IF;

  UPDATE v9.business_product_stock AS stock
  SET reserved = stock.reserved + item.quantity,
      updated_by = p_actor_user_id,
      updated_at = now()
  FROM v9.business_order_items AS item
  INNER JOIN v9.business_products AS product
    ON product.id = item.product_id
    AND product.organization_id = item.organization_id
    AND product.field_key = item.field_key
  WHERE item.order_id = target_order.id
    AND item.organization_id = target_order.organization_id
    AND item.field_key = target_order.field_key
    AND product.track_stock = true
    AND stock.product_id = item.product_id
    AND stock.warehouse_id = target_order.warehouse_id
    AND stock.organization_id = item.organization_id
    AND stock.field_key = item.field_key
    AND stock.on_hand - stock.reserved >= item.quantity;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> tracked_count THEN
    RAISE EXCEPTION 'Stock reservation changed while confirming the order; the transaction was rolled back.';
  END IF;

  UPDATE v9.business_order_items AS item
  SET stock_reserved = CASE WHEN product.track_stock THEN item.quantity ELSE 0 END,
      updated_at = now()
  FROM v9.business_products AS product
  WHERE item.order_id = target_order.id
    AND item.organization_id = target_order.organization_id
    AND item.field_key = target_order.field_key
    AND product.id = item.product_id
    AND product.organization_id = item.organization_id
    AND product.field_key = item.field_key;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> item_count THEN
    RAISE EXCEPTION 'Not every order item could be marked with its reservation; the transaction was rolled back.';
  END IF;

  UPDATE v9.business_orders AS order_row
  SET status = 'confirmed',
      confirmed_by = p_actor_user_id,
      confirmed_at = now(),
      updated_by = p_actor_user_id,
      updated_at = now()
  WHERE order_row.id = target_order.id
    AND order_row.organization_id = target_order.organization_id
    AND order_row.status = 'draft'
  RETURNING order_row.id INTO result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The order could not be confirmed after its stock reservation.';
  END IF;

  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  ) VALUES (
    target_order.organization_id,
    p_actor_user_id,
    'business_order.confirmed',
    'business_order',
    result_id::text,
    jsonb_build_object(
      'field_key', target_order.field_key,
      'reference_no', target_order.reference_no,
      'customer_id', target_order.customer_id,
      'status', 'confirmed',
      'total_amount', target_order.total_amount,
      'tracked_item_count', tracked_count
    )
  );

  id := result_id;
  RETURN NEXT;
END;
$business_order_confirm$;


CREATE OR REPLACE FUNCTION v9.fulfill_business_order(
  p_order_id uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, v9
AS $business_order_fulfill$
DECLARE
  target_organization uuid;
  target_order record;
  lock_row record;
  stock_row record;
  item_count integer;
  tracked_count integer;
  locked_stock_count integer;
  stock_is_valid boolean;
  changed_count integer;
  movement_count integer := 0;
  result_id uuid;
BEGIN
  target_organization := v9._business_order_actor_organization(p_actor_user_id);
  IF target_organization IS NULL OR p_order_id IS NULL THEN
    RETURN;
  END IF;

  SELECT order_row.id, order_row.organization_id, order_row.field_key,
    order_row.reference_no, order_row.warehouse_id, order_row.status,
    order_row.customer_id, order_row.total_amount
  INTO target_order
  FROM v9.business_orders AS order_row
  WHERE order_row.id = p_order_id
    AND order_row.organization_id = target_organization
    AND order_row.field_key = 'usaha'
    AND order_row.status = 'ready'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR lock_row IN
    SELECT stock.product_id, stock.warehouse_id
    FROM v9.business_product_stock AS stock
    INNER JOIN v9.business_order_items AS item
      ON item.product_id = stock.product_id
      AND item.organization_id = stock.organization_id
      AND item.field_key = stock.field_key
    INNER JOIN v9.business_products AS product
      ON product.id = item.product_id
      AND product.organization_id = item.organization_id
      AND product.field_key = item.field_key
    WHERE item.order_id = target_order.id
      AND item.organization_id = target_order.organization_id
      AND product.track_stock = true
      AND stock.warehouse_id = target_order.warehouse_id
    ORDER BY stock.product_id, stock.warehouse_id
    FOR UPDATE OF stock
  LOOP
    NULL;
  END LOOP;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE product.track_stock)::integer,
    count(stock.product_id) FILTER (WHERE product.track_stock)::integer,
    COALESCE(bool_and(
      product.status = 'active'
      AND CASE
        WHEN product.track_stock THEN
          item.stock_reserved = item.quantity
          AND stock.product_id IS NOT NULL
          AND stock.on_hand >= item.stock_reserved
          AND stock.reserved >= item.stock_reserved
        ELSE item.stock_reserved = 0
      END
    ), false)
  INTO item_count, tracked_count, locked_stock_count, stock_is_valid
  FROM v9.business_order_items AS item
  INNER JOIN v9.business_products AS product
    ON product.id = item.product_id
    AND product.organization_id = item.organization_id
    AND product.field_key = item.field_key
  LEFT JOIN v9.business_product_stock AS stock
    ON stock.product_id = item.product_id
    AND stock.warehouse_id = target_order.warehouse_id
    AND stock.organization_id = item.organization_id
    AND stock.field_key = item.field_key
    AND product.track_stock = true
  WHERE item.order_id = target_order.id
    AND item.organization_id = target_order.organization_id
    AND item.field_key = target_order.field_key;

  IF item_count = 0
    OR tracked_count <> locked_stock_count
    OR stock_is_valid IS DISTINCT FROM true
  THEN
    RETURN;
  END IF;

  -- Stock rows remain locked from the validation read through each update.
  -- Each immutable sale movement records the exact before/delta/after values.
  FOR stock_row IN
    SELECT
      item.product_id,
      item.quantity,
      item.stock_reserved,
      stock.warehouse_id,
      stock.on_hand,
      stock.reserved
    FROM v9.business_order_items AS item
    INNER JOIN v9.business_products AS product
      ON product.id = item.product_id
      AND product.organization_id = item.organization_id
      AND product.field_key = item.field_key
      AND product.track_stock = true
    INNER JOIN v9.business_product_stock AS stock
      ON stock.product_id = item.product_id
      AND stock.warehouse_id = target_order.warehouse_id
      AND stock.organization_id = item.organization_id
      AND stock.field_key = item.field_key
    WHERE item.order_id = target_order.id
      AND item.organization_id = target_order.organization_id
      AND item.field_key = target_order.field_key
    ORDER BY item.product_id, stock.warehouse_id
  LOOP
    UPDATE v9.business_product_stock AS stock
    SET on_hand = stock.on_hand - stock_row.stock_reserved,
        reserved = stock.reserved - stock_row.stock_reserved,
        updated_by = p_actor_user_id,
        updated_at = now()
    WHERE stock.product_id = stock_row.product_id
      AND stock.warehouse_id = stock_row.warehouse_id
      AND stock.organization_id = target_order.organization_id
      AND stock.field_key = target_order.field_key
      AND stock.on_hand >= stock_row.stock_reserved
      AND stock.reserved >= stock_row.stock_reserved;

    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 1 THEN
      RAISE EXCEPTION 'Stock changed during order fulfillment; the transaction was rolled back.';
    END IF;

    INSERT INTO v9.business_inventory_movements (
      organization_id, field_key, product_id, warehouse_id, movement_type,
      quantity, on_hand_before, on_hand_delta, on_hand_after,
      source_reference, note, recorded_by
    ) VALUES (
      target_order.organization_id,
      target_order.field_key,
      stock_row.product_id,
      stock_row.warehouse_id,
      'sale',
      stock_row.stock_reserved,
      stock_row.on_hand,
      -stock_row.stock_reserved,
      stock_row.on_hand - stock_row.stock_reserved,
      target_order.reference_no,
      'Pemenuhan pesanan ' || target_order.id::text,
      p_actor_user_id
    );

    movement_count := movement_count + 1;
  END LOOP;

  IF movement_count <> tracked_count THEN
    RAISE EXCEPTION 'Not every tracked item produced exactly one sale movement; the transaction was rolled back.';
  END IF;

  UPDATE v9.business_order_items AS item
  SET stock_reserved = 0,
      updated_at = now()
  WHERE item.order_id = target_order.id
    AND item.organization_id = target_order.organization_id
    AND item.field_key = target_order.field_key;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> item_count THEN
    RAISE EXCEPTION 'Not every order item reservation could be released; the transaction was rolled back.';
  END IF;

  UPDATE v9.business_orders AS order_row
  SET status = 'fulfilled',
      fulfilled_by = p_actor_user_id,
      fulfilled_at = now(),
      updated_by = p_actor_user_id,
      updated_at = now()
  WHERE order_row.id = target_order.id
    AND order_row.organization_id = target_order.organization_id
    AND order_row.status = 'ready'
  RETURNING order_row.id INTO result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The order could not be marked fulfilled after stock deduction.';
  END IF;

  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  ) VALUES (
    target_order.organization_id,
    p_actor_user_id,
    'business_order.fulfilled',
    'business_order',
    result_id::text,
    jsonb_build_object(
      'field_key', target_order.field_key,
      'reference_no', target_order.reference_no,
      'customer_id', target_order.customer_id,
      'status', 'fulfilled',
      'total_amount', target_order.total_amount,
      'stock_movement_count', movement_count
    )
  );

  id := result_id;
  RETURN NEXT;
END;
$business_order_fulfill$;


CREATE OR REPLACE FUNCTION v9.cancel_business_order(
  p_order_id uuid,
  p_actor_user_id uuid,
  p_reason text DEFAULT ''
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, v9
AS $business_order_cancel$
DECLARE
  target_organization uuid;
  target_order record;
  lock_row record;
  stock_row record;
  item_count integer;
  reservation_count integer;
  locked_stock_count integer;
  reservation_is_valid boolean;
  changed_count integer;
  released_count integer := 0;
  result_id uuid;
  reason_text text := COALESCE(p_reason, '');
BEGIN
  target_organization := v9._business_order_actor_organization(p_actor_user_id);
  IF target_organization IS NULL OR p_order_id IS NULL OR length(reason_text) > 1000 THEN
    RETURN;
  END IF;

  SELECT order_row.id, order_row.organization_id, order_row.field_key,
    order_row.reference_no, order_row.warehouse_id, order_row.status,
    order_row.customer_id, order_row.total_amount, order_row.internal_note
  INTO target_order
  FROM v9.business_orders AS order_row
  WHERE order_row.id = p_order_id
    AND order_row.organization_id = target_organization
    AND order_row.field_key = 'usaha'
    AND order_row.status IN ('draft','confirmed','processing','ready')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR lock_row IN
    SELECT stock.product_id, stock.warehouse_id
    FROM v9.business_product_stock AS stock
    INNER JOIN v9.business_order_items AS item
      ON item.product_id = stock.product_id
      AND item.organization_id = stock.organization_id
      AND item.field_key = stock.field_key
    WHERE item.order_id = target_order.id
      AND item.organization_id = target_order.organization_id
      AND item.field_key = target_order.field_key
      AND item.stock_reserved > 0
      AND stock.warehouse_id = target_order.warehouse_id
    ORDER BY stock.product_id, stock.warehouse_id
    FOR UPDATE OF stock
  LOOP
    NULL;
  END LOOP;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE item.stock_reserved > 0)::integer,
    count(stock.product_id) FILTER (WHERE item.stock_reserved > 0)::integer,
    COALESCE(bool_and(
      item.stock_reserved = 0
      OR (
        product.track_stock = true
        AND stock.product_id IS NOT NULL
        AND stock.reserved >= item.stock_reserved
      )
    ), false)
  INTO item_count, reservation_count, locked_stock_count, reservation_is_valid
  FROM v9.business_order_items AS item
  INNER JOIN v9.business_products AS product
    ON product.id = item.product_id
    AND product.organization_id = item.organization_id
    AND product.field_key = item.field_key
  LEFT JOIN v9.business_product_stock AS stock
    ON stock.product_id = item.product_id
    AND stock.warehouse_id = target_order.warehouse_id
    AND stock.organization_id = item.organization_id
    AND stock.field_key = item.field_key
    AND item.stock_reserved > 0
  WHERE item.order_id = target_order.id
    AND item.organization_id = target_order.organization_id
    AND item.field_key = target_order.field_key;

  IF item_count = 0
    OR reservation_count <> locked_stock_count
    OR reservation_is_valid IS DISTINCT FROM true
  THEN
    RETURN;
  END IF;

  FOR stock_row IN
    SELECT item.product_id, item.stock_reserved, stock.warehouse_id, stock.reserved
    FROM v9.business_order_items AS item
    INNER JOIN v9.business_product_stock AS stock
      ON stock.product_id = item.product_id
      AND stock.warehouse_id = target_order.warehouse_id
      AND stock.organization_id = item.organization_id
      AND stock.field_key = item.field_key
    WHERE item.order_id = target_order.id
      AND item.organization_id = target_order.organization_id
      AND item.field_key = target_order.field_key
      AND item.stock_reserved > 0
    ORDER BY item.product_id, stock.warehouse_id
  LOOP
    UPDATE v9.business_product_stock AS stock
    SET reserved = stock.reserved - stock_row.stock_reserved,
        updated_by = p_actor_user_id,
        updated_at = now()
    WHERE stock.product_id = stock_row.product_id
      AND stock.warehouse_id = stock_row.warehouse_id
      AND stock.organization_id = target_order.organization_id
      AND stock.field_key = target_order.field_key
      AND stock.reserved >= stock_row.stock_reserved;

    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 1 THEN
      RAISE EXCEPTION 'Stock reservation changed during order cancellation; the transaction was rolled back.';
    END IF;

    released_count := released_count + 1;
  END LOOP;

  IF released_count <> reservation_count THEN
    RAISE EXCEPTION 'Not every stock reservation was released; the transaction was rolled back.';
  END IF;

  UPDATE v9.business_order_items AS item
  SET stock_reserved = 0,
      updated_at = now()
  WHERE item.order_id = target_order.id
    AND item.organization_id = target_order.organization_id
    AND item.field_key = target_order.field_key;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> item_count THEN
    RAISE EXCEPTION 'Not every order item reservation could be cleared; the transaction was rolled back.';
  END IF;

  UPDATE v9.business_orders AS order_row
  SET status = 'cancelled',
      cancelled_by = p_actor_user_id,
      cancelled_at = now(),
      internal_note = concat_ws(E'\n', NULLIF(order_row.internal_note, ''), NULLIF(reason_text, '')),
      updated_by = p_actor_user_id,
      updated_at = now()
  WHERE order_row.id = target_order.id
    AND order_row.organization_id = target_order.organization_id
    AND order_row.status IN ('draft','confirmed','processing','ready')
  RETURNING order_row.id INTO result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The order could not be cancelled after stock release.';
  END IF;

  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  ) VALUES (
    target_order.organization_id,
    p_actor_user_id,
    'business_order.cancelled',
    'business_order',
    result_id::text,
    jsonb_build_object(
      'field_key', target_order.field_key,
      'reference_no', target_order.reference_no,
      'customer_id', target_order.customer_id,
      'status', 'cancelled',
      'total_amount', target_order.total_amount,
      'reason', NULLIF(reason_text, '')
    )
  );

  id := result_id;
  RETURN NEXT;
END;
$business_order_cancel$;

REVOKE ALL ON FUNCTION v9.confirm_business_order(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION v9.fulfill_business_order(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION v9.cancel_business_order(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v9.confirm_business_order(uuid, uuid) TO v9_app;
GRANT EXECUTE ON FUNCTION v9.fulfill_business_order(uuid, uuid) TO v9_app;
GRANT EXECUTE ON FUNCTION v9.cancel_business_order(uuid, uuid, text) TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES (
  '0047_business_order_stock_lifecycle_transaction.sql',
  'sha256:v9-business-order-stock-lifecycle-transaction-20261128'
)
ON CONFLICT (name) DO NOTHING;
