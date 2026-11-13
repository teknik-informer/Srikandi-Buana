import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const db = {
  prepare(sql) {
    return {
      bind() { return this; },
      async run() { return { success: true }; },
      async all() {
        if (sql.includes("FROM records")) return { results: [] };
        if (sql.includes("FROM files")) return { results: [] };
        if (sql.includes("FROM messages")) return { results: [{ status: "Baru", count: 3 }, { status: "Ditangani", count: 2 }] };
        if (sql.includes("FROM settings")) return { results: [] };
        if (sql.includes("FROM operational_requests")) return { results: [] };
        if (sql.includes("FROM operational_events")) return { results: [] };
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
assert.equal(archive.formatVersion, 4);
assert.deepEqual(JSON.parse(JSON.stringify(archive.messageSummary)), [
  { status: "Baru", count: 3 }, { status: "Ditangani", count: 2 },
]);
const serialized = JSON.stringify(archive);
assert.doesNotMatch(serialized, /contact|phone|08123456789|Nama Rahasia|Isi pesan rahasia/);
assert.equal("messages" in archive, false);
const unauthorizedGET = await handlerFor(null);
assert.equal((await unauthorizedGET()).status, 403);
console.log("PASS: Chair export contains non-identifying message counts only; raw contact/name/body fields are absent and unauthenticated access is denied.");
