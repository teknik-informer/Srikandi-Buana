import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("src/app/api/accounts/route.ts", "utf8");
const accounts = readFileSync("src/app/_components/access/accounts.tsx", "utf8");

assert.match(route, /members:members\.results\.flatMap/);
assert.match(route, /\{id:String\(r\.id\),status:String\(data\.status\|\|''\),verification:String\(data\.verification\|\|''\)\}/);
assert.doesNotMatch(route, /members:members\.results\.flatMap\(r=>\{try\{const data=JSON\.parse\(String\(r\.data\)\);return \[\{id:String\(r\.id\),name:/);
assert.match(accounts, /type Member=\{id:string;status:string;verification:string\}/);
assert.match(accounts, /ID anggota dari Sekretariat/);
assert.match(accounts, /\{m\.id\} · Aktif · Terverifikasi/);
assert.doesNotMatch(accounts, /m\.name/);

console.log("PASS: Chair account picker receives member IDs and eligibility metadata only; member names stay in the Secretariat-owned register.");
