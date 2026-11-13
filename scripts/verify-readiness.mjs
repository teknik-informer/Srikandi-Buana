import { build } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";

let activeDatabase;
let checkedQuery = "";
const logs = [];
const testEnv = {
  get DB() { return activeDatabase; },
};
const vmConsole = {
  log() {},
  warn() {},
  error(...args) { logs.push(args); },
};

const bundle = await build({
  entryPoints: ["src/app/api/ready/route.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  plugins: [{
    name: "isolated-readiness-database",
    setup(buildContext) {
      buildContext.onLoad(
        { filter: /\/lib\/runtime\.ts$/ },
        () => ({ contents: "export const env=globalThis.testEnv;", loader: "ts" }),
      );
    },
  }],
});

const module = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, {
  module,
  exports: module.exports,
  testEnv,
  process: { env: { VERCEL_ENV: "preview" } },
  Response,
  Request,
  Headers,
  URL,
  console: vmConsole,
});

const request = () => new Request("https://test.local/api/ready", {
  headers: { "x-vercel-id": "readiness-diagnostic-test" },
});
const api = module.exports;

activeDatabase = {
  prepare(sql) {
    checkedQuery = sql;
    return { async first() { return { ready: true, required_columns: 42, available_columns: 42 }; } };
  },
};
let response = await api.GET(request());
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { status: "ready", database: "ok" });
assert.match(checkedQuery, /information_schema\.columns/);
assert.match(checkedQuery, /rate_limits/);
assert.match(checkedQuery, /workspace_owner/);
assert.equal(logs.length, 0);

activeDatabase = {
  prepare() {
    return { async first() { return { ready: false, required_columns: 42, available_columns: 28 }; } };
  },
};
response = await api.GET(request());
assert.equal(response.status, 503);
assert.deepEqual(await response.json(), { status: "not_ready", database: "not_ready" });
assert.equal(logs.at(-1)[0], "[srikandi-server-failure]");
assert.equal(logs.at(-1)[1].stage, "schema_contract");
assert.equal(logs.at(-1)[1].errorCode, "SCHEMA_MISMATCH");

const databaseError = Object.assign(new Error("PRIVATE_CONNECTION_DETAIL"), {
  name: "NeonDbError",
  code: "57P01",
});
activeDatabase = {
  prepare() {
    return { async first() { throw databaseError; } };
  },
};
response = await api.GET(request());
assert.equal(response.status, 503);
assert.equal(logs.at(-1)[1].stage, "database_probe");
assert.equal(logs.at(-1)[1].errorCode, "57P01");
assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_CONNECTION_DETAIL/);

activeDatabase = undefined;
response = await api.GET(request());
assert.equal(response.status, 503);
assert.deepEqual(await response.json(), { status: "not_ready", database: "not_ready" });
console.log("PASS: readiness distinguishes a compatible schema, a schema mismatch, a database failure and a missing connection without exposing internals.");
