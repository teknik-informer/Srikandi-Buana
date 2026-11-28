"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

type MutationRow = { id: string; reference_no?: string };

const CUSTOMER_TYPES = ["individual","business","cooperative","government","ngo","other"] as const;
const ORDER_CHANNELS = ["internal","whatsapp","mitra","website","pos"] as const;

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function orderPath(result: string, orderId?: string, channel?: string): string {
  const query = new URLSearchParams({ result });
  if (orderId && validUuid(orderId)) query.set("order_id", orderId);
  const path = channel === "pos" ? "/app/pos" : "/app/bidang/usaha/pesanan";
  return `${path}?${query.toString()}`;
}

function requireOrderWrite(identity: Awaited<ReturnType<typeof requireIdentity>>): void {
  if (!can(identity, "field:usaha:business:write")) redirect("/app");
}

function fail(area: string, reason: unknown): void {
  const errorType =
    reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
  console.warn(`[${area}] Operation failed`, errorType);
}

function refreshOrders(): void {
  revalidatePath("/app/bidang/usaha");
  revalidatePath("/app/bidang/usaha/data");
  revalidatePath("/app/bidang/usaha/pesanan");
  revalidatePath("/app/bidang/usaha/persediaan");
  revalidatePath("/app/pos");
}

export async function createBusinessCustomer(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:activity:write");
  requireOrderWrite(identity);

  const name = normalize(String(formData.get("customer_name") ?? ""));
  const type = String(formData.get("customer_type") ?? "individual").trim();
  const contact = normalize(String(formData.get("contact_name") ?? ""));
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (
    name.length < 2 || name.length > 240 ||
    !CUSTOMER_TYPES.includes(type as (typeof CUSTOMER_TYPES)[number]) ||
    contact.length > 160 || phone.length > 60 ||
    email.length > 254 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    address.length > 1000 || notes.length > 3000
  ) {
    redirect(orderPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_customers (
          organization_id, field_key, customer_type, customer_name,
          contact_name, phone, email, address, notes, status, created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          ${type},
          ${name},
          NULLIF(${contact}, ''),
          NULLIF(${phone}, ''),
          NULLIF(${email}, ''),
          NULLIF(${address}, ''),
          NULLIF(${notes}, ''),
          'active',
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
        RETURNING id, organization_id, field_key, reference_no, customer_name, customer_type, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_customer.created',
          'business_customer', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'customer_name', customer_name, 'customer_type', customer_type, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("business-customer-create", reason);
    redirect(orderPath("error"));
  }

  if (!created) redirect(orderPath("field-unavailable"));
  refreshOrders();
  redirect(orderPath("customer-created"));
}

export async function createBusinessOrder(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const channel = String(formData.get("order_channel") ?? "internal").trim();
  if (channel === "pos") {
    if (!can(identity, "pos:sell")) redirect("/app");
  } else {
    if (!can(identity, "field:usaha:activity:write")) redirect("/app");
    requireOrderWrite(identity);
  }

  const customerId = String(formData.get("customer_id") ?? "").trim();
  const warehouseId = String(formData.get("warehouse_id") ?? "").trim();
  const deliveryFeeText = String(formData.get("delivery_fee") ?? "").trim();
  const deliveryFee = deliveryFeeText === "" ? 0 : Number(deliveryFeeText);
  const deliveryNote = String(formData.get("delivery_note") ?? "").trim();
  const customerNote = String(formData.get("customer_note") ?? "").trim();
  const internalNote = String(formData.get("internal_note") ?? "").trim();
  const itemsText = String(formData.get("items_json") ?? "[]");

  let items: { product_id: string; quantity: number }[];
  try {
    const parsed: unknown = JSON.parse(itemsText);
    if (!Array.isArray(parsed)) throw new Error("Order items must be an array");
    items = parsed as { product_id: string; quantity: number }[];
  } catch {
    redirect(orderPath("invalid-items", undefined, channel));
  }

  if (
    !validUuid(customerId) ||
    (warehouseId && !validUuid(warehouseId)) ||
    !ORDER_CHANNELS.includes(channel as (typeof ORDER_CHANNELS)[number]) ||
    !Number.isFinite(deliveryFee) || deliveryFee < 0 || deliveryFee > 1_000_000_000_000 ||
    deliveryNote.length > 1000 || customerNote.length > 3000 || internalNote.length > 3000 ||
    items.length < 1 || items.length > 20 || itemsText.length > 12000 ||
    items.some((item) =>
      !item || !validUuid(String(item.product_id ?? "")) ||
      !Number.isFinite(item.quantity) || item.quantity <= 0 ||
      item.quantity > 1_000_000 || Math.round(item.quantity * 1000) !== item.quantity * 1000
    ) ||
    new Set(items.map((item) => item.product_id)).size !== items.length
  ) {
    redirect(orderPath("invalid-items", undefined, channel));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH input AS MATERIALIZED (
        SELECT item.product_id, item.quantity
        FROM jsonb_to_recordset(${itemsText}::jsonb)
          AS item(product_id uuid, quantity numeric)
      ),
      selected_products AS MATERIALIZED (
        SELECT
          input.product_id,
          input.quantity,
          product.sku,
          product.product_name,
          product.unit_label,
          product.selling_price,
          product.product_kind,
          product.track_stock,
          product.publication_status
        FROM input
        INNER JOIN v9.business_products AS product
          ON product.id = input.product_id
          AND product.organization_id = ${identity.organizationId}
          AND product.field_key = 'usaha'
          AND product.status = 'active'
      ),
      order_context AS MATERIALIZED (
        SELECT
          application.organization_id,
          application.field_key,
          customer.id AS customer_id,
          customer.customer_name,
          customer.contact_name,
          customer.phone,
          customer.email,
          warehouse.id AS warehouse_id
        FROM v9.field_applications AS application
        INNER JOIN v9.business_customers AS customer
          ON customer.id = ${customerId}
          AND customer.organization_id = application.organization_id
          AND customer.field_key = application.field_key
          AND customer.status = 'active'
        LEFT JOIN v9.business_warehouses AS warehouse
          ON warehouse.id = NULLIF(${warehouseId}, '')::uuid
          AND warehouse.organization_id = application.organization_id
          AND warehouse.field_key = application.field_key
          AND warehouse.status = 'active'
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
          AND (NULLIF(${warehouseId}, '') IS NULL OR warehouse.id IS NOT NULL)
          AND (SELECT count(*) FROM selected_products) = (SELECT count(*) FROM input)
          AND (
            NOT EXISTS (SELECT 1 FROM selected_products product WHERE product.track_stock = true)
            OR warehouse.id IS NOT NULL
          )
          AND (
            ${channel} <> 'website'
            OR NOT EXISTS (
              SELECT 1 FROM selected_products product
              WHERE product.publication_status <> 'published'
            )
          )
      ),
      inserted_order AS (
        INSERT INTO v9.business_orders (
          organization_id, field_key, customer_id,
          customer_name_snapshot, customer_contact_snapshot,
          customer_phone_snapshot, customer_email_snapshot, warehouse_id,
          order_channel, order_date, status, currency_code,
          subtotal, delivery_fee, total_amount,
          delivery_note, customer_note, internal_note,
          created_by, updated_by
        )
        SELECT
          context.organization_id,
          context.field_key,
          context.customer_id,
          context.customer_name,
          NULLIF(context.contact_name, ''),
          NULLIF(context.phone, ''),
          NULLIF(context.email, ''),
          context.warehouse_id,
          ${channel},
          current_date,
          'draft',
          'IDR',
          0,
          ${deliveryFee},
          ${deliveryFee},
          NULLIF(${deliveryNote}, ''),
          NULLIF(${customerNote}, ''),
          NULLIF(${internalNote}, ''),
          ${identity.userId},
          ${identity.userId}
        FROM order_context AS context
        RETURNING id, organization_id, field_key, reference_no, customer_id, status
      ),
      inserted_items AS (
        INSERT INTO v9.business_order_items (
          organization_id, field_key, order_id, product_id,
          sku_snapshot, product_name_snapshot, unit_snapshot,
          quantity, unit_price, line_total, stock_reserved
        )
        SELECT
          order_row.organization_id,
          order_row.field_key,
          order_row.id,
          product.product_id,
          product.sku,
          product.product_name,
          product.unit_label,
          product.quantity,
          product.selling_price,
          round(product.quantity * product.selling_price, 2),
          0
        FROM inserted_order AS order_row
        CROSS JOIN selected_products AS product
        RETURNING id, order_id, line_total
      ),
      totals AS (
        UPDATE v9.business_orders AS order_row
        SET
          subtotal = COALESCE(lines.subtotal, 0),
          total_amount = COALESCE(lines.subtotal, 0) + order_row.delivery_fee,
          updated_at = now()
        FROM (
          SELECT order_id, sum(line_total)::numeric(18,2) AS subtotal, count(*)::int AS line_count
          FROM inserted_items
          GROUP BY order_id
        ) AS lines
        WHERE order_row.id = lines.order_id
          AND lines.line_count = (SELECT count(*) FROM input)
        RETURNING order_row.id, order_row.organization_id, order_row.field_key,
          order_row.reference_no, order_row.customer_id, order_row.status,
          order_row.subtotal, order_row.total_amount
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'business_order.created',
          'business_order',
          id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'customer_id', customer_id, 'status', status,
            'subtotal', subtotal, 'total_amount', total_amount)
        FROM totals
        RETURNING id
      )
      SELECT totals.id::text AS id, totals.reference_no
      FROM totals
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("business-order-create", reason);
    redirect(orderPath("error", undefined, channel));
  }

  if (!created) redirect(orderPath("customer-product-or-warehouse-unavailable", undefined, channel));
  refreshOrders();
  redirect(orderPath("order-created", created.id, channel));
}

export async function confirmBusinessOrder(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:activity:write");
  requireOrderWrite(identity);

  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!validUuid(orderId)) redirect(orderPath("invalid"));

  let confirmed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT id::text AS id
      FROM v9.confirm_business_order(
        ${orderId}::uuid,
        ${identity.userId}::uuid
      )
    `;
    confirmed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-order-confirm", reason);
    redirect(orderPath("error", orderId));
  }

  if (!confirmed) redirect(orderPath("reservation-unavailable", orderId));
  refreshOrders();
  redirect(orderPath("order-confirmed", orderId));
}

export async function advanceBusinessOrder(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:activity:write");
  requireOrderWrite(identity);

  const orderId = String(formData.get("order_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();
  if (!validUuid(orderId) || !["processing","ready"].includes(nextStatus)) {
    redirect(orderPath("invalid", orderId));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.business_orders
        SET
          status = ${nextStatus},
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${orderId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND (
            (status = 'confirmed' AND ${nextStatus} = 'processing')
            OR (status = 'processing' AND ${nextStatus} = 'ready')
          )
        RETURNING id, organization_id, field_key, reference_no, customer_id, status, total_amount
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_order.status.' || status,
          'business_order', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'customer_id', customer_id, 'status', status, 'total_amount', total_amount)
        FROM updated RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-order-advance", reason);
    redirect(orderPath("error", orderId));
  }

  if (!changed) redirect(orderPath("transition-blocked", orderId));
  refreshOrders();
  redirect(orderPath("order-updated", orderId));
}

export async function fulfillBusinessOrder(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:activity:write");
  requireOrderWrite(identity);

  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!validUuid(orderId)) redirect(orderPath("invalid"));

  let fulfilled = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT id::text AS id
      FROM v9.fulfill_business_order(
        ${orderId}::uuid,
        ${identity.userId}::uuid
      )
    `;
    fulfilled = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-order-fulfill", reason);
    redirect(orderPath("error", orderId));
  }

  if (!fulfilled) redirect(orderPath("fulfillment-stock-blocked", orderId));
  refreshOrders();
  redirect(orderPath("order-fulfilled", orderId));
}

export async function cancelBusinessOrder(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:activity:write");
  requireOrderWrite(identity);

  const orderId = String(formData.get("order_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!validUuid(orderId) || reason.length > 1000) redirect(orderPath("invalid", orderId));

  let cancelled = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT id::text AS id
      FROM v9.cancel_business_order(
        ${orderId}::uuid,
        ${identity.userId}::uuid,
        ${reason}
      )
    `;
    cancelled = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reasonError) {
    fail("business-order-cancel", reasonError);
    redirect(orderPath("error", orderId));
  }

  if (!cancelled) redirect(orderPath("cancellation-stock-blocked", orderId));
  refreshOrders();
  redirect(orderPath("order-cancelled", orderId));
}


export async function recordBusinessOrderPayment(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const cashierOnly = can(identity, "pos:sell") &&
    !(can(identity, "field:usaha:activity:write") && can(identity, "field:usaha:business:write"));

  if (!cashierOnly) {
    if (!can(identity, "field:usaha:activity:write")) redirect("/app");
    requireOrderWrite(identity);
  }

  const orderId = String(formData.get("order_id") ?? "").trim();
  const cashAccountId = String(formData.get("cash_account_id") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotency_key") ?? "").trim();
  const amountText = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountText);
  const paymentReference = normalize(String(formData.get("payment_reference") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (
    !validUuid(orderId) ||
    !validUuid(cashAccountId) ||
    !validUuid(idempotencyKey) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100 ||
    amount > 9999999999999999 ||
    paymentReference.length > 160 ||
    note.length > 1000
  ) {
    redirect(orderPath("payment-invalid", orderId, "pos"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH order_context AS MATERIALIZED (
        SELECT
          order_row.id,
          order_row.organization_id,
          order_row.field_key,
          order_row.reference_no,
          order_row.created_by,
          order_row.total_amount
        FROM v9.business_orders AS order_row
        WHERE order_row.id = ${orderId}
          AND order_row.organization_id = ${identity.organizationId}
          AND order_row.field_key = 'usaha'
          AND order_row.order_channel = 'pos'
          AND order_row.status = 'fulfilled'
          AND (${cashierOnly} = false OR order_row.created_by = ${identity.userId})
        FOR UPDATE
      ),
      register_context AS MATERIALIZED (
        SELECT cash_account.id
        FROM v9.finance_cash_accounts AS cash_account
        WHERE cash_account.id = ${cashAccountId}
          AND cash_account.organization_id = ${identity.organizationId}
          AND cash_account.status = 'active'
          AND cash_account.currency_code = 'IDR'
      ),
      paid AS MATERIALIZED (
        SELECT COALESCE(sum(payment.amount), 0)::numeric(18,2) AS paid_total
        FROM v9.business_order_payments AS payment
        INNER JOIN order_context AS order_row
          ON order_row.id = payment.order_id
          AND order_row.organization_id = payment.organization_id
      ),
      inserted AS (
        INSERT INTO v9.business_order_payments (
          organization_id, field_key, order_id, cash_account_id,
          payment_date, amount, payment_reference, note,
          received_by, idempotency_key
        )
        SELECT
          order_row.organization_id,
          order_row.field_key,
          order_row.id,
          register.id,
          current_date,
          ${amount},
          NULLIF(${paymentReference}, ''),
          NULLIF(${note}, ''),
          ${identity.userId},
          ${idempotencyKey}::uuid
        FROM order_context AS order_row
        CROSS JOIN register_context AS register
        CROSS JOIN paid
        WHERE paid.paid_total + ${amount} <= order_row.total_amount
        RETURNING id, organization_id, field_key, order_id, reference_no,
          amount, cash_account_id, payment_date
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'business_order_payment.recorded',
          'business_order_payment',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'order_id', order_id,
            'reference_no', reference_no,
            'amount', amount,
            'cash_account_id', cash_account_id,
            'payment_date', payment_date
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("business-order-payment-record", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (
      message.includes("business_order_payments_org_idempotency_key") ||
      message.includes("business_order_payments_organization_id_idempotency_key")
    ) {
      redirect(orderPath("payment-duplicate", orderId, "pos"));
    }
    if (message.includes("cannot exceed the order total")) {
      redirect(orderPath("payment-exceeds-balance", orderId, "pos"));
    }
    if (message.includes("active idr cash")) {
      redirect(orderPath("payment-register-unavailable", orderId, "pos"));
    }
    redirect(orderPath("payment-blocked", orderId, "pos"));
  }

  if (!created) redirect(orderPath("payment-order-or-register-unavailable", orderId, "pos"));
  refreshOrders();
  redirect(orderPath("payment-recorded", orderId, "pos"));
}
