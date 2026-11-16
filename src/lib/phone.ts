/**
 * Normalize Indonesian mobile numbers to E.164 (+628xxxxxxxxxx).
 * Accepts common user-entered forms: 08…, 8…, 62…, +62…, and separators.
 */
export function normalizeIndonesianMobilePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  const national = digits.startsWith("0")
    ? digits.slice(1)
    : digits.startsWith("62")
      ? digits.slice(2)
      : digits;
  return /^8[0-9]{7,12}$/.test(national) ? "+62" + national : "";
}
