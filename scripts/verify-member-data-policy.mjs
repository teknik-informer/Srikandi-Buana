import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import vm from "node:vm";

const bundle = await build({
  entryPoints: ["src/lib/member-data-policy.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
});
const module = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports });
const { hasDocumentedMemberConsent, memberRecordPolicyError, memberAccountInvitationError } = module.exports;

test("new member records require a separate matching consent record", () => {
  const member = { name: "Siti Aminah", consent: "Terdokumentasi", status: "Perlu verifikasi", verification: "Perlu verifikasi" };
  assert.equal(memberRecordPolicyError({ ...member, consent: "Belum dikonfirmasi" }), "Catat persetujuan pendataan di menu Persetujuan Data sebelum menambahkan anggota.");
  assert.equal(hasDocumentedMemberConsent(member.name, [
    { data: JSON.stringify({ name: "Siti Aminah", date: "2026-11-12", purpose: "Pendataan anggota", status: "Setuju untuk tujuan tercatat" }) },
  ]), true);
  assert.equal(hasDocumentedMemberConsent(member.name, [
    { data: { name: "Siti Aminah", date: "2026-11-12", purpose: "", status: "Setuju untuk tujuan tercatat" } },
  ]), false);
  assert.equal(hasDocumentedMemberConsent(member.name, [
    { data: { name: "Siti Aminah", date: "2026-11-12", purpose: "Pendataan anggota", status: "Belum dikonfirmasi" } },
  ]), false);
  assert.equal(hasDocumentedMemberConsent(member.name, [
    { data: { name: "Siti Aminah Lain", date: "2026-11-12", purpose: "Pendataan anggota", status: "Setuju untuk tujuan tercatat" } },
  ]), false);
});

test("active membership and account invitations require documented consent and verified identity", () => {
  const base = { name: "Siti Aminah", consent: "Terdokumentasi", status: "Perlu verifikasi", verification: "Perlu verifikasi" };
  assert.match(memberRecordPolicyError({ ...base, status: "Aktif" }) || "", /Verifikasi data anggota terlebih dahulu/);
  assert.equal(memberRecordPolicyError({ ...base, status: "Aktif", verification: "Terverifikasi" }), null);
  assert.match(memberAccountInvitationError({ ...base, status: "Aktif", verification: "Terverifikasi", consent: "Belum dikonfirmasi" }) || "", /persetujuan pendataan/);
  assert.match(memberAccountInvitationError({ ...base, status: "Aktif" }) || "", /verifikasi data anggota/i);
  assert.equal(memberAccountInvitationError({ ...base, status: "Aktif", verification: "Terverifikasi" }), null);
});

test("withdrawn consent can be recorded without editing retained identity details", () => {
  const old = { name: "Siti Aminah", dusun: "Dusun A", phone: "0812", role: "Anggota", potential: "Bertani", status: "Aktif", verification: "Terverifikasi", consent: "Terdokumentasi" };
  const withdrawn = { ...old, status: "Mengundurkan diri", verification: "Perlu verifikasi", consent: "Dibatasi / ditarik" };
  assert.equal(memberRecordPolicyError(withdrawn, old), null);
  assert.match(memberRecordPolicyError({ ...withdrawn, phone: "0899" }, old) || "", /Perbarui identitas hanya setelah persetujuan/);
  assert.match(memberRecordPolicyError({ ...old, consent: "Dibatasi / ditarik" }, old) || "", /status Aktif selama persetujuan/);
});

console.log("Member data consent policy checks passed.");
