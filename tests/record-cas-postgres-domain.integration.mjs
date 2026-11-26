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
    if (sql.trimStart().startsWith("WITH changed AS (")) {
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
    const isCas = statements[0]?.text.trimStart().startsWith("WITH changed AS (");
    if (isCas && this.raceGate) await this.waitAtConcurrentGate();

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

console.log("PASS PostgreSQL 16 domain CAS integration: actual application migrations, protected-records helper, V14 mapper, ledger posting statements, and append-only asset history.");
