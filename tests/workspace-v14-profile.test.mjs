import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapLegacyRecordToV14 } from "../src/features/workspace-v14/legacy-mapping.mjs";

const read = (path) => readFileSync(path, "utf8");
const editor = read("src/app/_components/access/account-profile-editor.tsx");
const address = read("src/app/_components/access/indonesian-address-fields.tsx");
const accountApi = read("src/app/api/account/route.ts");
const regionApi = read("src/app/api/regions/route.ts");
const data = read("src/lib/account-profile-data.ts");
const privateCrypto = read("src/lib/account-profile-private.ts");
const accountPage = read("src/app/_components/access/my-account.tsx");
const membershipApi = read("src/app/api/records/route.ts");
const auth = read("src/lib/auth.ts");
const migration = read("migrations/010_member_impact_finance.sql");
const architecture = read("docs/architecture/v14/MEMBER_360_INTEGRATION.md");
const memberMapping = read("src/features/workspace-v14/legacy-mapping.mjs");

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
  assert.match(accountPage, /initialCV=\{data\.cv\}/);
  assert.match(accountPage, /initialPrivateSummary=\{data\.privateSummary\}/);
  assert.match(accountPage, /privateStorageReady=\{data\.privateStorageReady\}/);
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
  assert.match(regionApi, /www\.emsifa\.com\/api-wilayah-indonesia\/v2/);
  assert.match(regionApi, /provinces\.json/);
  assert.match(regionApi, /postal_code/);
  assert.match(address, /postalCode: selected\?\.postalCode/);
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
  assert.match(editor, /privateSummary.*nikMasked/);
  assert.match(editor, /privateSummary.*accountNumberMasked/);
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

test("profile and membership synchronize shared fields in both directions", () => {
  assert.match(accountApi, /phone: cv\.contact\.phone/);
  assert.match(accountApi, /dusun: cv\.address\.street/);
  assert.match(accountApi, /village: cv\.address\.villageName/);
  assert.match(accountApi, /preferredName: cv\.personal\.preferredName/);
  assert.match(accountApi, /profileAddressJson: JSON\.stringify\(cv\.address\)/);
  assert.match(accountApi, /profileOperationalJson: JSON\.stringify\(deriveMemberOperationalProfile\(cv\)\)/);
  assert.match(membershipApi, /profileOperationalJson/);
  assert.match(data, /deriveMemberOperationalProfile/);
  assert.doesNotMatch(data.slice(data.indexOf("export function deriveMemberOperationalProfile")), /birthDate|gender|accountNumber|nik|emailSecondary|phone|website|linkedin/);
  assert.match(accountApi, /buildV14RecordSyncStatements/);
  assert.match(accountApi, /linked: Boolean\(member\)/);
  assert.match(membershipApi, /profileAddressJson/);
  assert.match(membershipApi, /profileOperationalJson/);
  assert.match(auth, /membership\?\.name/);
  assert.match(auth, /membership\?\.role/);
  assert.match(accountPage, /membershipLinked=\{data\.profile\.linked\}/);
  assert.match(accountPage, /profile: payload\.profile \|\| current\.profile/);
  assert.doesNotMatch(accountApi, /nik: cv\.|bankName: cv\.|accountNumber: cv\./);
});

test("profile CV data is normalized, bounded and validates dates and URLs", () => {
  assert.match(data, /normalizeAccountCV/);
  assert.match(data, /list\(raw\.education, 12/);
  assert.match(data, /list\(raw\.experience, 20/);
  assert.match(data, /list\(raw\.volunteer, 20/);
  assert.match(data, /list\(raw\.certifications, 20/);
  assert.match(data, /https:/);
  assert.match(data, /date\(personal\.birthDate, "Tanggal lahir"\)/);
  assert.match(data, /label \+ " tidak valid\."/);
  assert.match(data, /RT harus berupa angka/);
  assert.match(data, /Kode pos harus lima digit/);
});



test("v14 member sync stores only the minimized operational CV projection", () => {
  const mapped = mapLegacyRecordToV14("anggota", {
    name: "Anggota Contoh",
    phone: "08123456789",
    village: "Desa Contoh",
    status: "Aktif",
    verification: "Terverifikasi",
    dataConsent: "Setuju",
    profileOperationalJson: JSON.stringify({
      schemaVersion: 1,
      skills: ["Pembukuan", "Budidaya"],
      education: [{ level: "SMA", field: "Pertanian", startYear: "2015", endYear: "2018", institution: "Sekolah", description: "Narasi privat" }],
      experience: [{ organization: "Kelompok", title: "Sekretaris", current: true, startDate: "2020-01-01", endDate: "", location: "Alamat pribadi", description: "Narasi privat" }],
      languages: [{ language: "Indonesia", proficiency: "Mahir" }],
      certifications: [{ name: "Pelatihan", issuer: "Dinas", year: "2024", description: "Narasi privat" }],
      interests: ["Pengolahan hasil"],
      birthDate: "1990-01-01",
      gender: "Perempuan",
      phone: "08123456789",
      accountNumber: "1234567890",
      nik: "1234567890123456",
    }),
  });
  assert.equal(mapped.domain, "member_profiles");
  const projection = mapped.values.profileData.operationalProfile;
  assert.deepEqual(projection.skills, ["Pembukuan", "Budidaya"]);
  assert.equal(projection.education[0].field, "Pertanian");
  assert.equal(projection.experience[0].title, "Sekretaris");
  assert.equal(projection.languages[0].language, "Indonesia");
  assert.equal(projection.certifications[0].name, "Pelatihan");
  assert.deepEqual(projection.interests, ["Pengolahan hasil"]);
  assert.doesNotMatch(JSON.stringify(mapped.values.profileData), /Narasi privat|Alamat pribadi|birthDate|gender|phone|accountNumber|nik|1234567890123456/i);
  assert.match(memberMapping, /safeOperationalProfile/);
});

test("member impact finance schema links assets, programmes, savings, loans and compensation to member profiles", () => {
  for (const name of [
    "member_asset_declarations", "member_asset_assignments",
    "member_financial_policies", "member_contributions",
    "member_savings_accounts", "member_savings_transactions",
    "member_payments", "member_loans", "member_loan_installments",
    "member_service_engagements", "member_compensation_items",
  ]) assert.ok(migration.includes("workspace_v14." + name), "Missing member impact table: " + name);
  assert.match(migration, /REFERENCES workspace_v14\.member_profiles\(id,\s*organization_id\)/);
  assert.match(migration, /REFERENCES workspace_v14\.inventory_items\(id,\s*organization_id\)/);
  assert.match(migration, /REFERENCES workspace_v14\.programmes\(id,\s*organization_id\)/);
  assert.match(migration, /ledger_entry_id TEXT REFERENCES public\.ledger_entries\(id\)/);
  assert.match(migration, /destination_account_ref/);
  assert.doesNotMatch(migration, /account_number|bank_account_number|nik\s+TEXT/i);
  assert.match(architecture, /Buku Tabungan Anggota/);
  assert.match(architecture, /Tanpa keputusan tersebut, modul hanya boleh menyimpan rancangan\/draft/);
});
