-- Add request idempotency to prevent duplicate cashier receipts on form resubmission.
ALTER TABLE v9.business_order_payments
  ADD COLUMN IF NOT EXISTS idempotency_key uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS business_order_payments_org_idempotency_key
  ON v9.business_order_payments (organization_id, idempotency_key);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0032_business_order_payment_idempotency.sql', 'sha256:v9-business-order-payment-idempotency-20261125')
ON CONFLICT (name) DO NOTHING;
