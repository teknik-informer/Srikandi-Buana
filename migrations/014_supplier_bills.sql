-- v14 native ERP: supplier master, supplier bills and audited bill payments.
CREATE TABLE IF NOT EXISTS commerce_suppliers (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 supplier_code TEXT NOT NULL, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
 contact_name TEXT, email TEXT, phone TEXT, address TEXT,
 tax_identifier TEXT, payment_terms_days INTEGER NOT NULL DEFAULT 0 CHECK(payment_terms_days BETWEEN 0 AND 365),
 notes TEXT, active BOOLEAN NOT NULL DEFAULT TRUE,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created TIMESTAMPTZ NOT NULL DEFAULT now(), updated TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), UNIQUE(owner,supplier_code)
);
CREATE INDEX IF NOT EXISTS commerce_suppliers_owner_name ON commerce_suppliers(owner,name);
CREATE TABLE IF NOT EXISTS commerce_purchase_bills (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 supplier_id TEXT NOT NULL, supplier_invoice_number TEXT NOT NULL,
 bill_number TEXT NOT NULL, issue_date DATE NOT NULL, due_date DATE NOT NULL,
 description TEXT NOT NULL CHECK(length(description) BETWEEN 1 AND 500),
 expense_account_id TEXT NOT NULL, total_amount BIGINT NOT NULL CHECK(total_amount BETWEEN 1 AND 1000000000000),
 paid_total BIGINT NOT NULL DEFAULT 0 CHECK(paid_total BETWEEN 0 AND total_amount),
 status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','partially_paid','paid')),
 ledger_entry_id TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created TIMESTAMPTZ NOT NULL DEFAULT now(), updated TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), UNIQUE(owner,supplier_id,supplier_invoice_number), UNIQUE(owner,bill_number),
 FOREIGN KEY(supplier_id,owner) REFERENCES commerce_suppliers(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(expense_account_id,owner) REFERENCES ledger_accounts(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_entry_id,owner) REFERENCES ledger_entries(id,owner) ON DELETE RESTRICT,
 CHECK(due_date>=issue_date)
);
CREATE INDEX IF NOT EXISTS commerce_purchase_bills_owner_due ON commerce_purchase_bills(owner,status,due_date);
CREATE TABLE IF NOT EXISTS commerce_purchase_bill_payments (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 bill_id TEXT NOT NULL, amount BIGINT NOT NULL CHECK(amount BETWEEN 1 AND 1000000000000),
 paid_date DATE NOT NULL, cash_account_id TEXT NOT NULL, ledger_entry_id TEXT NOT NULL,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), UNIQUE(owner,ledger_entry_id),
 FOREIGN KEY(bill_id,owner) REFERENCES commerce_purchase_bills(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(cash_account_id,owner) REFERENCES ledger_accounts(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_entry_id,owner) REFERENCES ledger_entries(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS commerce_purchase_bill_payments_bill ON commerce_purchase_bill_payments(owner,bill_id,paid_date);
