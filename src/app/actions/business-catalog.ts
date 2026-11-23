"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

type MutationRow = { id: string; reference_no?: string };

const PRODUCT_KINDS = ["physical","service"] as const;
const PRODUCT_STATUSES = ["active","inactive","archived"] as const;
const PUBLICATION_STATUSES = ["private","published","hidden"] as const;
const MOVEMENT_TYPES = ["receipt","adjustment_in","adjustment_out","return_in"] as const;

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function slugify(value: string): string {
  return normalize(value).toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function catalogPath(result: string, mode: "katalog" | "persediaan" = "katalog"): string {
  return `/app/bidang/usaha/${mode}?result=${encodeURIComponent(result)}`;
}

function requireBusinessWrite(identity: Awaited<ReturnType<typeof requireIdentity>>): void {
  if (!can(identity, "field:usaha:business:write")) redirect("/app");
}

function fail(area: string, reason: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    reason instanceof Error ? reason.message : "Unknown error",
  );
}

function refreshCatalog(): void {
  revalidatePath("/app/bidang/usaha");
  revalidatePath("/app/bidang/usaha/data");
  revalidatePath("/app/bidang/usaha/katalog");
  revalidatePath("/app/bidang/usaha/persediaan");
  revalidatePath("/produk");
}

export async function createBusinessProduct(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const sku = normalize(String(formData.get("sku") ?? "")).toUpperCase();
  const name = normalize(String(formData.get("product_name") ?? ""));
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const category = normalize(String(formData.get("category_label") ?? ""));
  const kind = String(formData.get("product_kind") ?? "physical").trim();
  const unit = normalize(String(formData.get("unit_label") ?? ""));
  const sellingText = String(formData.get("selling_price") ?? "").trim();
  const sellingPrice = Number(sellingText);
  const costText = String(formData.get("cost_estimate") ?? "").trim();
  const costEstimate = costText === "" ? null : Number(costText);
  const producer = normalize(String(formData.get("producer_label") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const trackStock = formData.get("track_stock") === "on";

  if (
    sku.length < 2 || sku.length > 80 ||
    name.length < 2 || name.length > 240 ||
    slug.length < 2 || slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    category.length > 120 ||
    !PRODUCT_KINDS.includes(kind as (typeof PRODUCT_KINDS)[number]) ||
    unit.length < 1 || unit.length > 80 ||
    !Number.isFinite(sellingPrice) || sellingPrice < 0 || sellingPrice > 1_000_000_000_000_000 ||
    (costEstimate !== null && (!Number.isFinite(costEstimate) || costEstimate < 0 || costEstimate > 1_000_000_000_000_000)) ||
    producer.length > 160 || description.length > 5000 ||
    (kind === "service" && trackStock)
  ) {
    redirect(catalogPath("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_products (
          organization_id, field_key, sku, slug, product_name, category_label,
          product_kind, unit_label, selling_price, cost_estimate, description,
          producer_label, status, publication_status, track_stock,
          created_by, updated_by
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
          ${sellingPrice},
          ${costEstimate},
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
        RETURNING id, organization_id, field_key, reference_no, sku, product_name, status, publication_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_product.created',
          'business_product', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'sku', sku, 'product_name', product_name, 'status', status,
            'publication_status', publication_status)
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
    if (message.includes("business_products_organization_id_sku_key")) redirect(catalogPath("duplicate-sku"));
    if (message.includes("business_products_organization_id_slug_key")) redirect(catalogPath("duplicate-slug"));
    redirect(catalogPath("error"));
  }

  if (!created) redirect(catalogPath("field-unavailable"));
  refreshCatalog();
  redirect(catalogPath("product-created"));
}

export async function updateBusinessProduct(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const productId = String(formData.get("product_id") ?? "").trim();
  const category = normalize(String(formData.get("category_label") ?? ""));
  const unit = normalize(String(formData.get("unit_label") ?? ""));
  const sellingText = String(formData.get("selling_price") ?? "").trim();
  const sellingPrice = Number(sellingText);
  const costText = String(formData.get("cost_estimate") ?? "").trim();
  const costEstimate = costText === "" ? null : Number(costText);
  const producer = normalize(String(formData.get("producer_label") ?? ""));
  const description = String(formData.get("description") ?? "").trim();

  if (
    !validUuid(productId) || category.length > 120 ||
    unit.length < 1 || unit.length > 80 ||
    !Number.isFinite(sellingPrice) || sellingPrice < 0 || sellingPrice > 1_000_000_000_000_000 ||
    (costEstimate !== null && (!Number.isFinite(costEstimate) || costEstimate < 0 || costEstimate > 1_000_000_000_000_000)) ||
    producer.length > 160 || description.length > 5000
  ) {
    redirect(catalogPath("invalid"));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_products
        SET
          category_label = NULLIF(${category}, ''),
          unit_label = ${unit},
          selling_price = ${sellingPrice},
          cost_estimate = ${costEstimate},
          producer_label = NULLIF(${producer}, ''),
          description = NULLIF(${description}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${productId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status <> 'archived'
        RETURNING id, organization_id, field_key, reference_no, sku, product_name,
          category_label, selling_price, cost_estimate, status, publication_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_product.updated',
          'business_product', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'sku', sku, 'product_name', product_name, 'category_label', category_label,
            'selling_price', selling_price, 'cost_estimate', cost_estimate,
            'status', status, 'publication_status', publication_status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-product-update", reason);
    redirect(catalogPath("error"));
  }

  if (!updated) redirect(catalogPath("product-stale"));
  refreshCatalog();
  redirect(catalogPath("product-updated"));
}

export async function updateBusinessProductStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const productId = String(formData.get("product_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!validUuid(productId) || !PRODUCT_STATUSES.includes(status as (typeof PRODUCT_STATUSES)[number])) {
    redirect(catalogPath("invalid"));
  }
  if (status === "archived" && !can(identity, "organization:team:approve")) redirect("/app");

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        UPDATE v9.business_products AS product
        SET
          status = ${status},
          publication_status = CASE WHEN ${status} = 'active' THEN product.publication_status ELSE 'private' END,
          published_by = CASE WHEN ${status} = 'active' THEN product.published_by ELSE NULL END,
          published_at = CASE WHEN ${status} = 'active' THEN product.published_at ELSE NULL END,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE product.id = ${productId}
          AND product.organization_id = ${identity.organizationId}
          AND product.field_key = 'usaha'
          AND product.status <> 'archived'
          AND (
            ${status} <> 'archived'
            OR NOT EXISTS (
              SELECT 1
              FROM v9.business_product_stock AS stock
              WHERE stock.product_id = product.id
                AND stock.organization_id = product.organization_id
                AND (stock.on_hand > 0 OR stock.reserved > 0)
            )
          )
        RETURNING product.id, product.organization_id, product.field_key,
          product.reference_no, product.sku, product.product_name,
          product.status, product.publication_status
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
        FROM target
        RETURNING id
      )
      SELECT target.id::text AS id FROM target INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-product-status", reason);
    redirect(catalogPath("error"));
  }

  if (!updated) redirect(catalogPath("product-stock-or-status-blocked"));
  refreshCatalog();
  redirect(catalogPath("product-status-updated"));
}

export async function updateBusinessProductPublication(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const productId = String(formData.get("product_id") ?? "").trim();
  const publicationStatus = String(formData.get("publication_status") ?? "").trim();
  if (
    !validUuid(productId) ||
    !PUBLICATION_STATUSES.includes(publicationStatus as (typeof PUBLICATION_STATUSES)[number])
  ) {
    redirect(catalogPath("invalid"));
  }
  if (publicationStatus === "published" && !can(identity, "organization:team:approve")) {
    redirect("/app");
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.business_products
        SET
          publication_status = ${publicationStatus},
          published_by = CASE WHEN ${publicationStatus} = 'published' THEN ${identity.userId} ELSE NULL END,
          published_at = CASE WHEN ${publicationStatus} = 'published' THEN now() ELSE NULL END,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${productId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status = 'active'
          AND (
            ${publicationStatus} <> 'published'
            OR selling_price > 0
          )
        RETURNING id, organization_id, field_key, reference_no, sku,
          product_name, status, publication_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_product.publication.' || publication_status,
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
    fail("business-product-publication", reason);
    redirect(catalogPath("error"));
  }

  if (!updated) redirect(catalogPath("product-not-ready"));
  refreshCatalog();
  redirect(catalogPath("product-publication-updated"));
}

export async function createBusinessWarehouse(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const code = normalize(String(formData.get("warehouse_code") ?? "")).toUpperCase();
  const name = normalize(String(formData.get("warehouse_name") ?? ""));
  const location = String(formData.get("location_note") ?? "").trim();
  const responsible = normalize(String(formData.get("responsible_label") ?? ""));

  if (
    code.length < 2 || code.length > 60 ||
    name.length < 2 || name.length > 180 ||
    location.length > 1000 || responsible.length > 160
  ) {
    redirect(catalogPath("invalid", "persediaan"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.business_warehouses (
          organization_id, field_key, warehouse_code, warehouse_name,
          location_note, responsible_label, status, created_by, updated_by
        )
        SELECT application.organization_id, application.field_key,
          ${code}, ${name}, NULLIF(${location}, ''), NULLIF(${responsible}, ''),
          'active', ${identity.userId}, ${identity.userId}
        FROM v9.field_applications application
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'usaha'
          AND application.is_enabled = true
        RETURNING id, organization_id, field_key, reference_no,
          warehouse_code, warehouse_name, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'business_warehouse.created',
          'business_warehouse', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'warehouse_code', warehouse_code, 'warehouse_name', warehouse_name, 'status', status)
        FROM inserted RETURNING id
      )
      SELECT inserted.id::text AS id FROM inserted INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    fail("business-warehouse-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("business_warehouses_organization_id_warehouse_code_key")) {
      redirect(catalogPath("duplicate-warehouse-code", "persediaan"));
    }
    redirect(catalogPath("error", "persediaan"));
  }

  if (!created) redirect(catalogPath("field-unavailable", "persediaan"));
  refreshCatalog();
  redirect(catalogPath("warehouse-created", "persediaan"));
}

export async function updateBusinessWarehouseStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

  const warehouseId = String(formData.get("warehouse_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!validUuid(warehouseId) || !["active","inactive","archived"].includes(status)) {
    redirect(catalogPath("invalid", "persediaan"));
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
              SELECT 1 FROM v9.business_product_stock stock
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
        FROM changed RETURNING id
      )
      SELECT changed.id::text AS id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-warehouse-status", reason);
    redirect(catalogPath("error", "persediaan"));
  }

  if (!updated) redirect(catalogPath("warehouse-stock-or-status-blocked", "persediaan"));
  refreshCatalog();
  redirect(catalogPath("warehouse-updated", "persediaan"));
}

export async function recordBusinessInventoryMovement(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:usaha:read");
  requireBusinessWrite(identity);

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
    !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000_000 ||
    Math.round(quantity * 1000) !== quantity * 1000 ||
    sourceReference.length > 120 || note.length > 3000
  ) {
    redirect(catalogPath("invalid", "persediaan"));
  }

  let recorded = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH locked AS MATERIALIZED (
        SELECT
          product.id AS product_id,
          warehouse.id AS warehouse_id,
          product.organization_id,
          product.field_key
        FROM v9.business_products AS product
        INNER JOIN v9.business_warehouses AS warehouse
          ON warehouse.organization_id = product.organization_id
          AND warehouse.field_key = product.field_key
        WHERE product.id = ${productId}
          AND warehouse.id = ${warehouseId}
          AND product.organization_id = ${identity.organizationId}
          AND warehouse.organization_id = ${identity.organizationId}
          AND product.field_key = 'usaha'
          AND product.status = 'active'
          AND product.product_kind = 'physical'
          AND product.track_stock = true
          AND warehouse.status = 'active'
        FOR UPDATE OF product, warehouse
      ),
      current_balance AS MATERIALIZED (
        SELECT
          locked.product_id,
          locked.warehouse_id,
          locked.organization_id,
          locked.field_key,
          COALESCE(stock.on_hand, 0)::numeric(14,3) AS on_hand_before,
          COALESCE(stock.reserved, 0)::numeric(14,3) AS reserved
        FROM locked
        LEFT JOIN v9.business_product_stock AS stock
          ON stock.product_id = locked.product_id
          AND stock.warehouse_id = locked.warehouse_id
          AND stock.organization_id = locked.organization_id
          AND stock.field_key = locked.field_key
      ),
      calculated AS (
        SELECT
          current_balance.*,
          CASE WHEN ${movementType} = 'adjustment_out' THEN -${quantity}::numeric ELSE ${quantity}::numeric END AS on_hand_delta,
          current_balance.on_hand_before +
            CASE WHEN ${movementType} = 'adjustment_out' THEN -${quantity}::numeric ELSE ${quantity}::numeric END AS on_hand_after
        FROM current_balance
      ),
      stock_updated AS (
        INSERT INTO v9.business_product_stock (
          product_id, warehouse_id, organization_id, field_key,
          on_hand, reserved, updated_by, updated_at
        )
        SELECT
          calculated.product_id,
          calculated.warehouse_id,
          calculated.organization_id,
          calculated.field_key,
          calculated.on_hand_after,
          calculated.reserved,
          ${identity.userId},
          now()
        FROM calculated
        WHERE calculated.on_hand_after >= calculated.reserved
          AND calculated.on_hand_after >= 0
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET
          on_hand = EXCLUDED.on_hand,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        WHERE EXCLUDED.on_hand >= v9.business_product_stock.reserved
        RETURNING product_id, warehouse_id, organization_id, field_key, on_hand, reserved
      ),
      movement AS (
        INSERT INTO v9.business_inventory_movements (
          organization_id, field_key, product_id, warehouse_id, movement_type,
          quantity, on_hand_before, on_hand_delta, on_hand_after,
          source_reference, note, recorded_by
        )
        SELECT
          calculated.organization_id,
          calculated.field_key,
          calculated.product_id,
          calculated.warehouse_id,
          ${movementType},
          ${quantity},
          calculated.on_hand_before,
          calculated.on_hand_delta,
          calculated.on_hand_after,
          NULLIF(${sourceReference}, ''),
          NULLIF(${note}, ''),
          ${identity.userId}
        FROM calculated
        INNER JOIN stock_updated
          ON stock_updated.product_id = calculated.product_id
          AND stock_updated.warehouse_id = calculated.warehouse_id
          AND stock_updated.organization_id = calculated.organization_id
          AND stock_updated.field_key = calculated.field_key
        RETURNING id, organization_id, field_key, reference_no,
          product_id, warehouse_id, movement_type, quantity, on_hand_after
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'business_inventory_movement.' || movement_type,
          'business_inventory_movement',
          id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no,
            'product_id', product_id, 'warehouse_id', warehouse_id,
            'movement_type', movement_type, 'quantity', quantity, 'on_hand_after', on_hand_after)
        FROM movement
        RETURNING id
      )
      SELECT movement.id::text AS id
      FROM movement
      INNER JOIN audit ON true
    `;
    recorded = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("business-inventory-movement", reason);
    redirect(catalogPath("error", "persediaan"));
  }

  if (!recorded) redirect(catalogPath("stock-insufficient-or-unavailable", "persediaan"));
  refreshCatalog();
  redirect(catalogPath("stock-movement-recorded", "persediaan"));
}
