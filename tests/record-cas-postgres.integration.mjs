import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const databaseUrl = process.env.PG_INTEGRATION_URL;
assert(databaseUrl, "PG_INTEGRATION_URL is required; never fall back to an application or production database URL.");

const protectedSource = readFileSync("src/lib/enterprise/protected-records.ts", "utf8");
const runtimeSource = readFileSync("src/lib/runtime.ts", "utf8");
assert(protectedSource.includes("WHERE id=? AND owner=? AND kind=? AND updated=?${lock}"), "The tested CAS predicate must match the production helper.");
assert(protectedSource.includes("db.batch([write,...normalizedWrites])"), "Source update, audit and dependent writes must share the production batch boundary.");
assert(runtimeSource.includes("isolationLevel:'Serializable'"), "The production database batch must remain Serializable.");

function runPsql(sql) {
  return new Promise((resolve, reject) => {
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
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`psql exited with code ${code}: ${stderr.trim()}`));
    });
    child.stdin.end(sql);
  });
}

function literal(value) {
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
      assert(index < values.length, "SQL bind value missing.");
      output += literal(values[index]);
      index += 1;
      continue;
    }
    output += char;
  }

  assert.equal(index, values.length, "Every SQL bind value must be consumed.");
  return output;
}

const templateMatch = protectedSource.match(/const sql=`([\s\S]*?)`;\s*const write=/);
assert(templateMatch, "Could not extract the current production CAS statement.");
const productionCasTemplate = templateMatch[1];
const schema = "cas_" + randomUUID().replace(/-/g, "");
const owner = "synthetic-owner-" + randomUUID();
const now = "2026-11-26T00:00:00.000Z";

await runPsql(`
CREATE SCHEMA ${schema};
SET search_path TO ${schema};
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  kind TEXT NOT NULL,
  data TEXT NOT NULL,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);
CREATE TABLE audit (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  created TEXT NOT NULL
);
CREATE TABLE operational_requests (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  cash_record_id TEXT,
  asset_id TEXT,
  status TEXT NOT NULL
);
CREATE TABLE v14_record_projection (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  record_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  record_id TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL
);
CREATE TABLE ledger_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  debit BIGINT NOT NULL,
  credit BIGINT NOT NULL,
  UNIQUE(entry_id, line_no)
);
CREATE TABLE asset_history (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL
);
`);

async function insertSource(id, kind, data) {
  await runPsql(`
    SET search_path TO ${schema};
    INSERT INTO records(id,owner,kind,data,created,updated)
    VALUES (${literal(id)},${literal(owner)},${literal(kind)},${literal(JSON.stringify(data))},${literal(now)},${literal(now)});
  `);
}

function createCasStatement({ id, kind, expectedUpdated, nextData, writer }) {
  const lock = kind === "kas"
    ? " AND NOT EXISTS(SELECT 1 FROM operational_requests WHERE owner=? AND cash_record_id=?)"
    : kind === "aset"
      ? " AND NOT EXISTS(SELECT 1 FROM operational_requests WHERE owner=? AND asset_id=? AND status IN ('approved','in_progress'))"
      : "";
  const lockArgs = ["kas", "aset"].includes(kind) ? [owner, id] : [];
  const auditId = randomUUID();
  const proposedNow = new Date(Date.parse(now) + 1000).toISOString();
  const values = [
    JSON.stringify(nextData), proposedNow, id, owner, kind, expectedUpdated,
    ...lockArgs,
    auditId, owner, "Diperbarui", `${kind}: ${id}`, proposedNow,
  ];
  return bindSql(productionCasTemplate.replace("${lock}", lock), values);
}

function writerTransaction({ id, kind, expectedUpdated, writer }) {
  const nextData = { name: `Synthetic ${kind}`, notes: writer };
  const cas = createCasStatement({ id, kind, expectedUpdated, nextData, writer });
  const projectionId = randomUUID();
  const projection = `
    INSERT INTO v14_record_projection(id,owner,record_id,kind,payload)
    VALUES (${literal(projectionId)},${literal(owner)},${literal(id)},${literal(kind)},${literal(JSON.stringify(nextData))})
    RETURNING id;
  `;

  const dependents = kind === "kas"
    ? `
      ${projection}
      INSERT INTO ledger_entries(id,owner,record_id,amount)
      VALUES (${literal(randomUUID())},${literal(owner)},${literal(id)},125000)
      RETURNING id;
      INSERT INTO ledger_lines(id,entry_id,line_no,debit,credit)
      SELECT gen_random_uuid()::text, entry_id, line_no, debit, credit
      FROM (
        SELECT (SELECT id FROM ledger_entries WHERE record_id=${literal(id)}) AS entry_id,
               1 AS line_no, 0::bigint AS debit, 125000::bigint AS credit
        UNION ALL
        SELECT (SELECT id FROM ledger_entries WHERE record_id=${literal(id)}),
               2, 125000::bigint, 0::bigint
      ) AS lines
      RETURNING id;
    `
    : `
      ${projection}
      INSERT INTO asset_history(id,owner,asset_id,event_type,payload)
      VALUES (${literal(randomUUID())},${literal(owner)},${literal(id)},'asset_updated',${literal(JSON.stringify(nextData))})
      RETURNING id;
    `;

  return `
    SET search_path TO ${schema};
    BEGIN ISOLATION LEVEL SERIALIZABLE;
    SELECT updated FROM records
      WHERE id=${literal(id)} AND owner=${literal(owner)}
        AND kind=${literal(kind)} AND updated=${literal(expectedUpdated)};
    SELECT pg_sleep(1.25);
    ${cas};
    ${dependents}
    COMMIT;
  `;
}

async function raceTwoWriters({ id, kind }) {
  const outcomes = await Promise.all(["writer-A", "writer-B"].map(async writer => {
    try {
      await runPsql(writerTransaction({ id, kind, expectedUpdated: now, writer }));
      return { writer, committed: true };
    } catch (error) {
      return { writer, committed: false, error: String(error) };
    }
  }));
  assert.equal(outcomes.filter(item => item.committed).length, 1, `Exactly one ${kind} writer must commit in PostgreSQL: ${JSON.stringify(outcomes)}`);
  assert.equal(outcomes.filter(item => !item.committed).length, 1, "The competing transaction must abort without partial writes.");
  return outcomes;
}

async function readState(id) {
  const output = await runPsql(`
    SET search_path TO ${schema};
    SELECT json_build_object(
      'source', (SELECT json_build_object('data',data,'updated',updated) FROM records WHERE id=${literal(id)}),
      'audit_count', (SELECT count(*) FROM audit WHERE title=${literal("kas: " + id)} OR title=${literal("aset: " + id)}),
      'projection_count', (SELECT count(*) FROM v14_record_projection WHERE record_id=${literal(id)}),
      'ledger_count', (SELECT count(*) FROM ledger_entries WHERE record_id=${literal(id)}),
      'ledger_line_count', (SELECT count(*) FROM ledger_lines WHERE entry_id IN (SELECT id FROM ledger_entries WHERE record_id=${literal(id)})),
      'asset_history_count', (SELECT count(*) FROM asset_history WHERE asset_id=${literal(id)})
    )::text;
  `);
  return JSON.parse(output.split("\n").filter(Boolean).at(-1));
}

const cashId = randomUUID();
await insertSource(cashId, "kas", { name: "Synthetic cash", notes: "original" });
await raceTwoWriters({ id: cashId, kind: "kas" });
const cashState = await readState(cashId);
assert(["writer-A", "writer-B"].includes(cashState.source.data && JSON.parse(cashState.source.data).notes), "The winning cash source must be preserved.");
assert.equal(cashState.audit_count, 1, "Only the winning source audit may commit.");
assert.equal(cashState.projection_count, 1, "Only the winning normalized V14 projection may commit.");
assert.equal(cashState.ledger_count, 1, "Only the winning cash update may create a ledger journal.");
assert.equal(cashState.ledger_line_count, 2, "The winning cash journal must contain its two lines.");
assert.equal(cashState.asset_history_count, 0, "Cash updates must not create asset history.");

const assetId = randomUUID();
await insertSource(assetId, "aset", { name: "Synthetic asset", notes: "original" });
await raceTwoWriters({ id: assetId, kind: "aset" });
const assetState = await readState(assetId);
assert(["writer-A", "writer-B"].includes(JSON.parse(assetState.source.data).notes), "The winning asset source must be preserved.");
assert.equal(assetState.audit_count, 1, "Only the winning asset audit may commit.");
assert.equal(assetState.projection_count, 1, "Only the winning asset normalized projection may commit.");
assert.equal(assetState.ledger_count, 0, "Asset updates must not create finance ledger entries.");
assert.equal(assetState.asset_history_count, 1, "Only the winning asset update may append asset history.");

console.log("PASS PostgreSQL CAS integration: concurrent SERIALIZABLE cash and asset writers, single winning source/audit, normalized projection, ledger journal/lines, and asset history.");
