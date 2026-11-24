import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$" + "00000000000000000000000000000000$" + "0".repeat(KEY_LENGTH * 2);

function deriveKey(password: string, salt: Buffer | string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: MAX_MEMORY,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key as Buffer);
      },
    );
  });
}

/** Identifies the pre-V9 scrypt encoding without exposing credential contents. */
export function isLegacyPasswordHash(encodedHash: string | null | undefined): boolean {
  if (!encodedHash) return false;
  const parts = encodedHash.split(":");
  return parts.length === 3 && parts[0] === "scrypt" &&
    /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
}

const DUMMY_LEGACY_SALT = "00000000000000000000000000000000";

/** Scrypt password hash; the encoded parameters travel with each credential. */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 256) {
    throw new Error("Password must contain 12 to 256 characters.");
  }

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("hex"),
    key.toString("hex"),
  ].join("$");
}

/** Verifies V9 hashes and the original scrypt:salt:hash legacy encoding. */
export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  if (typeof password !== "string" || password.length > 256) return false;

  if (encodedHash.startsWith("scrypt:")) {
    const parts = encodedHash.split(":");
    const valid = password.length <= 128 && parts.length === 3 &&
      parts[0] === "scrypt" && /^[a-f0-9]{32}$/.test(parts[1]) &&
      /^[a-f0-9]{128}$/.test(parts[2]);
    // The legacy implementation passed the hex salt as UTF-8 text to scrypt.
    const actual = await deriveKey(password, valid ? parts[1] : DUMMY_LEGACY_SALT);
    const expected = valid ? Buffer.from(parts[2], "hex") : Buffer.alloc(KEY_LENGTH);
    return valid && expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  const parts = encodedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const saltHex = parts[4];
  const keyHex = parts[5];
  if (cost !== SCRYPT_COST || blockSize !== SCRYPT_BLOCK_SIZE ||
      parallelization !== SCRYPT_PARALLELIZATION ||
      !/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(keyHex)) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function verifyPasswordOrDummy(
  password: string,
  encodedHash?: string | null,
): Promise<boolean> {
  return verifyPassword(password, encodedHash ?? DUMMY_PASSWORD_HASH);
}
