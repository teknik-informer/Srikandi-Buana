import { profileNameKey, validateDisplayName } from "@/lib/account-profile";
import { env } from "@/lib/runtime";
import { getAuthenticatedUser, createSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password.mjs";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { json, sameOrigin } from "@/lib/account-access";
import { normalizeAccountCV, normalizePrivateProfileInput } from "@/lib/account-profile-data";
import {
  decryptPrivateAccountData,
  encryptPrivateAccountData,
  emptyPrivateAccountData,
  summarizePrivateAccountData,
} from "@/lib/account-profile-private";

const accountCVKey = (accountId: string) => "account-profile-v1:" + accountId;
type StoredProfile = {
  version?: number;
  cv?: unknown;
  privateProfile?: { nonce?: string; tag?: string; ciphertext?: string };
};

async function memberProfile(owner: string, memberId: string | null) {
  if (!env.DB || !memberId) return null;
  const row = await env.DB.prepare("SELECT id,data,updated FROM records WHERE id=? AND owner=? AND kind='anggota'")
    .bind(memberId, owner).first();
  if (!row) return null;
  return { id: String(row.id), data: JSON.parse(String(row.data)) as Record<string, unknown>, updated: String(row.updated || "") };
}

async function storedAccountProfile(owner: string, accountId: string): Promise<StoredProfile> {
  if (!env.DB) return {};
  const row = await env.DB.prepare("SELECT data FROM settings WHERE key=? AND owner=?")
    .bind(accountCVKey(accountId), owner).first();
  if (!row) return {};
  try {
    const parsed = JSON.parse(String(row.data)) as StoredProfile;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new Error("Data profil tersimpan belum dapat dibaca. Hubungi administrator sebelum mengubahnya.");
  }
}

async function privateSummaryFor(stored: StoredProfile, owner: string, accountId: string) {
  const encrypted = stored.privateProfile;
  if (!encrypted?.nonce || !encrypted.tag || !encrypted.ciphertext) return summarizePrivateAccountData(emptyPrivateAccountData());
  return summarizePrivateAccountData(decryptPrivateAccountData({
    nonce: encrypted.nonce,
    tag: encrypted.tag,
    ciphertext: encrypted.ciphertext,
  }, owner, accountId));
}

export async function GET() {
  const u = await getAuthenticatedUser();
  if (!u) return json({ error: "Silakan masuk." }, 401);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const [member, stored, nameProfile] = await Promise.all([
      memberProfile(u.userId, u.memberId),
      storedAccountProfile(u.userId, u.accountId),
      env.DB.prepare("SELECT data FROM settings WHERE owner=? AND key=?").bind(u.userId, profileNameKey(u.accountId)).first(),
    ]);
    const memberData = member?.data || {};
    let displayName = u.displayName;
    if (nameProfile) {
      try {
        const saved = JSON.parse(String(nameProfile.data));
        if (typeof saved.value === "string" && saved.value.trim()) displayName = saved.value;
      } catch { /* Keep the verified identity if an optional display preference is malformed. */ }
    }
    const cv = normalizeAccountCV(stored.cv, String(memberData.phone || ""));
    const privateSummary = await privateSummaryFor(stored, u.userId, u.accountId);
    return json({
      user: {
        accountId: u.accountId,
        email: u.email,
        displayName,
        avatarUrl: u.avatarUrl || "",
        role: u.role,
        position: u.position,
        programIds: u.programIds,
      },
      profile: {
        name: String(memberData.name || u.fullName),
        dusun: String(memberData.dusun || ""),
        phone: String(memberData.phone || ""),
        status: String(memberData.status || "Aktif"),
        verification: String(memberData.verification || "Terverifikasi"),
      },
      cv,
      privateSummary,
    });
  } catch {
    return json({ error: "Profil pribadi belum dapat dimuat. Coba lagi atau hubungi administrator bila masalah berlanjut." }, 503);
  }
}

export async function PATCH(request: Request) {
  const u = await getAuthenticatedUser();
  if (!u) return json({ error: "Silakan masuk." }, 401);
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);

  try {
    const raw = await readJsonObject(request, 65000);
    if (raw.action === "profile" || raw.action === "details") {
      if (request.headers.get("x-profile-account") !== u.accountId) {
        return json({ error: "Akun aktif berubah. Muat ulang halaman sebelum memperbarui profil." }, 409);
      }
      if (!await consumeRateLimit(env.DB, "profile:" + u.accountId, 12, 900000)) {
        return json({ error: "Terlalu banyak perubahan profil. Coba setelah 15 menit." }, 429);
      }
      const now = new Date().toISOString();
      if (raw.action === "profile") {
        let displayName: string;
        try { displayName = validateDisplayName(raw.displayName); }
        catch (cause) { return json({ error: cause instanceof Error ? cause.message : "Nama tampilan tidak valid." }, 400); }
        await env.DB.batch([
          env.DB.prepare("INSERT INTO settings(key,owner,data,updated) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated=excluded.updated")
            .bind(profileNameKey(u.accountId), u.userId, JSON.stringify({ value: displayName }), now),
          env.DB.prepare("INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), u.userId, u.accountId, "Nama tampilan diperbarui", u.email, now),
        ]);
        return json({ ok: true, user: { accountId: u.accountId, displayName, avatarUrl: u.avatarUrl || "" } });
      }

      const member = await memberProfile(u.userId, u.memberId);
      const cv = normalizeAccountCV(raw.cv, String(member?.data.phone || ""));
      const privateInput = normalizePrivateProfileInput(raw.privateProfile);
      const previous = await storedAccountProfile(u.userId, u.accountId);
      let privateData = emptyPrivateAccountData();
      if (previous.privateProfile?.nonce && previous.privateProfile.tag && previous.privateProfile.ciphertext) {
        privateData = decryptPrivateAccountData({
          nonce: previous.privateProfile.nonce,
          tag: previous.privateProfile.tag,
          ciphertext: previous.privateProfile.ciphertext,
        }, u.userId, u.accountId);
      }

      if (!privateInput.nikConsent) {
        privateData.nik = "";
        privateData.nikConsentAt = "";
      } else if (privateInput.nik) {
        privateData.nik = privateInput.nik;
        privateData.nikConsentAt = privateData.nikConsentAt || now;
      }
      if (!privateInput.bankConsent) {
        privateData.bankName = "";
        privateData.accountHolder = "";
        privateData.accountNumber = "";
        privateData.bankConsentAt = "";
      } else if (privateInput.accountNumber) {
        privateData.bankName = privateInput.bankName;
        privateData.accountHolder = privateInput.accountHolder;
        privateData.accountNumber = privateInput.accountNumber;
        privateData.bankConsentAt = privateData.bankConsentAt || now;
      }

      const hasPrivateData = Boolean(privateData.nik || privateData.accountNumber);
      const privateProfile = hasPrivateData
        ? encryptPrivateAccountData(privateData, u.userId, u.accountId)
        : null;
      const stored: StoredProfile = { version: 1, cv, ...(privateProfile ? { privateProfile } : {}) };

      const statements = [
        env.DB.prepare("INSERT INTO settings(key,owner,data,updated) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated=excluded.updated WHERE settings.owner=excluded.owner")
          .bind(accountCVKey(u.accountId), u.userId, JSON.stringify(stored), now),
        env.DB.prepare("INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), u.userId, u.accountId, "Profil pribadi dan CV diperbarui", "Profil akun " + u.accountId, now),
      ];
      if (member && String(member.data.phone || "") !== cv.contact.phone) {
        const updatedMember = { ...member.data, phone: cv.contact.phone };
        statements.push(
          env.DB.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=? AND kind='anggota'")
            .bind(JSON.stringify(updatedMember), now, u.memberId, u.userId),
        );
      }
      await env.DB.batch(statements);
      return json({
        ok: true,
        user: { accountId: u.accountId, displayName: u.displayName, avatarUrl: u.avatarUrl || "" },
        cv,
        privateSummary: summarizePrivateAccountData(privateData),
      });
    }

    if (raw.action !== "password") return json({ error: "Tindakan tidak valid." }, 400);
    if (!await consumeRateLimit(env.DB, "password:" + u.accountId, 5, 900000)) {
      return json({ error: "Terlalu banyak percobaan. Coba setelah 15 menit." }, 429);
    }
    const user = await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(u.accountId).first();
    if (!await verifyPassword(String(raw.currentPassword || ""), user?.password_hash)) {
      return json({ error: "Password saat ini tidak sesuai." }, 400);
    }
    if (raw.password !== raw.confirmation) return json({ error: "Konfirmasi password tidak cocok." }, 400);
    const password = await hashPassword(String(raw.password || ""));
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(password, u.accountId),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(u.accountId),
      env.DB.prepare("INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), u.userId, u.accountId, "Password diubah; sesi lama dicabut", u.email, new Date().toISOString()),
    ]);
    await createSession(u.accountId, false);
    return json({ ok: true });
  } catch (cause) {
    if (cause instanceof RequestBodyError) return json({ error: cause.message }, cause.status);
    const message = cause instanceof Error ? cause.message : "";
    if (/Kunci enkripsi|Konfigurasi kunci enkripsi/.test(message)) return json({ error: message }, 503);
    if (/harus|valid|maksimal|digit|wajib|wilayah|tahun|tanggal|rentang|karakter|daftar/i.test(message)) return json({ error: message }, 400);
    return json({ error: "Perubahan akun belum tersimpan. Coba lagi." }, 400);
  }
}
