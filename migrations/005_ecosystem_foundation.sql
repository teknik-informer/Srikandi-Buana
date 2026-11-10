-- v12 additive ecosystem foundation.
-- Existing route IDs and owner scoping remain compatible with v11.5.

CREATE TABLE IF NOT EXISTS ecosystem_notifications (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 recipient_id TEXT NOT NULL REFERENCES users(id),
 category TEXT NOT NULL CHECK(category IN ('operasional','pesanan','sistem')),
 title TEXT NOT NULL,
 body TEXT NOT NULL DEFAULT '',
 href TEXT NOT NULL DEFAULT '/dashboard',
 source_key TEXT,
 created TEXT NOT NULL,
 read_at TEXT,
 UNIQUE(owner,recipient_id,source_key)
);
CREATE INDEX IF NOT EXISTS ecosystem_notifications_inbox
 ON ecosystem_notifications(owner,recipient_id,created DESC);

CREATE TABLE IF NOT EXISTS commerce_products (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 sku TEXT NOT NULL,
 name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 unit TEXT NOT NULL DEFAULT 'unit',
 price BIGINT NOT NULL CHECK(price>=0 AND price<=1000000000000),
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0 AND stock<=1000000),
 published BOOLEAN NOT NULL DEFAULT FALSE,
 created TEXT NOT NULL,
 updated TEXT NOT NULL,
 UNIQUE(owner,sku),
 UNIQUE(id,owner)
);
CREATE INDEX IF NOT EXISTS commerce_products_store
 ON commerce_products(owner,published,name);
CREATE INDEX IF NOT EXISTS commerce_products_owner_updated
 ON commerce_products(owner,updated DESC);

CREATE TABLE IF NOT EXISTS commerce_orders (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 buyer_id TEXT NOT NULL REFERENCES users(id),
 product_id TEXT NOT NULL,
 product_name TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0 AND quantity<=10000),
 unit_price BIGINT NOT NULL CHECK(unit_price>=0 AND unit_price<=1000000000000),
 total BIGINT NOT NULL CHECK(total>=0 AND total=unit_price*quantity AND total<=1000000000000),
 status TEXT NOT NULL DEFAULT 'submitted'
  CHECK(status IN ('submitted','confirmed','cancelled','completed')),
 client_request_id TEXT NOT NULL,
 created TEXT NOT NULL,
 updated TEXT NOT NULL,
 FOREIGN KEY(product_id,owner) REFERENCES commerce_products(id,owner),
 UNIQUE(owner,buyer_id,client_request_id),
 UNIQUE(id,owner)
);
CREATE INDEX IF NOT EXISTS commerce_orders_owner_created
 ON commerce_orders(owner,created DESC);
CREATE INDEX IF NOT EXISTS commerce_orders_buyer_created
 ON commerce_orders(owner,buyer_id,created DESC);
CREATE INDEX IF NOT EXISTS commerce_orders_owner_status
 ON commerce_orders(owner,status,updated DESC);

CREATE TABLE IF NOT EXISTS ledger_accounts (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 code TEXT NOT NULL CHECK(code ~ '^[0-9]{3,8}$'),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
 category TEXT NOT NULL CHECK(category IN ('asset','liability','equity','revenue','expense')),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created TEXT NOT NULL,
 UNIQUE(owner,code),
 UNIQUE(id,owner)
);
CREATE INDEX IF NOT EXISTS ledger_accounts_owner_category
 ON ledger_accounts(owner,category,code);

CREATE TABLE IF NOT EXISTS ledger_entries (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 actor_id TEXT NOT NULL REFERENCES users(id),
 posted_date TEXT NOT NULL CHECK(length(posted_date)=10),
 memo TEXT NOT NULL CHECK(length(memo) BETWEEN 1 AND 500),
 reference TEXT NOT NULL CHECK(length(reference) BETWEEN 1 AND 80),
 created TEXT NOT NULL,
 UNIQUE(id,owner),
 UNIQUE(owner,reference)
);
CREATE INDEX IF NOT EXISTS ledger_entries_owner_date
 ON ledger_entries(owner,posted_date DESC,created DESC);

CREATE TABLE IF NOT EXISTS ledger_lines (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 entry_id TEXT NOT NULL,
 account_id TEXT NOT NULL,
 debit BIGINT NOT NULL DEFAULT 0 CHECK(debit>=0 AND debit<=1000000000000),
 credit BIGINT NOT NULL DEFAULT 0 CHECK(credit>=0 AND credit<=1000000000000),
 CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0)),
 FOREIGN KEY(entry_id,owner) REFERENCES ledger_entries(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(account_id,owner) REFERENCES ledger_accounts(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ledger_lines_entry
 ON ledger_lines(owner,entry_id);
CREATE INDEX IF NOT EXISTS ledger_lines_account
 ON ledger_lines(owner,account_id);
