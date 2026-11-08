import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type PrivateAccountData = {
  nik: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  nikConsentAt: string;
  bankConsentAt: string;
};

export function isPrivateProfileEncryptionConfigured() {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

function encryptionKey() {
  const raw = process.env.PROFILE_DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("Kunci enkripsi data pribadi belum diaktifkan pada server.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Konfigurasi kunci enkripsi data pribadi tidak valid.");
  return key;
}

function additionalData(owner: string, accountId: string) {
  return Buffer.from("srikandi-account-private:v1:" + owner + ":" + accountId, "utf8");
}

export function encryptPrivateAccountData(value: PrivateAccountData, owner: string, accountId: string) {
  const key = encryptionKey();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(additionalData(owner, accountId));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    nonce: nonce.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

export function decryptPrivateAccountData(
  value: { nonce: string; tag: string; ciphertext: string },
  owner: string,
  accountId: string,
): PrivateAccountData {
  const key = encryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.nonce, "base64"));
  decipher.setAAD(additionalData(owner, accountId));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const data = JSON.parse(plaintext) as Partial<PrivateAccountData>;
  return {
    nik: typeof data.nik === "string" ? data.nik : "",
    bankName: typeof data.bankName === "string" ? data.bankName : "",
    accountHolder: typeof data.accountHolder === "string" ? data.accountHolder : "",
    accountNumber: typeof data.accountNumber === "string" ? data.accountNumber : "",
    nikConsentAt: typeof data.nikConsentAt === "string" ? data.nikConsentAt : "",
    bankConsentAt: typeof data.bankConsentAt === "string" ? data.bankConsentAt : "",
  };
}

function mask(value: string) {
  return value ? "•".repeat(Math.max(4, value.length - 4)) + value.slice(-4) : "";
}

export function summarizePrivateAccountData(value: PrivateAccountData) {
  return {
    hasNik: Boolean(value.nik),
    nikMasked: mask(value.nik),
    nikConsent: Boolean(value.nikConsentAt && value.nik),
    hasBankAccount: Boolean(value.accountNumber),
    bankName: value.bankName,
    accountHolder: value.accountHolder,
    accountNumberMasked: mask(value.accountNumber),
    bankConsent: Boolean(value.bankConsentAt && value.accountNumber),
  };
}

export const emptyPrivateAccountData = (): PrivateAccountData => ({
  nik: "", bankName: "", accountHolder: "", accountNumber: "",
  nikConsentAt: "", bankConsentAt: "",
});
