"use server";

import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { MEMBER_INTEREST_OPTIONS } from "@/config/member-profile";

type ProfileMutationResult = { ok: boolean; message: string };

type MemberProfileInput = {
  preferredName: string;
  phone: string;
  village: string;
  interests: string[];
};

function safeErrorName(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

/** Update only self-editable member profile fields; legal identity and membership are immutable here. */
export async function updateMemberProfile(input: MemberProfileInput): Promise<ProfileMutationResult> {
  // Any authenticated account may edit its own contact/preferences. The SQL below
  // binds the write target to identity.userId; no client-supplied person ID is trusted.
  const identity = await requireIdentity();

  const preferredName = String(input?.preferredName ?? "").trim().replace(/\s+/g, " ");
  const phone = String(input?.phone ?? "").trim();
  const village = String(input?.village ?? "").trim().replace(/\s+/g, " ");
  const requestedInterests = Array.isArray(input?.interests) ? input.interests : [];
  const interestKeys = [...new Set(requestedInterests.map((key) => String(key)))];
  const selected = interestKeys.map((key) => {
    const option = MEMBER_INTEREST_OPTIONS.find((item) => item.key === key);
    return { key, label: option?.label ?? null };
  });

  if (
    preferredName.length > 80 ||
    village.length > 120 ||
    (phone !== "" && !/^[0-9+()\-\s]{8,20}$/.test(phone)) ||
    interestKeys.length > MEMBER_INTEREST_OPTIONS.length ||
    selected.some((item) => !item.label)
  ) {
    return { ok: false, message: "Periksa nama tampilan, nomor WhatsApp, desa, dan pilihan minat." };
  }

  try {
    const sql = getV9Sql();
    const interestPayload = JSON.stringify(
      selected.map((item) => ({ interest_key: item.key, interest_label: item.label })),
    );
    const interestKeyArray = interestKeys;

    const rows = rowsFromResult<{ id: string }>(await sql`
      WITH target AS (
        SELECT person.id
        FROM v9.user_accounts AS account
        INNER JOIN v9.people AS person
          ON person.id = account.person_id
        WHERE account.id = ${identity.userId}
          AND person.status = 'active'
        LIMIT 1
      ),
      updated_person AS (
        UPDATE v9.people AS person
        SET
          preferred_name = NULLIF(${preferredName}, ''),
          phone = NULLIF(${phone}, ''),
          village = NULLIF(${village}, ''),
          updated_at = now()
        FROM target
        WHERE person.id = target.id
        RETURNING person.id
      ),
      upserted_interests AS (
        INSERT INTO v9.person_interests (
          organization_id, person_id, interest_key, interest_label
        )
        SELECT
          ${identity.organizationId},
          updated_person.id,
          incoming.interest_key,
          incoming.interest_label
        FROM updated_person
        CROSS JOIN jsonb_to_recordset(${interestPayload}::jsonb)
          AS incoming(interest_key text, interest_label text)
        ON CONFLICT (organization_id, person_id, interest_key)
        DO UPDATE SET
          interest_label = EXCLUDED.interest_label,
          updated_at = now()
        RETURNING interest_key
      ),
      deleted_interests AS (
        DELETE FROM v9.person_interests AS interest
        USING updated_person
        WHERE interest.organization_id = ${identity.organizationId}
          AND interest.person_id = updated_person.id
          AND NOT (interest.interest_key = ANY(${interestKeyArray}::text[]))
        RETURNING interest.interest_key
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'person.profile.updated',
          'person',
          updated_person.id::text,
          jsonb_build_object(
            'preferred_name', NULLIF(${preferredName}, ''),
            'village', NULLIF(${village}, ''),
            'interest_count', (SELECT count(*) FROM upserted_interests)
          )
        FROM updated_person
        RETURNING id
      )
      SELECT updated_person.id::text AS id
      FROM updated_person
      INNER JOIN audit ON true
    `);

    if (rows.length !== 1) {
      return { ok: false, message: "Data profil tidak ditemukan pada akun ini. Hubungi Sekretariat." };
    }

    revalidatePath("/app/profil");
    revalidatePath("/app/anggota/profil");
    revalidatePath("/app/anggota");
    return { ok: true, message: "Profil berhasil disimpan pada data organisasi." };
  } catch (reason) {
    console.warn(
      "[member-profile] Persistence failed",
      safeErrorName(reason),
    );
    return {
      ok: false,
      message: "Profil belum tersimpan. Periksa koneksi lalu coba kembali.",
    };
  }
}
