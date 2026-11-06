import { env } from "./runtime";
export const profileNameKey = (accountId: string) => "profile-name:" + accountId;
export const profileAvatarKey = (accountId: string) => "profile-avatar:" + accountId;
export const avatarObjectKey = (owner: string, accountId: string) => owner + "/account-avatar/" + accountId;
export async function getAccountProfile(owner: string, accountId: string) {
  const result = { displayName: "", avatarUrl: "", avatarId: "" };
  if (!env.DB) return result;
  const rows = await env.DB.prepare("SELECT key,data FROM settings WHERE owner=? AND key IN (?,?)")
    .bind(owner, profileNameKey(accountId), profileAvatarKey(accountId)).all();
  for (const row of rows.results) {
    try {
      const data = JSON.parse(String(row.data));
      if (row.key === profileNameKey(accountId) && typeof data.value === "string") result.displayName = data.value;
      if (row.key === profileAvatarKey(accountId) && typeof data.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(data.id)) {
        result.avatarId = data.id; result.avatarUrl = "/api/account/avatar?v=" + encodeURIComponent(data.id);
      }
    } catch { /* An invalid optional preference must not replace the verified identity. */ }
  }
  return result;
}
export function validateDisplayName(value: unknown) {
  if (typeof value !== "string" || /[\x00-\x1f\x7f]/.test(value)) throw Error("Nama tampilan harus berupa teks satu baris.");
  const name = value.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw Error("Nama tampilan harus 1–80 karakter.");
  return name;
}
