"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

type MutationRow = { id: string; reference_no?: string };
type Identity = Awaited<ReturnType<typeof requireIdentity>>;

const MOVEMENT_TYPES = ["receipt","adjustment_in","adjustment_out","return_in"] as const;

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 180;
}

function inventoryPath(result: string): string {
  return `/app/bidang/usaha/katalog?result=${encodeURIComponent(result)}`;
}

function ensureBusinessWrite(identity: Identity): void {
  if (!can(identity, "field:usaha:business:write")) redirect("/app");
}

function fail(area: string, reason: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    reason instanceof Error ? reason.message : "Unknown error",
  );
}

function refreshInventory(): void {
  revalidatePath("/app/bidang/usaha");
  revalidatePath("/app/bidang/usaha/data");
  revalidatePath("/app/bidang/usaha/katalog");
  revalidatePath("/app/bidang/usaha/persediaan");
  revalidatePath("/app/produk");
}

export async function createBusinessProduct(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  ensureBusinessWrite(identity);

  const sku = normalize(String(formData.get("sku") ?? ""));
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = normalize(String(formData.get("product_name") ?? ""));
  const category = normalize(String(formData.get("category_label") ?? ""));
  const kind = String(formData.get("product_kind") ?? "physical").trim();
  const unit = normalize(String(formData.get("unit_label") ?? ""));
  const priceText = String(formData.get("selling_price") ?? "").trim();
  const price = Number(priceText);
  const costText = String(formData.get("cost_estimate") ?? "").trim();
  const cost = costText === "" ? null : Number(costText);
  const description = String(formData.get("description") ?? "").trim();
  const producer = normalize(String(formData.get("producer_label") ?? ""));
  const trackStock = formData.get("track_stock") === "on";

  if (
    sku.length < 2 || sku.length > 80 ||
    !validSlug(slug) ||
    name.length < 2 || name.length > 240 ||
    category.length > 120 ||
    !["physical","service"].includes(kind) ||
    unit.length < 1 || unit.length > 80 ||
    !Number.isFinite(price) || price < 0 || price > 9999999999999999 ||
    (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 9999999999999999)) ||
    description.length > 5000 ||
    producer.length > 160 ||
    (kind === "service" && trackStock)
  ) {
    redirect(inventoryPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_products (
          organization_id, field_key, sku, slug, product_name, category_label,
          product_kind, unit_label, selling_price, cost_estimate, description,
          producer_label, status, publication_status, track_stock, created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          ${sku},
          ${slug},
          ${name},
          NULLIF(${category}, ''),
          ${kind},
          ${unit},
          ${price},
          ${cost},
          NULLIF(${description}, ''),
          NULLIF(${producer}, ''),
          'draft',
          'private',
          ${trackStock},
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
        RETURNING id, organization_id, field_key, reference_no, sku, slug,
          product_name, product_kind, status, publication_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'business_product.created',
          'business_product',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'reference_no', reference_no,
            'sku', sku,
            'slug', slug,
            'product_name', product_name,
            'product_kind', product_kind,
            'status', status,
            'publication_status', publication_status
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
    fail("business-product-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("unique")) redirect(inventoryPath("duplicate-product"));
    redirect(inventoryPath("error"));
  }

  if (!created) redirect(inventoryPath("field-unavailable"));
  refreshInventory();
  redirect(inventoryPath("product-created"));
}

export async function updateBusinessProductStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  ensureBusinessWrite(identity);

  const productId = String(formData.get("product_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!validUuid(productId) || !["active","inactive","archived"].includes(status)) {
    redirect(inventoryPath("invalid"));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_products
        SET
          status = ${status},
          publication_status = CASE WHEN ${status} = 'active' THEN publication_status ELSE 'hidden' END,
          published_by = CASE WHEN ${status} = 'active' THEN published_by ELSE NULL END,
          published_at = CASE WHEN ${status} = 'active' THEN published_at ELSE NULL END,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${productId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status <> 'archived'
        RETURNING id, organization_id, field_key, reference_no, sku, product_name,
          status, publication_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_product.status.' || status,
          'business_product', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'sku', sku, 'product_name', product_name, 'status', status,
            'publication_status', publication_status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-product-status", reason);
    redirect(inventoryPath("error"));
  }

  if (!updated) redirect(inventoryPath("product-stale"));
  refreshInventory();
  redirect(inventoryPath("product-updated"));
}

export async function updateBusinessProductPublication(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  if (!can(identity, "organization:team:approve")) redirect("/app");

  const productId = String(formData.get("product_id") ?? "").trim();
  const publicationStatus = String(formData.get("publication_status") ?? "").trim();
  if (!validUuid(productId) || !["published","private","hidden"].includes(publicationStatus)) {
    redirect(inventoryPath("invalid"));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_products
        SET
          status = CASE WHEN ${publicationStatus} = 'published' THEN 'active' ELSE status END,
          publication_status = ${publicationStatus},
          published_by = CASE WHEN ${publicationStatus} = 'published' THEN ${identity.userId} ELSE NULL END,
          published_at = CASE WHEN ${publicationStatus} = 'published' THEN now() ELSE NULL END,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${productId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status <> 'archived'
        RETURNING id, organization_id, field_key, reference_no, sku, slug,
          product_name, status, publication_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_product.publication.' || publication_status,
          'business_product', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'sku', sku, 'slug', slug, 'product_name', product_name,
            'status', status, 'publication_status', publication_status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-product-publication", reason);
    redirect(inventoryPath("error"));
  }

  if (!updated) redirect(inventoryPath("product-stale"));
  refreshInventory();
  redirect(inventoryPath("product-publication-updated"));
}

export async function createBusinessWarehouse(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  ensureBusinessWrite(identity);

  const code = normalize(String(formData.get("warehouse_code") ?? ""));
  const name = normalize(String(formData.get("warehouse_name") ?? ""));
  const location = String(formData.get("location_note") ?? "").trim();
  const responsible = normalize(String(formData.get("responsible_label") ?? ""));

  if (
    code.length < 2 || code.length > 60 ||
    name.length < 2 || name.length > 180 ||
    location.length > 1000 || responsible.length > 160
  ) {
    redirect(inventoryPath("invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_warehouses (
          organization_id, field_key, warehouse_code, warehouse_name,
          location_note, responsible_label, created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          ${code},
          ${name},
          NULLIF(${location}, ''),
          NULLIF(${responsible}, ''),
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
        RETURNING id, organization_id, field_key, reference_no, warehouse_code, warehouse_name
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_warehouse.created',
          'business_warehouse', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'warehouse_code', warehouse_code, 'warehouse_name', warehouse_name)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-warehouse-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("unique")) redirect(inventoryPath("duplicate-warehouse"));
    redirect(inventoryPath("error"));
  }

  if (!created) redirect(inventoryPath("field-unavailable"));
  refreshInventory();
  redirect(inventoryPath("warehouse-created"));
}

export async function updateBusinessWarehouseStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  ensureBusinessWrite(identity);

  const warehouseId = String(formData.get("warehouse_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!validUuid(warehouseId) || !["active","inactive","archived"].includes(status)) {
    redirect(inventoryPath("invalid"));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_warehouses AS warehouse
        SET status = ${status}, updated_by = ${identity.userId}, updated_at = now()
        WHERE warehouse.id = ${warehouseId}
          AND warehouse.organization_id = ${identity.organizationId}
          AND warehouse.field_key = 'usaha'
          AND warehouse.status <> 'archived'
          AND (
            ${status} <> 'archived'
            OR NOT EXISTS (
              SELECT 1
              FROM v9.business_product_stock AS stock
              WHERE stock.warehouse_id = warehouse.id
                AND stock.organization_id = warehouse.organization_id
                AND (stock.on_hand > 0 OR stock.reserved > 0)
            )
          )
        RETURNING warehouse.id, warehouse.organization_id, warehouse.field_key,
          warehouse.reference_no, warehouse.warehouse_code, warehouse.warehouse_name, warehouse.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_warehouse.status.' || status,
          'business_warehouse', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'warehouse_code', warehouse_code, 'warehouse_name', warehouse_name, 'status', status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-warehouse-status", reason);
    redirect(inventoryPath("error"));
  }

  if (!updated) redirect(inventoryPath("warehouse-stale-or-stock-remains"));
  refreshInventory();
  redirect(inventoryPath("warehouse-updated"));
}

export async function recordBusinessStockMovement(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  ensureBusinessWrite(identity);

  const productId = String(formData.get("product_id") ?? "").trim();
  const warehouseId = String(formData.get("warehouse_id") ?? "").trim();
  const movementType = String(formData.get("movement_type") ?? "").trim();
  const quantityText = String(formData.get("quantity") ?? "").trim();
  const quantity = Number(quantityText);
  const sourceReference = normalize(String(formData.get("source_reference") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (
    !validUuid(productId) || !validUuid(warehouseId) ||
    !MOVEMENT_TYPES.includes(movementType as (typeof MOVEMENT_TYPES)[number]) ||
    !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000000 ||
    sourceReference.length > 120 || note.length > 3000
  ) {
    redirect(inventoryPath("invalid"));
  }

  let recorded = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        SELECT
          product.id AS product_id,
          warehouse.id AS warehouse_id,
          product.organization_id,
          product.field_key,
          COALESCE(stock.on_hand, 0)::numeric(14,3) AS on_hand_before,
          COALESCE(stock.reserved, 0)::numeric(14,3) AS reserved_before
        FROM v9.business_products AS product
        INNER JOIN v9.business_warehouses AS warehouse
          ON warehouse.organization_id = product.organization_id
          AND warehouse.field_key = product.field_key
        LEFT JOIN v9.business_product_stock AS stock
          ON stock.product_id = product.id
          AND stock.warehouse_id = warehouse.id
        WHERE product.id = ${productId}
          AND warehouse.id = ${warehouseId}
          AND product.organization_id = ${identity.organizationId}
          AND product.field_key = 'usaha'
          AND product.status = 'active'
          AND product.product_kind = 'physical'
          AND product.track_stock = true
          AND warehouse.status = 'active'
        FOR UPDATE OF product, warehouse
      ),
      changed AS (
        INSERT INTO v9.business_product_stock (
          product_id, warehouse_id, organization_id, field_key,
          on_hand, reserved, updated_by, updated_at
        )
        SELECT
          target.product_id,
          target.warehouse_id,
          target.organization_id,
          target.field_key,
          target.on_hand_before + CASE WHEN ${movementType} = 'adjustment_out' THEN -${quantity} ELSE ${quantity} END,
          target.reserved_before,
          ${identity.userId},
          now()
        FROM target
        WHERE ${movementType} <> 'adjustment_out'
          OR target.on_hand_before - target.reserved_before >= ${quantity}
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET
          on_hand = EXCLUDED.on_hand,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        WHERE EXCLUDED.on_hand >= v9.business_product_stock.reserved
        RETURNING product_id, warehouse_id, organization_id, field_key, on_hand
      ),
      inserted AS (
        INSERT INTO v9.business_inventory_movements (
          organization_id, field_key, product_id, warehouse_id, movement_type,
          quantity, on_hand_before, on_hand_delta, on_hand_after,
          source_reference, note, recorded_by
        )
        SELECT
          target.organization_id,
          target.field_key,
          target.product_id,
          target.warehouse_id,
          ${movementType},
          ${quantity},
          target.on_hand_before,
          CASE WHEN ${movementType} = 'adjustment_out' THEN -${quantity} ELSE ${quantity} END,
          changed.on_hand,
          NULLIF(${sourceReference}, ''),
          NULLIF(${note}, ''),
          ${identity.userId}
        FROM target
        INNER JOIN changed
          ON changed.product_id = target.product_id
          AND changed.warehouse_id = target.warehouse_id
        RETURNING id, organization_id, field_key, reference_no, product_id,
          warehouse_id, movement_type, quantity, on_hand_before, on_hand_delta, on_hand_after
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'business_inventory.' || movement_type,
          'business_inventory_movement',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'reference_no', reference_no,
            'product_id', product_id,
            'warehouse_id', warehouse_id,
            'movement_type', movement_type,
            'quantity', quantity,
            'on_hand_before', on_hand_before,
            'on_hand_after', on_hand_after
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    recorded = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-stock-movement", reason);
    redirect(inventoryPath("error"));
  }

  if (!recorded) redirect(inventoryPath("product-warehouse-unavailable-or-insufficient-stock"));
  refreshInventory();
  redirect(inventoryPath("stock-movement-recorded"));
}
