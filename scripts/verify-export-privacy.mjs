import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const executedQueries = [];
const rawSensitiveMessageFixture = {
  id: "message-private-fixture",
  name: "Nama Rahasia",
  contact: "08123456789",
  topic: "Informasi",
  message: "Isi pesan rahasia",
  status: "Baru",
  created: "2026-11-15T10:00:00.000Z",
  consent_version: "v1",
  consented_at: "2026-11-15T10:00:00.000Z",
};
const db = {
  prepare(sql) {
    executedQueries.push(sql);
    return {
      bind() { return this; },
      async run() { return { success: true }; },
      async all() {
        if (sql.includes("FROM records")) return { results: [] };
        if (sql.includes("FROM files")) return { results: [] };
        if (sql.includes("FROM messages")) {
          // If the endpoint regresses to selecting raw rows, return sensitive fixture data.
          // The archive assertion below must then fail instead of silently passing.
          if (/COUNT\\s*\\(/i.test(sql) && /GROUP BY status/i.test(sql) &&
              !/\\b(name|contact|topic|message|ip_hash|consent_version|consented_at)\\b/i.test(sql)) {
            return { results: [{ status: "Baru", count: 3 }, { status: "Ditindaklanjuti", count: 2 }] };
          }
          return { results: [rawSensitiveMessageFixture] };
        }
        if (sql.includes("FROM settings")) return { results: [] };
        if (sql.includes("FROM operational_requests")) {
          if (/COUNT\\s*\\(/i.test(sql) && /GROUP BY category\\s*,\\s*status/i.test(sql)) return { results: [{ category: "purchase", status: "submitted", count: 2 }] };
          return { results: [{ requester_name: "Nama Pengaju Rahasia", description: "Rincian privat", proof_name: "KTP-rahasia.pdf" }] };
        }
        if (sql.includes("FROM operational_events")) {
          if (/COUNT\\s*\\(/i.test(sql) && /GROUP BY e\\.action/i.test(sql)) return { results: [{ action: "approved", count: 1 }] };
          return { results: [{ actor_name: "Nama Pelaksana Rahasia", note: "Catatan privat rahasia" }] };
        }
        throw new Error("Unexpected query: " + sql);
      },
    };
  },
};
const bundle = await build({
  entryPoints: ["src/app/api/export/route.ts"],
  bundle: true, write: false, platform: "node", format: "cjs",
  plugins: [{
    name: "isolated-export-dependencies",
    setup(context) {
      context.onResolve({ filter: /^@\/lib\/runtime$/ }, () => ({ path: "runtime", namespace: "test" }));
      context.onResolve({ filter: /^\.\.\/\.\.\/admin-auth$/ }, () => ({ path: "admin-auth", namespace: "test" }));
      context.onResolve({ filter: /^@\/lib\/permissions$/ }, () => ({ path: "permissions", namespace: "test" }));
      context.onResolve({ filter: /^@\/lib\/file-access$/ }, () => ({ path: "file-access", namespace: "test" }));
      context.onLoad({ filter: /.*/, namespace: "test" }, (args) => {
        if (args.path === "runtime") return { contents: "export const env={DB:globalThis.__testDb};", loader: "js" };
        if (args.path === "admin-auth") return { contents: "export async function getGovernanceAdminUser(){return globalThis.__testUser;}", loader: "js" };
        if (args.path === "permissions") return { contents: "export function visibleRecord(user,record){return record;}", loader: "js" };
        if (args.path === "file-access") return { contents: "export async function allowedFileIds(){return new Set();}", loader: "js" };
        throw new Error("Unexpected test module: " + args.path);
      });
    },
  }],
});
async function handlerFor(user) {
  const module = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module, exports: module.exports, crypto: webcrypto, Response, Headers, Request, URL, Date,
    globalThis: { __testDb: db, __testUser: user },
  });
  return module.exports.GET;
}
const GET = await handlerFor({ role: "ketua", userId: "workspace-1", accountId: "chair-1" });
const response = await GET();
assert.equal(response.status, 200);
const archive = await response.json();
assert.equal(archive.formatVersion, 5);
assert.deepEqual(JSON.parse(JSON.stringify(archive.messageSummary)), [
  { status: "Baru", count: 3 }, { status: "Ditindaklanjuti", count: 2 },
]);
const serialized = JSON.stringify(archive);
assert.doesNotMatch(serialized, /contact|phone|08123456789|Nama Rahasia|Isi pesan rahasia/);
assert.equal("messages" in archive, false);
assert.deepEqual(JSON.parse(JSON.stringify(archive.operationSummary)), [
  { category: "purchase", status: "submitted", count: 2 },
]);
assert.deepEqual(JSON.parse(JSON.stringify(archive.operationHistorySummary)), [
  { action: "approved", count: 1 },
]);
assert.equal("operations" in archive, false);
assert.equal("operationHistory" in archive, false);
assert.doesNotMatch(serialized, /Nama Pengaju Rahasia|Rincian privat|KTP-rahasia|Nama Pelaksana Rahasia|Catatan privat rahasia/);
assert.ok(executedQueries.some(sql => /GROUP BY category\\s*,\\s*status/i.test(sql) && !/requester_name|description|proof_name/i.test(sql)));
assert.ok(executedQueries.some(sql => /GROUP BY e\\.action/i.test(sql) && !/actor_name|note/i.test(sql)));
const messageQuery = executedQueries.find((sql) => sql.includes("FROM messages"));
assert.ok(messageQuery, "The export must query message oversight data.");
assert.match(messageQuery, /SELECT\\s+status\\s*,\\s*COUNT\\(\\*\\)\\s+AS count\\s+FROM messages\\s+GROUP BY status/i);
assert.doesNotMatch(messageQuery, /\\b(name|contact|topic|message|ip_hash|consent_version|consented_at)\\b/i);
assert.equal(archive.messageSummary.reduce((sum, row) => sum + row.count, 0), 5);
const unauthorizedGET = await handlerFor(null);
assert.equal((await unauthorizedGET()).status, 403);
console.log("PASS: Chair export contains non-identifying message counts only; raw contact/name/body fields are absent and unauthenticated access is denied.");
