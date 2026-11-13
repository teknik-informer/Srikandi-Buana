import { build } from "esbuild";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as crypto from "node:crypto";

const require = createRequire(import.meta.url);
const logs = [];
const vmConsole = {
  log() {},
  warn() {},
  error(...args) { logs.push(args); },
};
const databaseError = Object.assign(
  new Error("SENSITIVE_DATABASE_DETAIL_MUST_NOT_BE_LOGGED"),
  { name: "NeonDbError", code: "42P01" },
);
const testEnv = {
  DB: {
    prepare(sql) {
      assert.match(sql, /INSERT INTO rate_limits/);
      throw databaseError;
    },
  },
};

const bundle = await build({
  entryPoints: ["src/app/api/auth/login/route.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  plugins: [{
    name: "isolated-login-database",
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
  require(name) {
    if (name === "next/headers") return { cookies: async () => ({ get() {}, set() {}, delete() {} }) };
    return require(name);
  },
  process: { env: { ADMIN_EMAIL: "admin@example.test", NODE_ENV: "production", VERCEL_ENV: "preview" } },
  crypto,
  Response,
  Request,
  Headers,
  URL,
  Buffer,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  console: vmConsole,
});

const request = new Request("https://test.local/api/auth/login", {
  method: "POST",
  headers: {
    origin: "https://test.local",
    "content-type": "application/json",
    "x-vercel-forwarded-for": "198.51.100.77",
    "x-vercel-id": "login-diagnostic-test",
  },
  body: JSON.stringify({ email: "admin@example.test", password: "NeverLogThisPassword!" }),
});

const response = await module.exports.POST(request);
assert.equal(response.status, 503);
assert.equal(
  (await response.json()).error,
  "Layanan masuk belum dapat diakses. Silakan coba kembali.",
);
assert.equal(logs.length, 1);
assert.equal(logs[0][0], "[srikandi-server-failure]");
assert.equal(logs[0][1].event, "auth_login_failed");
assert.equal(logs[0][1].stage, "rate_limit");
assert.equal(logs[0][1].environment, "preview");
assert.equal(logs[0][1].requestId, "login-diagnostic-test");
assert.equal(logs[0][1].errorName, "NeonDbError");
assert.equal(logs[0][1].errorCode, "42P01");
assert.equal(logs[0][1].errorCategory, "schema_object_missing");

const logged = JSON.stringify(logs);
assert.doesNotMatch(logged, /SENSITIVE_DATABASE_DETAIL|NeverLogThisPassword|admin@example\.test/);
console.log("PASS: login failure keeps a generic 503 response and emits only safe stage, request ID, error name and SQLSTATE.");
