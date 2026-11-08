import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const editor = read("src/app/_components/access/account-profile-editor.tsx");
const address = read("src/app/_components/access/indonesian-address-fields.tsx");
const accountApi = read("src/app/api/account/route.ts");
const regionApi = read("src/app/api/regions/route.ts");
const data = read("src/lib/account-profile-data.ts");
const privateCrypto = read("src/lib/account-profile-private.ts");
const accountPage = read("src/app/_components/access/my-account.tsx");

test("account profile is an editable CV with repeatable professional and personal sections", () => {
  for (const label of [
    "Data diri", "Kontak", "Alamat domisili", "Ringkasan profil",
    "Riwayat pendidikan", "Pengalaman kerja", "Pengalaman organisasi",
    "Keahlian, hobi", "Kemampuan bahasa", "Sertifikat", "Identitas & rekening",
  ]) assert.ok(editor.includes(label), "Missing profile section: " + label);
  assert.match(editor, /updateCV\("education", \[\.\.\.cv\.education, emptyEducation\(\)\]\)/);
  assert.match(editor, /updateCV\("experience", \[\.\.\.cv\.experience, emptyExperience\(\)\]\)/);
  assert.match(editor, /updateCV\("volunteer", \[\.\.\.cv\.volunteer, emptyExperience\(\)\]\)/);
  assert.match(editor, /updateCV\("certifications", \[\.\.\.cv\.certifications, emptyCertification\(\)\]\)/);
  assert.match(editor, /updateCV\("languages", \[\.\.\.cv\.languages, emptyLanguage\(\)\]\)/);
  assert.match(editor, /initialCV=\{data\.cv\}/);
  assert.match(editor, /initialPrivateSummary=\{data\.privateSummary\}/);
});

test("verified membership identity stays read-only while personal display identity remains separate", () => {
  assert.match(editor, /Nama lengkap resmi/);
  assert.match(editor, /readOnly/);
  assert.match(editor, /Nama panggilan/);
  assert.match(editor, /Nama resmi keanggotaan/);
  assert.match(accountPage, /memberName=\{data\.profile\.name\}/);
});

test("address selectors cascade by official region codes and keep a manual fallback", () => {
  assert.match(address, /loadRegions\("provinces"/);
  assert.match(address, /loadRegions\("regencies", value\.provinceCode/);
  assert.match(address, /loadRegions\("districts", value\.regencyCode/);
  assert.match(address, /loadRegions\("villages", value\.districtCode/);
  assert.match(address, /provinceCode: code/);
  assert.match(address, /regencyCode: code/);
  assert.match(address, /districtCode: code/);
  assert.match(address, /villageCode: code/);
  assert.match(address, /isi manual bila perlu/);
  assert.match(regionApi, /wilayah-id-api\.dhanypedia\.com/);
  assert.match(regionApi, /provinces.*regencies.*districts.*villages/);
  assert.match(regionApi, /Cache-Control.*s-maxage=86400/);
});

test("NIK and bank account data are encrypted before settings storage", () => {
  assert.match(privateCrypto, /createCipheriv\("aes-256-gcm"/);
  assert.match(privateCrypto, /createDecipheriv\("aes-256-gcm"/);
  assert.match(privateCrypto, /PROFILE_DATA_ENCRYPTION_KEY/);
  assert.match(privateCrypto, /setAAD/);
  assert.match(privateCrypto, /nonce/);
  assert.match(privateCrypto, /ciphertext/);
  assert.match(accountApi, /encryptPrivateAccountData\(privateData, u\.userId, u\.accountId\)/);
  assert.match(accountApi, /privateProfile \? \{ privateProfile \} : \{\}/);
  assert.match(accountApi, /summarizePrivateAccountData\(privateData\)/);
  assert.doesNotMatch(privateCrypto, /console\.(log|info|debug)/);
});

test("private identity values are never returned by account GET; only masks are returned", () => {
  assert.match(accountApi, /privateSummaryFor\(stored, u\.userId, u\.accountId\)/);
  assert.match(accountApi, /privateSummary,/);
  assert.doesNotMatch(accountApi, /nik:\s*privateData\.nik/);
  assert.doesNotMatch(accountApi, /accountNumber:\s*privateData\.accountNumber/);
  assert.match(privateCrypto, /nikMasked/);
  assert.match(privateCrypto, /accountNumberMasked/);
  assert.match(editor, /privateSummary\.nikMasked/);
  assert.match(editor, /privateSummary\.accountNumberMasked/);
});

test("private fields are consent-gated and can be removed by withdrawing consent", () => {
  assert.match(data, /NIK harus 16 digit angka/);
  assert.match(data, /Nomor rekening harus 6–24 digit angka/);
  assert.match(editor, /nikConsent/);
  assert.match(editor, /bankConsent/);
  assert.match(accountApi, /if \(!privateInput\.nikConsent\)/);
  assert.match(accountApi, /if \(!privateInput\.bankConsent\)/);
  assert.match(accountApi, /privateData\.nik = ""/);
  assert.match(accountApi, /privateData\.accountNumber = ""/);
});

test("profile API is authenticated, same-origin, owner-scoped and size-limited", () => {
  assert.match(accountApi, /getAuthenticatedUser\(\)/);
  assert.match(accountApi, /sameOrigin\(request\)/);
  assert.match(accountApi, /readJsonObject\(request, 65000\)/);
  assert.match(accountApi, /storedAccountProfile\(u\.userId, u\.accountId\)/);
  assert.match(accountApi, /x-profile-account/);
  assert.match(accountApi, /consumeRateLimit/);
  assert.match(accountApi, /access_audit/);
});

test("saving the CV only syncs the ordinary phone field to the linked member record", () => {
  assert.match(accountApi, /updatedMember = \{ \.\.\.member\.data, phone: cv\.contact\.phone \}/);
  assert.match(accountApi, /kind='anggota'/);
  assert.doesNotMatch(accountApi, /updatedMember[^;]*(?:nik|accountNumber|bankName)/);
});

test("profile CV data is normalized, bounded and validates dates and URLs", () => {
  assert.match(data, /normalizeAccountCV/);
  assert.match(data, /list\(raw\.education, 12/);
  assert.match(data, /list\(raw\.experience, 20/);
  assert.match(data, /list\(raw\.volunteer, 20/);
  assert.match(data, /list\(raw\.certifications, 20/);
  assert.match(data, /https:/);
  assert.match(data, /Tanggal lahir tidak valid/);
  assert.match(data, /RT harus berupa angka/);
  assert.match(data, /Kode pos harus lima digit/);
});
