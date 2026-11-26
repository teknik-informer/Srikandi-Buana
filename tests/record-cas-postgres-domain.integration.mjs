import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import { build } from "esbuild";

const databaseUrl = process.env.PG_INTEGRATION_URL;
assert(databaseUrl, "PG_INTEGRATION_URL is required. This test must never use an application or Production database URL.");

function runPsql(sql) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", databaseUrl], {
      env: { ...process.env, PGSSLMODE: process.env.PGSSLMODE || "disable" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error("psql exited with code " + code + ": " + stderr.trim()));
    });
    child.stdin.end(sql);
  });
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    assert(Number.isFinite(value), "SQL numeric parameters must be finite.");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function bindSql(template, values) {
  let output = "";
  let index = 0;
  let singleQuoted = false;
  let doubleQuoted = false;

  for (let i = 0; i < template.length; i += 1) {
    const char = template[i];
    const next = template[i + 1];

    if (char === "'" && !doubleQuoted) {
      output += char;
      if (singleQuoted && next === "'") {
        output += next;
        i += 1;
      } else {
        singleQuoted = !singleQuoted;
      }
      continue;
    }
    if (char === '"' && !singleQuoted) {
      output += char;
      if (doubleQuoted && next === '"') {
        output += next;
        i += 1;
      } else {
        doubleQuoted = !doubleQuoted;
      }
      continue;
    }
    if (char === "?" && !singleQuoted && !doubleQuoted) {
      assert(index < values.length, "A SQL bind value is missing.");
      output += sqlLiteral(values[index]);
      index += 1;
      continue;
    }
    output += char;
  }

  assert.equal(index, values.length, "Every SQL bind value must be consumed.");
  return output;
}

function parseRows(output) {
  const line = output.split(/\r?\n/).filter(Boolean).at(-1) || "[]";
  return JSON.parse(line);
}

class PostgresPrepared {
  constructor(database, text, values = []) {
    this.database = database;
    this.text = text;
    this.values = values;
  }
  bind(...values) {
    return new PostgresPrepared(this.database, this.text, values);
  }
  async all() {
    return this.database.execute(this);
  }
  async first() {
    return (await this.all()).results[0] || null;
  }
  async run() {
    const result = await this.database.batch([this]);
    return { meta: { changes: result[0]?.rowCount || 0 } };
  }
}

class PostgresDatabase {
  constructor() {
    this.raceGate = null;
  }
  prepare(text) {
    return new PostgresPrepared(this, text);
  }
  async waitAtConcurrentGate() {
    const gate = this.raceGate;
    if (!gate) return;
    gate.arrivals += 1;
    if (gate.arrivals === gate.expectedArrivals) {
      this.raceGate = null;
      gate.release();
    }
    await gate.promise;
  }
  async execute(statement) {
    const sql = bindSql(statement.text, statement.values);
    if (sql.trimStart().startsWith("WITH order_guard AS MATERIALIZED (")) {
      if (this.raceGate) await this.waitAtConcurrentGate();
      const output = await runPsql(
        "BEGIN ISOLATION LEVEL SERIALIZABLE;\nSELECT pg_sleep(0.25);\n" + sql + ";\\nCOMMIT;"
      );
      return { results: output.split(/\\r?\\n/).filter(Boolean).map(invoice_json => ({ invoice_json })) };
    }
    if (sql.trimStart().startsWith("WITH event_guard AS MATERIALIZED (") || sql.trimStart().startsWith("WITH changed AS (")) {
      if (this.raceGate) await this.waitAtConcurrentGate();
      const output = await runPsql(
        "BEGIN ISOLATION LEVEL READ COMMITTED;\nSELECT pg_sleep(0.25);\n" + sql + ";\nCOMMIT;"
      );
      const rows = output.split(/\r?\n/).filter(Boolean).map(target_id => ({ target_id }));
      return { results: rows };
    }
    const output = await runPsql(
      "SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)::text FROM (" + sql + ") AS q;"
    );
    return { results: parseRows(output) };
  }
  armConcurrentGate(expectedArrivals = 2) {
    let release;
    this.raceGate = {
      arrivals: 0,
      expectedArrivals,
      promise: new Promise(resolvePromise => { release = resolvePromise; }),
      release: () => release(),
    };
  }
  async batch(statements) {
    const isCas = statements[0]?.text.trimStart().startsWith("WITH event_guard AS MATERIALIZED (") || statements[0]?.text.trimStart().startsWith("WITH changed AS (");
    const isReceiptBatch = statements.some(statement => statement.text.includes("INSERT INTO commerce_sales_invoice_receipts"));
    if ((isCas || isReceiptBatch) && this.raceGate) await this.waitAtConcurrentGate();

    let script = "BEGIN ISOLATION LEVEL SERIALIZABLE;\n";
    if (isCas) {
      // Both real PostgreSQL sessions take their SERIALIZABLE snapshot before
      // reaching the same-version UPDATE predicate.
      script += "SELECT pg_sleep(0.25);\n";
      const first = bindSql(statements[0].text, statements[0].values);
      // PostgreSQL requires data-modifying CTEs to be the top-level statement.
      // Its single scalar RETURNING row is the only row-producing statement in this batch.
      script += first + ";\n";
    } else if (statements.length) {
      script += bindSql(statements[0].text, statements[0].values) + ";\n";
    }
    for (let i = 1; i < statements.length; i += 1) {
      script += bindSql(statements[i].text, statements[i].values) + ";\n";
    }
    script += "COMMIT;";

    const output = await runPsql(script);
    const scalar = output.split(/\r?\n/).filter(Boolean).at(-1) || "";
    const rows = isCas && scalar ? [{ updated: scalar }] : [];
    return statements.map((_, index) => ({
      rows: index === 0 ? rows : [],
      rowCount: index === 0 ? rows.length : 0,
    }));
  }
}

const database = new PostgresDatabase();
const require = createRequire(import.meta.url);

async function loadBundle(entryPoint, options = {}) {
  const plugins = [];
  if (options.stubRepository) {
    plugins.push({
      name: "postgres-test-repository",
      setup(builder) {
        builder.onLoad({ filter: /enterprise\/repository\.ts$/ }, () => ({
          loader: "ts",
          contents: [
            "export class OperationError extends Error { constructor(message: string, status = 400) { super(message); this.status = status; } }",
            "export function operationDB() { return globalThis.__testDB; }",
          ].join("\n"),
        }));
      },
    });
  }
  const buildOptions = {
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    plugins,
  };
  if (options.mappingAlias) {
    buildOptions.alias = {
      "@/features/workspace-v14/legacy-mapping.mjs": resolve("src/features/workspace-v14/legacy-mapping.mjs"),
    };
  }
  const result = await build(buildOptions);
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, {
    module,
    exports: module.exports,
    require,
    crypto: { randomUUID },
    Buffer,
    TextEncoder,
    TextDecoder,
    URL,
    console,
    Date,
    JSON,
    Math,
    __testDB: database,
  });
  return module.exports;
}

async function runSchemaMigrations() {
  await runPsql([
    "DO $$ BEGIN",
    "IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='neondb_owner') THEN CREATE ROLE neondb_owner; END IF;",
    "IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;",
    "END $$;",
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
  ].join("\n"));

  const migrations = readdirSync("migrations").filter(name => name.endsWith(".sql")).sort();
  assert(migrations.length >= 20, "The integration fixture must load the complete application migration set.");
  for (const name of migrations) {
    await runPsql(readFileSync("migrations/" + name, "utf8"));
  }
  const required = await database.prepare(
    "SELECT to_regclass('public.records') AS records, to_regclass('public.audit') AS audit, " +
    "to_regclass('public.ledger_entries') AS ledger, to_regclass('workspace_v14.organizations') AS organizations, " +
    "to_regclass('workspace_v14.member_asset_movement_events') AS asset_history"
  ).first();
  for (const [key, value] of Object.entries(required || {})) {
    assert(value, "Application migration set did not create required relation: " + key);
  }
  console.log("PASS application schema migrations: " + migrations.length + " SQL files applied to an ephemeral PostgreSQL 16 database.");
}

async function query(sql) {
  return parseRows(await runPsql(
    "SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)::text FROM (" + sql + ") AS q;"
  ));
}

async function seedUserAndOrganization(owner, organizationId, now) {
  await runPsql(
    "INSERT INTO public.users(id,email,password_hash,full_name,enabled,created,role) VALUES(" +
    [owner, owner + "@example.invalid", "synthetic-password-hash", "Synthetic CAS QA User", true, now, "admin"].map(sqlLiteral).join(",") +
    ");"
  );
  await runPsql(
    "INSERT INTO workspace_v14.organizations(id,source_owner_user_id,display_name,organization_type,verification_status) VALUES(" +
    [organizationId, owner, "Synthetic CAS QA Organization", "community_group", "verified"].map(sqlLiteral).join(",") +
    ");"
  );
}

function resultOf(promise, label) {
  return promise.then(
    updated => ({ label, success: true, updated }),
    error => ({ label, success: false, status: Number(error?.status || 0), message: String(error?.message || error) }),
  );
}

async function raceTwoUpdates(update, label) {
  database.armConcurrentGate(2);
  const outcomes = await Promise.all([
    resultOf(update("Writer A"), "Writer A"),
    resultOf(update("Writer B"), "Writer B"),
  ]);
  assert.equal(outcomes.filter(item => item.success).length, 1, label + ": exactly one PostgreSQL transaction must commit. " + JSON.stringify(outcomes));
  assert.equal(outcomes.filter(item => !item.success && item.status === 409).length, 1, label + ": the losing writer must be reported as HTTP-equivalent 409. " + JSON.stringify(outcomes));
  return outcomes;
}

const protectedRecords = await loadBundle("src/lib/enterprise/protected-records.ts", { stubRepository: true });
const v14 = await loadBundle("src/lib/workspace-v14-sync.ts", { mappingAlias: true });
const finance = await loadBundle("src/features/finance/record-posting.ts");
const agricultureMutations = await loadBundle("src/lib/agriculture/record-mutations.ts");
const attendanceMutations = await loadBundle("src/lib/attendance/record-mutations.ts");
const salesInvoices = await loadBundle("src/features/commerce/sales-invoices.ts");

await runSchemaMigrations();

const owner = "cas-qa-" + randomUUID();
const organizationId = randomUUID();
const now = "2026-11-26T00:00:00.000Z";
await seedUserAndOrganization(owner, organizationId, now);

// Build an actual normalized member profile using the production v14 mapper.
const memberSources = new Map();
for (const writer of ["Writer A", "Writer B"]) {
  const memberSourceId = randomUUID();
  const memberData = {
    name: "Anggota sintetis CAS QA " + writer,
    status: "Aktif",
    verification: "Terverifikasi",
    dataConsent: "Setuju",
    photoConsent: "Tidak setuju",
    dusun: "Dusun Uji",
  };
  await runPsql(
    "INSERT INTO public.records(id,owner,kind,data,created,updated) VALUES(" +
    [memberSourceId, owner, "anggota", JSON.stringify(memberData), now, now].map(sqlLiteral).join(",") +
    ");"
  );
  const memberWrites = await v14.buildV14RecordSyncStatements(database, {
    owner,
    actorId: owner,
    id: memberSourceId,
    kind: "anggota",
    data: memberData,
    now,
  });
  assert(memberWrites.length > 0, "The production v14 mapper must create a normalized member profile.");
  await database.batch(memberWrites);

  const memberProfileId = "v14:member_profiles:" + memberSourceId;
  const memberCheck = await query(
    "SELECT id FROM workspace_v14.member_profiles WHERE id=" + sqlLiteral(memberProfileId) +
    " AND organization_id=" + sqlLiteral(organizationId)
  );
  assert.equal(memberCheck.length, 1, "The real normalized V14 member profile must exist before the asset hand-out test.");
  memberSources.set(writer, { id: memberSourceId, name: memberData.name, profileId: memberProfileId });
}

// Prepare the real system chart of accounts and use its actual revenue account.
const accounts = await finance.ensureDefaultLedgerAccounts(database, owner, now);
const revenueAccount = accounts.find(account => String(account.code) === "410001");
assert(revenueAccount?.id, "The real ledger initializer must create the default revenue account.");

const cashId = randomUUID();
const cashData = {
  name: "Synthetic concurrent cash transaction",
  date: "2026-11-26",
  type: "Pemasukan",
  amount: 125000,
  fund: "Organisasi",
  counterAccountId: String(revenueAccount.id),
  notes: "Initial CAS fixture",
};
await runPsql(
  "INSERT INTO public.records(id,owner,kind,data,created,updated) VALUES(" +
  [cashId, owner, "kas", JSON.stringify(cashData), now, now].map(sqlLiteral).join(",") +
  ");"
);

const cashOutcome = await raceTwoUpdates(async writer => {
  const nextData = {
    ...cashData,
    name: cashData.name + " · " + writer,
    notes: writer + " won the source update",
  };
  const ledgerWrites = await finance.buildCashLedgerPostingStatements(database, {
    owner,
    actorId: owner,
    sourceId: cashId,
    data: nextData,
    now,
  });
  return protectedRecords.updateProtectedRecord(
    owner, cashId, "kas", nextData, now,
    "kas: " + cashData.name, ledgerWrites,
  );
}, "Cash source, audit and double-entry journal");

const cashState = await query(
  "SELECT data,updated FROM public.records WHERE id=" + sqlLiteral(cashId) + " AND owner=" + sqlLiteral(owner)
);
assert.equal(cashState.length, 1);
const cashWinnerData = JSON.parse(cashState[0].data);
assert(/Writer [AB] won the source update/.test(cashWinnerData.notes), "The winning cash source payload must be committed.");
const cashJournal = await query(
  "SELECT id,memo FROM public.ledger_entries WHERE owner=" + sqlLiteral(owner) + " AND reference=" + sqlLiteral("KAS-" + cashId)
);
assert.equal(cashJournal.length, 1, "Exactly one journal must be posted for the winning cash update.");
assert(cashJournal[0].memo.includes(cashWinnerData.name), "The posted journal memo must belong to the winning writer, not the losing request.");
const cashLines = await query(
  "SELECT id,debit,credit FROM public.ledger_lines WHERE owner=" + sqlLiteral(owner) +
  " AND entry_id=" + sqlLiteral(cashJournal[0].id)
);
assert.equal(cashLines.length, 2, "The winning cash update must post exactly two journal lines.");
assert.equal(cashLines.reduce((sum, line) => sum + Number(line.debit), 0), 125000);
assert.equal(cashLines.reduce((sum, line) => sum + Number(line.credit), 0), 125000);
const cashSourceAudit = await query(
  "SELECT id FROM public.audit WHERE owner=" + sqlLiteral(owner) +
  " AND action='Diperbarui' AND title=" + sqlLiteral("kas: " + cashData.name)
);
assert.equal(cashSourceAudit.length, 1, "Only the winning cash source audit may commit.");
const cashPostingAudit = await query(
  "SELECT id,title FROM public.audit WHERE owner=" + sqlLiteral(owner) +
  " AND action='Buku Kas diposting ke Buku Besar' AND title LIKE " + sqlLiteral("KAS-" + cashId + "%")
);
assert.equal(cashPostingAudit.length, 1, "Only the winning ledger-posting audit may commit.");
assert(cashPostingAudit[0].title.includes(cashWinnerData.name), "The posting audit must identify the winning payload only.");
console.log("PASS real PostgreSQL cash handler primitive: one winner, one 409, one source audit, one posting audit, one balanced two-line journal.");

const assetId = randomUUID();
const initialAsset = {
  name: "Synthetic group asset",
  assetCode: "CAS-" + assetId.slice(0, 8),
  assetOwnership: "Milik kelompok",
  quantity: "1",
  condition: "Baik",
  location: "Ruang uji",
  custodyStatus: "Tidak dipinjamkan",
  custodianMemberId: "",
  custodianMemberName: "",
  issuedAt: "",
  expectedReturnAt: "",
  returnedAt: "",
  notes: "Initial synthetic asset state",
};
await runPsql(
  "INSERT INTO public.records(id,owner,kind,data,created,updated) VALUES(" +
  [assetId, owner, "aset", JSON.stringify(initialAsset), now, now].map(sqlLiteral).join(",") +
  ");"
);

const assetOutcome = await raceTwoUpdates(async writer => {
  const nextData = {
    ...initialAsset,
    custodyStatus: "Dipinjam",
    custodianMemberId: memberSources.get(writer).id,
    custodianMemberName: memberSources.get(writer).name,
    issuedAt: "2026-11-26",
    expectedReturnAt: "2026-12-03",
    notes: writer + " issued the asset",
  };
  const normalizedWrites = await v14.buildV14RecordSyncStatements(database, {
    owner,
    actorId: owner,
    id: assetId,
    kind: "aset",
    data: nextData,
    now,
    previousData: initialAsset,
  });
  assert(normalizedWrites.length >= 3, "The production V14 mapper must emit inventory, assignment, and asset-movement writes.");
  return protectedRecords.updateProtectedRecord(
    owner, assetId, "aset", nextData, now,
    "aset: " + initialAsset.name, normalizedWrites,
  );
}, "Asset source, audit, normalized inventory and append-only movement history");

const assetState = await query(
  "SELECT data,updated FROM public.records WHERE id=" + sqlLiteral(assetId) + " AND owner=" + sqlLiteral(owner)
);
assert.equal(assetState.length, 1);
assert.equal(JSON.parse(assetState[0].data).custodyStatus, "Dipinjam", "The winning asset source must be committed.");
const inventory = await query(
  "SELECT id FROM workspace_v14.inventory_items WHERE organization_id=" + sqlLiteral(organizationId) +
  " AND source_legacy_asset_id=" + sqlLiteral(assetId)
);
assert.equal(inventory.length, 1, "Exactly one normalized V14 inventory item must be committed.");
const assetWinnerData = JSON.parse(assetState[0].data);
assert(/Writer [AB] issued the asset/.test(assetWinnerData.notes), "The winning asset source payload must be committed.");
const assignments = await query(
  "SELECT id,assignment_status,purpose,member_profile_id FROM workspace_v14.member_asset_assignments WHERE id=" +
  sqlLiteral("v14:asset-assignment:" + assetId) + " AND organization_id=" + sqlLiteral(organizationId)
);
assert.equal(assignments.length, 1, "Exactly one member-asset assignment must be committed.");
assert.equal(assignments[0].assignment_status, "issued");
assert.equal(assignments[0].purpose, assetWinnerData.notes, "The assignment purpose must match the winning writer, never the loser.");
assert.equal(
  assignments[0].member_profile_id,
  memberSources.get(assetWinnerData.custodianMemberId === memberSources.get("Writer A").id ? "Writer A" : "Writer B").profileId,
  "The assignment must point to the member profile selected by the winning writer, not the losing request."
);
const assetEvents = await query(
  "SELECT id,event_type,to_status,notes FROM workspace_v14.member_asset_movement_events WHERE assignment_id=" +
  sqlLiteral(assignments[0].id) + " AND organization_id=" + sqlLiteral(organizationId)
);
assert.equal(assetEvents.length, 1, "Only the winning asset update may append its V14 movement event.");
assert.equal(assetEvents[0].event_type, "issued");
assert.equal(assetEvents[0].to_status, "Dipinjam");
assert.equal(
  assetEvents[0].notes,
  "Aset diserahkan kepada " + assetWinnerData.custodianMemberName,
  "The append-only movement event must reference the winning borrower's name."
);
const immutableEventRejected = await runPsql(
  "UPDATE workspace_v14.member_asset_movement_events SET notes='unauthorized mutation' WHERE id=" + sqlLiteral(assetEvents[0].id) + ";"
).then(() => false, () => true);
assert.equal(immutableEventRejected, true, "The production append-only trigger must reject updates to movement history.");
const preservedEvent = await query(
  "SELECT notes FROM workspace_v14.member_asset_movement_events WHERE id=" + sqlLiteral(assetEvents[0].id)
);
assert.equal(
  preservedEvent[0].notes,
  "Aset diserahkan kepada " + assetWinnerData.custodianMemberName,
  "Rejected mutation must not alter the committed movement event."
);
const assetMap = await query(
  "SELECT id,migration_status FROM workspace_v14.legacy_record_map WHERE organization_id=" +
  sqlLiteral(organizationId) + " AND source_schema='public' AND source_table='records' AND source_id=" + sqlLiteral(assetId)
);
assert.equal(assetMap.length, 1, "The winning asset update must preserve its V14 legacy lineage map.");
assert.equal(assetMap[0].migration_status, "transformed");
const assetAudit = await query(
  "SELECT id FROM public.audit WHERE owner=" + sqlLiteral(owner) +
  " AND action='Diperbarui' AND title=" + sqlLiteral("aset: " + initialAsset.name)
);
assert.equal(assetAudit.length, 1, "Only the winning asset source audit may commit.");
console.log("PASS real PostgreSQL asset domain: one winner, one 409, normalized inventory, member assignment, one immutable movement event, lineage map and source audit.");


const agricultureNow = "2026-11-26T00:10:00.000Z";
const agricultureNext = "2026-11-26T00:10:05.000Z";
const agricultureCommodityId = randomUUID();
await runPsql(
  "INSERT INTO public.agriculture_commodities(id,workspace_owner,code,name,default_unit,status,created_by,created_at,updated_at) VALUES(" +
  [agricultureCommodityId, owner, "cas-qa-commodity", "Komoditas sintetis CAS", "kg", "active", owner, agricultureNow, agricultureNow].map(sqlLiteral).join(",") +
  ");"
);

const parcelId = randomUUID();
await runPsql(
  "INSERT INTO public.farm_parcels(id,workspace_owner,member_id,parcel_code,name,area_m2,tenure_type,location_label,status,verification_status,created_by,updated_by,created_at,updated_at) VALUES(" +
  [parcelId, owner, memberSources.get("Writer A").id, "CAS-PARCEL-001", "Synthetic CAS parcel", 1500, "owned", "Dusun Uji", "active", "pending", owner, owner, agricultureNow, agricultureNow].map(sqlLiteral).join(",") +
  ");"
);

const parcelEditOutcomes = await raceTwoUpdates(writer => agricultureMutations.updateFarmParcel(database, {
  owner,
  actorId: owner,
  actorRole: "admin",
  id: parcelId,
  expectedUpdated: agricultureNow,
  memberId: memberSources.get(writer).id,
  parcelCode: "CAS-PARCEL-" + writer.replace(" ", "-").toUpperCase(),
  name: "Parcel edited by " + writer,
  areaM2: writer === "Writer A" ? 1250 : 1300,
  tenureType: "owned",
  locationLabel: "Dusun Uji",
  now: agricultureNext,
}), "Agriculture parcel edit with versioned source and audit");
const parcelAfterEdit = await query(
  "SELECT id,member_id,parcel_code,name,area_m2,updated_at FROM public.farm_parcels WHERE id=" + sqlLiteral(parcelId) +
  " AND workspace_owner=" + sqlLiteral(owner)
);
assert.equal(parcelAfterEdit.length, 1);
const parcelWinner = parcelAfterEdit[0];
assert(/Parcel edited by Writer [AB]/.test(parcelWinner.name), "The winning parcel edit must be the only committed payload.");
assert.notEqual(parcelWinner.updated_at, agricultureNow, "The winning parcel edit must advance the version timestamp.");
const parcelEditAudits = await query(
  "SELECT id,details FROM public.agriculture_audit WHERE workspace_owner=" + sqlLiteral(owner) +
  " AND target_type='parcel' AND target_id=" + sqlLiteral(parcelId) +
  " AND action='Register lahan diperbarui; verifikasi ulang diperlukan'"
);
assert.equal(parcelEditAudits.length, 1, "Only the winning parcel editor may create an audit row.");
assert.equal(JSON.parse(parcelEditAudits[0].details).memberId, parcelWinner.member_id, "The parcel audit details must match the winning member assignment.");
console.log("PASS PostgreSQL agriculture parcel edit: one winner, one 409, one version advance, and one matching audit.");

const lifecycleExpectedUpdated = String(parcelWinner.updated_at);
const lifecycleOutcomes = await raceTwoUpdates(writer => writer === "Writer A"
  ? agricultureMutations.archiveFarmParcel(database, {
      owner, actorId: owner, actorRole: "admin", id: parcelId,
      expectedUpdated: lifecycleExpectedUpdated, reason: "Archive winner in concurrency test", now: "2026-11-26T00:10:06.000Z",
    })
  : agricultureMutations.updateFarmParcel(database, {
      owner, actorId: owner, actorRole: "admin", id: parcelId,
      expectedUpdated: lifecycleExpectedUpdated, memberId: memberSources.get("Writer B").id,
      parcelCode: "CAS-PARCEL-REVISED", name: "Parcel revision winner", areaM2: 1400,
      tenureType: "leased", locationLabel: "Dusun Uji", now: "2026-11-26T00:10:06.000Z",
    }),
"Parcels archive versus edit from the same version");
const parcelAfterLifecycle = await query(
  "SELECT status,name,updated_at FROM public.farm_parcels WHERE id=" + sqlLiteral(parcelId) +
  " AND workspace_owner=" + sqlLiteral(owner)
);
assert.equal(parcelAfterLifecycle.length, 1);
assert(
  parcelAfterLifecycle[0].status === "archived" || parcelAfterLifecycle[0].name === "Parcel revision winner",
  "Exactly one archive/edit action must determine the final parcel state."
);
const lifecycleAuditCount = await query(
  "SELECT COUNT(*)::int AS count FROM public.agriculture_audit WHERE workspace_owner=" + sqlLiteral(owner) +
  " AND target_type='parcel' AND target_id=" + sqlLiteral(parcelId)
);
assert.equal(lifecycleAuditCount[0].count, 2, "A competing archive/edit pair must append exactly one additional audit, not one per request.");
console.log("PASS PostgreSQL agriculture parcel lifecycle: archive and edit compete on one version; only the winning mutation and audit commit.");

const verifyParcelId = randomUUID();
await runPsql(
  "INSERT INTO public.farm_parcels(id,workspace_owner,member_id,parcel_code,name,area_m2,tenure_type,location_label,status,verification_status,created_by,updated_by,created_at,updated_at) VALUES(" +
  [verifyParcelId, owner, memberSources.get("Writer A").id, "CAS-VERIFY-PARCEL", "Synthetic verification parcel", 900, "owned", "Dusun Uji", "active", "pending", owner, owner, agricultureNow, agricultureNow].map(sqlLiteral).join(",") +
  ");"
);
const parcelVerifyOutcomes = await raceTwoUpdates(writer => agricultureMutations.setAgricultureVerification(database, {
  owner,
  actorId: owner,
  actorRole: "admin",
  id: verifyParcelId,
  expectedUpdated: agricultureNow,
  targetType: "parcel",
  nextStatus: writer === "Writer A" ? "verified" : "rejected",
  reason: writer === "Writer A" ? "Verified by synthetic writer A" : "Rejected by synthetic writer B",
  now: agricultureNext,
}), "Agriculture parcel verification");
const verifyParcelState = await query(
  "SELECT verification_status,verification_note FROM public.farm_parcels WHERE id=" + sqlLiteral(verifyParcelId)
);
assert.equal(verifyParcelState.length, 1);
assert(
  verifyParcelState[0].verification_status === "verified" || verifyParcelState[0].verification_status === "rejected",
  "The winning parcel verification decision must be committed."
);
const verifyParcelAudit = await query(
  "SELECT id,action,reason FROM public.agriculture_audit WHERE target_type='parcel' AND target_id=" + sqlLiteral(verifyParcelId)
);
assert.equal(verifyParcelAudit.length, 1, "Exactly one parcel verification audit must commit.");
assert.equal(verifyParcelAudit[0].action, verifyParcelState[0].verification_status === "verified" ? "Data diverifikasi" : "Data ditolak");
assert.equal(verifyParcelAudit[0].reason, verifyParcelState[0].verification_note);
console.log("PASS PostgreSQL agriculture parcel verification: exactly one concurrent decision and audit commit.");

const verifiedParentParcelId = randomUUID();
await runPsql(
  "INSERT INTO public.farm_parcels(id,workspace_owner,member_id,parcel_code,name,area_m2,tenure_type,location_label,status,verification_status,verified_by,verified_at,created_by,updated_by,created_at,updated_at) VALUES(" +
  [verifiedParentParcelId, owner, memberSources.get("Writer A").id, "CAS-PARENT-VERIFIED", "Synthetic verified parent parcel", 2000, "owned", "Dusun Uji", "active", "verified", owner, agricultureNow, owner, owner, agricultureNow, agricultureNow].map(sqlLiteral).join(",") +
  ");"
);
const cycleId = randomUUID();
await runPsql(
  "INSERT INTO public.crop_cycles(id,workspace_owner,parcel_id,commodity_id,season_label,planted_area_m2,planting_date,expected_harvest_date,status,verification_status,created_by,updated_by,created_at,updated_at) VALUES(" +
  [cycleId, owner, verifiedParentParcelId, agricultureCommodityId, "Musim CAS 2026", 1500, "2026-11-01", "2027-02-01", "planted", "pending", owner, owner, agricultureNow, agricultureNow].map(sqlLiteral).join(",") +
  ");"
);
await raceTwoUpdates(writer => agricultureMutations.setAgricultureVerification(database, {
  owner,
  actorId: owner,
  actorRole: "admin",
  id: cycleId,
  expectedUpdated: agricultureNow,
  targetType: "crop_cycle",
  nextStatus: writer === "Writer A" ? "verified" : "rejected",
  reason: writer === "Writer A" ? "Verified crop cycle by writer A" : "Rejected crop cycle by writer B",
  now: agricultureNext,
}), "Agriculture crop-cycle verification");
const cycleAudit = await query(
  "SELECT id FROM public.agriculture_audit WHERE target_type='crop_cycle' AND target_id=" + sqlLiteral(cycleId)
);
assert.equal(cycleAudit.length, 1, "Only the winning crop-cycle verification audit may commit.");

const harvestCycleId = randomUUID();
await runPsql(
  "INSERT INTO public.crop_cycles(id,workspace_owner,parcel_id,commodity_id,season_label,planted_area_m2,planting_date,expected_harvest_date,status,verification_status,verified_by,verified_at,created_by,updated_by,created_at,updated_at) VALUES(" +
  [harvestCycleId, owner, verifiedParentParcelId, agricultureCommodityId, "Musim panen CAS 2026", 1200, "2026-10-01", "2026-11-20", "harvesting", "verified", owner, agricultureNow, owner, owner, agricultureNow, agricultureNow].map(sqlLiteral).join(",") +
  ");"
);
const harvestId = randomUUID();
await runPsql(
  "INSERT INTO public.harvest_records(id,workspace_owner,crop_cycle_id,harvest_date,quantity,unit_code,notes,verification_status,created_by,updated_by,created_at,updated_at) VALUES(" +
  [harvestId, owner, harvestCycleId, "2026-11-20", 120, "kg", "Synthetic CAS harvest", "pending", owner, owner, agricultureNow, agricultureNow].map(sqlLiteral).join(",") +
  ");"
);
await raceTwoUpdates(writer => agricultureMutations.setAgricultureVerification(database, {
  owner,
  actorId: owner,
  actorRole: "admin",
  id: harvestId,
  expectedUpdated: agricultureNow,
  targetType: "harvest",
  nextStatus: writer === "Writer A" ? "verified" : "rejected",
  reason: writer === "Writer A" ? "Verified harvest by writer A" : "Rejected harvest by writer B",
  now: agricultureNext,
}), "Agriculture harvest verification");
const harvestAudit = await query(
  "SELECT id FROM public.agriculture_audit WHERE target_type='harvest' AND target_id=" + sqlLiteral(harvestId)
);
assert.equal(harvestAudit.length, 1, "Only the winning harvest verification audit may commit.");
console.log("PASS PostgreSQL agriculture verification: parcel, crop cycle and harvest each enforce one versioned winner and one append-only audit row.");


const attendanceNow = "2026-11-26T00:20:00.000Z";
const attendanceRecordId = "attendance-" + randomUUID();
const attendanceEventId = randomUUID();
const attendanceEventData = {
  name: "Synthetic attendance event",
  date: "2026-11-26",
  location: "Dusun Uji",
  status: "Terjadwal",
};
await runPsql(
  "INSERT INTO public.records(id,owner,kind,data,created,updated) VALUES(" +
  [attendanceEventId, owner, "kegiatan", JSON.stringify(attendanceEventData), attendanceNow, attendanceNow].map(sqlLiteral).join(",") +
  ");"
);
const activityWrites = await v14.buildV14RecordSyncStatements(database, {
  owner,
  actorId: owner,
  id: attendanceEventId,
  kind: "kegiatan",
  data: attendanceEventData,
  now: attendanceNow,
});
assert(activityWrites.length > 0, "The synthetic event must map to a normalized V14 activity.");
await database.batch(activityWrites);

async function attendanceWrites(memberName, now) {
  const sourceId = memberSources.get(memberName).id;
  return v14.buildV14AttendanceSyncStatements(database, {
    owner,
    actorId: owner,
    attendanceRecordId,
    eventId: attendanceEventId,
    memberStatuses: sourceId ? { [sourceId]: "Hadir penuh" } : {},
    externalParticipants: [],
    now,
  });
}

async function attendanceSave(writer, expectedUpdated, now, notes) {
  const memberName = writer;
  const data = {
    eventId: attendanceEventId,
    name: attendanceEventData.name,
    memberIds: [memberSources.get(memberName).id],
    memberNames: ["Anggota sintetis CAS QA " + memberName],
    notes,
  };
  return attendanceMutations.saveAttendanceRecord(database, {
    owner,
    actorId: owner,
    eventId: attendanceEventId,
    eventUpdated: attendanceNow,
    attendanceRecordId,
    expectedUpdated,
    data,
    eventName: attendanceEventData.name,
    now,
  }, await attendanceWrites(memberName, now));
}

const attendanceCreateOutcomes = await raceTwoUpdates(
  writer => attendanceSave(writer, null, "2026-11-26T00:20:01.000Z", "Created by " + writer),
  "Concurrent initial attendance register creation",
);
const attendanceAfterCreate = await query(
  "SELECT id,data,created,updated FROM public.records WHERE id=" + sqlLiteral(attendanceRecordId) +
  " AND owner=" + sqlLiteral(owner) + " AND kind='kehadiran'"
);
assert.equal(attendanceAfterCreate.length, 1, "Concurrent creation must create exactly one legacy attendance record.");
const createdAttendanceData = JSON.parse(attendanceAfterCreate[0].data);
const createWinner = createdAttendanceData.notes.endsWith("Writer A") ? "Writer A" : "Writer B";
assert.equal(createdAttendanceData.memberIds[0], memberSources.get(createWinner).id, "The winning attendance payload must identify its own attendee.");
const attendancePrefix = "v14:attendance-member:" + attendanceRecordId + ":";
const normalizedAfterCreate = await query(
  "SELECT id,member_profile_id,attendance_status FROM workspace_v14.activity_attendance WHERE organization_id=" +
  sqlLiteral(organizationId) + " AND activity_id=(SELECT id FROM workspace_v14.activities WHERE source_legacy_record_id=" +
  sqlLiteral(attendanceEventId) + ") AND participant_type='member' AND left(id,length(" +
  sqlLiteral(attendancePrefix) + "))=" + sqlLiteral(attendancePrefix)
);
assert.equal(normalizedAfterCreate.length, 1, "Exactly one normalized member attendance row must be committed by initial creation.");
assert.equal(
  normalizedAfterCreate[0].member_profile_id,
  memberSources.get(createWinner).profileId,
  "The normalized attendee profile must match the winning legacy register payload."
);
console.log("PASS PostgreSQL attendance register creation: one winner, one 409, one legacy record and one matching V14 attendee.");

const firstAttendanceVersion = String(attendanceAfterCreate[0].updated);
const attendanceUpdateOutcomes = await raceTwoUpdates(
  writer => attendanceSave(writer, firstAttendanceVersion, "2026-11-26T00:20:02.000Z", "Updated by " + writer),
  "Concurrent attendance register update from the same version",
);
const attendanceAfterUpdate = await query(
  "SELECT data,created,updated FROM public.records WHERE id=" + sqlLiteral(attendanceRecordId) +
  " AND owner=" + sqlLiteral(owner) + " AND kind='kehadiran'"
);
const updatedAttendanceData = JSON.parse(attendanceAfterUpdate[0].data);
const updateWinner = updatedAttendanceData.notes.endsWith("Writer A") ? "Writer A" : "Writer B";
assert.notEqual(String(attendanceAfterUpdate[0].updated), firstAttendanceVersion, "The winning update must advance the version.");
assert.equal(String(attendanceAfterUpdate[0].created), String(attendanceAfterCreate[0].created), "Updating an attendance register must preserve its original creation timestamp.");
assert.equal(updatedAttendanceData.memberIds[0], memberSources.get(updateWinner).id);
const normalizedAfterUpdate = await query(
  "SELECT id,member_profile_id FROM workspace_v14.activity_attendance WHERE organization_id=" +
  sqlLiteral(organizationId) + " AND activity_id=(SELECT id FROM workspace_v14.activities WHERE source_legacy_record_id=" +
  sqlLiteral(attendanceEventId) + ") AND participant_type='member' AND left(id,length(" +
  sqlLiteral(attendancePrefix) + "))=" + sqlLiteral(attendancePrefix)
);
assert.equal(normalizedAfterUpdate.length, 1, "Updating the register must replace the previous V14 member selection.");
assert.equal(normalizedAfterUpdate[0].member_profile_id, memberSources.get(updateWinner).profileId);
const staleAttendanceResult = await resultOf(
  attendanceSave("Writer A", firstAttendanceVersion, "2026-11-26T00:20:03.000Z", "Stale attendance update"),
  "Stale attendance version",
);
assert.equal(staleAttendanceResult.success, false);
assert.equal(staleAttendanceResult.status, 409, "A stale attendance write must be rejected with 409.");
const attendanceAuditCount = async () => {
  const rows = await query(
    "SELECT COUNT(*)::int AS count FROM public.audit WHERE owner=" + sqlLiteral(owner) +
    " AND title=" + sqlLiteral("Daftar hadir: " + attendanceEventData.name)
  );
  return rows[0].count;
};
assert.equal(await attendanceAuditCount(), 2, "The stale request must not append an audit row.");
console.log("PASS PostgreSQL attendance register update: same-version writers produce one winner, stale writes return 409, and source/audit stay aligned.");

const latestAttendanceVersion = String(attendanceAfterUpdate[0].updated);
await attendanceMutations.saveAttendanceRecord(database, {
  owner,
  actorId: owner,
  eventId: attendanceEventId,
  eventUpdated: attendanceNow,
  attendanceRecordId,
  expectedUpdated: latestAttendanceVersion,
  data: {
    eventId: attendanceEventId,
    name: attendanceEventData.name,
    memberIds: [],
    memberNames: [],
    notes: "All member attendance marks cleared",
  },
  eventName: attendanceEventData.name,
  now: "2026-11-26T00:20:04.000Z",
}, await v14.buildV14AttendanceSyncStatements(database, {
  owner,
  actorId: owner,
  attendanceRecordId,
  eventId: attendanceEventId,
  memberStatuses: {},
  externalParticipants: [],
  now: "2026-11-26T00:20:04.000Z",
}));
const emptyNormalizedAttendance = await query(
  "SELECT id FROM workspace_v14.activity_attendance WHERE organization_id=" +
  sqlLiteral(organizationId) + " AND activity_id=(SELECT id FROM workspace_v14.activities WHERE source_legacy_record_id=" +
  sqlLiteral(attendanceEventId) + ") AND participant_type='member' AND left(id,length(" +
  sqlLiteral(attendancePrefix) + "))=" + sqlLiteral(attendancePrefix)
);
assert.equal(emptyNormalizedAttendance.length, 0, "Clearing all attendees must remove stale V14 rows owned by this legacy attendance record.");
assert.equal(await attendanceAuditCount(), 3, "The explicit clearing operation must be audited exactly once.");
const attendanceLineage = await query(
  "SELECT id,migration_status FROM workspace_v14.legacy_record_map WHERE organization_id=" +
  sqlLiteral(organizationId) + " AND source_schema='public' AND source_table='records' AND source_id=" +
  sqlLiteral(attendanceRecordId)
);
assert.equal(attendanceLineage.length, 1, "The attendance record must keep its normalized V14 lineage map.");
assert.equal(attendanceLineage[0].migration_status, "transformed");
console.log("PASS PostgreSQL attendance normalization: clearing the member selection removes only its own stale V14 rows and preserves lineage.");

const attendanceAfterClear = await query(
  "SELECT data,updated FROM public.records WHERE id=" + sqlLiteral(attendanceRecordId) +
  " AND owner=" + sqlLiteral(owner) + " AND kind='kehadiran'"
);
assert.equal(attendanceAfterClear.length, 1);
await runPsql(
  "UPDATE public.records SET updated=" + sqlLiteral("2026-11-26T00:20:05.000Z") +
  " WHERE id=" + sqlLiteral(attendanceEventId) + " AND owner=" + sqlLiteral(owner) + " AND kind='kegiatan';"
);
const staleEventOutcome = await resultOf(attendanceMutations.saveAttendanceRecord(database, {
  owner,
  actorId: owner,
  eventId: attendanceEventId,
  eventUpdated: attendanceNow,
  attendanceRecordId,
  expectedUpdated: String(attendanceAfterClear[0].updated),
  data: {
    eventId: attendanceEventId,
    name: attendanceEventData.name,
    memberIds: [],
    memberNames: [],
    notes: "Attempt after source activity changed",
  },
  eventName: attendanceEventData.name,
  now: "2026-11-26T00:20:06.000Z",
}, await v14.buildV14AttendanceSyncStatements(database, {
  owner,
  actorId: owner,
  attendanceRecordId,
  eventId: attendanceEventId,
  memberStatuses: {},
  externalParticipants: [],
  now: "2026-11-26T00:20:06.000Z",
})), "Attendance save after source activity changed");
assert.equal(staleEventOutcome.success, false);
assert.equal(staleEventOutcome.status, 409, "A stale activity version must reject attendance writes at the transaction boundary.");
const attendanceAfterStaleEvent = await query(
  "SELECT data,updated FROM public.records WHERE id=" + sqlLiteral(attendanceRecordId) +
  " AND owner=" + sqlLiteral(owner) + " AND kind='kehadiran'"
);
assert.deepEqual(attendanceAfterStaleEvent, attendanceAfterClear, "A stale source activity must not alter the attendance source record.");
assert.equal(await attendanceAuditCount(), 3, "A stale source activity must not append attendance audit rows.");
console.log("PASS PostgreSQL attendance activity guard: event version is checked under row lock and stale source updates cannot change the register or audit.");



const invoiceNow = "2026-11-26T00:30:00.000Z";
const invoiceOrderId = randomUUID();
const invoiceBuyerId = randomUUID();
const invoiceProductId = randomUUID();
await runPsql(
  "INSERT INTO public.users(id,email,password_hash,full_name,enabled,created,role,workspace_owner) VALUES(" +
  [invoiceBuyerId, invoiceBuyerId + "@example.invalid", "synthetic-password-hash", "Synthetic Invoice Buyer", true, invoiceNow, "anggota", owner].map(sqlLiteral).join(",") +
  ");"
);
await runPsql(
  "INSERT INTO public.commerce_products(id,owner,sku,name,description,unit,price,stock,published,created,updated) VALUES(" +
  [invoiceProductId, owner, "CAS-INVOICE-001", "Produk uji faktur", "Produk sintetis untuk pengujian faktur", "unit", 1000, 10, true, invoiceNow, invoiceNow].map(sqlLiteral).join(",") +
  ");"
);
await runPsql(
  "INSERT INTO public.commerce_orders(id,owner,buyer_id,product_id,product_name,quantity,unit_price,total,status,client_request_id,created,updated) VALUES(" +
  [invoiceOrderId, owner, invoiceBuyerId, invoiceProductId, "Produk uji faktur", 1, 1000, 1000, "completed", randomUUID(), invoiceNow, invoiceNow].map(sqlLiteral).join(",") +
  ");"
);

const defaultLedgerAccounts = await finance.ensureDefaultLedgerAccounts(database, owner, invoiceNow);
const invoiceReceivable = defaultLedgerAccounts.find(account => account.code === "120002");
const invoiceRevenue = defaultLedgerAccounts.find(account => account.code === "410003");
const invoiceCash = defaultLedgerAccounts.find(account => account.code === "110003");
assert(invoiceReceivable && invoiceRevenue && invoiceCash, "Invoice issue and receipt tests require the default receivable, revenue and cash accounts.");

function invoiceIssueStatement() {
  return salesInvoices.buildSalesInvoiceIssueStatement(database, {
    owner,
    actorId: owner,
    orderId: invoiceOrderId,
    issueDate: "2026-11-26",
    dueDate: "2026-12-26",
    receivableAccountId: invoiceReceivable.id,
    revenueAccountId: invoiceRevenue.id,
    now: invoiceNow,
  });
}
database.armConcurrentGate(2);
const invoiceIssueAttempts = await Promise.all(["Writer A", "Writer B"].map(async label => {
  try {
    const result = await invoiceIssueStatement().first();
    return { label, success: Boolean(result?.invoice_json), invoice: result?.invoice_json ? JSON.parse(result.invoice_json) : null };
  } catch (error) {
    return { label, success: false, error: String(error?.message || error) };
  }
}));
assert.equal(invoiceIssueAttempts.filter(item => item.success).length, 1,
  "Concurrent issuance for one completed order must commit exactly one invoice and journal: " + JSON.stringify(invoiceIssueAttempts));
const issuedInvoiceRows = await query(
  "SELECT id,order_id,invoice_number,customer_user_id,customer_name,issue_date,due_date,total_amount,paid_total,status,ledger_entry_id " +
  "FROM public.commerce_sales_invoices WHERE owner=" + sqlLiteral(owner) + " AND order_id=" + sqlLiteral(invoiceOrderId)
);
assert.equal(issuedInvoiceRows.length, 1, "One completed order must have exactly one invoice.");
const issuedInvoice = issuedInvoiceRows[0];
assert.match(issuedInvoice.invoice_number, /^SB-202611-\d{6}$/);
assert.equal(issuedInvoice.customer_user_id, invoiceBuyerId);
assert.equal(issuedInvoice.customer_name, "Synthetic Invoice Buyer");
assert.equal(Number(issuedInvoice.total_amount), 1000);
assert.equal(Number(issuedInvoice.paid_total), 0);
assert.equal(issuedInvoice.status, "issued");
const invoiceJournal = await query(
  "SELECT id,reference FROM public.ledger_entries WHERE id=" + sqlLiteral(issuedInvoice.ledger_entry_id) +
  " AND owner=" + sqlLiteral(owner)
);
assert.equal(invoiceJournal.length, 1);
assert.equal(invoiceJournal[0].reference, "INV-" + issuedInvoice.invoice_number);
const invoiceJournalLines = await query(
  "SELECT account_id,debit,credit FROM public.ledger_lines WHERE owner=" + sqlLiteral(owner) +
  " AND entry_id=" + sqlLiteral(issuedInvoice.ledger_entry_id) + " ORDER BY account_id"
);
assert.equal(invoiceJournalLines.length, 2, "Sales invoice issuance must create exactly two journal lines.");
assert.equal(invoiceJournalLines.reduce((sum, line) => sum + Number(line.debit), 0), 1000);
assert.equal(invoiceJournalLines.reduce((sum, line) => sum + Number(line.credit), 0), 1000);
assert(invoiceJournalLines.some(line => line.account_id === invoiceReceivable.id && Number(line.debit) === 1000));
assert(invoiceJournalLines.some(line => line.account_id === invoiceRevenue.id && Number(line.credit) === 1000));
const invoiceAudit = await query(
  "SELECT id FROM public.audit WHERE owner=" + sqlLiteral(owner) +
  " AND action='Faktur penjualan diterbitkan' AND title=" +
  sqlLiteral(issuedInvoice.invoice_number + " · Synthetic Invoice Buyer")
);
assert.equal(invoiceAudit.length, 1, "Invoice and its balanced journal must have one issuance audit.");
const invoiceSequence = await query(
  "SELECT last_number FROM public.commerce_sales_invoice_sequences WHERE owner=" +
  sqlLiteral(owner) + " AND period='202611'"
);
assert.equal(invoiceSequence.length, 1);
assert.equal(Number(invoiceSequence[0].last_number), 1, "A losing duplicate issuer must not consume an invoice sequence number.");
console.log("PASS PostgreSQL sales invoice issuance: one concurrent winner, one invoice, one balanced receivable/revenue journal, one audit and one sequence number.");

async function seedCashSource(sourceId, amount, notes, now) {
  const data = {
    name: "Pelunasan " + issuedInvoice.invoice_number,
    date: "2026-11-26",
    type: "Pemasukan",
    amount,
    fund: "Usaha",
    counterAccountId: invoiceReceivable.id,
    counterAccountName: invoiceReceivable.name,
    counterAccountCode: invoiceReceivable.code,
    counterAccountCategory: invoiceReceivable.category,
    relatedInvoiceId: issuedInvoice.id,
    notes,
  };
  await runPsql(
    "INSERT INTO public.records(id,owner,kind,data,created,updated) VALUES(" +
    [sourceId, owner, "kas", JSON.stringify(data), now, now].map(sqlLiteral).join(",") +
    ");"
  );
  return data;
}
async function postInvoiceReceipt(sourceId, amount, notes, now) {
  const data = await seedCashSource(sourceId, amount, notes, now);
  const statements = await finance.buildCashLedgerPostingStatements(database, {
    owner,
    actorId: owner,
    sourceId,
    data,
    now,
  });
  assert(statements.some(statement => statement.text.includes("INSERT INTO commerce_sales_invoice_receipts")),
    "An invoice-linked cash transaction must add one append-only receipt statement.");
  await database.batch(statements);
}
async function invoiceBalance() {
  const rows = await query(
    "SELECT paid_total,status,total_amount FROM public.commerce_sales_invoices WHERE id=" +
    sqlLiteral(issuedInvoice.id) + " AND owner=" + sqlLiteral(owner)
  );
  assert.equal(rows.length, 1);
  return rows[0];
}

const firstReceiptCashId = randomUUID();
await postInvoiceReceipt(firstReceiptCashId, 200, "Pembayaran pertama sintetis", "2026-11-26T00:31:00.000Z");
let currentInvoiceBalance = await invoiceBalance();
assert.equal(Number(currentInvoiceBalance.paid_total), 200);
assert.equal(currentInvoiceBalance.status, "partially_paid");
const receiptCount = async () => {
  const rows = await query(
    "SELECT COUNT(*)::int AS count FROM public.commerce_sales_invoice_receipts WHERE owner=" +
    sqlLiteral(owner) + " AND invoice_id=" + sqlLiteral(issuedInvoice.id)
  );
  return rows[0].count;
};
assert.equal(await receiptCount(), 1, "The first partial payment must append one receipt.");
const retryWrites = await finance.buildCashLedgerPostingStatements(database, {
  owner,
  actorId: owner,
  sourceId: firstReceiptCashId,
  data: {
    name: "Pelunasan " + issuedInvoice.invoice_number,
    date: "2026-11-26",
    type: "Pemasukan",
    amount: 200,
    fund: "Usaha",
    counterAccountId: invoiceReceivable.id,
    relatedInvoiceId: issuedInvoice.id,
    notes: "Pembayaran pertama sintetis",
  },
  now: "2026-11-26T00:31:30.000Z",
});
assert.equal(retryWrites.length, 0, "Retrying the same cash record must not add a second journal or receipt.");

const concurrentReceiptA = randomUUID();
const concurrentReceiptB = randomUUID();
const dataA = await seedCashSource(concurrentReceiptA, 400, "Penerimaan bersamaan A", "2026-11-26T00:32:00.000Z");
const dataB = await seedCashSource(concurrentReceiptB, 400, "Penerimaan bersamaan B", "2026-11-26T00:32:00.000Z");
const [writesA, writesB] = await Promise.all([
  finance.buildCashLedgerPostingStatements(database, { owner, actorId: owner, sourceId: concurrentReceiptA, data: dataA, now: "2026-11-26T00:32:00.000Z" }),
  finance.buildCashLedgerPostingStatements(database, { owner, actorId: owner, sourceId: concurrentReceiptB, data: dataB, now: "2026-11-26T00:32:00.000Z" }),
]);
database.armConcurrentGate(2);
const concurrentReceipts = await Promise.all([
  database.batch(writesA).then(() => ({ success: true, sourceId: concurrentReceiptA }), error => ({ success: false, sourceId: concurrentReceiptA, error: String(error?.message || error) })),
  database.batch(writesB).then(() => ({ success: true, sourceId: concurrentReceiptB }), error => ({ success: false, sourceId: concurrentReceiptB, error: String(error?.message || error) })),
]);
assert.equal(concurrentReceipts.filter(result => result.success).length, 1,
  "Two receipts competing for the same outstanding balance must have one PostgreSQL winner: " + JSON.stringify(concurrentReceipts));
currentInvoiceBalance = await invoiceBalance();
assert.equal(Number(currentInvoiceBalance.paid_total), 600,
  "Only one of the two concurrent 400-unit receipts may settle against the 800-unit outstanding balance.");
assert.equal(currentInvoiceBalance.status, "partially_paid");
assert.equal(await receiptCount(), 2, "The losing receipt transaction must roll back its receipt row.");

const finalReceiptCashId = randomUUID();
await postInvoiceReceipt(finalReceiptCashId, 400, "Pelunasan akhir sintetis", "2026-11-26T00:33:00.000Z");
currentInvoiceBalance = await invoiceBalance();
assert.equal(Number(currentInvoiceBalance.paid_total), 1000);
assert.equal(currentInvoiceBalance.status, "paid");
assert.equal(await receiptCount(), 3);
console.log("PASS PostgreSQL invoice receipt settlement: partial payment, idempotent retry, serialized concurrent receipts, and exact final settlement.");

const overpayCashId = randomUUID();
const overpayEntryId = randomUUID();
const overpayDebitLineId = randomUUID();
const overpayCreditLineId = randomUUID();
await runPsql(
  "BEGIN;" +
  "INSERT INTO public.records(id,owner,kind,data,created,updated) VALUES(" +
  [overpayCashId, owner, "kas", JSON.stringify({ name: "Synthetic overpayment", date: "2026-11-26", type: "Pemasukan", amount: 1 }), invoiceNow, invoiceNow].map(sqlLiteral).join(",") +
  ");" +
  "INSERT INTO public.ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(" +
  [overpayEntryId, owner, owner, "2026-11-26", "Synthetic overpayment trigger test", "OVERPAY-" + overpayEntryId, invoiceNow].map(sqlLiteral).join(",") +
  ");" +
  "INSERT INTO public.ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(" +
  [overpayDebitLineId, owner, overpayEntryId, invoiceCash.id, 1, 0].map(sqlLiteral).join(",") +
  "),(" +
  [overpayCreditLineId, owner, overpayEntryId, invoiceReceivable.id, 0, 1].map(sqlLiteral).join(",") +
  ");" +
  "COMMIT;"
);
const overpaymentRejected = await runPsql(
  "INSERT INTO public.commerce_sales_invoice_receipts(id,owner,invoice_id,cash_record_id,ledger_entry_id,amount,received_date,actor_id,created) VALUES(" +
  [randomUUID(), owner, issuedInvoice.id, overpayCashId, overpayEntryId, 1, "2026-11-26", owner, "2026-11-26T00:34:00.000Z"].map(sqlLiteral).join(",") +
  ");"
).then(() => false, () => true);
assert.equal(overpaymentRejected, true, "The database trigger must reject a receipt that exceeds the paid invoice balance.");
assert.equal(Number((await invoiceBalance()).paid_total), 1000, "Rejected overpayment must not alter the paid invoice.");
assert.equal(await receiptCount(), 3, "Rejected overpayment must not append a receipt row.");
const immutableReceiptRejected = await runPsql(
  "UPDATE public.commerce_sales_invoice_receipts SET amount=amount WHERE owner=" + sqlLiteral(owner) +
  " AND invoice_id=" + sqlLiteral(issuedInvoice.id) + ";"
).then(() => false, () => true);
assert.equal(immutableReceiptRejected, true, "Invoice receipt rows must remain append-only.");
console.log("PASS PostgreSQL invoice guards: overpayment is rejected at the database boundary and receipt rows remain append-only.");
console.log("PASS PostgreSQL 16 domain CAS integration: actual application migrations, generic CAS, V14 mapper, ledger posting, asset history, agriculture register/verification CAS, attendance version CAS and V14 reconciliation, and sales invoice issuance/settlement.");
